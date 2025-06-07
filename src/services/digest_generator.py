from models.user import User
from models.digest import Digest, DigestItem
from models.content import ContentSource, ContentItem, Summary
from services.email_service import send_digest_email
from services.audio_service import generate_digest_audio
from main import db
import logging
from datetime import datetime, date, timedelta

logger = logging.getLogger(__name__)

def generate_daily_digests():
    """Generate daily digests for all active users"""
    try:
        # Get all users with active subscriptions
        active_users = User.query.filter_by(subscription_status='active').all()
        
        logger.info(f"Generating digests for {len(active_users)} active users")
        
        for user in active_users:
            try:
                generate_digest_for_user(user)
            except Exception as e:
                logger.error(f"Error generating digest for user {user.id}: {str(e)}")
                continue
        
        logger.info("Daily digest generation completed")
        
    except Exception as e:
        logger.error(f"Error in daily digest generation: {str(e)}")

def generate_digest_for_user(user):
    """Generate a digest for a specific user"""
    try:
        today = date.today()
        
        # Check if digest already exists for today
        existing_digest = Digest.query.filter_by(
            user_id=user.id,
            generation_date=today
        ).first()
        
        if existing_digest:
            logger.info(f"Digest already exists for user {user.id} on {today}")
            return existing_digest
        
        # Get user's active content sources
        sources = ContentSource.query.filter_by(
            user_id=user.id,
            is_active=True
        ).all()
        
        if not sources:
            logger.info(f"No active sources for user {user.id}")
            return None
        
        # Get recent content items (last 24-48 hours)
        cutoff_date = datetime.utcnow() - timedelta(hours=48)
        
        recent_summaries = db.session.query(Summary)\
            .join(ContentItem)\
            .join(ContentSource)\
            .filter(
                ContentSource.user_id == user.id,
                ContentSource.is_active == True,
                ContentItem.published_date >= cutoff_date,
                Summary.summary_text.isnot(None)
            )\
            .order_by(ContentItem.published_date.desc())\
            .limit(20)\
            .all()  # Limit to 20 most recent summaries
        
        if not recent_summaries:
            logger.info(f"No recent content for user {user.id}")
            return None
        
        # Create digest
        digest_title = f"Your Daily Digest for {today.strftime('%B %d, %Y')}"
        
        digest = Digest(
            user_id=user.id,
            title=digest_title,
            generation_date=today
        )
        
        db.session.add(digest)
        db.session.flush()  # Get digest ID
        
        # Add summaries to digest
        for i, summary in enumerate(recent_summaries):
            digest_item = DigestItem(
                digest_id=digest.id,
                summary_id=summary.id,
                order_position=i
            )
            db.session.add(digest_item)
        
        db.session.commit()
        
        logger.info(f"Created digest {digest.id} for user {user.id} with {len(recent_summaries)} items")
        
        # Send email if user has email notifications enabled
        if user.email_notifications:
            try:
                send_digest_email(digest.id)
            except Exception as e:
                logger.error(f"Error sending email for digest {digest.id}: {str(e)}")
        
        # Generate audio version for premium/professional users
        try:
            from models.subscription import Subscription
            current_subscription = Subscription.query.filter_by(
                user_id=user.id,
                status='active'
            ).first()
            
            if (current_subscription and 
                current_subscription.plan_type in ['premium', 'professional']):
                generate_digest_audio(digest.id)
        except Exception as e:
            logger.error(f"Error generating audio for digest {digest.id}: {str(e)}")
        
        return digest
        
    except Exception as e:
        logger.error(f"Error generating digest for user {user.id}: {str(e)}")
        db.session.rollback()
        raise

def get_digest_content_for_email(digest_id):
    """Get digest content formatted for email"""
    try:
        digest = Digest.query.get(digest_id)
        if not digest:
            return None
        
        # Get digest items with summaries
        digest_items = DigestItem.query.filter_by(digest_id=digest.id)\
            .order_by(DigestItem.order_position)\
            .all()
        
        content_items = []
        for item in digest_items:
            summary = Summary.query.get(item.summary_id)
            if summary:
                content_item = ContentItem.query.get(summary.content_item_id)
                source = ContentSource.query.get(content_item.source_id)
                
                content_items.append({
                    'title': content_item.title,
                    'summary': summary.summary_text,
                    'url': content_item.content_url,
                    'source_name': source.name,
                    'published_date': content_item.published_date,
                    'reading_time': summary.reading_time
                })
        
        return {
            'digest': digest,
            'items': content_items
        }
        
    except Exception as e:
        logger.error(f"Error getting digest content for email {digest_id}: {str(e)}")
        return None

def get_digest_content_for_audio(digest_id):
    """Get digest content formatted for audio generation"""
    try:
        digest_content = get_digest_content_for_email(digest_id)
        if not digest_content:
            return None
        
        # Format content for text-to-speech
        audio_text = f"Daily Digest for {digest_content['digest'].generation_date.strftime('%B %d, %Y')}. "
        
        for item in digest_content['items']:
            audio_text += f"From {item['source_name']}. {item['title']}. "
            audio_text += f"{item['summary']} "
        
        return audio_text
        
    except Exception as e:
        logger.error(f"Error getting digest content for audio {digest_id}: {str(e)}")
        return None