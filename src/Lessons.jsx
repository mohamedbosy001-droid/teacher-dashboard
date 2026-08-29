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
  FaVideo,
  FaArrowRight,
  FaPlayCircle,
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

const initialLessonData = {
  title: "",
  description: "",
  courseId: "",
  videoUrl: "",
  homeworkVideoUrl: "",
  order: "",
  price: "",
  isPublished: false,
};

function Lessons() {
  const navigate = useNavigate();

  const [lessons, setLessons] = useState([]);
  const [courses, setCourses] = useState([]);

  const [searchText, setSearchText] = useState("");
  const [selectedCourseId, setSelectedCourseId] =
    useState("");

  const [showLessonForm, setShowLessonForm] =
    useState(false);

  const [lessonData, setLessonData] =
    useState(initialLessonData);

  const [editingLessonId, setEditingLessonId] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    const unsubscribeLessons = onSnapshot(
      collection(db, "lessons"),
      (snapshot) => {
        const lessonsData = snapshot.docs.map(
          (lessonDocument) => ({
            id: lessonDocument.id,
            ...lessonDocument.data(),
          })
        );

        setLessons(lessonsData);
        setIsLoading(false);
        setMessage("");
      },
      (error) => {
        console.error(error);

        setMessage(
          "حدث خطأ أثناء تحميل المحاضرات."
        );

        setIsLoading(false);
      }
    );

    const unsubscribeCourses = onSnapshot(
      collection(db, "courses"),
      (snapshot) => {
        const coursesData = snapshot.docs.map(
          (courseDocument) => ({
            id: courseDocument.id,
            ...courseDocument.data(),
          })
        );

        setCourses(coursesData);
      }
    );

    return () => {
      unsubscribeLessons();
      unsubscribeCourses();
    };
  }, []);

  const visibleLessons = useMemo(() => {
    const searchValue =
      searchText.trim().toLowerCase();

    return lessons
      .filter((lesson) => {
        const matchesSearch =
          !searchValue ||
          lesson.title
            ?.toLowerCase()
            .includes(searchValue);

        const matchesCourse =
          !selectedCourseId ||
          lesson.courseId === selectedCourseId;

        return (
          matchesSearch &&
          matchesCourse
        );
      })
      .sort(
        (firstLesson, secondLesson) =>
          Number(firstLesson.order || 0) -
          Number(secondLesson.order || 0)
      );
  }, [
    lessons,
    searchText,
    selectedCourseId,
  ]);

  function getCourseTitle(courseId) {
    const course = courses.find(
      (item) => item.id === courseId
    );

    return course?.title || "كورس غير محدد";
  }

  function handleLessonChange(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setLessonData((previousData) => ({
      ...previousData,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));

    setMessage("");
  }

  function openAddLessonForm() {
    setEditingLessonId(null);
    setLessonData(initialLessonData);
    setMessage("");
    setShowLessonForm(true);
  }

  function openEditLessonForm(lesson) {
    setEditingLessonId(lesson.id);

    setLessonData({
      title: lesson.title || "",
      description:
        lesson.description || "",
      courseId: lesson.courseId || "",
      videoUrl: lesson.videoUrl || "",
      homeworkVideoUrl:
        lesson.homeworkVideoUrl || "",
      order:
        lesson.order === undefined
          ? ""
          : String(lesson.order),
      price:
        lesson.price === undefined
          ? ""
          : String(lesson.price),
      isPublished:
        lesson.isPublished === true,
    });

    setMessage("");
    setShowLessonForm(true);
  }

  function closeLessonForm() {
    setShowLessonForm(false);
    setEditingLessonId(null);
    setLessonData(initialLessonData);
    setMessage("");
  }

  async function handleLessonSubmit(event) {
    event.preventDefault();

    if (
      !lessonData.title.trim() ||
      !lessonData.description.trim() ||
      !lessonData.courseId ||
      !lessonData.videoUrl.trim() ||
      lessonData.order === "" ||
      lessonData.price === ""
    ) {
      setMessage(
        "من فضلك املئي جميع البيانات المطلوبة."
      );

      return;
    }

    const order = Number(
      lessonData.order
    );

    const price = Number(
      lessonData.price
    );

    if (
      Number.isNaN(order) ||
      order < 1
    ) {
      setMessage(
        "ترتيب المحاضرة يجب أن يكون رقمًا أكبر من صفر."
      );

      return;
    }

    if (
      Number.isNaN(price) ||
      price < 0
    ) {
      setMessage(
        "من فضلك اكتبي سعرًا صحيحًا."
      );

      return;
    }

    setIsSaving(true);
    setMessage("");

    const course = courses.find(
      (item) =>
        item.id === lessonData.courseId
    );

    const lessonToSave = {
      title:
        lessonData.title.trim(),

      description:
        lessonData.description.trim(),

      courseId:
        lessonData.courseId,

      courseTitle:
        course?.title || "",

      videoUrl:
        lessonData.videoUrl.trim(),

      homeworkVideoUrl:
        lessonData.homeworkVideoUrl.trim(),

      order,
      price,

      isPublished:
        lessonData.isPublished,

      updatedAt:
        serverTimestamp(),
    };

    try {
      if (editingLessonId) {
        await updateDoc(
          doc(
            db,
            "lessons",
            editingLessonId
          ),
          lessonToSave
        );
      } else {
        await addDoc(
          collection(db, "lessons"),
          {
            ...lessonToSave,

            videoWatched: false,
            examCompleted: false,
            homeworkSubmitted: false,

            createdAt:
              serverTimestamp(),
          }
        );
      }

      closeLessonForm();
    } catch (error) {
      console.error(error);

      setMessage(
        "حدث خطأ أثناء حفظ المحاضرة."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleLessonVisibility(
    lesson
  ) {
    try {
      await updateDoc(
        doc(
          db,
          "lessons",
          lesson.id
        ),
        {
          isPublished:
            lesson.isPublished !== true,

          updatedAt:
            serverTimestamp(),
        }
      );
    } catch (error) {
      console.error(error);

      window.alert(
        "حدث خطأ أثناء تغيير حالة المحاضرة."
      );
    }
  }

  async function handleDeleteLesson(
    lesson
  ) {
    const confirmed =
      window.confirm(
        `هل أنتِ متأكدة من حذف المحاضرة "${lesson.title}"؟`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(
        doc(
          db,
          "lessons",
          lesson.id
        )
      );
    } catch (error) {
      console.error(error);

      window.alert(
        "حدث خطأ أثناء حذف المحاضرة."
      );
    }
  }

  return (
    <main className="admin-section-page">
      <div className="admin-section-container">
        <header className="admin-section-header">
          <div className="admin-section-title">
            <div className="admin-section-title-icon">
              <FaVideo />
            </div>

            <div>
              <span>
                لوحة تحكم المدرس
              </span>

              <h1>
                إدارة المحاضرات
              </h1>

              <p>
                إضافة المحاضرات وربطها
                بالكورسات.
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
              onClick={openAddLessonForm}
            >
              <FaPlus />
              إضافة محاضرة
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
              placeholder="ابحثي باسم المحاضرة..."
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

              {courses.map((course) => (
                <option
                  key={course.id}
                  value={course.id}
                >
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-total-box">
            <span>
              عدد المحاضرات
            </span>

            <strong>
              {lessons.length}
            </strong>
          </div>
        </section>

        {message &&
          !showLessonForm && (
            <div className="teacher-login-message error">
              {message}
            </div>
          )}

        {isLoading ? (
          <section className="admin-data-empty">
            <h2>
              جاري تحميل المحاضرات...
            </h2>
          </section>
        ) : visibleLessons.length === 0 ? (
          <section className="admin-data-empty">
            <div className="admin-data-empty-icon">
              <FaPlayCircle />
            </div>

            <h2>
              لا توجد محاضرات حتى الآن
            </h2>

            <p>
              أضيفي أول كورس، ثم ابدئي
              بإضافة المحاضرات الخاصة به.
            </p>

            <button
              type="button"
              className="admin-primary-btn"
              onClick={openAddLessonForm}
            >
              <FaPlus />
              إضافة أول محاضرة
            </button>
          </section>
        ) : (
          <section className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>الترتيب</th>
                  <th>المحاضرة</th>
                  <th>الكورس</th>
                  <th>السعر</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>

              <tbody>
                {visibleLessons.map(
                  (lesson) => (
                    <tr key={lesson.id}>
                      <td>
                        {lesson.order}
                      </td>

                      <td>
                        <div className="admin-course-cell">
                          <div className="admin-course-image">
                            <FaVideo />
                          </div>

                          <div>
                            <strong>
                              {lesson.title}
                            </strong>

                            <span>
                              {
                                lesson.description
                              }
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        {getCourseTitle(
                          lesson.courseId
                        )}
                      </td>

                      <td>
                        {Number(
                          lesson.price
                        ) === 0
                          ? "مجانية"
                          : `${lesson.price} جنيه`}
                      </td>

                      <td>
                        <span
                          className={`admin-status ${
                            lesson.isPublished
                              ? "published"
                              : "hidden"
                          }`}
                        >
                          {lesson.isPublished
                            ? "ظاهرة"
                            : "مخفية"}
                        </span>
                      </td>

                      <td>
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="admin-icon-btn view"
                            onClick={() =>
                              toggleLessonVisibility(
                                lesson
                              )
                            }
                          >
                            {lesson.isPublished ? (
                              <FaEyeSlash />
                            ) : (
                              <FaEye />
                            )}
                          </button>

                          <button
                            type="button"
                            className="admin-icon-btn edit"
                            onClick={() =>
                              openEditLessonForm(
                                lesson
                              )
                            }
                          >
                            <FaEdit />
                          </button>

                          <button
                            type="button"
                            className="admin-icon-btn delete"
                            onClick={() =>
                              handleDeleteLesson(
                                lesson
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

      {showLessonForm && (
        <div className="instructions-overlay">
          <div className="instructions-modal">
            <button
              type="button"
              onClick={closeLessonForm}
              aria-label="إغلاق"
            >
              <FaTimes />
            </button>

            <h2>
              {editingLessonId
                ? "تعديل المحاضرة"
                : "إضافة محاضرة جديدة"}
            </h2>

            <form
              className="register-form"
              onSubmit={handleLessonSubmit}
            >
              <div className="form-grid">
                <div className="form-field full-width-field">
                  <input
                    type="text"
                    name="title"
                    value={
                      lessonData.title
                    }
                    onChange={
                      handleLessonChange
                    }
                    placeholder="اسم المحاضرة"
                  />
                </div>

                <div className="form-field full-width-field">
                  <textarea
                    name="description"
                    value={
                      lessonData.description
                    }
                    onChange={
                      handleLessonChange
                    }
                    placeholder="وصف المحاضرة"
                    rows="4"
                  />
                </div>

                <div className="form-field full-width-field">
                  <select
                    name="courseId"
                    value={
                      lessonData.courseId
                    }
                    onChange={
                      handleLessonChange
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

                <div className="form-field full-width-field">
                  <input
                    type="url"
                    name="videoUrl"
                    value={
                      lessonData.videoUrl
                    }
                    onChange={
                      handleLessonChange
                    }
                    placeholder="رابط فيديو الشرح"
                  />
                </div>

                <div className="form-field full-width-field">
                  <input
                    type="url"
                    name="homeworkVideoUrl"
                    value={
                      lessonData.homeworkVideoUrl
                    }
                    onChange={
                      handleLessonChange
                    }
                    placeholder="رابط فيديو حل الواجب - اختياري"
                  />
                </div>

                <div className="form-field">
                  <input
                    type="number"
                    name="order"
                    min="1"
                    value={
                      lessonData.order
                    }
                    onChange={
                      handleLessonChange
                    }
                    placeholder="ترتيب المحاضرة"
                  />
                </div>

                <div className="form-field">
                  <input
                    type="number"
                    name="price"
                    min="0"
                    value={
                      lessonData.price
                    }
                    onChange={
                      handleLessonChange
                    }
                    placeholder="سعر المحاضرة"
                  />
                </div>
              </div>

              <label>
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={
                    lessonData.isPublished
                  }
                  onChange={
                    handleLessonChange
                  }
                />

                إظهار المحاضرة للطلاب
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
                  : editingLessonId
                  ? "حفظ التعديلات"
                  : "إضافة المحاضرة"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Lessons;