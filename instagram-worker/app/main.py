from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse

from .config import INTERNAL_TOKEN, WORKER_HOST, WORKER_PORT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from .models import QRLoginRequest, SendMessageRequest, BroadcastRequest
from .worker import start_worker, stop_worker
from .instagram_client import get_client, save_session, get_user_info

logger = logging.getLogger("instagram.api")
logging.basicConfig(level=logging.INFO)

bullmq_worker = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global bullmq_worker
    bullmq_worker = await start_worker()
    yield
    await stop_worker(bullmq_worker)


app = FastAPI(title="Instagram Worker API", lifespan=lifespan)


def verify_internal(x_internal_token: str = Header(default="")):
    if INTERNAL_TOKEN and x_internal_token != INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid internal token")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "instagram-worker"}


@app.post("/login/qr")
async def login_qr(req: QRLoginRequest, x_internal_token: str = Header(default="")):
    verify_internal(x_internal_token)
    cl = get_client(req.accountId)
    try:
        from .instagram_client import login_with_qr
        qr_unicode = login_with_qr(cl)
        save_session(cl, req.accountId)
        return {"qr": qr_unicode, "sessionId": req.accountId}
    except Exception as e:
        logger.error(f"QR login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/send-message")
async def send_message(req: SendMessageRequest, x_internal_token: str = Header(default="")):
    verify_internal(x_internal_token)
    cl = get_client(req.accountId)
    try:
        from .instagram_client import send_message_to_username
        send_message_to_username(cl, req.contactId, req.content)
        save_session(cl, req.accountId)
        return {"success": True}
    except Exception as e:
        logger.error(f"Send message error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/account/{account_id}/user-info/{username}")
async def account_user_info(account_id: str, username: str, x_internal_token: str = Header(default="")):
    verify_internal(x_internal_token)
    cl = get_client(account_id)
    try:
        info = get_user_info(cl, username)
        return info
    except Exception as e:
        logger.error(f"User info error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def run():
    import uvicorn
    uvicorn.run(app, host=WORKER_HOST, port=WORKER_PORT)


if __name__ == "__main__":
    run()
