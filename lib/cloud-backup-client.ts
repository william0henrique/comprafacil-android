import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { bytesToHex } from "@noble/ciphers/utils.js";
import { getApiBaseUrl } from "../constants/api";
import type { SQLiteDatabase } from "expo-sqlite";
import { decryptBackupSnapshot, encryptBackupSnapshot } from "./cloud-backup-crypto";
import {
  encryptedBackupEnvelopeSchema,
  type EncryptedBackupStatus,
} from "./cloud-backup-contract";
import { exportCloudBackupSnapshot, restoreCloudBackupSnapshot } from "./local-db";

const SECURE_KEYS = {
  accessToken: "comprafacil.cloud_backup.access.v1",
  encryptionKey: "comprafacil.cloud_backup.encryption.v1",
  enabled: "comprafacil.cloud_backup.enabled.v1",
  lastSyncAt: "comprafacil.cloud_backup.last_sync.v1",
} as const;

type Credentials = { accessToken: string; encryptionKey: string };
type ClientResult = { status: "enabled"; lastSyncAt: string } | { status: "remote-exists"; remote: EncryptedBackupStatus };
export type CloudBackupUiState = { phase: "idle" | "syncing" | "success" | "error"; message?: string; lastSyncAt?: string };

let uiState: CloudBackupUiState = { phase: "idle" };
const uiListeners = new Set<(state: CloudBackupUiState) => void>();
let syncPromise: Promise<void> | null = null;
let syncAgain = false;

function publish(next: CloudBackupUiState): void {
  uiState = next;
  for (const listener of uiListeners) {
    try { listener(uiState); } catch { /* UI observers must not block local writes or sync. */ }
  }
}

function assertAndroid(): void {
  if (Platform.OS !== "android") throw new Error("O backup criptografado está disponível somente no aplicativo Android.");
}

async function secureStore() {
  assertAndroid();
  return import("expo-secure-store");
}

function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  if (!base) throw new Error("O servidor do CompraFácil não está configurado para backup.");
  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    throw new Error("O endereço do servidor de backup está inválido.");
  }
  const hostname = parsed.hostname.toLowerCase();
  const localDevelopmentHost = hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "::1";
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && localDevelopmentHost)) {
    throw new Error("O backup exige uma conexão HTTPS segura.");
  }
  return `${base.replace(/\/$/, "")}/api/cloud-backup${path}`;
}

async function fetchJson<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error("Nenhum backup foi encontrado para esta instalação.");
    if (response.status === 429) throw new Error("O servidor limitou temporariamente as atualizações. Tente novamente em instantes.");
    if (response.status >= 500) throw new Error("O servidor de backup está temporariamente indisponível.");
    throw new Error("Não foi possível concluir a operação de backup.");
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

async function readCredentials(createIfMissing: boolean): Promise<Credentials | null> {
  const secure = await secureStore();
  const [accessToken, encryptionKey, enabled] = await Promise.all([
    secure.getItemAsync(SECURE_KEYS.accessToken),
    secure.getItemAsync(SECURE_KEYS.encryptionKey),
    secure.getItemAsync(SECURE_KEYS.enabled),
  ]);
  const tokenValid = accessToken !== null && /^[0-9a-f]{64}$/i.test(accessToken);
  const keyValid = encryptionKey !== null && /^[0-9a-f]{64}$/i.test(encryptionKey);
  if (enabled === "1" && (!tokenValid || !keyValid)) {
    throw new Error("A chave local deste backup não está disponível. O servidor não consegue recuperar uma cópia sem ela.");
  }
  if (!createIfMissing && (!tokenValid || !keyValid)) return null;

  let nextToken = tokenValid ? accessToken! : bytesToHex(await Crypto.getRandomBytesAsync(32));
  let nextKey = keyValid ? encryptionKey! : bytesToHex(await Crypto.getRandomBytesAsync(32));
  if (!tokenValid) await secure.setItemAsync(SECURE_KEYS.accessToken, nextToken);
  if (!keyValid) await secure.setItemAsync(SECURE_KEYS.encryptionKey, nextKey);
  nextToken = nextToken.toLowerCase();
  nextKey = nextKey.toLowerCase();
  return { accessToken: nextToken, encryptionKey: nextKey };
}

