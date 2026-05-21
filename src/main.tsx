import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Check,
  Clipboard,
  Download,
  Github,
  Moon,
  RotateCcw,
  Search,
  Sun,
  Upload,
} from "lucide-react";
import QRCode from "qrcode";
import jsQR from "jsqr";
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
  digests,
  dnsLookup,
  formatJson,
  formatXml,
  httpStatuses,
  jsonToYaml,
  loremIpsum,
  parseUrl,
  password,
  regexInspect,
  safeSql,
  sshKeyPair,
  textToolkit,
  unitNames,
  urlDecode,
  urlEncode,
  uuidList,
  yamlToJson,
  type UnitCategory,
  type Result,
} from "./utils";

type Theme = "system" | "light" | "dark";

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const onHash = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return hash;
}

function App() {
  const hash = useHashRoute();
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("theme") as Theme) || "system");
  const selectedId = hash.match(/^#\/tools\/([^/]+)/)?.[1] ?? "home";
  const selectedTool = selectedId === "home" ? undefined : toolById.get(selectedId);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

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
    <div className="app-shell">
      <div className="ambient-glow bg-glow-1"></div>
      <div className="ambient-glow bg-glow-2"></div>
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
          <a href="https://github.com/chunyang-wen/DevToys" target="_blank" rel="noreferrer"><Github size={16} /> Source</a>
        </div>
      </aside>
      <main className="workspace">
        {selectedTool ? <ToolPage tool={selectedTool} /> : <HomePage />}
      </main>
    </div>
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
  return (
    <div className="home">
      <div className="hero-panel">
        <h1>Developer tools that stay in your browser.</h1>
        <p>Format payloads, transform text, decode tokens, generate secrets, and inspect web data without sending inputs to an app server.</p>
      </div>
      <div className="privacy-strip">
        <Check size={18} />
        <span>Local-first by default. DNS Lookup is the only ready tool that calls an external API, and it uses explicit DNS-over-HTTPS.</span>
      </div>
      <div className="home-grid">
        {tools.map((tool) => (
          <a href={tool.route} className="tool-card" key={tool.id}>
            <tool.icon size={22} />
            <strong>{tool.title}</strong>
            <span>{tool.subtitle}</span>
          </a>
        ))}
      </div>
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
    case "cron-job-parser": return <SingleTransform sample="*/15 9-17 * * 1-5" transform={describeCron} />;
    case "qr-coder": return <QrTool />;
    case "url-coder": return <EncodeDecodeTool encode={urlEncode} decode={urlDecode} sample="https://example.com/search?q=dev utils" />;
    case "base64-coder": return <EncodeDecodeTool encode={base64Encode} decode={base64Decode} sample="Hello, DevUtils" />;
    case "jwt-decoder": return <SingleTransform sample="" transform={decodeJwt} />;
    case "certificate-decoder": return <SingleTransform sample="" transform={certificateInfo} />;
    case "hash-generator": return <HashTool />;
    case "uuid-generator": return <UuidTool />;
    case "password-generator": return <PasswordTool />;
    case "ssh-key-generator": return <AsyncButtonTool label="Generate ECDSA P-256 key pair" run={sshKeyPair} />;
    case "lorem-ipsum-generator": return <LoremTool />;
    case "dns-lookup": return <DnsTool />;
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

function Output({ result }: { result: Result<string> }) {
  const value = result.ok ? result.value : "";
  return (
    <div className="output-block">
      <div className="output-bar">
        <span>Output</span>
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
  const [input, setInput] = useState(sample);
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const result = mode === "encode" ? { ok: true as const, value: encode(input) } : decode(input);
  return (
    <>
      <div className="segmented wide">
        <button className={mode === "encode" ? "selected" : ""} onClick={() => setMode("encode")}>Encode</button>
        <button className={mode === "decode" ? "selected" : ""} onClick={() => setMode("decode")}>Decode</button>
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
          <label className="field">
            <span>Base</span>
            <select value={base} onChange={(e) => setBase(e.target.value)}>
              <option value="10">Decimal</option>
              <option value="16">Hexadecimal</option>
              <option value="8">Octal</option>
              <option value="2">Binary</option>
            </select>
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
  const [input, setInput] = useState("");
  const result = dateFields(input);
  return <StructuredTool input={input} setInput={setInput} result={result.ok ? { ok: true, value: JSON.stringify(result.value, null, 2) } : result} />;
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
            <select value={category} onChange={(e) => setCategory(e.target.value as UnitCategory)}>
              {["length", "mass", "temperature", "area", "volume"].map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>From</span>
            <select value={from} onChange={(e) => setFrom(e.target.value)}>
              {names.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>To</span>
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              {names.map((name) => <option key={name}>{name}</option>)}
            </select>
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
  const value = textToolkit(input, { source, target, trim, collapse, casing, sort, unique });
  return (
    <div>
      <div className="options-panel horizontal-wrap">
        <div className="options-row">
          <div className="option-item">
            <span className="option-label">Source Delimiter</span>
            <div className="segmented">
              {["comma", "space", "newline"].map((name) => (
                <button key={`s-${name}`} className={source === name ? "selected" : ""} onClick={() => setSource(name)}>from {name}</button>
              ))}
            </div>
          </div>
          <div className="option-item">
            <span className="option-label">Target Delimiter</span>
            <div className="segmented">
              {["comma", "space", "newline"].map((name) => (
                <button key={`t-${name}`} className={target === name ? "selected" : ""} onClick={() => setTarget(name)}>to {name}</button>
              ))}
            </div>
          </div>
          <div className="option-item">
            <span className="option-label">Casing</span>
            <select className="option-select" value={casing} onChange={(e) => setCasing(e.target.value)}>
              <option value="none">Keep case</option>
              <option value="upper">Uppercase</option>
              <option value="lower">Lowercase</option>
            </select>
          </div>
        </div>
        <div className="checkbox-group">
          <label className="checkbox-field"><input type="checkbox" checked={trim} onChange={(e) => setTrim(e.target.checked)} /> <span>Trim punctuation</span></label>
          <label className="checkbox-field"><input type="checkbox" checked={collapse} onChange={(e) => setCollapse(e.target.checked)} /> <span>Collapse punctuation</span></label>
          <label className="checkbox-field"><input type="checkbox" checked={sort} onChange={(e) => setSort(e.target.checked)} /> <span>Sort lines</span></label>
          <label className="checkbox-field"><input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} /> <span>Unique lines</span></label>
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

function TextDiffTool() {
  const [left, setLeft] = useState("DevUtils for macOS");
  const [right, setRight] = useState("DevUtils for Web");
  return <div className="tool-grid three"><TextArea label="Left" value={left} setValue={setLeft} /><TextArea label="Right" value={right} setValue={setRight} /><Output result={{ ok: true, value: diffText(left, right) }} /></div>;
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
      <div>
        <div className="field-header">
          <span>Options</span>
        </div>
        <div className="options-container">
          <label className="field">
            <span>Count</span>
            <input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </label>
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
  const [sets, setSets] = useState({ lower: true, upper: true, digits: true, symbols: true });
  const result = password(length, sets);
  return (
    <div className="tool-grid two">
      <div>
        <div className="field-header">
          <span>Options</span>
        </div>
        <div className="options-container">
          <label className="field">
            <span>Length</span>
            <input type="number" min={4} max={256} value={length} onChange={(e) => setLength(Number(e.target.value))} />
          </label>
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
      <div>
        <div className="field-header">
          <span>Options</span>
        </div>
        <div className="options-container">
          <label className="field">
            <span>Paragraphs</span>
            <input type="number" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </label>
        </div>
      </div>
      <Output result={{ ok: true, value: loremIpsum(count) }} />
    </div>
  );
}

function AsyncButtonTool({ label, run }: { label: string; run: () => Promise<Result<string>> }) {
  const [result, setResult] = useState<Result<string>>({ ok: true, value: "" });
  return (
    <div className="tool-grid two">
      <div>
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
      <div>
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
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA"].map((record) => <option key={record}>{record}</option>)}
            </select>
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
  const [input, setInput] = useState("https://github.com/chunyang-wen/DevToys");
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
      <div className="segmented wide">
        <button className={mode === "encode" ? "selected" : ""} onClick={() => setMode("encode")}>Generate QR</button>
        <button className={mode === "decode" ? "selected" : ""} onClick={() => setMode("decode")}>Scan QR</button>
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

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
