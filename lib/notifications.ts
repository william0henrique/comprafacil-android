import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

export const PRICE_ALERT_CHANNEL = "price-changes";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function configurePriceNotifications(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(PRICE_ALERT_CHANNEL, {
    name: "Mudanças de preço",
    description: "Avisos locais sobre preços que você registrou manualmente.",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: "#1F6B45",
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  await configurePriceNotifications();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Never asks for permission here; the explicit Alerts screen owns that request. */
export async function notifyRecordedPriceChange(input: {
  productName: string;
  storeName: string;
  oldPrice: string;
  newPrice: string;
  direction: "caiu" | "subiu";
  enabled: boolean;
}): Promise<void> {
  if (!input.enabled) return;
  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) return;
  await configurePriceNotifications();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: input.direction === "caiu" ? "Preço informado caiu" : "Preço informado subiu",
      body: `${input.productName} em ${input.storeName}: ${input.oldPrice} → ${input.newPrice}. Dado manual, não verificado pelo supermercado.`,
      data: { type: "user-manual-price-change" },
      ...(Platform.OS === "android" ? { channelId: PRICE_ALERT_CHANNEL } : {}),
    },
    trigger: null,
  });
}

/** Notifies only in response to an explicit manual price entry that crosses the user's saved limit. */
export async function notifyManualPriceThreshold(input: {
  productName: string;
  storeName: string;
  price: string;
  threshold: string;
  enabled: boolean;
}): Promise<void> {
  if (!input.enabled) return;
  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) return;
  await configurePriceNotifications();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Preço informado atingiu seu limite",
      body: `${input.productName} em ${input.storeName}: ${input.price} (limite ${input.threshold}). Dado manual, não verificado pelo supermercado.`,
      data: { type: "user-manual-price-threshold" },
      ...(Platform.OS === "android" ? { channelId: PRICE_ALERT_CHANNEL } : {}),
    },
    trigger: null,
  });
}
