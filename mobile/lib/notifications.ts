import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants, { AppOwnership } from "expo-constants";
import { api } from "./api";

// Push notifications using expo-notifications require native modules (like ExpoTopicSubscriptionModule)
// that are not bundled in the standard Android Expo Go client.
// In Expo Go, we gracefully mock/skip notifications to prevent startup crashes.
// Full remote push notifications work seamlessly in EAS builds and development builds (npx expo run:android).
const isExpoGo =
  Constants.appOwnership === AppOwnership.Expo ||
  Constants.appOwnership === "expo";

let Notifications: typeof import("expo-notifications") | null = null;

if (!isExpoGo) {
  try {
    Notifications = require("expo-notifications");
    if (Notifications && Notifications.setNotificationHandler) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    }
  } catch (err) {
    console.warn("[Notifications] Native notification module not available:", err);
  }
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (isExpoGo || !Notifications) {
    return null;
  }

  let token: string | null = null;

  try {
    // Set up Android notification channel
    if (Platform.OS === "android" && Notifications.setNotificationChannelAsync) {
      await Notifications.setNotificationChannelAsync("avero_study_prompts", {
        name: "Study Prompts & Reminders",
        importance: Notifications.AndroidImportance?.MAX ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2866E1",
        sound: "default",
      });
    }

    // Device check (Push notifications require physical hardware)
    if (!Device.isDevice) {
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;

    const pushTokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    token = pushTokenData.data;

    // Register token with Avero backend
    if (token) {
      await api.post("/api/user/push-token", { pushToken: token }).catch((err) => {
        console.warn("Failed to register push token with backend:", err);
      });
    }
  } catch (error) {
    console.warn("[Notifications] Error registering for push notifications:", error);
  }

  return token;
}
