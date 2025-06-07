from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from main import db

class Subscription(db.Model):
    __tablename__ = 'subscriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Stripe information
    stripe_customer_id = db.Column(db.String(100), nullable=True)
    stripe_subscription_id = db.Column(db.String(100), nullable=True, unique=True)
    stripe_price_id = db.Column(db.String(100), nullable=True)
    
    # Subscription details
    plan_type = db.Column(db.String(20), nullable=False)  # basic, premium, professional
    status = db.Column(db.String(20), nullable=False)  # active, canceled, past_due, incomplete
    
    # Billing information
    current_period_start = db.Column(db.DateTime, nullable=True)
    current_period_end = db.Column(db.DateTime, nullable=True)
    cancel_at_period_end = db.Column(db.Boolean, default=False)
    canceled_at = db.Column(db.DateTime, nullable=True)
    
    # Pricing
    amount = db.Column(db.Integer, nullable=False)  # in cents
    currency = db.Column(db.String(3), default='usd')
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Subscription {self.plan_type} for User {self.user_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'stripe_customer_id': self.stripe_customer_id,
            'stripe_subscription_id': self.stripe_subscription_id,
            'stripe_price_id': self.stripe_price_id,
            'plan_type': self.plan_type,
            'status': self.status,
            'current_period_start': self.current_period_start.isoformat() if self.current_period_start else None,
            'current_period_end': self.current_period_end.isoformat() if self.current_period_end else None,
            'cancel_at_period_end': self.cancel_at_period_end,
            'canceled_at': self.canceled_at.isoformat() if self.canceled_at else None,
            'amount': self.amount,
            'currency': self.currency,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    def get_plan_details(self):
        """Get plan details including features and limits"""
        plan_details = {
            'basic': {
                'name': 'Basic Plan',
                'price': 4.99,
                'source_limit': 5,
                'features': [
                    'Up to 5 content sources',
                    'Daily digest delivery',
                    'Email summaries',
                    'Web interface access'
                ]
            },
            'premium': {
                'name': 'Premium Plan',
                'price': 9.99,
                'source_limit': 20,
                'features': [
                    'Up to 20 content sources',
                    'Daily digest delivery',
                    'Email summaries',
                    'Audio digest versions',
                    'Web interface access',
                    'Priority support'
                ]
            },
            'professional': {
                'name': 'Professional Plan',
                'price': 14.99,
                'source_limit': -1,  # unlimited
                'features': [
                    'Unlimited content sources',
                    'Daily digest delivery',
                    'Email summaries',
                    'Audio digest versions',
                    'Web interface access',
                    'Priority support',
                    'Advanced analytics'
                ]
            }
        }
        
        return plan_details.get(self.plan_type, {})