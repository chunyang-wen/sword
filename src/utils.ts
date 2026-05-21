import yaml from "js-yaml";
import forge from "node-forge";
import { format as formatSql } from "sql-formatter";
import cronstrue from "cronstrue";

export type Result<T> = { ok: true; value: T; warning?: string } | { ok: false; error: string };

export const emptyOk = <T>(value: T): Result<T> => ({ ok: true, value });

export function formatJson(input: string): Result<string> {
  const trimmed = input.trim();
  if (!trimmed) return emptyOk("");
  try {
    return { ok: true, value: JSON.stringify(JSON.parse(trimmed), null, 2) };
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

export function textToolkit(input: string, options: { source: string; target: string; trim: boolean; collapse: boolean; casing: string; sort: boolean; unique: boolean }): string {
  const token = (name: string) => (name === "comma" ? "," : name === "space" ? " " : "\n");
  let output = input.replace(new RegExp(escapeRegExp(token(options.source)) + "+", "g"), token(options.target));
  if (options.trim) output = output.trim().replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, "");
  if (options.collapse) output = output.replace(/([\p{P}])\1+/gu, "$1");
  if (options.casing === "upper") output = output.toUpperCase();
  if (options.casing === "lower") output = output.toLowerCase();
  if (options.sort || options.unique) {
    let lines = output.split(/\r?\n/);
    if (options.unique) lines = [...new Set(lines)];
    if (options.sort) lines = lines.sort((a, b) => a.localeCompare(b));
    output = lines.join("\n");
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

export function base64Encode(input: string): string {
  return btoa(unescape(encodeURIComponent(input)));
}

export function base64Decode(input: string): Result<string> {
  try {
    return { ok: true, value: decodeURIComponent(escape(atob(input.trim()))) };
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

export async function sshKeyPair(): Promise<Result<string>> {
  try {
    const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
    const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
    return { ok: true, value: JSON.stringify({ algorithm: "ECDSA P-256", privateJwk, publicJwk }, null, 2), warning: "Exported as JWK because browser WebCrypto does not produce OpenSSH private key files directly." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to generate key pair." };
  }
}

const lorem = "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua";
export function loremIpsum(paragraphs: number): string {
  return Array.from({ length: Math.min(Math.max(paragraphs, 1), 20) }, (_, i) => `${lorem}${i % 2 ? " Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat." : "."}`).join("\n\n");
}

export function parseUrl(input: string): Result<string> {
  try {
    const url = new URL(input);
    return { ok: true, value: JSON.stringify({ protocol: url.protocol, username: url.username, password: url.password ? "present" : "", host: url.host, hostname: url.hostname, port: url.port, pathname: url.pathname, search: url.search, hash: url.hash, query: Object.fromEntries(url.searchParams.entries()) }, null, 2) };
  } catch {
    return { ok: false, error: "Invalid URL." };
  }
}

export function diffText(left: string, right: string): string {
  const leftWords = left.match(/\S+|\s+/g) ?? [];
  const rightWords = right.match(/\S+|\s+/g) ?? [];
  const table = Array.from({ length: leftWords.length + 1 }, () => Array<number>(rightWords.length + 1).fill(0));
  for (let i = leftWords.length - 1; i >= 0; i -= 1) {
    for (let j = rightWords.length - 1; j >= 0; j -= 1) {
      table[i][j] = leftWords[i] === rightWords[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const chunks: string[] = [];
  let i = 0;
  let j = 0;
  while (i < leftWords.length && j < rightWords.length) {
    if (leftWords[i] === rightWords[j]) {
      chunks.push(`  ${leftWords[i]}`);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      chunks.push(`- ${leftWords[i]}`);
      i += 1;
    } else {
      chunks.push(`+ ${rightWords[j]}`);
      j += 1;
    }
  }
  while (i < leftWords.length) chunks.push(`- ${leftWords[i++]}`);
  while (j < rightWords.length) chunks.push(`+ ${rightWords[j++]}`);
  return chunks.join("");
}

export function certificateInfo(input: string): Result<string> {
  if (!input.trim()) return emptyOk("");
  try {
    const cert = forge.pki.certificateFromPem(input);
    return {
      ok: true,
      value: JSON.stringify({
        subject: cert.subject.attributes.map((a) => `${a.shortName || a.name}=${a.value}`).join(", "),
        issuer: cert.issuer.attributes.map((a) => `${a.shortName || a.name}=${a.value}`).join(", "),
        serialNumber: cert.serialNumber,
        validFrom: cert.validity.notBefore.toISOString(),
        validTo: cert.validity.notAfter.toISOString(),
      }, null, 2),
    };
  } catch {
    return { ok: false, error: "Paste a valid PEM encoded X.509 certificate." };
  }
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
