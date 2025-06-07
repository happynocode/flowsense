from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from main import db

class ContentSource(db.Model):
    __tablename__ = 'content_sources'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Source information
    name = db.Column(db.String(200), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    source_type = db.Column(db.String(20), nullable=False)  # podcast, blog, news
    description = db.Column(db.Text, nullable=True)
    
    # RSS configuration
    has_rss = db.Column(db.Boolean, default=False)
    rss_url = db.Column(db.String(500), nullable=True)
    
    # Web scraping configuration
    scraping_selector = db.Column(db.String(200), nullable=True)  # CSS selector for content
    
    # Status and metadata
    is_active = db.Column(db.Boolean, default=True)
    last_scraped_at = db.Column(db.DateTime, nullable=True)
    last_error = db.Column(db.Text, nullable=True)
    error_count = db.Column(db.Integer, default=0)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    content_items = db.relationship('ContentItem', backref='source', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<ContentSource {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'url': self.url,
            'source_type': self.source_type,
            'description': self.description,
            'has_rss': self.has_rss,
            'rss_url': self.rss_url,
            'scraping_selector': self.scraping_selector,
            'is_active': self.is_active,
            'last_scraped_at': self.last_scraped_at.isoformat() if self.last_scraped_at else None,
            'last_error': self.last_error,
            'error_count': self.error_count,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class ContentItem(db.Model):
    __tablename__ = 'content_items'
    
    id = db.Column(db.Integer, primary_key=True)
    source_id = db.Column(db.Integer, db.ForeignKey('content_sources.id'), nullable=False, index=True)
    
    # Content information
    title = db.Column(db.String(500), nullable=False)
    content_url = db.Column(db.String(500), nullable=False, unique=True, index=True)
    content_text = db.Column(db.Text, nullable=True)
    published_date = db.Column(db.DateTime, nullable=True, index=True)
    
    # Media information (for podcasts)
    audio_url = db.Column(db.String(500), nullable=True)
    transcript = db.Column(db.Text, nullable=True)
    duration = db.Column(db.Integer, nullable=True)  # in seconds
    
    # Processing status
    is_processed = db.Column(db.Boolean, default=False)
    processing_error = db.Column(db.Text, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    summaries = db.relationship('Summary', backref='content_item', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<ContentItem {self.title}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'source_id': self.source_id,
            'title': self.title,
            'content_url': self.content_url,
            'content_text': self.content_text,
            'published_date': self.published_date.isoformat() if self.published_date else None,
            'audio_url': self.audio_url,
            'transcript': self.transcript,
            'duration': self.duration,
            'is_processed': self.is_processed,
            'processing_error': self.processing_error,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Summary(db.Model):
    __tablename__ = 'summaries'
    
    id = db.Column(db.Integer, primary_key=True)
    content_item_id = db.Column(db.Integer, db.ForeignKey('content_items.id'), nullable=False, index=True)
    
    # Summary content
    summary_text = db.Column(db.Text, nullable=False)
    summary_length = db.Column(db.Integer, nullable=True)  # character count
    reading_time = db.Column(db.Integer, nullable=True)  # estimated reading time in minutes
    
    # AI processing metadata
    model_used = db.Column(db.String(50), nullable=True)
    processing_time = db.Column(db.Float, nullable=True)  # in seconds
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    digest_items = db.relationship('DigestItem', backref='summary', lazy=True)
    
    def __repr__(self):
        return f'<Summary for ContentItem {self.content_item_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'content_item_id': self.content_item_id,
            'summary_text': self.summary_text,
            'summary_length': self.summary_length,
            'reading_time': self.reading_time,
            'model_used': self.model_used,
            'processing_time': self.processing_time,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }