import os

class Settings:
    PROJECT_NAME: str = "WarrantyIQ"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "warranty-iq-super-secure-production-jwt-token-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../instance/warrantyiq.db')).replace('\\', '/')}"
    )
    
    # Document storage directory
    STORAGE_DIR: str = os.getenv(
        "STORAGE_DIR",
        os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../storage/documents')).replace('\\', '/')
    )
    
    # Max file size 15 MB
    MAX_UPLOAD_SIZE_BYTES: int = 15 * 1024 * 1024
    
    # Optional Gemini AI API key
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

settings = Settings()
