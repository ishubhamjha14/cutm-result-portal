from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from .config import settings
from .database import engine, Base, SessionLocal
from .models import Admin, Branch, Program, Semester, GradeConfiguration
from .auth import get_password_hash
from .routers import (
    public_results,
    auth,
    admin_results,
    admin_students,
    admin_grades,
    admin_audit,
    admin_meta,
)

def init_default_tables_and_admin():
    """Create tables and initialize baseline admin and grade scales if not present."""
    Base.metadata.create_all(bind=engine)

    # Run dynamic schema migrations to ensure nullable columns on existing databases (e.g. Render PostgreSQL)
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE results ALTER COLUMN grade DROP NOT NULL;"))
            conn.execute(text("ALTER TABLE results ALTER COLUMN grade_point DROP NOT NULL;"))
    except Exception:
        pass

    db = SessionLocal()
    try:
        # Check if default admin exists
        admin = db.query(Admin).filter((Admin.username == "admin") | (Admin.email == settings.ADMIN_DEFAULT_EMAIL) | (Admin.email == "admin@cutm.ac.in")).first()
        if not admin:
            default_admin = Admin(
                username=settings.ADMIN_DEFAULT_USERNAME,
                email=settings.ADMIN_DEFAULT_EMAIL,
                hashed_password=get_password_hash(settings.ADMIN_DEFAULT_PASSWORD),
                full_name=settings.ADMIN_DEFAULT_NAME,
                role="SUPER_ADMIN",
                is_active=True
            )
            db.add(default_admin)
        else:
            admin.email = settings.ADMIN_DEFAULT_EMAIL
            admin.full_name = settings.ADMIN_DEFAULT_NAME
            admin.username = settings.ADMIN_DEFAULT_USERNAME
            admin.hashed_password = get_password_hash(settings.ADMIN_DEFAULT_PASSWORD)
            admin.is_active = True

        # Official CUTM 10-Point CBCS Grade Scale, Nursing Grades & Special Statuses
        official_grades = [
            {"grade_letter": "O", "grade_point": 10.0, "description": "Outstanding", "min_marks": 90.0, "max_marks": 100.0},
            {"grade_letter": "E", "grade_point": 9.0, "description": "Excellent", "min_marks": 80.0, "max_marks": 89.9},
            {"grade_letter": "A", "grade_point": 8.0, "description": "Very Good", "min_marks": 70.0, "max_marks": 79.9},
            {"grade_letter": "B+", "grade_point": 7.5, "description": "Good Plus (Nursing / Specific Programs)", "min_marks": 65.0, "max_marks": 69.9},
            {"grade_letter": "B", "grade_point": 7.0, "description": "Good", "min_marks": 60.0, "max_marks": 64.9},
            {"grade_letter": "C", "grade_point": 6.0, "description": "Above Average", "min_marks": 50.0, "max_marks": 59.9},
            {"grade_letter": "D", "grade_point": 5.0, "description": "Pass", "min_marks": 40.0, "max_marks": 49.9},
            {"grade_letter": "F", "grade_point": 0.0, "description": "Fail", "min_marks": 0.0, "max_marks": 39.9},
            {"grade_letter": "M", "grade_point": 0.0, "description": "Mal Practice", "min_marks": 0.0, "max_marks": 0.0},
            {"grade_letter": "S", "grade_point": 0.0, "description": "Absent", "min_marks": 0.0, "max_marks": 0.0},
            {"grade_letter": "R", "grade_point": 0.0, "description": "Repeat/Reappear", "min_marks": 0.0, "max_marks": 0.0},
        ]
        valid_letters = {g["grade_letter"] for g in official_grades}

        # Purge any invalid grades like B+, A+, R
        db.query(GradeConfiguration).filter(~GradeConfiguration.grade_letter.in_(valid_letters)).delete(synchronize_session=False)

        # Ensure all official grades exist and have correct grade points
        for g_data in official_grades:
            g_obj = db.query(GradeConfiguration).filter(GradeConfiguration.grade_letter == g_data["grade_letter"]).first()
            if not g_obj:
                db.add(GradeConfiguration(**g_data))
            else:
                g_obj.grade_point = g_data["grade_point"]
                g_obj.description = g_data["description"]
                g_obj.min_marks = g_data["min_marks"]
                g_obj.max_marks = g_data["max_marks"]

        # Check default semesters (1 through 8)
        sem_count = db.query(Semester).count()
        if sem_count == 0:
            for s in range(1, 9):
                db.add(Semester(semester_number=s, name=f"Semester {s}", is_active=True))

        # Check default programs
        prog_count = db.query(Program).count()
        if prog_count == 0:
            db.add_all([
                Program(code="BTECH", name="Bachelor of Technology", duration_years=4),
                Program(code="MTECH", name="Master of Technology", duration_years=2),
                Program(code="BCA", name="Bachelor of Computer Applications", duration_years=3),
                Program(code="MCA", name="Master of Computer Applications", duration_years=2),
                Program(code="DIPLOMA", name="Diploma in Engineering", duration_years=3),
            ])

        # Check default branches
        branch_count = db.query(Branch).count()
        if branch_count == 0:
            db.add_all([
                Branch(code="CSE", name="Computer Science & Engineering", department="School of Engineering and Technology"),
                Branch(code="CSE-AIML", name="CSE (Artificial Intelligence & Machine Learning)", department="School of Engineering and Technology"),
                Branch(code="ECE", name="Electronics & Communication Engineering", department="School of Engineering and Technology"),
                Branch(code="EEE", name="Electrical & Electronics Engineering", department="School of Engineering and Technology"),
                Branch(code="ME", name="Mechanical Engineering", department="School of Engineering and Technology"),
                Branch(code="CE", name="Civil Engineering", department="School of Engineering and Technology"),
                Branch(code="AEROSPACE", name="Aerospace Engineering", department="School of Engineering and Technology"),
            ])

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error during baseline initialization: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables and seeds
    init_default_tables_and_admin()
    yield
    # Shutdown logic if any


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Centurion University of Technology and Management (CUTM) Academic Result Portal REST API",
    lifespan=lifespan
)

