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
    console.log('Function called with method:', req.method)
    
    // 检查环境变量
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Environment check:', {
      hasStripeKey: !!stripeSecretKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      stripeKeyPrefix: stripeSecretKey?.substring(0, 8) + '...',
    })

    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    }
    
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is not set')
    }
    
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2022-11-15',
    })

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // 解析请求体
    let requestBody
    try {
      requestBody = await req.json()
      console.log('Request body parsed:', { 
        hasUserId: !!requestBody.userId,
        hasUserEmail: !!requestBody.userEmail,
        hasPriceId: !!requestBody.priceId,
        priceId: requestBody.priceId
      })
    } catch (error) {
      console.error('Failed to parse request body:', error)
      throw new Error('Invalid JSON in request body')
    }

    const { userId, userEmail, priceId, successUrl, cancelUrl } = requestBody

    if (!userId || !userEmail || !priceId) {
      throw new Error('Missing required fields: userId, userEmail, or priceId')
    }

    console.log('Creating checkout session for:', { userId, userEmail, priceId })

    // 获取或创建Stripe客户
    let customer;
    try {
      // 首先尝试从数据库中查找现有的Stripe客户ID
      const { data: existingUser, error: userError } = await supabaseClient
        .from('users')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single()
      
      if (userError) {
        console.log('User lookup error:', userError)
      }

      if (existingUser?.stripe_customer_id) {
        console.log('Found existing customer ID:', existingUser.stripe_customer_id)
        // 验证客户是否仍然存在
        try {
          customer = await stripe.customers.retrieve(existingUser.stripe_customer_id)
          console.log('Retrieved existing Stripe customer')
        } catch (error) {
          console.log('Stripe customer not found, creating new one:', error.message)
          customer = null
        }
      }

      if (!customer) {
        console.log('Creating new Stripe customer')
        // 创建新的Stripe客户
        customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            supabase_user_id: userId
          }
        })

        console.log('Created new Stripe customer:', customer.id)

        // 更新用户的Stripe客户ID
        const { error: updateError } = await supabaseClient
          .from('users')
          .update({ stripe_customer_id: customer.id })
          .eq('id', userId)
        
        if (updateError) {
          console.error('Failed to update user with customer ID:', updateError)
        }
      }
    } catch (error) {
      console.error('Error handling customer:', error)
      throw new Error(`Failed to create or retrieve customer: ${error.message}`)
    }

    // 创建Checkout会话
    console.log('Creating Stripe checkout session...')
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

    console.log('Checkout session created successfully:', session.id)

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
    console.error('Error in create-checkout-session:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack || 'No stack trace available'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 