import { describe, expect, it } from "vitest";
import {
  isJiraCloudHostname,
  jiraUrlMatchesIntegration,
  normalizeJiraUrl,
  parseJiraIssueUrl,
} from "./jiraUrl";

describe("jiraUrl", () => {
  describe("parseJiraIssueUrl", () => {
    it("parses browse URLs", () => {
      const result = parseJiraIssueUrl(
        "https://jira.example.com/browse/STBSW-380"
      );
      expect(result).toEqual({
        issueKey: "STBSW-380",
        hostname: "jira.example.com",
      });
    });

    it("returns undefined for non-issue URLs", () => {
      expect(
        parseJiraIssueUrl("https://jira.example.com/projects/STBSW")
      ).toBeUndefined();
    });
  });

  describe("isJiraCloudHostname", () => {
    it("detects atlassian.net hosts", () => {
      expect(isJiraCloudHostname("acme.atlassian.net")).toBe(true);
      expect(isJiraCloudHostname("jira.example.com")).toBe(false);
    });
  });

  describe("jiraUrlMatchesIntegration", () => {
    it("matches configured hostname", () => {
      const url = new URL("https://jira.example.com/browse/ABC-1");
      expect(
        jiraUrlMatchesIntegration(url, "https://jira.example.com")
      ).toBe(true);
    });
  });

  describe("normalizeJiraUrl", () => {
    it("trims trailing slashes", () => {
      expect(normalizeJiraUrl("https://jira.example.com/")).toBe(
        "https://jira.example.com"
      );
    });
  });
});
