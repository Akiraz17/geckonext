import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./gecko.db")
JWT_SECRET = os.getenv("JWT_SECRET", "gecko-jwt-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 8
