import yaml from "js-yaml";
import JSON5 from "json5";
import forge from "node-forge";
import { format as formatSql } from "sql-formatter";
import cronstrue from "cronstrue";

export type Result<T> = { ok: true; value: T; warning?: string } | { ok: false; error: string };

export const emptyOk = <T>(value: T): Result<T> => ({ ok: true, value });

export function formatJson(input: string): Result<string> {
  const trimmed = input.trim();
  if (!trimmed) return emptyOk("");
  try {
    return { ok: true, value: JSON.stringify(JSON5.parse(trimmed), null, 2) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid JSON." };
  }
}

export function jsonToYaml(input: string): Result<string> {
  const formatted = formatJson(input);
  if (!formatted.ok) return formatted;
  if (!formatted.value) return emptyOk("");
  return { ok: true, value: yaml.dump(JSON.parse(formatted.value), { noRefs: true }) };
}

export function yamlToJson(input: string): Result<string> {
  if (!input.trim()) return emptyOk("");
  try {
    return { ok: true, value: JSON.stringify(yaml.load(input), null, 2) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid YAML." };
  }
}

export function jsonToCsv(input: string): Result<string> {
  const formatted = formatJson(input);
  if (!formatted.ok) return formatted;
  if (!formatted.value) return emptyOk("");
  const parsed = JSON.parse(formatted.value);
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  if (!rows.every((row) => row && typeof row === "object" && !Array.isArray(row))) {
    return { ok: false, error: "JSON must be an object or an array of objects." };
  }

  const headers = [...new Set(rows.flatMap((row) => Object.keys(row as Record<string, unknown>)))];
  const escapeCell = (value: unknown) => {
    const raw = value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
    return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
  };

  return {
    ok: true,
    value: [
      headers.map(escapeCell).join(","),
      ...rows.map((row) => headers.map((header) => escapeCell((row as Record<string, unknown>)[header])).join(",")),
    ].join("\n"),
  };
}

export function csvToJson(input: string): Result<string> {
  if (!input.trim()) return emptyOk("");
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (quoted) return { ok: false, error: "CSV has an unterminated quoted field." };
  row.push(field);
  rows.push(row);
  const [headers, ...dataRows] = rows.filter((cells) => cells.some((cell) => cell.length > 0));
  if (!headers?.length) return emptyOk("[]");

  const objects = dataRows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
  return { ok: true, value: JSON.stringify(objects, null, 2) };
}

export function convertBase(value: string, fromBase: number): Result<Record<string, string>> {
  const cleaned = value.trim().replace(/[,_\s]/g, "").replace(/^0[xob]/i, "");
  if (!cleaned) return emptyOk({ decimal: "", hexadecimal: "", octal: "", binary: "" });
  const sign = cleaned.startsWith("-") ? "-" : "";
  const digits = cleaned.replace(/^[+-]/, "");
  if (!digits || !new RegExp(`^[0-${Math.min(fromBase - 1, 9)}${fromBase === 16 ? "a-fA-F" : ""}]+$`).test(digits)) {
    return { ok: false, error: `Invalid base-${fromBase} number.` };
  }
  const parsed = [...digits.toLowerCase()].reduce((total, char) => {
    const value = Number.parseInt(char, 36);
    return total * BigInt(fromBase) + BigInt(value);
  }, 0n);
  const number = sign ? -parsed : parsed;
  return {
    ok: true,
    value: {
      decimal: number.toString(10),
      hexadecimal: number.toString(16).toUpperCase(),
      octal: number.toString(8),
      binary: number.toString(2),
    },
  };
}

export function dateFields(input: string): Result<Record<string, string>> {
  const trimmed = input.trim();
  const date = trimmed
    ? /^\d+$/.test(trimmed)
      ? new Date(trimmed.length > 10 ? Number(trimmed) : Number(trimmed) * 1000)
      : new Date(trimmed)
    : new Date();
  if (Number.isNaN(date.getTime())) return { ok: false, error: "Invalid date or timestamp." };
  return {
    ok: true,
    value: {
      iso: date.toISOString(),
      unixSeconds: Math.floor(date.getTime() / 1000).toString(),
      unixMilliseconds: date.getTime().toString(),
      local: date.toLocaleString(),
      utc: date.toUTCString(),
    },
  };
}

const unitFactors = {
  length: { meters: 1, kilometers: 1000, centimeters: 0.01, millimeters: 0.001, miles: 1609.344, yards: 0.9144, feet: 0.3048, inches: 0.0254 },
  mass: { kilograms: 1, grams: 0.001, milligrams: 0.000001, metricTons: 1000, pounds: 0.45359237, ounces: 0.028349523125, stones: 6.35029318 },
  area: { squareMeters: 1, squareKilometers: 1_000_000, hectares: 10_000, acres: 4046.8564224, squareFeet: 0.09290304, squareInches: 0.00064516 },
  volume: { liters: 1, milliliters: 0.001, cubicMeters: 1000, gallons: 3.785411784, quarts: 0.946352946, pints: 0.473176473, cups: 0.2365882365, fluidOunces: 0.0295735295625 },
};
export type UnitCategory = keyof typeof unitFactors | "temperature";

export function unitNames(category: UnitCategory): string[] {
  return category === "temperature" ? ["celsius", "fahrenheit", "kelvin"] : Object.keys(unitFactors[category]);
}

export function convertUnit(value: string, category: UnitCategory, from: string, to: string): Result<string> {
  const number = Number(value);
  if (!Number.isFinite(number)) return { ok: false, error: "Enter a numeric value." };
  let converted: number;
  if (category === "temperature") {
    const celsius = from === "celsius" ? number : from === "fahrenheit" ? (number - 32) * (5 / 9) : number - 273.15;
    converted = to === "celsius" ? celsius : to === "fahrenheit" ? celsius * (9 / 5) + 32 : celsius + 273.15;
  } else {
    const factors = unitFactors[category];
    converted = (number * factors[from as keyof typeof factors]) / factors[to as keyof typeof factors];
  }
  return { ok: true, value: Number(converted.toPrecision(12)).toString() };
}

export function textToolkit(input: string, options: { source: string; target: string; trim: boolean; collapse: boolean; casing: string; sort: boolean; unique: boolean; removeEmpty: boolean }): string {
  const token = (name: string) => (name === "comma" ? "," : name === "space" ? " " : "\n");
  
  const sourceDelim = token(options.source);
  const targetDelim = token(options.target);

  let items: string[];
  if (options.source === "newline") {
    items = input.split(/\r?\n/);
  } else {
    items = input.split(sourceDelim);
  }

  let processedItems = items.map((item) => {
    let result = item;
    
    if (options.trim) {
      result = result.replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, "");
    }
    
    if (options.casing === "upper") {
      result = result.toUpperCase();
    } else if (options.casing === "lower") {
      result = result.toLowerCase();
    }
    
    return result;
  });

  if (options.removeEmpty) {
    processedItems = processedItems.filter((item) => item !== "");
  }

  if (options.unique) {
    processedItems = [...new Set(processedItems)];
  }

  if (options.sort) {
    processedItems = processedItems.sort((a, b) => a.localeCompare(b));
  }

  let output = processedItems.join(targetDelim);

  if (options.collapse) {
    output = output.replace(/([\p{P}])\1+/gu, "$1");
  }

  return output;
}

export function regexInspect(pattern: string, flags: string, input: string, replacement: string): Result<{ summary: string; replaced: string }> {
  try {
    const regex = new RegExp(pattern, flags.includes("g") ? flags : `${flags}g`);
    const matches = [...input.matchAll(regex)];
    const summary = matches.map((match, index) => `${index + 1}. ${match[0]} @ ${match.index}${match.length > 1 ? ` groups: ${match.slice(1).join(", ")}` : ""}`).join("\n");
    return { ok: true, value: { summary: summary || "No matches.", replaced: replacement ? input.replace(regex, replacement) : "" } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid regular expression." };
  }
}

export function formatXml(input: string): Result<string> {
  if (!input.trim()) return emptyOk("");
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, "application/xml");
  if (doc.querySelector("parsererror")) return { ok: false, error: "Invalid XML." };
  const raw = new XMLSerializer().serializeToString(doc);
  let indent = "";
  return {
    ok: true,
    value: raw.replace(/(>)(<)(\/*)/g, "$1\n$2$3").split("\n").map((line) => {
      if (/^<\/.+>/.test(line)) indent = indent.slice(2);
      const out = indent + line;
      if (/^<[^!?/].*[^/]?>$/.test(line) && !line.includes("</")) indent += "  ";
      return out;
    }).join("\n"),
  };
}

export function safeSql(input: string): Result<string> {
  if (!input.trim()) return emptyOk("");
  try {
    return { ok: true, value: formatSql(input, { language: "sql" }) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid SQL." };
  }
}

export function describeCron(input: string): Result<string> {
  if (!input.trim()) return emptyOk("");
  try {
    return { ok: true, value: cronstrue.toString(input) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid cron expression." };
  }
}

export type CronFrequency = "minutes" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";

export interface CronScheduleConfig {
  frequency: CronFrequency;
  interval?: number;
  minute?: number;
  hour?: number;
  dayOfMonth?: number;
  daysOfWeek?: number[];
  dayOfWeek?: number;
  month?: number;
  dailyType?: "everyDay" | "everyXDays" | "weekday";
  hourlyType?: "everyHour" | "everyXHours";
  monthlyType?: "everyMonth" | "everyXMonths";
}

function inRange(value: number, min: number, max: number, label: string): Result<number> {
  if (!Number.isInteger(value) || value < min || value > max) {
    return { ok: false, error: `${label} must be between ${min} and ${max}.` };
  }
  return { ok: true, value };
}

export function generateCronExpression(config: CronScheduleConfig): Result<string> {
  const minuteVal = config.minute !== undefined ? config.minute : 0;
  const hourVal = config.hour !== undefined ? config.hour : 0;
  const dayOfMonthVal = config.dayOfMonth !== undefined ? config.dayOfMonth : 1;
  const monthVal = config.month !== undefined ? config.month : 1;
  const intervalVal = config.interval !== undefined ? config.interval : 1;

  let daysOfWeekVal = config.daysOfWeek;
  if (!daysOfWeekVal && config.dayOfWeek !== undefined) {
    daysOfWeekVal = [config.dayOfWeek];
  }
  if (!daysOfWeekVal) {
    daysOfWeekVal = [1];
  }

  const hourlyType = config.hourlyType || "everyHour";
  const dailyType = config.dailyType || "everyDay";
  const monthlyType = config.monthlyType || "everyMonth";

  switch (config.frequency) {
    case "minutes": {
      const interval = inRange(intervalVal, 1, 59, "Minute interval");
      if (!interval.ok) return interval;
      return { ok: true, value: `*/${interval.value} * * * *` };
    }
    case "hourly": {
      const minute = inRange(minuteVal, 0, 59, "Minute");
      if (!minute.ok) return minute;
      if (hourlyType === "everyXHours") {
        const interval = inRange(intervalVal, 1, 23, "Hour interval");
        if (!interval.ok) return interval;
        return { ok: true, value: `${minute.value} */${interval.value} * * *` };
      }
      return { ok: true, value: `${minute.value} * * * *` };
    }
    case "daily": {
      const minute = inRange(minuteVal, 0, 59, "Minute");
      if (!minute.ok) return minute;
      const hour = inRange(hourVal, 0, 23, "Hour");
      if (!hour.ok) return hour;

      if (dailyType === "everyXDays") {
        const interval = inRange(intervalVal, 1, 30, "Day interval");
        if (!interval.ok) return interval;
        return { ok: true, value: `${minute.value} ${hour.value} */${interval.value} * *` };
      } else if (dailyType === "weekday") {
        return { ok: true, value: `${minute.value} ${hour.value} * * 1-5` };
      }
      return { ok: true, value: `${minute.value} ${hour.value} * * *` };
    }
    case "weekly": {
      const minute = inRange(minuteVal, 0, 59, "Minute");
      if (!minute.ok) return minute;
      const hour = inRange(hourVal, 0, 23, "Hour");
      if (!hour.ok) return hour;

      if (daysOfWeekVal.length === 0) {
        return { ok: false, error: "At least one weekday must be selected." };
      }
      for (const day of daysOfWeekVal) {
        const d = inRange(day, 0, 6, "Day of week");
        if (!d.ok) return d;
      }
      return { ok: true, value: `${minute.value} ${hour.value} * * ${daysOfWeekVal.join(",")}` };
    }
    case "monthly": {
      const minute = inRange(minuteVal, 0, 59, "Minute");
      if (!minute.ok) return minute;
      const hour = inRange(hourVal, 0, 23, "Hour");
      if (!hour.ok) return hour;
      const dayOfMonth = inRange(dayOfMonthVal, 1, 31, "Day of month");
      if (!dayOfMonth.ok) return dayOfMonth;

      if (monthlyType === "everyXMonths") {
        const interval = inRange(intervalVal, 1, 11, "Month interval");
        if (!interval.ok) return interval;
        return { ok: true, value: `${minute.value} ${hour.value} ${dayOfMonth.value} */${interval.value} *` };
      }
      return { ok: true, value: `${minute.value} ${hour.value} ${dayOfMonth.value} * *` };
    }
    case "yearly": {
      const minute = inRange(minuteVal, 0, 59, "Minute");
      if (!minute.ok) return minute;
      const hour = inRange(hourVal, 0, 23, "Hour");
      if (!hour.ok) return hour;
      const dayOfMonth = inRange(dayOfMonthVal, 1, 31, "Day of month");
      if (!dayOfMonth.ok) return dayOfMonth;
      const month = inRange(monthVal, 1, 12, "Month");
      if (!month.ok) return month;

      return { ok: true, value: `${minute.value} ${hour.value} ${dayOfMonth.value} ${month.value} *` };
    }
    default:
      return { ok: false, error: "Choose a valid schedule frequency." };
  }
}

export function urlEncode(input: string): string {
  return encodeURIComponent(input);
}

export function urlDecode(input: string): Result<string> {
  try {
    return { ok: true, value: decodeURIComponent(input) };
  } catch {
    return { ok: false, error: "Invalid percent-encoded input." };
  }
}

const entityMap: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const namedEntities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
};

export function htmlEntityEncode(input: string): string {
  return input.replace(/[&<>"']/g, (char) => entityMap[char]);
}

export function htmlEntityDecode(input: string): Result<string> {
  try {
    return {
      ok: true,
      value: input.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
        if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
        if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
        return namedEntities[entity.toLowerCase()] ?? match;
      }),
    };
  } catch {
    return { ok: false, error: "Invalid HTML entity sequence." };
  }
}

export function backslashEscape(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\f/g, "\\f")
    .replace(/\v/g, "\\v")
    .replace(/\0/g, "\\0")
    .replace(/"/g, '\\"');
}

export function backslashUnescape(input: string): Result<string> {
  try {
    return {
      ok: true,
      value: input.replace(/\\(u\{[\da-f]+\}|u[\da-f]{4}|x[\da-f]{2}|n|r|t|f|v|0|\\|"|')/gi, (_, sequence: string) => {
        if (sequence === "n") return "\n";
        if (sequence === "r") return "\r";
        if (sequence === "t") return "\t";
        if (sequence === "f") return "\f";
        if (sequence === "v") return "\v";
        if (sequence === "0") return "\0";
        if (sequence === "\\" || sequence === '"' || sequence === "'") return sequence;
        if (sequence.startsWith("x")) return String.fromCodePoint(Number.parseInt(sequence.slice(1), 16));
        if (sequence.startsWith("u{")) return String.fromCodePoint(Number.parseInt(sequence.slice(2, -1), 16));
        return String.fromCodePoint(Number.parseInt(sequence.slice(1), 16));
      }),
    };
  } catch {
    return { ok: false, error: "Invalid backslash escape sequence." };
  }
}

export function asciiToHex(input: string): string {
  return [...new TextEncoder().encode(input)].map((byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join(" ");
}

export function hexToAscii(input: string): Result<string> {
  const compact = input.replace(/(?:0x|\\x)/gi, "").replace(/[\s,;:_-]/g, "");
  if (!compact) return emptyOk("");
  if (compact.length % 2 !== 0 || /[^\da-f]/i.test(compact)) {
    return { ok: false, error: "Enter an even-length hexadecimal byte string." };
  }
  const bytes = new Uint8Array(compact.match(/../g)!.map((pair) => Number.parseInt(pair, 16)));
  try {
    return { ok: true, value: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, error: "Hex bytes are not valid UTF-8 text." };
  }
}

export function base64Encode(input: string, altchars?: string): string {
  let encoded = btoa(unescape(encodeURIComponent(input)));
  if (altchars && altchars.length === 2) {
    encoded = encoded.replace(/\+/g, altchars[0]).replace(/\//g, altchars[1]);
  }
  return encoded;
}

export function base64Decode(input: string, altchars?: string): Result<string> {
  try {
    let base64 = input.trim();
    if (altchars && altchars.length === 2) {
      const esc0 = altchars[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const esc1 = altchars[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      base64 = base64.replace(new RegExp(esc0, "g"), "+").replace(new RegExp(esc1, "g"), "/");
    }
    // Restore padding if missing, btoa/atob require correct padding
    while (base64.length % 4) {
      base64 += "=";
    }
    return { ok: true, value: decodeURIComponent(escape(atob(base64))) };
  } catch {
    return { ok: false, error: "Invalid Base64 input." };
  }
}

export function decodeJwt(input: string): Result<string> {
  const parts = input.trim().split(".");
  if (parts.length < 2) return { ok: false, error: "JWT must contain header and payload segments." };
  try {
    const decode = (part: string) => JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=")));
    return { ok: true, value: JSON.stringify({ header: decode(parts[0]), payload: decode(parts[1]), signature: parts[2] ? "present" : "missing" }, null, 2) };
  } catch {
    return { ok: false, error: "Unable to decode JWT segments." };
  }
}

export async function digests(input: string): Promise<Record<string, string>> {
  const data = new TextEncoder().encode(input);
  const pairs = await Promise.all(["SHA-1", "SHA-256", "SHA-384", "SHA-512"].map(async (name) => [name, hex(await crypto.subtle.digest(name, data))]));
  return Object.fromEntries(pairs);
}

export function uuidList(count: number, uppercase = false): string {
  return Array.from({ length: Math.min(Math.max(count, 1), 100) }, () => {
    const id = crypto.randomUUID();
    return uppercase ? id.toUpperCase() : id;
  }).join("\n");
}

export function password(length: number, sets: { lower: boolean; upper: boolean; digits: boolean; symbols: boolean }): Result<string> {
  const chars = `${sets.lower ? "abcdefghijklmnopqrstuvwxyz" : ""}${sets.upper ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : ""}${sets.digits ? "0123456789" : ""}${sets.symbols ? "!@#$%^&*()-_=+[]{};:,.?/|" : ""}`;
  if (!chars) return { ok: false, error: "Select at least one character set." };
  const bytes = new Uint32Array(Math.max(4, Math.min(length, 256)));
  crypto.getRandomValues(bytes);
  return { ok: true, value: [...bytes].map((byte) => chars[byte % chars.length]).join("") };
}

export function randomStrings(length: number, count: number, alphabet: string): Result<string> {
  const chars = [...alphabet];
  if (!chars.length) return { ok: false, error: "Enter at least one character in the alphabet." };
  const safeLength = Math.max(1, Math.min(length, 512));
  const safeCount = Math.max(1, Math.min(count, 200));
  const rows = Array.from({ length: safeCount }, () => {
    const bytes = new Uint32Array(safeLength);
    crypto.getRandomValues(bytes);
    return [...bytes].map((byte) => chars[byte % chars.length]).join("");
  });
  return { ok: true, value: rows.join("\n") };
}

function writeStringBytes(str: string): Uint8Array {
  const bytes = new TextEncoder().encode(str);
  const res = new Uint8Array(4 + bytes.length);
  const view = new DataView(res.buffer);
  view.setUint32(0, bytes.length);
  res.set(bytes, 4);
  return res;
}

function writeVectorBytes(bytes: Uint8Array): Uint8Array {
  const res = new Uint8Array(4 + bytes.length);
  const view = new DataView(res.buffer);
  view.setUint32(0, bytes.length);
  res.set(bytes, 4);
  return res;
}

function writeUint32Bytes(val: number): Uint8Array {
  const res = new Uint8Array(4);
  const view = new DataView(res.buffer);
  view.setUint32(0, val);
  return res;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export interface SshKeyPairResult {
  publicKey: string;
  privateKey: string;
}

export async function generateSshKeyPair(options: {
  algorithm: "ed25519" | "rsa";
  bits?: number;
  comment?: string;
  passphrase?: string;
}): Promise<Result<SshKeyPairResult>> {
  const comment = options.comment || "";
  const passphrase = options.passphrase || "";

  if (options.algorithm === "rsa") {
    try {
      const bits = options.bits || 3072;
      const keypair = forge.pki.rsa.generateKeyPair({ bits: bits, e: 0x10001 });
      const pubSsh = forge.ssh.publicKeyToOpenSSH(keypair.publicKey, comment);
      const privSsh = forge.ssh.privateKeyToOpenSSH(keypair.privateKey, passphrase);
      return {
        ok: true,
        value: {
          publicKey: pubSsh,
          privateKey: privSsh,
        },
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Failed to generate RSA key pair." };
    }
  } else if (options.algorithm === "ed25519") {
    try {
      const pair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
      const pubBuffer = await crypto.subtle.exportKey("raw", pair.publicKey);
      const pubKeyBytes = new Uint8Array(pubBuffer);

      const privBuffer = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
      const privBytes = new Uint8Array(privBuffer);
      const privKeyBytes = privBytes.slice(-32);

      const pubKeyWire = new Uint8Array(4 + 11 + 4 + 32);
      const pubView = new DataView(pubKeyWire.buffer);
      pubView.setUint32(0, 11);
      pubKeyWire.set(new TextEncoder().encode("ssh-ed25519"), 4);
      pubView.setUint32(15, 32);
      pubKeyWire.set(pubKeyBytes, 19);

      const base64Pub = bytesToBase64(pubKeyWire);
      const publicKey = `ssh-ed25519 ${base64Pub}${comment ? " " + comment : ""}`;

      const magic = new Uint8Array([...new TextEncoder().encode("openssh-key-v1"), 0]);

      const checkint = Math.floor(Math.random() * 0xffffffff);
      const privHeader = new Uint8Array(8);
      const privHeaderView = new DataView(privHeader.buffer);
      privHeaderView.setUint32(0, checkint);
      privHeaderView.setUint32(4, checkint);

      const keyTypeBytes = writeStringBytes("ssh-ed25519");
      const pubKeyVector = writeVectorBytes(pubKeyBytes);

      const privAndPub = new Uint8Array(64);
      privAndPub.set(privKeyBytes, 0);
      privAndPub.set(pubKeyBytes, 32);
      const privAndPubVector = writeVectorBytes(privAndPub);

      const commentBytes = writeStringBytes(comment);

      const totalPrivDataLen = privHeader.length + keyTypeBytes.length + pubKeyVector.length + privAndPubVector.length + commentBytes.length;
      const privData = new Uint8Array(totalPrivDataLen);
      let offset = 0;
      privData.set(privHeader, offset); offset += privHeader.length;
      privData.set(keyTypeBytes, offset); offset += keyTypeBytes.length;
      privData.set(pubKeyVector, offset); offset += pubKeyVector.length;
      privData.set(privAndPubVector, offset); offset += privAndPubVector.length;
      privData.set(commentBytes, offset);

      const padLen = 8 - (privData.length % 8);
      const paddedPrivData = new Uint8Array(privData.length + padLen);
      paddedPrivData.set(privData, 0);
      for (let i = 0; i < padLen; i++) {
        paddedPrivData[privData.length + i] = i + 1;
      }

      const ciphername = writeStringBytes("none");
      const kdfname = writeStringBytes("none");
      const kdfoptions = writeStringBytes("");
      const numKeys = writeUint32Bytes(1);
      const pubKeysVector = writeVectorBytes(pubKeyWire);
      const privKeysVector = writeVectorBytes(paddedPrivData);

      const totalLen = magic.length + ciphername.length + kdfname.length + kdfoptions.length + numKeys.length + pubKeysVector.length + privKeysVector.length;
      const finalBytes = new Uint8Array(totalLen);
      let finalOffset = 0;
      finalBytes.set(magic, finalOffset); finalOffset += magic.length;
      finalBytes.set(ciphername, finalOffset); finalOffset += ciphername.length;
      finalBytes.set(kdfname, finalOffset); finalOffset += kdfname.length;
      finalBytes.set(kdfoptions, finalOffset); finalOffset += kdfoptions.length;
      finalBytes.set(numKeys, finalOffset); finalOffset += numKeys.length;
      finalBytes.set(pubKeysVector, finalOffset); finalOffset += pubKeysVector.length;
      finalBytes.set(privKeysVector, finalOffset); finalOffset += privKeysVector.length;

      const base64Priv = bytesToBase64(finalBytes);
      const formattedPriv = "-----BEGIN OPENSSH PRIVATE KEY-----\n" +
        (base64Priv.match(/.{1,70}/g) || [base64Priv]).join("\n") +
        "\n-----END OPENSSH PRIVATE KEY-----";

      return {
        ok: true,
        value: {
          publicKey,
          privateKey: formattedPriv,
        },
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Failed to generate Ed25519 key pair." };
    }
  }

  return { ok: false, error: "Unsupported algorithm." };
}

export async function sshKeyPair(): Promise<Result<string>> {
  const result = await generateSshKeyPair({ algorithm: "ed25519" });
  if (result.ok) {
    return { ok: true, value: JSON.stringify(result.value, null, 2) };
  }
  return { ok: false, error: result.error };
}

const lorem = "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua";
export function loremIpsum(paragraphs: number): string {
  return Array.from({ length: Math.min(Math.max(paragraphs, 1), 20) }, (_, i) => `${lorem}${i % 2 ? " Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat." : "."}`).join("\n\n");
}

export function inspectString(input: string): string {
  const encoder = new TextEncoder();
  const lines = input.length ? input.split(/\r\n|\r|\n/).length : 0;
  const codePoints = [...input];
  const visible = input
    .replace(/ /g, "·")
    .replace(/\t/g, "→\t")
    .replace(/\r/g, "␍")
    .replace(/\n/g, "␊\n");
  const codePointRows = codePoints.slice(0, 200).map((char, index) => {
    const value = char.codePointAt(0) ?? 0;
    return `${String(index + 1).padStart(3, " ")}  U+${value.toString(16).toUpperCase().padStart(4, "0")}  ${JSON.stringify(char)}`;
  });

  return [
    `Characters: ${input.length}`,
    `Code points: ${codePoints.length}`,
    `UTF-8 bytes: ${encoder.encode(input).length}`,
    `Lines: ${lines}`,
    `Words: ${input.trim() ? input.trim().split(/\s+/).length : 0}`,
    "",
    "Visible whitespace:",
    visible,
    "",
    "Code points:",
    codePointRows.join("\n") || "(none)",
    codePoints.length > 200 ? `\n... ${codePoints.length - 200} more` : "",
  ].filter(Boolean).join("\n");
}

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (char) => entityMap[char]);
}

export function markdownToHtml(input: string): string {
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const html: string[] = [];
  let listOpen = false;
  let paragraph: string[] = [];
  const inline = (text: string) => escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
  };

  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    const listItem = /^[-*]\s+(.+)$/.exec(line);
    if (!line.trim()) {
      flushParagraph();
      closeList();
    } else if (heading) {
      flushParagraph();
      closeList();
      html.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);
    } else if (listItem) {
      flushParagraph();
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${inline(listItem[1])}</li>`);
    } else {
      closeList();
      paragraph.push(line.trim());
    }
  }

  flushParagraph();
  closeList();
  return html.join("\n");
}

export type WebFormatLanguage = "html" | "css" | "javascript";
export type WebFormatMode = "beautify" | "minify";

function indentMarkup(input: string): string {
  let depth = 0;
  return input
    .replace(/>\s*</g, ">\n<")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (/^<\//.test(line)) depth = Math.max(0, depth - 1);
      const output = `${"  ".repeat(depth)}${line}`;
      if (/^<[^!?/][^>]*[^/]?>$/.test(line) && !/<\/[^>]+>$/.test(line) && !/^(<meta|<link|<br|<hr|<img|<input)\b/i.test(line)) {
        depth += 1;
      }
      return output;
    })
    .join("\n");
}

