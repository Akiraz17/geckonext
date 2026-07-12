from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import create_engine, Column, Integer, Float, String, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

DATABASE_URL = "sqlite:///./gecko.db"
Base = declarative_base()
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class DBTask(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    status = Column(String, default="New")

class DBSegment(Base):
    __tablename__ = "segments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    text = Column(String, default="")
    is_crosstalk = Column(Boolean, default=False)

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

class SegmentItem(BaseModel):
    start_time: float
    end_time: float
    text: str
    is_crosstalk: bool

class SegmentUpdate(BaseModel):
    text: Optional[str] = None
    is_crosstalk: Optional[bool] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None

@app.get("/tasks/{task_id}/segments")
def get_segments(task_id: int, db: Session = Depends(get_db)):
    return db.query(DBSegment).filter(DBSegment.task_id == task_id).order_by(DBSegment.start_time).all()

@app.put("/segments/{segment_id}")
def update_segment(segment_id: int, data: SegmentUpdate, db: Session = Depends(get_db)):
    seg = db.query(DBSegment).filter(DBSegment.id == segment_id).first()
    if not seg: raise HTTPException(status_code=404)
    if data.text is not None: seg.text = data.text
    if data.is_crosstalk is not None: seg.is_crosstalk = data.is_crosstalk
    if data.start_time is not None: seg.start_time = data.start_time
    if data.end_time is not None: seg.end_time = data.end_time
    db.commit()
    return {"status": "ok"}

@app.post("/tasks/import")
def import_task(data: List[SegmentItem], db: Session = Depends(get_db)):
    task_id = 1
    db.query(DBSegment).filter(DBSegment.task_id == task_id).delete()
    if not db.query(DBTask).filter(DBTask.id == task_id).first():
        db.add(DBTask(id=task_id, status="In Progress"))
    for item in data:
        db.add(DBSegment(task_id=task_id, start_time=item.start_time, end_time=item.end_time, text=item.text, is_crosstalk=item.is_crosstalk))
    db.commit()
    return {"status": "success"}