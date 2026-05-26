import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider, DatePicker, Input, Segmented, Select, TimePicker, theme as antdTheme } from "antd";
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
  Wifi,
  RefreshCw,
} from "lucide-react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import "antd/dist/reset.css";
import "./styles.css";
import { categories, toolById, tools, type ToolCategoryId, type ToolDefinition } from "./tools";
import {
  base64Decode,
  base64Encode,
  certificateInfo,
  convertBase,
  convertUnit,
  dateFields,
  decodeJwt,
  describeCron,
  diffText,
  diffTextChunks,
  type DiffChunk,
  digests,
  dnsLookup,
  formatJson,
  formatXml,
  generateCronExpression,
  httpStatuses,
  jsonToYaml,
  loremIpsum,
  parseUrl,
  password,
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
    case "text-diff": return <TextDiffTool />;
    case "regex-matching": return <RegexTool />;
    case "json-formatter": return <SingleTransform sample='{"hello":"world","items":[1,2]}' transform={formatJson} />;
    case "sql-formatter": return <SingleTransform sample="select id, name from users where active = true order by created_at desc" transform={safeSql} />;
    case "xml-formatter": return <SingleTransform sample={'<root><item id="1">DevUtils</item></root>'} transform={formatXml} />;
    case "cron-job-parser": return <CronTool />;
    case "qr-coder": return <QrTool />;
    case "url-coder": return <EncodeDecodeTool encode={urlEncode} decode={urlDecode} sample="https://example.com/search?q=dev utils" />;
    case "base64-coder": return <EncodeDecodeTool encode={base64Encode} decode={base64Decode} sample="Hello, DevUtils" />;
    case "jwt-decoder": return <SingleTransform sample={jwtSample} transform={decodeJwt} />;
    case "certificate-decoder": return <CertificateTool />;
    case "hash-generator": return <HashTool />;
    case "uuid-generator": return <UuidTool />;
    case "password-generator": return <PasswordTool />;
    case "ssh-key-generator": return <SshKeyTool />;
    case "lorem-ipsum-generator": return <LoremTool />;
    case "dns-lookup": return <DnsTool />;
    case "basic-info": return <BasicInfoTool />;
    case "url-parser-builder": return <SingleTransform sample="https://user:pass@example.com:443/docs?q=dev#top" transform={parseUrl} />;
    case "http-status-codes": return <HttpStatusTool />;
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

  const fetchIp = async () => {
    setLoading(true);
    setError(null);
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
        setError("Failed to fetch IP and location information. Check your internet connection or adblocker.");
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

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
