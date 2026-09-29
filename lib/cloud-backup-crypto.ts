import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { bytesToHex, bytesToUtf8, hexToBytes, utf8ToBytes } from "@noble/ciphers/utils.js";
import {
  CLOUD_BACKUP_ALGORITHM,
  CLOUD_BACKUP_VERSION,
  MAX_CLOUD_BACKUP_PLAINTEXT_BYTES,
  encryptedBackupEnvelopeSchema,
  type EncryptedBackupEnvelope,
} from "./cloud-backup-contract";

const KEY_HEX_LENGTH = 64;
const NONCE_BYTES = 24;
const AUTH_TAG_BYTES = 16;

function parseKey(keyHex: string): Uint8Array {
  if (typeof keyHex !== "string" || keyHex.length !== KEY_HEX_LENGTH || !/^[0-9a-f]{64}$/i.test(keyHex)) {
    throw new Error("A chave local do backup está inválida.");
  }
  const key = hexToBytes(keyHex);
  if (key.length !== 32) throw new Error("A chave local do backup está inválida.");
  return key;
}

export function encryptBackupSnapshot(
  snapshot: unknown,
  keyHex: string,
  nonce: Uint8Array,
): EncryptedBackupEnvelope {
  if (!(nonce instanceof Uint8Array) || nonce.length !== NONCE_BYTES) {
    throw new Error("O nonce do backup está inválido.");
  }

  const plaintext = utf8ToBytes(JSON.stringify(snapshot));
  if (plaintext.length === 0 || plaintext.length > MAX_CLOUD_BACKUP_PLAINTEXT_BYTES) {
    throw new Error("O backup ultrapassa o limite de tamanho permitido.");
  }

  const key = parseKey(keyHex);
  try {
    const ciphertext = xchacha20poly1305(key, nonce).encrypt(plaintext);
    if (ciphertext.length !== plaintext.length + AUTH_TAG_BYTES) {
      throw new Error("Não foi possível cifrar o backup.");
    }
    return encryptedBackupEnvelopeSchema.parse({
      version: CLOUD_BACKUP_VERSION,
      algorithm: CLOUD_BACKUP_ALGORITHM,
      nonceHex: bytesToHex(nonce),
      ciphertextHex: bytesToHex(ciphertext),
    });
  } finally {
    key.fill(0);
    plaintext.fill(0);
  }
}

export function decryptBackupSnapshot(envelopeValue: unknown, keyHex: string): unknown {
  const envelope = encryptedBackupEnvelopeSchema.parse(envelopeValue);
  const key = parseKey(keyHex);
  const nonce = hexToBytes(envelope.nonceHex);
  const ciphertext = hexToBytes(envelope.ciphertextHex);
  let plaintext: Uint8Array | undefined;
  try {
    plaintext = xchacha20poly1305(key, nonce).decrypt(ciphertext);
    if (plaintext.length > MAX_CLOUD_BACKUP_PLAINTEXT_BYTES) {
      throw new Error("O backup ultrapassa o limite de tamanho permitido.");
    }
    const json = bytesToUtf8(plaintext);
    return JSON.parse(json) as unknown;
  } catch {
    throw new Error("Não foi possível autenticar ou ler o backup. Os dados locais não foram alterados.");
  } finally {
    key.fill(0);
    plaintext?.fill(0);
  }
}
