import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

/** Resolve the server endpoint for the optional user-initiated nearby-place lookup. */
export function getApiBaseUrl(): string {
  const configured = extra.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
  return configured.replace(/\/$/, "");
}
