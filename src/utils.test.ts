import { describe, expect, it } from "vitest";
import {
  base64Decode,
  base64Encode,
  convertBase,
  convertUnit,
  dateFields,
  decodeJwt,
  describeCron,
  diffText,
  formatJson,
  formatXml,
  jsonToYaml,
  parseUrl,
  password,
  regexInspect,
  textToolkit,
  urlDecode,
  urlEncode,
  yamlToJson,
} from "./utils";

describe("formatJson", () => {
  it("pretty prints JSON", () => {
    expect(formatJson('{"b":2,"a":1}')).toEqual({ ok: true, value: '{\n  "b": 2,\n  "a": 1\n}' });
  });

  it("returns an error for invalid JSON", () => {
    expect(formatJson("{").ok).toBe(false);
  });
});

describe("yaml conversion", () => {
  it("round trips simple objects", () => {
    const yaml = jsonToYaml('{"name":"DevUtils"}');
    expect(yaml.ok).toBe(true);
    expect(yaml.ok && yaml.value).toContain("name: DevUtils");
    expect(yaml.ok && yamlToJson(yaml.value).ok).toBe(true);
  });
});

describe("number base", () => {
  it("converts decimal to common bases", () => {
    expect(convertBase("255", 10)).toEqual({ ok: true, value: { decimal: "255", hexadecimal: "FF", octal: "377", binary: "11111111" } });
  });

  it("rejects invalid digits", () => {
    expect(convertBase("102", 2).ok).toBe(false);
  });
});

describe("dates and units", () => {
  it("parses unix seconds", () => {
    const result = dateFields("0");
    expect(result.ok && result.value.iso).toBe("1970-01-01T00:00:00.000Z");
  });

  it("converts meters to kilometers", () => {
    expect(convertUnit("1000", "length", "meters", "kilometers")).toEqual({ ok: true, value: "1" });
  });
});

describe("text utilities", () => {
  it("converts delimiters and case", () => {
    expect(textToolkit("a,b", { source: "comma", target: "newline", trim: false, collapse: false, casing: "upper", sort: false, unique: false })).toBe("A\nB");
  });

  it("inspects regex matches", () => {
    const result = regexInspect("(dev)", "i", "DevUtils", "$1-web");
    expect(result.ok && result.value.summary).toContain("Dev");
  });

  it("diffs text", () => {
    expect(diffText("macOS", "Web")).toContain("+ Web");
  });
});

describe("formatters and encoders", () => {
  it("formats xml", () => {
    expect(formatXml("<root><item>1</item></root>").ok).toBe(true);
  });

  it("describes cron", () => {
    const result = describeCron("*/5 * * * *");
    expect(result.ok && result.value).toContain("Every 5 minutes");
  });

  it("encodes and decodes URL components", () => {
    const encoded = urlEncode("a b");
    expect(encoded).toBe("a%20b");
    expect(urlDecode(encoded)).toEqual({ ok: true, value: "a b" });
  });

  it("encodes and decodes base64", () => {
    const encoded = base64Encode("Hello");
    expect(base64Decode(encoded)).toEqual({ ok: true, value: "Hello" });
  });

  it("decodes JWT payloads", () => {
    const result = decodeJwt("eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjMifQ.");
    expect(result.ok && result.value).toContain('"sub": "123"');
  });
});

describe("generators and parsers", () => {
  it("generates passwords from selected sets", () => {
    const result = password(12, { lower: true, upper: false, digits: false, symbols: false });
    expect(result.ok && result.value).toMatch(/^[a-z]{12}$/);
  });

  it("parses URLs", () => {
    const result = parseUrl("https://example.com/path?q=1");
    expect(result.ok && result.value).toContain('"hostname": "example.com"');
  });
});
