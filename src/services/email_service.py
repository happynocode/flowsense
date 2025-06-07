from flask_mail import Message
from main import mail, app
from services.digest_generator import get_digest_content_for_email
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

def send_digest_email(digest_id):
    """Send email with digest content"""
    try:
        # Get digest content
        digest_content = get_digest_content_for_email(digest_id)
        if not digest_content:
            logger.error(f"No content found for digest {digest_id}")
            return False
        
        digest = digest_content['digest']
        items = digest_content['items']
        
        # Get user
        from models.user import User
        user = User.query.get(digest.user_id)
        if not user:
            logger.error(f"User not found for digest {digest_id}")
            return False
        
        # Build email content
        html_content = build_email_html(digest, items, user)
        text_content = build_email_text(digest, items, user)
        
        # Create message
        msg = Message(
            subject=digest.title,
            recipients=[user.email],
            html=html_content,
            body=text_content
        )
        
        # Send email
        with app.app_context():
            mail.send(msg)
        
        # Update digest
        from main import db
        digest.email_sent = True
        digest.email_sent_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"Successfully sent digest email {digest_id} to {user.email}")
        return True
        
    except Exception as e:
        logger.error(f"Error sending digest email {digest_id}: {str(e)}")
        return False

def build_email_html(digest, items, user):
    """Build HTML email content"""
    try:
        # Calculate total reading time
        total_reading_time = sum(item.get('reading_time', 0) for item in items)
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{digest.title}</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #5643CC 0%, #00A6FB 100%);
                    color: white;
                    padding: 30px 20px;
                    border-radius: 8px;
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                }}
                .stats {{
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 6px;
                    margin-bottom: 30px;
                    text-align: center;
                }}
                .stats p {{
                    margin: 0;
                    color: #666;
                    font-size: 14px;
                }}
                .item {{
                    background: white;
                    border: 1px solid #e9ecef;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 20px;
                }}
                .item h2 {{
                    margin: 0 0 10px 0;
                    font-size: 18px;
                    color: #2c3e50;
                }}
                .item .meta {{
                    color: #666;
                    font-size: 14px;
                    margin-bottom: 15px;
                }}
                .item .summary {{
                    margin-bottom: 15px;
                    line-height: 1.7;
                }}
                .item .read-more {{
                    display: inline-block;
                    background: #5643CC;
                    color: white;
                    text-decoration: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    font-size: 14px;
                }}
                .footer {{
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #e9ecef;
                    text-align: center;
                    color: #666;
                    font-size: 14px;
                }}
                .footer a {{
                    color: #5643CC;
                    text-decoration: none;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>{digest.title}</h1>
            </div>
            
            <div class="stats">
                <p><strong>{len(items)} summaries</strong> • <strong>{total_reading_time} min read</strong> • Delivered to {user.name}</p>
            </div>
        """
        
        # Add each item
        for item in items:
            published_date = item['published_date'].strftime('%B %d, %Y') if item['published_date'] else 'Unknown date'
            reading_time = item.get('reading_time', 1)
            
            html += f"""
            <div class="item">
                <h2>{item['title']}</h2>
                <div class="meta">
                    From <strong>{item['source_name']}</strong> • {published_date} • {reading_time} min read
                </div>
                <div class="summary">
                    {item['summary']}
                </div>
                <a href="{item['url']}" class="read-more">Read Original</a>
            </div>
            """
        
        # Add footer
        html += f"""
            <div class="footer">
                <p>
                    <a href="#">View this digest online</a> • 
                    <a href="#">Manage your subscription</a> • 
                    <a href="#">Unsubscribe</a>
                </p>
                <p>Daily Content Digest • Powered by AI</p>
            </div>
        </body>
        </html>
        """
        
        return html
        
    except Exception as e:
        logger.error(f"Error building email HTML: {str(e)}")
        return ""

def build_email_text(digest, items, user):
    """Build plain text email content"""
    try:
        total_reading_time = sum(item.get('reading_time', 0) for item in items)
        
        text = f"{digest.title}\n"
        text += "=" * len(digest.title) + "\n\n"
        text += f"{len(items)} summaries • {total_reading_time} min read • Delivered to {user.name}\n\n"
        
        for i, item in enumerate(items, 1):
            published_date = item['published_date'].strftime('%B %d, %Y') if item['published_date'] else 'Unknown date'
            reading_time = item.get('reading_time', 1)
            
            text += f"{i}. {item['title']}\n"
            text += f"From {item['source_name']} • {published_date} • {reading_time} min read\n\n"
            text += f"{item['summary']}\n\n"
            text += f"Read original: {item['url']}\n\n"
            text += "-" * 50 + "\n\n"
        
        text += "Daily Content Digest • Powered by AI\n"
        text += "Manage your subscription or unsubscribe at: [URL]\n"
        
        return text
        
    except Exception as e:
        logger.error(f"Error building email text: {str(e)}")
        return ""

def send_welcome_email(user):
    """Send welcome email to new user"""
    try:
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Welcome to Daily Content Digest</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #5643CC 0%, #00A6FB 100%);
                    color: white;
                    padding: 30px 20px;
                    border-radius: 8px;
                    text-align: center;
                    margin-bottom: 30px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Welcome to Daily Content Digest!</h1>
            </div>
            
            <p>Hi {user.name},</p>
            
            <p>Welcome to Daily Content Digest! We're excited to help you stay informed without the overwhelm.</p>
            
            <p>Here's what happens next:</p>
            <ol>
                <li>Add your favorite content sources (blogs, podcasts, news sites)</li>
                <li>We'll automatically summarize new content using AI</li>
                <li>Receive your personalized digest every morning</li>
            </ol>
            
            <p>Ready to get started? <a href="#">Add your first content source</a></p>
            
            <p>Best regards,<br>The Daily Content Digest Team</p>
        </body>
        </html>
        """
        
        text_content = f"""
        Welcome to Daily Content Digest!
        
        Hi {user.name},
        
        Welcome to Daily Content Digest! We're excited to help you stay informed without the overwhelm.
        
        Here's what happens next:
        1. Add your favorite content sources (blogs, podcasts, news sites)
        2. We'll automatically summarize new content using AI
        3. Receive your personalized digest every morning
        
        Ready to get started? Visit your dashboard to add your first content source.
        
        Best regards,
        The Daily Content Digest Team
        """
        
        msg = Message(
            subject="Welcome to Daily Content Digest!",
            recipients=[user.email],
            html=html_content,
            body=text_content
        )
        
        with app.app_context():
            mail.send(msg)
        
        logger.info(f"Successfully sent welcome email to {user.email}")
        return True
        
    except Exception as e:
        logger.error(f"Error sending welcome email to {user.email}: {str(e)}")
        return False