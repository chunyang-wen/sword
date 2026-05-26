import {
  Binary,
  Braces,
  Calendar,
  CaseSensitive,
  Clock,
  Diff,
  FileCode2,
  FileKey2,
  FileJson2,
  FileText,
  Fingerprint,
  Hash,
  KeyRound,
  Link,
  LockKeyhole,
  Network,
  QrCode,
  Regex,
  Ruler,
  Table2,
  Text,
  Type,
} from "lucide-react";
import type { ComponentType } from "react";

export type ToolStatus = "ready";

export type ToolCategoryId =
  | "converters"
  | "text"
  | "formatters"
  | "encoders"
  | "generators"
  | "network";

export interface ToolDefinition {
  id: string;
  title: string;
  subtitle: string;
  category: ToolCategoryId;
  route: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  status: ToolStatus;
  limitation?: string;
}

export const categories: Record<ToolCategoryId, string> = {
  converters: "Converters",
  text: "Text",
  formatters: "Formatters",
  encoders: "Encoders / Decoders",
  generators: "Generators",
  network: "Network",
};

export const tools: ToolDefinition[] = [
  { id: "json-yaml", title: "JSON ⇄ YAML", subtitle: "Convert payloads between formats", category: "converters", route: "#/tools/json-yaml", icon: FileJson2, status: "ready" },
  { id: "number-base", title: "Number Base", subtitle: "Translate values across bases", category: "converters", route: "#/tools/number-base", icon: Binary, status: "ready" },
  { id: "date-converter", title: "Date Converter", subtitle: "Switch between date formats", category: "converters", route: "#/tools/date-converter", icon: Calendar, status: "ready" },
  { id: "unit-converter", title: "Unit Converter", subtitle: "Convert length, mass, temperature, area, and volume", category: "converters", route: "#/tools/unit-converter", icon: Ruler, status: "ready" },
  { id: "text-toolkit", title: "Text Toolkit", subtitle: "Delimiter, trimming, sorting, and case transforms", category: "text", route: "#/tools/text-toolkit", icon: Text, status: "ready" },
  { id: "text-diff", title: "Text Diff", subtitle: "Compare two texts side by side", category: "text", route: "#/tools/text-diff", icon: Diff, status: "ready" },
  { id: "regex-matching", title: "Regex Matching", subtitle: "Inspect matches and replacements", category: "text", route: "#/tools/regex-matching", icon: Regex, status: "ready" },
  { id: "json-formatter", title: "JSON Formatter", subtitle: "Beautify and validate JSON payloads", category: "formatters", route: "#/tools/json-formatter", icon: Braces, status: "ready" },
  { id: "sql-formatter", title: "SQL Formatter", subtitle: "Apply readable SQL styling", category: "formatters", route: "#/tools/sql-formatter", icon: Table2, status: "ready" },
  { id: "xml-formatter", title: "XML Formatter", subtitle: "Indent XML documents", category: "formatters", route: "#/tools/xml-formatter", icon: FileCode2, status: "ready" },
  { id: "cron-job-parser", title: "Cron Job Parser", subtitle: "Translate cron expressions", category: "formatters", route: "#/tools/cron-job-parser", icon: Clock, status: "ready" },
  { id: "qr-coder", title: "QR Code", subtitle: "Encode and decode QR Codes", category: "encoders", route: "#/tools/qr-coder", icon: QrCode, status: "ready" },
  { id: "url-coder", title: "URL", subtitle: "Percent-encode and decode", category: "encoders", route: "#/tools/url-coder", icon: Link, status: "ready" },
  { id: "base64-coder", title: "Base64", subtitle: "Transform Base64 content", category: "encoders", route: "#/tools/base64-coder", icon: CaseSensitive, status: "ready" },
  { id: "jwt-decoder", title: "JWT", subtitle: "Inspect token contents", category: "encoders", route: "#/tools/jwt-decoder", icon: LockKeyhole, status: "ready" },
  { id: "certificate-decoder", title: "Certificate", subtitle: "Retrieve and decode PEM certificates", category: "encoders", route: "#/tools/certificate-decoder", icon: FileKey2, status: "ready" },
  { id: "hash-generator", title: "Hash", subtitle: "Compute common digests", category: "generators", route: "#/tools/hash-generator", icon: Hash, status: "ready" },
  { id: "uuid-generator", title: "UUID", subtitle: "Generate unique identifiers", category: "generators", route: "#/tools/uuid-generator", icon: Fingerprint, status: "ready" },
  { id: "password-generator", title: "Password", subtitle: "Create secure passwords", category: "generators", route: "#/tools/password-generator", icon: KeyRound, status: "ready" },
  { id: "ssh-key-generator", title: "SSH Key", subtitle: "Generate WebCrypto key pairs", category: "generators", route: "#/tools/ssh-key-generator", icon: FileKey2, status: "ready" },
  { id: "lorem-ipsum-generator", title: "Lorem Ipsum", subtitle: "Generate placeholder text", category: "generators", route: "#/tools/lorem-ipsum-generator", icon: Type, status: "ready" },
  { id: "dns-lookup", title: "DNS Lookup", subtitle: "Query records through DNS-over-HTTPS", category: "network", route: "#/tools/dns-lookup", icon: Network, status: "ready" },
  { id: "url-parser-builder", title: "URL Parser", subtitle: "Parse and build URLs", category: "network", route: "#/tools/url-parser-builder", icon: Link, status: "ready" },
  { id: "http-status-codes", title: "HTTP Status", subtitle: "HTTP status code reference", category: "network", route: "#/tools/http-status-codes", icon: FileText, status: "ready" },
];

export const toolById = new Map(tools.map((tool) => [tool.id, tool]));
