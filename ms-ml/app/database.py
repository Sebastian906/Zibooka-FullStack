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
            self.client = AsyncIOMotorClient(
                settings.mongodb_uri,
                serverSelectionTimeoutMS=5000,
            )
            self.db = self.client[settings.mongodb_db_name]
            await self.db.command("ping")
            self._connected = True
            logger.info("MongoDB connected successfully")
        except ConnectionFailure as e:
            logger.error(f"MongoDB connection failed: {e}")
            self._connected = False
            raise

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