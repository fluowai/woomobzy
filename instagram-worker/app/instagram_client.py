from __future__ import annotations

import json
import os
import time
from pathlib import Path

from instagrapi import Client
from instagrapi.exceptions import (
    ChallengeRequired,
    LoginRequired,
    PleaseWaitFewMinutes,
)

from .config import DEVICE_DIR, SESSION_DIR, ENCRYPTION_SECRET


def _device_path(account_id: str) -> Path:
    path = Path(DEVICE_DIR) / account_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def _session_path(account_id: str) -> Path:
    path = Path(SESSION_DIR) / account_id
    path.mkdir(parents=True, exist_ok=True)
    return path / "session.json"


def get_client(account_id: str) -> Client:
    cl = Client()
    cl.delay_range = [1, 3]

    dp = _device_path(account_id)
    sp = _session_path(account_id)

    if sp.exists():
        try:
            cl.load_settings(str(sp))
            cl.login_by_sessionid(cl.get_settings().get("sessionid", ""))
            return cl
        except (LoginRequired, Exception):
            pass

    device_settings_path = dp / "device.json"
    if device_settings_path.exists():
        with open(device_settings_path) as f:
            cl.set_device(json.load(f))

    return cl


def save_session(cl: Client, account_id: str) -> None:
    sp = _session_path(account_id)
    cl.dump_settings(str(sp))


def login_with_qr(cl: Client) -> str:
    uuid = cl.uuid_generate()
    qr_code, qr_code_unicode = cl.get_qr_code()
    return qr_code_unicode


def login_with_credentials(cl: Client, username: str, password: str) -> None:
    cl.login(username, password)
    save_session(cl, username)


def send_direct_message(cl: Client, user_id: str, text: str, media_path: str | None = None):
    if media_path:
        media = cl.photo_download(media_path) if media_path.endswith(('.jpg', '.jpeg', '.png')) else None
        if media:
            return cl.direct_answer(user_id, text, media_id=media)
    return cl.direct_answer(user_id, text)


def send_message_to_username(cl: Client, username: str, text: str):
    user_id = cl.user_id_from_username(username)
    return send_direct_message(cl, user_id, text)


def get_user_id(cl: Client, username: str) -> str:
    return cl.user_id_from_username(username)


def get_user_info(cl: Client, username: str) -> dict:
    user_info = cl.user_info_by_username(username)
    return {
        "instagram_user_id": str(user_info.pk),
        "username": user_info.username,
        "full_name": user_info.full_name,
        "profile_picture_url": user_info.profile_pic_url_hd or user_info.profile_pic_url,
        "is_business": user_info.is_business,
        "is_verified": user_info.is_verified,
        "follower_count": user_info.follower_count,
        "bio": user_info.biography,
    }
