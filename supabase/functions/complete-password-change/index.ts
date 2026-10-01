import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: cors });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await caller.auth.getUser();
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: cors });

  if (user.app_metadata?.must_change_password !== true) {
    return Response.json({ error: 'Password change is not required for this account.' }, { status: 403, headers: cors });
  }

  try {
    const { password } = await req.json();
    if (typeof password !== 'string' || password.length < 8 || password === '123456') {
      return Response.json({ error: 'Choose a new password with at least 8 characters.' }, { status: 400, headers: cors });
    }

    const admin = createClient(url, serviceRole);
    const appMetadata = { ...user.app_metadata, must_change_password: false };
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      app_metadata: appMetadata,
    });
    if (error) return Response.json({ error: error.message }, { status: 400, headers: cors });

    return Response.json({ id: data.user.id, email: data.user.email, success: true }, { status: 200, headers: cors });
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400, headers: cors });
  }
});
