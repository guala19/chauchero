from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.database import engine, Base
from .routers import auth, transactions, banks

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Chauchero API",
    description="Chilean Bank Spending Tracker API",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(banks.router)


@app.get("/")
async def root():
    return {
        "message": "Chauchero API",
        "version": "0.1.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
