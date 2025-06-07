from flask import Blueprint, request, jsonify, url_for, redirect, session
from flask_login import login_user, logout_user, login_required, current_user
from models.user import User
from main import db, oauth, google
import logging
from datetime import datetime

auth_bp = Blueprint('auth', __name__)
logger = logging.getLogger(__name__)

@auth_bp.route('/google', methods=['GET'])
def google_auth():
    """Initiate Google OAuth flow"""
    try:
        redirect_uri = url_for('auth.google_callback', _external=True)
        return google.authorize_redirect(redirect_uri)
    except Exception as e:
        logger.error(f"Error initiating Google OAuth: {str(e)}")
        return jsonify({'error': 'Authentication error'}), 500

@auth_bp.route('/google/callback', methods=['GET'])
def google_callback():
    """Handle Google OAuth callback"""
    try:
        # Get the authorization token
        token = google.authorize_access_token()
        
        # Parse user info from the token
        user_info = token.get('userinfo')
        if not user_info:
            user_info = google.parse_id_token(token)
        
        if not user_info:
            return jsonify({'error': 'Failed to get user information'}), 400
        
        # Check if user exists
        user = User.query.filter_by(google_id=user_info['sub']).first()
        
        if not user:
            # Check if user exists with same email
            existing_user = User.query.filter_by(email=user_info['email']).first()
            if existing_user:
                # Link Google account to existing user
                existing_user.google_id = user_info['sub']
                existing_user.name = user_info.get('name', existing_user.name)
                existing_user.avatar_url = user_info.get('picture', existing_user.avatar_url)
                existing_user.last_login = datetime.utcnow()
                user = existing_user
            else:
                # Create new user
                user = User(
                    email=user_info['email'],
                    google_id=user_info['sub'],
                    name=user_info.get('name', ''),
                    avatar_url=user_info.get('picture', ''),
                    last_login=datetime.utcnow()
                )
                db.session.add(user)
        else:
            # Update existing user info
            user.name = user_info.get('name', user.name)
            user.avatar_url = user_info.get('picture', user.avatar_url)
            user.last_login = datetime.utcnow()
        
        db.session.commit()
        
        # Log the user in
        login_user(user, remember=True)
        
        # Store user info in session
        session['user_id'] = user.id
        session['user_email'] = user.email
        
        # Redirect to frontend dashboard
        frontend_url = request.args.get('redirect_uri', '/')
        return redirect(frontend_url)
        
    except Exception as e:
        logger.error(f"Error in Google OAuth callback: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Authentication failed'}), 500

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """Logout user"""
    try:
        logout_user()
        session.clear()
        return jsonify({'success': True, 'message': 'Logged out successfully'})
    except Exception as e:
        logger.error(f"Error during logout: {str(e)}")
        return jsonify({'error': 'Logout failed'}), 500

@auth_bp.route('/user', methods=['GET'])
@login_required
def get_current_user():
    """Get current user information"""
    try:
        return jsonify({
            'success': True,
            'data': current_user.to_dict()
        })
    except Exception as e:
        logger.error(f"Error getting current user: {str(e)}")
        return jsonify({'error': 'Failed to get user information'}), 500

@auth_bp.route('/user', methods=['PUT'])
@login_required
def update_user():
    """Update user profile"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Update allowed fields
        if 'name' in data:
            current_user.name = data['name']
        
        if 'email_notifications' in data:
            current_user.email_notifications = data['email_notifications']
        
        if 'digest_frequency' in data:
            if data['digest_frequency'] in ['daily', 'weekly']:
                current_user.digest_frequency = data['digest_frequency']
        
        current_user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': current_user.to_dict()
        })
        
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to update user'}), 500

@auth_bp.route('/check', methods=['GET'])
def check_auth():
    """Check if user is authenticated"""
    try:
        if current_user.is_authenticated:
            return jsonify({
                'authenticated': True,
                'user': current_user.to_dict()
            })
        else:
            return jsonify({
                'authenticated': False,
                'user': None
            })
    except Exception as e:
        logger.error(f"Error checking authentication: {str(e)}")
        return jsonify({'error': 'Authentication check failed'}), 500