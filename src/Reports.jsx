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
  FaChartLine,
  FaArrowRight,
  FaChartBar,
  FaUsers,
  FaBookOpen,
  FaVideo,
  FaClipboardCheck,
  FaFileAlt,
  FaCreditCard,
  FaMoneyBillWave,
  FaUserCheck,
  FaUserClock,
} from "react-icons/fa";

import { db } from "./firebase";
import "./App.css";

function Reports() {
  const navigate = useNavigate();

  const [students, setStudents] =
    useState([]);

  const [courses, setCourses] =
    useState([]);

  const [lessons, setLessons] =
    useState([]);

  const [homeworks, setHomeworks] =
    useState([]);

  const [exams, setExams] =
    useState([]);

  const [invoices, setInvoices] =
    useState([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    const loadedCollections = new Set();

    function markCollectionLoaded(
      collectionName
    ) {
      loadedCollections.add(
        collectionName
      );

      if (
        loadedCollections.size === 6
      ) {
        setIsLoading(false);
      }
    }

    function handleError(error) {
      console.error(
        "Reports loading error:",
        error
      );

      setErrorMessage(
        "حدث خطأ أثناء تحميل تقارير المنصة."
      );

      setIsLoading(false);
    }

    const unsubscribeStudents =
      onSnapshot(
        collection(db, "students"),
        (snapshot) => {
          setStudents(
            snapshot.docs.map(
              (studentDocument) => ({
                id:
                  studentDocument.id,

                ...studentDocument.data(),
              })
            )
          );

          markCollectionLoaded(
            "students"
          );
        },
        handleError
      );

    const unsubscribeCourses =
      onSnapshot(
        collection(db, "courses"),
        (snapshot) => {
          setCourses(
            snapshot.docs.map(
              (courseDocument) => ({
                id:
                  courseDocument.id,

                ...courseDocument.data(),
              })
            )
          );

          markCollectionLoaded(
            "courses"
          );
        },
        handleError
      );

    const unsubscribeLessons =
      onSnapshot(
        collection(db, "lessons"),
        (snapshot) => {
          setLessons(
            snapshot.docs.map(
              (lessonDocument) => ({
                id:
                  lessonDocument.id,

                ...lessonDocument.data(),
              })
            )
          );

          markCollectionLoaded(
            "lessons"
          );
        },
        handleError
      );

    const unsubscribeHomeworks =
      onSnapshot(
        collection(db, "homeworks"),
        (snapshot) => {
          setHomeworks(
            snapshot.docs.map(
              (homeworkDocument) => ({
                id:
                  homeworkDocument.id,

                ...homeworkDocument.data(),
              })
            )
          );

          markCollectionLoaded(
            "homeworks"
          );
        },
        handleError
      );

    const unsubscribeExams =
      onSnapshot(
        collection(db, "exams"),
        (snapshot) => {
          setExams(
            snapshot.docs.map(
              (examDocument) => ({
                id:
                  examDocument.id,

                ...examDocument.data(),
              })
            )
          );

          markCollectionLoaded(
            "exams"
          );
        },
        handleError
      );

    const unsubscribeInvoices =
      onSnapshot(
        collection(db, "invoices"),
        (snapshot) => {
          setInvoices(
            snapshot.docs.map(
              (invoiceDocument) => ({
                id:
                  invoiceDocument.id,

                ...invoiceDocument.data(),
              })
            )
          );

          markCollectionLoaded(
            "invoices"
          );
        },
        handleError
      );

    return () => {
      unsubscribeStudents();
      unsubscribeCourses();
      unsubscribeLessons();
      unsubscribeHomeworks();
      unsubscribeExams();
      unsubscribeInvoices();
    };
  }, []);

  const reportData = useMemo(() => {
    const activeStudents =
      students.filter(
        (student) =>
          student.status === "active"
      ).length;

    const pendingStudents =
      students.filter(
        (student) =>
          student.status !== "active"
      ).length;

    const centerStudents =
      students.filter(
        (student) =>
          student.studentType ===
          "center"
      ).length;

    const onlineStudents =
      students.filter(
        (student) =>
          student.studentType ===
          "online"
      ).length;

    const bothStudents =
      students.filter(
        (student) =>
          student.studentType ===
          "both"
      ).length;

    const publishedCourses =
      courses.filter(
        (course) =>
          course.isPublished === true
      ).length;

    const publishedLessons =
      lessons.filter(
        (lesson) =>
          lesson.isPublished === true
      ).length;

    const paidInvoices =
      invoices.filter(
        (invoice) =>
          invoice.status === "paid"
      );

    const pendingInvoices =
      invoices.filter(
        (invoice) =>
          invoice.status ===
          "pending"
      ).length;

    const cancelledInvoices =
      invoices.filter(
        (invoice) =>
          invoice.status ===
          "cancelled"
      ).length;

    const totalRevenue =
      paidInvoices.reduce(
        (total, invoice) =>
          total +
          Number(
            invoice.amount || 0
          ),
        0
      );

    const watchedVideos =
      students.reduce(
        (total, student) =>
          total +
          Number(
            student.watchedVideos || 0
          ),
        0
      );

    const completedExams =
      students.reduce(
        (total, student) =>
          total +
          Number(
            student.completedExams || 0
          ),
        0
      );

    const completedHomeworks =
      students.reduce(
        (total, student) =>
          total +
          Number(
            student.completedHomeworks ||
              0
          ),
        0
      );

    return {
      activeStudents,
      pendingStudents,
      centerStudents,
      onlineStudents,
      bothStudents,
      publishedCourses,
      publishedLessons,

      paidInvoices:
        paidInvoices.length,

      pendingInvoices,
      cancelledInvoices,
      totalRevenue,
      watchedVideos,
      completedExams,
      completedHomeworks,
    };
  }, [
    students,
    courses,
    lessons,
    invoices,
  ]);

  const statisticsCards = [
    {
      id: "students",

      title:
        "إجمالي الطلاب",

      value:
        students.length,

      description:
        "جميع حسابات الطلاب المسجلة",

      icon:
        <FaUsers />,

      path:
        "/students",
    },

    {
      id: "active-students",

      title:
        "الطلاب المفعلون",

      value:
        reportData.activeStudents,

      description:
        "الحسابات التي تم تفعيلها",

      icon:
        <FaUserCheck />,

      path:
        "/students",
    },

    {
      id: "pending-students",

      title:
        "بانتظار التفعيل",

      value:
        reportData.pendingStudents,

      description:
        "الحسابات قيد المراجعة",

      icon:
        <FaUserClock />,

      path:
        "/students",
    },

    {
      id: "courses",

      title:
        "إجمالي الكورسات",

      value:
        courses.length,

      description:
        `${reportData.publishedCourses} كورس ظاهر للطلاب`,

      icon:
        <FaBookOpen />,

      path:
        "/courses",
    },

    {
      id: "lessons",

      title:
        "إجمالي المحاضرات",

      value:
        lessons.length,

      description:
        `${reportData.publishedLessons} محاضرة ظاهرة`,

      icon:
        <FaVideo />,

      path:
        "/lessons",
    },

    {
      id: "homeworks",

      title:
        "إجمالي الواجبات",

      value:
        homeworks.length,

      description:
        "الواجبات الموجودة على المنصة",

      icon:
        <FaClipboardCheck />,

      path:
        "/homeworks",
    },

    {
      id: "exams",

      title:
        "إجمالي الامتحانات",

      value:
        exams.length,

      description:
        "الامتحانات الموجودة على المنصة",

      icon:
        <FaFileAlt />,

      path:
        "/exams",
    },

    {
      id: "invoices",

      title:
        "إجمالي الفواتير",

      value:
        invoices.length,

      description:
        `${reportData.paidInvoices} فاتورة مدفوعة`,

      icon:
        <FaCreditCard />,

      path:
        "/invoices",
    },

    {
      id: "revenue",

      title:
        "إجمالي الإيرادات",

      value:
        `${reportData.totalRevenue} جنيه`,

      description:
        "قيمة الفواتير المدفوعة",

      icon:
        <FaMoneyBillWave />,

      path:
        "/invoices",
    },
  ];

  const activityData = [
    {
      title:
        "مشاهدات الفيديوهات",

      value:
        reportData.watchedVideos,
    },

    {
      title:
        "الامتحانات المكتملة",

      value:
        reportData.completedExams,
    },

    {
      title:
        "الواجبات المكتملة",

      value:
        reportData.completedHomeworks,
    },
  ];

  return (
    <main className="admin-section-page">
      <div className="admin-section-container">
        <header className="admin-section-header">
          <div className="admin-section-title">
            <div className="admin-section-title-icon">
              <FaChartLine />
            </div>

            <div>
              <span>
                لوحة تحكم المدرس
              </span>

              <h1>
                التقارير والإحصائيات
              </h1>

              <p>
                اضغطي على أي كارت لعرض
                جميع البيانات الخاصة به.
              </p>
            </div>
          </div>

          <div className="admin-section-actions">
            <button
              type="button"
              className="admin-secondary-btn"
              onClick={() =>
                navigate(
                  "/dashboard"
                )
              }
            >
              <FaArrowRight />
              الرجوع
            </button>
          </div>
        </header>

        {isLoading ? (
          <section className="admin-data-empty">
            <div className="admin-data-empty-icon">
              <FaChartBar />
            </div>

            <h2>
              جاري تحميل التقارير...
            </h2>
          </section>
        ) : errorMessage ? (
          <section className="admin-data-empty">
            <div className="admin-data-empty-icon">
              <FaChartBar />
            </div>

            <h2>
              حدث خطأ
            </h2>

            <p>
              {errorMessage}
            </p>
          </section>
        ) : (
          <>
            <section className="reports-statistics-grid">
              {statisticsCards.map(
                (card) => (
                  <button
                    key={card.id}
                    type="button"
                    className="reports-stat-card reports-stat-card-button"
                    onClick={() =>
                      navigate(
                        card.path
                      )
                    }
                  >
                    <div className="reports-stat-icon">
                      {card.icon}
                    </div>

                    <div>
                      <span>
                        {card.title}
                      </span>

                      <strong>
                        {card.value}
                      </strong>

                      <p>
                        {
                          card.description
                        }
                      </p>
                    </div>
                  </button>
                )
              )}
            </section>

            <section className="reports-details-grid">
              <button
                type="button"
                className="reports-details-card reports-details-button"
                onClick={() =>
                  navigate(
                    "/students"
                  )
                }
              >
                <div className="reports-card-heading">
                  <FaUsers />

                  <h2>
                    أنواع الطلاب
                  </h2>
                </div>

                <div className="reports-row">
                  <span>
                    طلاب السنتر
                  </span>

                  <strong>
                    {
                      reportData.centerStudents
                    }
                  </strong>
                </div>

                <div className="reports-row">
                  <span>
                    طلاب الأونلاين
                  </span>

                  <strong>
                    {
                      reportData.onlineStudents
                    }
                  </strong>
                </div>

                <div className="reports-row">
                  <span>
                    سنتر وأونلاين
                  </span>

                  <strong>
                    {
                      reportData.bothStudents
                    }
                  </strong>
                </div>

                <div className="reports-row">
                  <span>
                    حسابات قيد المراجعة
                  </span>

                  <strong>
                    {
                      reportData.pendingStudents
                    }
                  </strong>
                </div>
              </button>

              <button
                type="button"
                className="reports-details-card reports-details-button"
                onClick={() =>
                  navigate(
                    "/invoices"
                  )
                }
              >
                <div className="reports-card-heading">
                  <FaCreditCard />

                  <h2>
                    حالة الفواتير
                  </h2>
                </div>

                <div className="reports-row">
                  <span>
                    فواتير مدفوعة
                  </span>

                  <strong>
                    {
                      reportData.paidInvoices
                    }
                  </strong>
                </div>

                <div className="reports-row">
                  <span>
                    فواتير قيد المراجعة
                  </span>

                  <strong>
                    {
                      reportData.pendingInvoices
                    }
                  </strong>
                </div>

                <div className="reports-row">
                  <span>
                    فواتير ملغية
                  </span>

                  <strong>
                    {
                      reportData.cancelledInvoices
                    }
                  </strong>
                </div>

                <div className="reports-row">
                  <span>
                    إجمالي الإيرادات
                  </span>

                  <strong>
                    {
                      reportData.totalRevenue
                    }{" "}
                    جنيه
                  </strong>
                </div>
              </button>

              <article className="reports-details-card">
                <div className="reports-card-heading">
                  <FaChartBar />

                  <h2>
                    نشاط الطلاب
                  </h2>
                </div>

                {activityData.map(
                  (activity) => (
                    <div
                      className="reports-row"
                      key={
                        activity.title
                      }
                    >
                      <span>
                        {
                          activity.title
                        }
                      </span>

                      <strong>
                        {
                          activity.value
                        }
                      </strong>
                    </div>
                  )
                )}
              </article>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default Reports;