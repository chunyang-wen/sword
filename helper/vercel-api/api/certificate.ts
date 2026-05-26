import type { VercelRequest, VercelResponse } from '@vercel/node';
import tls from 'node:tls';

function certificatePem(raw: Buffer): string {
  const body = raw.toString('base64').match(/.{1,64}/g)?.join('\n') ?? '';
  return `-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----`;
}

function parseCertificateTarget(value: string, fallbackPort: number) {
  const input = value.trim();
  if (!input) throw new Error('Enter a hostname or URL.');

  const url = input.includes('://') ? new URL(input) : new URL(`https://${input}`);
  if (!url.hostname) throw new Error('Enter a valid hostname or URL.');

  const port = Number(url.port || fallbackPort || 443);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Port must be between 1 and 65535.');
  }

  return { host: url.hostname, port };
}

function getCertificateChain(host: string, port: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host,
      port,
      servername: host,
      rejectUnauthorized: false,
      timeout: 8000,
    });

    socket.once('secureConnect', () => {
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

    socket.once('timeout', () => {
      socket.destroy(new Error('Timed out while connecting to the TLS server.'));
    });

    socket.once('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow requests from your primary frontend website (CORS)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const target = String(req.query.target ?? '');
    const fallbackPort = Number(req.query.port || 443);
    
    const { host, port } = parseCertificateTarget(target, fallbackPort);
    const certificates = await getCertificateChain(host, port);

    res.status(200).json({ host, port, certificates });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unable to retrieve certificate.',
    });
  }
}
