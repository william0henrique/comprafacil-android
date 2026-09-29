import * as Location from "expo-location";
import { Linking } from "react-native";

export type Coordinates = { latitude: number; longitude: number };

export async function getForegroundLocation(): Promise<Coordinates> {
  const current = await Location.getForegroundPermissionsAsync();
  const permission = current.granted ? current : await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error("Permissão de localização não concedida.");
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

export async function openDirections(input: { latitude?: number | null; longitude?: number | null; address?: string | null }): Promise<boolean> {
  const hasCoordinates = input.latitude != null && input.longitude != null;
  const query = hasCoordinates
    ? `${input.latitude},${input.longitude}`
    : (input.address ?? "").trim();
  if (!query) return false;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) return false;
  await Linking.openURL(url);
  return true;
}
