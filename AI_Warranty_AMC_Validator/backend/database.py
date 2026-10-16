import os
import sqlite3
from sqlite3 import Connection

DB_PATH = os.getenv('DATABASE_URL', 'instance/app.db')
if DB_PATH.startswith('sqlite:///'):
    DB_PATH = DB_PATH.replace('sqlite:///', '')

def get_connection() -> Connection:
    dirname = os.path.dirname(DB_PATH)
    if dirname:
        os.makedirs(dirname, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON;')
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    # Users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('customer','agent','admin')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ''')
    # Products table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT,
        serial_number TEXT NOT NULL UNIQUE,
        customer_id INTEGER NOT NULL,
        purchase_date DATE,
        warranty_start DATE,
        warranty_end DATE,
        registration_status TEXT NOT NULL DEFAULT 'registered',
        FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
    );
    ''')
    # AMC contracts table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS amc_contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        coverage_details TEXT,
        exclusions TEXT,
        remaining_visits INTEGER,
        status TEXT NOT NULL DEFAULT 'active',
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    ''')
    # Claims table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        issue_description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        decision TEXT,
        decision_reason TEXT,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
    );
    ''')
    # Claim documents metadata
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS claim_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        claim_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
    );
    ''')
    # AI predictions table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS ai_predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        claim_id INTEGER NOT NULL,
        result JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
    );
    ''')
    # ML risk predictions table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS ml_predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        claim_id INTEGER NOT NULL,
        risk_score REAL,
        risk_category TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
    );
    ''')
    # Claim history for audit trail
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS claim_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        claim_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        performed_by INTEGER,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
        FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
    );
    ''')
    conn.commit()
    conn.close()

if __name__ == '__main__':
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    init_db()
    print('Database initialized at', DB_PATH)
