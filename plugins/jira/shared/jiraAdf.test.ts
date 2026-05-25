import { describe, expect, it } from "vitest";
import { jiraBodyToPlainText } from "./jiraAdf";

describe("jiraBodyToPlainText", () => {
  it("returns plain strings unchanged", () => {
    expect(jiraBodyToPlainText("Hello world")).toBe("Hello world");
    expect(jiraBodyToPlainText("  ")).toBeNull();
  });

  it("converts ADF paragraphs and lists", () => {
    const body = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "First line" }],
        },
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Step one" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Step two" }],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(jiraBodyToPlainText(body)).toBe("First line\n\n1. Step one\n2. Step two");
  });
});
