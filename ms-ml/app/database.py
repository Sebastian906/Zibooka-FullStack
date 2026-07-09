from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class MongoDB:
    def __init__(self):
        self.client: AsyncIOMotorClient | None = None
        self.db = None
        self._connected = False

    async def connect(self):
        try:
            # Construir URI con parámetros para Atlas
            uri = settings.mongodb_uri
            
            # Si la URI no tiene parámetros, agregarlos
            if "?" not in uri:
                uri += "?retryWrites=true&w=majority&directConnection=false"
            
            logger.info(f"Connecting to MongoDB...")
            
            self.client = AsyncIOMotorClient(
                uri,
                serverSelectionTimeoutMS=10000,
                connectTimeoutMS=10000,
                socketTimeoutMS=10000,
                maxPoolSize=10,
            )
            
            self.db = self.client[settings.mongodb_db_name]
            
            # Verificar conexión con ping
            await self.db.command("ping")
            self._connected = True
            logger.info("MongoDB connected successfully")
        except Exception as e:
            logger.error(f"MongoDB connection failed: {e}")
            self._connected = False
            # No lanzar excepción para permitir que el servicio funcione en modo limitado

    async def close(self):
        if self.client:
            self.client.close()
            self._connected = False
            logger.info("MongoDB connection closed")

    def get_collection(self, name: str):
        return self.db[name]

    @property
    def is_connected(self) -> bool:
        return self._connected

mongodb = MongoDB()
