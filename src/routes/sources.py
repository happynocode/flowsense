from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models.content import ContentSource
from services.scraper import validate_source_url
from main import db
import logging
from datetime import datetime

sources_bp = Blueprint('sources', __name__)
logger = logging.getLogger(__name__)

@sources_bp.route('', methods=['GET'])
@login_required
def get_sources():
    """Get all content sources for the current user"""
    try:
        sources = ContentSource.query.filter_by(user_id=current_user.id).all()
        return jsonify({
            'success': True,
            'data': [source.to_dict() for source in sources]
        })
    except Exception as e:
        logger.error(f"Error getting sources: {str(e)}")
        return jsonify({'error': 'Failed to get sources'}), 500

@sources_bp.route('', methods=['POST'])
@login_required
def create_source():
    """Create a new content source"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['name', 'url', 'source_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Check source limit based on subscription
        source_limit = current_user.get_source_limit()
        if source_limit > 0:  # -1 means unlimited
            current_source_count = ContentSource.query.filter_by(
                user_id=current_user.id,
                is_active=True
            ).count()
            
            if current_source_count >= source_limit:
                return jsonify({
                    'error': f'Source limit reached. Your plan allows {source_limit} sources.'
                }), 400
        elif source_limit == 0:
            return jsonify({
                'error': 'No active subscription. Please subscribe to add sources.'
            }), 400
        
        # Validate source type
        if data['source_type'] not in ['podcast', 'blog', 'news']:
            return jsonify({'error': 'Invalid source type'}), 400
        
        # Check if URL already exists for this user
        existing_source = ContentSource.query.filter_by(
            user_id=current_user.id,
            url=data['url']
        ).first()
        
        if existing_source:
            return jsonify({'error': 'Source with this URL already exists'}), 400
        
        # Create new source
        source = ContentSource(
            user_id=current_user.id,
            name=data['name'],
            url=data['url'],
            source_type=data['source_type'],
            description=data.get('description', ''),
            has_rss=data.get('has_rss', False),
            rss_url=data.get('rss_url'),
            scraping_selector=data.get('scraping_selector'),
            is_active=data.get('is_active', True)
        )
        
        db.session.add(source)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': source.to_dict()
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating source: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to create source'}), 500

@sources_bp.route('/<int:source_id>', methods=['GET'])
@login_required
def get_source(source_id):
    """Get a specific content source"""
    try:
        source = ContentSource.query.filter_by(
            id=source_id,
            user_id=current_user.id
        ).first()
        
        if not source:
            return jsonify({'error': 'Source not found'}), 404
        
        return jsonify({
            'success': True,
            'data': source.to_dict()
        })
        
    except Exception as e:
        logger.error(f"Error getting source {source_id}: {str(e)}")
        return jsonify({'error': 'Failed to get source'}), 500

@sources_bp.route('/<int:source_id>', methods=['PUT'])
@login_required
def update_source(source_id):
    """Update a content source"""
    try:
        source = ContentSource.query.filter_by(
            id=source_id,
            user_id=current_user.id
        ).first()
        
        if not source:
            return jsonify({'error': 'Source not found'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Update allowed fields
        if 'name' in data:
            source.name = data['name']
        
        if 'url' in data and data['url'] != source.url:
            # Check if new URL already exists for this user
            existing_source = ContentSource.query.filter_by(
                user_id=current_user.id,
                url=data['url']
            ).filter(ContentSource.id != source_id).first()
            
            if existing_source:
                return jsonify({'error': 'Source with this URL already exists'}), 400
            
            source.url = data['url']
        
        if 'source_type' in data:
            if data['source_type'] in ['podcast', 'blog', 'news']:
                source.source_type = data['source_type']
        
        if 'description' in data:
            source.description = data['description']
        
        if 'has_rss' in data:
            source.has_rss = data['has_rss']
        
        if 'rss_url' in data:
            source.rss_url = data['rss_url']
        
        if 'scraping_selector' in data:
            source.scraping_selector = data['scraping_selector']
        
        if 'is_active' in data:
            source.is_active = data['is_active']
        
        source.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': source.to_dict()
        })
        
    except Exception as e:
        logger.error(f"Error updating source {source_id}: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to update source'}), 500

@sources_bp.route('/<int:source_id>', methods=['DELETE'])
@login_required
def delete_source(source_id):
    """Delete a content source"""
    try:
        source = ContentSource.query.filter_by(
            id=source_id,
            user_id=current_user.id
        ).first()
        
        if not source:
            return jsonify({'error': 'Source not found'}), 404
        
        db.session.delete(source)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Source deleted successfully'
        })
        
    except Exception as e:
        logger.error(f"Error deleting source {source_id}: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to delete source'}), 500

@sources_bp.route('/validate', methods=['POST'])
@login_required
def validate_source():
    """Validate a source URL"""
    try:
        data = request.get_json()
        
        if not data or 'url' not in data:
            return jsonify({'error': 'URL is required'}), 400
        
        url = data['url']
        
        # Validate the source
        validation_result = validate_source_url(url)
        
        return jsonify({
            'success': True,
            'data': validation_result
        })
        
    except Exception as e:
        logger.error(f"Error validating source: {str(e)}")
        return jsonify({'error': 'Failed to validate source'}), 500