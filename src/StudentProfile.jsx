import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  deleteField,
  doc,
  onSnapshot,
  runTransaction,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import {
  FaArrowRight,
  FaAward,
  FaBookOpen,
  FaCheckCircle,
  FaClipboardCheck,
  FaClock,
  FaFileAlt,
  FaGraduationCap,
  FaKey,
  FaLockOpen,
  FaMapMarkerAlt,
  FaMinus,
  FaPhoneAlt,
  FaPlus,
  FaTimesCircle,
  FaTrophy,
  FaUserGraduate,
  FaUsers,
  FaVideo,
} from "react-icons/fa";

import { db } from "./firebase";
import "./App.css";

function StudentProfile() {
  const navigate = useNavigate();

  const { studentId } = useParams();

  const [student, setStudent] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [isUpdatingStatus, setIsUpdatingStatus] =
    useState(false);

  const [isUpdatingPoints, setIsUpdatingPoints] =
    useState(false);

  const [resettingExamId, setResettingExamId] =
    useState("");

  /*
    متابعة بيانات الطالب مباشرة من Firebase
  */
  useEffect(() => {
    if (!studentId) {
      setErrorMessage(
        "رقم الطالب غير موجود في الرابط."
      );

      setIsLoading(false);
      return undefined;
    }

    const studentReference = doc(
      db,
      "students",
      studentId
    );

    const unsubscribe = onSnapshot(
      studentReference,
      (studentSnapshot) => {
        if (!studentSnapshot.exists()) {
          setStudent(null);

          setErrorMessage(
            "لم يتم العثور على بيانات الطالب."
          );

          setIsLoading(false);
          return;
        }

        setStudent({
          id: studentSnapshot.id,
          ...studentSnapshot.data(),
        });

        setErrorMessage("");
        setIsLoading(false);
      },
      (error) => {
        console.error(
          "Error loading student profile:",
          error
        );

        setErrorMessage(
          "حدث خطأ أثناء تحميل ملف الطالب."
        );

        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [studentId]);

  function formatTimestamp(timestamp) {
    if (!timestamp) {
      return "غير مسجل";
    }

    try {
      const date =
        typeof timestamp.toDate ===
        "function"
          ? timestamp.toDate()
          : new Date(timestamp);

      return date.toLocaleString(
        "ar-EG",
        {
          dateStyle: "medium",
          timeStyle: "short",
        }
      );
    } catch {
      return "غير مسجل";
    }
  }

  function formatSeconds(seconds) {
    const totalSeconds =
      Number(seconds) || 0;

    const hours = Math.floor(
      totalSeconds / 3600
    );

    const minutes = Math.floor(
      (totalSeconds % 3600) / 60
    );

    const remainingSeconds =
      Math.floor(totalSeconds % 60);

    if (hours > 0) {
      return `${hours} ساعة و${minutes} دقيقة و${remainingSeconds} ثانية`;
    }

    if (minutes > 0) {
      return `${minutes} دقيقة و${remainingSeconds} ثانية`;
    }

    return `${remainingSeconds} ثانية`;
  }

  const watchHistory = useMemo(() => {
    return Array.isArray(
      student?.watchHistory
    )
      ? student.watchHistory
      : [];
  }, [student]);

  const examResults = useMemo(() => {
    return Array.isArray(
      student?.examResults
    )
      ? student.examResults
      : [];
  }, [student]);

  const examAttempts = useMemo(() => {
    return (
      student?.examAttempts &&
      typeof student.examAttempts ===
        "object"
        ? student.examAttempts
        : {}
    );
  }, [student]);

  const subscribedCourses = useMemo(() => {
    return Array.isArray(
      student?.subscribedCourses
    )
      ? student.subscribedCourses
      : [];
  }, [student]);

  const homeworkResults = useMemo(() => {
    return Array.isArray(
      student?.homeworkResults
    )
      ? student.homeworkResults
      : [];
  }, [student]);

  const allExamIds = useMemo(() => {
    const resultIds =
      examResults
        .map(
          (examResult) =>
            examResult?.examId
        )
        .filter(Boolean);

    const attemptIds =
      Object.keys(examAttempts);

    return Array.from(
      new Set([
        ...resultIds,
        ...attemptIds,
      ])
    );
  }, [
    examResults,
    examAttempts,
  ]);

  const totalExamScore = useMemo(() => {
    return examResults.reduce(
      (total, examResult) =>
        total +
        Number(
          examResult?.score || 0
        ),
      0
    );
  }, [examResults]);

  const totalExamQuestions = useMemo(() => {
    return examResults.reduce(
      (total, examResult) =>
        total +
        Number(
          examResult?.totalQuestions ||
            0
        ),
      0
    );
  }, [examResults]);

  const examsAverage = useMemo(() => {
    if (totalExamQuestions === 0) {
      return 0;
    }

    return Math.round(
      (totalExamScore /
        totalExamQuestions) *
        100
    );
  }, [
    totalExamScore,
    totalExamQuestions,
  ]);

  function getExamResult(examId) {
    return (
      examResults.find(
        (examResult) =>
          examResult?.examId === examId
      ) || null
    );
  }

  function getExamAttempt(examId) {
    return examAttempts[examId] || null;
  }

  function getExamTitle(examId) {
    const result =
      getExamResult(examId);

    const attempt =
      getExamAttempt(examId);

    return (
      result?.examTitle ||
      attempt?.examTitle ||
      examId
    );
  }

  function getExamStatus(examId) {
    const result =
      getExamResult(examId);

    const attempt =
      getExamAttempt(examId);

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

  /*
    تفعيل أو إيقاف حساب الطالب
  */
  async function toggleStudentStatus() {
    if (!student) {
      return;
    }

    const nextStatus =
      student.status === "active"
        ? "pending"
        : "active";

    const actionText =
      nextStatus === "active"
        ? "تفعيل"
        : "إيقاف";

    const shouldUpdate =
      window.confirm(
        `هل تريد ${actionText} حساب الطالب ${student.fullName}؟`
      );

    if (!shouldUpdate) {
      return;
    }

    setIsUpdatingStatus(true);

    try {
      const studentReference = doc(
        db,
        "students",
        student.id
      );

      await updateDoc(
        studentReference,
        {
          status: nextStatus,
          updatedAt: Timestamp.now(),
        }
      );

      window.alert(
        `✅ تم ${actionText} حساب الطالب.`
      );
    } catch (error) {
      console.error(
        "Error updating student status:",
        error
      );

      window.alert(
        "حدث خطأ أثناء تعديل حالة الحساب."
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  /*
    إضافة أو خصم نقاط
  */
  async function changeStudentPoints(
    operation
  ) {
    if (!student) {
      return;
    }

    const enteredValue =
      window.prompt(
        operation === "add"
          ? "اكتبي عدد النقاط التي تريدين إضافتها:"
          : "اكتبي عدد النقاط التي تريدين خصمها:"
      );

    if (enteredValue === null) {
      return;
    }

    const pointsValue =
      Number(enteredValue);

    if (
      !Number.isFinite(pointsValue) ||
      pointsValue <= 0
    ) {
      window.alert(
        "من فضلك اكتبي عدد نقاط صحيح أكبر من صفر."
      );

      return;
    }

    setIsUpdatingPoints(true);

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

          if (
            !studentSnapshot.exists()
          ) {
            throw new Error(
              "Student not found."
            );
          }

          const savedStudent =
            studentSnapshot.data();

          const currentPoints =
            Number(
              savedStudent.points || 0
            );

          const nextPoints =
            operation === "add"
              ? currentPoints +
                pointsValue
              : Math.max(
                  currentPoints -
                    pointsValue,
                  0
                );

          const pointsHistory =
            Array.isArray(
              savedStudent.pointsHistory
            )
              ? [
                  ...savedStudent
                    .pointsHistory,
                ]
              : [];

          pointsHistory.push({
            id: `${Date.now()}`,

            operation,

            amount: pointsValue,

            previousPoints:
              currentPoints,

            newPoints: nextPoints,

            createdAt:
              Timestamp.now(),

            reason:
              operation === "add"
                ? "إضافة يدوية من المدرس"
                : "خصم يدوي من المدرس",
          });

          transaction.update(
            studentReference,
            {
              points: nextPoints,
              pointsHistory,
              updatedAt:
                Timestamp.now(),
            }
          );
        }
      );

      window.alert(
        operation === "add"
          ? "✅ تم إضافة النقاط بنجاح."
          : "✅ تم خصم النقاط بنجاح."
      );
    } catch (error) {
      console.error(
        "Error changing student points:",
        error
      );

      window.alert(
        "حدث خطأ أثناء تعديل النقاط."
      );
    } finally {
      setIsUpdatingPoints(false);
    }
  }

  /*
    إعادة فتح امتحان لطالب واحد
  */
  async function reopenExam(examId) {
    if (!student) {
      return;
    }

    const examTitle =
      getExamTitle(examId);

    const shouldReopen =
      window.confirm(
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

          if (
            !studentSnapshot.exists()
          ) {
            throw new Error(
              "Student not found."
            );
          }

          const savedStudent =
            studentSnapshot.data();

          const savedExamResults =
            Array.isArray(
              savedStudent.examResults
            )
              ? savedStudent.examResults
              : [];

          const completedResultExists =
            savedExamResults.some(
              (examResult) =>
                examResult?.examId ===
                examId
            );

          const filteredExamResults =
            savedExamResults.filter(
              (examResult) =>
                examResult?.examId !==
                examId
            );

          const completedExams =
            Number(
              savedStudent.completedExams ||
                0
            );

          transaction.update(
            studentReference,
            {
              examResults:
                filteredExamResults,

              [`examAttempts.${examId}`]:
                deleteField(),

              completedExams:
                completedResultExists
                  ? Math.max(
                      completedExams -
                        1,
                      0
                    )
                  : completedExams,

              updatedAt:
                Timestamp.now(),
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

  const studentTimeline = useMemo(() => {
    if (!student) {
      return [];
    }

    const watchEvents =
      watchHistory.map(
        (watchItem, index) => ({
          id:
            watchItem.id ||
            `watch-${index}`,

          type: "watch",

          title:
            watchItem.lessonName ||
            "مشاهدة محاضرة",

          description:
            watchItem.courseName ||
            "كورس غير محدد",

          details: `شاهد ${
            watchItem.watchedPercent ||
            0
          }% من الفيديو`,

          date:
            watchItem.lastWatch ||
            watchItem.firstWatch ||
            null,
        })
      );

    const examEvents =
      examResults.map(
        (examResult, index) => ({
          id:
            examResult.examId ||
            `exam-${index}`,

          type: "exam",

          title:
            examResult.examTitle ||
            "امتحان",

          description: `${examResult.score || 0} من ${
            examResult.totalQuestions ||
            0
          }`,

          details: `${
            examResult.percentage || 0
          }%`,

          date:
            examResult.submittedAt ||
            null,
        })
      );

    const homeworkEvents =
      homeworkResults.map(
        (
          homeworkResult,
          index
        ) => ({
          id:
            homeworkResult.homeworkId ||
            `homework-${index}`,

          type: "homework",

          title:
            homeworkResult.homeworkTitle ||
            "واجب",

          description: `${homeworkResult.score || 0} من ${
            homeworkResult.totalQuestions ||
            homeworkResult.totalScore ||
            0
          }`,

          details:
            "تم تسليم الواجب",

          date:
            homeworkResult.submittedAt ||
            null,
        })
      );

    return [
      ...watchEvents,
      ...examEvents,
      ...homeworkEvents,
    ].sort(
      (firstEvent, secondEvent) => {
        const getTime = (value) => {
          if (!value) {
            return 0;
          }

          if (
            typeof value.toDate ===
            "function"
          ) {
            return value
              .toDate()
              .getTime();
          }

          return new Date(
            value
          ).getTime();
        };

        return (
          getTime(secondEvent.date) -
          getTime(firstEvent.date)
        );
      }
    );
  }, [
    student,
    watchHistory,
    examResults,
    homeworkResults,
  ]);

  if (isLoading) {
    return (
      <main className="admin-section-page">
        <div className="admin-section-container">
          <section className="admin-data-empty">
            <div className="admin-data-empty-icon">
              <FaClock />
            </div>

            <h2>
              جاري تحميل ملف الطالب...
            </h2>
          </section>
        </div>
      </main>
    );
  }

  if (errorMessage || !student) {
    return (
      <main className="admin-section-page">
        <div className="admin-section-container">
          <button
            type="button"
            className="admin-secondary-btn"
            onClick={() =>
              navigate(
                "/student-records"
              )
            }
          >
            <FaArrowRight />
            الرجوع
          </button>

          <section className="admin-data-empty">
            <FaTimesCircle />

            <h2>
              تعذر فتح ملف الطالب
            </h2>

            <p>
              {errorMessage}
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-section-page">
      <div className="admin-section-container">
        <header className="admin-section-header">
          <div className="admin-section-title">
            <div className="admin-section-title-icon">
              <FaUserGraduate />
            </div>

            <div>
              <span>
                ملف الطالب الشامل
              </span>

              <h1>
                {student.fullName ||
                  "اسم غير مسجل"}
              </h1>

              <p>
                متابعة بيانات الطالب
                ومشاهداته وامتحاناته
                ودرجاته طوال السنة.
              </p>
            </div>
          </div>

          <div className="admin-section-actions">
            <button
              type="button"
              className="admin-secondary-btn"
              onClick={() =>
                navigate(
                  "/student-records"
                )
              }
            >
              <FaArrowRight />
              الرجوع لملفات الطلاب
            </button>
          </div>
        </header>

        <section
          style={{
            marginBottom: "25px",
            padding: "24px",
            border:
              "1px solid rgba(200, 157, 93, 0.5)",
            borderRadius: "20px",
            background:
              "rgba(255,255,255,0.04)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "16px",
            }}
          >
            <div>
              <h3>
                <FaUserGraduate /> الاسم
              </h3>

              <p>
                {student.fullName ||
                  "غير مسجل"}
              </p>
            </div>

            <div>
              <h3>
                <FaPhoneAlt /> رقم الطالب
              </h3>

              <p>
                {student.studentPhone ||
                  "غير مسجل"}
              </p>
            </div>

            <div>
              <h3>
                <FaPhoneAlt /> رقم ولي الأمر
              </h3>

              <p>
                {student.parentPhone ||
                  "غير مسجل"}
              </p>
            </div>

            <div>
              <h3>
                <FaMapMarkerAlt /> المحافظة
              </h3>

              <p>
                {student.governorate ||
                  "غير مسجلة"}
              </p>
            </div>

            <div>
              <h3>
                <FaGraduationCap /> الصف
              </h3>

              <p>
                {student.grade ||
                  "غير محدد"}
              </p>
            </div>

            <div>
              <h3>
                <FaUsers /> نوع الطالب
              </h3>

              <p>
                {student.studentType ===
                "center"
                  ? "طالب سنتر"
                  : "طالب أونلاين"}
              </p>
            </div>

            <div>
              <h3>
                <FaCheckCircle /> الحالة
              </h3>

              <p>
                {student.status ===
                "active"
                  ? "الحساب مفعل"
                  : "الحساب قيد المراجعة"}
              </p>
            </div>

            <div>
              <h3>
                <FaClock /> تاريخ التسجيل
              </h3>

              <p>
                {formatTimestamp(
                  student.createdAt
                )}
              </p>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "15px",
            marginBottom: "28px",
          }}
        >
          <article className="admin-data-card">
            <FaVideo />

            <h3>الفيديوهات</h3>

            <strong>
              {student.watchedVideos ||
                watchHistory.length ||
                0}
            </strong>
          </article>

          <article className="admin-data-card">
            <FaClipboardCheck />

            <h3>الامتحانات المكتملة</h3>

            <strong>
              {student.completedExams ||
                examResults.length ||
                0}
            </strong>
          </article>

          <article className="admin-data-card">
            <FaFileAlt />

            <h3>الواجبات المكتملة</h3>

            <strong>
              {student.completedHomeworks ||
                homeworkResults.length ||
                0}
            </strong>
          </article>

          <article className="admin-data-card">
            <FaTrophy />

            <h3>النقاط</h3>

            <strong>
              {student.points || 0}
            </strong>
          </article>

          <article className="admin-data-card">
            <FaAward />

            <h3>متوسط الامتحانات</h3>

            <strong>
              {examsAverage}%
            </strong>
          </article>

          <article className="admin-data-card">
            <FaBookOpen />

            <h3>الكورسات</h3>

            <strong>
              {subscribedCourses.length}
            </strong>
          </article>
        </section>

        <section
          style={{
            marginBottom: "28px",
            padding: "20px",
            border:
              "1px solid rgba(200, 157, 93, 0.4)",
            borderRadius: "18px",
          }}
        >
          <h2>إدارة حساب الطالب</h2>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <button
              type="button"
              className="admin-primary-btn"
              disabled={
                isUpdatingStatus
              }
              onClick={
                toggleStudentStatus
              }
            >
              <FaKey />

              {isUpdatingStatus
                ? "جاري التعديل..."
                : student.status ===
                    "active"
                  ? "إيقاف الحساب"
                  : "تفعيل الحساب"}
            </button>

            <button
              type="button"
              className="admin-primary-btn"
              disabled={
                isUpdatingPoints
              }
              onClick={() =>
                changeStudentPoints(
                  "add"
                )
              }
            >
              <FaPlus />
              إضافة نقاط
            </button>

            <button
              type="button"
              className="admin-secondary-btn"
              disabled={
                isUpdatingPoints
              }
              onClick={() =>
                changeStudentPoints(
                  "subtract"
                )
              }
            >
              <FaMinus />
              خصم نقاط
            </button>
          </div>
        </section>

        <section
          style={{
            marginBottom: "30px",
          }}
        >
          <h2>
            <FaBookOpen /> الكورسات
          </h2>

          {subscribedCourses.length ===
          0 ? (
            <section className="admin-data-empty">
              <p>
                لا توجد كورسات مسجلة في
                حساب الطالب.
              </p>
            </section>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "15px",
              }}
            >
              {subscribedCourses.map(
                (course, index) => (
                  <article
                    className="admin-data-card"
                    key={
                      course.id ||
                      course.courseId ||
                      index
                    }
                  >
                    <FaBookOpen />

                    <h3>
                      {course.title ||
                        "كورس غير محدد"}
                    </h3>

                    <p>
                      {course.grade ||
                        student.grade}
                    </p>

                    <p>
                      نسبة الإنجاز:{" "}
                      {Number(
                        course.progress || 0
                      )}
                      %
                    </p>

                    <p>
                      تاريخ الاشتراك:{" "}
                      {formatTimestamp(
                        course.subscribedAt
                      )}
                    </p>
                  </article>
                )
              )}
            </div>
          )}
        </section>

        <section
          style={{
            marginBottom: "30px",
          }}
        >
          <h2>
            <FaVideo /> سجل المشاهدات
          </h2>

          {watchHistory.length === 0 ? (
            <section className="admin-data-empty">
              <p>
                لم يشاهد الطالب أي فيديو
                حتى الآن.
              </p>
            </section>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "14px",
              }}
            >
              {watchHistory.map(
                (watchItem, index) => (
                  <article
                    key={
                      watchItem.id ||
                      index
                    }
                    style={{
                      padding: "18px",
                      border:
                        "1px solid rgba(200, 157, 93, 0.4)",
                      borderRadius:
                        "15px",
                      background:
                        "rgba(255,255,255,0.04)",
                    }}
                  >
                    <h3>
                      {watchItem.lessonName ||
                        "محاضرة"}
                    </h3>

                    <p>
                      الكورس:{" "}
                      {watchItem.courseName ||
                        "غير محدد"}
                    </p>

                    <p>
                      نسبة المشاهدة:{" "}
                      {watchItem.watchedPercent ||
                        0}
                      %
                    </p>

                    <p>
                      وقت المشاهدة:{" "}
                      {formatSeconds(
                        watchItem.watchedSeconds
                      )}
                    </p>

                    <p>
                      عدد مرات المشاهدة:{" "}
                      {watchItem.watchCount ||
                        1}
                    </p>

                    <p>
                      أول مشاهدة:{" "}
                      {formatTimestamp(
                        watchItem.firstWatch
                      )}
                    </p>

                    <p>
                      آخر مشاهدة:{" "}
                      {formatTimestamp(
                        watchItem.lastWatch
                      )}
                    </p>
                  </article>
                )
              )}
            </div>
          )}
        </section>

        <section
          style={{
            marginBottom: "30px",
          }}
        >
          <h2>
            <FaClipboardCheck /> الامتحانات
            والدرجات
          </h2>

          {allExamIds.length === 0 ? (
            <section className="admin-data-empty">
              <p>
                لم يبدأ الطالب أي امتحان
                حتى الآن.
              </p>
            </section>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "15px",
              }}
            >
              {allExamIds.map(
                (examId) => {
                  const result =
                    getExamResult(
                      examId
                    );

                  const attempt =
                    getExamAttempt(
                      examId
                    );

                  const status =
                    getExamStatus(
                      examId
                    );

                  return (
                    <article
                      key={examId}
                      style={{
                        padding: "20px",
                        border:
                          "1px solid rgba(200, 157, 93, 0.45)",
                        borderRadius:
                          "16px",
                        background:
                          "rgba(255,255,255,0.04)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems:
                            "center",
                          gap: "15px",
                          flexWrap:
                            "wrap",
                        }}
                      >
                        <div>
                          <h3>
                            {getExamTitle(
                              examId
                            )}
                          </h3>

                          {status ===
                          "completed" ? (
                            <p
                              style={{
                                color:
                                  "#45d689",
                              }}
                            >
                              <FaCheckCircle />
                              تم تسليم الامتحان
                            </p>
                          ) : status ===
                            "started" ? (
                            <p
                              style={{
                                color:
                                  "#f2c36c",
                              }}
                            >
                              <FaClock />
                              بدأ الامتحان ولم
                              يسلّمه
                            </p>
                          ) : (
                            <p>
                              لم يبدأ الامتحان
                            </p>
                          )}
                        </div>

                        {result && (
                          <div>
                            <strong
                              style={{
                                display:
                                  "block",
                                fontSize:
                                  "25px",
                              }}
                            >
                              {result.score ||
                                0}{" "}
                              من{" "}
                              {result.totalQuestions ||
                                0}
                            </strong>

                            <span>
                              {result.percentage ||
                                0}
                              %
                            </span>
                          </div>
                        )}
                      </div>

                      {attempt?.startedAt && (
                        <p>
                          تاريخ البدء:{" "}
                          {formatTimestamp(
                            attempt.startedAt
                          )}
                        </p>
                      )}

                      {result?.submittedAt && (
                        <p>
                          تاريخ التسليم:{" "}
                          {formatTimestamp(
                            result.submittedAt
                          )}
                        </p>
                      )}

                      {(attempt || result) && (
                        <button
                          type="button"
                          className="admin-primary-btn"
                          disabled={
                            resettingExamId ===
                            examId
                          }
                          onClick={() =>
                            reopenExam(
                              examId
                            )
                          }
                        >
                          <FaLockOpen />

                          {resettingExamId ===
                          examId
                            ? "جاري إعادة الفتح..."
                            : "إعادة فتح الامتحان"}
                        </button>
                      )}
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>

        <section
          style={{
            marginBottom: "30px",
          }}
        >
          <h2>
            <FaFileAlt /> الواجبات
          </h2>

          {homeworkResults.length ===
          0 ? (
            <section className="admin-data-empty">
              <p>
                لم يسلّم الطالب أي واجب
                حتى الآن.
              </p>
            </section>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "14px",
              }}
            >
              {homeworkResults.map(
                (
                  homeworkResult,
                  index
                ) => (
                  <article
                    key={
                      homeworkResult.homeworkId ||
                      index
                    }
                    className="admin-data-card"
                  >
                    <FaFileAlt />

                    <h3>
                      {homeworkResult.homeworkTitle ||
                        "واجب"}
                    </h3>

                    <strong>
                      {homeworkResult.score ||
                        0}{" "}
                      من{" "}
                      {homeworkResult.totalQuestions ||
                        homeworkResult.totalScore ||
                        0}
                    </strong>

                    <p>
                      تاريخ التسليم:{" "}
                      {formatTimestamp(
                        homeworkResult.submittedAt
                      )}
                    </p>
                  </article>
                )
              )}
            </div>
          )}
        </section>

        <section>
          <h2>
            <FaClock /> سجل نشاط الطالب
          </h2>

          {studentTimeline.length === 0 ? (
            <section className="admin-data-empty">
              <p>
                لا يوجد نشاط مسجل حتى الآن.
              </p>
            </section>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "13px",
              }}
            >
              {studentTimeline.map(
                (
                  activity,
                  index
                ) => (
                  <article
                    key={`${activity.type}-${activity.id}-${index}`}
                    style={{
                      padding: "17px",
                      borderRight:
                        "4px solid #d5a75f",
                      borderRadius:
                        "8px",
                      background:
                        "rgba(255,255,255,0.04)",
                    }}
                  >
                    <strong>
                      {activity.title}
                    </strong>

                    <p>
                      {
                        activity.description
                      }
                    </p>

                    <p>
                      {activity.details}
                    </p>

                    <span>
                      {formatTimestamp(
                        activity.date
                      )}
                    </span>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default StudentProfile;