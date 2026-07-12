from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

Base = declarative_base()

class Role(Base):
    __tablename__ = "roles"

    # Поля согласно ТЗ 
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)  # Например: 'admin', 'annotator', 'verifier'
    permissions = Column(Text, nullable=True)  # Список прав (можно хранить как JSON или строку)

    # Отношения
    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"

    # Поля согласно ТЗ 
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    status = Column(String(50), default="active")  # Статус пользователя (active, blocked)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Отношения
    role = relationship("Role", back_populates="users")
    assigned_tasks = relationship("Task", foreign_keys="[Task.assignee_id]", back_populates="assignee")
    verified_tasks = relationship("Task", foreign_keys="[Task.verifier_id]", back_populates="verifier")


class Task(Base):
    """
    Промежуточная сущность, необходимая для связи Сегментов с проектами и пользователями.
    """
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, nullable=False)
    media_file_id = Column(Integer, nullable=False)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Разметчик
    verifier_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Верификатор
    status = Column(String(50), default="New")  # Статусы из ТЗ: New, Assigned, In Progress и т.д. 
    priority = Column(String(50), default="Medium")
    deadline = Column(DateTime, nullable=True)

    # Отношения
    assignee = relationship("User", foreign_keys=[assignee_id], back_populates="assigned_tasks")
    verifier = relationship("User", foreign_keys=[verifier_id], back_populates="verified_tasks")
    segments = relationship("Segment", back_populates="task", cascade="all, delete-orphan")


class Segment(Base):
    __tablename__ = "segments"

    # Поля согласно ТЗ 
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    start_time = Column(Float, nullable=False)  # Точность до 0.01 сек согласно нефункциональным требованиям 
    end_time = Column(Float, nullable=False)
    text = Column(Text, nullable=True)  # Текст транскрипции сегмента
    speaker_id = Column(Integer, nullable=True)  # ID спикера (связь с сущностью Speaker при расширении)
    status = Column(String(50), default="not_checked")  # Статус проверки сегмента
    confidence = Column(Float, nullable=True)  # Уверенность ASR модели 
    is_crosstalk = Column(Boolean, default=False)  # Флаг пересекающейся речи нескольких спикеров 

    # Отношения
    task = relationship("Task", back_populates="segments")