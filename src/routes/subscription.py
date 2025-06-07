import stripe
import os
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models.subscription import Subscription
from models.user import User
from main import db
import logging
from datetime import datetime

subscription_bp = Blueprint('subscription', __name__)
logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

@subscription_bp.route('/plans', methods=['GET'])
def get_plans():
    """Get available subscription plans"""
    try:
        plans = [
            {
                'id': 'basic',
                'name': 'Basic Plan',
                'price': 4.99,
                'currency': 'USD',
                'billing_period': 'month',
                'stripe_price_id': os.getenv('STRIPE_BASIC_PRICE_ID', 'price_basic'),
                'features': [
                    'Up to 5 content sources',
                    'Daily digest delivery',
                    'Email summaries',
                    'Web interface access',
                    'Basic support'
                ],
                'source_limit': 5,
                'audio_included': False
            },
            {
                'id': 'premium',
                'name': 'Premium Plan',
                'price': 9.99,
                'currency': 'USD',
                'billing_period': 'month',
                'stripe_price_id': os.getenv('STRIPE_PREMIUM_PRICE_ID', 'price_premium'),
                'features': [
                    'Up to 20 content sources',
                    'Daily digest delivery',
                    'Email summaries',
                    'Audio digest versions',
                    'Web interface access',
                    'Priority support'
                ],
                'source_limit': 20,
                'audio_included': True
            },
            {
                'id': 'professional',
                'name': 'Professional Plan',
                'price': 14.99,
                'currency': 'USD',
                'billing_period': 'month',
                'stripe_price_id': os.getenv('STRIPE_PROFESSIONAL_PRICE_ID', 'price_professional'),
                'features': [
                    'Unlimited content sources',
                    'Daily digest delivery',
                    'Email summaries',
                    'Audio digest versions',
                    'Web interface access',
                    'Priority support',
                    'Advanced analytics'
                ],
                'source_limit': -1,  # unlimited
                'audio_included': True
            }
        ]
        
        return jsonify({
            'success': True,
            'data': plans
        })
        
    except Exception as e:
        logger.error(f"Error getting plans: {str(e)}")
        return jsonify({'error': 'Failed to get plans'}), 500

@subscription_bp.route('', methods=['GET'])
@login_required
def get_subscription():
    """Get current user's subscription"""
    try:
        subscription = Subscription.query.filter_by(
            user_id=current_user.id,
            status='active'
        ).first()
        
        if not subscription:
            return jsonify({
                'success': True,
                'data': None,
                'message': 'No active subscription'
            })
        
        subscription_data = subscription.to_dict()
        subscription_data['plan_details'] = subscription.get_plan_details()
        
        return jsonify({
            'success': True,
            'data': subscription_data
        })
        
    except Exception as e:
        logger.error(f"Error getting subscription: {str(e)}")
        return jsonify({'error': 'Failed to get subscription'}), 500

