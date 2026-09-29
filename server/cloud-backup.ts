import { createHash } from "node:crypto";
import express, { Router, type Application, type NextFunction, type Request, type Response } from "express";
import { eq, sql } from "drizzle-orm";
import { encryptedBackupEnvelopeSchema, encryptedBackupWriteSchema, type EncryptedBackupEnvelope } from "../lib/cloud-backup-contract";
import { getDb } from "./db";
import { encryptedDeviceBackups } from "../drizzle/schema";

type BackupRecord = {
  envelope: EncryptedBackupEnvelope;
  revision: number;
  updatedAt: Date | string;
};

export type CloudBackupRepository = {
  get(installationHash: string): Promise<BackupRecord | null>;
  save(installationHash: string, envelope: EncryptedBackupEnvelope): Promise<void>;
  delete(installationHash: string): Promise<void>;
};

const productionRepository: CloudBackupRepository = {
  async get(installationHash) {
    const db = await getDb();
    if (!db) throw new Error("database unavailable");
    const rows = await db.select({
      envelope: encryptedDeviceBackups.envelope,
      revision: encryptedDeviceBackups.revision,
      updatedAt: encryptedDeviceBackups.updatedAt,
    }).from(encryptedDeviceBackups).where(eq(encryptedDeviceBackups.installationHash, installationHash)).limit(1);
    return rows[0] ?? null;
  },
  async save(installationHash, envelope) {
    const db = await getDb();
    if (!db) throw new Error("database unavailable");
    await db.insert(encryptedDeviceBackups).values({ installationHash, envelope, revision: 1 }).onDuplicateKeyUpdate({
      set: {
        envelope,
        revision: sql`${encryptedDeviceBackups.revision} + 1`,
        updatedAt: new Date(),
      },
    });
  },
  async delete(installationHash) {
    const db = await getDb();
    if (!db) throw new Error("database unavailable");
    await db.delete(encryptedDeviceBackups).where(eq(encryptedDeviceBackups.installationHash, installationHash));
  },
};

const ipRequests = new Map<string, { count: number; resetAt: number }>();
const tokenWrites = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;

function allowRate(map: Map<string, { count: number; resetAt: number }>, key: string, limit: number): boolean {
  const now = Date.now();
  let bucket = map.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS };
    map.set(key, bucket);
  }
  bucket.count += 1;
  if (map.size > 10_000) {
    for (const [candidate, value] of map) if (value.resetAt <= now) map.delete(candidate);
    while (map.size > 10_000) {
      const oldest = map.keys().next().value;
      if (oldest === undefined) break;
      map.delete(oldest);
    }
  }
  return bucket.count <= limit;
}

function extractToken(request: Request): string | null {
  const authorization = request.get("authorization");
  const match = authorization?.match(/^Bearer ([0-9a-f]{64})$/i);
  return match?.[1].toLowerCase() ?? null;
}

function authenticate(request: Request, response: Response, next: NextFunction): void {
  response.setHeader("Cache-Control", "no-store");
  if (!allowRate(ipRequests, request.ip || request.socket.remoteAddress || "unknown", 600)) {
    response.status(429).json({ error: "Tente novamente mais tarde." });
    return;
  }
  const token = extractToken(request);
  if (!token) {
    response.status(401).json({ error: "Autorização inválida." });
    return;
  }
  const installationHash = createHash("sha256").update(token, "utf8").digest("hex");
  (request as Request & { installationHash?: string }).installationHash = installationHash;
  next();
}

function installationHash(request: Request): string {
  const value = (request as Request & { installationHash?: string }).installationHash;
  if (!value) throw new Error("missing installation identity");
  return value;
}

export function createCloudBackupRouter(repository: CloudBackupRepository = productionRepository): Router {
  const router = Router();
  router.get("/status", authenticate, async (request, response) => {
    try {
      const record = await repository.get(installationHash(request));
      response.json({
        exists: Boolean(record),
        revision: record?.revision ?? null,
        updatedAt: record ? new Date(record.updatedAt).toISOString() : null,
      });
    } catch {
      response.status(503).json({ error: "O serviço de backup está indisponível." });
    }
  });

  router.get("/", authenticate, async (request, response) => {
    try {
      const record = await repository.get(installationHash(request));
      if (!record) {
        response.status(404).json({ error: "Nenhum backup encontrado." });
        return;
      }
      response.json({ envelope: record.envelope, revision: record.revision, updatedAt: new Date(record.updatedAt).toISOString() });
    } catch {
      response.status(503).json({ error: "O serviço de backup está indisponível." });
    }
  });

  router.put("/", authenticate, (request, response, next) => {
    if (!allowRate(tokenWrites, installationHash(request), 30)) {
      response.status(429).json({ error: "Muitas atualizações de backup. Aguarde um minuto." });
      return;
    }
    express.json({ limit: "3mb", strict: true })(request, response, next);
  }, async (request, response) => {
    const parsed = encryptedBackupWriteSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Envelope de backup inválido." });
      return;
    }
    try {
      await repository.save(installationHash(request), parsed.data.envelope);
      response.status(204).end();
    } catch {
      response.status(503).json({ error: "O serviço de backup está indisponível." });
    }
  });

  router.delete("/", authenticate, async (request, response) => {
    try {
      await repository.delete(installationHash(request));
      response.status(204).end();
    } catch {
      response.status(503).json({ error: "O serviço de backup está indisponível." });
    }
  });
  router.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    const status = typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status)
      : 400;
    if (status === 413) {
      response.status(413).json({ error: "O backup ultrapassa o limite permitido." });
      return;
    }
    response.status(400).json({ error: "A requisição de backup é inválida." });
  });
  return router;
}

export function registerCloudBackupRoutes(app: Application): void {
  app.use("/api/cloud-backup", createCloudBackupRouter());
}

export function parseCloudBackupEnvelope(value: unknown): EncryptedBackupEnvelope {
  return encryptedBackupEnvelopeSchema.parse(value);
}
