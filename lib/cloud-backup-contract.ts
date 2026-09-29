import { z } from "zod";

export const CLOUD_BACKUP_VERSION = 1 as const;
export const CLOUD_BACKUP_ALGORITHM = "xchacha20poly1305" as const;
export const MAX_CLOUD_BACKUP_PLAINTEXT_BYTES = 1_000_000;
export const MAX_CLOUD_BACKUP_CIPHERTEXT_HEX_CHARS = (MAX_CLOUD_BACKUP_PLAINTEXT_BYTES + 16) * 2;

export const encryptedBackupEnvelopeSchema = z.object({
  version: z.literal(CLOUD_BACKUP_VERSION),
  algorithm: z.literal(CLOUD_BACKUP_ALGORITHM),
  nonceHex: z.string().length(48).regex(/^[0-9a-f]{48}$/i),
  ciphertextHex: z.string()
    .min(32)
    .max(MAX_CLOUD_BACKUP_CIPHERTEXT_HEX_CHARS)
    .regex(/^(?:[0-9a-f]{2})+$/i),
}).strict();

export type EncryptedBackupEnvelope = z.infer<typeof encryptedBackupEnvelopeSchema>;

export const encryptedBackupWriteSchema = z.object({
  envelope: encryptedBackupEnvelopeSchema,
}).strict();

export type EncryptedBackupStatus = {
  exists: boolean;
  revision: number | null;
  updatedAt: string | null;
};
