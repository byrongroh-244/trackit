import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://byrongroh-244.github.io';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Verify caller is a real authenticated user
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

  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'Server not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { mode, today } = body;

    // ── Mode: vision — parse image or PDF via Claude vision ──────────────────
    if (mode === 'vision' || mode === 'pdf') {
      const { data: base64, mimeType } = body;

      if (!base64 || !mimeType) {
        return new Response(JSON.stringify({ error: 'Missing data or mimeType' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const contentType = mimeType === 'application/pdf' ? 'document' : 'image';

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: [
              {
                type: contentType,
                source: { type: 'base64', media_type: mimeType, data: base64 },
              },
              {
                type: 'text',
                text: `Today is ${today}. Extract all assignments, tests, quizzes, and projects from this syllabus. Return ONLY a JSON array, no other text, no markdown. Each item: name (string), dueDate (YYYY-MM-DD, skip if no date), type (homework|test|quiz|project|other). Only include items with a due date. Keep names concise (under 60 chars).`,
              },
            ],
          }],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        return new Response(JSON.stringify({ error: err.error?.message ?? `Anthropic error ${response.status}` }), {
          status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data  = await response.json();
      const text  = data.content.map((b: any) => b.text ?? '').join('');
      let clean   = text.replace(/```json|```/g, '').trim();

      // If the response was cut off mid-array, close it gracefully
      if (clean.startsWith('[') && !clean.endsWith(']')) {
        const lastComma = clean.lastIndexOf(',');
        const lastBrace = clean.lastIndexOf('}');
        if (lastBrace > lastComma) {
          clean = clean.slice(0, lastBrace + 1) + ']';
        } else if (lastComma > 0) {
          clean = clean.slice(0, lastComma) + ']';
        } else {
          clean = '[]';
        }
      }

      return new Response(clean, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Mode: subtasks — generate step-by-step plan for an assignment ────────
    if (mode === 'subtasks') {
      const { assignmentName, dueDate, gradeLevel } = body;

      if (!assignmentName) {
        return new Response(JSON.stringify({ error: 'Missing assignmentName' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          messages: [{
            role: 'user',
            content: `Generate 3-5 concrete, actionable steps to complete this assignment for a ${gradeLevel ?? 'high school'} student. Assignment: "${assignmentName}". Due: ${dueDate ?? 'soon'}. Return ONLY a JSON object with a "steps" array of short strings (max 8 words each). No other text.`,
          }],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        return new Response(JSON.stringify({ error: err.error?.message ?? `Anthropic error ${response.status}` }), {
          status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data  = await response.json();
      const text  = data.content.map((b: any) => b.text ?? '').join('');
      const clean = text.replace(/```json|```/g, '').trim();

      return new Response(clean, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown mode: ${mode}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});