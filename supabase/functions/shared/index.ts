// This is a placeholder file to make Supabase CLI happy
// The actual functionality is in utils.ts and cors.ts
// This function just returns a simple response to indicate it's working

import { corsHeaders } from './cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  return new Response(
    JSON.stringify({
      message: "This is a utility module. It's not meant to be called directly.",
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    }
  )
}) 