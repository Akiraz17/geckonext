import json
import os
from pathlib import Path
from datetime import datetime, timedelta

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import engine, Base, SessionLocal
from app.db.models import (
    Role, User, AuditLog, Project, Task, MediaFile, Segment,
    Comment, VerificationResult, Speaker, Transcript, Term,
    QualityCheck, ExportFile,
)
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_role,
    get_db,
)
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserOut,
    LoginRequest,
    TokenOut,
)
from app.schemas.task import (
    ProjectCreate,
    ProjectUpdate,
    ProjectOut,
    TaskCreate,
    TaskUpdate,
    TaskOut,
    CommentCreate,
    CommentOut,
    VerificationCreate,
    VerificationOut,
    MediaFileOut,
    SegmentCreate,
    SegmentOut,
    SpeakerCreate,
    SpeakerOut,
    TermCreate,
    TermUpdate,
    TermOut,
    TranscriptOut,
    QualityCheckOut,
    ExportOut,
)
from typing import List, Optional

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gecko Next API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROLE_NAMES = ["Admin", "Supervisor", "Transcriber", "Verifier", "ML Engineer", "Customer"]

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


def seed_roles(db: Session):
    existing = db.query(Role).count()
    if existing > 0:
        return
    for name in ROLE_NAMES:
        db.add(Role(name=name))
    db.flush()


def seed_admin(db: Session):
    admin_exists = db.query(User).filter(User.email == "admin@gecko.local").first()
    if admin_exists:
        return
    admin_role = db.query(Role).filter(Role.name == "Admin").first()
    db.add(User(
        full_name="Administrator",
        email="admin@gecko.local",
        password_hash=hash_password("admin"),
        role_id=admin_role.id,
    ))

    transcriber_role = db.query(Role).filter(Role.name == "Transcriber").first()
    verifier_role = db.query(Role).filter(Role.name == "Verifier").first()
    supervisor_role = db.query(Role).filter(Role.name == "Supervisor").first()

    db.add(User(full_name="Иван Разметчик", email="transcriber@gecko.local", password_hash=hash_password("123"), role_id=transcriber_role.id))
    db.add(User(full_name="Мария Верификатор", email="verifier@gecko.local", password_hash=hash_password("123"), role_id=verifier_role.id))
    db.add(User(full_name="Алексей Супервайзер", email="supervisor@gecko.local", password_hash=hash_password("123"), role_id=supervisor_role.id))
    db.flush()


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        seed_roles(db)
        db.commit()
        seed_admin(db)
        db.commit()
    finally:
        db.close()


def user_out(user) -> dict:
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
    }


def log_audit(db: Session, user_id: int, entity_type: str, entity_id: int, action: str, old_value: str = None, new_value: str = None):
    db.add(AuditLog(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
    ))


def ensure_project(db: Session, project_id: int = None, name: str = "Default Project") -> int:
    if project_id:
        project = db.query(Project).filter(Project.id == project_id).first()
        if project:
            return project.id
    project = db.query(Project).first()
    if project:
        return project.id
    project = Project(name=name, description="Автосозданный проект", status="active")
    db.add(project)
    db.commit()
    db.refresh(project)
    return project.id


# ======================= AUTH =======================

@app.post("/auth/login", response_model=TokenOut)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if user.status == "blocked":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is blocked")

    token = create_access_token({"sub": str(user.id)})
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@app.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@app.post("/auth/register", response_model=UserOut, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    role = db.query(Role).filter(Role.id == data.role_id).first()
    if not role:
        raise HTTPException(status_code=400, detail="Role not found")

    user = User(
        full_name=data.full_name,
        email=data.email,
        password_hash=hash_password(data.password),
        role_id=data.role_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_audit(db, user.id, "user", user.id, "registered")
    db.commit()
    return UserOut.model_validate(user)


# ======================= USERS =======================

@app.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(require_role("Admin", "Supervisor", "Transcriber", "Verifier"))):
    return db.query(User).all()


@app.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), _=Depends(require_role("Admin", "Supervisor"))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut.model_validate(user)


