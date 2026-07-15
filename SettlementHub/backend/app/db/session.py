from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import OperationalError
import logging
from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL
engine = None

try:
    if db_url.startswith("mysql"):
        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_recycle=3600,
            pool_size=10,
            max_overflow=20
        )
        # Test connection
        with engine.connect() as conn:
            pass
        logger.info("Successfully connected to MySQL database.")
    else:
        engine = create_engine(
            db_url,
            connect_args={"check_same_thread": False} if db_url.startswith("sqlite") else {}
        )
        logger.info(f"Connected to database using URL: {db_url}")
except Exception as e:
    logger.error(f"Failed to connect to primary database ({db_url}). Error: {e}")
    logger.info("Falling back to local SQLite database (sqlite:///./settlementhub.db) for demo/fallback purposes.")
    db_url = "sqlite:///./settlementhub.db"
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
