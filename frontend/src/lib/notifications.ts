export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export const notificationsSupported = (): boolean => typeof window !== 'undefined' && 'Notification' in window;

export const currentPermission = (): NotificationPermissionState => {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission as NotificationPermissionState;
};

export const requestPermission = async (): Promise<NotificationPermissionState> => {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission as NotificationPermissionState;
  try {
    const result = await Notification.requestPermission();
    return result as NotificationPermissionState;
  } catch {
    return 'denied';
  }
};

export type ChatNotificationOptions = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
};

export const showChatNotification = async ({ title, body, url, icon, tag }: ChatNotificationOptions): Promise<void> => {
  if (currentPermission() !== 'granted') return;
  const options: NotificationOptions = {
    body,
    icon: icon ?? '/favicon.svg',
    badge: '/favicon.svg',
    tag,
    renotify: true,
    requireInteraction: false,
    silent: false,
  };
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg) { await reg.showNotification(title, options); return; }
    }
    const native = new Notification(title, options);
    if (url) native.onclick = () => { window.focus(); window.location.assign(url); native.close(); };
  } catch { /* silent fail */ }
};