import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import {
  FaArrowRight,
  FaClock,
  FaEye,
  FaFileAlt,
  FaPhoneAlt,
  FaSearch,
  FaTimesCircle,
  FaUserGraduate,
} from "react-icons/fa";

import { db } from "./firebase";
import "./App.css";

function StudentRecords() {
  const navigate = useNavigate();

  const [students, setStudents] =
    useState([]);

  const [searchText, setSearchText] =
    useState("");

  const [gradeFilter, setGradeFilter] =
    useState("all");

  const [typeFilter, setTypeFilter] =
    useState("all");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    const studentsReference =
      collection(db, "students");

    const unsubscribe = onSnapshot(
      studentsReference,

      (snapshot) => {
        const loadedStudents =
          snapshot.docs.map(
            (studentDocument) => ({
              id: studentDocument.id,
              ...studentDocument.data(),
            })
          );

        loadedStudents.sort(
          (
            firstStudent,
            secondStudent
          ) =>
            String(
              firstStudent.fullName ||
                ""
            ).localeCompare(
              String(
                secondStudent.fullName ||
                  ""
              ),
              "ar"
            )
        );

        setStudents(loadedStudents);
        setIsLoading(false);
        setErrorMessage("");
      },

      (error) => {
        console.error(
          "Error loading students:",
          error
        );

        setErrorMessage(
          "حدث خطأ أثناء تحميل ملفات الطلاب."
        );

        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredStudents =
    useMemo(() => {
      const cleanSearchText =
        searchText
          .trim()
          .toLowerCase();

      return students.filter(
        (student) => {
          const studentName =
            String(
              student.fullName || ""
            ).toLowerCase();

          const studentPhone =
            String(
              student.studentPhone ||
                ""
            );

          const parentPhone =
            String(
              student.parentPhone ||
                ""
            );

          const matchesSearch =
            !cleanSearchText ||
            studentName.includes(
              cleanSearchText
            ) ||
            studentPhone.includes(
              cleanSearchText
            ) ||
            parentPhone.includes(
              cleanSearchText
            );

          const matchesGrade =
            gradeFilter === "all" ||
            student.grade ===
              gradeFilter;

          const matchesType =
            typeFilter === "all" ||
            student.studentType ===
              typeFilter;

          const matchesStatus =
            statusFilter === "all" ||
            student.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesGrade &&
            matchesType &&
            matchesStatus
          );
        }
      );
    }, [
      students,
      searchText,
      gradeFilter,
      typeFilter,
      statusFilter,
    ]);

  function getStudentTypeText(
    studentType
  ) {
    return studentType === "center"
      ? "طالب سنتر"
      : "طالب أونلاين";
  }

  function getStatusText(status) {
    return status === "active"
      ? "الحساب مفعل"
      : "قيد المراجعة";
  }

  function openStudentProfile(
    studentId
  ) {
    navigate(
      `/student-records/${studentId}`
    );

    window.scrollTo(0, 0);
  }

  return (
    <main className="admin-section-page">
      <div className="admin-section-container">
        <header className="admin-section-header">
          <div className="admin-section-title">
            <div className="admin-section-title-icon">
              <FaFileAlt />
            </div>

            <div>
              <span>
                لوحة تحكم المدرس
              </span>

              <h1>
                ملفات الطلاب الشاملة
              </h1>

              <p>
                ابحث عن أي طالب وافتح
                صفحته لمتابعة بياناته
                ومشاهداته ودرجاته طوال
                السنة.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="admin-secondary-btn"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            <FaArrowRight />
            الرجوع
          </button>
        </header>

        <section
          style={{
            padding: "20px",
            marginBottom: "25px",
            border:
              "1px solid rgba(200, 157, 93, 0.4)",
            borderRadius: "18px",
            background:
              "rgba(255,255,255,0.04)",
          }}
        >
          <div
            style={{
              position: "relative",
              marginBottom: "15px",
            }}
          >
            <FaSearch
              style={{
                position: "absolute",
                right: "17px",
                top: "50%",
                transform:
                  "translateY(-50%)",
                color: "#c9a56f",
              }}
            />

            <input
              type="search"
              value={searchText}
              onChange={(event) =>
                setSearchText(
                  event.target.value
                )
              }
              placeholder="ابحث باسم الطالب أو رقم هاتف الطالب أو ولي الأمر..."
              style={{
                width: "100%",
                minHeight: "54px",
                padding:
                  "12px 50px 12px 16px",
                border:
                  "1px solid rgba(200, 157, 93, 0.45)",
                borderRadius: "13px",
                background: "#211a17",
                color: "#fff",
                fontSize: "16px",
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
            }}
          >
            <select
              value={gradeFilter}
              onChange={(event) =>
                setGradeFilter(
                  event.target.value
                )
              }
              style={{
                minHeight: "48px",
                padding: "10px",
                borderRadius: "12px",
              }}
            >
              <option value="all">
                كل الصفوف
              </option>

              <option value="الأول الثانوي">
                الأول الثانوي
              </option>

              <option value="الثاني الثانوي">
                الثاني الثانوي
              </option>

              <option value="الثالث الثانوي">
                الثالث الثانوي
              </option>
            </select>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value
                )
              }
              style={{
                minHeight: "48px",
                padding: "10px",
                borderRadius: "12px",
              }}
            >
              <option value="all">
                كل أنواع الطلاب
              </option>

              <option value="center">
                طالب سنتر
              </option>

              <option value="online">
                طالب أونلاين
              </option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              style={{
                minHeight: "48px",
                padding: "10px",
                borderRadius: "12px",
              }}
            >
              <option value="all">
                كل الحالات
              </option>

              <option value="active">
                الحسابات المفعلة
              </option>

              <option value="pending">
                قيد المراجعة
              </option>
            </select>
          </div>

          <div
            style={{
              marginTop: "16px",
              display: "flex",
              gap: "18px",
              flexWrap: "wrap",
            }}
          >
            <strong>
              إجمالي الطلاب:{" "}
              {students.length}
            </strong>

            <strong>
              النتائج الظاهرة:{" "}
              {filteredStudents.length}
            </strong>
          </div>
        </section>

        {isLoading ? (
          <section className="admin-data-empty">
            <div className="admin-data-empty-icon">
              <FaClock />
            </div>

            <h2>
              جاري تحميل ملفات الطلاب...
            </h2>
          </section>
        ) : errorMessage ? (
          <section className="admin-data-empty">
            <FaTimesCircle />

            <h2>حدث خطأ</h2>

            <p>{errorMessage}</p>
          </section>
        ) : filteredStudents.length ===
          0 ? (
          <section className="admin-data-empty">
            <FaSearch />

            <h2>
              لا توجد نتائج مطابقة
            </h2>

            <p>
              جرّبي البحث باسم مختلف أو
              غيّري الفلاتر.
            </p>
          </section>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(270px, 1fr))",
              gap: "17px",
            }}
          >
            {filteredStudents.map(
              (student) => (
                <article
                  key={student.id}
                  style={{
                    padding: "20px",
                    border:
                      "1px solid rgba(200, 157, 93, 0.38)",
                    borderRadius: "17px",
                    background:
                      "rgba(255,255,255,0.04)",
                    boxShadow:
                      "0 10px 25px rgba(0,0,0,0.12)",
                  }}
                >
                  <FaUserGraduate
                    style={{
                      fontSize: "38px",
                      color: "#d5a75f",
                    }}
                  />

                  <h2>
                    {student.fullName ||
                      "اسم غير مسجل"}
                  </h2>

                  <p>
                    {student.grade ||
                      "صف غير محدد"}
                  </p>

                  <p>
                    <FaPhoneAlt />{" "}
                    {student.studentPhone ||
                      "غير مسجل"}
                  </p>

                  <p>
                    {getStudentTypeText(
                      student.studentType
                    )}
                  </p>

                  <p>
                    {getStatusText(
                      student.status
                    )}
                  </p>

                  <p>
                    النقاط:{" "}
                    <strong>
                      {student.points || 0}
                    </strong>
                  </p>

                  <button
                    type="button"
                    className="admin-primary-btn"
                    onClick={() =>
                      openStudentProfile(
                        student.id
                      )
                    }
                  >
                    <FaEye />
                    فتح ملف الطالب
                  </button>
                </article>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default StudentRecords;