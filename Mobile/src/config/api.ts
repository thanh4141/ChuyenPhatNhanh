import { Platform } from "react-native";
import Constants from "expo-constants";

// Expo Go supplies the development computer's current LAN address.
// An explicit URL still takes priority for a deployed API or a separate tunnel.
const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
const hostUri = Constants.expoConfig?.hostUri;
function developmentUrl() {
  if (Platform.OS !== "web" && __DEV__ && hostUri) {
    try {
      const host = new URL(
        hostUri.includes("://") ? hostUri : "http://" + hostUri,
      ).hostname;
      return `http://${host}:3000/api`;
    } catch {
      /* Fall back for simulators without an Expo host URI. */
    }
  }
  return Platform.OS === "android"
    ? "http://10.0.2.2:3000/api"
    : "http://localhost:3000/api";
}
export const API_URL = (configured || developmentUrl()).replace(/\/$/, "");
