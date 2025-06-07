from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from main import db

class Digest(db.Model):
    __tablename__ = 'digests'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Digest information
    title = db.Column(db.String(200), nullable=False)
    generation_date = db.Column(db.Date, nullable=False, index=True)
    
    # Email delivery status
    email_sent = db.Column(db.Boolean, default=False)
    email_sent_at = db.Column(db.DateTime, nullable=True)
    
    # Audio version
    audio_url = db.Column(db.String(500), nullable=True)
    audio_duration = db.Column(db.Integer, nullable=True)  # in seconds
    
    # Reading status
    is_read = db.Column(db.Boolean, default=False)
    read_at = db.Column(db.DateTime, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    digest_items = db.relationship('DigestItem', backref='digest', lazy=True, cascade='all, delete-orphan', order_by='DigestItem.order_position')
    
    def __repr__(self):
        return f'<Digest {self.title}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'generation_date': self.generation_date.isoformat(),
            'email_sent': self.email_sent,
            'email_sent_at': self.email_sent_at.isoformat() if self.email_sent_at else None,
            'audio_url': self.audio_url,
            'audio_duration': self.audio_duration,
            'is_read': self.is_read,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'items_count': len(self.digest_items)
        }
    
    def to_dict_with_items(self):
        """Return digest with all items included"""
        digest_dict = self.to_dict()
        digest_dict['items'] = [item.to_dict_with_summary() for item in self.digest_items]
        return digest_dict

class DigestItem(db.Model):
    __tablename__ = 'digest_items'
    
    id = db.Column(db.Integer, primary_key=True)
    digest_id = db.Column(db.Integer, db.ForeignKey('digests.id'), nullable=False, index=True)
    summary_id = db.Column(db.Integer, db.ForeignKey('summaries.id'), nullable=False, index=True)
    
    # Ordering
    order_position = db.Column(db.Integer, nullable=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<DigestItem {self.digest_id}-{self.summary_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'digest_id': self.digest_id,
            'summary_id': self.summary_id,
            'order_position': self.order_position,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    def to_dict_with_summary(self):
        """Return digest item with summary and content item details"""
        item_dict = self.to_dict()
        if self.summary:
            summary_dict = self.summary.to_dict()
            if self.summary.content_item:
                content_item = self.summary.content_item
                source = content_item.source
                
                summary_dict['content_item'] = {
                    'id': content_item.id,
                    'title': content_item.title,
                    'content_url': content_item.content_url,
                    'published_date': content_item.published_date.isoformat() if content_item.published_date else None,
                    'source': {
                        'id': source.id,
                        'name': source.name,
                        'source_type': source.source_type
                    }
                }
            
            item_dict['summary'] = summary_dict
        
        return item_dict