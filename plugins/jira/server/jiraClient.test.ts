import { describe, expect, it } from "vitest";
import { buildJiraAuthHeaders } from "./jiraClient";

describe("buildJiraAuthHeaders", () => {
  it("uses Bearer for Data Center PAT", () => {
    const headers = buildJiraAuthHeaders({
      isCloud: false,
      authType: "pat",
      token: "pat-token",
    });

    expect(headers.Authorization).toBe("Bearer pat-token");
  });

  it("uses Basic for Data Center username and password", () => {
    const headers = buildJiraAuthHeaders({
      isCloud: false,
      authType: "basic",
      username: "jira-user",
      token: "secret",
    });

    expect(headers.Authorization).toBe(
      `Basic ${Buffer.from("jira-user:secret").toString("base64")}`
    );
  });

  it("uses Basic for Jira Cloud email and API token", () => {
    const headers = buildJiraAuthHeaders({
      isCloud: true,
      authType: "basic",
      email: "user@example.com",
      token: "api-token",
    });

    expect(headers.Authorization).toBe(
      `Basic ${Buffer.from("user@example.com:api-token").toString("base64")}`
    );
  });
});
