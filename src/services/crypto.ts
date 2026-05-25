/**
 * src/services/crypto.ts — Cifragem simétrica para dados sensíveis em trânsito no DB.
 *
 * USO ATUAL: cifrar `chave_temp` em `assinaturas` (defesa em profundidade).
 * Sem isso, dump do Supabase expõe chaves Premium em texto puro. Com isso,
 * dump sem ACCESS_PASSWORD é inútil — atacante precisa COMPROMETER o env do
 * Render também (defesa em camadas).
 *
 * ALGORITMO: AES-256-GCM (NIST aprovado, autenticado, sem padding oracle).
 *  - Chave derivada de ACCESS_PASSWORD via scrypt (KDF resistente a GPU)
 *  - Salt único por mensagem (rotaciona automaticamente; sem chave fraca)
 *  - IV de 96 bits (recomendação NIST SP 800-38D pra GCM)
 *  - Tag de autenticação 128 bits (detecta tampering)
 *  - Prefixo de versão "v1:" pra permitir upgrade do algoritmo no futuro
 *
 * FORMATO ARMAZENADO:
 *   v1:saltHex:ivHex:ciphertextHex:tagHex
 *
 * BACKWARD COMPAT: decryptString aceita strings SEM prefixo "v1:" como
 * plaintext (rows escritas antes deste módulo entrar em produção). Como
 * chave_temp tem TTL 24h, isso só importa pela janela curta de transição.
 *
 * ROTAÇÃO DE ACCESS_PASSWORD: se você trocar ACCESS_PASSWORD, valores
 * cifrados existentes ficam ilegíveis (decrypt retorna null). Como
 * chave_temp tem TTL 24h, impacto é a janela durante a rotação — clientes
 * que pagaram nas últimas 24h e ainda não pegaram a chave precisam usar
 * "Recuperar minha chave" no login (que valida via hash, não plaintext).
 */
import crypto from "crypto";

const ALGO = "aes-256-gcm";
const KEY_LEN = 32;            // 256 bits
const IV_LEN = 12;             // 96 bits (recomendado pra GCM)
const SALT_LEN = 16;           // 128 bits
const TAG_LEN = 16;            // 128 bits
const SCRYPT_N = 1 << 14;      // 16384 — derivação rápida (~50ms),
                                // ACCESS_PASSWORD já tem alta entropia

/**
 * Deriva chave AES de 32 bytes a partir de ACCESS_PASSWORD + salt.
 * Salt único por mensagem está incluído no output cifrado.
 */
function deriveKey(salt: Buffer): Buffer {
  const pw = process.env.ACCESS_PASSWORD || "";
  if (!pw) throw new Error("ACCESS_PASSWORD não definido");
  return crypto.scryptSync(pw, salt, KEY_LEN, { N: SCRYPT_N });
}

/**
 * Cifra plaintext. Retorna string formato "v1:salt:iv:ct:tag" (todos hex).
 * Tamanho da saída: ~2x o plaintext + 88 chars de header (salt+iv+tag).
 */
export function encryptString(plaintext: string): string {
  if (typeof plaintext !== "string") throw new Error("plaintext deve ser string");
  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const key = deriveKey(salt);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    salt.toString("hex"),
    iv.toString("hex"),
    ct.toString("hex"),
    tag.toString("hex"),
  ].join(":");
}

/**
 * Decifra. Retorna a string original ou null se inválido / corrompido /
 * chave errada (ACCESS_PASSWORD trocou).
 *
 * Backward-compat: se a string NÃO começa com "v1:", assume plaintext puro
 * (formato legado, antes desta migração). Importante pra não quebrar rows
 * de chave_temp já existentes no DB durante o rollout.
 */
export function decryptString(stored: string | null | undefined): string | null {
  if (!stored) return null;
  // Legado: plaintext puro (rows antes deste deploy). Janela curta (24h TTL).
  if (!stored.startsWith("v1:")) return stored;

  const parts = stored.split(":");
  if (parts.length !== 5) return null;
  try {
    const [, saltHex, ivHex, ctHex, tagHex] = parts;
    const salt = Buffer.from(saltHex, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const ct = Buffer.from(ctHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    if (salt.length !== SALT_LEN || iv.length !== IV_LEN || tag.length !== TAG_LEN) {
      return null;
    }
    const key = deriveKey(salt);
    const dec = crypto.createDecipheriv(ALGO, key, iv);
    dec.setAuthTag(tag);
    const pt = Buffer.concat([dec.update(ct), dec.final()]);
    return pt.toString("utf8");
  } catch {
    // Chave errada, tag inválida, dados corrompidos — tudo cai aqui.
    // Falha-segura: NÃO logamos pra não vazar metadados em caso de ataque.
    return null;
  }
}