async function lastSyncAt(): Promise<string | undefined> {
  const secure = await secureStore();
  return (await secure.getItemAsync(SECURE_KEYS.lastSyncAt)) ?? undefined;
}

async function setEnabled(enabled: boolean): Promise<void> {
  const secure = await secureStore();
  await secure.setItemAsync(SECURE_KEYS.enabled, enabled ? "1" : "0");
}

async function uploadCurrentSnapshot(db: SQLiteDatabase, credentials: Credentials): Promise<string> {
  const snapshot = await exportCloudBackupSnapshot(db);
  const nonce = await Crypto.getRandomBytesAsync(24);
  const envelope = encryptBackupSnapshot(snapshot, credentials.encryptionKey, nonce);
  await fetchJson<void>("", credentials.accessToken, { method: "PUT", body: JSON.stringify({ envelope }) });
  const timestamp = new Date().toISOString();
  const secure = await secureStore();
  await secure.setItemAsync(SECURE_KEYS.lastSyncAt, timestamp);
  return timestamp;
}

async function performSync(db: SQLiteDatabase, onlyIfEnabled: boolean): Promise<void> {
  try {
    const secure = await secureStore();
    if (onlyIfEnabled && (await secure.getItemAsync(SECURE_KEYS.enabled)) !== "1") return;
    const credentials = await readCredentials(false);
    if (!credentials) return;
    publish({ phase: "syncing", lastSyncAt: await lastSyncAt() });
    const timestamp = await uploadCurrentSnapshot(db, credentials);
    publish({ phase: "success", message: "Backup criptografado salvo neste aparelho e no servidor.", lastSyncAt: timestamp });
  } catch (error) {
    let last: string | undefined;
    try { last = await lastSyncAt(); } catch { /* Keep local app usable if secure storage is unavailable. */ }
    publish({ phase: "error", message: error instanceof Error ? error.message : "Não foi possível atualizar o backup.", lastSyncAt: last });
  }
}

export function subscribeCloudBackupUiState(listener: (state: CloudBackupUiState) => void): () => void {
  uiListeners.add(listener);
  listener(uiState);
  return () => uiListeners.delete(listener);
}

export function getCloudBackupUiState(): CloudBackupUiState {
  return uiState;
}

export async function getCloudBackupSettings(): Promise<{ enabled: boolean; lastSyncAt?: string }> {
  const secure = await secureStore();
  const [enabled, last] = await Promise.all([
    secure.getItemAsync(SECURE_KEYS.enabled),
    secure.getItemAsync(SECURE_KEYS.lastSyncAt),
  ]);
  return { enabled: enabled === "1", lastSyncAt: last ?? undefined };
}

export async function getRemoteBackupStatus(): Promise<EncryptedBackupStatus | null> {
  const credentials = await readCredentials(false);
  if (!credentials) return null;
  return fetchJson<EncryptedBackupStatus>("/status", credentials.accessToken);
}

export async function enableCloudBackup(db: SQLiteDatabase): Promise<ClientResult> {
  const credentials = await readCredentials(true);
  if (!credentials) throw new Error("Não foi possível preparar as chaves locais do backup.");
  const remote = await fetchJson<EncryptedBackupStatus>("/status", credentials.accessToken);
  if (remote.exists) return { status: "remote-exists", remote };
  await setEnabled(true);
  await syncCloudBackupIfEnabled(db);
  if (uiState.phase === "error") {
    await setEnabled(false);
    throw new Error(uiState.message ?? "Não foi possível ativar o backup.");
  }
  const timestamp = await lastSyncAt();
  if (!timestamp) {
    await setEnabled(false);
    throw new Error("O primeiro backup não foi confirmado pelo servidor.");
  }
  return { status: "enabled", lastSyncAt: timestamp };
}

