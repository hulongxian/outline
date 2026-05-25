const ISSUE_KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/i;

export interface ParsedJiraIssueUrl {
  issueKey: string;
  hostname: string;
}

/**
 * Returns whether the hostname belongs to Jira Cloud.
 *
 * @param hostname - URL hostname to check.
 * @return True when the host is an Atlassian Cloud site.
 */
export function isJiraCloudHostname(hostname: string): boolean {
  return hostname.endsWith(".atlassian.net");
}

/**
 * Normalizes a Jira instance URL by trimming trailing slashes.
 *
 * @param url - Raw Jira base URL.
 * @return Normalized URL without trailing slash.
 */
export function normalizeJiraUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Parses a Jira issue URL and extracts the issue key.
 *
 * @param url - Full Jira issue URL.
 * @return Parsed issue metadata, or undefined when not a Jira issue URL.
 */
export function parseJiraIssueUrl(url: string): ParsedJiraIssueUrl | undefined {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/browse\/([^/]+)\/?$/i);

    if (!match) {
      return;
    }

    const issueKey = match[1].toUpperCase();

    if (!ISSUE_KEY_PATTERN.test(issueKey)) {
      return;
    }

    return {
      issueKey,
      hostname: parsed.hostname,
    };
  } catch {
    return;
  }
}

/**
 * Checks whether a URL hostname matches a configured Jira integration.
 *
 * @param url - URL to test.
 * @param jiraUrl - Configured Jira base URL from integration settings.
 * @return True when the URL belongs to the configured Jira instance.
 */
export function jiraUrlMatchesIntegration(url: URL, jiraUrl: string): boolean {
  try {
    const configured = new URL(normalizeJiraUrl(jiraUrl));
    return url.hostname === configured.hostname;
  } catch {
    return false;
  }
}
