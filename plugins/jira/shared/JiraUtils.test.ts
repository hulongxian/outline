import { describe, expect, it } from "vitest";
import { JiraUtils } from "./JiraUtils";

describe("JiraUtils", () => {
  describe("parseIssueUrl", () => {
    it("parses browse URLs", () => {
      const result = JiraUtils.parseIssueUrl(
        "https://jira.example.com/browse/STBSW-380"
      );
      expect(result).toEqual({
        issueKey: "STBSW-380",
        hostname: "jira.example.com",
      });
    });

    it("returns undefined for non-issue URLs", () => {
      expect(
        JiraUtils.parseIssueUrl("https://jira.example.com/projects/STBSW")
      ).toBeUndefined();
    });
  });

  describe("isCloudHostname", () => {
    it("detects atlassian.net hosts", () => {
      expect(JiraUtils.isCloudHostname("acme.atlassian.net")).toBe(true);
      expect(JiraUtils.isCloudHostname("jira.example.com")).toBe(false);
    });
  });

  describe("urlMatchesIntegration", () => {
    it("matches configured hostname", () => {
      const url = new URL("https://jira.example.com/browse/ABC-1");
      expect(
        JiraUtils.urlMatchesIntegration(url, "https://jira.example.com")
      ).toBe(true);
    });
  });

  describe("configuredUrlsMatch", () => {
    it("matches URLs with the same hostname", () => {
      expect(
        JiraUtils.configuredUrlsMatch(
          "https://jira.example.com",
          "https://jira.example.com/"
        )
      ).toBe(true);
      expect(
        JiraUtils.configuredUrlsMatch(
          "https://jira.example.com",
          "https://other.example.com"
        )
      ).toBe(false);
    });
  });

  describe("statusColorFromCategory", () => {
    it("maps known colors", () => {
      expect(JiraUtils.statusColorFromCategory("green")).toBe("#00875A");
      expect(JiraUtils.statusColorFromCategory("unknown")).toBe("#5E6C84");
    });
  });

  describe("statusColorForIssue", () => {
    it("prefers vivid colors for common status names", () => {
      expect(JiraUtils.statusColorForIssue("Open", "blue-gray")).toBe("#0065FF");
      expect(JiraUtils.statusColorForIssue("Closed", "green")).toBe("#00875A");
      expect(JiraUtils.statusColorForIssue("Refused", "green")).toBe("#DE350B");
      expect(JiraUtils.statusColorForIssue("To Do", "blue-gray")).toBe(
        "#0065FF"
      );
    });

    it("falls back to category color for unknown statuses", () => {
      expect(JiraUtils.statusColorForIssue("Custom Status", "yellow")).toBe(
        "#FF991F"
      );
    });
  });

  describe("resolveAssetUrl", () => {
    it("resolves relative icon paths", () => {
      expect(
        JiraUtils.resolveAssetUrl(
          "https://jira.example.com",
          "/secure/viewavatar?size=medium"
        )
      ).toBe("https://jira.example.com/secure/viewavatar?size=medium");
    });
  });

  describe("issueApiUrl", () => {
    it("uses api v3 for cloud", () => {
      expect(
        JiraUtils.issueApiUrl("https://acme.atlassian.net", "ABC-1", true)
      ).toContain("/rest/api/3/issue/ABC-1");
    });

    it("uses api v2 for server", () => {
      expect(
        JiraUtils.issueApiUrl("https://jira.example.com", "ABC-1", false)
      ).toContain("/rest/api/2/issue/ABC-1");
    });
  });
});
