import os
import psycopg2
from psycopg2 import pool
from contextlib import contextmanager

_pg_pool = None

def get_pool():
    global _pg_pool
    if _pg_pool is None:
        DATABASE_URL = os.environ.get('DATABASE_URL') or os.environ.get('POSTGRES_URI')
        if not DATABASE_URL:
            raise RuntimeError("CRITICAL: DATABASE_URL environment variable is required.")
        if DATABASE_URL.startswith('postgresql+psycopg2://'):
            DATABASE_URL = DATABASE_URL.replace('postgresql+psycopg2://', 'postgresql://', 1)
        
        _pg_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=DATABASE_URL
        )
    return _pg_pool

@contextmanager
def get_db_cursor(commit=False):
    """
    Context manager that yields a psycopg2 database cursor from the connection pool.
    Automatically handles commit/rollback and returns the connection to the pool.
    """
    pool = get_pool()
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            yield cur
        if commit:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)

def init_db():
    """
    Creates necessary tables and indexes directly on PostgreSQL if they do not exist.
    """
    with get_db_cursor(commit=True) as cur:
        # Create users table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(80) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'user' NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Create predictions table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS predictions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                image_name VARCHAR(255),
                image_url TEXT,
                prediction VARCHAR(50) NOT NULL,
                confidence REAL NOT NULL,
                severity VARCHAR(50) NOT NULL,
                summary TEXT,
                suggestion TEXT,
                grad_cam_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Ensure index for rapid user-based scan lookup
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
            CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at DESC);
        """)
