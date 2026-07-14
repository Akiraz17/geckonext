from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    customer: Optional[str] = None
    deadline: Optional[datetime] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    customer: Optional[str] = None
    status: Optional[str] = None
    deadline: Optional[datetime] = None


class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    customer: Optional[str] = None
    status: str
    deadline: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TaskCreate(BaseModel):
    project_id: int
    media_file_id: int = 1
    assignee_id: Optional[int] = None
    verifier_id: Optional[int] = None
    priority: str = "Medium"
    deadline: Optional[datetime] = None


class TaskUpdate(BaseModel):
    status: Optional[str] = None
    assignee_id: Optional[int] = None
    verifier_id: Optional[int] = None
    priority: Optional[str] = None
    deadline: Optional[datetime] = None


class TaskOut(BaseModel):
    id: int
    project_id: int
    media_file_id: int
    assignee_id: Optional[int] = None
    verifier_id: Optional[int] = None
    status: str
    priority: str
    deadline: Optional[datetime] = None
    created_at: datetime
    assignee: Optional[dict] = None
    verifier: Optional[dict] = None

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    task_id: int
    segment_id: Optional[int] = None
    text: str


class CommentOut(BaseModel):
    id: int
    task_id: int
    segment_id: Optional[int] = None
    author_id: int
    text: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class VerificationCreate(BaseModel):
    task_id: int
    decision: str
    score: Optional[int] = None
    comment: Optional[str] = None


class VerificationOut(BaseModel):
    id: int
    task_id: int
    verifier_id: int
    decision: str
    score: Optional[int] = None
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MediaFileOut(BaseModel):
    id: int
    project_id: int
    audio_path: Optional[str] = None
    video_path: Optional[str] = None
    duration: Optional[float] = None
    format: Optional[str] = None

    class Config:
        from_attributes = True
