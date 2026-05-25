import {
  IntegrationService,
  type IssueTrackerIntegrationService,
} from "../types";
import { isJiraCloudHostname, parseJiraIssueUrl } from "./jiraUrl";

/**
 * Determines the issue tracker integration service for a given issue URL.
 *
 * @param url - Issue URL from an unfurl response.
 * @return Matching integration service.
 */
export function getIssueTrackerServiceFromUrl(
  url: string
): IssueTrackerIntegrationService {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "github.com") {
      return IntegrationService.GitHub;
    }

    if (parsed.hostname === "linear.app") {
      return IntegrationService.Linear;
    }

    if (isJiraCloudHostname(parsed.hostname) || parseJiraIssueUrl(url)) {
      return IntegrationService.Jira;
    }
  } catch {
    // Invalid URL
  }

  return IntegrationService.GitLab;
}