@subscription_bp.route('', methods=['POST'])
@login_required
def create_subscription():
    """Create a new subscription"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        payment_method_id = data.get('paymentMethodId')
        plan_id = data.get('planId')
        
        if not payment_method_id or not plan_id:
            return jsonify({'error': 'Payment method and plan ID are required'}), 400
        
        # Validate plan
        valid_plans = ['basic', 'premium', 'professional']
        if plan_id not in valid_plans:
            return jsonify({'error': 'Invalid plan ID'}), 400
        
        # Check if user already has an active subscription
        existing_subscription = Subscription.query.filter_by(
            user_id=current_user.id,
            status='active'
        ).first()
        
        if existing_subscription:
            return jsonify({'error': 'User already has an active subscription'}), 400
        
        # Get Stripe price ID based on plan
        price_ids = {
            'basic': os.getenv('STRIPE_BASIC_PRICE_ID', 'price_basic'),
            'premium': os.getenv('STRIPE_PREMIUM_PRICE_ID', 'price_premium'),
            'professional': os.getenv('STRIPE_PROFESSIONAL_PRICE_ID', 'price_professional')
        }
        
        stripe_price_id = price_ids[plan_id]
        
        # Create or get Stripe customer
        if current_user.stripe_customer_id:
            customer = stripe.Customer.retrieve(current_user.stripe_customer_id)
        else:
            customer = stripe.Customer.create(
                email=current_user.email,
                name=current_user.name,
                payment_method=payment_method_id,
                invoice_settings={
                    'default_payment_method': payment_method_id,
                },
            )
            current_user.stripe_customer_id = customer.id
        
        # Attach payment method to customer
        stripe.PaymentMethod.attach(
            payment_method_id,
            customer=customer.id,
        )
        
        # Create subscription
        stripe_subscription = stripe.Subscription.create(
            customer=customer.id,
            items=[{'price': stripe_price_id}],
            payment_behavior='default_incomplete',
            expand=['latest_invoice.payment_intent'],
        )
        
        # Create subscription record
        plan_amounts = {
            'basic': 499,  # $4.99 in cents
            'premium': 999,  # $9.99 in cents
            'professional': 1499  # $14.99 in cents
        }
        
        subscription = Subscription(
            user_id=current_user.id,
            stripe_customer_id=customer.id,
            stripe_subscription_id=stripe_subscription.id,
            stripe_price_id=stripe_price_id,
            plan_type=plan_id,
            status=stripe_subscription.status,
            current_period_start=datetime.fromtimestamp(stripe_subscription.current_period_start),
            current_period_end=datetime.fromtimestamp(stripe_subscription.current_period_end),
            amount=plan_amounts[plan_id],
            currency='usd'
        )
        
        db.session.add(subscription)
        
        # Update user subscription status
        current_user.subscription_status = 'active'
        current_user.subscription_expiry = datetime.fromtimestamp(stripe_subscription.current_period_end)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'subscription_id': subscription.id,
                'stripe_subscription_id': stripe_subscription.id,
                'status': stripe_subscription.status,
                'client_secret': stripe_subscription.latest_invoice.payment_intent.client_secret if stripe_subscription.latest_invoice.payment_intent else None
            }
        })
        
    except stripe.error.CardError as e:
        logger.error(f"Stripe card error: {str(e)}")
        return jsonify({'error': 'Payment failed. Please check your card details.'}), 400
    
    except stripe.error.RateLimitError as e:
        logger.error(f"Stripe rate limit error: {str(e)}")
        return jsonify({'error': 'Too many requests. Please try again later.'}), 429
    
    except stripe.error.InvalidRequestError as e:
        logger.error(f"Stripe invalid request error: {str(e)}")
        return jsonify({'error': 'Invalid payment request.'}), 400
    
    except stripe.error.AuthenticationError as e:
        logger.error(f"Stripe authentication error: {str(e)}")
        return jsonify({'error': 'Payment service error.'}), 500
    
    except stripe.error.APIConnectionError as e:
        logger.error(f"Stripe API connection error: {str(e)}")
        return jsonify({'error': 'Payment service unavailable.'}), 503
    
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        return jsonify({'error': 'Payment processing error.'}), 500
    
    except Exception as e:
        logger.error(f"Error creating subscription: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to create subscription'}), 500

@subscription_bp.route('', methods=['DELETE'])
@login_required
def cancel_subscription():
    """Cancel current subscription"""
    try:
        subscription = Subscription.query.filter_by(
            user_id=current_user.id,
            status='active'
        ).first()
        
        if not subscription:
            return jsonify({'error': 'No active subscription found'}), 404
        
        # Cancel Stripe subscription
        stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=True
        )
        
        # Update subscription record
        subscription.cancel_at_period_end = True
        subscription.canceled_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Subscription will be canceled at the end of the current billing period'
        })
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error canceling subscription: {str(e)}")
        return jsonify({'error': 'Failed to cancel subscription'}), 500
    
    except Exception as e:
        logger.error(f"Error canceling subscription: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to cancel subscription'}), 500

@subscription_bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhooks"""
    try:
        payload = request.get_data()
        sig_header = request.headers.get('Stripe-Signature')
        endpoint_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
        
        if not endpoint_secret:
            logger.error("Stripe webhook secret not configured")
            return jsonify({'error': 'Webhook not configured'}), 400
        
        # Verify webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
        
        # Handle the event
        if event['type'] == 'invoice.payment_succeeded':
            handle_payment_succeeded(event['data']['object'])
        elif event['type'] == 'invoice.payment_failed':
            handle_payment_failed(event['data']['object'])
        elif event['type'] == 'customer.subscription.updated':
            handle_subscription_updated(event['data']['object'])
        elif event['type'] == 'customer.subscription.deleted':
            handle_subscription_deleted(event['data']['object'])
        else:
            logger.info(f"Unhandled webhook event type: {event['type']}")
        
        return jsonify({'success': True})
        
    except ValueError as e:
        logger.error(f"Invalid payload in webhook: {str(e)}")
        return jsonify({'error': 'Invalid payload'}), 400
    
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature in webhook: {str(e)}")
        return jsonify({'error': 'Invalid signature'}), 400
    
    except Exception as e:
        logger.error(f"Error handling webhook: {str(e)}")
        return jsonify({'error': 'Webhook handling failed'}), 500

