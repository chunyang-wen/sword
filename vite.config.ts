import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tls from "node:tls";
import fs from "node:fs";
import path from "node:path";

function certificatePem(raw: Buffer) {
  const body = raw.toString("base64").match(/.{1,64}/g)?.join("\n") ?? "";
  return `-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----`;
}

function parseCertificateTarget(value: string, fallbackPort: number) {
  const input = value.trim();
  if (!input) throw new Error("Enter a hostname or URL.");

  const url = input.includes("://") ? new URL(input) : new URL(`https://${input}`);
  if (!url.hostname) throw new Error("Enter a valid hostname or URL.");

  const port = Number(url.port || fallbackPort || 443);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Port must be between 1 and 65535.");
  }

  return { host: url.hostname, port };
}

function getCertificateChain(host: string, port: number) {
  return new Promise<string[]>((resolve, reject) => {
    const socket = tls.connect({
      host,
      port,
      servername: host,
      rejectUnauthorized: false,
      timeout: 10_000,
    });

    socket.once("secureConnect", () => {
      try {
        const certificates: string[] = [];
        const seen = new Set<string>();
        let current = socket.getPeerCertificate(true);

        while (current?.raw && !seen.has(current.fingerprint256)) {
          seen.add(current.fingerprint256);
          certificates.push(certificatePem(current.raw));
          if (!current.issuerCertificate || current.issuerCertificate === current) break;
          current = current.issuerCertificate;
        }

        socket.end();
        resolve(certificates);
      } catch (error) {
        socket.destroy();
        reject(error);
      }
    });

    socket.once("timeout", () => {
      socket.destroy(new Error("Timed out while connecting to the TLS server."));
    });

    socket.once("error", reject);
  });
}

const certificateApiMiddleware = async (req: any, res: any) => {
  try {
    const requestUrl = new URL(req.url ?? "", "http://localhost");
    const target = requestUrl.searchParams.get("target") ?? "";
    const fallbackPort = Number(requestUrl.searchParams.get("port") || 443);
    const { host, port } = parseCertificateTarget(target, fallbackPort);
    const certificates = await getCertificateChain(host, port);

    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ host, port, certificates }));
  } catch (error) {
    res.statusCode = 400;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unable to retrieve certificate." }));
  }
};

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    {
      name: "certificate-api",
      configureServer(server) {
        server.middlewares.use("/api/certificate", certificateApiMiddleware);
      },
      configurePreviewServer(server) {
        server.middlewares.use("/api/certificate", certificateApiMiddleware);
      },
    },
    {
      name: "cheatsheet-indexer",
      buildStart() {
        const cheatsheetsDir = path.resolve(process.cwd(), "public/cheatsheets");
        if (!fs.existsSync(cheatsheetsDir)) return;
        
        const readFiles = (dir: string) => {
          const fullPath = path.join(cheatsheetsDir, dir);
          if (!fs.existsSync(fullPath)) return [];
          return fs.readdirSync(fullPath)
            .filter(f => f.endsWith(".md"))
            .map(f => f.replace(".md", ""));
        };

        const commonFiles = readFiles("common");
        const linuxFiles = readFiles("linux");
        const macosFiles = readFiles("macos");

        const indexData = {
          linux: Array.from(new Set([...commonFiles, ...linuxFiles])).sort(),
          macos: Array.from(new Set([...commonFiles, ...macosFiles])).sort()
        };

        fs.writeFileSync(
          path.join(cheatsheetsDir, "index.json"),
          JSON.stringify(indexData)
        );
      }
    },
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          formatters: ["js-yaml", "sql-formatter", "cronstrue"],
          media: ["qrcode", "jsqr", "node-forge"],
          icons: ["lucide-react"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
  },
});
