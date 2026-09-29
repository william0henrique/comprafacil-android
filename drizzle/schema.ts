import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import type { EncryptedBackupEnvelope } from "../lib/cloud-backup-contract";

/**
 * Existing template user table. CompraFácil cloud backup does not use this table
 * and does not require Manus OAuth or any account identity.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** Contains only an encrypted client payload and a SHA-256 hash of its random bearer token. */
export const encryptedDeviceBackups = mysqlTable("encrypted_device_backups", {
  installationHash: varchar("installation_hash", { length: 64 }).primaryKey(),
  envelope: json("envelope").$type<EncryptedBackupEnvelope>().notNull(),
  revision: int("revision", { unsigned: true }).default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type EncryptedDeviceBackup = typeof encryptedDeviceBackups.$inferSelect;
