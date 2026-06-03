import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
 
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://byrongroh-244.github.io';

// Only these two path shapes are permitted
const ALLOWED_PATHS = [
  /^courses\?/,
  /^courses\/\d+\/assignments\?/,
];

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Verify caller is a real authenticated user — not just anon key
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { domain, token, path } = await req.json();

    if (!domain || !token || !path) {
      return new Response(JSON.stringify({ error: 'Missing domain, token, or path' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Block SSRF — only allow Canvas-hosted domains
    const clean = domain.replace(/https?:\/\//, '').replace(/\/$/, '');
    if (!clean.endsWith('.instructure.com') && !clean.endsWith('.canvas.net')) {
      return new Response(JSON.stringify({ error: 'Domain not allowed' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Block path traversal — only allow known safe paths
    if (!ALLOWED_PATHS.some(re => re.test(path))) {
      return new Response(JSON.stringify({ error: 'Path not allowed' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = `https://${clean}/api/v1/${path}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Canvas returned ${res.status}` }), {
        status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
