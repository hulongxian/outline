import Router from "koa-router";
import { IntegrationService, IntegrationType } from "@shared/types";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import Logger from "@server/logging/Logger";
import { Integration, IntegrationAuthentication } from "@server/models";
import { authorize } from "@server/policies";
import { presentIntegration, presentPolicies } from "@server/presenters";
import type { APIContext } from "@server/types";
import { validateUrlNotPrivate } from "@server/utils/url";
import { JiraUtils } from "../../shared/JiraUtils";
import type { JiraAuthType } from "../jiraClient";
import { Jira } from "../jira";
import * as T from "./schema";

const router = new Router();

router.post(
  "jira.connect",
  auth(),
  validate(T.JiraConnectSchema),
  transaction(),
  async (ctx: APIContext<T.JiraConnectReq>) => {
    const {
      url: rawUrl,
      isCloud: isCloudInput,
      email,
      username: usernameInput,
      authType: authTypeInput,
      apiToken,
      p12Base64,
      p12Passphrase,
      clearP12,
      integrationId,
    } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    Logger.debug("jira", "jira.connect authenticated", {
      userId: user.id,
      teamId: user.teamId,
      role: user.role,
      integrationId,
      hasApiToken: !!apiToken,
    });

    authorize(user, "createIntegration", user.team);

    const url = JiraUtils.normalizeUrl(rawUrl);
    await validateUrlNotPrivate(url);

    let parsedHostname: string;
    try {
      parsedHostname = new URL(url).hostname;
    } catch {
      throw ValidationError("Invalid Jira URL");
    }

    const isCloud =
      isCloudInput ?? JiraUtils.isCloudHostname(parsedHostname);

    const authType: JiraAuthType =
      authTypeInput ?? (isCloud ? "basic" : "pat");

    const username = isCloud ? email : usernameInput;

    if (isCloud && !username) {
      throw ValidationError("Email is required for Jira Cloud");
    }

    try {
      const teamJiraIntegrations = (await Integration.findAll({
        where: {
          service: IntegrationService.Jira,
          teamId: user.teamId,
        },
        transaction,
      })) as Integration<IntegrationType.Embed>[];

      const findIntegrationForUrl = () =>
        teamJiraIntegrations.find((intg) => {
          const configuredUrl = intg.settings?.jira?.url;
          if (!configuredUrl) {
            return false;
          }
          return JiraUtils.urlMatchesIntegration(new URL(url), configuredUrl);
        }) ?? null;

      const assertNoDuplicateUrl = (excludeId?: string) => {
        const duplicate = teamJiraIntegrations.find((intg) => {
          if (excludeId && intg.id === excludeId) {
            return false;
          }
          const configuredUrl = intg.settings?.jira?.url;
          if (!configuredUrl) {
            return false;
          }
          return JiraUtils.urlMatchesIntegration(new URL(url), configuredUrl);
        });

        if (duplicate) {
          throw ValidationError(
            "A Jira integration for this URL already exists"
          );
        }
      };

      let integration: Integration<IntegrationType.Embed> | null = null;

      if (integrationId) {
        integration =
          teamJiraIntegrations.find((intg) => intg.id === integrationId) ??
          null;

        if (!integration) {
          throw ValidationError("Integration not found");
        }

        assertNoDuplicateUrl(integration.id);
      } else {
        integration = findIntegrationForUrl();
        if (!integration) {
          assertNoDuplicateUrl();
        }
      }

      const existingAuth = integration
        ? await integration.$get("authentication", { transaction })
        : null;

      const stored = Jira.buildStoredCredentials({
        isCloud,
        authType,
        username,
        token: apiToken,
        existing: existingAuth,
        p12Base64,
        p12Passphrase,
        clearP12,
      });

      if ("error" in stored) {
        throw ValidationError(stored.error);
      }

      const valid = await Jira.verifyCredentials({
        baseUrl: url,
        credentials: stored.credentials,
      });

      if (!valid) {
        throw ValidationError("Invalid Jira credentials");
      }

      let authentication = existingAuth;

      if (authentication) {
        authentication.token = stored.tokenToStore;
        authentication.clientId = stored.username ?? null;
        authentication.clientSecret = stored.p12Passphrase ?? null;
        authentication.refreshToken = stored.p12Base64 ?? "";
        await authentication.save({ transaction });
      } else {
        authentication = await IntegrationAuthentication.create(
          {
            service: IntegrationService.Jira,
            userId: user.id,
            teamId: user.teamId,
            token: stored.tokenToStore,
            clientId: stored.username ?? null,
            clientSecret: stored.p12Passphrase ?? null,
            refreshToken: stored.p12Base64,
            scopes: [],
          },
          { transaction }
        );
      }

      const settings = {
        jira: {
          url,
          isCloud,
          authType,
          ...(isCloud && username ? { email: username } : {}),
          ...(!isCloud && stored.username ? { username: stored.username } : {}),
          hasClientCertificate: stored.hasClientCertificate,
        },
      };

      if (integration) {
        integration.settings = settings;
        integration.authenticationId = authentication.id;
        await integration.save({ transaction });
      } else {
        integration = await Integration.create<Integration<IntegrationType.Embed>>(
          {
            service: IntegrationService.Jira,
            type: IntegrationType.Embed,
            userId: user.id,
            teamId: user.teamId,
            authenticationId: authentication.id,
            settings,
          },
          { transaction }
        );
      }

      ctx.body = {
        data: presentIntegration(integration),
        policies: presentPolicies(user, [integration]),
      };
    } catch (err) {
      Logger.error("Encountered error during Jira connect", err);

      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "ERR_CRYPTO_UNSUPPORTED_OPERATION"
      ) {
        throw ValidationError(
          "The P12 certificate uses a legacy encryption format. Re-export it with AES-256, or ensure OpenSSL is installed on the server."
        );
      }

      if (err instanceof Error && /P12|PKCS12|certificate/i.test(err.message)) {
        throw ValidationError(err.message);
      }

      throw err;
    }
  }
);

export default router;
