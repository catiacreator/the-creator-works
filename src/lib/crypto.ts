import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';

function key(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY em falta. Gera uma com: openssl rand -base64 32',
    );
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY tem de ser 32 bytes em base64.');
  }
  return buf;
}

/** Cifra um segredo para guardar na base de dados. */
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

/** Decifra um segredo vindo da base de dados. */
export function decrypt(payload: string | null | undefined): string | null {
  if (!payload) return null;
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) return null;
  try {
    const decipher = crypto.createDecipheriv(ALGO, key(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

/** Mostra só os últimos 4 caracteres de uma chave. */
export function maskKey(value: string | null): string | null {
  if (!value) return null;
  return `••••••••${value.slice(-4)}`;
}