function indentCode(input: string): string {
  let depth = 0;
  return input
    .replace(/([{};])/g, "$1\n")
    .replace(/\n\s*\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("}")) depth = Math.max(0, depth - 1);
      const output = `${"  ".repeat(depth)}${line}`;
      if (line.endsWith("{")) depth += 1;
      return output;
    })
    .join("\n");
}

export function formatWebCode(input: string, language: WebFormatLanguage, mode: WebFormatMode): Result<string> {
  if (!input.trim()) return emptyOk("");
  if (mode === "minify") {
    const withoutComments = language === "html"
      ? input.replace(/<!--[\s\S]*?-->/g, "")
      : input.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, "");
    return { ok: true, value: withoutComments.replace(/\s+/g, " ").replace(/\s*([{}:;,>])\s*/g, "$1").replace(/\s*(<)\s*/g, "$1").trim() };
  }
  return { ok: true, value: language === "html" ? indentMarkup(input) : indentCode(input) };
}

export function colorInfo(input: string): Result<{ css: string; output: string }> {
  const trimmed = input.trim();
  let rgb: [number, number, number] | null = null;
  const hex = /^#?([\da-f]{3}|[\da-f]{6})$/i.exec(trimmed);
  const rgbMatch = /^rgba?\((\d{1,3})[,\s]+(\d{1,3})[,\s]+(\d{1,3})/i.exec(trimmed);
  const hslMatch = /^hsla?\(([-\d.]+)(?:deg)?[,\s]+([-\d.]+)%[,\s]+([-\d.]+)%/i.exec(trimmed);

  if (hex) {
    const full = hex[1].length === 3 ? [...hex[1]].map((char) => char + char).join("") : hex[1];
    rgb = [0, 2, 4].map((offset) => Number.parseInt(full.slice(offset, offset + 2), 16)) as [number, number, number];
  } else if (rgbMatch) {
    rgb = [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  } else if (hslMatch) {
    rgb = hslToRgb(Number(hslMatch[1]), Number(hslMatch[2]), Number(hslMatch[3]));
  }

  if (!rgb || rgb.some((value) => value < 0 || value > 255)) return { ok: false, error: "Enter a HEX, RGB, or HSL color." };
  const [r, g, b] = rgb;
  const hexValue = `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  const [h, s, l] = rgbToHsl(r, g, b);
  return {
    ok: true,
    value: {
      css: hexValue,
      output: [
        `HEX: ${hexValue}`,
        `RGB: rgb(${r}, ${g}, ${b})`,
        `HSL: hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`,
      ].join("\n"),
    },
  };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = (((h % 360) + 360) % 360) / 360;
  s /= 100;
  l /= 100;
  const hue = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) return [l, l, l].map((value) => Math.round(value * 255)) as [number, number, number];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3)].map((value) => Math.round(value * 255)) as [number, number, number];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return [h < 0 ? h + 360 : h, s * 100, l * 100];
}

export function parseUrl(input: string): Result<string> {
  try {
    const url = new URL(input);
    return { ok: true, value: JSON.stringify({ protocol: url.protocol, username: url.username, password: url.password ? "present" : "", host: url.host, hostname: url.hostname, port: url.port, pathname: url.pathname, search: url.search, hash: url.hash, query: Object.fromEntries(url.searchParams.entries()) }, null, 2) };
  } catch {
    return { ok: false, error: "Invalid URL." };
  }
}

export interface DiffChunk {
  type: "match" | "delete" | "insert";
  value: string;
}

export function diffTextChunks(left: string, right: string): DiffChunk[] {
  const leftWords = left.match(/\S+|\s+/g) ?? [];
  const rightWords = right.match(/\S+|\s+/g) ?? [];
  const table = Array.from({ length: leftWords.length + 1 }, () => Array<number>(rightWords.length + 1).fill(0));
  for (let i = leftWords.length - 1; i >= 0; i -= 1) {
    for (let j = rightWords.length - 1; j >= 0; j -= 1) {
      table[i][j] = leftWords[i] === rightWords[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const chunks: DiffChunk[] = [];
  let i = 0;
  let j = 0;
  while (i < leftWords.length && j < rightWords.length) {
    if (leftWords[i] === rightWords[j]) {
      chunks.push({ type: "match", value: leftWords[i] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      chunks.push({ type: "delete", value: leftWords[i] });
      i += 1;
    } else {
      chunks.push({ type: "insert", value: rightWords[j] });
      j += 1;
    }
  }
  while (i < leftWords.length) {
    chunks.push({ type: "delete", value: leftWords[i++] });
  }
  while (j < rightWords.length) {
    chunks.push({ type: "insert", value: rightWords[j++] });
  }
  return chunks;
}

export function diffText(left: string, right: string): string {
  return diffTextChunks(left, right)
    .map((chunk) => {
      if (chunk.type === "match") return `  ${chunk.value}`;
      if (chunk.type === "delete") return `- ${chunk.value}`;
      return `+ ${chunk.value}`;
    })
    .join("");
}


export function certificateInfo(input: string): Result<string> {
  if (!input.trim()) return emptyOk("");
  try {
    const blocks = input.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) ?? [input];
    const certificates = blocks.map((block, index) => ({ position: index + 1, ...parseCertificateSummary(block) }));

    return {
      ok: true,
      value: JSON.stringify(certificates.length === 1 ? certificates[0] : certificates, null, 2),
    };
  } catch {
    return { ok: false, error: "Paste a valid PEM encoded X.509 certificate." };
  }
}

function parseCertificateSummary(pem: string) {
  try {
    const cert = forge.pki.certificateFromPem(pem);
    const subjectAltName = cert.extensions.find((extension) => extension.name === "subjectAltName") as { altNames?: Array<{ type: number; value?: string }> } | undefined;
    const dnsNames = subjectAltName?.altNames
      ?.filter((name) => name.type === 2 && name.value)
      .map((name) => name.value) ?? [];

    return {
      subject: cert.subject.attributes.map((a) => `${a.shortName || a.name}=${a.value}`).join(", "),
      issuer: cert.issuer.attributes.map((a) => `${a.shortName || a.name}=${a.value}`).join(", "),
      serialNumber: cert.serialNumber,
      validFrom: cert.validity.notBefore.toISOString(),
      validTo: cert.validity.notAfter.toISOString(),
      dnsNames,
    };
  } catch {
    return parseCertificateAsn1(pem);
  }
}

function parseCertificateAsn1(pem: string) {
  const message = forge.pem.decode(pem)[0];
  if (!message?.body) throw new Error("Invalid PEM certificate.");

  const cert = forge.asn1.fromDer(message.body);
  const tbs = child(cert, 0);
  let cursor = child(tbs, 0).tagClass === forge.asn1.Class.CONTEXT_SPECIFIC ? 1 : 0;
  const serialNumber = bytesToHex(String(child(tbs, cursor++).value));
  cursor += 1; // signature algorithm
  const issuer = readName(child(tbs, cursor++));
  const validity = child(tbs, cursor++);
  const validFrom = readTime(child(validity, 0)).toISOString();
  const validTo = readTime(child(validity, 1)).toISOString();
  const subject = readName(child(tbs, cursor++));
  const dnsNames = readDnsNames(tbs);

  return { subject, issuer, serialNumber, validFrom, validTo, dnsNames };
}

function child(node: forge.asn1.Asn1, index: number): forge.asn1.Asn1 {
  if (!Array.isArray(node.value) || !node.value[index]) throw new Error("Invalid X.509 structure.");
  return node.value[index] as forge.asn1.Asn1;
}

function readName(name: forge.asn1.Asn1): string {
  if (!Array.isArray(name.value)) return "";
  return name.value.flatMap((rdn) => {
    if (!Array.isArray(rdn.value)) return [];
    return rdn.value.map((attribute) => {
      const oid = forge.asn1.derToOid(String(child(attribute as forge.asn1.Asn1, 0).value));
      const value = String(child(attribute as forge.asn1.Asn1, 1).value);
      return `${oidName(oid)}=${value}`;
    });
  }).join(", ");
}

function readTime(node: forge.asn1.Asn1): Date {
  const value = String(node.value);
  if (node.type === forge.asn1.Type.UTCTIME) return forge.asn1.utcTimeToDate(value);
  if (node.type === forge.asn1.Type.GENERALIZEDTIME) return forge.asn1.generalizedTimeToDate(value);
  throw new Error("Invalid certificate validity time.");
}

function readDnsNames(tbs: forge.asn1.Asn1): string[] {
  if (!Array.isArray(tbs.value)) return [];
  const extensionsWrapper = tbs.value.find((node) => (node as forge.asn1.Asn1).tagClass === forge.asn1.Class.CONTEXT_SPECIFIC && (node as forge.asn1.Asn1).type === 3) as forge.asn1.Asn1 | undefined;
  const extensions = extensionsWrapper ? child(extensionsWrapper, 0) : undefined;
  if (!extensions || !Array.isArray(extensions.value)) return [];

  const subjectAltName = extensions.value.find((extension) => {
    const oid = forge.asn1.derToOid(String(child(extension as forge.asn1.Asn1, 0).value));
    return oid === "2.5.29.17";
  }) as forge.asn1.Asn1 | undefined;
  if (!subjectAltName) return [];

  const extensionValue = child(subjectAltName, Array.isArray(subjectAltName.value) && subjectAltName.value.length === 3 ? 2 : 1);
  const generalNames = forge.asn1.fromDer(String(extensionValue.value));
  if (!Array.isArray(generalNames.value)) return [];
  return generalNames.value
    .filter((name) => (name as forge.asn1.Asn1).tagClass === forge.asn1.Class.CONTEXT_SPECIFIC && (name as forge.asn1.Asn1).type === 2)
    .map((name) => String((name as forge.asn1.Asn1).value));
}

function bytesToHex(bytes: string): string {
  return [...bytes].map((char) => char.charCodeAt(0).toString(16).padStart(2, "0")).join("").replace(/^00/, "");
}

function oidName(oid: string): string {
  const names: Record<string, string> = {
    "2.5.4.3": "CN",
    "2.5.4.6": "C",
    "2.5.4.7": "L",
    "2.5.4.8": "ST",
    "2.5.4.10": "O",
    "2.5.4.11": "OU",
    "1.2.840.113549.1.9.1": "E",
  };
  return names[oid] ?? oid;
}

export async function retrieveServerCertificate(target: string, port: number): Promise<Result<string>> {
  if (!target.trim()) return { ok: false, error: "Enter a hostname or HTTPS URL." };

  const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const baseUrl = isLocal ? "" : "https://sword-api.chunyangwen.com";

  const response = await fetch(`${baseUrl}/api/certificate?target=${encodeURIComponent(target.trim())}&port=${encodeURIComponent(String(port))}`);
  const payload = await response.json().catch(() => ({})) as { certificates?: string[]; error?: string };

  if (!response.ok) {
    if (response.status === 404) {
      return {
        ok: false,
        error: "Certificate retrieval needs a server-side /api/certificate endpoint. Static deployments like GitHub Pages cannot open TLS sockets, so use the OpenSSL command shown above or run the app locally.",
      };
    }
    return { ok: false, error: payload.error || `Certificate retrieval failed with HTTP ${response.status}.` };
  }

  if (!payload.certificates?.length) {
    return { ok: false, error: "The server did not return a certificate chain." };
  }

  return { ok: true, value: payload.certificates.join("\n\n") };
}

export const httpStatuses = [
  [100, "Continue"], [101, "Switching Protocols"], [200, "OK"], [201, "Created"], [202, "Accepted"], [204, "No Content"], [301, "Moved Permanently"], [302, "Found"], [304, "Not Modified"], [400, "Bad Request"], [401, "Unauthorized"], [403, "Forbidden"], [404, "Not Found"], [409, "Conflict"], [422, "Unprocessable Content"], [429, "Too Many Requests"], [500, "Internal Server Error"], [502, "Bad Gateway"], [503, "Service Unavailable"], [504, "Gateway Timeout"],
] as const;

export async function dnsLookup(name: string, type: string): Promise<Result<string>> {
  if (!name.trim()) return emptyOk("");
  const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name.trim())}&type=${type}`, { headers: { accept: "application/dns-json" } });
  if (!response.ok) return { ok: false, error: `DNS-over-HTTPS failed with HTTP ${response.status}.` };
  return { ok: true, value: JSON.stringify(await response.json(), null, 2) };
}

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function fetchLocalCheatsheet(platform: string, command: string): Promise<Result<{content: string}>> {
  if (!command.trim()) return emptyOk({ content: "" });
  try {
    let response = await fetch(`./cheatsheets/${platform}/${encodeURIComponent(command.trim())}.md`);
    let content = await response.text();
    let isHtml = content.trim().toLowerCase().startsWith("<!doctype html>") || content.trim().toLowerCase().startsWith("<html");

    if (!response.ok || isHtml) {
      response = await fetch(`./cheatsheets/common/${encodeURIComponent(command.trim())}.md`);
      content = await response.text();
      isHtml = content.trim().toLowerCase().startsWith("<!doctype html>") || content.trim().toLowerCase().startsWith("<html");
    }

    if (!response.ok || isHtml) {
      if (!response.ok && response.status !== 404) {
        return { ok: false, error: `Failed to fetch cheatsheet: HTTP ${response.status}.` };
      }
      return { ok: false, error: `No local cheatsheet available for '${command}' on ${platform}.` };
    }

    return { ok: true, value: { content } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to fetch cheatsheet." };
  }
}

export function formatCheatsheetMarkdown(input: string): string {
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const html: string[] = [];
  let listOpen = false;
  let blockquoteOpen = false;
  let paragraph: string[] = [];

  const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"} as Record<string, string>)[char] || char);

  const inline = (text: string) => escapeHtml(text)
    .replace(/&lt;(https?:\/\/[^&]+)&gt;/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\{\{([^}]+)\}\}/g, "<span class=\"tldr-arg\">$1</span>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };

  const closeList = () => {
    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
  };

  const closeBlockquote = () => {
    if (blockquoteOpen) {
      html.push("</div>");
      blockquoteOpen = false;
    }
  };

  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    const listItem = /^[-*]\s+(.+)$/.exec(line);
    const blockquote = /^>\s*(.+)$/.exec(line);

    if (!line.trim()) {
      flushParagraph();
      closeList();
      closeBlockquote();
    } else if (heading) {
      flushParagraph();
      closeList();
      closeBlockquote();
      html.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);
    } else if (listItem) {
      flushParagraph();
      closeBlockquote();
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${inline(listItem[1])}</li>`);
    } else if (blockquote) {
      flushParagraph();
      closeList();
      if (!blockquoteOpen) {
        html.push("<div class=\"tldr-blockquote\">");
        blockquoteOpen = true;
      }
      html.push(`<p>${inline(blockquote[1])}</p>`);
    } else {
      paragraph.push(line.trim());
    }
  }

  flushParagraph();
  closeList();
  closeBlockquote();
  return html.join("\n");
}
