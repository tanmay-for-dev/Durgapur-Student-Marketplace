import { getPushSupport } from "./pushNotifications.js";

// A short signup window prevents onboarding prompts for established users.
const SIGNUP_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const KEY_PREFIX = "dgpfinds:push-onboarding:v1:";
const fallbackState = new Map();

function storageKey(userId) {
  return `${KEY_PREFIX}${userId}`;
}

function loadState(userId) {
  if (!userId) return {};
  try {
    const value = localStorage.getItem(storageKey(userId));
    return value ? JSON.parse(value) || {} : fallbackState.get(userId) || {};
  } catch {
    return fallbackState.get(userId) || {};
  }
}

function saveState(userId, patch) {
  if (!userId) return;
  const next = { ...loadState(userId), ...patch };
  fallbackState.set(userId, next);
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch {
    // Still works for the current tab when storage is unavailable.
  }
}

export function isNewlyRegisteredUser(user) {
  if (!user?.id || !user.created_at) return false;
  const accountCreated = Date.parse(user.created_at);
  const age = Date.now() - accountCreated;
  return Number.isFinite(age) && age >= 0 && age <= SIGNUP_WINDOW_MS;
}

/** No browser permission requested here; just records the visit. */
export function recordSellerStudioVisit(user) {
  if (!isNewlyRegisteredUser(user)) return;
  saveState(user.id, { visitedSell: true });
}

/** Only show the invitation in the two agreed onboarding moments. */
export function shouldOfferPushInvite(user, occasion) {
  if (!isNewlyRegisteredUser(user)) return false;
  const { supported, permission } = getPushSupport();
  if (!supported || permission === "denied") return false;
  if (!getPushSupport().configured) return false;
  const state = loadState(user.id);
  if (state.decision === "enabled" || state.decision === "not_now") return false;
  if (occasion === "after_submission") return true;
  if (occasion === "returned_home") return state.visitedSell === true;
  return false;
}

/** "Not now" means stop automatic prompts on this browser/account. */
export function rememberPushInviteDecision(user, decision) {
  if (user?.id && (decision === "enabled" || decision === "not_now")) {
    saveState(user.id, { decision });
  }
}
