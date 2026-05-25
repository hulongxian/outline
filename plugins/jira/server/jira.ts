import { z } from "zod";
import {
  type IntegrationType,
  IntegrationService,
  UnfurlResourceType,
} from "@shared/types";
import Logger from "@server/logging/Logger";
import { Integration } from "@server/models";
import type IntegrationAuthentication from "@server/models/IntegrationAuthentication";
import type User from "@server/models/User";
import type { UnfurlIssueOrPR, UnfurlSignature } from "@server/types";
import { validateUrlNotPrivate } from "@server/utils/url";
import { JiraUtils } from "../shared/JiraUtils";
import {
  credentialsFromIntegration,
  jiraFetch,
  type JiraAuthType,
  type JiraRequestCredentials,
} from "./jiraClient";

const JiraUserSchema = z
  .object({
    displayName: z.string(),
    avatarUrls: z.record(z.string(), z.string()).optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const JiraLabelSchema = z.union([
  z.string(),
  z
    .object({
      name: z.string(),
      color: z.string().optional(),
    })
    .passthrough(),
]);

const JiraIssueResponseSchema = z.object({
  key: z.string(),
  fields: z
    .object({
      summary: z.string(),
      description: z.unknown().nullable().optional(),
      created: z.string().optional(),
      status: z
        .object({
          name: z.string(),
          statusCategory: z
            .object({
              colorName: z.string().optional(),
              name: z.string().optional(),
            })
            .optional(),
        })
        .passthrough(),
      assignee: JiraUserSchema,
      creator: JiraUserSchema,
      issuetype: z
        .object({
          name: z.string().optional(),
          iconUrl: z.string().optional(),
        })
        .passthrough()
        .optional(),
      labels: z.array(JiraLabelSchema).optional(),
    })
    .passthrough(),
});

type JiraSettings = {
  url: string;
  isCloud?: boolean;
  email?: string;
  authType?: JiraAuthType;
  username?: string;
  hasClientCertificate?: boolean;
};

export class Jira {
  /**
   * Unfurls a Jira issue URL using the team's configured integration.
   *
   * @param url - Jira issue URL to unfurl.
   * @param actor - User requesting the unfurl.
   * @return Issue unfurl payload or error object.
   */
  public static unfurl: UnfurlSignature = async (url: string, actor?: User) => {
    const resource = JiraUtils.parseIssueUrl(url);

    if (!resource || !actor) {
      return;
    }

    const integrations = (await Integration.scope("withAuthentication").findAll(
      {
        where: {
          service: IntegrationService.Jira,
          teamId: actor.teamId,
        },
      }
    )) as Integration<IntegrationType.Embed>[];

    const integration = integrations.find((intg) => {
      const settings = intg.settings.jira;
      if (!settings?.url) {
        return false;
      }
      try {
        return JiraUtils.urlMatchesIntegration(new URL(url), settings.url);
      } catch {
        return false;
      }
    });

    const authentication = integration?.authentication;

    if (!integration || !authentication?.token) {
      Logger.info("jira", "No Jira integration available for unfurl", {
        url,
        teamId: actor.teamId,
        integrationCount: integrations.length,
      });
      return;
    }

    const settings = integration.settings.jira as JiraSettings | undefined;

    if (!settings?.url) {
      return;
    }

    const credentials = credentialsFromIntegration(settings, authentication);

    try {
      return await Jira.fetchIssue({
        baseUrl: settings.url,
        issueKey: resource.issueKey,
        credentials,
        browseUrl: url,
      });
    } catch (err) {
      Logger.warn("jira", "Failed to fetch resource from Jira", {
        url,
        issueKey: resource.issueKey,
        error: err instanceof Error ? err.message : String(err),
      });
      return { error: err instanceof Error ? err.message : "Unknown error" };
    }
  };

  /**
   * Verifies Jira credentials by calling the REST API.
   *
   * @param params - Connection parameters.
   * @return True when credentials are valid.
   */
  public static async verifyCredentials(params: {
    baseUrl: string;
    credentials: JiraRequestCredentials;
  }): Promise<boolean> {
    const { baseUrl, credentials } = params;
    await validateUrlNotPrivate(baseUrl);

    const apiVersion = credentials.isCloud ? "3" : "2";
    const url = `${JiraUtils.normalizeUrl(baseUrl)}/rest/api/${apiVersion}/myself`;

    const res = await jiraFetch(url, credentials);

    if (res.status === 200) {
      return true;
    }

    if (credentials.isCloud) {
      return false;
    }

    const serverInfoUrl = `${JiraUtils.normalizeUrl(baseUrl)}/rest/api/2/serverInfo`;
    const serverRes = await jiraFetch(serverInfoUrl, credentials);
    return serverRes.status === 200;
  }

  /**
   * Fetches and transforms a Jira issue into an unfurl payload.
   *
   * @param params - Issue fetch parameters.
   * @return Transformed issue unfurl.
   */
  public static async fetchIssue(params: {
    baseUrl: string;
    issueKey: string;
    credentials: JiraRequestCredentials;
    browseUrl: string;
  }): Promise<UnfurlIssueOrPR | { error: string }> {
    const { baseUrl, issueKey, credentials, browseUrl } = params;

    await validateUrlNotPrivate(baseUrl);

    const isCloud = credentials.isCloud;
    const apiUrl = JiraUtils.issueApiUrl(baseUrl, issueKey, isCloud);

    let res = await jiraFetch(apiUrl, credentials);

    if (
      (res.status === 401 || res.status === 403) &&
      credentials.authType === "pat" &&
      credentials.username
    ) {
      res = await jiraFetch(apiUrl, {
        ...credentials,
        authType: "basic",
      });
    }

    if (res.status === 404) {
      Logger.info("jira", "Issue not found", { issueKey, apiUrl });
      return { error: "Resource not found" };
    }

    if (res.status !== 200) {
      const errorBody = await res.text().catch(() => "");
      Logger.warn("jira", "Issue fetch failed", {
        issueKey,
        status: res.status,
        apiUrl,
        body: errorBody.slice(0, 500),
      });
      return { error: `Jira API returned status ${res.status}` };
    }

    const raw: unknown = await res.json();
    const parsed = JiraIssueResponseSchema.safeParse(raw);

    if (!parsed.success) {
      Logger.warn("jira", "Issue response validation failed", {
        issueKey,
        issues: parsed.error.flatten(),
      });
      return { error: "Unexpected Jira API response format" };
    }

    return Jira.transformIssue(parsed.data, browseUrl, baseUrl);
  }

  /**
   * Builds credentials for persistence from a connect request.
   *
   * @param params - Connect form values and existing authentication.
   * @return Token, optional P12 payload, and metadata for storage.
   */
  public static buildStoredCredentials(params: {
    isCloud: boolean;
    authType: JiraAuthType;
    username?: string;
    token?: string;
    existing?: IntegrationAuthentication | null;
    p12Base64?: string;
    p12Passphrase?: string;
    clearP12?: boolean;
  }) {
    const tokenToStore = params.token || params.existing?.token;

    if (!tokenToStore) {
      return { error: "Credentials are required" as const };
    }

    if (!params.isCloud && params.authType === "basic" && !params.username) {
      return { error: "Username is required" as const };
    }

    if (params.isCloud && !params.username && !params.existing) {
      return { error: "Email is required for Jira Cloud" as const };
    }

    let p12Base64 = params.existing?.refreshToken ?? undefined;
    let p12Passphrase = params.existing?.clientSecret ?? undefined;

    if (params.clearP12) {
      p12Base64 = undefined;
      p12Passphrase = undefined;
    } else if (params.p12Base64) {
      p12Base64 = params.p12Base64;
      p12Passphrase = params.p12Passphrase ?? undefined;
    }

    const credentials: JiraRequestCredentials = {
      isCloud: params.isCloud,
      authType: params.authType,
      email: params.isCloud ? params.username : undefined,
      username: params.username,
      token: tokenToStore,
      p12Base64,
      p12Passphrase,
    };

    return {
      tokenToStore,
      username: params.username,
      p12Base64,
      p12Passphrase,
      credentials,
      hasClientCertificate: !!p12Base64,
    };
  }

  private static transformIssue(
    data: z.infer<typeof JiraIssueResponseSchema>,
    browseUrl: string,
    baseUrl: string
  ): UnfurlIssueOrPR {
    const { fields } = data;
    const color = JiraUtils.statusColorForIssue(
      fields.status.name,
      fields.status.statusCategory?.colorName
    );

    const creator = fields.creator;
    const assignee = fields.assignee;

    const labels = (fields.labels ?? []).map((label) => {
      if (typeof label === "string") {
        return { name: label, color: "#42526E" };
      }

      return {
        name: label.name,
        color: label.color ? `#${label.color}` : "#42526E",
      };
    });

    return {
      type: UnfurlResourceType.Issue,
      url: browseUrl,
      id: data.key,
      title: fields.summary,
      description:
        typeof fields.description === "string" ? fields.description : null,
      author: {
        name: creator?.displayName ?? "Unknown",
        avatarUrl: JiraUtils.resolveAssetUrl(
          baseUrl,
          creator?.avatarUrls?.["48x48"]
        ) ?? "",
      },
      assignee: assignee
        ? {
            name: assignee.displayName,
            avatarUrl:
              JiraUtils.resolveAssetUrl(
                baseUrl,
                assignee.avatarUrls?.["48x48"]
              ) ?? "",
          }
        : null,
      issueTypeIconUrl: JiraUtils.resolveAssetUrl(
        baseUrl,
        fields.issuetype?.iconUrl
      ),
      labels,
      state: {
        type: fields.status.statusCategory?.name,
        name: fields.status.name,
        color,
      },
      createdAt: fields.created ?? new Date().toISOString(),
    };
  }
}
