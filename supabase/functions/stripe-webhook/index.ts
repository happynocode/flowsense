import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import Stripe from 'https://esm.sh/stripe@12.9.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2022-11-15',
})

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (request) => {
  const signature = request.headers.get('Stripe-Signature')
  const body = await request.text()
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    console.error('Missing signature or webhook secret')
    return new Response('Missing signature or webhook secret', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message)
    return new Response(`Webhook Error: ${error.message}`, { status: 400 })
  }

  console.log('Processing webhook event:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event)
        break
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event)
        break
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(`Webhook Error: ${error.message}`, { status: 500 })
  }
})

async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session
  console.log('Checkout session completed:', session.id)

  const userId = session.metadata?.supabase_user_id
  if (!userId) {
    console.error('No user ID found in session metadata')
    return
  }

  // 获取订阅信息
  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
    await updateUserSubscription(userId, subscription)
  }
}

async function handleSubscriptionCreated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription
  console.log('Subscription created:', subscription.id)

  const userId = subscription.metadata?.supabase_user_id
  if (!userId) {
    console.error('No user ID found in subscription metadata')
    return
  }

  await updateUserSubscription(userId, subscription)
}

async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription
  console.log('Subscription updated:', subscription.id)

  const userId = subscription.metadata?.supabase_user_id
  if (!userId) {
    // 尝试通过customer ID查找用户
    const customer = await stripe.customers.retrieve(subscription.customer as string)
    const customerUserId = (customer as Stripe.Customer).metadata?.supabase_user_id
    if (customerUserId) {
      await updateUserSubscription(customerUserId, subscription)
    } else {
      console.error('No user ID found in subscription or customer metadata')
    }
    return
  }

  await updateUserSubscription(userId, subscription)
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription
  console.log('Subscription deleted:', subscription.id)

  const userId = subscription.metadata?.supabase_user_id
  if (!userId) {
    console.error('No user ID found in subscription metadata')
    return
  }

  // 将用户权限重置为免费用户
  await updateUserToFreeTier(userId)
}

async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice
  console.log('Invoice payment succeeded:', invoice.id)

  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    const userId = subscription.metadata?.supabase_user_id
    if (userId) {
      await updateUserSubscription(userId, subscription)
    }
  }
}

async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice
  console.log('Invoice payment failed:', invoice.id)

  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    const userId = subscription.metadata?.supabase_user_id
    if (userId) {
      // 可以在这里发送支付失败通知等
      console.log(`Payment failed for user ${userId}`)
    }
  }
}

async function updateUserSubscription(userId: string, subscription: Stripe.Subscription) {
  console.log('Updating user subscription:', { userId, subscriptionId: subscription.id })

  try {
    // 使用正确的 upsert 语法来处理重复的订阅ID
    const { error: subscriptionError } = await supabaseClient
      .from('subscriptions')
      .upsert({
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        stripe_price_id: subscription.items.data[0]?.price.id,
        plan_type: subscription.items.data[0]?.price.nickname || 'premium',
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        amount: subscription.items.data[0]?.price.unit_amount || 0,
        currency: subscription.items.data[0]?.price.currency || 'usd',
      }, {
        onConflict: 'stripe_subscription_id',
        ignoreDuplicates: false
      })

    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError)
      throw subscriptionError
    }

    console.log('Subscription record updated successfully')

    // 根据订阅状态更新用户权限
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      await updateUserToPremiumTier(userId)
    } else if (['canceled', 'unpaid', 'past_due'].includes(subscription.status)) {
      await updateUserToFreeTier(userId)
    }

    console.log('Successfully updated user subscription')
  } catch (error) {
    console.error('Error updating user subscription:', error)
    throw error
  }
}

async function updateUserToPremiumTier(userId: string) {
  console.log('Updating user to premium tier:', userId)

  const { error } = await supabaseClient
    .from('users')
    .update({
      max_sources: 20,
      can_schedule_digest: true,
      can_process_weekly: true,
      subscription_tier: 'premium',
    })
    .eq('id', userId)

  if (error) {
    console.error('Error updating user to premium tier:', error)
    throw error
  }

  console.log('Successfully updated user to premium tier')
}

async function updateUserToFreeTier(userId: string) {
  console.log('Updating user to free tier:', userId)

  const { error } = await supabaseClient
    .from('users')
    .update({
      max_sources: 3,
      can_schedule_digest: false,
      can_process_weekly: false,
      subscription_tier: 'free',
    })
    .eq('id', userId)

  if (error) {
    console.error('Error updating user to free tier:', error)
    throw error
  }

  console.log('Successfully updated user to free tier')
} 