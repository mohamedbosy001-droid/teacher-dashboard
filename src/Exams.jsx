import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import {
  FaFileAlt,
  FaArrowRight,
  FaClipboardList,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaTimes,
  FaSearch,
  FaFilter,
} from "react-icons/fa";

import { db } from "./firebase";
import "./App.css";

const initialExamData = {
  title: "",
  description: "",
  courseId: "",
  lessonId: "",
  totalScore: "",
  durationMinutes: "",
  isPublished: false,
};

function Exams() {
  const navigate = useNavigate();

  const [exams, setExams] =
    useState([]);

  const [courses, setCourses] =
    useState([]);

  const [lessons, setLessons] =
    useState([]);

  const [searchText, setSearchText] =
    useState("");

  const [
    selectedCourseId,
    setSelectedCourseId,
  ] = useState("");

  const [
    showExamForm,
    setShowExamForm,
  ] = useState(false);

  const [
    examData,
    setExamData,
  ] = useState(initialExamData);

  const [
    editingExamId,
    setEditingExamId,
  ] = useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    const unsubscribeExams =
      onSnapshot(
        collection(db, "exams"),
        (snapshot) => {
          const examsData =
            snapshot.docs.map(
              (examDocument) => ({
                id: examDocument.id,
                ...examDocument.data(),
              })
            );

          setExams(examsData);
          setIsLoading(false);
          setMessage("");
        },
        (error) => {
          console.error(error);

          setMessage(
            "حدث خطأ أثناء تحميل الامتحانات."
          );

          setIsLoading(false);
        }
      );

    const unsubscribeCourses =
      onSnapshot(
        collection(db, "courses"),
        (snapshot) => {
          const coursesData =
            snapshot.docs.map(
              (courseDocument) => ({
                id: courseDocument.id,
                ...courseDocument.data(),
              })
            );

          setCourses(coursesData);
        }
      );

    const unsubscribeLessons =
      onSnapshot(
        collection(db, "lessons"),
        (snapshot) => {
          const lessonsData =
            snapshot.docs.map(
              (lessonDocument) => ({
                id: lessonDocument.id,
                ...lessonDocument.data(),
              })
            );

          setLessons(lessonsData);
        }
      );

    return () => {
      unsubscribeExams();
      unsubscribeCourses();
      unsubscribeLessons();
    };
  }, []);

  const visibleExams = useMemo(() => {
    const searchValue =
      searchText.trim().toLowerCase();

    return exams.filter((exam) => {
      const matchesSearch =
        !searchValue ||
        exam.title
          ?.toLowerCase()
          .includes(searchValue);

      const matchesCourse =
        !selectedCourseId ||
        exam.courseId ===
          selectedCourseId;

      return (
        matchesSearch &&
        matchesCourse
      );
    });
  }, [
    exams,
    searchText,
    selectedCourseId,
  ]);

  const availableLessons =
    lessons.filter(
      (lesson) =>
        !examData.courseId ||
        lesson.courseId ===
          examData.courseId
    );

  function getCourseTitle(courseId) {
    const course = courses.find(
      (item) => item.id === courseId
    );

    return course?.title || "كورس غير محدد";
  }

  function getLessonTitle(lessonId) {
    const lesson = lessons.find(
      (item) => item.id === lessonId
    );

    return lesson?.title || "محاضرة غير محددة";
  }

  function handleExamChange(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setExamData((previousData) => {
      const updatedData = {
        ...previousData,
        [name]:
          type === "checkbox"
            ? checked
            : value,
      };

      if (name === "courseId") {
        updatedData.lessonId = "";
      }

      return updatedData;
    });

    setMessage("");
  }

  function openAddExamForm() {
    setEditingExamId(null);
    setExamData(initialExamData);
    setMessage("");
    setShowExamForm(true);
  }

  function openEditExamForm(exam) {
    setEditingExamId(exam.id);

    setExamData({
      title: exam.title || "",
      description:
        exam.description || "",
      courseId: exam.courseId || "",
      lessonId: exam.lessonId || "",
      totalScore:
        exam.totalScore === undefined
          ? ""
          : String(exam.totalScore),
      durationMinutes:
        exam.durationMinutes ===
        undefined
          ? ""
          : String(
              exam.durationMinutes
            ),
      isPublished:
        exam.isPublished === true,
    });

    setMessage("");
    setShowExamForm(true);
  }

  function closeExamForm() {
    setShowExamForm(false);
    setEditingExamId(null);
    setExamData(initialExamData);
    setMessage("");
  }

  async function handleExamSubmit(event) {
    event.preventDefault();

    if (
      !examData.title.trim() ||
      !examData.description.trim() ||
      !examData.courseId ||
      !examData.lessonId ||
      examData.totalScore === "" ||
      examData.durationMinutes === ""
    ) {
      setMessage(
        "من فضلك املئي جميع البيانات المطلوبة."
      );
      return;
    }

    const totalScore = Number(
      examData.totalScore
    );

    const durationMinutes = Number(
      examData.durationMinutes
    );

    if (
      Number.isNaN(totalScore) ||
      totalScore <= 0
    ) {
      setMessage(
        "درجة الامتحان يجب أن تكون أكبر من صفر."
      );
      return;
    }

    if (
      Number.isNaN(durationMinutes) ||
      durationMinutes <= 0
    ) {
      setMessage(
        "مدة الامتحان يجب أن تكون أكبر من صفر."
      );
      return;
    }

    setIsSaving(true);
    setMessage("");

    const course = courses.find(
      (item) =>
        item.id === examData.courseId
    );

    const lesson = lessons.find(
      (item) =>
        item.id === examData.lessonId
    );

    const examToSave = {
      title:
        examData.title.trim(),

      description:
        examData.description.trim(),

      courseId:
        examData.courseId,

      courseTitle:
        course?.title || "",

      lessonId:
        examData.lessonId,

      lessonTitle:
        lesson?.title || "",

      totalScore,
      durationMinutes,

      isPublished:
        examData.isPublished,

      updatedAt:
        serverTimestamp(),
    };

    try {
      if (editingExamId) {
        await updateDoc(
          doc(
            db,
            "exams",
            editingExamId
          ),
          examToSave
        );
      } else {
        await addDoc(
          collection(db, "exams"),
          {
            ...examToSave,
            questions: [],
            createdAt:
              serverTimestamp(),
          }
        );
      }

      closeExamForm();
    } catch (error) {
      console.error(error);

      setMessage(
        "حدث خطأ أثناء حفظ الامتحان."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleExamVisibility(
    exam
  ) {
    try {
      await updateDoc(
        doc(
          db,
          "exams",
          exam.id
        ),
        {
          isPublished:
            exam.isPublished !== true,

          updatedAt:
            serverTimestamp(),
        }
      );
    } catch (error) {
      console.error(error);

      window.alert(
        "حدث خطأ أثناء تغيير حالة الامتحان."
      );
    }
  }

  async function handleDeleteExam(
    exam
  ) {
    const confirmed =
      window.confirm(
        `هل أنتِ متأكدة من حذف الامتحان "${exam.title}"؟`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(
        doc(
          db,
          "exams",
          exam.id
        )
      );
    } catch (error) {
      console.error(error);

      window.alert(
        "حدث خطأ أثناء حذف الامتحان."
      );
    }
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
                إدارة الامتحانات
              </h1>

              <p>
                إنشاء الامتحانات وربطها
                بالمحاضرات والكورسات.
              </p>
            </div>
          </div>

          <div className="admin-section-actions">
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

            <button
              type="button"
              className="admin-primary-btn"
              onClick={openAddExamForm}
            >
              <FaPlus />
              إضافة امتحان
            </button>
          </div>
        </header>

        <section className="admin-toolbar">
          <div className="admin-search-box">
            <FaSearch />

            <input
              type="search"
              value={searchText}
              onChange={(event) =>
                setSearchText(
                  event.target.value
                )
              }
              placeholder="ابحثي باسم الامتحان..."
            />
          </div>

          <div className="admin-filter-box">
            <FaFilter />

            <select
              value={selectedCourseId}
              onChange={(event) =>
                setSelectedCourseId(
                  event.target.value
                )
              }
            >
              <option value="">
                كل الكورسات
              </option>

              {courses.map(
                (course) => (
                  <option
                    key={course.id}
                    value={course.id}
                  >
                    {course.title}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="admin-total-box">
            <span>
              عدد الامتحانات
            </span>

            <strong>
              {exams.length}
            </strong>
          </div>
        </section>

        {message &&
          !showExamForm && (
            <div className="teacher-login-message error">
              {message}
            </div>
          )}

        {isLoading ? (
          <section className="admin-data-empty">
            <h2>
              جاري تحميل الامتحانات...
            </h2>
          </section>
        ) : visibleExams.length === 0 ? (
          <section className="admin-data-empty">
            <div className="admin-data-empty-icon">
              <FaClipboardList />
            </div>

            <h2>
              لا توجد امتحانات حتى الآن
            </h2>

            <p>
              أضيفي أول امتحان واربطِيه
              بمحاضرة.
            </p>

            <button
              type="button"
              className="admin-primary-btn"
              onClick={openAddExamForm}
            >
              <FaPlus />
              إضافة أول امتحان
            </button>
          </section>
        ) : (
          <section className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>الامتحان</th>
                  <th>الكورس</th>
                  <th>المحاضرة</th>
                  <th>الدرجة</th>
                  <th>المدة</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>

              <tbody>
                {visibleExams.map(
                  (exam) => (
                    <tr key={exam.id}>
                      <td>
                        <strong>
                          {exam.title}
                        </strong>
                      </td>

                      <td>
                        {getCourseTitle(
                          exam.courseId
                        )}
                      </td>

                      <td>
                        {getLessonTitle(
                          exam.lessonId
                        )}
                      </td>

                      <td>
                        {exam.totalScore}
                      </td>

                      <td>
                        {exam.durationMinutes} دقيقة
                      </td>

                      <td>
                        <span
                          className={`admin-status ${
                            exam.isPublished
                              ? "published"
                              : "hidden"
                          }`}
                        >
                          {exam.isPublished
                            ? "ظاهر"
                            : "مخفي"}
                        </span>
                      </td>

                      <td>
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="admin-icon-btn view"
                            onClick={() =>
                              toggleExamVisibility(
                                exam
                              )
                            }
                          >
                            {exam.isPublished ? (
                              <FaEyeSlash />
                            ) : (
                              <FaEye />
                            )}
                          </button>

                          <button
                            type="button"
                            className="admin-icon-btn edit"
                            onClick={() =>
                              openEditExamForm(
                                exam
                              )
                            }
                          >
                            <FaEdit />
                          </button>

                          <button
                            type="button"
                            className="admin-icon-btn delete"
                            onClick={() =>
                              handleDeleteExam(
                                exam
                              )
                            }
                          >
                            <FaTrash />
                          </button>
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

      {showExamForm && (
        <div className="instructions-overlay">
          <div className="instructions-modal">
            <button
              type="button"
              onClick={closeExamForm}
              aria-label="إغلاق"
            >
              <FaTimes />
            </button>

            <h2>
              {editingExamId
                ? "تعديل الامتحان"
                : "إضافة امتحان جديد"}
            </h2>

            <form
              className="register-form"
              onSubmit={handleExamSubmit}
            >
              <div className="form-grid">
                <div className="form-field full-width-field">
                  <input
                    type="text"
                    name="title"
                    value={
                      examData.title
                    }
                    onChange={
                      handleExamChange
                    }
                    placeholder="اسم الامتحان"
                  />
                </div>

                <div className="form-field full-width-field">
                  <textarea
                    name="description"
                    value={
                      examData.description
                    }
                    onChange={
                      handleExamChange
                    }
                    placeholder="وصف الامتحان"
                    rows="4"
                  />
                </div>

                <div className="form-field">
                  <select
                    name="courseId"
                    value={
                      examData.courseId
                    }
                    onChange={
                      handleExamChange
                    }
                  >
                    <option value="">
                      اختر الكورس
                    </option>

                    {courses.map(
                      (course) => (
                        <option
                          key={course.id}
                          value={course.id}
                        >
                          {course.title}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="form-field">
                  <select
                    name="lessonId"
                    value={
                      examData.lessonId
                    }
                    onChange={
                      handleExamChange
                    }
                  >
                    <option value="">
                      اختر المحاضرة
                    </option>

                    {availableLessons.map(
                      (lesson) => (
                        <option
                          key={lesson.id}
                          value={lesson.id}
                        >
                          {lesson.title}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="form-field">
                  <input
                    type="number"
                    name="totalScore"
                    min="1"
                    value={
                      examData.totalScore
                    }
                    onChange={
                      handleExamChange
                    }
                    placeholder="الدرجة النهائية"
                  />
                </div>

                <div className="form-field">
                  <input
                    type="number"
                    name="durationMinutes"
                    min="1"
                    value={
                      examData.durationMinutes
                    }
                    onChange={
                      handleExamChange
                    }
                    placeholder="مدة الامتحان بالدقائق"
                  />
                </div>
              </div>

              <label>
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={
                    examData.isPublished
                  }
                  onChange={
                    handleExamChange
                  }
                />

                إظهار الامتحان للطلاب
              </label>

              {message && (
                <div className="teacher-login-message error">
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="create-account-btn"
                disabled={isSaving}
              >
                {isSaving
                  ? "جاري الحفظ..."
                  : editingExamId
                    ? "حفظ التعديلات"
                    : "إضافة الامتحان"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Exams;