from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.api.endpoints import api_router

# Initialize tables
Base.metadata.create_all(bind=engine)
try:
    from app.services.seed_data import seed_database
    seed_database()
except Exception:
    pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise Decision-Support System for Hardware Warranty and AMC Contract Compliance",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include versioned API router under /api/v1
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root(request: Request):
    accept = request.headers.get("accept", "")
    if "text/html" in accept:
        return HTMLResponse(content="""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>WarrantyIQ Backend API</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px; max-width: 500px; width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
        .badge { display: inline-block; background: #10b981; color: #022c22; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 9999px; margin-bottom: 16px; text-transform: uppercase; }
        h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #ffffff; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0; }
        .links { display: flex; flex-direction: column; gap: 12px; }
        .btn { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; transition: all 0.2s; }
        .btn-primary { background: #2563eb; color: #ffffff; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-secondary { background: #334155; color: #e2e8f0; }
        .btn-secondary:hover { background: #475569; }
    </style>
</head>
<body>
    <div class="card">
        <span class="badge">Operational</span>
        <h1>WarrantyIQ Backend API</h1>
        <p>The FastAPI backend service is operational and serving endpoints under <code>/api/v1</code>.</p>
        <div class="links">
            <a href="http://localhost:5173" class="btn btn-primary">Open Frontend Web Application &rarr;</a>
            <a href="/docs" class="btn btn-secondary">Interactive Swagger API Documentation &rarr;</a>
        </div>
    </div>
</body>
</html>""")
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "Operational",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }

@app.get("/health")
def health():
    return {"status": "healthy"}
