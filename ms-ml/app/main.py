from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routers import health, predict, train
from app.config import settings
from app.database import mongodb
import logging
import time

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting ZiBooka ML Service...")
    try:
        await mongodb.connect()
    except Exception as e:
        logger.warning(f"MongoDB not available: {e}. Running in limited mode.")
    yield
    # Shutdown
    await mongodb.close()
    logger.info("ZiBooka ML Service stopped")

app = FastAPI(
    title="ZiBooka ML Service",
    description="Microservicio de Machine Learning para el sistema ZiBooka",
    version="0.1.0",
    lifespan=lifespan,
)

ALLOWED_ORIGINS = [settings.frontend_url]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(round(process_time, 4))
    return response

app.include_router(health.router, tags=["health"])
app.include_router(predict.router, prefix="/predict", tags=["prediction"])
app.include_router(train.router, prefix="/train", tags=["training"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)