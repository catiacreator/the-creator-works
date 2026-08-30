import crypto from 'node:crypto';
import { decrypt, encrypt } from './crypto';

/**
 * Canva Connect API.
 *
 * ⚠️ AVISO IMPORTANTE
 * As APIs de Brand Templates e Autofill exigem que a integração atue em nome
 * de um utilizador membro de uma organização **Canva Enterprise**. Com Canva
 * Free/Pro/Teams estes endpoints devolvem `permission_denied`.
 * Documentação: https://www.canva.dev/docs/connect/autofill-guide/
 *
 * Por isso o motor por defeito da app é o local (lib/render.ts). Este ficheiro
 * fica pronto para o dia em que houver Enterprise.
 */

const AUTH_URL = 'https://www.canva.com/api/oauth/authorize';
const API = 'https://api.canva.com/rest/v1';

export const CANVA_SCOPES = [
  'design:content:read',
  'design:content:write',
  'design:meta:read',
  'brandtemplate:meta:read',
  'brandtemplate:content:read',
  'asset:read',
  'asset:write',
  'profile:read',
].join(' ');

// ── PKCE ─────────────────────────────────────────────────────
export function makePkce() {
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function authorizeUrl(challenge: string, state: string) {
  const url = new URL(AUTH_URL);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('scope', CANVA_SCOPES);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', process.env.CANVA_CLIENT_ID!);
  url.searchParams.set('redirect_uri', process.env.CANVA_REDIRECT_URI!);
  url.searchParams.set('state', state);
  return url.toString();
}

function basicAuth() {
  const raw = `${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`;
  return `Basic ${Buffer.from(raw).toString('base64')}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

export async function exchangeCode(code: string, verifier: string): Promise<TokenResponse> {
  const res = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      redirect_uri: process.env.CANVA_REDIRECT_URI!,
    }),
  });
  if (!res.ok) throw new Error(`Canva OAuth falhou: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function refreshToken(refresh: string): Promise<TokenResponse> {
  const res = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
  });
  if (!res.ok) throw new Error(`Refresh do token Canva falhou: ${res.status}`);
  return res.json();
}

// ── Token válido a partir da linha de `integrations` ─────────
export interface IntegrationRow {
  id: string;
  access_token_enc: string;
  refresh_token_enc: string | null;
  expires_at: string | null;
}

type Persist = (patch: {
  access_token_enc: string;
  refresh_token_enc?: string;
  expires_at: string;
}) => Promise<void>;

export async function validAccessToken(row: IntegrationRow, persist: Persist) {
  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  const stillGood = expiresAt - Date.now() > 60_000;
  if (stillGood) {
    const token = decrypt(row.access_token_enc);
    if (token) return token;
  }

  const refresh = decrypt(row.refresh_token_enc);
  if (!refresh) throw new Error('Ligação ao Canva expirada. Volta a ligar em Definições.');

  const fresh = await refreshToken(refresh);
  const patch = {
    access_token_enc: encrypt(fresh.access_token),
    ...(fresh.refresh_token ? { refresh_token_enc: encrypt(fresh.refresh_token) } : {}),
    expires_at: new Date(Date.now() + fresh.expires_in * 1000).toISOString(),
  };
  await persist(patch);
  return fresh.access_token;
}

// ── Chamadas à API ───────────────────────────────────────────
async function call<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 403 || body.includes('permission_denied')) {
      throw new Error(
        'O Canva recusou o pedido (permission_denied). As APIs de Brand Template e ' +
          'Autofill só funcionam com Canva Enterprise. Usa o motor local nas Definições.',
      );
    }
    throw new Error(`Canva ${path}: ${res.status} ${body}`);
  }
  return res.json() as Promise<T>;
}

export interface BrandTemplate {
  id: string;
  title: string;
  thumbnail?: { url: string };
}

export async function listBrandTemplates(token: string) {
  const data = await call<{ items: BrandTemplate[] }>(token, '/brand-templates?limit=100');
  return data.items ?? [];
}

export async function getBrandTemplateDataset(token: string, templateId: string) {
  const data = await call<{ dataset: Record<string, { type: string }> }>(
    token,
    `/brand-templates/${templateId}/dataset`,
  );
  return data.dataset ?? {};
}

// ── Upload de asset (a fotografia gerada) ────────────────────
export async function uploadAsset(token: string, name: string, bytes: Buffer) {
  const res = await fetch(`${API}/asset-uploads`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'Asset-Upload-Metadata': JSON.stringify({
        name_base64: Buffer.from(name).toString('base64'),
      }),
    },
    body: new Uint8Array(bytes),
  });
  if (!res.ok) throw new Error(`Upload de asset falhou: ${res.status} ${await res.text()}`);
  const { job } = (await res.json()) as { job: { id: string } };

  const done = await poll<{ job: { status: string; asset?: { id: string }; error?: unknown } }>(
    () => call(token, `/asset-uploads/${job.id}`),
    (r) => r.job.status !== 'in_progress',
  );
  if (done.job.status !== 'success' || !done.job.asset) {
    throw new Error(`Upload de asset falhou: ${JSON.stringify(done.job.error)}`);
  }
  return done.job.asset.id;
}

// ── Autofill ─────────────────────────────────────────────────
export type AutofillValue =
  | { type: 'text'; text: string }
  | { type: 'image'; asset_id: string };

export async function autofillDesign(args: {
  token: string;
  brandTemplateId: string;
  title: string;
  data: Record<string, AutofillValue>;
}) {
  const { token, brandTemplateId, title, data } = args;
  const created = await call<{ job: { id: string } }>(token, '/autofills', {
    method: 'POST',
    body: JSON.stringify({
      type: 'create_from_brand_template',
      brand_template_id: brandTemplateId,
      title,
      data,
    }),
  });

  const done = await poll<{
    job: { status: string; result?: { design: { id: string; urls?: { edit_url: string } } }; error?: unknown };
  }>(
    () => call(token, `/autofills/${created.job.id}`),
    (r) => r.job.status !== 'in_progress',
  );

  if (done.job.status !== 'success' || !done.job.result) {
    throw new Error(`Autofill falhou: ${JSON.stringify(done.job.error)}`);
  }
  return done.job.result.design;
}

// ── Exportação ───────────────────────────────────────────────
export async function exportDesignPng(token: string, designId: string, width = 1080) {
  const created = await call<{ job: { id: string } }>(token, '/exports', {
    method: 'POST',
    body: JSON.stringify({
      design_id: designId,
      format: { type: 'png', width, lossless: true },
    }),
  });

  const done = await poll<{ job: { status: string; urls?: string[]; error?: unknown } }>(
    () => call(token, `/exports/${created.job.id}`),
    (r) => r.job.status !== 'in_progress',
    40,
  );

  if (done.job.status !== 'success' || !done.job.urls?.length) {
    throw new Error(`Exportação falhou: ${JSON.stringify(done.job.error)}`);
  }
  return done.job.urls; // um URL por página, válidos 24h
}

// ── Utilitário de polling ────────────────────────────────────
async function poll<T>(fn: () => Promise<T>, ready: (r: T) => boolean, tries = 30): Promise<T> {
  let delay = 700;
  for (let i = 0; i < tries; i++) {
    const r = await fn();
    if (ready(r)) return r;
    await new Promise((res) => setTimeout(res, delay));
    delay = Math.min(delay * 1.3, 4000);
  }
  throw new Error('O Canva demorou demasiado a responder.');
}
