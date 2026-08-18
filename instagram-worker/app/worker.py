from __future__ import annotations

import asyncio
import json
import logging
from urllib.parse import urlparse

from bullmq import Worker, Job
import httpx

from .config import REDIS_URL, NODE_SERVICE_URL, INTERNAL_TOKEN
from .instagram_client import (
    get_client,
    save_session,
    login_with_qr,
    send_message_to_username,
    get_user_id,
    get_user_info,
    LoginRequired,
)

logger = logging.getLogger("instagram.worker")

worker: Worker | None = None


def _parse_redis_url(url: str) -> dict:
    parsed = urlparse(url)
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 6379,
        "password": parsed.password or None,
        "db": int(parsed.path.lstrip("/")) if parsed.path and parsed.path != "/" else 0,
    }


async def notify_node_service(path: str, payload: dict) -> None:
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{NODE_SERVICE_URL}/api/instagram/webhooks{path}",
            json=payload,
            headers={"x-internal-token": INTERNAL_TOKEN, "Content-Type": "application/json"},
            timeout=10,
        )


async def handle_send_message(job: Job) -> dict:
    p = job.data
    account_id = p["accountId"]
    contact_id = p["contactId"]
    content = p["content"]

    cl = get_client(account_id)
    try:
        username = p.get("contactUsername")
        if not username:
            username = contact_id

        send_message_to_username(cl, username, content)
        save_session(cl, account_id)
        return {"success": True}
    except LoginRequired:
        await notify_node_service("/instagram/session-expired", {
            "account_id": account_id,
            "reason": "login_required",
        })
        return {"success": False, "error": "session_expired"}
    except Exception as e:
        logger.error(f"send_message error: {e}")
        return {"success": False, "error": str(e)}


async def handle_qr_login(job: Job) -> dict:
    p = job.data
    account_id = p["accountId"]
    username = p.get("username", "")

    cl = get_client(account_id)
    try:
        qr_unicode = login_with_qr(cl)
        save_session(cl, account_id)
        return {"qr": qr_unicode, "sessionId": account_id}
    except Exception as e:
        logger.error(f"qr_login error: {e}")
        return {"error": str(e)}


async def handle_send_broadcast(job: Job) -> dict:
    p = job.data
    broadcast_id = p["broadcastId"]
    company_id = p["companyId"]
    account_id = p["accountId"]
    template_id = p.get("templateId")

    logger.info(f"Processing broadcast {broadcast_id}")
    return {"success": True, "broadcastId": broadcast_id}


HANDLERS = {
    "send-message": handle_send_message,
    "login/qr": handle_qr_login,
    "send-broadcast": handle_send_broadcast,
}


async def start_worker() -> Worker:
    async def process(job: Job, token: str) -> dict:
        task_type = job.name
        handler = HANDLERS.get(task_type)
        if not handler:
            logger.warning(f"Unknown task type: {task_type}")
            return {"error": f"unknown task: {task_type}"}
        return await handler(job)

    redis_opts = _parse_redis_url(REDIS_URL)
    worker = Worker("instagram-worker-tasks", process, {"connection": redis_opts})
    logger.info("Instagram BullMQ worker started")
    return worker


async def stop_worker(w: Worker) -> None:
    if w:
        await w.close()
