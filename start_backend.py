#!/usr/bin/env python3
import sys
import os

# Add the src directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(current_dir, 'src')
sys.path.insert(0, src_dir)

# Now import and run the main application
if __name__ == '__main__':
    from main import app
    print(f"🚀 Starting Flask server...")
    print(f"📁 Current directory: {current_dir}")
    print(f"🐍 Python path includes: {src_dir}")
    
    # Start the Flask application
    app.run(host='0.0.0.0', port=5000, debug=True) 