# Explicit list of allowed production and local origins
allowed_origins = [
    "https://cutm-result-portal-three.vercel.app",
    "https://cutm-result-portal-api.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
for o in settings.cors_origins_list:
    if o not in allowed_origins:
        allowed_origins.append(o)

# Standard Starlette CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

@app.middleware("http")
async def ensure_cors_headers_on_all_responses(request: Request, call_next):
    origin = request.headers.get("origin")
    
    # Handle preflight OPTIONS explicitly for maximum reliability
    if request.method == "OPTIONS" and origin:
        is_allowed = (
            origin in allowed_origins
            or origin.endswith(".vercel.app")
            or origin.startswith("http://localhost")
            or origin.startswith("http://127.0.0.1")
        )
        if is_allowed:
            from fastapi.responses import Response
            return Response(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": request.headers.get("access-control-request-headers", "*"),
                    "Access-Control-Max-Age": "3600"
                }
            )

    try:
        response = await call_next(request)
    except Exception as e:
        response = JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": f"Internal Server Error: {str(e)}"}
        )

    if origin:
        is_allowed = (
            origin in allowed_origins
            or origin.endswith(".vercel.app")
            or origin.startswith("http://localhost")
            or origin.startswith("http://127.0.0.1")
        )
        if is_allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# Register routers under /api
app.include_router(public_results.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(admin_results.router, prefix=settings.API_V1_STR)
app.include_router(admin_students.router, prefix=settings.API_V1_STR)
app.include_router(admin_grades.router, prefix=settings.API_V1_STR)
app.include_router(admin_audit.router, prefix=settings.API_V1_STR)
app.include_router(admin_meta.router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "portal": "Centurion University of Technology and Management Result Portal",
        "system": "CUTM Academic Examination Engine",
        "version": settings.VERSION,
        "status": "OPERATIONAL",
        "docs_url": "/docs"
    }
