import { describe, expect, it } from "vitest";
import { encryptBackupSnapshot, decryptBackupSnapshot } from "../lib/cloud-backup-crypto";
import { bytesToHex } from "@noble/ciphers/utils.js";

const KEY = "9f".repeat(32);
const SNAPSHOT = { schemaVersion: 1, tables: { products: [{ id: "p1", name: "Arroz" }] } };

describe("encrypted local cloud-backup envelope", () => {
  it("round-trips JSON using authenticated XChaCha20-Poly1305", () => {
    const nonce = Uint8Array.from({ length: 24 }, (_, index) => index);
    const envelope = encryptBackupSnapshot(SNAPSHOT, KEY, nonce);

    expect(envelope.version).toBe(1);
    expect(envelope.algorithm).toBe("xchacha20poly1305");
    expect(envelope.nonceHex).toBe(bytesToHex(nonce));
    expect(decryptBackupSnapshot(envelope, KEY)).toEqual(SNAPSHOT);
  });

  it("uses a different envelope nonce when given a fresh secure nonce", () => {
    const first = encryptBackupSnapshot(SNAPSHOT, KEY, new Uint8Array(24).fill(1));
    const second = encryptBackupSnapshot(SNAPSHOT, KEY, new Uint8Array(24).fill(2));

    expect(first.nonceHex).not.toBe(second.nonceHex);
    expect(first.ciphertextHex).not.toBe(second.ciphertextHex);
  });

  it("rejects ciphertext tampering without returning any plaintext", () => {
    const envelope = encryptBackupSnapshot(SNAPSHOT, KEY, new Uint8Array(24).fill(3));
    const altered = { ...envelope, ciphertextHex: `${envelope.ciphertextHex.slice(0, -2)}00` };

    expect(() => decryptBackupSnapshot(altered, KEY)).toThrow(/não foi possível autenticar/i);
  });

  it("rejects malformed key, nonce and unsupported envelope versions", () => {
    expect(() => encryptBackupSnapshot(SNAPSHOT, "1234", new Uint8Array(24))).toThrow();
    expect(() => encryptBackupSnapshot(SNAPSHOT, KEY, new Uint8Array(12))).toThrow();
    const envelope = encryptBackupSnapshot(SNAPSHOT, KEY, new Uint8Array(24).fill(4));
    expect(() => decryptBackupSnapshot({ ...envelope, version: 2 }, KEY)).toThrow();
  });
});
