import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import Stripe from 'https://esm.sh/stripe@12.9.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    const { userId, userEmail, priceId, successUrl, cancelUrl } = await req.json()

    console.log('Creating checkout session for:', { userId, userEmail, priceId })

    // 获取或创建Stripe客户
    let customer;
    try {
      // 首先尝试从数据库中查找现有的Stripe客户ID
      const { data: existingUser } = await supabaseClient
        .from('users')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single()

      if (existingUser?.stripe_customer_id) {
        // 验证客户是否仍然存在
        try {
          customer = await stripe.customers.retrieve(existingUser.stripe_customer_id)
        } catch (error) {
          console.log('Stripe customer not found, creating new one')
          customer = null
        }
      }

      if (!customer) {
        // 创建新的Stripe客户
        customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            supabase_user_id: userId
          }
        })

        // 更新用户的Stripe客户ID
        await supabaseClient
          .from('users')
          .update({ stripe_customer_id: customer.id })
          .eq('id', userId)

        console.log('Created new Stripe customer:', customer.id)
      }
    } catch (error) {
      console.error('Error handling customer:', error)
      throw new Error('Failed to create or retrieve customer')
    }

    // 创建Checkout会话
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: 7, // 7天免费试用
        metadata: {
          supabase_user_id: userId
        }
      },
      metadata: {
        supabase_user_id: userId
      }
    })

    console.log('Checkout session created:', session.id)

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error creating checkout session:', error)
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