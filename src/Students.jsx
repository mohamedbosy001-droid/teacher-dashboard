import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  runTransaction,
  updateDoc,
} from "firebase/firestore";

import {
  FaUsers,
  FaArrowRight,
  FaUserGraduate,
  FaCheckCircle,
  FaClock,
  FaSearch,
  FaEye,
  FaTimes,
  FaVideo,
  FaClipboardCheck,
  FaLockOpen,
} from "react-icons/fa";

import { db } from "./firebase";
import "./App.css";

function Students() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchText, setSearchText] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [resettingExamId, setResettingExamId] = useState("");

  useEffect(() => {
    const studentsReference = collection(
      db,
      "students"
    );

    const unsubscribe = onSnapshot(
      studentsReference,
      (snapshot) => {
        const studentsData = snapshot.docs.map(
          (studentDocument) => ({
            id: studentDocument.id,
            ...studentDocument.data(),
          })
        );

        studentsData.sort(
          (firstStudent, secondStudent) =>
            String(
              firstStudent.fullName || ""
            ).localeCompare(
              String(secondStudent.fullName || ""),
              "ar"
            )
        );

        setStudents(studentsData);

        setSelectedStudent((previousStudent) => {
          if (!previousStudent) {
            return null;
          }

          return (
            studentsData.find(
              (student) =>
                student.id === previousStudent.id
            ) || null
          );
        });

        setIsLoading(false);
        setErrorMessage("");
      },
      (error) => {
        console.error(error);

        setErrorMessage(
          "حدث خطأ أثناء تحميل بيانات الطلاب."
        );

        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredStudents = useMemo(() => {
    const cleanSearchText =
      searchText.trim().toLowerCase();

    return students.filter((student) => {
      const studentName = String(
        student.fullName || ""
      ).toLowerCase();

      const studentPhone = String(
        student.studentPhone || ""
      );

      const parentPhone = String(
        student.parentPhone || ""
      );

      const matchesSearch =
        !cleanSearchText ||
        studentName.includes(cleanSearchText) ||
        studentPhone.includes(cleanSearchText) ||
        parentPhone.includes(cleanSearchText);

      const matchesGrade =
        gradeFilter === "all" ||
        student.grade === gradeFilter;

      const matchesType =
        typeFilter === "all" ||
        student.studentType === typeFilter;

      const matchesStatus =
        statusFilter === "all" ||
        student.status === statusFilter;

      return (
        matchesSearch &&
        matchesGrade &&
        matchesType &&
        matchesStatus
      );
    });
  }, [
    students,
    searchText,
    gradeFilter,
    typeFilter,
    statusFilter,
  ]);

  async function handleActivateStudent(studentId) {
    try {
      const studentReference = doc(
        db,
        "students",
        studentId
      );

      await updateDoc(studentReference, {
        status: "active",
      });
    } catch (error) {
      console.error(error);

      window.alert(
        "حدث خطأ أثناء تفعيل حساب الطالب."
      );
    }
  }

  function getExamResult(student, examId) {
    const examResults = Array.isArray(
      student?.examResults
    )
      ? student.examResults
      : [];

    return (
      examResults.find(
        (result) => result?.examId === examId
      ) || null
    );
  }

  function getExamAttempt(student, examId) {
    return student?.examAttempts?.[examId] || null;
  }

  function getExamStatus(student, examId) {
    const result = getExamResult(
      student,
      examId
    );

    const attempt = getExamAttempt(
      student,
      examId
    );

    if (
      result?.completed === true ||
      attempt?.completed === true
    ) {
      return "completed";
    }

    if (attempt?.started === true) {
      return "started";
    }

    return "not-started";
  }

  function getFirstLessonProgress(student) {
    const coursesProgress =
      student?.courseProgress;

    if (
      !coursesProgress ||
      typeof coursesProgress !== "object"
    ) {
      return null;
    }

    const courseProgress =
      coursesProgress["free-second-course"];

    if (
      !courseProgress ||
      typeof courseProgress !== "object"
    ) {
      return null;
    }

    const lessons = courseProgress.lessons;

    if (
      !lessons ||
      typeof lessons !== "object"
    ) {
      return null;
    }

    return (
      lessons["lesson-1"] ||
      Object.values(lessons)[0] ||
      null
    );
  }

  function formatTimestamp(timestamp) {
    if (!timestamp) {
      return "غير مسجل";
    }

    try {
      const date =
        typeof timestamp.toDate === "function"
          ? timestamp.toDate()
          : new Date(timestamp);

      return date.toLocaleString("ar-EG", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return "غير مسجل";
    }
  }

  async function reopenExam(
    student,
    examId,
    examTitle
  ) {
    const shouldReopen = window.confirm(
      `هل تريد إعادة فتح ${examTitle} للطالب ${student.fullName}؟`
    );

    if (!shouldReopen) {
      return;
    }

    setResettingExamId(examId);

    try {
      const studentReference = doc(
        db,
        "students",
        student.id
      );

      await runTransaction(
        db,
        async (transaction) => {
          const studentSnapshot =
            await transaction.get(
              studentReference
            );

          if (!studentSnapshot.exists()) {
            throw new Error(
              "Student not found."
            );
          }

          const savedStudent =
            studentSnapshot.data();

          const examResults = Array.isArray(
            savedStudent.examResults
          )
            ? savedStudent.examResults
            : [];

          const hadCompletedResult =
            examResults.some(
              (result) =>
                result?.examId === examId
            );

          const filteredResults =
            examResults.filter(
              (result) =>
                result?.examId !== examId
            );

          const currentCompletedExams =
            Number(
              savedStudent.completedExams || 0
            );

          transaction.update(
            studentReference,
            {
              examResults: filteredResults,

              [`examAttempts.${examId}`]:
                deleteField(),

              completedExams:
                hadCompletedResult
                  ? Math.max(
                      currentCompletedExams - 1,
                      0
                    )
                  : currentCompletedExams,
            }
          );
        }
      );

      window.alert(
        `✅ تم إعادة فتح ${examTitle} للطالب.`
      );
    } catch (error) {
      console.error(
        "Error reopening exam:",
        error
      );

      window.alert(
        "حدث خطأ أثناء إعادة فتح الامتحان."
      );
    } finally {
      setResettingExamId("");
    }
  }

  function renderExamDetails(
    student,
    examId,
    examTitle
  ) {
    const result = getExamResult(
      student,
      examId
    );

    const attempt = getExamAttempt(
      student,
      examId
    );

    const status = getExamStatus(
      student,
      examId
    );

    return (
      <article
        style={{
          padding: "20px",
          border:
            "1px solid rgba(190, 148, 91, 0.45)",
          borderRadius: "16px",
          background:
            "rgba(255, 255, 255, 0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "15px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3
              style={{
                margin: "0 0 8px",
              }}
            >
              {examTitle}
            </h3>

            {status === "completed" ? (
              <p
                style={{
                  margin: 0,
                  color: "#51d58c",
                  fontWeight: "800",
                }}
              >
                تم تسليم الامتحان
              </p>
            ) : status === "started" ? (
              <p
                style={{
                  margin: 0,
                  color: "#f1c66e",
                  fontWeight: "800",
                }}
              >
                بدأ الامتحان ولم يسلمه
              </p>
            ) : (
              <p
                style={{
                  margin: 0,
                  color: "#aaa",
                  fontWeight: "800",
                }}
              >
                لم يبدأ الامتحان
              </p>
            )}
          </div>

          {(status === "completed" ||
            status === "started") && (
            <button
              type="button"
              className="admin-secondary-btn"
              disabled={
                resettingExamId === examId
              }
              onClick={() =>
                reopenExam(
                  student,
                  examId,
                  examTitle
                )
              }
            >
              <FaLockOpen />

              {resettingExamId === examId
                ? "جارٍ الفتح..."
                : "إعادة فتح الامتحان"}
            </button>
          )}
        </div>

        {result && (
          <div
            style={{
              marginTop: "15px",
              display: "grid",
              gap: "8px",
            }}
          >
            <p>
              الدرجة:{" "}
              <strong>
                {result.score ?? 0}
              </strong>
              {" / "}
              <strong>
                {result.totalQuestions ??
                  result.total ??
                  "-"}
              </strong>
            </p>

            <p>
              عدد الإجابات الصحيحة:{" "}
              {result.correctAnswers ??
                result.score ??
                0}
            </p>

            <p>
              تاريخ التسليم:{" "}
              {formatTimestamp(
                result.completedAt ||
                  result.submittedAt
              )}
            </p>
          </div>
        )}

        {!result && attempt && (
          <div
            style={{
              marginTop: "15px",
            }}
          >
            <p>
              بدأ الطالب الامتحان ولكن لا
              توجد نتيجة نهائية مسجلة حتى
              الآن.
            </p>
          </div>
        )}
      </article>
    );
  }

  const totalStudents = students.length;

  const activeStudents = students.filter(
    (student) =>
      student.status === "active"
  ).length;

  const pendingStudents = students.filter(
    (student) =>
      student.status !== "active"
  ).length;

  return (
    <main className="admin-page">
      <div className="admin-page-container">
        <div className="admin-page-header">
          <div>
            <h1>
              <FaUsers />
              الطلاب
            </h1>

            <p>
              إدارة حسابات الطلاب ومتابعة
              بياناتهم.
            </p>
          </div>

          <button
            type="button"
            className="admin-secondary-btn"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            <FaArrowRight />
            العودة للوحة التحكم
          </button>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "15px",
            marginBottom: "25px",
          }}
        >
          <div className="admin-stat-card">
            <FaUsers />

            <div>
              <span>كل الطلاب</span>
              <strong>
                {totalStudents}
              </strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <FaCheckCircle />

            <div>
              <span>الحسابات المفعلة</span>
              <strong>
                {activeStudents}
              </strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <FaClock />

            <div>
              <span>قيد المراجعة</span>
              <strong>
                {pendingStudents}
              </strong>
            </div>
          </div>
        </section>

        <section
          className="admin-filters"
          style={{
            display: "grid",
            gridTemplateColumns:
              "2fr repeat(3, 1fr)",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              position: "relative",
            }}
          >
            <FaSearch
              style={{
                position: "absolute",
                right: "14px",
                top: "50%",
                transform:
                  "translateY(-50%)",
              }}
            />

            <input
              type="text"
              value={searchText}
              onChange={(event) =>
                setSearchText(
                  event.target.value
                )
              }
              placeholder="ابحث باسم الطالب أو رقم الهاتف..."
              style={{
                width: "100%",
                padding:
                  "12px 42px 12px 12px",
              }}
            />
          </div>

          <select
            value={gradeFilter}
            onChange={(event) =>
              setGradeFilter(
                event.target.value
              )
            }
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
          >
            <option value="all">
              كل الأنواع
            </option>

            <option value="center">
              طلاب السنتر
            </option>

            <option value="online">
              طلاب الأونلاين
            </option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              كل الحالات
            </option>

            <option value="active">
              مفعل
            </option>

            <option value="pending">
              قيد المراجعة
            </option>
          </select>
        </section>

        {isLoading && (
          <section className="admin-data-empty">
            <FaClock />

            <h2>
              جاري تحميل الطلاب...
            </h2>
          </section>
        )}

        {!isLoading && errorMessage && (
          <section className="admin-data-empty">
            <h2>حدث خطأ</h2>

            <p>{errorMessage}</p>
          </section>
        )}

        {!isLoading &&
          !errorMessage &&
          students.length === 0 && (
            <section className="admin-data-empty">
              <div className="admin-data-empty-icon">
                <FaUserGraduate />
              </div>

              <h2>
                لا يوجد طلاب حاليًا
              </h2>

              <p>
                عند إنشاء الطلاب لحساباتهم
                سيظهرون هنا تلقائيًا.
              </p>
            </section>
          )}

        {!isLoading &&
          !errorMessage &&
          students.length > 0 &&
          filteredStudents.length === 0 && (
            <section className="admin-data-empty">
              <FaSearch />

              <h2>
                لا توجد نتائج مطابقة
              </h2>

              <p>
                جرّبي البحث بكلمة مختلفة أو
                أزيلي بعض الفلاتر.
              </p>
            </section>
          )}

        {!isLoading &&
          !errorMessage &&
          filteredStudents.length > 0 && (
            <section className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>اسم الطالب</th>
                    <th>رقم الطالب</th>
                    <th>رقم ولي الأمر</th>
                    <th>الصف</th>
                    <th>نوع الطالب</th>
                    <th>الحالة</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.map(
                    (student) => (
                      <tr key={student.id}>
                        <td>
                          {student.fullName ||
                            "غير مسجل"}
                        </td>

                        <td>
                          {student.studentPhone ||
                            "غير مسجل"}
                        </td>

                        <td>
                          {student.parentPhone ||
                            "غير مسجل"}
                        </td>

                        <td>
                          {student.grade ||
                            "غير محدد"}
                        </td>

                        <td>
                          {student.studentType ===
                          "center"
                            ? "طالب سنتر"
                            : "طالب أونلاين"}
                        </td>

                        <td>
                          <span
                            className={`admin-status ${
                              student.status ===
                              "active"
                                ? "published"
                                : "hidden"
                            }`}
                          >
                            {student.status ===
                            "active"
                              ? "مفعل"
                              : "قيد المراجعة"}
                          </span>
                        </td>

                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              flexWrap:
                                "wrap",
                            }}
                          >
                            <button
                              type="button"
                              className="admin-secondary-btn"
                              onClick={() =>
                                setSelectedStudent(
                                  student
                                )
                              }
                            >
                              <FaEye />
                              التفاصيل
                            </button>

                            {student.status !==
                              "active" && (
                              <button
                                type="button"
                                className="admin-primary-btn"
                                onClick={() =>
                                  handleActivateStudent(
                                    student.id
                                  )
                                }
                              >
                                تفعيل الحساب
                              </button>
                            )}

                            {student.status ===
                              "active" && (
                              <span>
                                <FaCheckCircle />
                                مفعل
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </section>
          )}
      </div>

      {selectedStudent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            padding: "20px",
            overflowY: "auto",
            background:
              "rgba(0, 0, 0, 0.82)",
          }}
        >
          <div
            style={{
              width: "min(900px, 100%)",
              margin: "30px auto",
              padding: "25px",
              border:
                "1px solid rgba(190, 148, 91, 0.55)",
              borderRadius: "20px",
              background: "#211a17",
              color: "#fff",
              direction: "rtl",
            }}
          >
            <button
              type="button"
              onClick={() =>
                setSelectedStudent(null)
              }
              aria-label="إغلاق التفاصيل"
              style={{
                width: "44px",
                height: "44px",
                border: "none",
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: "#fff",
                color: "#211a17",
                cursor: "pointer",
                fontSize: "19px",
              }}
            >
              <FaTimes />
            </button>

            <div
              style={{
                margin: "20px 0",
              }}
            >
              <h1>
                {selectedStudent.fullName}
              </h1>

              <p>
                رقم الطالب:{" "}
                {selectedStudent.studentPhone ||
                  "غير مسجل"}
              </p>

              <p>
                رقم ولي الأمر:{" "}
                {selectedStudent.parentPhone ||
                  "غير مسجل"}
              </p>

              <p>
                الصف:{" "}
                {selectedStudent.grade ||
                  "غير محدد"}
              </p>
            </div>

            <section
              style={{
                marginBottom: "20px",
                padding: "20px",
                border:
                  "1px solid rgba(190, 148, 91, 0.4)",
                borderRadius: "16px",
              }}
            >
              <h2>
                <FaVideo /> مشاهدة المحاضرة
              </h2>

              {(() => {
                const lessonProgress =
                  getFirstLessonProgress(
                    selectedStudent
                  );

                if (!lessonProgress) {
                  return (
                    <p>
                      لم يشاهد الطالب الفيديو
                      حتى الآن.
                    </p>
                  );
                }

                return (
                  <>
                    <p>
                      الحالة:{" "}
                      {lessonProgress.videoWatched
                        ? "تم تسجيل مشاهدة الفيديو"
                        : "لم يصل إلى النسبة المطلوبة"}
                    </p>

                    <p>
                      نسبة المشاهدة المسجلة:{" "}
                      {lessonProgress.watchedPercent ||
                        0}
                      %
                    </p>

                    <p>
                      الثواني المشاهدة:{" "}
                      {lessonProgress.watchedSeconds ||
                        0}
                    </p>

                    <p>
                      آخر مشاهدة:{" "}
                      {formatTimestamp(
                        lessonProgress.lastWatchedAt
                      )}
                    </p>
                  </>
                );
              })()}
            </section>

            <section>
              <h2
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <FaClipboardCheck />
                الامتحانات
              </h2>

              <div
                style={{
                  display: "grid",
                  gap: "15px",
                }}
              >
                {renderExamDetails(
                  selectedStudent,
                  "exam-1",
                  "الامتحان الأول"
                )}

                {renderExamDetails(
                  selectedStudent,
                  "exam-2",
                  "الامتحان الثاني"
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </main>
  );
}

export default Students;