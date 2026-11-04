from pydantic import BaseModel
from typing import Optional, Any


class QRLoginRequest(BaseModel):
    accountId: str
    companyId: str
    username: str


class QRLoginResponse(BaseModel):
    qr: str
    sessionId: str


class SendMessageRequest(BaseModel):
    companyId: str
    messageId: str
    accountId: str
    contactId: str
    content: str
    messageType: str = "text"
    mediaUrl: Optional[str] = None


class BroadcastRequest(BaseModel):
    broadcastId: str
    companyId: str
    accountId: str
    templateId: Optional[str] = None


class WebhookStatusRequest(BaseModel):
    accountId: str
    status: str
    instagram_user_id: Optional[str] = None
    profile_picture_url: Optional[str] = None
    followers_count: Optional[int] = None


class WorkerTask(BaseModel):
    jobId: str
    taskType: str
    payload: dict[str, Any]
