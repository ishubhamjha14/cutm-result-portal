"""
CUTM Result Portal - Demo Seed Data Generator
Populates realistic demo student examination records across multiple departments and semesters.
Clearly marked as DEMO DATA.
"""
from .database import SessionLocal, Base, engine
from .models import Admin, Branch, Program, Semester, Student, Subject, Result, GradeConfiguration, AuditLog
from .auth import get_password_hash
from .services.calculations import calculate_sgpa

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    print("[INIT] Initializing CUTM Result Portal Seed Data...")
    
    try:
        # 1. Ensure Admin exists
        admin = db.query(Admin).filter(Admin.username == "admin").first()
        if not admin:
            admin = Admin(
                username="admin",
                email="admin@cutm.ac.in",
                hashed_password=get_password_hash("Admin@CUTM2026"),
                full_name="Prof. Controller of Examinations (CUTM)",
                role="SUPER_ADMIN",
                is_active=True
            )
            db.add(admin)
            db.flush()
            print("  [OK] Created Super Admin (admin@cutm.ac.in / Admin@CUTM2026)")

        # 2. Grade scale (Official CUTM CBCS)
        grades_data = [
            ("O", 10.0, "Outstanding", 90.0, 100.0),
            ("E", 9.0, "Excellent", 80.0, 89.9),
            ("A", 8.0, "Very Good", 70.0, 79.9),
            ("B", 7.0, "Good", 60.0, 69.9),
            ("C", 6.0, "Above Average", 50.0, 59.9),
            ("D", 5.0, "Pass", 40.0, 49.9),
            ("F", 0.0, "Fail", 0.0, 39.9),
            ("M", 0.0, "Mal Practice", 0.0, 0.0),
            ("S", 0.0, "Absent", 0.0, 0.0),
            ("R", 0.0, "Repeat/Reappear", 0.0, 0.0),
        ]
        valid_letters = {g[0] for g in grades_data}
        db.query(GradeConfiguration).filter(~GradeConfiguration.grade_letter.in_(valid_letters)).delete(synchronize_session=False)

        for letter, gp, desc, mn, mx in grades_data:
            g_obj = db.query(GradeConfiguration).filter(GradeConfiguration.grade_letter == letter).first()
            if not g_obj:
                db.add(GradeConfiguration(grade_letter=letter, grade_point=gp, description=desc, min_marks=mn, max_marks=mx))
            else:
                g_obj.grade_point = gp
                g_obj.description = desc
                g_obj.min_marks = mn
                g_obj.max_marks = mx
        db.flush()

        # 3. Semesters (1 through 8)
        sem_map = {}
        for s in range(1, 9):
            sem = db.query(Semester).filter(Semester.semester_number == s).first()
            if not sem:
                sem = Semester(semester_number=s, name=f"Semester {s}", is_active=True)
                db.add(sem)
                db.flush()
            sem_map[s] = sem

        # 4. Programs
        programs_data = [
            ("BTECH", "Bachelor of Technology", 4),
            ("MTECH", "Master of Technology", 2),
            ("BCA", "Bachelor of Computer Applications", 3),
            ("MCA", "Master of Computer Applications", 2),
        ]
        prog_map = {}
        for code, name, dur in programs_data:
            p = db.query(Program).filter(Program.code == code).first()
            if not p:
                p = Program(code=code, name=name, duration_years=dur)
                db.add(p)
                db.flush()
            prog_map[code] = p

        # 5. Branches
        branches_data = [
            ("CSE", "Computer Science & Engineering"),
            ("CSE-AIML", "CSE (Artificial Intelligence & Machine Learning)"),
            ("ECE", "Electronics & Communication Engineering"),
            ("EEE", "Electrical & Electronics Engineering"),
            ("ME", "Mechanical Engineering"),
            ("CE", "Civil Engineering"),
        ]
        branch_map = {}
        for code, name in branches_data:
            b = db.query(Branch).filter(Branch.code == code).first()
            if not b:
                b = Branch(code=code, name=name, department="School of Engineering and Technology")
                db.add(b)
                db.flush()
            branch_map[code] = b

        # 6. Sample Students
        demo_students = [
            {
                "reg_no": "24CSE12345",
                "name": "Shubham Kumar Jha",
                "branch": "CSE-AIML",
                "program": "BTECH",
                "session": "2024-2028",
                "campus": "Bhubaneswar Campus",
                "email": "240101120045@cutm.ac.in",
                "semesters": {
                    1: [
                        ("CUTM1001", "Engineering Mathematics - I", 4.0, "O", 10.0),
                        ("CUTM1002", "Applied Physics & Quantum Mechanics", 4.0, "E", 9.0),
                        ("CUTM1003", "Programming in C and Problem Solving", 4.0, "O", 10.0),
                        ("CUTM1004", "Engineering Graphics & Design", 3.0, "A", 8.0),
                        ("CUTM1005", "Environmental Studies & Ecology", 2.0, "E", 9.0),
                        ("CUTM1006", "Programming Laboratory", 2.0, "O", 10.0),
                    ],
                    2: [
                        ("CUTM2001", "Engineering Mathematics - II", 4.0, "E", 9.0),
                        ("CUTM2002", "Data Structures and Algorithms", 4.0, "O", 10.0),
                        ("CUTM2003", "Digital Electronics & Logic Design", 4.0, "A", 8.0),
                        ("CUTM2004", "Object Oriented Programming in Java", 4.0, "O", 10.0),
                        ("CUTM2005", "Professional Communication Skills", 2.0, "E", 9.0),
                        ("CUTM2006", "Data Structures Lab", 2.0, "O", 10.0),
                    ],
                    3: [
                        ("CSE3001", "Python Programming for AI/ML", 4.0, "O", 10.0),
                        ("CSE3002", "Software Engineering and Agile Testing", 3.0, "E", 9.0),
                        ("CSE3003", "Database Management Systems", 4.0, "E", 9.0),
                        ("CSE3004", "Discrete Mathematical Structures", 3.0, "A", 8.0),
                        ("CSE3005", "Machine Learning Foundations", 4.0, "O", 10.0),
                        ("CSE3006", "DBMS & SQL Laboratory", 2.0, "O", 10.0),
                    ]
                }
            },
            {
                "reg_no": "24CSE10001",
                "name": "Ananya Patnaik",
                "branch": "CSE",
                "program": "BTECH",
                "session": "2024-2028",
                "campus": "Bhubaneswar Campus",
                "email": "24cse10001@cutm.ac.in",
                "semesters": {
                    1: [
                        ("CUTM1001", "Engineering Mathematics - I", 4.0, "E", 9.0),
                        ("CUTM1002", "Applied Physics & Quantum Mechanics", 4.0, "A", 8.0),
                        ("CUTM1003", "Programming in C and Problem Solving", 4.0, "O", 10.0),
                        ("CUTM1004", "Engineering Graphics & Design", 3.0, "E", 9.0),
                        ("CUTM1005", "Environmental Studies & Ecology", 2.0, "A", 8.0),
                        ("CUTM1006", "Programming Laboratory", 2.0, "O", 10.0),
                    ],
                    2: [
                        ("CUTM2001", "Engineering Mathematics - II", 4.0, "A", 8.0),
                        ("CUTM2002", "Data Structures and Algorithms", 4.0, "E", 9.0),
                        ("CUTM2003", "Digital Electronics & Logic Design", 4.0, "B", 7.0),
                        ("CUTM2004", "Object Oriented Programming in Java", 4.0, "O", 10.0),
                        ("CUTM2005", "Professional Communication Skills", 2.0, "E", 9.0),
                        ("CUTM2006", "Data Structures Lab", 2.0, "O", 10.0),
                    ],
                    3: [
                        ("CSE3001", "Design & Analysis of Algorithms", 4.0, "O", 10.0),
                        ("CSE3002", "Operating Systems Architecture", 4.0, "E", 9.0),
                        ("CSE3003", "Database Management Systems", 4.0, "O", 10.0),
                        ("CSE3004", "Computer Organization & Architecture", 3.0, "A", 8.0),
                        ("CSE3005", "Web Technologies & React", 3.0, "O", 10.0),
                        ("CSE3006", "OS & Linux Shell Lab", 2.0, "O", 10.0),
                    ]
                }
            },
            {
                "reg_no": "24ECE10022",
                "name": "Rohan Mohanty",
                "branch": "ECE",
                "program": "BTECH",
                "session": "2024-2028",
                "campus": "Paralakhemundi Campus",
                "email": "24ece10022@cutm.ac.in",
                "semesters": {
                    1: [
                        ("CUTM1001", "Engineering Mathematics - I", 4.0, "A", 8.0),
                        ("CUTM1002", "Applied Physics & Quantum Mechanics", 4.0, "A", 8.0),
                        ("CUTM1003", "Basic Electrical Engineering", 4.0, "E", 9.0),
                        ("CUTM1004", "Engineering Graphics & Design", 3.0, "B", 7.0),
                        ("CUTM1005", "Environmental Studies & Ecology", 2.0, "A", 8.0),
                        ("CUTM1006", "Basic Electrical Lab", 2.0, "E", 9.0),
                    ],
                    2: [
                        ("CUTM2001", "Engineering Mathematics - II", 4.0, "B", 7.0),
                        ("ECE2001", "Analog Electronics Circuits", 4.0, "E", 9.0),
                        ("ECE2002", "Signals and Systems", 4.0, "A", 8.0),
                        ("ECE2003", "Network Theory & Analysis", 4.0, "A", 8.0),
                        ("CUTM2005", "Professional Communication Skills", 2.0, "A", 8.0),
                        ("ECE2004", "Analog Electronics Lab", 2.0, "E", 9.0),
                    ]
                }
            },
            {
                "reg_no": "24MECH1005",
                "name": "Priya Ranjan Das",
                "branch": "ME",
                "program": "BTECH",
                "session": "2024-2028",
                "campus": "Bhubaneswar Campus",
                "email": "24mech1005@cutm.ac.in",
                "semesters": {
                    1: [
                        ("CUTM1001", "Engineering Mathematics - I", 4.0, "B", 7.0),
                        ("CUTM1002", "Applied Physics & Quantum Mechanics", 4.0, "C", 6.0),
                        ("ME1001", "Engineering Mechanics & Statics", 4.0, "A", 8.0),
                        ("ME1002", "Workshop Manufacturing Practices", 3.0, "O", 10.0),
                        ("CUTM1005", "Environmental Studies & Ecology", 2.0, "A", 8.0),
                        ("ME1003", "Workshop Lab", 2.0, "O", 10.0),
                    ],
                    2: [
                        ("CUTM2001", "Engineering Mathematics - II", 4.0, "A", 8.0),
                        ("ME2001", "Thermodynamics & Heat Transfer", 4.0, "E", 9.0),
                        ("ME2002", "Fluid Mechanics & Hydraulic Machines", 4.0, "A", 8.0),
                        ("ME2003", "Strength of Materials", 4.0, "B", 7.0),
                        ("CUTM2005", "Professional Communication Skills", 2.0, "A", 8.0),
                        ("ME2004", "Strength of Materials Lab", 2.0, "E", 9.0),
                    ]
                }
            }
        ]

        for s_data in demo_students:
            student = db.query(Student).filter(Student.registration_number == s_data["reg_no"]).first()
            branch = branch_map[s_data["branch"]]
            prog = prog_map[s_data["program"]]
            
            if not student:
                student = Student(
                    registration_number=s_data["reg_no"],
                    name=s_data["name"],
                    branch_id=branch.id,
                    program_id=prog.id,
                    academic_session=s_data["session"],
                    campus=s_data["campus"],
                    email=s_data["email"]
                )
                db.add(student)
                db.flush()
            else:
                student.name = s_data["name"]
                student.branch_id = branch.id
                student.program_id = prog.id

            # Add results for each semester
            for sem_num, subjects_list in s_data["semesters"].items():
                semester = sem_map[sem_num]
                for code, name, cred, grade, gp in subjects_list:
                    sub = db.query(Subject).filter(Subject.code == code).first()
                    if not sub:
                        sub = Subject(
                            code=code,
                            name=name,
                            default_credits=cred,
                            branch_id=branch.id,
                            semester_id=semester.id
                        )
                        db.add(sub)
                        db.flush()

                    existing_res = db.query(Result).filter(
                        Result.student_id == student.id,
                        Result.subject_id == sub.id,
                        Result.semester_id == semester.id
                    ).first()

                    cp = round(cred * gp, 2)
                    status_str = "FAIL" if grade in ["F", "M", "FAIL", "AB"] else "PASS"

                    if not existing_res:
                        res = Result(
                            student_id=student.id,
                            subject_id=sub.id,
                            semester_id=semester.id,
                            academic_session=s_data["session"],
                            credits=cred,
                            grade=grade,
                            grade_point=gp,
                            credit_points=cp,
                            examination_month_year="DECEMBER-2025",
                            published_date="20-Jan-2026",
                            status=status_str
                        )
                        db.add(res)
                    else:
                        existing_res.credits = cred
                        existing_res.grade = grade
                        existing_res.grade_point = gp
                        existing_res.credit_points = cp
                        existing_res.status = status_str

        # Add initial audit log
        log = AuditLog(
            admin_id=admin.id,
            admin_email=admin.email,
            action="SYSTEM_INIT_SEED",
            entity_type="System",
            details="Seeded initial baseline CUTM demo database with student records and grade tables.",
            ip_address="127.0.0.1"
        )
        db.add(log)

        db.commit()
        print("  [OK] Successfully populated CUTM demo dataset!")
    except Exception as e:
        db.rollback()
        print(f"  [ERROR] Error during seed generation: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
