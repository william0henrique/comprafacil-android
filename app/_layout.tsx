import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";
import "@/lib/_core/nativewind-pressable";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { initializeLocalDatabase } from "@/lib/local-db";
import { configurePriceNotifications } from "@/lib/notifications";

export const unstable_settings = { anchor: "(tabs)" };

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
        <SQLiteProvider databaseName="comprafacil.db" onInit={initializeLocalDatabase}>
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
