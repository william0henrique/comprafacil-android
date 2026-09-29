import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { addDatabaseChangeListener, SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";
import "@/lib/_core/nativewind-pressable";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { initializeLocalDatabase } from "@/lib/local-db";
import { configurePriceNotifications } from "@/lib/notifications";

export const unstable_settings = { anchor: "(tabs)" };

const BACKUP_TABLES = new Set([
  "stores", "shopping_lists", "products", "list_items", "price_observations",
  "price_history", "alert_preferences", "alert_events", "app_settings",
]);

function CloudBackupBridge() {
  const db = useSQLiteContext();
  useEffect(() => {
    if (Platform.OS !== "android") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const subscription = addDatabaseChangeListener((event) => {
      if (event.databaseName !== "main" || !BACKUP_TABLES.has(event.tableName)) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void import("@/lib/cloud-backup-client")
          .then(({ syncCloudBackupIfEnabled }) => syncCloudBackupIfEnabled(db))
          .catch(() => undefined);
      }, 1_000);
    });
    void import("@/lib/cloud-backup-client")
      .then(({ flushCloudBackupIfEnabled }) => flushCloudBackupIfEnabled(db))
      .catch(() => undefined);
    return () => {
      subscription.remove();
      if (timer) clearTimeout(timer);
    };
  }, [db]);
  return null;
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
  }));
  const [trpcClient] = useState(() => createTRPCClient());

  useEffect(() => {
    void configurePriceNotifications().catch(() => undefined);
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SQLiteProvider databaseName="comprafacil.db" options={{ enableChangeListener: true }} onInit={initializeLocalDatabase}>
          <CloudBackupBridge />
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="lists/[id]" />
                <Stack.Screen name="lists/[id]/compare" />
                <Stack.Screen name="products/index" />
                <Stack.Screen name="products/[id]" />
                <Stack.Screen name="alerts" />
                <Stack.Screen name="settings" />
              </Stack>
              <StatusBar style="dark" />
            </QueryClientProvider>
          </trpc.Provider>
        </SQLiteProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
