import { describe, expect, it } from "vitest";
import { decodeP12Base64, opensslCliSupportsLegacyFlag } from "./p12";

describe("decodeP12Base64", () => {
  it("decodes base64 with surrounding whitespace", () => {
    const raw = Buffer.from("pkcs12-test");
    const encoded = raw.toString("base64");
    const withWhitespace = `\n ${encoded} \n`;

    expect(decodeP12Base64(withWhitespace)).toEqual(raw);
  });

  it("throws when base64 is empty", () => {
    expect(() => decodeP12Base64("")).toThrow("P12 certificate is empty");
  });
});

describe("opensslCliSupportsLegacyFlag", () => {
  it("returns a boolean", () => {
    expect(typeof opensslCliSupportsLegacyFlag()).toBe("boolean");
  });
});
