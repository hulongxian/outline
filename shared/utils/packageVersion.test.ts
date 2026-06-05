import {
  getBaseVersion,
  getFullVersion,
  getSubVersion,
  parseBaseVersion,
} from "./packageVersion";

describe("packageVersion", () => {
  it("getBaseVersion returns package.json version", () => {
    expect(getBaseVersion()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("getSubVersion returns a non-negative integer", () => {
    expect(getSubVersion()).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(getSubVersion())).toBe(true);
  });

  it("getFullVersion combines base and sub version", () => {
    expect(getFullVersion()).toBe(`${getBaseVersion()}_${getSubVersion()}`);
  });

  describe("parseBaseVersion", () => {
    it("returns the same string when no sub-version suffix is present", () => {
      expect(parseBaseVersion("1.7.1")).toBe("1.7.1");
    });

    it("strips a numeric sub-version suffix", () => {
      expect(parseBaseVersion("1.7.1_12")).toBe("1.7.1");
    });

    it("returns the original string when suffix is not numeric", () => {
      expect(parseBaseVersion("1.7.1_beta")).toBe("1.7.1_beta");
    });
  });
});
