import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME     = os.getenv("DB_NAME", "mini_ros")

_client: AsyncIOMotorClient | None = None


def get_db():
    return _client[DB_NAME]


async def connect_db():
    global _client
    _client = AsyncIOMotorClient(MONGODB_URI)
    await _client.admin.command("ping")   # fail fast if URI is wrong
    print(f"MongoDB connected — db: {DB_NAME}")


async def close_db():
    global _client
    if _client:
        _client.close()
