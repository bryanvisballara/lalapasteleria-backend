import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export const triggerMediumImpact = async () => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    // No bloquea el flujo de la app si falla la vibración.
  }
};
