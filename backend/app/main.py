from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.db.database import engine, Base, SessionLocal
from app.db.models import Role, User, AuditLog, Project, Task, MediaFile, Segment, Comment, VerificationResult, Speaker, Transcript
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
)
from typing import List

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


def seed_demo_project(db: Session):
    if db.query(Project).count() > 0:
        return

    project = Project(name="Demo Project", description="Демонстрационный проект для тестирования", customer="Demo Customer", status="active")
    db.add(project)
    db.flush()

    mf = MediaFile(project_id=project.id, audio_path="demo_audio.wav", duration=120.0, format="wav")
    db.add(mf)
    db.flush()

    transcriber = db.query(User).filter(User.email == "transcriber@gecko.local").first()
    verifier = db.query(User).filter(User.email == "verifier@gecko.local").first()

    db.add(Task(project_id=project.id, media_file_id=mf.id, assignee_id=transcriber.id if transcriber else None, verifier_id=verifier.id if verifier else None, status="In Progress"))
    db.add(Task(project_id=project.id, media_file_id=mf.id, assignee_id=transcriber.id if transcriber else None, verifier_id=verifier.id if verifier else None, status="New"))


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        seed_roles(db)
        db.commit()
        seed_admin(db)
        db.commit()
        seed_demo_project(db)
        db.commit()
    finally:
        db.close()


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


@app.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(require_role("Admin", "Supervisor"))):
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

    db.add(AuditLog(
        user_id=user.id,
        entity_type="user",
        entity_id=user.id,
        action="created",
    ))
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

    db.add(AuditLog(
        user_id=current_user.id,
        entity_type="user",
        entity_id=user_id,
        action="updated",
        old_value=old_data,
        new_value=new_data,
    ))
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

    db.add(AuditLog(
        user_id=current_user.id,
        entity_type="user",
        entity_id=user_id,
        action="deleted",
    ))
    db.delete(user)
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


def user_out(user) -> dict:
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
    }


# ======================= PROJECTS =======================

@app.get("/projects", response_model=List[ProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    _=Depends(require_role("Admin", "Supervisor", "Customer")),
):
    return db.query(Project).all()


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
    db.add(AuditLog(user_id=current_user.id, entity_type="project", entity_id=project.id, action="created"))
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
    db.add(AuditLog(user_id=current_user.id, entity_type="project", entity_id=project_id, action="updated"))
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
    db.add(AuditLog(user_id=current_user.id, entity_type="project", entity_id=project_id, action="deleted"))
    db.delete(project)
    db.commit()


# ======================= TASKS =======================

@app.get("/tasks", response_model=List[dict])
def list_tasks(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(Task)
    if current_user.role.name == "Transcriber":
        query = query.filter(Task.assignee_id == current_user.id)
    elif current_user.role.name == "Verifier":
        query = query.filter(Task.verifier_id == current_user.id)
    tasks = query.all()

    result = []
    for t in tasks:
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
        })
    return result


@app.get("/tasks/{task_id}", response_model=dict)
def get_task(task_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    t = db.query(Task).filter(Task.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404)
    return {
        "id": t.id, "project_id": t.project_id, "media_file_id": t.media_file_id,
        "assignee_id": t.assignee_id, "verifier_id": t.verifier_id,
        "status": t.status, "priority": t.priority,
        "deadline": t.deadline.isoformat() if t.deadline else None,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "assignee": user_out(t.assignee) if t.assignee else None,
        "verifier": user_out(t.verifier) if t.verifier else None,
    }


@app.post("/tasks", status_code=201)
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("Admin", "Supervisor")),
):
    project = db.query(Project).filter(Project.id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=400, detail="Project not found")

    task = Task(
        project_id=data.project_id,
        media_file_id=data.media_file_id,
        assignee_id=data.assignee_id,
        verifier_id=data.verifier_id,
        status="New",
        priority=data.priority,
        deadline=data.deadline,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    db.add(AuditLog(user_id=current_user.id, entity_type="task", entity_id=task.id, action="created"))
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
        allowed_transitions = {
            "New": ["Assigned"],
            "Assigned": ["In Progress"],
            "In Progress": ["On Review", "New"],
            "On Review": ["Rework", "Accepted"],
            "Rework": ["Fixed", "In Progress"],
            "Fixed": ["On Review"],
            "Accepted": ["Exported"],
        }
        if role in ("Admin", "Supervisor"):
            task.status = data.status
        elif role == "Transcriber" and old_status in ("New", "Assigned", "In Progress"):
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

    db.add(AuditLog(
        user_id=current_user.id, entity_type="task", entity_id=task_id,
        action=f"status: {old_status} -> {task.status}",
    ))
    db.commit()
    return {"id": task.id, "status": task.status}


# ======================= SEGMENTS =======================

@app.get("/tasks/{task_id}/segments")
def get_segments(task_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Segment).filter(Segment.task_id == task_id).order_by(Segment.start_time).all()


@app.put("/segments/{segment_id}")
def update_segment(segment_id: int, data: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    seg = db.query(Segment).filter(Segment.id == segment_id).first()
    if not seg:
        raise HTTPException(status_code=404)
    for key in ("text", "is_crosstalk", "start_time", "end_time", "speaker_id", "status"):
        if key in data:
            setattr(seg, key, data[key])
    db.commit()
    return {"status": "ok"}


@app.post("/tasks/{task_id}/segments/import")
def import_segments(task_id: int, data: List[dict], db: Session = Depends(get_db), _=Depends(get_current_user)):
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
    db.commit()
    return {"status": "success", "count": len(data)}


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

    db.add(AuditLog(
        user_id=current_user.id, entity_type="task", entity_id=task_id,
        action=f"verified: {data.decision}",
        new_value=data.comment,
    ))
    db.commit()
    db.refresh(vr)
    return vr


@app.get("/tasks/{task_id}/verifications", response_model=List[VerificationOut])
def get_verifications(task_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(VerificationResult).filter(VerificationResult.task_id == task_id).order_by(VerificationResult.created_at.desc()).all()


# ======================= MEDIA FILES =======================

@app.get("/projects/{project_id}/media", response_model=List[MediaFileOut])
def list_media(project_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(MediaFile).filter(MediaFile.project_id == project_id).all()
