import type { Agent } from "node:http";
import fetch from "@server/utils/fetch";
import { createJiraHttpsAgentFromP12 } from "./p12";

export type JiraAuthType = "pat" | "basic";

export interface JiraRequestCredentials {
  isCloud: boolean;
  authType: JiraAuthType;
  email?: string;
  username?: string;
  token: string;
  p12Base64?: string;
  p12Passphrase?: string;
}

/**
 * Builds authorization headers for a Jira REST request.
 *
 * @param credentials - Jira authentication credentials.
 * @return HTTP headers including Authorization.
 */
export function buildJiraAuthHeaders(
  credentials: JiraRequestCredentials
): Record<string, string> {
  const { isCloud, authType, email, username, token } = credentials;

  if (isCloud || authType === "basic") {
    const user = isCloud ? (email ?? "") : (username ?? "");
    const encoded = Buffer.from(`${user}:${token}`).toString("base64");
    return {
      Authorization: `Basic ${encoded}`,
      Accept: "application/json",
    };
  }

  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

/**
 * Creates an HTTPS agent configured with a client P12 certificate.
 *
 * @param p12Base64 - Base64-encoded P12/PFX file contents.
 * @param p12Passphrase - Passphrase for the P12 file.
 * @return HTTPS agent, or undefined when no certificate is configured.
 */
export function createJiraHttpsAgent(
  p12Base64?: string,
  p12Passphrase?: string
): Agent | undefined {
  if (!p12Base64) {
    return undefined;
  }

  return createJiraHttpsAgentFromP12(p12Base64, p12Passphrase);
}

/**
 * Performs an authenticated HTTP request to Jira with optional mTLS.
 *
 * @param url - Request URL.
 * @param credentials - Jira authentication and TLS credentials.
 * @param init - Additional fetch options.
 * @return Fetch response.
 */
export async function jiraFetch(
  url: string,
  credentials: JiraRequestCredentials,
  init?: Parameters<typeof fetch>[1]
) {
  const headers = {
    ...buildJiraAuthHeaders(credentials),
    ...(init?.headers as Record<string, string> | undefined),
  };

  const agent = createJiraHttpsAgent(
    credentials.p12Base64,
    credentials.p12Passphrase
  );

  return fetch(url, {
    ...init,
    headers,
    agent,
    allowPrivateIPAddress: true,
  });
}

/**
 * Reads Jira transport credentials from integration records.
 *
 * @param settings - Jira settings from the integration.
 * @param authentication - Linked authentication record.
 * @return Credentials for Jira HTTP requests.
 */
export function credentialsFromIntegration(
  settings: {
    isCloud?: boolean;
    email?: string;
    authType?: JiraAuthType;
    username?: string;
  },
  authentication: {
    token: string;
    clientId: string | null;
    clientSecret: string | null;
    refreshToken: string | null;
  }
): JiraRequestCredentials {
  const isCloud = settings.isCloud ?? false;
  const authType: JiraAuthType =
    settings.authType ?? (isCloud ? "basic" : "pat");

  return {
    isCloud,
    authType,
    email: settings.email,
    username: settings.username ?? authentication.clientId ?? undefined,
    token: authentication.token,
    p12Base64: authentication.refreshToken || undefined,
    p12Passphrase: authentication.clientSecret ?? undefined,
  };
}
