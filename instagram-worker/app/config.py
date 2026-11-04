import os

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
INTERNAL_TOKEN = os.getenv("INSTAGRAM_INTERNAL_TOKEN", "")
ENCRYPTION_SECRET = os.getenv("INSTAGRAM_ENCRYPTION_SECRET", "default-dev-secret-change-in-production")
NODE_SERVICE_URL = os.getenv("NODE_SERVICE_URL", "http://instagram-service:3200")
WORKER_HOST = os.getenv("WORKER_HOST", "0.0.0.0")
WORKER_PORT = int(os.getenv("WORKER_PORT", "8000"))
DEVICE_DIR = os.getenv("DEVICE_DIR", "/data/devices")
SESSION_DIR = os.getenv("SESSION_DIR", "/data/sessions")
