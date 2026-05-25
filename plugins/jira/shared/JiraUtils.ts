import { integrationSettingsPath } from "@shared/utils/routeHelpers";
import {
  isJiraCloudHostname,
  jiraUrlMatchesIntegration,
  normalizeJiraUrl,
  parseJiraIssueUrl,
  type ParsedJiraIssueUrl,
} from "@shared/utils/jiraUrl";

export type { ParsedJiraIssueUrl };

export class JiraUtils {
  public static settingsUrl = integrationSettingsPath("jira");

  /**
   * Returns whether the hostname belongs to Jira Cloud.
   *
   * @param hostname - URL hostname to check.
   * @return True when the host is an Atlassian Cloud site.
   */
  public static isCloudHostname(hostname: string): boolean {
    return isJiraCloudHostname(hostname);
  }

  /**
   * Normalizes a Jira instance URL by trimming trailing slashes.
   *
   * @param url - Raw Jira base URL.
   * @return Normalized URL without trailing slash.
   */
  public static normalizeUrl(url: string): string {
    return normalizeJiraUrl(url);
  }

  /**
   * Parses a Jira issue URL and extracts the issue key.
   *
   * @param url - Full Jira issue URL.
   * @return Parsed issue metadata, or undefined when not a Jira issue URL.
   */
  public static parseIssueUrl(url: string): ParsedJiraIssueUrl | undefined {
    return parseJiraIssueUrl(url);
  }

  /**
   * Checks whether a URL hostname matches a configured Jira integration.
   *
   * @param url - URL to test.
   * @param jiraUrl - Configured Jira base URL from integration settings.
   * @return True when the URL belongs to the configured Jira instance.
   */
  public static urlMatchesIntegration(url: URL, jiraUrl: string): boolean {
    return jiraUrlMatchesIntegration(url, jiraUrl);
  }

  /**
   * Returns whether two configured Jira base URLs refer to the same host.
   *
   * @param urlA - First Jira base URL.
   * @param urlB - Second Jira base URL.
   * @return True when both URLs share the same hostname.
   */
  public static configuredUrlsMatch(urlA: string, urlB: string): boolean {
    try {
      return jiraUrlMatchesIntegration(new URL(normalizeJiraUrl(urlA)), urlB);
    } catch {
      return false;
    }
  }

  /**
   * Maps Jira status category color names to vivid accent colors for badges.
   *
   * @param colorName - Jira statusCategory.colorName value.
   * @return CSS color string.
   */
  public static statusColorFromCategory(colorName: string | undefined): string {
    switch (colorName) {
      case "blue-gray":
        return "#5E6C84";
      case "yellow":
        return "#FF991F";
      case "green":
        return "#00875A";
      case "blue":
        return "#0065FF";
      case "red":
      case "brown":
        return "#DE350B";
      case "purple":
        return "#6554C0";
      default:
        return "#5E6C84";
    }
  }

  /**
   * Resolves a vivid badge color from status name and Jira status category.
   *
   * @param statusName - Human-readable workflow status (e.g. "Open", "Closed").
   * @param categoryColorName - Jira statusCategory.colorName value.
   * @return CSS color string for status badges.
   */
  public static statusColorForIssue(
    statusName: string,
    categoryColorName?: string
  ): string {
    const normalized = statusName.trim().toUpperCase().replace(/\s+/g, " ");

    const byName: Record<string, string> = {
      OPEN: "#0065FF",
      "TO DO": "#0065FF",
      TODO: "#0065FF",
      NEW: "#0065FF",
      BACKLOG: "#6554C0",
      "IN PROGRESS": "#FF991F",
      "IN REVIEW": "#6554C0",
      REVIEW: "#6554C0",
      TESTING: "#FF991F",
      DONE: "#00875A",
      CLOSED: "#00875A",
      RESOLVED: "#00875A",
      COMPLETE: "#00875A",
      COMPLETED: "#00875A",
      REFUSED: "#DE350B",
      REJECTED: "#DE350B",
      CANCELLED: "#DE350B",
      CANCELED: "#DE350B",
      POSTPONED: "#FF991F",
      BLOCKED: "#DE350B",
      REOPENED: "#0065FF",
    };

    if (byName[normalized]) {
      return byName[normalized];
    }

    return JiraUtils.statusColorFromCategory(categoryColorName);
  }

  /**
   * Builds the REST API path for fetching an issue.
   *
   * @param baseUrl - Jira instance base URL.
   * @param issueKey - Jira issue key.
   * @param isCloud - Whether the instance is Jira Cloud.
   * @return Full REST API URL for the issue.
   */
  public static issueApiUrl(
    baseUrl: string,
    issueKey: string,
    isCloud: boolean
  ): string {
    const apiVersion = isCloud ? "3" : "2";
    return `${normalizeJiraUrl(baseUrl)}/rest/api/${apiVersion}/issue/${issueKey}?fields=summary,status,assignee,issuetype,creator,labels,description,created`;
  }

  /**
   * Builds a browse URL for an issue key.
   *
   * @param baseUrl - Jira instance base URL.
   * @param issueKey - Jira issue key.
   * @return Browse URL for the issue.
   */
  public static browseUrl(baseUrl: string, issueKey: string): string {
    return `${normalizeJiraUrl(baseUrl)}/browse/${issueKey}`;
  }

  /**
   * Resolves a Jira-relative asset URL against the instance base URL.
   *
   * @param baseUrl - Jira instance base URL.
   * @param assetUrl - Absolute or relative asset path from the API.
   * @return Absolute URL, or undefined when input is empty.
   */
  public static resolveAssetUrl(
    baseUrl: string,
    assetUrl: string | undefined
  ): string | undefined {
    if (!assetUrl) {
      return undefined;
    }

    try {
      return new URL(assetUrl, normalizeJiraUrl(baseUrl)).toString();
    } catch {
      return assetUrl.startsWith("http") ? assetUrl : undefined;
    }
  }
}