export async function replaceRemoteWithLocal(db: SQLiteDatabase): Promise<void> {
  const credentials = await readCredentials(true);
  if (!credentials) throw new Error("Não foi possível preparar as chaves locais do backup.");
  const wasEnabled = (await getCloudBackupSettings()).enabled;
  await setEnabled(false);
  await syncPromise?.catch(() => undefined);
  try {
    await setEnabled(true);
    await syncCloudBackupIfEnabled(db);
    if (uiState.phase === "error") throw new Error(uiState.message ?? "Não foi possível substituir a cópia remota.");
    publish({ phase: "success", message: "A cópia remota foi substituída pela deste aparelho.", lastSyncAt: await lastSyncAt() });
  } catch (error) {
    if (!wasEnabled) await setEnabled(false);
    throw error;
  }
}

export async function restoreRemoteBackup(db: SQLiteDatabase): Promise<void> {
  const credentials = await readCredentials(false);
  if (!credentials) throw new Error("As chaves desta instalação não estão disponíveis; não é possível ler o backup remoto.");
  const wasEnabled = (await getCloudBackupSettings()).enabled;
  await setEnabled(false);
  await syncPromise?.catch(() => undefined);
  try {
    const remote = await fetchJson<{ envelope: unknown; updatedAt: string }>("", credentials.accessToken);
    const envelope = encryptedBackupEnvelopeSchema.parse(remote.envelope);
    const snapshot = decryptBackupSnapshot(envelope, credentials.encryptionKey);
    await restoreCloudBackupSnapshot(db, snapshot);
    const secure = await secureStore();
    await secure.setItemAsync(SECURE_KEYS.lastSyncAt, remote.updatedAt);
    await setEnabled(true);
    publish({ phase: "success", message: "Backup restaurado neste aparelho.", lastSyncAt: remote.updatedAt });
  } catch (error) {
    if (wasEnabled) await setEnabled(true);
    throw error;
  }
}

export async function pauseCloudBackup(): Promise<void> {
  await setEnabled(false);
  await syncPromise?.catch(() => undefined);
  publish({ phase: "idle", message: "Sincronização pausada. A cópia remota foi mantida.", lastSyncAt: await lastSyncAt() });
}

export async function deleteRemoteBackup(): Promise<void> {
  const credentials = await readCredentials(false);
  if (!credentials) throw new Error("As chaves desta instalação não estão disponíveis; não é possível localizar a cópia remota.");
  const wasEnabled = (await getCloudBackupSettings()).enabled;
  await setEnabled(false);
  await syncPromise?.catch(() => undefined);
  try {
    await fetchJson<void>("", credentials.accessToken, { method: "DELETE" });
    const secure = await secureStore();
    await secure.deleteItemAsync(SECURE_KEYS.lastSyncAt);
    publish({ phase: "idle", message: "Cópia remota apagada. Os dados locais foram mantidos." });
  } catch (error) {
    if (wasEnabled) await setEnabled(true);
    throw error;
  }
}

export async function syncCloudBackupNow(db: SQLiteDatabase): Promise<void> {
  const secure = await secureStore();
  if ((await secure.getItemAsync(SECURE_KEYS.enabled)) !== "1") {
    throw new Error("Ative o backup criptografado antes de sincronizar.");
  }
  await syncCloudBackupIfEnabled(db);
}

export async function syncCloudBackupIfEnabled(db: SQLiteDatabase): Promise<void> {
  if (syncPromise) {
    syncAgain = true;
    return syncPromise;
  }
  syncPromise = (async () => {
    do {
      syncAgain = false;
      await performSync(db, true);
    } while (syncAgain);
  })().finally(() => {
    syncPromise = null;
  });
  return syncPromise;
}

export async function flushCloudBackupIfEnabled(db: SQLiteDatabase): Promise<void> {
  await syncCloudBackupIfEnabled(db);
}
