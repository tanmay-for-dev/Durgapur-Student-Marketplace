import { supabase } from '../lib/supabase.js';

function base64UrlToUint8Array(base64Url) {
  const padded = base64Url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64Url.length / 4) * 4, '=');
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

/** Safe to call while rendering: never triggers a permission prompt. */
export function getPushSupport() {
  return {
    supported: typeof window !== 'undefined' &&
      window.isSecureContext &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window,
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  };
}

/** Only call in direct response to the branded Enable notifications button. */
export async function enablePushForCurrentUser() {
  if (!getPushSupport().supported) throw new Error('Push notifications are not supported on this device/browser.');
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error('Missing VITE_VAPID_PUBLIC_KEY; finish push setup first.');

  // Call requestPermission before the first await, preserving the user gesture
  // needed on browsers such as Safari. The button is shown only to signed-in users.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { enabled: false, permission };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) throw new Error('Please sign in first.');

  const registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8Array(publicKey),
  });
  const record = subscription.toJSON();
  if (!record.endpoint || !record.keys?.p256dh || !record.keys?.auth) {
    throw new Error('Browser returned an incomplete push subscription.');
  }

  const { error: dbError } = await supabase.from('push_subscriptions').upsert({
    user_id: authData.user.id,
    endpoint: record.endpoint,
    p256dh_key: record.keys.p256dh,
    auth_key: record.keys.auth,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });

  if (dbError) throw dbError;
  return { enabled: true, permission: 'granted' };
}

/** Call from a user action when opting out on this browser. */
export async function disablePushForCurrentUser() {
  if (!getPushSupport().supported) return false;
  const registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration) return false;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return false;
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
  if (error) throw error;
  await subscription.unsubscribe();
  return true;
}

/** Owner-only manual test; no seller or moderator event is wired yet. */
export async function sendTestPushToMyDevices() {
  const { data, error } = await supabase.functions.invoke('send-test-push', { body: { action: 'test-self' } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
