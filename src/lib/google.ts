import { decrypt, encrypt } from './crypto';

/** Google Drive — importar PDFs, Docs, DOCX e TXT como fontes de conteúdo. */

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE = 'https://www.googleapis.com/drive/v3';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'openid',
  'email',
].join(' ');

export function authorizeUrl(state: string) {
  const url = new URL(AUTH_URL);
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set('redirect_uri', process.env.GOOGLE_REDIRECT_URI!);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GOOGLE_SCOPES);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  return url.toString();
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Google OAuth falhou: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function refreshAccess(refresh: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refresh,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Refresh do token Google falhou: ${res.status}`);
  return res.json();
}

export interface IntegrationRow {
  access_token_enc: string;
  refresh_token_enc: string | null;
  expires_at: string | null;
}

type Persist = (patch: {
  access_token_enc: string;
  expires_at: string;
}) => Promise<void>;

export async function validAccessToken(row: IntegrationRow, persist: Persist) {
  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  if (expiresAt - Date.now() > 60_000) {
    const token = decrypt(row.access_token_enc);
    if (token) return token;
  }
  const refresh = decrypt(row.refresh_token_enc);
  if (!refresh) throw new Error('Ligação ao Google Drive expirada. Volta a ligar em Definições.');

  const fresh = await refreshAccess(refresh);
  await persist({
    access_token_enc: encrypt(fresh.access_token),
    expires_at: new Date(Date.now() + fresh.expires_in * 1000).toISOString(),
  });
  return fresh.access_token;
}

// ── Ficheiros ────────────────────────────────────────────────
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
}

const SUPPORTED = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'application/vnd.google-apps.document',
];

export async function listFiles(token: string, query?: string) {
  const mimeFilter = SUPPORTED.map((m) => `mimeType='${m}'`).join(' or ');
  const q = [
    'trashed = false',
    `(${mimeFilter})`,
    query ? `name contains '${query.replace(/'/g, "\\'")}'` : null,
  ]
    .filter(Boolean)
    .join(' and ');

  const url = new URL(`${DRIVE}/files`);
  url.searchParams.set('q', q);
  url.searchParams.set('pageSize', '50');
  url.searchParams.set('orderBy', 'modifiedTime desc');
  url.searchParams.set('fields', 'files(id,name,mimeType,modifiedTime,size)');

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive list: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { files: DriveFile[] };
  return data.files ?? [];
}

/** Descarrega o ficheiro. Google Docs são exportados como texto simples. */
export async function downloadFile(token: string, file: DriveFile) {
  const isGoogleDoc = file.mimeType === 'application/vnd.google-apps.document';
  const url = isGoogleDoc
    ? `${DRIVE}/files/${file.id}/export?mimeType=text/plain`
    : `${DRIVE}/files/${file.id}?alt=media`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive download: ${res.status} ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return { buffer: buf, mimeType: isGoogleDoc ? 'text/plain' : file.mimeType };
}
