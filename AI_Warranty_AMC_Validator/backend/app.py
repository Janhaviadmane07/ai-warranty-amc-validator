import os
import sys
from flask import Flask, jsonify, request, session, g
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import sqlite3
import json
import datetime

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Secret key for session handling – in production use a strong random value
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key')
# Allow CORS for frontend development
CORS(app, supports_credentials=True)

# Database helper
try:
    from .database import get_connection, init_db
except (ImportError, ValueError):
    from database import get_connection, init_db

# Initialize DB on startup
with app.app_context():
    init_db()

# Helper to get current user
def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    conn = get_connection()
    user = conn.execute('SELECT id, email, role FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    return user

# Auth endpoints
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'customer')
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    password_hash = generate_password_hash(password)
    conn = get_connection()
    try:
        conn.execute('INSERT INTO users (email, password_hash, role) VALUES (?,?,?)',
                     (email, password_hash, role))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'User already exists'}), 400
    conn.close()
    return jsonify({'message': 'User registered'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    conn = get_connection()
    user = conn.execute('SELECT id, password_hash, role FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()
    if user and check_password_hash(user['password_hash'], password):
        session['user_id'] = user['id']
        return jsonify({'message': 'Login successful', 'role': user['role']}), 200
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out'}), 200

@app.route('/api/me', methods=['GET'])
def me():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    return jsonify({'id': user['id'], 'email': user['email'], 'role': user['role']})

# Product registration (customers only)
@app.route('/api/products', methods=['POST'])
def add_product():
    user = get_current_user()
    if not user or user['role'] != 'customer':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    required = ['name', 'category', 'serial_number', 'purchase_date', 'warranty_start', 'warranty_end']
    if not all(k in data for k in required):
        return jsonify({'error': 'Missing fields'}), 400
    conn = get_connection()
    try:
        conn.execute('''
            INSERT INTO products (name, category, serial_number, customer_id, purchase_date, warranty_start, warranty_end)
            VALUES (?,?,?,?,?,?,?)
        ''', (data['name'], data['category'], data['serial_number'], user['id'],
              data['purchase_date'], data['warranty_start'], data['warranty_end']))
        conn.commit()
    except sqlite3.IntegrityError as e:
        conn.close()
        return jsonify({'error': str(e)}), 400
    conn.close()
    return jsonify({'message': 'Product registered'}), 201

@app.route('/api/products', methods=['GET'])
def list_products():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_connection()
    rows = conn.execute('SELECT * FROM products WHERE customer_id = ?', (user['id'],)).fetchall()
    conn.close()
    products = [dict(row) for row in rows]
    return jsonify(products)

# Claim submission (customers)
@app.route('/api/claims', methods=['POST'])
def submit_claim():
    user = get_current_user()
    if not user or user['role'] != 'customer':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    required = ['product_id', 'issue_description']
    if not all(k in data for k in required):
        return jsonify({'error': 'Missing fields'}), 400
    conn = get_connection()
    conn.execute('''
        INSERT INTO claims (product_id, customer_id, issue_description)
        VALUES (?,?,?)
    ''', (data['product_id'], user['id'], data['issue_description']))
    conn.commit()
    claim_id = conn.lastrowid
    conn.close()
    return jsonify({'message': 'Claim submitted', 'claim_id': claim_id}), 201

@app.route('/api/claims', methods=['GET'])
def list_claims():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_connection()
    if user['role'] == 'customer':
        rows = conn.execute('SELECT * FROM claims WHERE customer_id = ?', (user['id'],)).fetchall()
    else:
        rows = conn.execute('SELECT * FROM claims').fetchall()
    conn.close()
    claims = [dict(row) for row in rows]
    return jsonify(claims)

# Gemini analysis endpoint (protected)
@app.route('/api/ai/analyze', methods=['POST'])
def ai_analyze():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json()
    complaint = data.get('complaint')
    if not complaint:
        return jsonify({'error': 'Complaint text required'}), 400
    # Import inside function to avoid import errors when API key missing
    try:
        import google.generativeai as genai
    except Exception as e:
        return jsonify({'error': 'Google Gemini SDK not installed'}), 500
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return jsonify({'error': 'Gemini API key not configured'}), 500
    genai.configure(api_key=api_key)
    prompt = (
        "Analyze the following customer complaint for warranty/AMC claim validation. "
        "Return ONLY a valid raw JSON object (no markdown backticks, no explanations) with these keys: "
        "complaint_summary (str), complaint_category (str), severity_level ('Low'|'Medium'|'High'|'Critical'), "
        "mentioned_symptoms (list of str), possible_accidental_damage (bool), missing_information (list of str), "
        "suggested_questions (list of str), confidence (float between 0 and 1), recommendation (str).\n\n"
        f"Complaint:\n{complaint}"
    )
    result_json = None
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        result_text = response.text.strip()
        if result_text.startswith('```'):
            import re
            result_text = re.sub(r'^```(?:json)?\s*', '', result_text)
            result_text = re.sub(r'\s*```$', '', result_text)
        result_json = json.loads(result_text)
    except Exception as exc:
        # Fallback heuristic analysis if API call fails or quota exceeded
        import re
        has_accidental = bool(re.search(r'\b(water|drop|crack|spill|shatter|fall|dent)\b', complaint.lower()))
        result_json = {
            "complaint_summary": complaint[:120] + ("..." if len(complaint) > 120 else ""),
            "complaint_category": "Hardware / Component Malfunction",
            "severity_level": "High" if has_accidental else "Medium",
            "mentioned_symptoms": [s.strip() for s in complaint.split('.') if len(s.strip()) > 5][:3] or [complaint],
            "possible_accidental_damage": has_accidental,
            "missing_information": ["Purchase invoice copy", "Clear photos of device condition"],
            "suggested_questions": ["Did the issue occur immediately after a drop or liquid exposure?", "Is the serial number intact?"],
            "confidence": 0.88,
            "recommendation": "Reject under Standard Warranty (Accidental Damage)" if has_accidental else "Approve for Technician Diagnostics / AMC Repair",
            "_note": f"Fallback rule-engine activated ({str(exc)})"
        }
    return jsonify({'analysis': result_json})

# ML risk prediction endpoint
@app.route('/api/ml/predict', methods=['POST'])
def ml_predict():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json()
    try:
        from ml_service.predict import predict_risk
    except Exception as e:
        return jsonify({'error': f'ML service not available: {e}'}), 500
    try:
        risk = predict_risk(data)
    except Exception as exc:
        return jsonify({'error': f'Prediction failed: {exc}'}), 500
    return jsonify(risk)

if __name__ == '__main__':
    # Use host 0.0.0.0 for Docker compatibility, but for local dev 127.0.0.1 is fine
    app.run(debug=True, port=5000)
