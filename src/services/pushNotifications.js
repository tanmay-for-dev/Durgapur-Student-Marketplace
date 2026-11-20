import { supabase } from '../lib/supabase.js';

function base64UrlToUint8Array(base64Url) {
  const normalized = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function getPublicKeyBytes() {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();
  if (!key) throw new Error('Notifications are not configured on this website yet. Please try later.');
  try {
    const bytes = base64UrlToUint8Array(key);
    if (bytes.length !== 65 || bytes[0] !== 4) throw new Error('Unexpected VAPID public key format');
    return bytes;
  } catch {
    throw new Error('Notification setup needs attention. Please try later.');
  }
}

/** Read-only capability check: never requests browser permission. */
export function getPushSupport() {
  const browser = typeof window !== 'undefined' && typeof navigator !== 'undefined';
  const secured = browser && window.isSecureContext;
  const supported = Boolean(
    secured && 'serviceWorker' in navigator &&
    'PushManager' in window && 'Notification' in window
  );
  const permission = browser && 'Notification' in window
    ? Notification.permission : 'unsupported';
  const configured = Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim());
  return { supported, permission, configured };
}

function applicationKeysMatch(subscription, publicKeyBytes) {
  const stored = subscription.options?.applicationServerKey;
  if (!stored) return true; // Older browsers may not expose this property.
  const existing = new Uint8Array(stored);
  return existing.length === publicKeyBytes.length &&
    existing.every((byte, index) => byte === publicKeyBytes[index]);
}

/** Run only when the signed-in user taps Enable notifications. */
export async function enablePushForCurrentUser() {
  const support = getPushSupport();
  if (!support.supported) {
    return { enabled: false, permission: support.permission, reason: 'unsupported' };
  }
  if (support.permission === 'denied') {
    return { enabled: false, permission: 'denied', reason: 'blocked' };
  }
  if (!navigator.onLine) {
    throw new Error('You appear to be offline. Connect to the internet and try again.');
  }

  // Validate configuration BEFORE asking the browser for permission.
  const publicKeyBytes = getPublicKeyBytes();

  // IMPORTANT: If permission has already been granted, do not ask again.
  // Otherwise request permission before the first await to preserve the click gesture.
  let permission = support.permission;
  if (permission !== 'granted') {
    try {
      permission = await Notification.requestPermission();
    } catch {
      permission = Notification.permission;
    }
  }
  if (permission !== 'granted') {
    return {
      enabled: false,
      permission,
      reason: permission === 'denied' ? 'blocked' : 'dismissed',
    };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    throw new Error('Your session expired. Sign in again to enable notifications.');
  }

  let registration;
  let subscription;
  try {
    registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
    // Registration must reach an active state before subscribing.
    await navigator.serviceWorker.ready;
    subscription = await registration.pushManager.getSubscription();
    if (subscription && !applicationKeysMatch(subscription, publicKeyBytes)) {
      // Example: public VAPID key changed between releases.
      await subscription.unsubscribe();
      subscription = null;
    }
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKeyBytes,
      });
    }
  } catch (error) {
    console.warn('DGP Finds push browser registration failed', error);
    throw new Error('Chrome could not register this device. Check notification settings, then try again.');
  }

  const record = subscription.toJSON();
  if (!record.endpoint || !record.keys?.p256dh || !record.keys?.auth) {
    throw new Error('Your browser did not provide a complete subscription. Please try again.');
  }

  // Server-side RPC verifies auth.uid() and safely reassigns an endpoint if
  // the same browser was previously used with a different DGP Finds account.
  const { error: dbError } = await supabase.rpc('register_push_subscription', {
    p_endpoint: record.endpoint,
    p_p256dh_key: record.keys.p256dh,
    p_auth_key: record.keys.auth,
  });
  if (dbError) {
    console.warn('DGP Finds push database registration failed', dbError.code);
    throw new Error('Could not save this device for notifications. Check your connection and try again.');
  }

  return { enabled: true, permission: 'granted' };
}

/** Run BEFORE calling supabase.auth.signOut if available. */
export async function disablePushForCurrentUser() {
  if (!getPushSupport().supported) return false;
  const registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration) return false;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return false;
  const { error } = await supabase.from('push_subscriptions')
    .delete().eq('endpoint', subscription.endpoint);
  if (error) throw error;
  await subscription.unsubscribe();
  return true;
}

/** Fallback for SIGNED_OUT events: stop device delivery even if session is gone.
 * The server removes the expired DB endpoint when its push service returns 404/410. */
export async function stopBrowserPushAfterSignOut() {
  if (!getPushSupport().supported) return false;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return false;
  await subscription.unsubscribe();
  return true;
}

/** Existing owner-only manual test utility, unchanged. */
export async function sendTestPushToMyDevices() {
  const { data, error } = await supabase.functions.invoke('send-test-push', {
    body: { action: 'test-self' },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