def handle_payment_succeeded(invoice):
    """Handle successful payment"""
    try:
        subscription_id = invoice['subscription']
        subscription = Subscription.query.filter_by(
            stripe_subscription_id=subscription_id
        ).first()
        
        if subscription:
            subscription.status = 'active'
            user = User.query.get(subscription.user_id)
            if user:
                user.subscription_status = 'active'
            db.session.commit()
            logger.info(f"Payment succeeded for subscription {subscription_id}")
        
    except Exception as e:
        logger.error(f"Error handling payment succeeded: {str(e)}")

def handle_payment_failed(invoice):
    """Handle failed payment"""
    try:
        subscription_id = invoice['subscription']
        subscription = Subscription.query.filter_by(
            stripe_subscription_id=subscription_id
        ).first()
        
        if subscription:
            subscription.status = 'past_due'
            user = User.query.get(subscription.user_id)
            if user:
                user.subscription_status = 'past_due'
            db.session.commit()
            logger.info(f"Payment failed for subscription {subscription_id}")
        
    except Exception as e:
        logger.error(f"Error handling payment failed: {str(e)}")

def handle_subscription_updated(stripe_subscription):
    """Handle subscription update"""
    try:
        subscription = Subscription.query.filter_by(
            stripe_subscription_id=stripe_subscription['id']
        ).first()
        
        if subscription:
            subscription.status = stripe_subscription['status']
            subscription.current_period_start = datetime.fromtimestamp(stripe_subscription['current_period_start'])
            subscription.current_period_end = datetime.fromtimestamp(stripe_subscription['current_period_end'])
            subscription.cancel_at_period_end = stripe_subscription['cancel_at_period_end']
            
            user = User.query.get(subscription.user_id)
            if user:
                user.subscription_status = stripe_subscription['status']
                user.subscription_expiry = datetime.fromtimestamp(stripe_subscription['current_period_end'])
            
            db.session.commit()
            logger.info(f"Subscription updated: {stripe_subscription['id']}")
        
    except Exception as e:
        logger.error(f"Error handling subscription updated: {str(e)}")

def handle_subscription_deleted(stripe_subscription):
    """Handle subscription deletion"""
    try:
        subscription = Subscription.query.filter_by(
            stripe_subscription_id=stripe_subscription['id']
        ).first()
        
        if subscription:
            subscription.status = 'canceled'
            subscription.canceled_at = datetime.utcnow()
            
            user = User.query.get(subscription.user_id)
            if user:
                user.subscription_status = 'canceled'
            
            db.session.commit()
            logger.info(f"Subscription deleted: {stripe_subscription['id']}")
        
    except Exception as e:
        logger.error(f"Error handling subscription deleted: {str(e)}")