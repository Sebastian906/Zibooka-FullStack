from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "Zibooka"

    # Servidor
    host: str = "0.0.0.0"
    port: int = 5000
    log_level: str = "INFO"

    # Modelos
    models_dir: str = "./models"

    # Umbrales
    demand_threshold: int = 3
    overdue_risk_threshold: float = 0.7

    # Seguridad
    ml_api_key: str = ""

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()