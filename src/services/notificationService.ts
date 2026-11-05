/**
 * Browser Web Push Notification Service
 * Dispatches real notifications for maintenance schedules, critical fuel levels, and GPS lost signal.
 */

export interface NotificationStatus {
  supported: boolean;
  permission: NotificationPermission;
}

export function getNotificationStatus(): NotificationStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { supported: false, permission: 'denied' };
  }
  return { supported: true, permission: Notification.permission };
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return Notification.permission;
  }
}

/**
 * Sends a browser push notification via Service Worker or Notification API
 */
export async function sendPushNotification(
  title: string,
  body: string,
  options: {
    tag?: string;
    icon?: string;
    badge?: string;
    data?: any;
    requireInteraction?: boolean;
  } = {}
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  let permission = Notification.permission;
  if (permission !== 'granted') {
    permission = await requestNotificationPermission();
  }

  if (permission !== 'granted') {
    return false;
  }

  const notificationOptions: NotificationOptions = {
    body,
    icon: options.icon || './icon.svg',
    badge: options.badge || './icon.svg',
    tag: options.tag || 'veo-alert',
    data: options.data,
    requireInteraction: options.requireInteraction ?? false,
    silent: false,
  };

  try {
    // Prefer service worker showNotification (works even in background / PWA)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, notificationOptions);
        return true;
      }
    }

    // Direct desktop/mobile Notification fallback
    new Notification(title, notificationOptions);
    return true;
  } catch (err) {
    console.warn('Push notification delivery error:', err);
    try {
      new Notification(title, notificationOptions);
      return true;
    } catch {
      return false;
    }
  }
}

// Throttle tracking keys to avoid spamming the user repeatedly
const lastNotificationTimes: Record<string, number> = {};

function shouldThrottle(key: string, intervalMs: number = 300000): boolean {
  const now = Date.now();
  const last = lastNotificationTimes[key] || 0;
  if (now - last < intervalMs) {
    return true;
  }
  lastNotificationTimes[key] = now;
  return false;
}

/**
 * Check and alert for fuel levels
 */
export function checkAndNotifyFuel(percentage: number, vehicleName: string = 'Xe của bạn') {
  if (percentage <= 15) {
    if (shouldThrottle('fuel_critical', 180000)) return; // Every 3 mins max
    sendPushNotification(
      '🚨 KHẨN CẤP: Bình nhiên liệu sắp cạn!',
      `${vehicleName} chỉ còn ${Math.round(percentage)}% xăng. Hãy ghé trạm xăng gần nhất ngay lập tức!`,
      {
        tag: 'fuel-critical',
        requireInteraction: true,
      }
    );
  } else if (percentage <= 30) {
    if (shouldThrottle('fuel_warning', 600000)) return; // Every 10 mins max
    sendPushNotification(
      '⚠️ Cảnh báo: Sắp đến mức tiếp nhiên liệu',
      `${vehicleName} còn khoảng ${Math.round(percentage)}% xăng (vạch hổ phách). Chuẩn bị đổ xăng nhé!`,
      {
        tag: 'fuel-warning',
      }
    );
  }
}

/**
 * Check and alert for upcoming or overdue maintenance
 */
export function checkAndNotifyMaintenance(
  urgentPart: { name: string; dueKm: number; currentKm: number; isOverdue: boolean } | null,
  vehicleName: string = 'Xe của bạn'
) {
  if (!urgentPart) return;
  if (urgentPart.isOverdue) {
    if (shouldThrottle(`maint_${urgentPart.name}_overdue`, 3600000)) return; // Once per hour
    sendPushNotification(
      '🔧 NHẮC NHỞ: Quá hạn bảo dưỡng linh kiện!',
      `Linh kiện "${urgentPart.name}" của ${vehicleName} đã quá hạn ${urgentPart.currentKm - urgentPart.dueKm} km. Hãy bảo dưỡng ngay để đảm bảo an toàn.`,
      {
        tag: `maint-overdue-${urgentPart.name}`,
        requireInteraction: true,
      }
    );
  } else if (urgentPart.dueKm - urgentPart.currentKm <= 300) {
    if (shouldThrottle(`maint_${urgentPart.name}_near`, 3600000)) return;
    sendPushNotification(
      '📅 Sắp đến lịch bảo dưỡng định kỳ',
      `Linh kiện "${urgentPart.name}" cần kiểm tra sau ${urgentPart.dueKm - urgentPart.currentKm} km nữa.`,
      {
        tag: `maint-near-${urgentPart.name}`,
      }
    );
  }
}

/**
 * Check and alert for GPS signal lost
 */
export function notifyGpsLost(vehicleName: string = 'Xe của bạn') {
  if (shouldThrottle('gps_lost', 300000)) return;
  sendPushNotification(
    '📡 Cảnh báo: Mất tín hiệu GPS xe',
    `Hệ thống không nhận được tọa độ thời gian thực của ${vehicleName}. Vui lòng bật định vị thiết bị.`,
    {
      tag: 'gps-lost',
    }
  );
}

/**
 * Test push notification
 */
export async function sendTestNotification(): Promise<boolean> {
  return await sendPushNotification(
    '🔔 Veo App · Thông báo hoạt động',
    'Hệ thống thông báo trình duyệt đã kết nối thành công! Bạn sẽ nhận được cảnh báo bảo dưỡng, xăng cộ và GPS ngay cả khi đóng app.',
    {
      tag: 'test-notification',
      requireInteraction: false,
    }
  );
}
