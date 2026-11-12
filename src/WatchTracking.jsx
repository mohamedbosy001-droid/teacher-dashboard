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
  FaPhoneAlt,
  FaPlayCircle,
  FaSearch,
  FaTimesCircle,
  FaUserGraduate,
} from "react-icons/fa";

import { db } from "./firebase";
import "./App.css";

/*
  ============================
  دوال مساعدة
  ============================
*/

function safeKey(value) {
  return String(value || "").replace(
    /[^A-Za-z0-9_-]/g,
    "_"
  );
}

function getMillis(timestamp) {
  if (!timestamp) {
    return 0;
  }

  try {
    if (
      typeof timestamp.toMillis ===
      "function"
    ) {
      return timestamp.toMillis();
    }

    return new Date(timestamp).getTime() || 0;
  } catch {
    return 0;
  }
}

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

    return date.toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "غير مسجل";
  }
}

function formatSeconds(seconds) {
  const totalSeconds =
    Math.floor(Number(seconds)) || 0;

  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const remainingSeconds =
    totalSeconds % 60;

  if (hours > 0) {
    return `${hours} ساعة و${minutes} دقيقة و${remainingSeconds} ثانية`;
  }

  if (minutes > 0) {
    return `${minutes} دقيقة و${remainingSeconds} ثانية`;
  }

  return `${remainingSeconds} ثانية`;
}

function getKindText(kind) {
  if (kind === "homework") {
    return "فيديو واجب";
  }

  if (kind === "solution") {
    return "حل واجب";
  }

  return "محاضرة";
}

function getStudentTypeText(studentType) {
  return studentType === "center"
    ? "طالب سنتر"
    : "طالب أونلاين";
}

/*
  بيجمع كل الفيديوهات اللي الطالب شافها:
  - videoWatchLog: التسجيل الجديد (مدة المشاهدة الفعلية)
  - watchHistory: السجل القديم (لحظة الوصول لـ 30% فقط)
*/

function buildWatchItems(student) {
  const log =
    student?.videoWatchLog &&
    typeof student.videoWatchLog ===
      "object"
      ? student.videoWatchLog
      : {};

  const items = Object.entries(log).map(
    ([key, value]) => ({
      id: key,
      title: value?.title || "فيديو",
      courseName: value?.courseName || "",
      kind: value?.kind || "lecture",
      watchedSeconds:
        Number(value?.watchedSeconds) || 0,
      durationSeconds:
        Number(
          value?.videoDurationSeconds
        ) || 0,
      lastWatch: value?.lastWatch || null,
      legacy: false,
    })
  );

  const history = Array.isArray(
    student?.watchHistory
  )
    ? student.watchHistory
    : [];

  history.forEach((historyItem) => {
    const newKey = safeKey(
      `${historyItem?.courseId}__${historyItem?.lessonId}__lecture`
    );

    if (log[newKey]) {
      return;
    }

    items.push({
      id: `legacy-${
        historyItem?.id || newKey
      }`,
      title:
        historyItem?.lessonName ||
        "محاضرة",
      courseName:
        historyItem?.courseName || "",
      kind: "lecture",
      watchedSeconds:
        Number(
          historyItem?.watchedSeconds
        ) || 0,
      durationSeconds:
        Number(
          historyItem?.videoDurationSeconds
        ) || 0,
      lastWatch:
        historyItem?.lastWatch ||
        historyItem?.firstWatch ||
        null,
      legacy: true,
    });
  });

  items.sort(
    (firstItem, secondItem) =>
      getMillis(secondItem.lastWatch) -
      getMillis(firstItem.lastWatch)
  );

  return items;
}

/*
  ============================
  الصفحة
  ============================
*/

