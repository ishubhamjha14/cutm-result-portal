import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "CUTM RESULT PORTAL API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = "sqlite:///./cutm_results.db"
    
    # JWT Auth
    JWT_SECRET: str = "cutm_secret_key_change_in_production_2026_super_secure_key_exam_portal"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:8000"
    
    # Default Admin Seed Credentials
    ADMIN_DEFAULT_EMAIL: str = "jhakumarshubham014@gmail.com"
    ADMIN_DEFAULT_USERNAME: str = "admin"
    ADMIN_DEFAULT_PASSWORD: str = "CUTM@SHUBHAM14"
    ADMIN_DEFAULT_NAME: str = "Shubham Kumar Jha (CUTM Administrator)"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
