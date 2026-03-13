import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

let listenersAttached = false;
let nativeInitPromise = null;

export const initPush = async ({
  onToken,
  onPermissionDenied,
  onRegistrationError,
  onPushReceived,
  onPushAction
} = {}) => {
  if (!Capacitor.isNativePlatform()) return false;

  let permission = await PushNotifications.checkPermissions();

  if (permission.receive === "prompt") {
    permission = await PushNotifications.requestPermissions();
  }

  if (permission.receive !== "granted") {
    if (typeof onPermissionDenied === "function") {
      onPermissionDenied();
    }
    return true;
  }

  if (!listenersAttached) {
    PushNotifications.addListener("registration", async (token) => {
      if (typeof onToken === "function") {
        try {
          await onToken(token.value);
        } catch {
          // No bloquea el flujo principal si falla el backend.
        }
      }
    });

    PushNotifications.addListener("registrationError", (error) => {
      if (typeof onRegistrationError === "function") {
        onRegistrationError(error);
      }
    });

    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      if (typeof onPushReceived === "function") {
        onPushReceived(notification);
      }
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      if (typeof onPushAction === "function") {
        onPushAction(action.notification);
      }
    });

    listenersAttached = true;
  }

  if (!nativeInitPromise) {
    nativeInitPromise = PushNotifications.register();
  }

  await nativeInitPromise;
  return true;
};