function WatchTracking() {
  const navigate = useNavigate();

  const [students, setStudents] =
    useState([]);

  const [searchText, setSearchText] =
    useState("");

  const [gradeFilter, setGradeFilter] =
    useState("all");

  const [typeFilter, setTypeFilter] =
    useState("all");

  const [
    selectedStudentId,
    setSelectedStudentId,
  ] = useState(null);

  const [kindFilter, setKindFilter] =
    useState("all");

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "students"),

      (snapshot) => {
        const loadedStudents =
          snapshot.docs.map(
            (studentDocument) => ({
              id: studentDocument.id,
              ...studentDocument.data(),
            })
          );

        loadedStudents.sort(
          (firstStudent, secondStudent) =>
            String(
              firstStudent.fullName || ""
            ).localeCompare(
              String(
                secondStudent.fullName || ""
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
          "حدث خطأ أثناء تحميل بيانات الطلاب."
        );

        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredStudents = useMemo(() => {
    const cleanSearchText = searchText
      .trim()
      .toLowerCase();

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
        student.grade === gradeFilter;

      const matchesType =
        typeFilter === "all" ||
        student.studentType === typeFilter;

      return (
        matchesSearch &&
        matchesGrade &&
        matchesType
      );
    });
  }, [
    students,
    searchText,
    gradeFilter,
    typeFilter,
  ]);

  const selectedStudent = useMemo(
    () =>
      students.find(
        (student) =>
          student.id === selectedStudentId
      ) || null,
    [students, selectedStudentId]
  );

  const selectedItems = useMemo(
    () =>
      selectedStudent
        ? buildWatchItems(selectedStudent)
        : [],
    [selectedStudent]
  );

  const visibleItems = useMemo(
    () =>
      selectedItems.filter((item) => {
        if (kindFilter === "all") {
          return true;
        }

        if (kindFilter === "lecture") {
          return item.kind === "lecture";
        }

        return (
          item.kind === "homework" ||
          item.kind === "solution"
        );
      }),
    [selectedItems, kindFilter]
  );

  const totalWatchedSeconds = useMemo(
    () =>
      selectedItems.reduce(
        (total, item) =>
          item.legacy
            ? total
            : total + item.watchedSeconds,
        0
      ),
    [selectedItems]
  );

  function openStudent(studentId) {
    setSelectedStudentId(studentId);
    setKindFilter("all");
    window.scrollTo(0, 0);
  }

  function closeStudent() {
    setSelectedStudentId(null);
    window.scrollTo(0, 0);
  }

  const cardStyle = {
    padding: "20px",
    border:
      "1px solid rgba(200, 157, 93, 0.38)",
    borderRadius: "17px",
    background: "rgba(255,255,255,0.04)",
    boxShadow:
      "0 10px 25px rgba(0,0,0,0.12)",
  };

  const selectStyle = {
    minHeight: "48px",
    padding: "10px",
    borderRadius: "12px",
  };

  /*
    ============================
    صفحة مشاهدات طالب واحد
    ============================
  */

  if (selectedStudent) {
    return (
      <main className="admin-section-page">
        <div className="admin-section-container">
          <header className="admin-section-header">
            <div className="admin-section-title">
              <div className="admin-section-title-icon">
                <FaEye />
              </div>

              <div>
                <span>المشاهدة</span>

                <h1>
                  {selectedStudent.fullName ||
                    "اسم غير مسجل"}
                </h1>

                <p>
                  {selectedStudent.grade ||
                    "صف غير محدد"}{" "}
                  -{" "}
                  {getStudentTypeText(
                    selectedStudent.studentType
                  )}{" "}
                  -{" "}
                  {selectedStudent.studentPhone ||
                    "رقم غير مسجل"}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="admin-secondary-btn"
              onClick={closeStudent}
            >
              <FaArrowRight />
              رجوع للطلاب
            </button>
          </header>

          <section
            style={{
              ...cardStyle,
              marginBottom: "25px",
              display: "flex",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            <strong>
              عدد الفيديوهات:{" "}
              {selectedItems.length}
            </strong>

            <strong>
              إجمالي وقت المشاهدة المسجّل:{" "}
              {formatSeconds(
                totalWatchedSeconds
              )}
            </strong>
          </section>

          <section
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "20px",
            }}
          >
            {[
              ["all", "الكل"],
              ["lecture", "المحاضرات"],
              ["homework", "الواجبات"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={
                  kindFilter === value
                    ? "admin-primary-btn"
                    : "admin-secondary-btn"
                }
                onClick={() =>
                  setKindFilter(value)
                }
              >
                {label}
              </button>
            ))}
          </section>

          {visibleItems.length === 0 ? (
            <section className="admin-data-empty">
              <div className="admin-data-empty-icon">
                <FaPlayCircle />
              </div>

              <h2>
                لم يشاهد الطالب أي فيديو هنا
                حتى الآن.
              </h2>
            </section>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "14px",
              }}
            >
              {visibleItems.map((item) => {
                const percent =
                  item.durationSeconds > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (item.watchedSeconds /
                            item.durationSeconds) *
                            100
                        )
                      )
                    : null;

                return (
                  <article
                    key={item.id}
                    style={cardStyle}
                  >
                    <h3>{item.title}</h3>

                    <p>
                      النوع:{" "}
                      {getKindText(item.kind)}
                      {item.courseName
                        ? ` - ${item.courseName}`
                        : ""}
                    </p>

                    {item.legacy ? (
                      <p>
                        سجل قديم: الطالب وصل
                        لـ 30% من الفيديو (عند{" "}
                        {formatSeconds(
                          item.watchedSeconds
                        )}
                        ). مدة المشاهدة
                        الكاملة لم تكن
                        تُسجّل وقتها.
                      </p>
                    ) : (
                      <>
                        <p>
                          اتفرج على:{" "}
                          <strong>
                            {formatSeconds(
                              item.watchedSeconds
                            )}
                          </strong>
                          {item.durationSeconds >
                          0
                            ? ` من ${formatSeconds(
                                item.durationSeconds
                              )}`
                            : ""}
                        </p>

                        {percent !== null && (
                          <p>
                            نسبة المشاهدة:{" "}
                            {percent}%
                            {item.watchedSeconds >
                            item.durationSeconds *
                              1.05
                              ? " (أعاد المشاهدة أكثر من مرة)"
                              : ""}
                          </p>
                        )}
                      </>
                    )}

                    <p>
                      آخر مشاهدة:{" "}
                      {formatTimestamp(
                        item.lastWatch
                      )}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    );
  }

  /*
    ============================
    قائمة الطلاب
    ============================
  */

  return (
    <main className="admin-section-page">
      <div className="admin-section-container">
        <header className="admin-section-header">
          <div className="admin-section-title">
            <div className="admin-section-title-icon">
              <FaEye />
            </div>

            <div>
              <span>
                لوحة تحكم المدرس
              </span>

              <h1>المشاهدة</h1>

              <p>
                اختاري الطالب لمتابعة كل
                الفيديوهات اللي شاهدها
                (محاضرات وواجبات) ومدة
                مشاهدته لكل فيديو.
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
              style={selectStyle}
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
              style={selectStyle}
            >
              <option value="all">
                كل أنواع الطلاب
              </option>

              <option value="center">
                طلاب السنتر
              </option>

              <option value="online">
                طلاب الأونلاين
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

            <h2>جاري تحميل الطلاب...</h2>
          </section>
        ) : errorMessage ? (
          <section className="admin-data-empty">
            <FaTimesCircle />

            <h2>حدث خطأ</h2>

            <p>{errorMessage}</p>
          </section>
        ) : filteredStudents.length === 0 ? (
          <section className="admin-data-empty">
            <FaSearch />

            <h2>لا توجد نتائج مطابقة</h2>

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
                  style={cardStyle}
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
                    الفيديوهات المشاهدة:{" "}
                    <strong>
                      {
                        buildWatchItems(student)
                          .length
                      }
                    </strong>
                  </p>

                  <button
                    type="button"
                    className="admin-primary-btn"
                    onClick={() =>
                      openStudent(student.id)
                    }
                  >
                    <FaEye />
                    عرض المشاهدة
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

export default WatchTracking;
