import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Haptics are optional feedback: unsupported devices must never interrupt logging.
export async function feedback(kind = 'light') {
  try {
    if (localStorage.getItem('ff-haptics') === 'off') return;
    if (Capacitor.isNativePlatform()) {
      if (kind === 'success') await Haptics.notification({ type: NotificationType.Success });
      else await Haptics.impact({ style: ImpactStyle.Light });
    } else if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(kind === 'success' ? [30, 50, 30] : 10);
    }
  } catch { /* The primary action remains available without haptic support. */ }
}