@app.post("/users", response_model=UserOut, status_code=201)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("Admin")),
):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    role = db.query(Role).filter(Role.id == data.role_id).first()
    if not role:
        raise HTTPException(status_code=400, detail="Role not found")

    user = User(
        full_name=data.full_name,
        email=data.email,
        password_hash=hash_password(data.password),
        role_id=data.role_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_audit(db, user.id, "user", user.id, "created")
    db.commit()
    return UserOut.model_validate(user)


@app.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("Admin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_data = f"{user.full_name}|{user.email}|{user.role_id}|{user.status}"

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.email is not None:
        existing = db.query(User).filter(User.email == data.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = data.email
    if data.password is not None:
        user.password_hash = hash_password(data.password)
    if data.role_id is not None:
        role = db.query(Role).filter(Role.id == data.role_id).first()
        if not role:
            raise HTTPException(status_code=400, detail="Role not found")
        user.role_id = data.role_id
    if data.status is not None:
        user.status = data.status

    new_data = f"{user.full_name}|{user.email}|{user.role_id}|{user.status}"

    log_audit(db, current_user.id, "user", user_id, "updated", old_data, new_data)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@app.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("Admin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    from sqlalchemy import text
    db.execute(text("DELETE FROM comments WHERE author_id = :uid"), {"uid": user_id})
    db.execute(text("DELETE FROM verification_results WHERE verifier_id = :uid"), {"uid": user_id})
    db.execute(text("UPDATE tasks SET assignee_id = NULL WHERE assignee_id = :uid"), {"uid": user_id})
    db.execute(text("UPDATE tasks SET verifier_id = NULL WHERE verifier_id = :uid"), {"uid": user_id})
    db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": user_id})
    log_audit(db, current_user.id, "user", user_id, "deleted")
    db.commit()


@app.get("/roles")
def list_roles(db: Session = Depends(get_db), _=Depends(require_role("Admin"))):
    return db.query(Role).all()


@app.get("/audit", response_model=list)
def list_audit_logs(db: Session = Depends(get_db), _=Depends(require_role("Admin"))):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(200).all()
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "action": log.action,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]


# ======================= PROJECTS =======================

@app.get("/projects", response_model=List[ProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    _=Depends(require_role("Admin", "Supervisor", "Customer", "Transcriber", "Verifier")),
):
    return db.query(Project).all()


@app.get("/projects/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db), _=Depends(require_role("Admin", "Supervisor", "Customer"))):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    task_count = db.query(func.count(Task.id)).filter(Task.project_id == project_id).scalar()
    completed = db.query(func.count(Task.id)).filter(Task.project_id == project_id, Task.status.in_(["Accepted", "Exported"])).scalar()
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "customer": project.customer,
        "status": project.status,
        "deadline": project.deadline.isoformat() if project.deadline else None,
        "instruction_path": project.instruction_path,
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "task_count": task_count,
        "completed_tasks": completed,
    }


@app.post("/projects", response_model=ProjectOut, status_code=201)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("Admin", "Supervisor")),
):
    project = Project(**data.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    log_audit(db, current_user.id, "project", project.id, "created")
    db.commit()
    return project


@app.put("/projects/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("Admin", "Supervisor")),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(project, key, val)
    log_audit(db, current_user.id, "project", project_id, "updated")
    db.commit()
    db.refresh(project)
    return project


@app.delete("/projects/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("Admin")),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404)
    log_audit(db, current_user.id, "project", project_id, "deleted")
    db.delete(project)
    db.commit()


# ======================= TASKS =======================

@app.get("/tasks", response_model=List[dict])
def list_tasks(
    status_filter: Optional[str] = None,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(Task)
    if current_user.role.name == "Transcriber":
        query = query.filter(Task.assignee_id == current_user.id)
    elif current_user.role.name == "Verifier":
        query = query.filter(Task.status.in_(["On Review", "Rework", "In Progress"]))
    if status_filter:
        query = query.filter(Task.status == status_filter)
    if project_id:
        query = query.filter(Task.project_id == project_id)
    tasks = query.all()

    result = []
    for t in tasks:
        seg_count = db.query(func.count(Segment.id)).filter(Segment.task_id == t.id).scalar()
        comment_count = db.query(func.count(Comment.id)).filter(Comment.task_id == t.id).scalar()
        result.append({
            "id": t.id,
            "project_id": t.project_id,
            "media_file_id": t.media_file_id,
            "assignee_id": t.assignee_id,
            "verifier_id": t.verifier_id,
            "status": t.status,
            "priority": t.priority,
            "deadline": t.deadline.isoformat() if t.deadline else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "assignee": user_out(t.assignee) if t.assignee else None,
            "verifier": user_out(t.verifier) if t.verifier else None,
            "segment_count": seg_count,
            "comment_count": comment_count,
        })
    return result


@app.get("/tasks/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    t = db.query(Task).filter(Task.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404)
    seg_count = db.query(func.count(Segment.id)).filter(Segment.task_id == task_id).scalar()
    comment_count = db.query(func.count(Comment.id)).filter(Comment.task_id == task_id).scalar()
    media = t.media_file
    return {
        "id": t.id, "project_id": t.project_id, "media_file_id": t.media_file_id,
        "assignee_id": t.assignee_id, "verifier_id": t.verifier_id,
        "status": t.status, "priority": t.priority,
        "deadline": t.deadline.isoformat() if t.deadline else None,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "assignee": user_out(t.assignee) if t.assignee else None,
        "verifier": user_out(t.verifier) if t.verifier else None,
        "segment_count": seg_count,
        "comment_count": comment_count,
        "media": {
            "id": media.id, "audio_path": media.audio_path,
            "video_path": media.video_path, "duration": media.duration,
            "format": media.format,
        } if media else None,
    }


@app.get("/tasks/{task_id}/stats")
def get_task_stats(task_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    t = db.query(Task).filter(Task.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404)

    segments = db.query(Segment).filter(Segment.task_id == task_id).all()
    total = len(segments)
    checked = sum(1 for s in segments if s.status == "checked")
    crosstalk = sum(1 for s in segments if s.is_crosstalk)
    empty = sum(1 for s in segments if not s.text or not s.text.strip())
    total_duration = sum(max(0, (s.end_time or 0) - (s.start_time or 0)) for s in segments)
    verifications = db.query(func.count(VerificationResult.id)).filter(VerificationResult.task_id == task_id).scalar()
    rejected = db.query(func.count(VerificationResult.id)).filter(VerificationResult.task_id == task_id, VerificationResult.decision == "rejected").scalar()
    comments_total = db.query(func.count(Comment.id)).filter(Comment.task_id == task_id).scalar()

    return {
        "total_segments": total,
        "checked_segments": checked,
        "crosstalk_segments": crosstalk,
        "empty_segments": empty,
        "total_duration": round(total_duration, 2),
        "total_verifications": verifications,
        "rejected_count": rejected,
        "total_comments": comments_total,
        "progress_pct": round(checked / total * 100, 1) if total else 0,
    }


@app.post("/tasks", status_code=201)
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("Admin", "Supervisor", "Transcriber", "Verifier")),
):
    project_id = ensure_project(db, data.project_id)

    role = current_user.role.name
    assignee_id = data.assignee_id
    verifier_id = data.verifier_id
    if role in ("Transcriber", "Verifier"):
        assignee_id = assignee_id or current_user.id

    task = Task(
        project_id=project_id,
        media_file_id=data.media_file_id,
        assignee_id=assignee_id,
        verifier_id=verifier_id,
        status="New",
        priority=data.priority,
        deadline=data.deadline,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    log_audit(db, current_user.id, "task", task.id, "created")
    db.commit()
    return {"id": task.id, "status": "created"}


@app.put("/tasks/{task_id}")
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404)

    role = current_user.role.name
    old_status = task.status

    if data.status is not None:
        if role in ("Admin", "Supervisor"):
            task.status = data.status
        elif role == "Transcriber" and old_status in ("New", "Assigned", "In Progress", "Rework"):
            if data.status in ("In Progress", "On Review"):
                task.status = data.status
            else:
                raise HTTPException(status_code=403, detail="Invalid status transition for Transcriber")
        elif role == "Verifier" and old_status in ("On Review", "Rework"):
            if data.status in ("Rework", "Accepted"):
                task.status = data.status
            else:
                raise HTTPException(status_code=403, detail="Invalid status transition for Verifier")
        else:
            raise HTTPException(status_code=403, detail="Cannot change task status")

    if data.assignee_id is not None and role in ("Admin", "Supervisor"):
        task.assignee_id = data.assignee_id
    if data.verifier_id is not None and role in ("Admin", "Supervisor"):
        task.verifier_id = data.verifier_id
    if data.priority is not None and role in ("Admin", "Supervisor"):
        task.priority = data.priority

    log_audit(db, current_user.id, "task", task_id, f"status: {old_status} -> {task.status}")
    db.commit()
    return {"id": task.id, "status": task.status}


@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db), current_user=Depends(require_role("Admin"))):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404)
    log_audit(db, current_user.id, "task", task_id, "deleted")
    db.delete(task)
    db.commit()


# ======================= SEGMENTS =======================

@app.get("/tasks/{task_id}/segments", response_model=List[SegmentOut])
def get_segments(task_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Segment).filter(Segment.task_id == task_id).order_by(Segment.start_time).all()


@app.post("/tasks/{task_id}/segments", response_model=SegmentOut, status_code=201)
def create_segment(task_id: int, data: SegmentCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    seg = Segment(
        task_id=task_id,
        start_time=data.start_time,
        end_time=data.end_time,
        text=data.text,
        speaker_id=data.speaker_id,
        is_crosstalk=data.is_crosstalk,
        confidence=data.confidence,
    )
    db.add(seg)
    log_audit(db, current_user.id, "segment", 0, f"created for task {task_id}")
    db.commit()
    db.refresh(seg)
    return seg


@app.put("/segments/{segment_id}")
def update_segment(segment_id: int, data: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    seg = db.query(Segment).filter(Segment.id == segment_id).first()
    if not seg:
        raise HTTPException(status_code=404)
    for key in ("text", "is_crosstalk", "start_time", "end_time", "speaker_id", "status"):
        if key in data:
            setattr(seg, key, data[key])
    log_audit(db, current_user.id, "segment", segment_id, "updated")
    db.commit()
    return {"status": "ok"}


@app.delete("/segments/{segment_id}", status_code=204)
def delete_segment(segment_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    seg = db.query(Segment).filter(Segment.id == segment_id).first()
    if not seg:
        raise HTTPException(status_code=404)
    log_audit(db, current_user.id, "segment", segment_id, "deleted")
    db.delete(seg)
    db.commit()


@app.post("/segments/split")
def split_segment(data: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    segment_id = data.get("segment_id")
    split_time = data.get("split_time")
    if not segment_id or split_time is None:
        raise HTTPException(status_code=400, detail="segment_id and split_time required")

    seg = db.query(Segment).filter(Segment.id == segment_id).first()
    if not seg:
        raise HTTPException(status_code=404)

    if split_time <= seg.start_time or split_time >= seg.end_time:
        raise HTTPException(status_code=400, detail="split_time must be between start and end")

    text = seg.text or ""
    dur = seg.end_time - seg.start_time
    ratio = (split_time - seg.start_time) / dur if dur > 0 else 0.5
    words = text.split()
    split_idx = max(1, int(len(words) * ratio))
    text1 = " ".join(words[:split_idx])
    text2 = " ".join(words[split_idx:])

    seg1 = Segment(
        task_id=seg.task_id,
        start_time=seg.start_time,
        end_time=split_time,
        text=text1 if text1 else text,
        speaker_id=seg.speaker_id,
        is_crosstalk=seg.is_crosstalk,
        confidence=seg.confidence,
    )
    seg2 = Segment(
        task_id=seg.task_id,
        start_time=split_time,
        end_time=seg.end_time,
        text=text2 if text2 else "",
        speaker_id=seg.speaker_id,
        is_crosstalk=seg.is_crosstalk,
        confidence=seg.confidence,
    )
    db.add(seg1)
    db.add(seg2)
    db.delete(seg)
    log_audit(db, current_user.id, "segment", segment_id, f"split at {split_time}")
    db.commit()
    db.refresh(seg1)
    db.refresh(seg2)
    return {"status": "ok", "segments": [
        {"id": seg1.id, "start_time": seg1.start_time, "end_time": seg1.end_time, "text": seg1.text},
        {"id": seg2.id, "start_time": seg2.start_time, "end_time": seg2.end_time, "text": seg2.text},
    ]}


@app.post("/segments/merge")
def merge_segments(data: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    segment_ids = data.get("segment_ids", [])
    if len(segment_ids) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 segment_ids")

    segs = db.query(Segment).filter(Segment.id.in_(segment_ids)).order_by(Segment.start_time).all()
    if len(segs) < 2:
        raise HTTPException(status_code=404, detail="Segments not found")

    merged_text = " ".join(s.text for s in segs if s.text)
    merged = Segment(
        task_id=segs[0].task_id,
        start_time=segs[0].start_time,
        end_time=segs[-1].end_time,
        text=merged_text,
        speaker_id=segs[0].speaker_id,
        is_crosstalk=any(s.is_crosstalk for s in segs),
    )
    db.add(merged)
    for s in segs:
        db.delete(s)
    log_audit(db, current_user.id, "segment", 0, f"merged {segment_ids}")
    db.commit()
    db.refresh(merged)
    return {"status": "ok", "segment": {"id": merged.id, "start_time": merged.start_time, "end_time": merged.end_time, "text": merged.text}}


@app.post("/tasks/{task_id}/segments/import")
def import_segments(task_id: int, data: List[dict], db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404)
    db.query(Segment).filter(Segment.task_id == task_id).delete()
    for item in data:
        db.add(Segment(
            task_id=task_id,
            start_time=item.get("start_time", 0),
            end_time=item.get("end_time", 0),
            text=item.get("text", ""),
            is_crosstalk=item.get("is_crosstalk", False),
            speaker_id=item.get("speaker_id"),
            confidence=item.get("confidence"),
        ))
    log_audit(db, current_user.id, "task", task_id, f"imported {len(data)} segments")
    db.commit()
    return {"status": "success", "count": len(data)}


@app.get("/tasks/{task_id}/segments/export")
def export_segments(task_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404)
    segments = db.query(Segment).filter(Segment.task_id == task_id).order_by(Segment.start_time).all()
    speakers = db.query(Speaker).filter(Speaker.task_id == task_id).all()
    speaker_map = {s.id: s.display_name or s.original_name for s in speakers}

    monologues = []
    for seg in segments:
        speaker_name = speaker_map.get(seg.speaker_id, "Unknown")
        monologues.append({
            "speaker": speaker_name,
            "start": seg.start_time,
            "end": seg.end_time,
            "text": seg.text or "",
            "crosstalk": seg.is_crosstalk,
        })

    return {
        "version": "2.0",
        "task_id": task_id,
        "created_at": datetime.utcnow().isoformat(),
        "monologues": monologues,
    }


# ======================= COMMENTS =======================

@app.get("/tasks/{task_id}/comments", response_model=List[CommentOut])
def get_comments(task_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Comment).filter(Comment.task_id == task_id).order_by(Comment.created_at.desc()).all()


@app.post("/tasks/{task_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(
    task_id: int,
    data: CommentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role.name not in ("Admin", "Supervisor", "Verifier"):
        raise HTTPException(status_code=403, detail="Only verifiers and supervisors can add comments")

    comment = Comment(
        task_id=task_id,
        segment_id=data.segment_id,
        author_id=current_user.id,
        text=data.text,
    )
    db.add(comment)
    log_audit(db, current_user.id, "comment", 0, f"added to task {task_id}")
    db.commit()
    db.refresh(comment)
    return comment


@app.put("/comments/{comment_id}", response_model=CommentOut)
def update_comment(comment_id: int, data: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404)
    if data.get("text"):
        comment.text = data["text"]
    if data.get("status"):
        comment.status = data["status"]
    db.commit()
    db.refresh(comment)
    return comment


# ======================= VERIFICATION =======================

@app.post("/tasks/{task_id}/verify", response_model=VerificationOut, status_code=201)
def verify_task(
    task_id: int,
    data: VerificationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("Admin", "Verifier")),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404)

    vr = VerificationResult(
        task_id=task_id,
        verifier_id=current_user.id,
        decision=data.decision,
        score=data.score,
        comment=data.comment,
    )
    db.add(vr)

    if data.decision == "accepted":
        task.status = "Accepted"
    elif data.decision == "rejected":
        task.status = "Rework"
        # Also store the rejection reason as a comment so the transcriber can see it
        if data.comment:
            db.add(Comment(
                task_id=task_id,
                segment_id=None,
                author_id=current_user.id,
                text=f"Причина отклонения: {data.comment}",
            ))

    log_audit(db, current_user.id, "task", task_id, f"verified: {data.decision}", new_value=data.comment)
    db.commit()
    db.refresh(vr)
    return vr


@app.get("/tasks/{task_id}/verifications", response_model=List[VerificationOut])
def get_verifications(task_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(VerificationResult).filter(VerificationResult.task_id == task_id).order_by(VerificationResult.created_at.desc()).all()


# ======================= QUALITY CHECKS =======================

@app.get("/tasks/{task_id}/quality-checks", response_model=List[QualityCheckOut])
def get_quality_checks(task_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(QualityCheck).filter(QualityCheck.task_id == task_id).all()


@app.post("/tasks/{task_id}/quality-checks")
def run_quality_checks(task_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    db.query(QualityCheck).filter(QualityCheck.task_id == task_id).delete()
    segments = db.query(Segment).filter(Segment.task_id == task_id).order_by(Segment.start_time).all()

    checks = []

    for seg in segments:
        if not seg.text or not seg.text.strip():
            checks.append(QualityCheck(task_id=task_id, check_type="empty_segment", result=True,
                                       message=f"Segment {seg.id}: empty text", severity="error"))
        if (seg.end_time - seg.start_time) < 0.1:
            checks.append(QualityCheck(task_id=task_id, check_type="too_short", result=True,
                                       message=f"Segment {seg.id}: too short ({round(seg.end_time - seg.start_time, 3)}s)", severity="warning"))
        if (seg.end_time - seg.start_time) > 60:
            checks.append(QualityCheck(task_id=task_id, check_type="too_long", result=True,
                                       message=f"Segment {seg.id}: too long ({round(seg.end_time - seg.start_time, 1)}s)", severity="warning"))

    for i in range(len(segments)):
        for j in range(i + 1, len(segments)):
            if segments[i].end_time > segments[j].start_time:
                checks.append(QualityCheck(task_id=task_id, check_type="overlap", result=True,
                                           message=f"Segments {segments[i].id} and {segments[j].id} overlap", severity="error"))

    for i in range(len(segments) - 1):
        gap = segments[i + 1].start_time - segments[i].end_time
        if gap > 3:
            checks.append(QualityCheck(task_id=task_id, check_type="large_gap", result=True,
                                       message=f"Gap of {round(gap, 1)}s between segments {segments[i].id} and {segments[i+1].id}", severity="warning"))

    for c in checks:
        db.add(c)
    log_audit(db, current_user.id, "task", task_id, f"ran quality checks: {len(checks)} issues")
    db.commit()
    return {"status": "ok", "checks": len(checks)}


# ======================= SPEAKERS =======================

@app.get("/tasks/{task_id}/speakers", response_model=List[SpeakerOut])
def get_speakers(task_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Speaker).filter(Speaker.task_id == task_id).all()


@app.post("/tasks/{task_id}/speakers", response_model=SpeakerOut, status_code=201)
def create_speaker(task_id: int, data: SpeakerCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    speaker = Speaker(
        task_id=task_id,
        original_name=data.original_name,
        display_name=data.display_name or data.original_name,
        editable=data.editable,
    )
    db.add(speaker)
    db.commit()
    db.refresh(speaker)
    return speaker


@app.put("/speakers/{speaker_id}", response_model=SpeakerOut)
def update_speaker(speaker_id: int, data: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    speaker = db.query(Speaker).filter(Speaker.id == speaker_id).first()
    if not speaker:
        raise HTTPException(status_code=404)
    for key in ("display_name", "original_name", "editable"):
        if key in data:
            setattr(speaker, key, data[key])
    db.commit()
    db.refresh(speaker)
    return speaker


@app.delete("/speakers/{speaker_id}", status_code=204)
def delete_speaker(speaker_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    speaker = db.query(Speaker).filter(Speaker.id == speaker_id).first()
    if not speaker:
        raise HTTPException(status_code=404)
    db.delete(speaker)
    db.commit()


# ======================= TRANSCRIPTS =======================

@app.get("/tasks/{task_id}/transcripts", response_model=List[TranscriptOut])
def get_transcripts(task_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Transcript).filter(Transcript.task_id == task_id).order_by(Transcript.version.desc()).all()


@app.post("/tasks/{task_id}/transcripts", response_model=TranscriptOut, status_code=201)
def create_transcript(task_id: int, data: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    latest = db.query(Transcript).filter(Transcript.task_id == task_id).order_by(Transcript.version.desc()).first()
    version = (latest.version + 1) if latest else 1

    transcript = Transcript(
        task_id=task_id,
        source_json=data.get("source_json"),
        current_json=data.get("current_json"),
        version=version,
    )
    db.add(transcript)
    log_audit(db, current_user.id, "transcript", 0, f"version {version} for task {task_id}")
    db.commit()
    db.refresh(transcript)
    return transcript


# ======================= TERMS =======================

@app.get("/projects/{project_id}/terms", response_model=List[TermOut])
def get_terms(
    project_id: int,
    status_filter: Optional[str] = None,
    type_filter: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(Term).filter(Term.project_id == project_id)
    if status_filter:
        query = query.filter(Term.status == status_filter)
    if type_filter:
        query = query.filter(Term.type == type_filter)
    if search:
        query = query.filter(Term.value.ilike(f"%{search}%"))
    return query.all()


@app.post("/projects/{project_id}/terms", response_model=TermOut, status_code=201)
def create_term(project_id: int, data: TermCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    term = Term(
        project_id=project_id,
        value=data.value,
        normalized_value=data.normalized_value or data.value.lower(),
        type=data.type,
        category=data.category or "general",
        comment=data.comment,
    )
    db.add(term)
    log_audit(db, current_user.id, "term", 0, f"created '{data.value}'")
    db.commit()
    db.refresh(term)
    return term


@app.put("/terms/{term_id}", response_model=TermOut)
def update_term(term_id: int, data: TermUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    term = db.query(Term).filter(Term.id == term_id).first()
    if not term:
        raise HTTPException(status_code=404)
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(term, key, val)
    log_audit(db, current_user.id, "term", term_id, "updated")
    db.commit()
    db.refresh(term)
    return term


@app.delete("/terms/{term_id}", status_code=204)
def delete_term(term_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    term = db.query(Term).filter(Term.id == term_id).first()
    if not term:
        raise HTTPException(status_code=404)
    log_audit(db, current_user.id, "term", term_id, "deleted")
    db.delete(term)
    db.commit()


@app.post("/terms/{term_id}/approve", response_model=TermOut)
def approve_term(term_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    term = db.query(Term).filter(Term.id == term_id).first()
    if not term:
        raise HTTPException(status_code=404)
    term.status = "confirmed"
    log_audit(db, current_user.id, "term", term_id, "approved")
    db.commit()
    db.refresh(term)
    return term


@app.post("/terms/{term_id}/reject", response_model=TermOut)
def reject_term(term_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    term = db.query(Term).filter(Term.id == term_id).first()
    if not term:
        raise HTTPException(status_code=404)
    term.status = "rejected"
    log_audit(db, current_user.id, "term", term_id, "rejected")
    db.commit()
    db.refresh(term)
    return term


@app.post("/projects/{project_id}/terms/import")
def import_terms(project_id: int, data: List[dict], db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    count = 0
    for item in data:
        db.add(Term(
            project_id=project_id,
            value=item.get("value", ""),
            normalized_value=item.get("normalized_value", item.get("value", "").lower()),
            type=item.get("type", "general"),
            category=item.get("category", "general"),
            comment=item.get("comment"),
        ))
        count += 1
    log_audit(db, current_user.id, "project", project_id, f"imported {count} terms")
    db.commit()
    return {"status": "success", "count": count}


# ======================= MEDIA =======================

@app.get("/projects/{project_id}/media", response_model=List[MediaFileOut])
def list_media(project_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(MediaFile).filter(MediaFile.project_id == project_id).all()


@app.post("/media/upload")
async def upload_media(
    project_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_role("Admin", "Supervisor", "Transcriber", "Verifier")),
):
    project_id = ensure_project(db, project_id)

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else "bin"
    saved_path = UPLOAD_DIR / f"{project_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{file.filename}"
    content = await file.read()
    saved_path.write_bytes(content)

    is_video = ext in ("mp4", "webm", "avi", "mov", "mkv", "mpg", "mpeg", "wmv", "flv")
    is_audio = not is_video and ext in ("wav", "mp3", "ogg", "flac", "m4a", "aac")

    media = MediaFile(
        project_id=project_id,
        audio_path=str(saved_path) if is_audio else None,
        video_path=str(saved_path) if is_video else None,
        format=ext,
    )
    db.add(media)
    log_audit(db, current_user.id, "media", 0, f"uploaded {file.filename}")
    db.commit()
    db.refresh(media)

    return {
        "id": media.id,
        "project_id": media.project_id,
        "audio_path": media.audio_path,
        "video_path": media.video_path,
        "format": media.format,
        "filename": file.filename,
    }


@app.get("/media/{media_id}")
def get_media(media_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    media = db.query(MediaFile).filter(MediaFile.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404)
    return {
        "id": media.id, "project_id": media.project_id,
        "audio_path": media.audio_path, "video_path": media.video_path,
        "duration": media.duration, "format": media.format,
        "uploaded_at": media.uploaded_at.isoformat() if media.uploaded_at else None,
    }


@app.delete("/media/{media_id}", status_code=204)
def delete_media(media_id: int, db: Session = Depends(get_db), current_user=Depends(require_role("Admin"))):
    media = db.query(MediaFile).filter(MediaFile.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404)
    log_audit(db, current_user.id, "media", media_id, "deleted")
    db.delete(media)
    db.commit()


@app.get("/media/serve/{media_id}")
def serve_media(media_id: int, token: str = Query(default=""), db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="Token required")
    try:
        from app.core.security import decode_access_token
        payload = decode_access_token(token)
        if not payload:
            raise HTTPException(status_code=401)
    except:
        raise HTTPException(status_code=401)
    media = db.query(MediaFile).filter(MediaFile.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404)
    file_path = media.audio_path or media.video_path
    if not file_path:
        raise HTTPException(status_code=404, detail="No file attached")
    path = Path(file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    ext = path.suffix.lstrip(".").lower()
    mime_map = {"wav": "audio/wav", "mp3": "audio/mpeg", "ogg": "audio/ogg", "flac": "audio/flac", "m4a": "audio/mp4", "aac": "audio/aac", "mp4": "video/mp4", "webm": "video/webm", "avi": "video/x-msvideo", "mov": "video/quicktime", "mkv": "video/x-matroska"}
    return FileResponse(path, media_type=mime_map.get(ext, "application/octet-stream"))


# ======================= INSTRUCTIONS =======================

@app.post("/projects/{project_id}/instruction")
async def upload_instruction(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_role("Admin", "Supervisor")),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    saved_path = UPLOAD_DIR / f"instruction_{project_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{file.filename}"
    content = await file.read()
    saved_path.write_bytes(content)

    project.instruction_path = str(saved_path)
    log_audit(db, current_user.id, "project", project_id, f"instruction_uploaded {file.filename}")
    db.commit()

    return {"filename": file.filename, "path": str(saved_path)}


@app.get("/projects/{project_id}/instruction/download")
def download_instruction(
    project_id: int,
    db: Session = Depends(get_db),
    token: str = Query(default=""),
    _=Depends(get_current_user),
):
    if not token:
        raise HTTPException(status_code=401, detail="Token required")
    try:
        from app.core.security import decode_access_token
        payload = decode_access_token(token)
        if not payload:
            raise HTTPException(status_code=401)
    except:
        raise HTTPException(status_code=401)

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.instruction_path:
        raise HTTPException(status_code=404, detail="No instruction file")
    path = Path(project.instruction_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(path, filename=path.name)


@app.delete("/projects/{project_id}/instruction", status_code=204)
def delete_instruction(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("Admin")),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404)
    project.instruction_path = None
    log_audit(db, current_user.id, "project", project_id, "instruction_deleted")
    db.commit()


# ======================= EXPORT =======================

@app.post("/tasks/{task_id}/export")
def export_task(task_id: int, data: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404)

    fmt = data.get("format", "gecko_json")
    segments = db.query(Segment).filter(Segment.task_id == task_id).order_by(Segment.start_time).all()
    speakers = db.query(Speaker).filter(Speaker.task_id == task_id).all()
    speaker_map = {s.id: s.display_name or s.original_name for s in speakers}

    monologues = []
    for seg in segments:
        speaker_name = speaker_map.get(seg.speaker_id, "Unknown")
        monologues.append({
            "speaker": speaker_name,
            "start": seg.start_time,
            "end": seg.end_time,
            "text": seg.text or "",
            "crosstalk": seg.is_crosstalk,
        })

    export_json = json.dumps({
        "version": "2.0",
        "task_id": task_id,
        "exported_at": datetime.utcnow().isoformat(),
        "format": fmt,
        "monologues": monologues,
    }, ensure_ascii=False)

    export_path = UPLOAD_DIR / f"export_task_{task_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.json"
    export_path.write_text(export_json, encoding="utf-8")

    export_record = ExportFile(
        task_id=task_id,
        format=fmt,
        path=str(export_path),
    )
    db.add(export_record)
    task.status = "Exported"
    log_audit(db, current_user.id, "task", task_id, "exported")
    db.commit()
    db.refresh(export_record)

    return {
        "id": export_record.id,
        "task_id": task_id,
        "format": fmt,
        "path": str(export_path),
        "monologues": monologues,
    }


@app.get("/exports")
def list_exports(task_id: Optional[int] = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    query = db.query(ExportFile)
    if task_id:
        query = query.filter(ExportFile.task_id == task_id)
    exports = query.order_by(ExportFile.created_at.desc()).all()
    return [
        {
            "id": e.id, "task_id": e.task_id, "format": e.format,
            "path": e.path,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in exports
    ]


@app.get("/exports/{export_id}/download")
def download_export(export_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    export = db.query(ExportFile).filter(ExportFile.id == export_id).first()
    if not export or not export.path:
        raise HTTPException(status_code=404)
    path = Path(export.path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(path, media_type="application/json", filename=path.name)


# ======================= ANALYTICS =======================

@app.get("/analytics/dashboard")
def analytics_dashboard(db: Session = Depends(get_db), _=Depends(require_role("Admin", "Supervisor"))):
    total_projects = db.query(func.count(Project.id)).scalar()
    total_tasks = db.query(func.count(Task.id)).scalar()
    total_users = db.query(func.count(User.id)).scalar()
    total_segments = db.query(func.count(Segment.id)).scalar()

    status_counts = {}
    for row in db.query(Task.status, func.count(Task.id)).group_by(Task.status).all():
        status_counts[row[0]] = row[1]

    return {
        "total_projects": total_projects,
        "total_tasks": total_tasks,
        "total_users": total_users,
        "total_segments": total_segments,
        "status_distribution": status_counts,
    }


@app.get("/analytics/projects/{project_id}")
def project_analytics(project_id: int, db: Session = Depends(get_db), _=Depends(require_role("Admin", "Supervisor"))):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404)

    total_tasks = db.query(func.count(Task.id)).filter(Task.project_id == project_id).scalar()
    completed = db.query(func.count(Task.id)).filter(Task.project_id == project_id, Task.status.in_(["Accepted", "Exported"])).scalar()
    in_progress = db.query(func.count(Task.id)).filter(Task.project_id == project_id, Task.status.in_(["In Progress", "Assigned"])).scalar()

    total_segments = db.query(func.count(Segment.id)).join(Task).filter(Task.project_id == project_id).scalar()
    total_terms = db.query(func.count(Term.id)).filter(Term.project_id == project_id).scalar()

    verifications = db.query(func.count(VerificationResult.id)).join(Task).filter(Task.project_id == project_id).scalar()
    rejected = db.query(func.count(VerificationResult.id)).join(Task).filter(
        Task.project_id == project_id, VerificationResult.decision == "rejected"
    ).scalar()

    return {
        "project_id": project_id,
        "project_name": project.name,
        "total_tasks": total_tasks,
        "completed_tasks": completed,
        "in_progress_tasks": in_progress,
        "completion_pct": round(completed / total_tasks * 100, 1) if total_tasks else 0,
        "total_segments": total_segments,
        "total_terms": total_terms,
        "total_verifications": verifications,
        "rejected_count": rejected,
        "rejection_rate": round(rejected / verifications * 100, 1) if verifications else 0,
    }


@app.get("/analytics/users")
def user_analytics(db: Session = Depends(get_db), _=Depends(require_role("Admin", "Supervisor"))):
    users_data = []
    for user in db.query(User).filter(User.role.has(name="Transcriber")).all():
        assigned = db.query(func.count(Task.id)).filter(Task.assignee_id == user.id).scalar()
        completed = db.query(func.count(Task.id)).filter(
            Task.assignee_id == user.id, Task.status.in_(["Accepted", "Exported"])
        ).scalar()
        total_segs = db.query(func.count(Segment.id)).join(Task).filter(Task.assignee_id == user.id).scalar()
        users_data.append({
            "user_id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "assigned_tasks": assigned,
            "completed_tasks": completed,
            "total_segments": total_segs,
        })
    return users_data


@app.get("/analytics/quality")
def quality_analytics(db: Session = Depends(get_db), _=Depends(require_role("Admin", "Supervisor"))):
    total_verifications = db.query(func.count(VerificationResult.id)).scalar()
    accepted = db.query(func.count(VerificationResult.id)).filter(VerificationResult.decision == "accepted").scalar()
    rejected = db.query(func.count(VerificationResult.id)).filter(VerificationResult.decision == "rejected").scalar()
    avg_score = db.query(func.avg(VerificationResult.score)).filter(VerificationResult.score.isnot(None)).scalar()

    total_checks = db.query(func.count(QualityCheck.id)).scalar()
    errors = db.query(func.count(QualityCheck.id)).filter(QualityCheck.severity == "error").scalar()
    warnings = db.query(func.count(QualityCheck.id)).filter(QualityCheck.severity == "warning").scalar()

    return {
        "total_verifications": total_verifications,
        "accepted": accepted,
        "rejected": rejected,
        "acceptance_rate": round(accepted / total_verifications * 100, 1) if total_verifications else 0,
        "avg_score": round(avg_score, 1) if avg_score else None,
        "total_quality_checks": total_checks,
        "errors": errors,
        "warnings": warnings,
    }


@app.get("/analytics/terms")
def terms_analytics(db: Session = Depends(get_db), _=Depends(require_role("Admin", "Supervisor"))):
    total = db.query(func.count(Term.id)).scalar()
    confirmed = db.query(func.count(Term.id)).filter(Term.status == "confirmed").scalar()
    rejected = db.query(func.count(Term.id)).filter(Term.status == "rejected").scalar()
    new = db.query(func.count(Term.id)).filter(Term.status == "new").scalar()
    on_review = db.query(func.count(Term.id)).filter(Term.status == "on_review").scalar()

    by_type = {}
    for row in db.query(Term.type, func.count(Term.id)).group_by(Term.type).all():
        by_type[row[0]] = row[1]

    return {
        "total_terms": total,
        "confirmed": confirmed,
        "rejected": rejected,
        "new": new,
        "on_review": on_review,
        "by_type": by_type,
    }
