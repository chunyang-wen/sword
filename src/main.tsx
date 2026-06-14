import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider, DatePicker, Input, Segmented, Select, TimePicker, AutoComplete, theme as antdTheme } from "antd";
import dayjs from "dayjs";
import {
  Check,
  Clipboard,
  Download,
  Github,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Search,
  Sun,
  Upload,
  Globe,
  Monitor,
  Cpu,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Copy,
  Wifi,
  RefreshCw,
  MapPin,
  Trash2,
  Twitter,
} from "lucide-react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import "antd/dist/reset.css";
import "./styles.css";
import { categories, toolById, tools, type ToolCategoryId, type ToolDefinition } from "./tools";
import {
  asciiToHex,
  backslashEscape,
  backslashUnescape,
  base64Decode,
  base64Encode,
  certificateInfo,
  colorInfo,
  convertBase,
  convertUnit,
  csvToJson,
  dateFields,
  decodeJwt,
  describeCron,
  diffText,
  diffTextChunks,
  type DiffChunk,
  digests,
  dnsLookup,
  formatWebCode,
  formatJson,
  formatXml,
  generateCronExpression,
  hexToAscii,
  htmlEntityDecode,
  htmlEntityEncode,
  httpStatuses,
  inspectString,
  jsonToCsv,
  jsonToYaml,
  loremIpsum,
  markdownToHtml,
  parseUrl,
  password,
  randomStrings,
  regexInspect,
  retrieveServerCertificate,
  safeSql,
  sshKeyPair,
  generateSshKeyPair,
  textToolkit,
  unitNames,
  urlDecode,
  urlEncode,
  uuidList,
  yamlToJson,
  fetchLocalCheatsheet,
  formatCheatsheetMarkdown,
  type WebFormatLanguage,
  type WebFormatMode,
  type UnitCategory,
  type CronFrequency,
  type Result,
} from "./utils";

type Theme = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

const baseOptions = [
  { value: "10", label: "Dec" },
  { value: "16", label: "Hex" },
  { value: "8", label: "Oct" },
  { value: "2", label: "Bin" },
];

const cronFrequencyOptions: Array<{ value: CronFrequency; label: string }> = [
  { value: "minutes", label: "Every N minutes" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const hourlyTypeOptions = [
  { value: "everyHour", label: "Every hour" },
  { value: "everyXHours", label: "Every N hours" },
];

const dailyTypeOptions = [
  { value: "everyDay", label: "Every day" },
  { value: "everyXDays", label: "Every N days" },
  { value: "weekday", label: "Every weekday (Mon-Fri)" },
];

const monthlyTypeOptions = [
  { value: "everyMonth", label: "Every month" },
  { value: "everyXMonths", label: "Every N months" },
];

const monthOptions = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const weekdayOptions = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const unitCategoryOptions: Array<{ value: UnitCategory; label: string }> = [
  { value: "length", label: "length" },
  { value: "mass", label: "mass" },
  { value: "temperature", label: "temperature" },
  { value: "area", label: "area" },
  { value: "volume", label: "volume" },
];

const casingOptions = [
  { value: "none", label: "Keep" },
  { value: "upper", label: "Upper" },
  { value: "lower", label: "Lower" },
];

const dnsRecordOptions = ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA"].map((record) => ({ value: record, label: record }));

const jwtSample = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldiBVdGlscyIsImlhdCI6MTUxNjIzOTAyMn0.";

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const onHash = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return hash;
}

function usePreferredDark() {
  const [prefersDark, setPrefersDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return prefersDark;
}

function App() {
  const hash = useHashRoute();
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("theme") as Theme) || "system");
  const prefersDark = usePreferredDark();
  const resolvedTheme: ResolvedTheme = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
  const selectedId = hash.match(/^#\/tools\/([^/]+)/)?.[1] ?? "home";
  const selectedTool = selectedId === "home" ? undefined : toolById.get(selectedId);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themeMode = theme;
  }, [theme, resolvedTheme]);

  const grouped = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = normalized ? tools.filter((tool) => `${tool.title} ${tool.subtitle}`.toLowerCase().includes(normalized)) : tools;
    return Object.keys(categories).map((category) => ({
      id: category as ToolCategoryId,
      title: categories[category as ToolCategoryId],
      tools: filtered.filter((tool) => tool.category === category),
    })).filter((category) => category.tools.length);
  }, [query]);

  return (
    <ConfigProvider
      theme={{
        algorithm: resolvedTheme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: resolvedTheme === "dark" ? "#45f0d1" : "#006b5f",
          borderRadius: 8,
          fontFamily: "\"IBM Plex Sans\", \"Aptos\", \"Segoe UI\", sans-serif",
        },
      }}
    >
      <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#/">
          <span className="brand-mark">D</span>
          <span>
            <strong>DevUtils Web</strong>
            <small>Local-first toolbox</small>
          </span>
        </a>
        <label className="search-box">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tools" />
        </label>
        <nav className="nav-list">
          {grouped.map((category) => (
            <section key={category.id}>
              <h2>{category.title}</h2>
              {category.tools.map((tool) => (
                <a key={tool.id} className={selectedTool?.id === tool.id ? "active" : ""} href={tool.route}>
                  <tool.icon size={17} />
                  <span>{tool.title}</span>
                  {tool.status !== "ready" && <em>{tool.status}</em>}
                </a>
              ))}
            </section>
          ))}
        </nav>
        <div className="sidebar-footer">
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <a href="https://github.com/chunyang-wen/sword" target="_blank" rel="noreferrer"><Github size={16} /> Source</a>
          <a href="https://x.com/ChunyangWen" target="_blank" rel="noreferrer"><Twitter size={16} /> Twitter</a>
        </div>
      </aside>
      <main className="workspace">
        {selectedTool ? <ToolPage tool={selectedTool} /> : <HomePage />}
      </main>
      </div>
    </ConfigProvider>
  );
}

function ThemeToggle({ theme, setTheme }: { theme: Theme; setTheme: (theme: Theme) => void }) {
  return (
    <div className="segmented" aria-label="Theme">
      <button className={theme === "system" ? "selected" : ""} onClick={() => setTheme("system")}>Auto</button>
      <button className={theme === "light" ? "selected" : ""} onClick={() => setTheme("light")}><Sun size={14} /></button>
      <button className={theme === "dark" ? "selected" : ""} onClick={() => setTheme("dark")}><Moon size={14} /></button>
    </div>
  );
}

