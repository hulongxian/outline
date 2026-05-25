import { describe, expect, it } from "vitest";
import { IntegrationService } from "../types";
import { getIssueTrackerServiceFromUrl } from "./issueTracker";

describe("getIssueTrackerServiceFromUrl", () => {
  it("detects GitHub", () => {
    expect(
      getIssueTrackerServiceFromUrl("https://github.com/org/repo/issues/1")
    ).toBe(IntegrationService.GitHub);
  });

  it("detects Linear", () => {
    expect(
      getIssueTrackerServiceFromUrl("https://linear.app/team/issue/abc")
    ).toBe(IntegrationService.Linear);
  });

  it("detects Jira Cloud", () => {
    expect(
      getIssueTrackerServiceFromUrl(
        "https://acme.atlassian.net/browse/ABC-1"
      )
    ).toBe(IntegrationService.Jira);
  });

  it("detects Jira browse URLs on custom hosts", () => {
    expect(
      getIssueTrackerServiceFromUrl("https://jira.example.com/browse/ABC-1")
    ).toBe(IntegrationService.Jira);
  });
});
