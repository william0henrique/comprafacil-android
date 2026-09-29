import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { createCloudBackupRouter, type CloudBackupRepository } from "../server/cloud-backup";
import type { EncryptedBackupEnvelope } from "../lib/cloud-backup-contract";

let server: Server | null = null;

async function startApi(repository: CloudBackupRepository): Promise<string> {
  const app = express();
  app.use("/api/cloud-backup", createCloudBackupRouter(repository));
  server = app.listen(0);
  await new Promise<void>((resolve) => server?.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("missing test server port");
  return `http://127.0.0.1:${address.port}/api/cloud-backup`;
}

afterEach(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => server?.close((error) => error ? reject(error) : resolve()));
  server = null;
});

const token = "ab".repeat(32);
const envelope: EncryptedBackupEnvelope = {
  version: 1,
  algorithm: "xchacha20poly1305",
  nonceHex: "01".repeat(24),
  ciphertextHex: "02".repeat(32),
};

describe("anonymous encrypted device backup API", () => {
  it("stores only the envelope under a one-way installation-token hash", async () => {
    let storedHash = "";
    let storedEnvelope: EncryptedBackupEnvelope | null = null;
    let revision = 0;
    const repository: CloudBackupRepository = {
      async get(hash) { return storedEnvelope && hash === storedHash ? { envelope: storedEnvelope, revision, updatedAt: new Date("2026-09-29T03:00:00.000Z") } : null; },
      async save(hash, value) { storedHash = hash; storedEnvelope = value; revision += 1; },
      async delete(hash) { if (hash === storedHash) storedEnvelope = null; },
    };
    const base = await startApi(repository);
    const headers = { Authorization: `Bearer ${token}` };

    const unauthorized = await fetch(`${base}/status`);
    expect(unauthorized.status).toBe(401);

    const write = await fetch(base, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ envelope }),
    });
    expect(write.status).toBe(204);
    expect(storedHash).toMatch(/^[0-9a-f]{64}$/);
    expect(storedHash).not.toBe(token);
    expect(storedEnvelope).toEqual(envelope);

    const status = await fetch(`${base}/status`, { headers });
    expect(await status.json()).toMatchObject({ exists: true, revision: 1 });

    const read = await fetch(base, { headers });
    expect(await read.json()).toMatchObject({ envelope, revision: 1 });
    expect(read.headers.get("cache-control")).toBe("no-store");

    const otherHeaders = { Authorization: `Bearer ${"cd".repeat(32)}` };
    const otherStatus = await fetch(`${base}/status`, { headers: otherHeaders });
    expect(await otherStatus.json()).toMatchObject({ exists: false, revision: null });
    const otherRead = await fetch(base, { headers: otherHeaders });
    expect(otherRead.status).toBe(404);
    const otherDelete = await fetch(base, { method: "DELETE", headers: otherHeaders });
    expect(otherDelete.status).toBe(204);
    expect(await (await fetch(`${base}/status`, { headers })).json()).toMatchObject({ exists: true, revision: 1 });

    const remove = await fetch(base, { method: "DELETE", headers });
    expect(remove.status).toBe(204);
    expect((await fetch(`${base}/status`, { headers })).status).toBe(200);
    expect(await (await fetch(`${base}/status`, { headers })).json()).toMatchObject({ exists: false });
  });

  it("rejects plaintext or malformed envelopes without calling the repository", async () => {
    let writes = 0;
    const repository: CloudBackupRepository = {
      async get() { return null; },
      async save() { writes += 1; },
      async delete() {},
    };
    const base = await startApi(repository);
    const response = await fetch(base, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ snapshot: { email: "person@example.test" } }),
    });
    expect(response.status).toBe(400);
    expect(writes).toBe(0);
  });
});
