import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import webpush from 'npm:web-push@3.6.7';

// Only the platform owner can request an owner-device test. Normal users cannot
// trigger pushes to other users. Production event dispatch will be a later step.
const allowedOrigins = new Set([
  'https://dgpfinds.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://dgpfinds.vercel.app',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  };
}
function response(request: Request, status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders(request) });
}

// Push endpoints are effectively outbound URLs submitted by clients.
// Allow browser-operated push services only; avoid server-side request forgery.
function isBrowserPushEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return false;
    if (host === 'fcm.googleapis.com' || host === 'android.googleapis.com' || host === 'updates.push.services.mozilla.com') return true;
    if (host === 'web.push.apple.com' || host.endsWith('.push.apple.com')) return true;
    if (host.endsWith('.notify.windows.com')) return true;
    return false;
  } catch { return false; }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== 'POST') return response(request, 405, { error: 'Method not allowed' });
  const authHeader = request.headers.get('Authorization') || '';
  const token = /^Bearer\s+(.+)$/i.exec(authHeader)?.[1];
  if (!token) return response(request, 401, { error: 'Sign in required' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!supabaseUrl || !serviceKey || !publicKey || !privateKey) {
    return response(request, 503, { error: 'Push sender is awaiting server-side key setup' });
  }

  let body: { action?: string };
  try { body = await request.json(); }
  catch { return response(request, 400, { error: 'Invalid JSON' }); }
  if (body?.action !== 'test-self') return response(request, 400, { error: 'Unknown action' });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: caller, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !caller.user) return response(request, 401, { error: 'Invalid session' });

  const { data: owner, error: ownerError } = await admin.from('platform_owners')
    .select('user_id').eq('user_id', caller.user.id).maybeSingle();
  if (ownerError || !owner) return response(request, 403, { error: 'Owner access required for test pushes' });

  const { data: devices, error: devicesError } = await admin.from('push_subscriptions')
    .select('id, endpoint, p256dh_key, auth_key')
    .eq('user_id', caller.user.id)
    .limit(10);
  if (devicesError) return response(request, 503, { error: 'Could not read push subscriptions' });
  if (!devices?.length) return response(request, 200, { sent: 0, failed: 0, message: 'No registered devices yet' });

  webpush.setVapidDetails('https://dgpfinds.vercel.app', publicKey, privateKey);
  const payload = JSON.stringify({
    title: 'DGP Finds',
    body: 'Test successful! Your phone can receive DGP Finds updates.',
    url: '/profile',
    tag: 'dgp-push-test',
  });
  let sent = 0;
  let failed = 0;
  for (const device of devices) {
    if (!isBrowserPushEndpoint(device.endpoint)) { failed++; continue; }
    try {
      await webpush.sendNotification({
        endpoint: device.endpoint,
        keys: { p256dh: device.p256dh_key, auth: device.auth_key },
      }, payload, { TTL: 3600, urgency: 'normal', timeout: 8000 });
      sent++;
    } catch (error) {
      failed++;
      const status = error && typeof error === 'object' && 'statusCode' in error
        ? Number(error.statusCode) : 0;
      if (status === 404 || status === 410) {
        await admin.from('push_subscriptions').delete().eq('id', device.id);
      }
      console.error('Push delivery failed', { status });
    }
  }
  return response(request, 200, { sent, failed });
});
