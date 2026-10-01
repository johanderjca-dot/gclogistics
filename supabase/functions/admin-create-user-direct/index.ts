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

  const admin = createClient(url, serviceRole);
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403, headers: cors });

  try {
    const { email, full_name } = await req.json();
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Enter a valid email address.' }, { status: 400, headers: cors });
    }
    const normalizedEmail = email.trim();
    const safeName = typeof full_name === 'string' ? full_name.trim().slice(0, 120) : '';
    const { data, error } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: '123456',
      email_confirm: true,
      user_metadata: { full_name: safeName },
      app_metadata: { must_change_password: true },
    });
    if (error) return Response.json({ error: error.message }, { status: 400, headers: cors });
    return Response.json({ id: data.user.id, email: data.user.email }, { status: 200, headers: cors });
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400, headers: cors });
  }
});
