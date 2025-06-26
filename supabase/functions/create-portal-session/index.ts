// Using alternative CDN to avoid deno.land dependency issues
import { createClient } from 'jsr:@supabase/supabase-js@^2'
import Stripe from 'https://cdn.skypack.dev/stripe@12.9.0?dts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2022-11-15',
    })

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, returnUrl } = await req.json()

    console.log('Creating portal session for user:', userId)

    // 获取用户的Stripe客户ID
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (error || !user?.stripe_customer_id) {
      console.error('User or customer ID not found:', error)
      throw new Error('Customer not found')
    }

    // 创建客户门户会话
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: returnUrl,
    })

    console.log('Portal session created:', portalSession.id)

    return new Response(
      JSON.stringify({
        url: portalSession.url
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error creating portal session:', error)
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 