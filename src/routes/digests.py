from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models.digest import Digest, DigestItem
from models.content import Summary, ContentItem, ContentSource
from main import db
import logging
from datetime import datetime, date

digests_bp = Blueprint('digests', __name__)
logger = logging.getLogger(__name__)

@digests_bp.route('', methods=['GET'])
@login_required
def get_digests():
    """Get all digests for the current user"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Limit per_page to prevent abuse
        per_page = min(per_page, 50)
        
        digests_query = Digest.query.filter_by(user_id=current_user.id)\
            .order_by(Digest.generation_date.desc())
        
        paginated_digests = digests_query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        digests_data = []
        for digest in paginated_digests.items:
            digest_dict = digest.to_dict()
            
            # Add summary count and reading time
            total_reading_time = 0
            for item in digest.digest_items:
                if item.summary:
                    total_reading_time += item.summary.reading_time or 0
            
            digest_dict['total_reading_time'] = total_reading_time
            digest_dict['summary_count'] = len(digest.digest_items)
            
            digests_data.append(digest_dict)
        
        return jsonify({
            'success': True,
            'data': digests_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated_digests.total,
                'pages': paginated_digests.pages,
                'has_next': paginated_digests.has_next,
                'has_prev': paginated_digests.has_prev
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting digests: {str(e)}")
        return jsonify({'error': 'Failed to get digests'}), 500

@digests_bp.route('/<int:digest_id>', methods=['GET'])
@login_required
def get_digest(digest_id):
    """Get a specific digest with all items"""
    try:
        digest = Digest.query.filter_by(
            id=digest_id,
            user_id=current_user.id
        ).first()
        
        if not digest:
            return jsonify({'error': 'Digest not found'}), 404
        
        # Mark as read if not already
        if not digest.is_read:
            digest.is_read = True
            digest.read_at = datetime.utcnow()
            db.session.commit()
        
        # Get digest with all items
        digest_data = digest.to_dict_with_items()
        
        return jsonify({
            'success': True,
            'data': digest_data
        })
        
    except Exception as e:
        logger.error(f"Error getting digest {digest_id}: {str(e)}")
        return jsonify({'error': 'Failed to get digest'}), 500

@digests_bp.route('/<int:digest_id>/read', methods=['PATCH'])
@login_required
def mark_digest_as_read(digest_id):
    """Mark a digest as read"""
    try:
        digest = Digest.query.filter_by(
            id=digest_id,
            user_id=current_user.id
        ).first()
        
        if not digest:
            return jsonify({'error': 'Digest not found'}), 404
        
        digest.is_read = True
        digest.read_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Digest marked as read'
        })
        
    except Exception as e:
        logger.error(f"Error marking digest {digest_id} as read: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to mark digest as read'}), 500

@digests_bp.route('/<int:digest_id>/audio', methods=['GET'])
@login_required
def get_digest_audio(digest_id):
    """Get audio version of a digest"""
    try:
        digest = Digest.query.filter_by(
            id=digest_id,
            user_id=current_user.id
        ).first()
        
        if not digest:
            return jsonify({'error': 'Digest not found'}), 404
        
        if not digest.audio_url:
            # Check if user has audio access based on subscription
            if not current_user.is_subscribed():
                return jsonify({
                    'error': 'Audio feature requires an active subscription'
                }), 403
            
            # Get current subscription to check plan
            from models.subscription import Subscription
            current_subscription = Subscription.query.filter_by(
                user_id=current_user.id,
                status='active'
            ).first()
            
            if current_subscription and current_subscription.plan_type == 'basic':
                return jsonify({
                    'error': 'Audio feature not available in Basic plan'
                }), 403
            
            # Generate audio if not exists (this would be done by a background task)
            return jsonify({
                'error': 'Audio version not yet available. Please try again in a few minutes.'
            }), 202
        
        return jsonify({
            'success': True,
            'data': {
                'audio_url': digest.audio_url,
                'duration': digest.audio_duration
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting digest audio {digest_id}: {str(e)}")
        return jsonify({'error': 'Failed to get digest audio'}), 500

@digests_bp.route('/latest', methods=['GET'])
@login_required
def get_latest_digest():
    """Get the latest digest for the current user"""
    try:
        digest = Digest.query.filter_by(user_id=current_user.id)\
            .order_by(Digest.generation_date.desc())\
            .first()
        
        if not digest:
            return jsonify({
                'success': True,
                'data': None,
                'message': 'No digests available yet'
            })
        
        digest_data = digest.to_dict_with_items()
        
        return jsonify({
            'success': True,
            'data': digest_data
        })
        
    except Exception as e:
        logger.error(f"Error getting latest digest: {str(e)}")
        return jsonify({'error': 'Failed to get latest digest'}), 500

@digests_bp.route('/stats', methods=['GET'])
@login_required
def get_digest_stats():
    """Get digest statistics for the current user"""
    try:
        # Get total digests
        total_digests = Digest.query.filter_by(user_id=current_user.id).count()
        
        # Get unread digests
        unread_digests = Digest.query.filter_by(
            user_id=current_user.id,
            is_read=False
        ).count()
        
        # Get total summaries read
        total_summaries = db.session.query(DigestItem)\
            .join(Digest)\
            .filter(Digest.user_id == current_user.id)\
            .count()
        
        # Get total reading time saved (estimate)
        total_reading_time = db.session.query(db.func.sum(Summary.reading_time))\
            .join(DigestItem)\
            .join(Digest)\
            .filter(Digest.user_id == current_user.id)\
            .scalar() or 0
        
        return jsonify({
            'success': True,
            'data': {
                'total_digests': total_digests,
                'unread_digests': unread_digests,
                'total_summaries': total_summaries,
                'total_reading_time': total_reading_time
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting digest stats: {str(e)}")
        return jsonify({'error': 'Failed to get digest statistics'}), 500