from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from services.digest_generator import generate_daily_digests
from services.scraper import scrape_content_source
from services.summarizer import summarize_content
from models.content import ContentSource, ContentItem, Summary
from models.user import User
from main import db, app
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Initialize scheduler
scheduler = BackgroundScheduler()

def start_scheduler():
    """Start the background scheduler"""
    try:
        # Schedule content scraping every 3 hours
        scheduler.add_job(
            func=scrape_all_sources,
            trigger=CronTrigger(hour='*/3'),  # Every 3 hours
            id='scrape_content',
            name='Scrape content from all sources',
            replace_existing=True
        )
        
        # Schedule digest generation daily at 6 AM
        scheduler.add_job(
            func=generate_daily_digests,
            trigger=CronTrigger(hour=6, minute=0),  # 6:00 AM daily
            id='generate_digests',
            name='Generate daily digests',
            replace_existing=True
        )
        
        # Schedule cleanup tasks daily at 2 AM
        scheduler.add_job(
            func=cleanup_old_data,
            trigger=CronTrigger(hour=2, minute=0),  # 2:00 AM daily
            id='cleanup_data',
            name='Cleanup old data',
            replace_existing=True
        )
        
        scheduler.start()
        logger.info("Background scheduler started successfully")
        
    except Exception as e:
        logger.error(f"Error starting scheduler: {str(e)}")

def stop_scheduler():
    """Stop the background scheduler"""
    try:
        scheduler.shutdown()
        logger.info("Background scheduler stopped")
    except Exception as e:
        logger.error(f"Error stopping scheduler: {str(e)}")

def scrape_all_sources():
    """Scrape content from all active sources"""
    try:
        with app.app_context():
            logger.info("Starting scheduled content scraping")
            
            # Get all active sources
            sources = ContentSource.query.filter_by(is_active=True).all()
            
            logger.info(f"Found {len(sources)} active sources to scrape")
            
            for source in sources:
                try:
                    process_content_source(source)
                except Exception as e:
                    logger.error(f"Error processing source {source.id}: {str(e)}")
                    # Update error count
                    source.error_count += 1
                    source.last_error = str(e)
                    
                    # Disable source if too many errors
                    if source.error_count >= 5:
                        source.is_active = False
                        logger.warning(f"Disabled source {source.id} due to repeated errors")
                    
                    db.session.commit()
                    continue
            
            logger.info("Completed scheduled content scraping")
            
    except Exception as e:
        logger.error(f"Error in scheduled content scraping: {str(e)}")

def process_content_source(source):
    """Process a single content source"""
    try:
        logger.info(f"Processing source: {source.name} ({source.id})")
        
        # Scrape content
        content_items = scrape_content_source(source)
        
        if not content_items:
            logger.info(f"No new content found for source {source.id}")
            source.last_scraped_at = datetime.utcnow()
            db.session.commit()
            return
        
        logger.info(f"Found {len(content_items)} new items for source {source.id}")
        
        # Process each content item
        for item_data in content_items:
            try:
                # Check if item already exists
                existing_item = ContentItem.query.filter_by(
                    source_id=source.id,
                    content_url=item_data['url']
                ).first()
                
                if existing_item:
                    continue  # Skip if already exists
                
                # Create new content item
                content_item = ContentItem(
                    source_id=source.id,
                    title=item_data['title'],
                    content_url=item_data['url'],
                    content_text=item_data['content'],
                    published_date=item_data['published_date']
                )
                
                db.session.add(content_item)
                db.session.flush()  # Get ID
                
                # Generate summary
                if item_data['content'] and len(item_data['content'].strip()) > 100:
                    summary_text = summarize_content(item_data['content'])
                    
                    if summary_text:
                        from services.summarizer import get_summary_stats
                        stats = get_summary_stats(summary_text)
                        
                        summary = Summary(
                            content_item_id=content_item.id,
                            summary_text=summary_text,
                            summary_length=stats['character_count'],
                            reading_time=stats['reading_time'],
                            model_used='deepseek-chat'
                        )
                        
                        db.session.add(summary)
                        content_item.is_processed = True
                    else:
                        content_item.processing_error = "Failed to generate summary"
                else:
                    content_item.processing_error = "Content too short to summarize"
                
            except Exception as e:
                logger.error(f"Error processing content item: {str(e)}")
                continue
        
        # Update source metadata
        source.last_scraped_at = datetime.utcnow()
        source.error_count = 0  # Reset error count on successful scrape
        source.last_error = None
        
        db.session.commit()
        
        logger.info(f"Successfully processed source {source.id}")
        
    except Exception as e:
        logger.error(f"Error processing content source {source.id}: {str(e)}")
        db.session.rollback()
        raise

def cleanup_old_data():
    """Clean up old data to manage database size"""
    try:
        with app.app_context():
            logger.info("Starting data cleanup")
            
            # Delete content items older than 90 days
            cutoff_date = datetime.utcnow() - timedelta(days=90)
            
            old_items = ContentItem.query.filter(
                ContentItem.published_date < cutoff_date
            ).all()
            
            logger.info(f"Found {len(old_items)} old content items to delete")
            
            for item in old_items:
                db.session.delete(item)
            
            # Delete digests older than 30 days (keep recent ones for user reference)
            digest_cutoff = datetime.utcnow() - timedelta(days=30)
            
            from models.digest import Digest
            old_digests = Digest.query.filter(
                Digest.created_at < digest_cutoff
            ).all()
            
            logger.info(f"Found {len(old_digests)} old digests to delete")
            
            for digest in old_digests:
                db.session.delete(digest)
            
            db.session.commit()
            
            logger.info("Data cleanup completed")
            
    except Exception as e:
        logger.error(f"Error in data cleanup: {str(e)}")
        db.session.rollback()

def run_manual_scraping():
    """Manually trigger content scraping (for testing)"""
    try:
        with app.app_context():
            scrape_all_sources()
    except Exception as e:
        logger.error(f"Error in manual scraping: {str(e)}")

def run_manual_digest_generation():
    """Manually trigger digest generation (for testing)"""
    try:
        with app.app_context():
            generate_daily_digests()
    except Exception as e:
        logger.error(f"Error in manual digest generation: {str(e)}")

# Initialize scheduler when module is imported
if __name__ != '__main__':
    start_scheduler()