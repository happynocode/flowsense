from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
from main import db

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    google_id = db.Column(db.String(100), unique=True, nullable=True, index=True)
    name = db.Column(db.String(100), nullable=False)
    avatar_url = db.Column(db.String(255), nullable=True)
    
    # Subscription fields
    subscription_status = db.Column(db.String(20), default='inactive')  # active, inactive, canceled
    subscription_expiry = db.Column(db.DateTime, nullable=True)
    stripe_customer_id = db.Column(db.String(100), nullable=True)
    
    # Preferences
    email_notifications = db.Column(db.Boolean, default=True)
    digest_frequency = db.Column(db.String(20), default='daily')  # daily, weekly
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    content_sources = db.relationship('ContentSource', backref='user', lazy=True, cascade='all, delete-orphan')
    digests = db.relationship('Digest', backref='user', lazy=True, cascade='all, delete-orphan')
    subscriptions = db.relationship('Subscription', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<User {self.email}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'avatar_url': self.avatar_url,
            'subscription_status': self.subscription_status,
            'subscription_expiry': self.subscription_expiry.isoformat() if self.subscription_expiry else None,
            'email_notifications': self.email_notifications,
            'digest_frequency': self.digest_frequency,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None
        }
    
    def is_subscribed(self):
        """Check if user has an active subscription"""
        return (self.subscription_status == 'active' and 
                self.subscription_expiry and 
                self.subscription_expiry > datetime.utcnow())
    
    def get_source_limit(self):
        """Get the maximum number of sources based on subscription"""
        if not self.is_subscribed():
            return 0
        
        # Get current subscription to determine limits
        current_subscription = Subscription.query.filter_by(
            user_id=self.id,
            status='active'
        ).first()
        
        if current_subscription:
            plan_limits = {
                'basic': 5,
                'premium': 20,
                'professional': -1  # unlimited
            }
            return plan_limits.get(current_subscription.plan_type, 0)
        
        return 0