function HomePage() {
  const totalTools = tools.length;
  const categoryList = Object.entries(categories) as Array<[ToolCategoryId, string]>;
  return (
    <div className="home">
      <div className="hero-panel">
        <div className="hero-kicker">Developer Workbench</div>
        <h1>Local-first utilities for the daily engineering loop.</h1>
        <p>Format payloads, transform text, decode tokens, generate secrets, and inspect web data without sending inputs to an app server.</p>
        <div className="hero-meta">
          <span>{totalTools} tools</span>
          <span>{categoryList.length} categories</span>
          <span>Browser resident</span>
          <a href="https://x.com/ChunyangWen" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'inherit', textDecoration: 'none' }}><Twitter size={14} /> @ChunyangWen</a>
        </div>
      </div>
      <div className="category-strip" aria-label="Tool categories">
        {categoryList.map(([id, title]) => (
          <a key={id} href={`#${id}`} className="category-chip">
            <span>{title}</span>
            <strong>{tools.filter((tool) => tool.category === id).length}</strong>
          </a>
        ))}
      </div>
      <div className="privacy-strip">
        <Check size={18} />
        <span>Local-first by default. DNS Lookup is the only ready tool that calls an external API, and it uses explicit DNS-over-HTTPS.</span>
      </div>
      {categoryList.map(([id, title]) => {
        const categoryTools = tools.filter((tool) => tool.category === id);
        return (
          <section className="tool-section" id={id} key={id}>
            <div className="section-heading">
              <h2>{title}</h2>
              <span>{categoryTools.length} tools</span>
            </div>
            <div className="home-grid">
              {categoryTools.map((tool) => (
                <a href={tool.route} className="tool-card" key={tool.id}>
                  <tool.icon size={22} />
                  <strong>{tool.title}</strong>
                  <span>{tool.subtitle}</span>
                </a>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ToolPage({ tool }: { tool: ToolDefinition }) {
  return (
    <section className="tool-page">
      <header className="tool-header">
        <div>
          <h1>{tool.title}</h1>
          <p>{tool.subtitle}</p>
        </div>
        <tool.icon size={28} />
      </header>
      <ToolSwitch key={tool.id} id={tool.id} />
    </section>
  );
}

function ToolSwitch({ id }: { id: string }) {
  switch (id) {
    case "json-yaml": return <DualTransform titleA="JSON" titleB="YAML" sample='{"name":"DevUtils","local":true}' toB={jsonToYaml} toA={yamlToJson} />;
    case "number-base": return <NumberBaseTool />;
    case "date-converter": return <DateTool />;
    case "unit-converter": return <UnitTool />;
    case "text-toolkit": return <TextToolkitTool />;
    case "string-inspector": return <StringInspectorTool />;
    case "text-diff": return <TextDiffTool />;
    case "regex-matching": return <RegexTool />;
    case "json-formatter": return <SingleTransform sample='{"hello":"world","items":[1,2]}' transform={formatJson} />;
    case "json-csv": return <DualTransform titleA="JSON" titleB="CSV" sample='[{"name":"Ada","role":"engineer"},{"name":"Linus","role":"maintainer"}]' toB={jsonToCsv} toA={csvToJson} />;
    case "sql-formatter": return <SingleTransform sample="select id, name from users where active = true order by created_at desc" transform={safeSql} />;
    case "xml-formatter": return <SingleTransform sample={'<root><item id="1">DevUtils</item></root>'} transform={formatXml} />;
    case "web-formatter": return <WebFormatterTool />;
    case "markdown-preview": return <MarkdownPreviewTool />;
    case "html-preview": return <HtmlPreviewTool />;
    case "cron-job-parser": return <CronTool />;
    case "qr-coder": return <QrTool />;
    case "url-coder": return <EncodeDecodeTool encode={urlEncode} decode={urlDecode} sample="https://example.com/search?q=dev utils" />;
    case "html-entities": return <EncodeDecodeTool encode={htmlEntityEncode} decode={htmlEntityDecode} sample={'<button aria-label="Save & close">Save</button>'} />;
    case "backslash-escape": return <EncodeDecodeTool encode={backslashEscape} decode={backslashUnescape} sample={'line one\n"quoted" path: C:\\tmp'} />;
    case "hex-ascii": return <EncodeDecodeTool encode={asciiToHex} decode={hexToAscii} sample="DevUtils Web" />;
    case "base64-coder": return <Base64Tool />;
    case "jwt-decoder": return <SingleTransform sample={jwtSample} transform={decodeJwt} />;
    case "certificate-decoder": return <CertificateTool />;
    case "color-converter": return <ColorConverterTool />;
    case "hash-generator": return <HashTool />;
    case "uuid-generator": return <UuidTool />;
    case "random-string-generator": return <RandomStringTool />;
    case "password-generator": return <PasswordTool />;
    case "ssh-key-generator": return <SshKeyTool />;
    case "lorem-ipsum-generator": return <LoremTool />;
    case "dns-lookup": return <DnsTool />;
    case "basic-info": return <BasicInfoTool />;
    case "ip-lookup": return <IpLookupTool />;
    case "url-parser-builder": return <SingleTransform sample="https://user:pass@example.com:443/docs?q=dev#top" transform={parseUrl} />;
    case "http-status-codes": return <HttpStatusTool />;
    case "cli-cheatsheet": return <CliCheatsheetTool />;
    case "cli-builder": return <CliBuilderTool />;
    default: return <div className="notice">Tool not found.</div>;
  }
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button className="icon-button" onClick={async () => {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    }} disabled={!value} title="Copy">
      {copied ? <Check size={16} /> : <Clipboard size={16} />}
    </button>
  );
}

function TextArea({ label, value, setValue, placeholder }: { label: string; value: string; setValue: (value: string) => void; placeholder?: string }) {
  return (
    <div className="field">
      <div className="field-header">
        <span>{label}</span>
      </div>
      <textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} spellCheck={false} />
    </div>
  );
}

interface StepperProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}

function Stepper({ label, value, onChange, min = 1, max = 100 }: StepperProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (!isNaN(val)) {
      onChange(Math.max(min, Math.min(max, val)));
    }
  };

  return (
    <div className="field">
      <span className="stepper-label">{label}</span>
      <div className="stepper-control">
        <button 
          className="stepper-btn" 
          onClick={handleDecrement} 
          disabled={value <= min}
          type="button"
          title="Decrease"
        >
          <Minus size={14} />
        </button>
        <input 
          type="text" 
          className="stepper-input" 
          value={value} 
          onChange={handleChange}
          inputMode="numeric"
          pattern="[0-9]*"
        />
        <button 
          className="stepper-btn" 
          onClick={handleIncrement} 
          disabled={value >= max}
          type="button"
          title="Increase"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function Output({ result, label = "Output" }: { result: Result<string>; label?: string }) {
  const value = result.ok ? result.value : "";
  return (
    <div className="output-block">
      <div className="output-bar">
        <span>{label}</span>
        <CopyButton value={value} />
      </div>
      {result.ok ? <pre>{value}</pre> : <div className="error">{result.error}</div>}
    </div>
  );
}

function SingleTransform({ sample, transform }: { sample: string; transform: (input: string) => Result<string> }) {
  const [input, setInput] = useState(sample);
  useEffect(() => {
    setInput(sample);
  }, [sample]);
  const result = useMemo(() => transform(input), [input, transform]);
  return (
    <div className="tool-grid two">
      <TextArea label="Input" value={input} setValue={setInput} />
      <Output result={result} />
    </div>
  );
}

function CertificateTool() {
  const [target, setTarget] = useState("example.com");
  const [port, setPort] = useState("443");
  const [input, setInput] = useState("");
  const [retrieving, setRetrieving] = useState(false);
  const [retrieveResult, setRetrieveResult] = useState<Result<string>>({ ok: true, value: "" });
  const result = useMemo(() => certificateInfo(input), [input]);
  const trimmedTarget = target.trim() || "example.com";
  const effectivePort = Number.isInteger(Number(port)) && Number(port) > 0 && Number(port) <= 65535 ? Number(port) : 443;
  const opensslCommand = `openssl s_client -connect ${trimmedTarget}:${effectivePort} -servername ${trimmedTarget} -showcerts </dev/null 2>/dev/null | openssl x509 -outform PEM`;

  const handleRetrieve = async () => {
    setRetrieving(true);
    setRetrieveResult({ ok: true, value: "" });
    try {
      const next = await retrieveServerCertificate(target, effectivePort);
      setRetrieveResult(next);
      if (next.ok) setInput(next.value);
    } catch (error) {
      setRetrieveResult({
        ok: false,
        error: error instanceof Error ? error.message : "Certificate retrieval failed.",
      });
    } finally {
      setRetrieving(false);
    }
  };

  return (
    <div className="stacked-tool">
      <div className="controls-panel horizontal certificate-controls">
        <label className="field wide-field">
          <span>Website</span>
          <input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="example.com or https://example.com" />
        </label>
        <label className="field certificate-port-field">
          <span>Port</span>
          <input
            type="number"
            min={1}
            max={65535}
            value={port}
            onChange={(event) => setPort(event.target.value)}
          />
        </label>
        <button className="primary-action flush" onClick={handleRetrieve} disabled={retrieving}>
          {retrieving ? "Retrieving..." : "Retrieve Certificate"}
        </button>
      </div>

      <div className="openssl-hint">
        <div className="output-bar">
          <span>OpenSSL</span>
          <CopyButton value={opensslCommand} />
        </div>
        <pre>{opensslCommand}</pre>
      </div>

      {!retrieveResult.ok && <div className="error compact-error">{retrieveResult.error}</div>}

      <div className="tool-grid two">
        <TextArea label="PEM Certificate" value={input} setValue={setInput} placeholder="Paste a PEM encoded X.509 certificate, or retrieve one from a website above." />
        <Output result={result} />
      </div>
    </div>
  );
}

function DualTransform({ titleA, titleB, sample, toB, toA }: { titleA: string; titleB: string; sample: string; toB: (input: string) => Result<string>; toA: (input: string) => Result<string> }) {
  const [left, setLeft] = useState(sample);
  const [right, setRight] = useState("");
  return (
    <div className="tool-grid two">
      <div>
        <TextArea label={titleA} value={left} setValue={setLeft} />
        <button className="primary-action" onClick={() => { const result = toB(left); if (result.ok) setRight(result.value); }}>Convert to {titleB}</button>
      </div>
      <div>
        <TextArea label={titleB} value={right} setValue={setRight} />
        <button className="primary-action" onClick={() => { const result = toA(right); if (result.ok) setLeft(result.value); }}>Convert to {titleA}</button>
      </div>
    </div>
  );
}

function EncodeDecodeTool({ encode, decode, sample }: { encode: (input: string) => string; decode: (input: string) => Result<string>; sample: string }) {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [encodeInput, setEncodeInput] = useState(sample);
  const [decodeInput, setDecodeInput] = useState(() => encode(sample));

  const input = mode === "encode" ? encodeInput : decodeInput;
  const setInput = (val: string) => {
    if (mode === "encode") {
      setEncodeInput(val);
    } else {
      setDecodeInput(val);
    }
  };

  const result = useMemo(() => {
    return mode === "encode"
      ? { ok: true as const, value: encode(encodeInput) }
      : decode(decodeInput);
  }, [mode, encodeInput, decodeInput, encode, decode]);

  const handleModeChange = (newMode: "encode" | "decode") => {
    if (newMode === "decode") {
      // When switching to decode, seed it with the encoded output of the current encode input
      setDecodeInput(encode(encodeInput));
    } else {
      // When switching to encode, seed it with the decoded output of the current decode input (if valid)
      const decoded = decode(decodeInput);
      if (decoded.ok) {
        setEncodeInput(decoded.value);
      }
    }
    setMode(newMode);
  };

  return (
    <>
      <div className="segmented wide">
        <button className={mode === "encode" ? "selected" : ""} onClick={() => handleModeChange("encode")}>Encode</button>
        <button className={mode === "decode" ? "selected" : ""} onClick={() => handleModeChange("decode")}>Decode</button>
      </div>
      <div className="tool-grid two">
        <TextArea label="Input" value={input} setValue={setInput} />
        <Output result={result} />
      </div>
    </>
  );
}

function Base64Tool() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [altchars, setAltchars] = useState("");
  const sample = "Hello, DevUtils";
  const [encodeInput, setEncodeInput] = useState(sample);
  const [decodeInput, setDecodeInput] = useState(() => base64Encode(sample));

  const input = mode === "encode" ? encodeInput : decodeInput;
  const setInput = (val: string) => {
    if (mode === "encode") {
      setEncodeInput(val);
    } else {
      setDecodeInput(val);
    }
  };

  const result = useMemo(() => {
    return mode === "encode"
      ? { ok: true as const, value: base64Encode(encodeInput, altchars) }
      : base64Decode(decodeInput, altchars);
  }, [mode, encodeInput, decodeInput, altchars]);

  const handleModeChange = (newMode: "encode" | "decode") => {
    if (newMode === "decode") {
      setDecodeInput(base64Encode(encodeInput, altchars));
    } else {
      const decoded = base64Decode(decodeInput, altchars);
      if (decoded.ok) {
        setEncodeInput(decoded.value);
      }
    }
    setMode(newMode);
  };

  return (
    <div className="stacked-tool">
      <div className="controls-panel horizontal">
        <label className="field" style={{ maxWidth: 200 }}>
          <span>Alternative Characters (altchars)</span>
          <input 
            type="text" 
            value={altchars} 
            onChange={(e) => setAltchars(e.target.value.slice(0, 2))} 
            placeholder="e.g. -_"
            maxLength={2}
          />
        </label>
      </div>
      <div className="segmented wide">
        <button className={mode === "encode" ? "selected" : ""} onClick={() => handleModeChange("encode")}>Encode</button>
        <button className={mode === "decode" ? "selected" : ""} onClick={() => handleModeChange("decode")}>Decode</button>
      </div>
      <div className="tool-grid two">
        <TextArea label="Input" value={input} setValue={setInput} />
        <Output result={result} />
      </div>
    </div>
  );
}

function NumberBaseTool() {
  const [base, setBase] = useState("10");
  const [input, setInput] = useState("255");
  const result = convertBase(input, Number(base));
  return (
    <StructuredTool
      controls={
        <div className="controls-panel horizontal">
          <label className="field segmented-field">
            <span>Base</span>
            <Segmented
              className="ant-control compact-segmented"
              block
              size="large"
              value={base}
              onChange={(value) => setBase(String(value))}
              options={baseOptions}
            />
          </label>
        </div>
      }
      input={input}
      setInput={setInput}
      result={result.ok ? { ok: true, value: JSON.stringify(result.value, null, 2) } : result}
    />
  );
}

function StructuredTool({ controls, input, setInput, result }: { controls?: React.ReactNode; input: string; setInput: (value: string) => void; result: Result<string> }) {
  return (
    <div>
      {controls && <div className="controls">{controls}</div>}
      <div className="tool-grid two">
        <TextArea label="Input" value={input} setValue={setInput} />
        <Output result={result} />
      </div>
    </div>
  );
}

function DateTool() {
  const now = useMemo(() => new Date(), []);
  const [date, setDate] = useState(() => formatDateInput(now));
  const [time, setTime] = useState(() => formatTimeInput(now));
  const [customInput, setCustomInput] = useState("");
  const dateValue = useMemo(() => dayjs(date), [date]);
  const timeValue = useMemo(() => dayjs(`2000-01-01T${time || "00:00"}`), [time]);
  const selectedInput = customInput.trim() || `${date}T${time || "00:00"}`;
  const result = dateFields(selectedInput);
  return (
    <div>
      <div className="controls-panel horizontal">
        <label className="field">
          <span>Date</span>
          <DatePicker
            className="ant-control"
            size="large"
            value={dateValue}
            format="YYYY-MM-DD"
            allowClear={false}
            onChange={(value) => {
              if (value) setDate(value.format("YYYY-MM-DD"));
            }}
          />
        </label>
        <label className="field">
          <span>Time</span>
          <TimePicker
            className="ant-control"
            size="large"
            value={timeValue}
            format="HH:mm"
            allowClear={false}
            onChange={(value) => {
              if (value) setTime(value.format("HH:mm"));
            }}
          />
        </label>
        <label className="field wide-field">
          <span>Timestamp or date string</span>
          <Input
            className="ant-control"
            size="large"
            value={customInput}
            onChange={(event) => setCustomInput(event.target.value)}
            placeholder="Optional: 1716220800, 1716220800000, ISO date"
          />
        </label>
      </div>
      <Output result={result.ok ? { ok: true, value: JSON.stringify(result.value, null, 2) } : result} />
    </div>
  );
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeInput(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function CronTool() {
  const [cronInput, setCronInput] = useState("*/15 9-17 * * 1-5");
  const [frequency, setFrequency] = useState<CronFrequency>("daily");
  const [interval, setInterval] = useState(15);
  const [minute, setMinute] = useState(0);
  const [hour, setHour] = useState(9);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1]);
  const [month, setMonth] = useState(1);
  const [dailyType, setDailyType] = useState<"everyDay" | "everyXDays" | "weekday">("everyDay");
  const [hourlyType, setHourlyType] = useState<"everyHour" | "everyXHours">("everyHour");
  const [monthlyType, setMonthlyType] = useState<"everyMonth" | "everyXMonths">("everyMonth");

  const generated = useMemo(
    () =>
      generateCronExpression({
        frequency,
        interval,
        minute,
        hour,
        dayOfMonth,
        dayOfWeek,
        daysOfWeek,
        month,
        dailyType,
        hourlyType,
        monthlyType,
      }),
    [frequency, interval, minute, hour, dayOfMonth, dayOfWeek, daysOfWeek, month, dailyType, hourlyType, monthlyType]
  );
  const parseResult = useMemo(() => describeCron(cronInput), [cronInput]);
  const generatedDescription = generated.ok ? describeCron(generated.value) : generated;
  const generatedOutput = generated.ok
    ? {
        ok: true as const,
        value: `${generated.value}\n\n${generatedDescription.ok ? generatedDescription.value : generatedDescription.error}`,
      }
    : generated;

  const weekdays = [
    { label: "Su", value: 0 },
    { label: "Mo", value: 1 },
    { label: "Tu", value: 2 },
    { label: "We", value: 3 },
    { label: "Th", value: 4 },
    { label: "Fr", value: 5 },
    { label: "Sa", value: 6 },
  ];

  return (
    <div className="cron-layout">
      <div className="cron-cell">
        <div className="field-header">
          <span>Build expression</span>
        </div>
        <div className="controls-panel cron-controls">
          <div className="options-row">
            <label className="field">
              <span>Schedule</span>
              <Select
                className="ant-control"
                size="large"
                value={frequency}
                onChange={setFrequency}
                options={cronFrequencyOptions}
              />
            </label>

            {/* Hourly Type Options */}
            {frequency === "hourly" && (
              <label className="field">
                <span>Hourly Type</span>
                <Select
                  className="ant-control"
                  size="large"
                  value={hourlyType}
                  onChange={(val) => setHourlyType(val as "everyHour" | "everyXHours")}
                  options={hourlyTypeOptions}
                />
              </label>
            )}
            {frequency === "hourly" && hourlyType === "everyXHours" && (
              <label className="field" style={{ flex: "1 1 100px", maxWidth: "120px" }}>
                <span>Hour Interval</span>
                <input type="number" min={1} max={23} value={interval} onChange={(event) => setInterval(Number(event.target.value))} />
              </label>
            )}

            {/* Daily Type Options */}
            {frequency === "daily" && (
              <label className="field">
                <span>Daily Type</span>
                <Select
                  className="ant-control"
                  size="large"
                  value={dailyType}
                  onChange={(val) => setDailyType(val as "everyDay" | "everyXDays" | "weekday")}
                  options={dailyTypeOptions}
                />
              </label>
            )}
            {frequency === "daily" && dailyType === "everyXDays" && (
              <label className="field" style={{ flex: "1 1 100px", maxWidth: "120px" }}>
                <span>Day Interval</span>
                <input type="number" min={1} max={30} value={interval} onChange={(event) => setInterval(Number(event.target.value))} />
              </label>
            )}

            {/* Monthly Type Options */}
            {frequency === "monthly" && (
              <label className="field">
                <span>Monthly Type</span>
                <Select
                  className="ant-control"
                  size="large"
                  value={monthlyType}
                  onChange={(val) => setMonthlyType(val as "everyMonth" | "everyXMonths")}
                  options={monthlyTypeOptions}
                />
              </label>
            )}
            {frequency === "monthly" && monthlyType === "everyXMonths" && (
              <label className="field" style={{ flex: "1 1 100px", maxWidth: "120px" }}>
                <span>Month Interval</span>
                <input type="number" min={1} max={11} value={interval} onChange={(event) => setInterval(Number(event.target.value))} />
              </label>
            )}

            {/* Yearly Options */}
            {frequency === "yearly" && (
              <label className="field">
                <span>Month</span>
                <Select
                  className="ant-control"
                  size="large"
                  value={month}
                  onChange={setMonth}
                  options={monthOptions}
                />
              </label>
            )}

            {/* Minutes Interval */}
            {frequency === "minutes" && (
              <label className="field" style={{ flex: "1 1 100px", maxWidth: "120px" }}>
                <span>Interval</span>
                <input type="number" min={1} max={59} value={interval} onChange={(event) => setInterval(Number(event.target.value))} />
              </label>
            )}

            {/* Time Controls */}
            {frequency !== "minutes" && (
              <label className="field" style={{ flex: "1 1 100px", maxWidth: "120px" }}>
                <span>Minute</span>
                <input type="number" min={0} max={59} value={minute} onChange={(event) => setMinute(Number(event.target.value))} />
              </label>
            )}
            {["daily", "weekly", "monthly", "yearly"].includes(frequency) && dailyType !== "weekday" && (
              <label className="field" style={{ flex: "1 1 100px", maxWidth: "120px" }}>
                <span>Hour</span>
                <input type="number" min={0} max={23} value={hour} onChange={(event) => setHour(Number(event.target.value))} />
              </label>
            )}
            {frequency === "monthly" && (
              <label className="field" style={{ flex: "1 1 100px", maxWidth: "120px" }}>
                <span>Day</span>
                <input type="number" min={1} max={31} value={dayOfMonth} onChange={(event) => setDayOfMonth(Number(event.target.value))} />
              </label>
            )}
            {frequency === "yearly" && (
              <label className="field" style={{ flex: "1 1 100px", maxWidth: "120px" }}>
                <span>Day</span>
                <input type="number" min={1} max={31} value={dayOfMonth} onChange={(event) => setDayOfMonth(Number(event.target.value))} />
              </label>
            )}

            {/* Weekly Days Multi-Selector */}
            {frequency === "weekly" && (
              <div className="field" style={{ flex: "2 1 300px" }}>
                <span>Weekdays</span>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                  {weekdays.map((day) => {
                    const active = daysOfWeek.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        style={{
                          flex: "1 1 36px",
                          height: "38px",
                          borderRadius: "6px",
                          border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
                          backgroundColor: active ? "var(--primary-tonal)" : "var(--surface-code)",
                          color: active ? "var(--primary)" : "var(--muted)",
                          cursor: "pointer",
                          fontWeight: active ? "700" : "500",
                          transition: "all 0.16s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onClick={() => {
                          if (active) {
                            if (daysOfWeek.length > 1) {
                              setDaysOfWeek(daysOfWeek.filter((d) => d !== day.value));
                            }
                          } else {
                            setDaysOfWeek([...daysOfWeek, day.value].sort((a, b) => a - b));
                          }
                        }}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <button className="primary-action flush" disabled={!generated.ok} onClick={() => generated.ok && setCronInput(generated.value)}>Use expression</button>
        </div>
      </div>
      <div className="cron-cell">
        <label className="field cron-expression-field cron-expression-card">
          <div className="field-header">
            <span>Parse expression</span>
          </div>
          <textarea className="cron-expression-input" value={cronInput} onChange={(event) => setCronInput(event.target.value)} spellCheck={false} />
        </label>
      </div>
      <div className="cron-cell">
        <Output label="Generated expression" result={generatedOutput} />
      </div>
      <div className="cron-cell">
        <Output label="Description" result={parseResult} />
      </div>
    </div>
  );
}

function UnitTool() {
  const [category, setCategory] = useState<UnitCategory>("length");
  const names = unitNames(category);
  const [from, setFrom] = useState(names[0]);
  const [to, setTo] = useState(names[1]);
  const [input, setInput] = useState("1");
  useEffect(() => { const next = unitNames(category); setFrom(next[0]); setTo(next[1]); }, [category]);
  return (
    <StructuredTool
      controls={
        <div className="controls-panel horizontal">
          <label className="field">
            <span>Category</span>
            <Select
              className="ant-control"
              size="large"
              value={category}
              onChange={setCategory}
              options={unitCategoryOptions}
            />
          </label>
          <label className="field">
            <span>From</span>
            <Select
              className="ant-control"
              size="large"
              value={from}
              onChange={setFrom}
              options={names.map((name) => ({ value: name, label: name }))}
            />
          </label>
          <label className="field">
            <span>To</span>
            <Select
              className="ant-control"
              size="large"
              value={to}
              onChange={setTo}
              options={names.map((name) => ({ value: name, label: name }))}
            />
          </label>
        </div>
      }
      input={input}
      setInput={setInput}
      result={convertUnit(input, category, from, to)}
    />
  );
}

function TextToolkitTool() {
  const [input, setInput] = useState("apple, banana,, cherry");
  const [source, setSource] = useState("comma");
  const [target, setTarget] = useState("newline");
  const [trim, setTrim] = useState(true);
  const [collapse, setCollapse] = useState(false);
  const [casing, setCasing] = useState("none");
  const [sort, setSort] = useState(false);
  const [unique, setUnique] = useState(false);
  const [removeEmpty, setRemoveEmpty] = useState(true);
  const value = textToolkit(input, { source, target, trim, collapse, casing, sort, unique, removeEmpty });
  return (
    <div>
      <div className="options-panel horizontal-wrap">
        <div className="options-row">
          <div className="option-item">
            <span className="option-label">Source Delimiter</span>
              <div className="segmented">
                {["comma", "space", "newline"].map((name) => (
                <button key={`s-${name}`} className={source === name ? "selected" : ""} onClick={() => setSource(name)}>{name}</button>
              ))}
            </div>
          </div>
          <div className="option-item">
            <span className="option-label">Target Delimiter</span>
              <div className="segmented">
                {["comma", "space", "newline"].map((name) => (
                <button key={`t-${name}`} className={target === name ? "selected" : ""} onClick={() => setTarget(name)}>{name}</button>
              ))}
            </div>
          </div>
          <div className="option-item">
            <span className="option-label">Casing</span>
            <Segmented
              className="ant-control compact-segmented"
              block
              size="large"
              value={casing}
              onChange={(value) => setCasing(String(value))}
              options={casingOptions}
            />
          </div>
        </div>
        <div className="checkbox-group">
          <label className="checkbox-field"><input type="checkbox" checked={trim} onChange={(e) => setTrim(e.target.checked)} /> <span>Trim punctuation</span></label>
          <label className="checkbox-field"><input type="checkbox" checked={collapse} onChange={(e) => setCollapse(e.target.checked)} /> <span>Collapse punctuation</span></label>
          <label className="checkbox-field"><input type="checkbox" checked={sort} onChange={(e) => setSort(e.target.checked)} /> <span>Sort lines</span></label>
          <label className="checkbox-field"><input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} /> <span>Unique lines</span></label>
          <label className="checkbox-field"><input type="checkbox" checked={removeEmpty} onChange={(e) => setRemoveEmpty(e.target.checked)} /> <span>Remove empty elements</span></label>
        </div>
      </div>
      <div className="tool-grid two">
        <TextArea label="Input" value={input} setValue={setInput} />
        <Output result={{ ok: true, value }} />
      </div>
    </div>
  );
}

function StringInspectorTool() {
  const [input, setInput] = useState("DevUtils Web\nTabs\tspaces  emoji: ⚙️");
  return (
    <div className="tool-grid two">
      <TextArea label="String" value={input} setValue={setInput} />
      <Output result={{ ok: true, value: inspectString(input) }} label="Inspection" />
    </div>
  );
}

function WebFormatterTool() {
  const [language, setLanguage] = useState<WebFormatLanguage>("html");
  const [mode, setMode] = useState<WebFormatMode>("beautify");
  const [input, setInput] = useState('<main><h1>DevUtils</h1><button class="save">Save</button></main>');
  const result = useMemo(() => formatWebCode(input, language, mode), [input, language, mode]);

  return (
    <div>
      <div className="options-panel horizontal-wrap">
        <div className="option-item">
          <span className="option-label">Language</span>
          <Segmented
            className="ant-control compact-segmented"
            block
            size="large"
            value={language}
            onChange={(value) => setLanguage(value as WebFormatLanguage)}
            options={[
              { value: "html", label: "HTML" },
              { value: "css", label: "CSS" },
              { value: "javascript", label: "JS" },
            ]}
          />
        </div>
        <div className="option-item">
          <span className="option-label">Mode</span>
          <Segmented
            className="ant-control compact-segmented"
            block
            size="large"
            value={mode}
            onChange={(value) => setMode(value as WebFormatMode)}
            options={[
              { value: "beautify", label: "Beautify" },
              { value: "minify", label: "Minify" },
            ]}
          />
        </div>
      </div>
      <div className="tool-grid two">
        <TextArea label="Input" value={input} setValue={setInput} />
        <Output result={result} />
      </div>
    </div>
  );
}

function MarkdownPreviewTool() {
  const [input, setInput] = useState("# DevUtils Web\n\nRender **Markdown** locally with `code`, links, and lists.\n\n- Format notes\n- Preview README snippets");
  const html = useMemo(() => markdownToHtml(input), [input]);
  return (
    <div className="tool-grid two">
      <TextArea label="Markdown" value={input} setValue={setInput} />
      <div className="preview-stack">
        <div className="output-block">
          <div className="output-bar">
            <span>Preview</span>
          </div>
          <div className="rendered-preview markdown-preview" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
        <Output label="HTML" result={{ ok: true, value: html }} />
      </div>
    </div>
  );
}

function HtmlPreviewTool() {
  const [input, setInput] = useState('<!doctype html>\n<html>\n  <body>\n    <h1>DevUtils Web</h1>\n    <button>Preview</button>\n  </body>\n</html>');
  return (
    <div className="tool-grid two">
      <TextArea label="HTML" value={input} setValue={setInput} />
      <div className="output-block">
        <div className="output-bar">
          <span>Sandboxed preview</span>
        </div>
        <iframe className="html-preview-frame" sandbox="" srcDoc={input} title="HTML preview" />
      </div>
    </div>
  );
}

function ColorConverterTool() {
  const [input, setInput] = useState("#45f0d1");
  const result = useMemo(() => colorInfo(input), [input]);
  return (
    <div className="tool-grid two">
      <div className="options-block">
        <div className="field-header">
          <span>Color</span>
        </div>
        <div className="options-container">
          <label className="field">
            <span>HEX, RGB, or HSL</span>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="#45f0d1, rgb(69,240,209), hsl(170,86%,61%)" />
          </label>
          <div className="color-preview" style={{ background: result.ok ? result.value.css : "transparent" }} />
        </div>
      </div>
      <Output result={result.ok ? { ok: true, value: result.value.output } : result} />
    </div>
  );
}

function RandomStringTool() {
  const alphabets = {
    alphanumeric: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    url: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
    hex: "0123456789abcdef",
    numeric: "0123456789",
  };
  const [length, setLength] = useState(32);
  const [count, setCount] = useState(5);
  const [preset, setPreset] = useState<keyof typeof alphabets>("url");
  const [customAlphabet, setCustomAlphabet] = useState("");
  const [nonce, setNonce] = useState(0);
  const alphabet = customAlphabet || alphabets[preset];
  const result = useMemo(() => randomStrings(length, count, alphabet), [alphabet, count, length, nonce]);

  return (
    <div className="tool-grid two">
      <div className="options-block">
        <div className="field-header">
          <span>Options</span>
        </div>
        <div className="options-container">
          <Stepper label="Length" value={length} onChange={setLength} min={1} max={512} />
          <Stepper label="Count" value={count} onChange={setCount} min={1} max={200} />
          <label className="field">
            <span>Preset</span>
            <Select
              className="ant-control"
              size="large"
              value={preset}
              onChange={setPreset}
              disabled={Boolean(customAlphabet)}
              options={[
                { value: "url", label: "URL-safe" },
                { value: "alphanumeric", label: "Alphanumeric" },
                { value: "hex", label: "Hex" },
                { value: "numeric", label: "Numeric" },
              ]}
            />
          </label>
          <label className="field">
            <span>Custom alphabet</span>
            <input value={customAlphabet} onChange={(event) => setCustomAlphabet(event.target.value)} placeholder="Optional character set" />
          </label>
          <button className="primary-action" onClick={() => setNonce((current) => current + 1)}>
            <RotateCcw size={15} /> Regenerate
          </button>
        </div>
      </div>
      <Output result={result} />
    </div>
  );
}

function RegexTool() {
  const [pattern, setPattern] = useState("\\w+");
  const [flags, setFlags] = useState("gi");
  const [replacement, setReplacement] = useState("");
  const [input, setInput] = useState("DevUtils Web");
  const result = regexInspect(pattern, flags, input, replacement);
  return (
    <div>
      <div className="options-panel horizontal-wrap">
        <label className="field">
          <span>Pattern</span>
          <input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="Pattern" />
        </label>
        <label className="field">
          <span>Flags</span>
          <input value={flags} onChange={(e) => setFlags(e.target.value)} placeholder="Flags" />
        </label>
        <label className="field">
          <span>Replacement</span>
          <input value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder="Replacement" />
        </label>
      </div>
      <div className="tool-grid two">
        <TextArea label="Test text" value={input} setValue={setInput} />
        <Output result={result.ok ? { ok: true, value: `${result.value.summary}${result.value.replaced ? `\n\nReplacement:\n${result.value.replaced}` : ""}` } : result} />
      </div>
    </div>
  );
}

function DiffOutput({ left, right, chunks }: { left: string; right: string; chunks: DiffChunk[] }) {
  const diffString = useMemo(() => diffText(left, right), [left, right]);
  return (
    <div className="output-block">
      <div className="output-bar">
        <span>Difference</span>
        <CopyButton value={diffString} />
      </div>
      <pre className="diff-output-pre">
        {chunks.map((chunk, index) => {
          if (chunk.type === "delete") {
            return (
              <span key={index} className="diff-chunk-delete">
                {chunk.value}
              </span>
            );
          }
          if (chunk.type === "insert") {
            return (
              <span key={index} className="diff-chunk-insert">
                {chunk.value}
              </span>
            );
          }
          return (
            <span key={index} className="diff-chunk-match">
              {chunk.value}
            </span>
          );
        })}
      </pre>
    </div>
  );
}

function TextDiffTool() {
  const [left, setLeft] = useState("DevUtils for macOS");
  const [right, setRight] = useState("DevUtils for Web");
  const chunks = useMemo(() => diffTextChunks(left, right), [left, right]);
  
  return (
    <div className="tool-grid three">
      <TextArea label="Left" value={left} setValue={setLeft} />
      <TextArea label="Right" value={right} setValue={setRight} />
      <DiffOutput left={left} right={right} chunks={chunks} />
    </div>
  );
}

function HashTool() {
  const [input, setInput] = useState("DevUtils");
  const [output, setOutput] = useState<Result<string>>({ ok: true, value: "" });
  useEffect(() => { digests(input).then((value) => setOutput({ ok: true, value: JSON.stringify(value, null, 2) })).catch((error) => setOutput({ ok: false, error: String(error) })); }, [input]);
  return <StructuredTool input={input} setInput={setInput} result={output} />;
}

function UuidTool() {
  const [count, setCount] = useState(5);
  const [upper, setUpper] = useState(false);
  const [nonce, setNonce] = useState(0);
  const value = useMemo(() => uuidList(count, upper), [count, upper, nonce]);
  return (
    <div className="tool-grid two">
      <div className="options-block">
        <div className="field-header">
          <span>Options</span>
        </div>
        <div className="options-container">
          <Stepper label="Count" value={count} onChange={setCount} min={1} max={100} />
          <label className="checkbox-field">
            <input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} />
            <span>Uppercase</span>
          </label>
          <button className="primary-action" onClick={() => setNonce((current) => current + 1)}>
            <RotateCcw size={15} /> Regenerate
          </button>
        </div>
      </div>
      <Output result={{ ok: true, value }} />
    </div>
  );
}

function PasswordTool() {
  const [length, setLength] = useState(24);
  const [count, setCount] = useState(1);
  const [sets, setSets] = useState({ lower: true, upper: true, digits: true, symbols: true });
  const result = useMemo<Result<string>>(() => {
    const rows: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const next = password(length, sets);
      if (!next.ok) return next;
      rows.push(next.value);
    }
    return { ok: true, value: rows.join("\n") };
  }, [count, length, sets]);
  return (
    <div className="tool-grid two">
      <div className="options-block">
        <div className="field-header">
          <span>Options</span>
        </div>
        <div className="options-container">
          <Stepper label="Length" value={length} onChange={setLength} min={4} max={256} />
          <Stepper label="Count" value={count} onChange={setCount} min={1} max={100} />
          <div className="checkbox-group">
            {(Object.keys(sets) as Array<keyof typeof sets>).map((key) => (
              <label key={key} className="checkbox-field">
                <input type="checkbox" checked={sets[key]} onChange={(e) => setSets({ ...sets, [key]: e.target.checked })} />
                <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <Output result={result} />
    </div>
  );
}

function LoremTool() {
  const [count, setCount] = useState(3);
  return (
    <div className="tool-grid two">
      <div className="options-block">
        <div className="field-header">
          <span>Options</span>
        </div>
        <div className="options-container">
          <Stepper label="Paragraphs" value={count} onChange={setCount} min={1} max={20} />
        </div>
      </div>
      <Output result={{ ok: true, value: loremIpsum(count) }} />
    </div>
  );
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

type CliCommandId = "git" | "rg" | "fd" | "find" | "grep" | "xargs" | "kubectl" | "curl" | "wget" | "requests";
type CliOptionKind = "text" | "number" | "boolean" | "select" | "textarea";

interface CliOption {
  key: string;
  label: string;
  flag?: string;
  shortFlag?: string;
  kind: CliOptionKind;
  placeholder?: string;
  defaultValue?: string | boolean;
  choices?: Array<{ value: string; label: string }>;
  help: string;
  visibleIf?: { key: string; values: (string | boolean)[] };
  osCompat?: ("linux" | "macos")[];
}

interface CliCommandDef {
  id: CliCommandId;
  label: string;
  summary: string;
  docs: string;
  repo?: string;
  options: CliOption[];
}

const cliCommandDefs: CliCommandDef[] = [
  {
    id: "git",
    label: "git",
    summary: "Version control workflows: status, log, diff, grep, branches, commits, remotes.",
    docs: "https://git-scm.com/docs",
    repo: "https://github.com/git/git",
    options: [
      { key: "subcommand", label: "Subcommand", kind: "select", defaultValue: "status", help: "Choose the Git operation to build.", choices: [
        "status", "log", "diff", "grep", "add", "commit", "branch", "switch", "checkout", "clone", "pull", "push",
      ].map((value) => ({ value, label: value })) },
      { key: "target", label: "Path / ref / repo", kind: "text", placeholder: "e.g. src or main or https://github.com/owner/repo.git", help: "Main positional argument for commands that need a file, ref, branch, or repository URL." },
      { key: "message", label: "Commit message", kind: "text", placeholder: "e.g. Update CLI builder", help: "Used by git commit -m.", visibleIf: { key: "subcommand", values: ["commit"] } },
      { key: "pattern", label: "Grep pattern", kind: "text", placeholder: "e.g. TODO|FIXME", help: "Used by git grep.", visibleIf: { key: "subcommand", values: ["grep"] } },
      { key: "all", label: "--all / -A", kind: "boolean", help: "Show all branches for log/branch, or stage all tracked changes for commit.", visibleIf: { key: "subcommand", values: ["log", "branch", "commit"] } },
      { key: "patch", label: "--patch", kind: "boolean", flag: "--patch", help: "Interactively choose hunks for add, checkout, or commit.", visibleIf: { key: "subcommand", values: ["add", "commit", "checkout"] } },
      { key: "oneline", label: "--oneline", kind: "boolean", flag: "--oneline", defaultValue: true, help: "Compact one-commit-per-line log output.", visibleIf: { key: "subcommand", values: ["log"] } },
      { key: "stat", label: "--stat", kind: "boolean", flag: "--stat", help: "Show changed file summary for log or diff.", visibleIf: { key: "subcommand", values: ["log", "diff"] } },
      { key: "create", label: "-b / -c create", kind: "boolean", help: "Create a new branch when switching/checking out.", visibleIf: { key: "subcommand", values: ["switch", "checkout"] } },
      { key: "verbose", label: "--verbose", kind: "boolean", flag: "--verbose", help: "Show more details where supported.", visibleIf: { key: "subcommand", values: ["branch", "commit", "checkout"] } },
    ],
  },
  {
    id: "rg",
    label: "rg",
    summary: "Fast recursive text search with ripgrep.",
    docs: "https://github.com/BurntSushi/ripgrep/blob/master/GUIDE.md",
    repo: "https://github.com/BurntSushi/ripgrep",
    options: [
      { key: "pattern", label: "Pattern", kind: "text", defaultValue: "TODO", help: "Regex or fixed string to search for." },
      { key: "path", label: "Path", kind: "text", defaultValue: ".", help: "File or directory to search." },
      { key: "type", label: "--type", kind: "text", placeholder: "e.g. ts, py, rust", help: "Search only files matching a ripgrep type." },
      { key: "glob", label: "--glob", kind: "text", placeholder: "e.g. *.tsx or !dist/**", help: "Include or exclude paths with glob syntax." },
      { key: "context", label: "--context", kind: "number", placeholder: "e.g. 2", help: "Show N lines before and after each match." },
      { key: "ignoreCase", label: "--ignore-case", kind: "boolean", flag: "--ignore-case", help: "Case-insensitive search." },
      { key: "fixed", label: "--fixed-strings", kind: "boolean", flag: "--fixed-strings", help: "Treat the pattern literally rather than as regex." },
      { key: "filesWithMatches", label: "--files-with-matches", kind: "boolean", flag: "--files-with-matches", help: "Print only file names containing a match." },
      { key: "lineNumber", label: "--line-number", kind: "boolean", flag: "--line-number", defaultValue: true, help: "Show line numbers." },
      { key: "hidden", label: "--hidden", kind: "boolean", flag: "--hidden", help: "Search hidden files and directories." },
      { key: "noIgnore", label: "--no-ignore", kind: "boolean", flag: "--no-ignore", help: "Do not respect .gitignore, .ignore, or global ignore files." },
      { key: "json", label: "--json", kind: "boolean", flag: "--json", help: "Emit structured JSON output." },
    ],
  },
  {
    id: "fd",
    label: "fd",
    summary: "Friendly, fast file finding by name, path, type, extension, and command execution.",
    docs: "https://github.com/sharkdp/fd#how-to-use",
    repo: "https://github.com/sharkdp/fd",
    options: [
      { key: "pattern", label: "Pattern", kind: "text", placeholder: "e.g. README", help: "Regex or substring used to match file names." },
      { key: "path", label: "Path", kind: "text", defaultValue: ".", help: "Directory to search from." },
      { key: "type", label: "--type", kind: "select", defaultValue: "", help: "Restrict matches by file type.", choices: [
        { value: "", label: "Any" }, { value: "f", label: "File" }, { value: "d", label: "Directory" }, { value: "l", label: "Symlink" }, { value: "x", label: "Executable" }, { value: "e", label: "Empty" },
      ] },
      { key: "extension", label: "--extension", kind: "text", placeholder: "e.g. md", help: "Filter by extension without the dot." },
      { key: "exclude", label: "--exclude", kind: "text", placeholder: "e.g. node_modules", help: "Skip a file or directory pattern." },
      { key: "maxDepth", label: "--max-depth", kind: "number", placeholder: "e.g. 3", help: "Limit recursive search depth." },
      { key: "exec", label: "--exec", kind: "text", placeholder: "e.g. sed -n '1,20p' {}", help: "Run a command for each result. Use {} for the current path." },
      { key: "hidden", label: "--hidden", kind: "boolean", flag: "--hidden", help: "Include hidden files and directories." },
      { key: "noIgnore", label: "--no-ignore", kind: "boolean", flag: "--no-ignore", help: "Ignore ignore files." },
      { key: "caseSensitive", label: "--case-sensitive", kind: "boolean", flag: "--case-sensitive", help: "Force case-sensitive matching." },
      { key: "fullPath", label: "--full-path", kind: "boolean", flag: "--full-path", help: "Match against full path instead of only file name." },
      { key: "absolutePath", label: "--absolute-path", kind: "boolean", flag: "--absolute-path", help: "Print absolute paths." },
      { key: "stripCwd", label: "--strip-cwd-prefix", kind: "boolean", flag: "--strip-cwd-prefix", defaultValue: true, help: "Print cleaner relative names without ./ prefix." },
    ],
  },
  {
    id: "find",
    label: "find",
    summary: "Portable POSIX file search by name, type, time, size, and exec actions.",
    docs: "https://man7.org/linux/man-pages/man1/find.1.html",
    repo: "https://git.savannah.gnu.org/cgit/findutils.git",
    options: [
      { key: "path", label: "Path", kind: "text", defaultValue: ".", help: "Directory to search from." },
      { key: "name", label: "-name", kind: "text", placeholder: "e.g. *.log", help: "Shell pattern for file names." },
      { key: "type", label: "-type", kind: "select", defaultValue: "", help: "Restrict results by file type.", choices: [
        { value: "", label: "Any" }, { value: "f", label: "File" }, { value: "d", label: "Directory" }, { value: "l", label: "Symlink" },
      ] },
      { key: "maxDepth", label: "-maxdepth", kind: "number", placeholder: "e.g. 2", help: "Limit recursion depth. GNU/BSD find support varies for this option.", osCompat: ["linux"] },
      { key: "mtime", label: "-mtime", kind: "text", placeholder: "e.g. -7", help: "Filter by modification days. Example: -7 means newer than 7 days." },
      { key: "size", label: "-size", kind: "text", placeholder: "e.g. +10M", help: "Filter by size. Example: +10M means larger than 10 MB." },
      { key: "exec", label: "-exec", kind: "text", placeholder: "e.g. rm {} \\;", help: "Run a command for each result. Use {} for the matched path." },
      { key: "print0", label: "-print0", kind: "boolean", help: "Separate paths with NUL for safe piping into xargs -0." },
    ],
  },
  {
    id: "grep",
    label: "grep",
    summary: "Classic text search, useful for portable scripts and simple pipelines.",
    docs: "https://www.gnu.org/software/grep/manual/grep.html",
    repo: "https://git.savannah.gnu.org/cgit/grep.git",
    options: [
      { key: "pattern", label: "Pattern", kind: "text", defaultValue: "TODO", help: "Pattern to search for." },
      { key: "path", label: "Path", kind: "text", defaultValue: ".", help: "File or directory to search." },
      { key: "recursive", label: "--recursive", kind: "boolean", flag: "--recursive", defaultValue: true, help: "Recurse into directories." },
      { key: "ignoreCase", label: "--ignore-case", kind: "boolean", flag: "--ignore-case", help: "Case-insensitive search." },
      { key: "extended", label: "--extended-regexp", kind: "boolean", flag: "--extended-regexp", help: "Use extended regular expressions." },
      { key: "fixed", label: "--fixed-strings", kind: "boolean", flag: "--fixed-strings", help: "Treat pattern as a literal string." },
      { key: "lineNumber", label: "--line-number", kind: "boolean", flag: "--line-number", defaultValue: true, help: "Show line numbers." },
      { key: "filesWithMatches", label: "--files-with-matches", kind: "boolean", flag: "--files-with-matches", help: "Print only matching file names." },
      { key: "invert", label: "--invert-match", kind: "boolean", flag: "--invert-match", help: "Select non-matching lines." },
      { key: "context", label: "--context", kind: "number", placeholder: "2", help: "Show N lines of surrounding context." },
    ],
  },
  {
    id: "xargs",
    label: "xargs",
    summary: "Turn stdin items into command arguments for batch processing.",
    docs: "https://www.gnu.org/software/findutils/manual/html_node/find_html/xargs-options.html",
    repo: "https://git.savannah.gnu.org/cgit/findutils.git",
    options: [
      { key: "command", label: "Command", kind: "text", defaultValue: "echo", help: "Command to run with arguments read from stdin." },
      { key: "maxArgs", label: "--max-args", kind: "number", defaultValue: "1", help: "Use at most N input items per command invocation." },
      { key: "replace", label: "-I", kind: "text", defaultValue: "{}", help: "Replace token inside the command template." },
      { key: "parallel", label: "--max-procs", kind: "number", defaultValue: "4", help: "Run up to N commands in parallel." },
      { key: "null", label: "--null", kind: "boolean", flag: "--null", defaultValue: true, help: "Read NUL-separated input, commonly from find -print0 or fd -0." },
      { key: "verbose", label: "--verbose", kind: "boolean", flag: "--verbose", help: "Print each command before executing it." },
      { key: "noRunIfEmpty", label: "--no-run-if-empty", kind: "boolean", flag: "--no-run-if-empty", defaultValue: true, help: "Do not run the command if stdin is empty. GNU xargs.", osCompat: ["linux"] },
    ],
  },
  {
    id: "kubectl",
    label: "kubectl",
    summary: "Kubernetes cluster manager and command-line tool.",
    docs: "https://kubernetes.io/docs/reference/kubectl/",
    repo: "https://github.com/kubernetes/kubectl",
    options: [
      { key: "subcommand", label: "Subcommand", kind: "select", defaultValue: "get", help: "The action to perform.", choices: [
        "get", "describe", "create", "apply", "delete", "logs", "exec", "port-forward", "edit"
      ].map((value) => ({ value, label: value })) },
      { key: "resource", label: "Resource type", kind: "select", defaultValue: "pods", help: "The Kubernetes resource type.", choices: [
        { value: "", label: "None" }, "pods", "deployments", "services", "ingress", "nodes", "namespaces", "configmaps", "secrets", "all"
      ].map((value) => typeof value === "string" ? { value, label: value } : value), visibleIf: { key: "subcommand", values: ["get", "describe", "delete", "edit", "port-forward"] } },
      { key: "name", label: "Resource name", kind: "text", placeholder: "e.g. my-pod", help: "Specific name of the resource.", visibleIf: { key: "subcommand", values: ["get", "describe", "delete", "logs", "exec", "port-forward", "edit"] } },
      { key: "namespace", label: "Namespace (-n)", kind: "text", placeholder: "e.g. kube-system", help: "If present, the namespace scope for this CLI request." },
      { key: "allNamespaces", label: "All namespaces (-A)", kind: "boolean", flag: "-A", help: "If present, list the requested object(s) across all namespaces.", visibleIf: { key: "subcommand", values: ["get", "describe"] } },
      { key: "file", label: "File (-f)", kind: "text", placeholder: "e.g. deployment.yaml", help: "Filename, directory, or URL to files.", visibleIf: { key: "subcommand", values: ["apply", "create", "delete", "replace"] } },
      { key: "output", label: "Output format (-o)", kind: "select", defaultValue: "", help: "Output format.", choices: [
        { value: "", label: "Default" }, { value: "wide", label: "wide" }, { value: "yaml", label: "yaml" }, { value: "json", label: "json" }
      ], visibleIf: { key: "subcommand", values: ["get", "describe"] } },
      { key: "container", label: "Container (-c)", kind: "text", placeholder: "e.g. my-container", help: "Print the logs of this container or execute in this container.", visibleIf: { key: "subcommand", values: ["logs", "exec"] } },
      { key: "follow", label: "Follow logs (-f)", kind: "boolean", flag: "-f", help: "Specify if the logs should be streamed.", visibleIf: { key: "subcommand", values: ["logs"] } },
      { key: "it", label: "Interactive (-it)", kind: "boolean", flag: "-it", help: "Pass an stdin to the container and TTY.", visibleIf: { key: "subcommand", values: ["exec"] } },
      { key: "command", label: "Command", kind: "text", placeholder: "e.g. sh", help: "Command to execute (e.g. for exec) or ports (e.g. for port-forward).", visibleIf: { key: "subcommand", values: ["exec", "port-forward"] } },
    ],
  },
  {
    id: "curl",
    label: "curl",
    summary: "HTTP request builder with equivalent wget and Python requests output.",
    docs: "https://curl.se/docs/manpage.html",
    repo: "https://github.com/curl/curl",
    options: [],
  },
  {
    id: "wget",
    label: "wget",
    summary: "HTTP download/request builder with curl and Python requests equivalents.",
    docs: "https://www.gnu.org/software/wget/manual/wget.html",
    repo: "https://git.savannah.gnu.org/cgit/wget.git",
    options: [],
  },
  {
    id: "requests",
    label: "python requests",
    summary: "Python requests snippet with curl and wget equivalents.",
    docs: "https://requests.readthedocs.io/en/latest/",
    repo: "https://github.com/psf/requests",
    options: [],
  },
];

function cliDefaults(def: CliCommandDef) {
  return Object.fromEntries(def.options.map((option) => [option.key, option.defaultValue ?? (option.kind === "boolean" ? false : "")])) as Record<string, string | boolean>;
}

export function isOptionActive(option: CliOption | undefined, options: Record<string, string | boolean>, osMode: "linux" | "macos") {
  if (!option) return false;
  if (option.osCompat && !option.osCompat.includes(osMode)) return false;
  if (option.visibleIf) {
    if (!option.visibleIf.values.includes(options[option.visibleIf.key])) return false;
  }
  return true;
}

function pushBooleanFlags(args: string[], def: CliCommandDef, options: Record<string, string | boolean>, osMode: "linux" | "macos") {
  def.options.forEach((option) => {
    if (!isOptionActive(option, options, osMode)) return;
    if (option.kind === "boolean" && option.flag && Boolean(options[option.key])) args.push(option.flag);
  });
}

function joinCommand(args: string[]) {
  return args.filter(Boolean).join(" ");
}

function buildGenericCliCommand(def: CliCommandDef, options: Record<string, string | boolean>, osMode: "linux" | "macos") {
  const val = (_opts: any, key: string) => {
    const option = def.options.find((o) => o.key === key);
    if (!isOptionActive(option, options, osMode)) return "";
    return String(options[key] ?? "").trim();
  };
  const boolVal = (_opts: any, key: string) => {
    const option = def.options.find((o) => o.key === key);
    if (!isOptionActive(option, options, osMode)) return false;
    return Boolean(options[key]);
  };
  switch (def.id) {
    case "git": {
      const subcommand = val(options, "subcommand") || "status";
      const args = ["git", subcommand];
      if (subcommand === "commit") {
        if (boolVal(options, "all")) args.push("-a");
        if (boolVal(options, "patch")) args.push("--patch");
        if (val(options, "message")) args.push("-m", shellQuote(val(options, "message")));
      } else if (subcommand === "log") {
        if (boolVal(options, "oneline")) args.push("--oneline");
        if (boolVal(options, "stat")) args.push("--stat");
        if (boolVal(options, "all")) args.push("--all");
        if (val(options, "target")) args.push("--", shellQuote(val(options, "target")));
      } else if (subcommand === "grep") {
        if (boolVal(options, "all")) args.push("--all-match");
        if (val(options, "pattern")) args.push(shellQuote(val(options, "pattern")));
        if (val(options, "target")) args.push("--", shellQuote(val(options, "target")));
      } else if (subcommand === "switch") {
        if (boolVal(options, "create")) args.push("-c");
        if (val(options, "target")) args.push(shellQuote(val(options, "target")));
      } else if (subcommand === "checkout") {
        if (boolVal(options, "create")) args.push("-b");
        if (boolVal(options, "patch")) args.push("--patch");
        if (val(options, "target")) args.push(shellQuote(val(options, "target")));
      } else if (subcommand === "branch") {
        if (boolVal(options, "all")) args.push("--all");
        if (boolVal(options, "verbose")) args.push("--verbose");
        if (val(options, "target")) args.push(shellQuote(val(options, "target")));
      } else {
        if (boolVal(options, "patch") && subcommand === "add") args.push("--patch");
        if (boolVal(options, "stat") && subcommand === "diff") args.push("--stat");
        if (boolVal(options, "verbose")) args.push("--verbose");
        if (val(options, "target")) args.push(shellQuote(val(options, "target")));
      }
      return joinCommand(args);
    }
    case "rg": {
      const args = ["rg"];
      pushBooleanFlags(args, def, options, osMode);
      if (val(options, "type")) args.push("--type", shellQuote(val(options, "type")));
      if (val(options, "glob")) args.push("--glob", shellQuote(val(options, "glob")));
      if (val(options, "context")) args.push("--context", val(options, "context"));
      args.push(shellQuote(val(options, "pattern") || "PATTERN"));
      if (val(options, "path")) args.push(shellQuote(val(options, "path")));
      return joinCommand(args);
    }
    case "fd": {
      const args = ["fd"];
      pushBooleanFlags(args, def, options, osMode);
      if (val(options, "type")) args.push("--type", val(options, "type"));
      if (val(options, "extension")) args.push("--extension", shellQuote(val(options, "extension")));
      if (val(options, "exclude")) args.push("--exclude", shellQuote(val(options, "exclude")));
      if (val(options, "maxDepth")) args.push("--max-depth", val(options, "maxDepth"));
      if (val(options, "exec")) args.push("--exec", val(options, "exec"));
      args.push(shellQuote(val(options, "pattern") || "."));
      if (val(options, "path")) args.push(shellQuote(val(options, "path")));
      return joinCommand(args);
    }
    case "find": {
      const args = ["find", shellQuote(val(options, "path") || ".")];
      if (val(options, "maxDepth")) args.push("-maxdepth", val(options, "maxDepth"));
      if (val(options, "type")) args.push("-type", val(options, "type"));
      if (val(options, "name")) args.push("-name", shellQuote(val(options, "name")));
      if (val(options, "mtime")) args.push("-mtime", val(options, "mtime"));
      if (val(options, "size")) args.push("-size", val(options, "size"));
      if (val(options, "exec")) args.push("-exec", val(options, "exec"));
      if (boolVal(options, "print0")) args.push("-print0");
      return joinCommand(args);
    }
    case "grep": {
      const args = ["grep"];
      pushBooleanFlags(args, def, options, osMode);
      if (val(options, "context")) args.push("--context", val(options, "context"));
      args.push(shellQuote(val(options, "pattern") || "PATTERN"));
      if (val(options, "path")) args.push(shellQuote(val(options, "path")));
      return joinCommand(args);
    }
    case "xargs": {
      const args = ["xargs"];
      pushBooleanFlags(args, def, options, osMode);
      if (val(options, "maxArgs")) args.push("--max-args", val(options, "maxArgs"));
      if (val(options, "parallel")) args.push("--max-procs", val(options, "parallel"));
      if (val(options, "replace")) args.push("-I", shellQuote(val(options, "replace")));
      if (val(options, "command")) args.push(val(options, "command"));
      return joinCommand(args);
    }
    case "kubectl": {
      const subcommand = val(options, "subcommand") || "get";
      const args = ["kubectl", subcommand];
      
      const isFileCommand = subcommand === "apply" || subcommand === "create" || subcommand === "replace";
      const isLogs = subcommand === "logs";
      const isExec = subcommand === "exec";
      
      if (val(options, "namespace")) args.push("-n", shellQuote(val(options, "namespace")));
      if (boolVal(options, "allNamespaces") && !isFileCommand) args.push("-A");

      if (isFileCommand) {
        if (val(options, "file")) args.push("-f", shellQuote(val(options, "file")));
      } else {
        if (isExec && boolVal(options, "it")) args.push("-it");
        if (isLogs && boolVal(options, "follow")) args.push("-f");
        
        if (val(options, "resource") && subcommand !== "logs" && subcommand !== "exec" && subcommand !== "port-forward") {
           args.push(val(options, "resource"));
        }
        
        if (val(options, "name")) {
           if ((isLogs || isExec || subcommand === "port-forward") && val(options, "resource") && val(options, "resource") !== "pods") {
             args.push(`${val(options, "resource")}/${shellQuote(val(options, "name"))}`);
           } else {
             args.push(shellQuote(val(options, "name")));
           }
        }
        
        if (val(options, "container")) args.push("-c", shellQuote(val(options, "container")));
        if (val(options, "output") && (subcommand === "get" || subcommand === "describe")) args.push("-o", val(options, "output"));
        if (val(options, "command") && (isExec || subcommand === "port-forward")) {
          if (isExec) args.push("--");
          args.push(val(options, "command"));
        }
      }
      return joinCommand(args);
    }
    default:
      return "";
  }
}

function parseHeaders(input: string) {
  return input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const index = line.indexOf(":");
    return index === -1 ? [line, ""] : [line.slice(0, index).trim(), line.slice(index + 1).trim()];
  });
}

function buildHttpCommands(request: {
  method: string;
  url: string;
  headers: { id: string; name: string; value: string }[];
  body: string;
  auth: string;
  timeout: string;
  output: string;
  follow: boolean;
  insecure: boolean;
  compressed: boolean;
}) {
  const method = request.method || "GET";
  const url = request.url.trim() || "https://api.example.com/users";
  const headers = request.headers
    .map((h) => [h.name.trim(), h.value.trim()])
    .filter(([name, value]) => name || value);
  const curl = ["curl", "-X", method, shellQuote(url)];
  headers.forEach(([name, value]) => curl.push("-H", shellQuote(`${name}: ${value}`)));
  if (request.body.trim()) curl.push("--data-raw", shellQuote(request.body.trim()));
  if (request.auth.trim()) curl.push("-u", shellQuote(request.auth.trim()));
  if (request.timeout.trim()) curl.push("--max-time", request.timeout.trim());
  if (request.output.trim()) curl.push("--output", shellQuote(request.output.trim()));
  if (request.follow) curl.push("--location");
  if (request.insecure) curl.push("--insecure");
  if (request.compressed) curl.push("--compressed");

  const wget = ["wget", "--method", method, shellQuote(url)];
  headers.forEach(([name, value]) => wget.push("--header", shellQuote(`${name}: ${value}`)));
  if (request.body.trim()) wget.push("--body-data", shellQuote(request.body.trim()));
  if (request.auth.trim()) {
    const [user, pass = ""] = request.auth.split(":");
    wget.push("--user", shellQuote(user), "--password", shellQuote(pass));
  }
  if (request.timeout.trim()) wget.push("--timeout", request.timeout.trim());
  if (request.output.trim()) wget.push("-O", shellQuote(request.output.trim()));
  if (request.follow) wget.push("--max-redirect=20");
  if (request.insecure) wget.push("--no-check-certificate");

  const headerObject = headers.length
    ? `headers={\n${headers.map(([name, value]) => `    ${JSON.stringify(name)}: ${JSON.stringify(value)},`).join("\n")}\n}`
    : "headers={}";
  const [authUser, authPass = ""] = request.auth.split(":");
  const requestArgs = [
    `method=${JSON.stringify(method)}`,
    `url=${JSON.stringify(url)}`,
    "headers=headers",
    request.body.trim() ? `data=${JSON.stringify(request.body.trim())}` : "",
    request.auth.trim() ? `auth=(${JSON.stringify(authUser)}, ${JSON.stringify(authPass)})` : "",
    request.timeout.trim() ? `timeout=${request.timeout.trim()}` : "",
    request.insecure ? "verify=False" : "",
    request.follow ? "allow_redirects=True" : "allow_redirects=False",
  ].filter(Boolean);
  const requestsCode = [
    "import requests",
    "",
    headerObject,
    "",
    `response = requests.request(${requestArgs.join(", ")})`,
    "print(response.status_code)",
    "print(response.text)",
  ].join("\n");

  return {
    curl: joinCommand(curl),
    wget: joinCommand(wget),
    requests: requestsCode,
  };
}

function CliBuilderTool() {
  const [httpRequest, setHttpRequest] = useState({
    method: "GET",
    url: "https://api.example.com/users",
    headers: [{ id: Math.random().toString(), name: "Accept", value: "application/json" }],
    body: "",
    auth: "",
    timeout: "30",
    output: "",
    follow: true,
    insecure: false,
    compressed: true,
  });

  const httpCommands = useMemo(() => buildHttpCommands(httpRequest), [httpRequest]);

  return (
    <div className="stacked-tool cli-builder">
      <div className="tool-grid two">
        <div className="options-block">
          <div className="field-header">
            <span>HTTP request</span>
          </div>
          <div className="options-container cli-options-container">
            <div className="options-row">
              <label className="field">
                <span>Method</span>
                <Select
                  className="ant-control"
                  size="large"
                  value={httpRequest.method}
                  onChange={(method) => setHttpRequest({ ...httpRequest, method })}
                  options={["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map((method) => ({ value: method, label: method }))}
                />
              </label>
              <label className="field wide-field">
                <span>URL</span>
                <input value={httpRequest.url} onChange={(event) => setHttpRequest({ ...httpRequest, url: event.target.value })} />
              </label>
            </div>
            <div className="field">
              <span>Headers</span>
              <div className="header-rows" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {httpRequest.headers.map((header, index) => (
                  <div key={header.id} className="header-row" style={{ display: "flex", gap: "8px" }}>
                    <Select
                      className="ant-control"
                      style={{ flex: 1 }}
                      showSearch
                      allowClear
                      popupMatchSelectWidth={false}
                      placeholder="Name (e.g. Authorization)"
                      value={header.name || undefined}
                      onChange={(value) => {
                        const newHeaders = [...httpRequest.headers];
                        newHeaders[index].name = value ?? "";
                        setHttpRequest({ ...httpRequest, headers: newHeaders });
                      }}
                      onSearch={(value) => {
                        const newHeaders = [...httpRequest.headers];
                        newHeaders[index].name = value;
                        setHttpRequest({ ...httpRequest, headers: newHeaders });
                      }}
                      options={[
                        { value: "Accept", label: "Accept" },
                        { value: "Authorization", label: "Authorization" },
                        { value: "Content-Type", label: "Content-Type" },
                        { value: "Cache-Control", label: "Cache-Control" },
                        { value: "User-Agent", label: "User-Agent" },
                        { value: "Proxy-Authorization", label: "Proxy-Authorization" },
                        { value: "X-Requested-With", label: "X-Requested-With" },
                        { value: "Origin", label: "Origin" },
                        { value: "Referer", label: "Referer" }
                      ]}
                    />
                    <input
                      style={{ flex: 2 }}
                      value={header.value}
                      onChange={(event) => {
                        const newHeaders = [...httpRequest.headers];
                        newHeaders[index].value = event.target.value;
                        setHttpRequest({ ...httpRequest, headers: newHeaders });
                      }}
                      placeholder="Value (e.g. Bearer <token>)"
                    />
                    <button
                      className="secondary-action"
                      style={{ padding: "0 12px" }}
                      onClick={() => {
                        const newHeaders = httpRequest.headers.filter((_, i) => i !== index);
                        setHttpRequest({ ...httpRequest, headers: newHeaders });
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  className="secondary-action"
                  style={{ alignSelf: "flex-start" }}
                  onClick={() => {
                    setHttpRequest({
                      ...httpRequest,
                      headers: [...httpRequest.headers, { id: Math.random().toString(), name: "", value: "" }]
                    });
                  }}
                >
                  <Plus size={16} /> Add Header
                </button>
              </div>
            </div>
            <label className="field">
              <span>Body</span>
              <textarea className="compact-textarea" value={httpRequest.body} onChange={(event) => setHttpRequest({ ...httpRequest, body: event.target.value })} placeholder='{"name":"DevUtils"}' spellCheck={false} />
            </label>
            <div className="options-row">
              <label className="field">
                <span>Basic auth</span>
                <input value={httpRequest.auth} onChange={(event) => setHttpRequest({ ...httpRequest, auth: event.target.value })} placeholder="user:password" />
              </label>
              <label className="field">
                <span>Timeout seconds</span>
                <input value={httpRequest.timeout} onChange={(event) => setHttpRequest({ ...httpRequest, timeout: event.target.value })} placeholder="30" />
              </label>
              <label className="field">
                <span>Output file</span>
                <input value={httpRequest.output} onChange={(event) => setHttpRequest({ ...httpRequest, output: event.target.value })} placeholder="response.json" />
              </label>
            </div>
            <div className="checkbox-group">
              <label className="checkbox-field"><input type="checkbox" checked={httpRequest.follow} onChange={(event) => setHttpRequest({ ...httpRequest, follow: event.target.checked })} /> <span>Follow redirects</span></label>
              <label className="checkbox-field"><input type="checkbox" checked={httpRequest.insecure} onChange={(event) => setHttpRequest({ ...httpRequest, insecure: event.target.checked })} /> <span>Skip TLS verification</span></label>
              <label className="checkbox-field"><input type="checkbox" checked={httpRequest.compressed} onChange={(event) => setHttpRequest({ ...httpRequest, compressed: event.target.checked })} /> <span>Request compressed response</span></label>
            </div>
          </div>
        </div>
        <div className="preview-stack">
            <Output label="cURL" result={{ ok: true, value: httpCommands.curl }} />
            <Output label="Wget" result={{ ok: true, value: httpCommands.wget }} />
            <Output label="Python requests" result={{ ok: true, value: httpCommands.requests }} />
        </div>
      </div>
    </div>
  );
}

function CliOptionControl({ option, value, onChange }: { option: CliOption; value: string | boolean; onChange: (value: string | boolean) => void }) {
  if (option.kind === "boolean") {
    return (
      <label className="checkbox-field cli-checkbox">
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
        <span>{option.label}</span>
      </label>
    );
  }
  if (option.kind === "select") {
    return (
      <label className="field">
        <span>{option.label}</span>
        <Select
          className="ant-control"
          size="large"
          showSearch
          popupMatchSelectWidth={false}
          value={String(value)}
          onChange={(next) => onChange(String(next))}
          optionFilterProp="label"
          options={option.choices ?? []}
        />
      </label>
    );
  }
  if (option.kind === "textarea") {
    return (
      <label className="field">
        <span>{option.label}</span>
        <textarea className="compact-textarea" value={String(value)} onChange={(event) => onChange(event.target.value)} placeholder={option.placeholder} spellCheck={false} />
      </label>
    );
  }
  return (
    <label className="field">
      <span>{option.label}</span>
      <input
        type={option.kind === "number" ? "number" : "text"}
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
        placeholder={option.placeholder}
      />
    </label>
  );
}

function SshKeyTool() {
  const [algorithm, setAlgorithm] = useState<"ed25519" | "rsa">("ed25519");
  const [bits, setBits] = useState<number>(3072);
  const [comment, setComment] = useState<string>("hello.world@gmail.com");
  const [passphrase, setPassphrase] = useState<string>("");
  const [generating, setGenerating] = useState<boolean>(false);
  const [keys, setKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setGenerating(true);
    setError(null);
    setTimeout(async () => {
      try {
        const result = await generateSshKeyPair({
          algorithm,
          bits,
          comment,
          passphrase,
        });
        if (result.ok) {
          setKeys(result.value);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate keys.");
      } finally {
        setGenerating(false);
      }
    }, 50);
  };

  const privFilename = algorithm === "ed25519" ? "id_ed25519" : "id_rsa";
  const pubFilename = algorithm === "ed25519" ? "id_ed25519.pub" : "id_rsa.pub";
  const sshKeygenCommand = [
    "ssh-keygen",
    "-t",
    algorithm,
    ...(algorithm === "rsa" ? ["-b", String(bits)] : []),
    "-C",
    shellQuote(comment),
    "-f",
    `~/.ssh/${privFilename}`,
    "-N",
    shellQuote(passphrase),
  ].join(" ");

  return (
    <div className="tool-grid two ssh-key-layout">
      <div className="options-block">
        <div className="field-header">
          <span>Configuration</span>
        </div>
        <div className="options-container">
          <label className="field">
            <span>Algorithm</span>
            <Segmented
              className="ant-control compact-segmented"
              block
              size="large"
              value={algorithm}
              onChange={(value) => setAlgorithm(value as "ed25519" | "rsa")}
              options={[
                { value: "ed25519", label: "Ed25519 (Recommended)" },
                { value: "rsa", label: "RSA" },
              ]}
            />
          </label>

          {algorithm === "rsa" && (
            <label className="field">
              <span>Key Length (Bits)</span>
              <Select
                className="ant-control"
                size="large"
                value={bits}
                onChange={setBits}
                options={[
                  { value: 2048, label: "2048 bits" },
                  { value: 3072, label: "3072 bits (Standard)" },
                  { value: 4096, label: "4096 bits (Secure)" },
                ]}
              />
            </label>
          )}

          <label className="field">
            <span>Comment (e.g., Email)</span>
            <input
              type="text"
              className="wide-input"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. user@example.com"
            />
          </label>

          <label className="field">
            <span>Passphrase (Optional)</span>
            <input
              type="password"
              className="wide-input"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Leave empty for no passphrase"
            />
          </label>

          {algorithm === "ed25519" && passphrase && (
            <div className="notice" style={{ marginTop: "12px" }}>
              <strong>Notice</strong>
              <p>Passphrase encryption is currently supported for RSA keys. Ed25519 keys will be generated unencrypted.</p>
            </div>
          )}

          <button
            className="primary-action ssh-generate-action"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "Generating Key Pair..." : "Generate SSH Key Pair"}
          </button>
        </div>
      </div>

      <div className="ssh-output-column">
        <div className="cli-hint">
          <div className="output-bar">
            <span>ssh-keygen</span>
            <CopyButton value={sshKeygenCommand} />
          </div>
          <pre>{sshKeygenCommand}</pre>
        </div>

        {error && (
          <div className="error" style={{ minHeight: "auto" }}>
            {error}
          </div>
        )}

        <div className="output-block" style={{ minHeight: "auto" }}>
          <div className="output-bar">
            <span>Public Key ({pubFilename})</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <CopyButton value={keys ? keys.publicKey : ""} />
              <button
                className="icon-button"
                onClick={() => keys && downloadFile(keys.publicKey, pubFilename)}
                disabled={!keys}
                title="Download Public Key"
              >
                <Download size={16} />
              </button>
            </div>
          </div>
          <pre style={{ minHeight: "80px", maxHeight: "160px", padding: "14px 20px" }}>
            {keys ? keys.publicKey : "Click Generate to generate public key."}
          </pre>
        </div>

        <div className="output-block" style={{ minHeight: "auto" }}>
          <div className="output-bar">
            <span>Private Key ({privFilename})</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <CopyButton value={keys ? keys.privateKey : ""} />
              <button
                className="icon-button"
                onClick={() => keys && downloadFile(keys.privateKey, privFilename)}
                disabled={!keys}
                title="Download Private Key"
              >
                <Download size={16} />
              </button>
            </div>
          </div>
          <pre style={{ minHeight: "260px", maxHeight: "400px", padding: "14px 20px" }}>
            {keys ? keys.privateKey : "Click Generate to generate private key."}
          </pre>
        </div>

        {keys && (
          <div className="privacy-strip" style={{ margin: "0" }}>
            <Check size={18} />
            <span>
              Keys are generated fully locally in your browser. No private keys or comments are ever sent to a server.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function AsyncButtonTool({ label, run }: { label: string; run: () => Promise<Result<string>> }) {
  const [result, setResult] = useState<Result<string>>({ ok: true, value: "" });
  return (
    <div className="tool-grid two">
      <div className="options-block">
        <div className="field-header">
          <span>Actions</span>
        </div>
        <div className="options-container">
          <button className="primary-action" onClick={() => run().then(setResult)}>{label}</button>
          {result.ok && result.warning && <div className="notice">{result.warning}</div>}
        </div>
      </div>
      <Output result={result} />
    </div>
  );
}

function DnsTool() {
  const [name, setName] = useState("example.com");
  const [type, setType] = useState("A");
  const [result, setResult] = useState<Result<string>>({ ok: true, value: "" });
  return (
    <div className="tool-grid two">
      <div className="options-block">
        <div className="field-header">
          <span>Configuration</span>
        </div>
        <div className="options-container">
          <label className="field">
            <span>Hostname</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span>Record Type</span>
            <Select
              className="ant-control"
              size="large"
              value={type}
              onChange={setType}
              options={dnsRecordOptions}
            />
          </label>
          <button className="primary-action" onClick={() => dnsLookup(name, type).then(setResult).catch((error) => setResult({ ok: false, error: String(error) }))}>Lookup with Cloudflare DoH</button>
        </div>
      </div>
      <Output result={result} />
    </div>
  );
}

function QrTool() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("https://github.com/chunyang-wen/sword");
  const [dataUrl, setDataUrl] = useState("");
  const [decoded, setDecoded] = useState("");
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (input) {
      QRCode.toDataURL(input, { margin: 1, width: 280 }).then(setDataUrl);
    } else {
      setDataUrl("");
    }
  }, [input]);

  async function decodeFile(file: File) {
    setFileName(file.name);
    const image = new Image();
    image.src = URL.createObjectURL(file);
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height);
    setDecoded(jsQR(data.data, data.width, data.height)?.data || "No QR code found.");
  }

  return (
    <>
      <div className="segmented wide qr-mode-toggle">
        <button className={mode === "encode" ? "selected" : ""} onClick={() => setMode("encode")}>Generate</button>
        <button className={mode === "decode" ? "selected" : ""} onClick={() => setMode("decode")}>Scan</button>
      </div>
      
      {mode === "encode" ? (
        <div className="tool-grid two">
          <TextArea label="Text to Encode" value={input} setValue={setInput} placeholder="Enter text or URL to generate QR code..." />
          <div className="output-block">
            <div className="output-bar">
              <span>QR Code Output</span>
              {dataUrl && (
                <a className="icon-button" href={dataUrl} download="qr-code.png" title="Download QR Code">
                  <Download size={16} />
                </a>
              )}
            </div>
            <div className="qr-image-display">
              {dataUrl ? (
                <img className="qr-preview-main" src={dataUrl} alt="Generated QR code" />
              ) : (
                <span className="qr-placeholder-text">Enter text to generate preview</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="tool-grid two">
          <div className="field">
            <div className="field-header">
              <span>QR Code Image</span>
            </div>
            <div className="qr-upload-zone">
              <input
                type="file"
                id="qr-file-input"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && decodeFile(e.target.files[0])}
                style={{ display: "none" }}
              />
              <label htmlFor="qr-file-input" className="qr-upload-label">
                <Upload size={38} className="upload-icon" />
                <strong>Upload QR Code Image</strong>
                <span>Drag and drop or click to browse</span>
                {fileName && <em className="file-name-tag">{fileName}</em>}
              </label>
            </div>
          </div>
          <Output result={{ ok: true, value: decoded }} />
        </div>
      )}
    </>
  );
}

function HttpStatusTool() {
  const [query, setQuery] = useState("");
  const rows = httpStatuses.filter(([code, title]) => `${code} ${title}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div>
      <div className="search-box-wide">
        <Search size={18} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter status codes..." />
      </div>
      <div className="status-grid">
        {rows.map(([code, title]) => (
          <div key={code}>
            <strong data-status={code}>{code}</strong>
            <span>{title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BasicInfoTool() {
  const [ipData, setIpData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);
  const [geoBlocked, setGeoBlocked] = useState(false);

  const fetchIp = async () => {
    setLoading(true);
    setError(null);
    setGeoBlocked(false);
    try {
      const res = await fetch("https://ipapi.co/json/");
      if (!res.ok) throw new Error("ipapi failed");
      const data = await res.json();
      if (data.error) throw new Error(data.reason || "ipapi error");
      setIpData({
        ip: data.ip,
        city: data.city,
        region: data.region,
        country: data.country_name,
        countryCode: data.country_code,
        postal: data.postal,
        lat: data.latitude,
        lon: data.longitude,
        timezone: data.timezone,
        org: data.org,
        asn: data.asn,
      });
    } catch (e) {
      console.warn("ipapi.co failed, trying ipinfo.io...", e);
      try {
        const res = await fetch("https://ipinfo.io/json");
        if (!res.ok) throw new Error("ipinfo failed");
        const data = await res.json();
        const [lat, lon] = (data.loc || "").split(",");
        setIpData({
          ip: data.ip,
          city: data.city,
          region: data.region,
          country: data.country,
          postal: data.postal,
          lat: lat ? parseFloat(lat) : undefined,
          lon: lon ? parseFloat(lon) : undefined,
          timezone: data.timezone,
          org: data.org,
        });
      } catch (e2) {
        console.error("Both IP lookup services failed:", e2);
        try {
          const ipifyRes = await fetch("https://api.ipify.org?format=json");
          if (ipifyRes.ok) {
            const ipifyData = await ipifyRes.json();
            setIpData({
              ip: ipifyData.ip,
              city: "N/A",
              region: "N/A",
              country: "N/A",
              org: "N/A",
            });
            setGeoBlocked(true);
            return;
          }
        } catch (e3) {
          console.error("ipify fallback failed:", e3);
        }
        setError("Failed to fetch IP and location information. Geolocation APIs may be blocked by your adblocker or Brave Shields.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIp();

    if (typeof (navigator as any).getBattery === "function") {
      (navigator as any).getBattery().then((batt: any) => {
        setBattery({
          level: Math.round(batt.level * 100),
          charging: batt.charging
        });
        const updateBattery = () => {
          setBattery({
            level: Math.round(batt.level * 100),
            charging: batt.charging
          });
        };
        batt.addEventListener("levelchange", updateBattery);
        batt.addEventListener("chargingchange", updateBattery);
      });
    }
  }, []);

  const ua = navigator.userAgent;
  const parsedUa = useMemo(() => {
    let browserName = "Unknown Browser";
    let browserVersion = "Unknown";
    let osName = "Unknown OS";
    let osVersion = "Unknown";

    if (/Windows NT 10.0/.test(ua)) { osName = "Windows"; osVersion = "10 / 11"; }
    else if (/Windows NT 6.3/.test(ua)) { osName = "Windows"; osVersion = "8.1"; }
    else if (/Windows NT 6.2/.test(ua)) { osName = "Windows"; osVersion = "8"; }
    else if (/Windows NT 6.1/.test(ua)) { osName = "Windows"; osVersion = "7"; }
    else if (/Macintosh;.*Mac OS X (\d+)[_.](\d+)/.test(ua)) {
      const match = ua.match(/Mac OS X (\d+)[_.](\d+)/);
      osName = "macOS";
      osVersion = match ? `${match[1]}.${match[2]}` : "OS X";
    }
    else if (/iPhone;.*CPU iPhone OS (\d+)[_.](\d+)/.test(ua)) {
      const match = ua.match(/CPU iPhone OS (\d+)[_.](\d+)/);
      osName = "iOS";
      osVersion = match ? `${match[1]}.${match[2]}` : "";
    }
    else if (/iPad;.*CPU OS (\d+)[_.](\d+)/.test(ua)) {
      const match = ua.match(/CPU OS (\d+)[_.](\d+)/);
      osName = "iPadOS";
      osVersion = match ? `${match[1]}.${match[2]}` : "";
    }
    else if (/Android (\d+)/.test(ua)) {
      const match = ua.match(/Android (\d+)/);
      osName = "Android";
      osVersion = match ? match[1] : "";
    }
    else if (/Linux/.test(ua)) { osName = "Linux"; }

    if (/OPR\/(\d+)/.test(ua)) {
      browserName = "Opera";
      browserVersion = ua.match(/OPR\/(\d+)/)?.[1] || "Unknown";
    } else if (/Edg\/(\d+)/.test(ua)) {
      browserName = "Microsoft Edge";
      browserVersion = ua.match(/Edg\/(\d+)/)?.[1] || "Unknown";
    } else if (/Chrome\/(\d+)/.test(ua)) {
      browserName = "Google Chrome";
      browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || "Unknown";
    } else if (/Safari\/(\d+)/.test(ua)) {
      browserName = "Safari";
      browserVersion = ua.match(/Version\/(\d+)/)?.[1] || ua.match(/Safari\/(\d+)/)?.[1] || "Unknown";
    } else if (/Firefox\/(\d+)/.test(ua)) {
      browserName = "Mozilla Firefox";
      browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || "Unknown";
    } else if (/MSIE (\d+)/.test(ua)) {
      browserName = "Internet Explorer";
      browserVersion = ua.match(/MSIE (\d+)/)?.[1] || "Unknown";
    } else if (/Trident.*rv:(\d+)/.test(ua)) {
      browserName = "Internet Explorer";
      browserVersion = ua.match(/rv:(\d+)/)?.[1] || "Unknown";
    }

    return { browserName, browserVersion, osName, osVersion };
  }, [ua]);

  const copyVal = async (key: string, val: string) => {
    await navigator.clipboard.writeText(val);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1200);
  };

  const copyAll = async () => {
    const lines = [
      `=== IP & Location ===`,
      `IP: ${ipData?.ip || "N/A"}`,
      `Location: ${[ipData?.city, ipData?.region, ipData?.country].filter(Boolean).join(", ") || "N/A"}`,
      `ISP/Org: ${ipData?.org || "N/A"}`,
      `Timezone: ${ipData?.timezone || "N/A"}`,
      ``,
      `=== Browser & Client ===`,
      `Browser: ${parsedUa.browserName} v${parsedUa.browserVersion}`,
      `OS: ${parsedUa.osName} ${parsedUa.osVersion}`,
      `Language: ${navigator.language}`,
      `Logical Processors: ${navigator.hardwareConcurrency || "N/A"}`,
      `Device Memory: ${((navigator as any).deviceMemory ? (navigator as any).deviceMemory + " GB" : "N/A")}`,
      `Screen Resolution: ${window.screen.width} x ${window.screen.height}`,
      `Viewport: ${window.innerWidth} x ${window.innerHeight}`,
      `User Agent: ${ua}`,
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopiedKey("all");
    window.setTimeout(() => setCopiedKey(null), 1200);
  };

  const ipRows = [
    { label: "IP Address", value: ipData?.ip || "N/A" },
    { label: "Location", value: [ipData?.city, ipData?.region, ipData?.country].filter(Boolean).join(", ") || "N/A" },
    { label: "ISP / Organization", value: ipData?.org || "N/A" },
    { label: "ASN", value: ipData?.asn || "N/A" },
    { label: "Postal Code", value: ipData?.postal || "N/A" },
    { label: "Coordinates", value: ipData?.lat && ipData?.lon ? `${ipData.lat}, ${ipData.lon}` : "N/A" },
    { label: "Timezone", value: ipData?.timezone || "N/A" },
  ];

  const browserRows = [
    { label: "Browser Name", value: parsedUa.browserName },
    { label: "Browser Version", value: parsedUa.browserVersion },
    { label: "Operating System", value: `${parsedUa.osName} ${parsedUa.osVersion}` },
    { label: "Primary Language", value: navigator.language },
    { label: "Languages Allowed", value: navigator.languages.join(", ") },
    { label: "Cookies Enabled", value: navigator.cookieEnabled ? "Yes" : "No" },
    { label: "Online Status", value: navigator.onLine ? "Online" : "Offline" },
  ];

  const deviceRows = [
    { label: "Screen Resolution", value: `${window.screen.width} x ${window.screen.height}` },
    { label: "Viewport Size", value: `${window.innerWidth} x ${window.innerHeight}` },
    { label: "Device Pixel Ratio", value: `${window.devicePixelRatio}x` },
    { label: "CPU Cores", value: navigator.hardwareConcurrency ? String(navigator.hardwareConcurrency) : "N/A" },
    { label: "Device Memory", value: (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : "N/A" },
    { label: "Battery Status", value: battery ? `${battery.level}% ${battery.charging ? "(Charging)" : "(Discharging)"}` : "N/A" },
    { label: "PDF Support", value: navigator.pdfViewerEnabled ? "Yes" : "No" },
  ];

  return (
    <div className="stacked-tool basic-info-tool">
      <div className="quick-actions-bar">
        <button className="primary-action flush" onClick={fetchIp} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : ""} style={{ marginRight: 6 }} />
          {loading ? "Refreshing..." : "Refresh IP"}
        </button>
        <button className="icon-button" onClick={copyAll} title="Copy all to clipboard" style={{ height: 42, width: 42, borderRadius: 8 }}>
          {copiedKey === "all" ? <Check size={18} /> : <Clipboard size={18} />}
        </button>
      </div>

      <div className="basic-info-hero-grid">
        <div className="info-hero-card">
          <Globe className="card-icon" />
          <span>My IP Address</span>
          <strong>{loading ? "Fetching..." : error ? "N/A" : ipData?.ip || "N/A"}</strong>
          <p>{loading ? "Locating..." : error ? "Error retrieving IP" : ipData?.org || "Local network"}</p>
        </div>
        <div className="info-hero-card">
          <Monitor className="card-icon" />
          <span>Browser & OS</span>
          <strong>{parsedUa.browserName}</strong>
          <p>{parsedUa.osName} {parsedUa.osVersion}</p>
        </div>
        <div className="info-hero-card">
          <Cpu className="card-icon" />
          <span>Screen & Viewport</span>
          <strong>{window.screen.width} x {window.screen.height}</strong>
          <p>Viewport: {window.innerWidth} x {window.innerHeight}</p>
        </div>
        <div className="info-hero-card">
          <Wifi className="card-icon" />
          <span>Connection Status</span>
          <strong>{navigator.onLine ? "Online" : "Offline"}</strong>
          <p>Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {geoBlocked && (
        <div className="notice" style={{ marginTop: 0, marginBottom: 16 }}>
          <strong>Geolocation Blocked by Browser/Adblocker</strong>
          <p>Adblockers or browser shields are blocking the geolocation providers (ipapi.co / ipinfo.io). Your IP was resolved via a basic fallback, but location metadata is unavailable.</p>
        </div>
      )}

      <div className="tool-grid two">
        <div className="options-panel">
          <div className="info-card-header">
            <div className="info-card-title">
              <Globe size={18} />
              <span>IP & Geolocation Info</span>
            </div>
          </div>
          <div className="info-list">
            {ipRows.map((row) => (
              <div className="info-row" key={row.label}>
                <div className="label">{row.label}</div>
                <div className="value" title={row.value}>{row.value}</div>
                <div className="row-action">
                  <button className="icon-button" onClick={() => copyVal(row.label, row.value)} disabled={row.value === "N/A"} title="Copy Value">
                    {copiedKey === row.label ? <Check size={14} /> : <Clipboard size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="options-panel">
          <div className="info-card-header">
            <div className="info-card-title">
              <Monitor size={18} />
              <span>Browser & Environment</span>
            </div>
          </div>
          <div className="info-list">
            {browserRows.map((row) => (
              <div className="info-row" key={row.label}>
                <div className="label">{row.label}</div>
                <div className="value" title={row.value}>{row.value}</div>
                <div className="row-action">
                  <button className="icon-button" onClick={() => copyVal(row.label, row.value)} disabled={row.value === "N/A"} title="Copy Value">
                    {copiedKey === row.label ? <Check size={14} /> : <Clipboard size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="tool-grid two">
        <div className="options-panel">
          <div className="info-card-header">
            <div className="info-card-title">
              <Cpu size={18} />
              <span>Hardware & Device Details</span>
            </div>
          </div>
          <div className="info-list">
            {deviceRows.map((row) => (
              <div className="info-row" key={row.label}>
                <div className="label">{row.label}</div>
                <div className="value" title={row.value}>{row.value}</div>
                <div className="row-action">
                  <button className="icon-button" onClick={() => copyVal(row.label, row.value)} disabled={row.value === "N/A"} title="Copy Value">
                    {copiedKey === row.label ? <Check size={14} /> : <Clipboard size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="options-panel">
          <div className="info-card-header">
            <div className="info-card-title">
              <Monitor size={18} />
              <span>Raw User Agent</span>
            </div>
          </div>
          <div className="ua-container">
            <div className="ua-box">{ua}</div>
            <button className="primary-action" onClick={() => copyVal("ua", ua)}>
              <Clipboard size={16} style={{ marginRight: 6 }} />
              Copy User Agent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IpLookupTool() {
  const [ipInput, setIpInput] = useState("");
  const [ipData, setIpData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [geoBlocked, setGeoBlocked] = useState(false);

  const performLookup = async (targetIp: string) => {
    const trimmed = targetIp.trim();
    setLoading(true);
    setError(null);
    setIpData(null);
    setGeoBlocked(false);
    try {
      const url = trimmed ? `https://ipapi.co/${trimmed}/json/` : "https://ipapi.co/json/";
      const res = await fetch(url);
      if (!res.ok) throw new Error("ipapi failed");
      const data = await res.json();
      if (data.error) throw new Error(data.reason || "ipapi error");
      setIpData({
        ip: data.ip,
        city: data.city,
        region: data.region,
        country: data.country_name,
        countryCode: data.country_code,
        postal: data.postal,
        lat: data.latitude,
        lon: data.longitude,
        timezone: data.timezone,
        org: data.org,
        asn: data.asn,
      });
    } catch (e) {
      console.warn("ipapi.co failed, trying ipinfo.io...", e);
      try {
        const url = trimmed ? `https://ipinfo.io/${trimmed}/json` : "https://ipinfo.io/json";
        const res = await fetch(url);
        if (!res.ok) throw new Error("ipinfo failed");
        const data = await res.json();
        const [lat, lon] = (data.loc || "").split(",");
        setIpData({
          ip: data.ip,
          city: data.city,
          region: data.region,
          country: data.country,
          postal: data.postal,
          lat: lat ? parseFloat(lat) : undefined,
          lon: lon ? parseFloat(lon) : undefined,
          timezone: data.timezone,
          org: data.org,
        });
      } catch (e2) {
        console.error("Both IP lookup services failed:", e2);
        try {
          const ipifyRes = await fetch("https://api.ipify.org?format=json");
          if (ipifyRes.ok) {
            const ipifyData = await ipifyRes.json();
            setIpData({
              ip: ipifyData.ip,
              city: "N/A",
              region: "N/A",
              country: "N/A",
              org: "N/A",
            });
            setGeoBlocked(true);
            return;
          }
        } catch (e3) {
          console.error("ipify fallback failed:", e3);
        }
        setError(trimmed 
          ? "Failed to fetch info for this IP. Check the IP format or internet connection." 
          : "Failed to fetch Geolocation details. Adblockers or privacy shields may be blocking the geolocation APIs (ipapi.co / ipinfo.io)."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performLookup("");
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(ipInput);
  };

  const copyVal = async (key: string, val: string) => {
    await navigator.clipboard.writeText(val);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1200);
  };

  const copyAll = async () => {
    if (!ipData) return;
    const lines = [
      `=== IP Geolocation ===`,
      `IP: ${ipData.ip || "N/A"}`,
      `Location: ${[ipData.city, ipData.region, ipData.country].filter(Boolean).join(", ") || "N/A"}`,
      `ISP/Org: ${ipData.org || "N/A"}`,
      `ASN: ${ipData.asn || "N/A"}`,
      `Postal Code: ${ipData.postal || "N/A"}`,
      `Coordinates: ${ipData.lat && ipData.lon ? `${ipData.lat}, ${ipData.lon}` : "N/A"}`,
      `Timezone: ${ipData.timezone || "N/A"}`,
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopiedKey("all");
    window.setTimeout(() => setCopiedKey(null), 1200);
  };

  const ipRows = ipData ? [
    { label: "IP Address", value: ipData.ip || "N/A" },
    { label: "Location", value: [ipData.city, ipData.region, ipData.country].filter(Boolean).join(", ") || "N/A" },
    { label: "ISP / Organization", value: ipData.org || "N/A" },
    { label: "ASN", value: ipData.asn || "N/A" },
    { label: "Postal Code", value: ipData.postal || "N/A" },
    { label: "Coordinates", value: ipData.lat && ipData.lon ? `${ipData.lat}, ${ipData.lon}` : "N/A" },
    { label: "Timezone", value: ipData.timezone || "N/A" },
  ] : [];

  return (
    <div className="stacked-tool ip-lookup-tool">
      <div className="controls-panel horizontal">
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 12, width: "100%", alignItems: "flex-end" }}>
          <label className="field wide-field" style={{ margin: 0 }}>
            <span>IP Address</span>
            <input
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              placeholder="e.g. 8.8.8.8, 2606:4700:4700::1111, or leave empty for your current IP"
            />
          </label>
          <button type="submit" className="primary-action flush" disabled={loading} style={{ height: 44, margin: 0 }}>
            {loading ? "Searching..." : "Lookup IP"}
          </button>
          {ipData && (
            <button type="button" className="icon-button" onClick={copyAll} title="Copy result to clipboard" style={{ height: 44, width: 44, borderRadius: 8 }}>
              {copiedKey === "all" ? <Check size={18} /> : <Clipboard size={18} />}
            </button>
          )}
        </form>
      </div>

      {error && <div className="error">{error}</div>}

      {geoBlocked && (
        <div className="notice" style={{ marginTop: 0, marginBottom: 16 }}>
          <strong>Geolocation Blocked by Browser/Adblocker</strong>
          <p>Adblockers or browser shields are blocking the geolocation providers (ipapi.co / ipinfo.io). Your IP was resolved via a basic fallback, but location metadata is unavailable.</p>
        </div>
      )}

      {ipData && (
        <div className="tool-grid two">
          <div className="options-panel" style={{ height: "100%" }}>
            <div className="info-card-header">
              <div className="info-card-title">
                <Globe size={18} />
                <span>Geolocation Details</span>
              </div>
            </div>
            <div className="info-list">
              {ipRows.map((row) => (
                <div className="info-row" key={row.label}>
                  <div className="label">{row.label}</div>
                  <div className="value" title={row.value}>{row.value}</div>
                  <div className="row-action">
                    <button className="icon-button" onClick={() => copyVal(row.label, row.value)} disabled={row.value === "N/A"} title="Copy Value">
                      {copiedKey === row.label ? <Check size={14} /> : <Clipboard size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="options-panel" style={{ height: "100%" }}>
            <div className="info-card-header">
              <div className="info-card-title">
                <MapPin size={18} />
                <span>Visual Map Details</span>
              </div>
            </div>
            {ipData.lat && ipData.lon ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%", justifyContent: "center", alignItems: "center", padding: "20px 0" }}>
                <div style={{ fontSize: "0.9rem", color: "var(--muted)", textAlign: "center" }}>
                  Coordinates: <strong>{ipData.lat}, {ipData.lon}</strong>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${ipData.lat},${ipData.lon}`}
                  target="_blank"
                  rel="noreferrer"
                  className="primary-action"
                  style={{ marginTop: 0 }}
                >
                  <MapPin size={16} style={{ marginRight: 6 }} />
                  Open in Google Maps
                </a>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${ipData.lat}&mlon=${ipData.lon}#map=14/${ipData.lat}/${ipData.lon}`}
                  target="_blank"
                  rel="noreferrer"
                  className="primary-action"
                  style={{ marginTop: 0, background: "var(--surface-code)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  Open in OpenStreetMap
                </a>
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
                No coordinates available to generate maps.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CliCheatsheetTool() {
  const [platform, setPlatform] = useState<string>("linux");
  const [command, setCommand] = useState<string>("tar");
  const [inputValue, setInputValue] = useState<string>("tar");
  const [contentHtml, setContentHtml] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [availableCommands, setAvailableCommands] = useState<Record<string, string[]>>({ linux: [], macos: [] });

  useEffect(() => {
    fetch("./cheatsheets/index.json")
      .then(res => res.json())
      .then(data => setAvailableCommands(data))
      .catch(err => console.error("Failed to load cheatsheet index", err));
  }, []);

  const commandOptions = useMemo(() => {
    return (availableCommands[platform] || []).map(cmd => ({ value: cmd }));
  }, [availableCommands, platform]);

  useEffect(() => {
    let canceled = false;
    const fetchIt = async () => {
      if (!command.trim()) {
        setContentHtml("");
        setErrorMsg("");
        return;
      }
      setLoading(true);
      setErrorMsg("");
      const res = await fetchLocalCheatsheet(platform, command);
      if (canceled) return;
      if (res.ok) {
        setContentHtml(formatCheatsheetMarkdown(res.value.content));
      } else {
        setErrorMsg(res.error);
        setContentHtml("");
      }
      setLoading(false);
    };
    const timer = setTimeout(() => {
      fetchIt();
    }, 300);
    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [platform, command]);

  useEffect(() => {
    setInputValue(command);
  }, [command]);

  return (
    <div className="stacked-tool cli-cheatsheet">
      <div className="controls-panel horizontal">
        <label className="field segmented-field">
          <span>Platform</span>
          <Segmented
            className="ant-control compact-segmented"
            block
            size="large"
            value={platform}
            onChange={(value) => setPlatform(String(value))}
            options={[
              { label: "Linux", value: "linux" },
              { label: "MacOS", value: "macos" }
            ]}
          />
        </label>
        <label className="field wide-field">
          <span>Command</span>
          <AutoComplete
            size="large"
            value={inputValue}
            onChange={(val) => setInputValue(val)}
            onSelect={(val) => {
              setCommand(val.trim().toLowerCase());
              setInputValue(val.trim().toLowerCase());
            }}
            onBlur={() => setInputValue(command)}
            options={commandOptions}
            filterOption={(inputValue, option) =>
              String(option?.value).toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
            }
            style={{ width: "100%" }}
          >
            <Input 
              className="ant-control"
              placeholder="e.g. tar, ls, grep"  
              suffix={<ChevronDown size={16} color="var(--muted)" />}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setInputValue(command);
                  e.currentTarget.blur();
                } else if (e.key === "Enter") {
                  setCommand(inputValue.trim().toLowerCase());
                }
              }}
            />
          </AutoComplete>
        </label>
      </div>
      <div className="cheatsheet-content output-block" style={{ padding: "16px" }}>
        {loading ? (
          <div className="notice">Loading...</div>
        ) : errorMsg ? (
          <div className="error">{errorMsg}</div>
        ) : contentHtml ? (
          <div className="markdown-body" dangerouslySetInnerHTML={{ __html: contentHtml }} />
        ) : (
          <div className="notice">Type a command to view its cheatsheet.</div>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
