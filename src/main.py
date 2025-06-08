import os
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_login import LoginManager
from flask_mail import Mail
from authlib.integrations.flask_client import OAuth
from dotenv import load_dotenv
import logging
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

# Supabase Database Configuration
# Use Supabase connection string from environment variables
supabase_url = os.getenv('VITE_SUPABASE_URL')
supabase_key = os.getenv('VITE_SUPABASE_ANON_KEY')

# Extract database connection details from Supabase URL
if supabase_url:
    # Convert Supabase URL to PostgreSQL connection string
    # Supabase URL format: https://xxx.supabase.co
    project_id = supabase_url.replace('https://', '').replace('.supabase.co', '')
    
    # Use Supabase database connection
    app.config['SQLALCHEMY_DATABASE_URI'] = f"postgresql://postgres:{os.getenv('SUPABASE_DB_PASSWORD', '')}@db.{project_id}.supabase.co:5432/postgres"
else:
    # Fallback to local PostgreSQL if Supabase not configured
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/content_digest')

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Google OAuth configuration
app.config['GOOGLE_CLIENT_ID'] = os.getenv('GOOGLE_CLIENT_ID')
app.config['GOOGLE_CLIENT_SECRET'] = os.getenv('GOOGLE_CLIENT_SECRET')

# Email configuration
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', '587'))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

# Stripe configuration
app.config['STRIPE_SECRET_KEY'] = os.getenv('STRIPE_SECRET_KEY')
app.config['STRIPE_PUBLISHABLE_KEY'] = os.getenv('STRIPE_PUBLISHABLE_KEY')

# AI configuration
app.config['OPENAI_API_KEY'] = os.getenv('OPENAI_API_KEY')
app.config['DEEPSEEK_API_KEY'] = os.getenv('DEEPSEEK_API_KEY')
app.config['DEEPSEEK_API_BASE'] = os.getenv('DEEPSEEK_API_BASE', 'https://api.deepseek.com')

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)
cors = CORS(app)
login_manager = LoginManager(app)
mail = Mail(app)
oauth = OAuth(app)

# Configure OAuth
google = oauth.register(
    name='google',
    client_id=app.config['GOOGLE_CLIENT_ID'],
    client_secret=app.config['GOOGLE_CLIENT_SECRET'],
    server_metadata_url='https://accounts.google.com/.well-known/openid_configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import models
from models.user import User
from models.content import ContentSource, ContentItem, Summary
from models.digest import Digest, DigestItem
from models.subscription import Subscription

# Import routes
from routes.auth import auth_bp
from routes.sources import sources_bp
from routes.digests import digests_bp
from routes.subscription import subscription_bp
from routes.public import public_bp

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(sources_bp, url_prefix='/api/sources')
app.register_blueprint(digests_bp, url_prefix='/api/digests')
app.register_blueprint(subscription_bp, url_prefix='/api/subscription')
app.register_blueprint(public_bp, url_prefix='/api/public')

# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found', 'status_code': 404}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({'error': 'Internal server error', 'status_code': 500}), 500

@app.errorhandler(Exception)
def handle_exception(e):
    logger.error(f"Unhandled exception: {str(e)}")
    
    if request.path.startswith('/api/'):
        return jsonify({
            'error': 'Internal server error',
            'status_code': 500
        }), 500
    
    return jsonify({'error': str(e)}), 500

# Health check endpoint
@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    })

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)