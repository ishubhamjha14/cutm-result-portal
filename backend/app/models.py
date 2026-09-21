import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    UniqueConstraint,
    Text,
)
from sqlalchemy.orm import relationship
from .database import Base


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(50), default="SUPER_ADMIN", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        nullable=False,
    )

    audit_logs = relationship("AuditLog", back_populates="admin")


class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)  # e.g., CSE, ECE, EEE, ME
    name = Column(String(100), nullable=False)  # Computer Science & Engineering
    department = Column(String(100), default="School of Engineering and Technology")
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    students = relationship("Student", back_populates="branch")
    subjects = relationship("Subject", back_populates="branch")


class Program(Base):
    __tablename__ = "programs"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)  # BTECH, MTECH, BCA, MCA
    name = Column(String(100), nullable=False)  # Bachelor of Technology
    duration_years = Column(Integer, default=4, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    students = relationship("Student", back_populates="program")


class Semester(Base):
    __tablename__ = "semesters"

    id = Column(Integer, primary_key=True, index=True)
    semester_number = Column(Integer, unique=True, index=True, nullable=False)  # 1, 2, 3, 4, 5, 6, 7, 8
    name = Column(String(50), nullable=False)  # Semester 1, Semester 2...
    is_active = Column(Boolean, default=True)

    results = relationship("Result", back_populates="semester")
    subjects = relationship("Subject", back_populates="semester")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    registration_number = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(120), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    program_id = Column(Integer, ForeignKey("programs.id"), nullable=False, index=True)
    academic_session = Column(String(30), nullable=False, index=True)  # e.g. 2024-2028
    campus = Column(String(100), default="Bhubaneswar / Paralakhemundi Campus")
    email = Column(String(120), nullable=True)
    phone = Column(String(30), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        nullable=False,
    )

    branch = relationship("Branch", back_populates="students")
    program = relationship("Program", back_populates="students")
    results = relationship("Result", back_populates="student", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_student_reg_branch", "registration_number", "branch_id"),
    )


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), index=True, nullable=False)  # e.g., CSE3001
    name = Column(String(150), nullable=False)  # Machine Learning
    default_credits = Column(Float, default=4.0, nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    branch = relationship("Branch", back_populates="subjects")
    semester = relationship("Semester", back_populates="subjects")
    results = relationship("Result", back_populates="subject")

    __table_args__ = (
        UniqueConstraint("code", "name", name="uq_subject_code_name"),
    )


class Result(Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False, index=True)
    academic_session = Column(String(30), nullable=False, index=True)  # e.g., 2024-2028
    
    credits = Column(Float, nullable=False)  # e.g., 4.0
    grade = Column(String(10), nullable=False)  # O, A+, A, B+, B, C, D, F, E
    grade_point = Column(Float, nullable=False)  # 10.0, 9.0, 8.0 etc.
    credit_points = Column(Float, nullable=False)  # credits * grade_point
    
    examination_month_year = Column(String(50), default="DECEMBER-2025")
    published_date = Column(String(50), default=datetime.date.today().strftime("%d-%b-%Y"))
    status = Column(String(20), default="PASS")  # PASS / FAIL / BACKLOG
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        nullable=False,
    )

    student = relationship("Student", back_populates="results")
    subject = relationship("Subject", back_populates="results")
    semester = relationship("Semester", back_populates="results")

    __table_args__ = (
        UniqueConstraint("student_id", "subject_id", "semester_id", name="uq_student_subject_semester"),
        Index("idx_results_student_sem", "student_id", "semester_id"),
        Index("idx_results_sem_session", "semester_id", "academic_session"),
    )


class GradeConfiguration(Base):
    __tablename__ = "grade_configurations"

    id = Column(Integer, primary_key=True, index=True)
    grade_letter = Column(String(10), unique=True, index=True, nullable=False)  # O, A+, A, B+, B, C, D, F, E
    grade_point = Column(Float, nullable=False)  # 10.0, 9.0, 8.0, 7.0, 6.0, 5.0, 4.0, 0.0, 9.0
    description = Column(String(100), default="Outstanding")
    min_marks = Column(Float, default=90.0)
    max_marks = Column(Float, default=100.0)
    is_active = Column(Boolean, default=True, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        nullable=False,
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    admin_email = Column(String(120), nullable=False)
    action = Column(String(80), nullable=False)  # LOGIN, IMPORT_RESULTS, CREATE_RESULT, UPDATE_RESULT, DELETE_RESULT, UPDATE_GRADE
    entity_type = Column(String(50), nullable=True)  # Result, GradeConfiguration, Student
    entity_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)

    admin = relationship("Admin", back_populates="audit_logs")
