from flask import Blueprint, jsonify
from models.subscription import Subscription

public_bp = Blueprint('public', __name__)

@public_bp.route('/pricing', methods=['GET'])
def get_pricing():
    """Get pricing plans for the landing page"""
    try:
        pricing_plans = [
            {
                'id': 'basic',
                'name': 'Basic Plan',
                'price': 4.99,
                'currency': 'USD',
                'billing_period': 'month',
                'description': 'Perfect for casual readers',
                'features': [
                    'Up to 5 content sources',
                    'Daily digest delivery',
                    'Email summaries',
                    'Web interface access',
                    'Basic support'
                ],
                'source_limit': 5,
                'audio_included': False,
                'is_popular': False
            },
            {
                'id': 'premium',
                'name': 'Premium Plan',
                'price': 9.99,
                'currency': 'USD',
                'billing_period': 'month',
                'description': 'Most popular for professionals',
                'features': [
                    'Up to 20 content sources',
                    'Daily digest delivery',
                    'Email summaries',
                    'Audio digest versions',
                    'Web interface access',
                    'Priority support'
                ],
                'source_limit': 20,
                'audio_included': True,
                'is_popular': True
            },
            {
                'id': 'professional',
                'name': 'Professional Plan',
                'price': 14.99,
                'currency': 'USD',
                'billing_period': 'month',
                'description': 'For information power users',
                'features': [
                    'Unlimited content sources',
                    'Daily digest delivery',
                    'Email summaries',
                    'Audio digest versions',
                    'Web interface access',
                    'Priority support',
                    'Advanced analytics'
                ],
                'source_limit': -1,  # unlimited
                'audio_included': True,
                'is_popular': False
            }
        ]
        
        return jsonify({
            'success': True,
            'data': pricing_plans
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@public_bp.route('/features', methods=['GET'])
def get_features():
    """Get product features for the landing page"""
    try:
        features = [
            {
                'id': 'time_saving',
                'title': 'Save Hours Every Day',
                'description': 'Stop scrolling through dozens of websites. Get all your favorite content summarized in one place, ready in minutes.',
                'icon': 'clock',
                'benefits': [
                    'Reduce reading time by 80%',
                    'Never miss important updates',
                    'Focus on what matters most'
                ]
            },
            {
                'id': 'ai_powered',
                'title': 'AI-Powered Summaries',
                'description': 'Our advanced AI reads and summarizes content from your favorite blogs, podcasts, and news sites.',
                'icon': 'brain',
                'benefits': [
                    'Intelligent content analysis',
                    'Key points extraction',
                    'Consistent quality summaries'
                ]
            },
            {
                'id': 'personalized',
                'title': 'Personalized for You',
                'description': 'Choose your sources, set your preferences, and get digests tailored to your interests.',
                'icon': 'user',
                'benefits': [
                    'Custom source selection',
                    'Flexible delivery options',
                    'Personalized content curation'
                ]
            },
            {
                'id': 'multi_format',
                'title': 'Read or Listen',
                'description': 'Get your digest as text for quick reading or audio for hands-free consumption.',
                'icon': 'headphones',
                'benefits': [
                    'Text summaries for quick reading',
                    'Audio versions for commuting',
                    'Multiple consumption options'
                ]
            }
        ]
        
        return jsonify({
            'success': True,
            'data': features
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@public_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get public statistics for the landing page"""
    try:
        # These would be real stats in production
        stats = {
            'total_users': 10000,
            'total_summaries': 250000,
            'time_saved_hours': 125000,
            'sources_supported': 500
        }
        
        return jsonify({
            'success': True,
            'data': stats
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500