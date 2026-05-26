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
  diffTextChunks,
  formatJson,
  formatXml,
  generateCronExpression,
  jsonToYaml,
  parseUrl,
  password,
  regexInspect,
  textToolkit,
  urlDecode,
  urlEncode,
  yamlToJson,
  generateSshKeyPair,
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
    expect(textToolkit("a,b", { source: "comma", target: "newline", trim: false, collapse: false, casing: "upper", sort: false, unique: false, removeEmpty: false })).toBe("A\nB");
  });

  it("trims punctuation and handles multiple delimiters and empty removal", () => {
    expect(textToolkit("apple, banana,, cherry", { source: "comma", target: "newline", trim: true, collapse: false, casing: "none", sort: false, unique: false, removeEmpty: true })).toBe("apple\nbanana\ncherry");
  });

  it("inspects regex matches", () => {
    const result = regexInspect("(dev)", "i", "DevUtils", "$1-web");
    expect(result.ok && result.value.summary).toContain("Dev");
  });

  it("diffs text", () => {
    expect(diffText("macOS", "Web")).toContain("+ Web");
  });

  it("diffs text chunks", () => {
    const chunks = diffTextChunks("macOS", "Web");
    expect(chunks).toEqual([
      { type: "delete", value: "macOS" },
      { type: "insert", value: "Web" },
    ]);
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

  it("generates valid cron expressions", () => {
    const result = generateCronExpression({ frequency: "weekly", interval: 15, minute: 30, hour: 9, dayOfMonth: 1, dayOfWeek: 1 });
    expect(result).toEqual({ ok: true, value: "30 9 * * 1" });
    expect(result.ok && describeCron(result.value).ok).toBe(true);
  });

  it("generates general cron expressions for advanced cases", () => {
    // 1. Hourly interval: Every 3 hours at minute 15
    const hourlyInterval = generateCronExpression({
      frequency: "hourly",
      hourlyType: "everyXHours",
      interval: 3,
      minute: 15,
    });
    expect(hourlyInterval).toEqual({ ok: true, value: "15 */3 * * *" });
    expect(hourlyInterval.ok && describeCron(hourlyInterval.value).ok).toBe(true);

    // 2. Daily type: weekday (Mon-Fri) at 14:30
    const dailyWeekday = generateCronExpression({
      frequency: "daily",
      dailyType: "weekday",
      minute: 30,
      hour: 14,
    });
    expect(dailyWeekday).toEqual({ ok: true, value: "30 14 * * 1-5" });
    expect(dailyWeekday.ok && describeCron(dailyWeekday.value).ok).toBe(true);

    // 3. Daily interval: Every 5 days at 06:15
    const dailyInterval = generateCronExpression({
      frequency: "daily",
      dailyType: "everyXDays",
      interval: 5,
      minute: 15,
      hour: 6,
    });
    expect(dailyInterval).toEqual({ ok: true, value: "15 6 */5 * *" });
    expect(dailyInterval.ok && describeCron(dailyInterval.value).ok).toBe(true);

    // 4. Weekly multi-day selection: Mon, Wed, Fri at 18:00
    const weeklyMulti = generateCronExpression({
      frequency: "weekly",
      daysOfWeek: [1, 3, 5],
      minute: 0,
      hour: 18,
    });
    expect(weeklyMulti).toEqual({ ok: true, value: "0 18 * * 1,3,5" });
    expect(weeklyMulti.ok && describeCron(weeklyMulti.value).ok).toBe(true);

    // 5. Monthly interval: Every 2 months on the 10th at 00:00
    const monthlyInterval = generateCronExpression({
      frequency: "monthly",
      monthlyType: "everyXMonths",
      interval: 2,
      dayOfMonth: 10,
      minute: 0,
      hour: 0,
    });
    expect(monthlyInterval).toEqual({ ok: true, value: "0 0 10 */2 *" });
    expect(monthlyInterval.ok && describeCron(monthlyInterval.value).ok).toBe(true);

    // 6. Yearly: Every year on October 15th at 12:30
    const yearly = generateCronExpression({
      frequency: "yearly",
      month: 10,
      dayOfMonth: 15,
      hour: 12,
      minute: 30,
    });
    expect(yearly).toEqual({ ok: true, value: "30 12 15 10 *" });
    expect(yearly.ok && describeCron(yearly.value).ok).toBe(true);
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

describe("generateSshKeyPair", () => {
  it("generates Ed25519 keys", async () => {
    const result = await generateSshKeyPair({ algorithm: "ed25519", comment: "test@example.com" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.publicKey).toContain("ssh-ed25519");
      expect(result.value.publicKey).toContain("test@example.com");
      expect(result.value.privateKey).toContain("-----BEGIN OPENSSH PRIVATE KEY-----");
    }
  });

  it("generates RSA keys", async () => {
    const result = await generateSshKeyPair({ algorithm: "rsa", bits: 2048, comment: "test-rsa@example.com" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.publicKey).toContain("ssh-rsa");
      expect(result.value.publicKey).toContain("test-rsa@example.com");
      expect(result.value.privateKey).toContain("-----BEGIN RSA PRIVATE KEY-----");
    }
  });
});
