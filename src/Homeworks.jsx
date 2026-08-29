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
  FaClipboardCheck,
  FaArrowRight,
  FaTasks,
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

const initialHomeworkData = {
  title: "",
  description: "",
  courseId: "",
  lessonId: "",
  submissionUrl: "",
  totalScore: "",
  isPublished: false,
};

function Homeworks() {
  const navigate = useNavigate();

  const [homeworks, setHomeworks] =
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
    showHomeworkForm,
    setShowHomeworkForm,
  ] = useState(false);

  const [
    homeworkData,
    setHomeworkData,
  ] = useState(initialHomeworkData);

  const [
    editingHomeworkId,
    setEditingHomeworkId,
  ] = useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    const unsubscribeHomeworks =
      onSnapshot(
        collection(db, "homeworks"),
        (snapshot) => {
          const homeworksData =
            snapshot.docs.map(
              (homeworkDocument) => ({
                id: homeworkDocument.id,
                ...homeworkDocument.data(),
              })
            );

          setHomeworks(homeworksData);
          setIsLoading(false);
          setMessage("");
        },
        (error) => {
          console.error(error);

          setMessage(
            "حدث خطأ أثناء تحميل الواجبات."
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
      unsubscribeHomeworks();
      unsubscribeCourses();
      unsubscribeLessons();
    };
  }, []);

  const visibleHomeworks =
    useMemo(() => {
      const searchValue =
        searchText.trim().toLowerCase();

      return homeworks.filter(
        (homework) => {
          const matchesSearch =
            !searchValue ||
            homework.title
              ?.toLowerCase()
              .includes(searchValue);

          const matchesCourse =
            !selectedCourseId ||
            homework.courseId ===
              selectedCourseId;

          return (
            matchesSearch &&
            matchesCourse
          );
        }
      );
    }, [
      homeworks,
      searchText,
      selectedCourseId,
    ]);

  const availableLessons =
    lessons.filter(
      (lesson) =>
        !homeworkData.courseId ||
        lesson.courseId ===
          homeworkData.courseId
    );

  function getCourseTitle(courseId) {
    const course = courses.find(
      (item) => item.id === courseId
    );

    return (
      course?.title ||
      "كورس غير محدد"
    );
  }

  function getLessonTitle(lessonId) {
    const lesson = lessons.find(
      (item) => item.id === lessonId
    );

    return (
      lesson?.title ||
      "محاضرة غير محددة"
    );
  }

  function handleHomeworkChange(
    event
  ) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setHomeworkData(
      (previousData) => {
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
      }
    );

    setMessage("");
  }

  function openAddHomeworkForm() {
    setEditingHomeworkId(null);

    setHomeworkData(
      initialHomeworkData
    );

    setMessage("");
    setShowHomeworkForm(true);
  }

  function openEditHomeworkForm(
    homework
  ) {
    setEditingHomeworkId(
      homework.id
    );

    setHomeworkData({
      title:
        homework.title || "",

      description:
        homework.description || "",

      courseId:
        homework.courseId || "",

      lessonId:
        homework.lessonId || "",

      submissionUrl:
        homework.submissionUrl || "",

      totalScore:
        homework.totalScore ===
        undefined
          ? ""
          : String(
              homework.totalScore
            ),

      isPublished:
        homework.isPublished === true,
    });

    setMessage("");
    setShowHomeworkForm(true);
  }

  function closeHomeworkForm() {
    setShowHomeworkForm(false);
    setEditingHomeworkId(null);

    setHomeworkData(
      initialHomeworkData
    );

    setMessage("");
  }

  async function handleHomeworkSubmit(
    event
  ) {
    event.preventDefault();

    if (
      !homeworkData.title.trim() ||
      !homeworkData.description.trim() ||
      !homeworkData.courseId ||
      !homeworkData.lessonId ||
      homeworkData.totalScore === ""
    ) {
      setMessage(
        "من فضلك املئي جميع البيانات المطلوبة."
      );

      return;
    }

    const totalScore = Number(
      homeworkData.totalScore
    );

    if (
      Number.isNaN(totalScore) ||
      totalScore <= 0
    ) {
      setMessage(
        "درجة الواجب يجب أن تكون أكبر من صفر."
      );

      return;
    }

    setIsSaving(true);
    setMessage("");

    const course = courses.find(
      (item) =>
        item.id ===
        homeworkData.courseId
    );

    const lesson = lessons.find(
      (item) =>
        item.id ===
        homeworkData.lessonId
    );

    const homeworkToSave = {
      title:
        homeworkData.title.trim(),

      description:
        homeworkData.description.trim(),

      courseId:
        homeworkData.courseId,

      courseTitle:
        course?.title || "",

      lessonId:
        homeworkData.lessonId,

      lessonTitle:
        lesson?.title || "",

      submissionUrl:
        homeworkData.submissionUrl.trim(),

      totalScore,

      isPublished:
        homeworkData.isPublished,

      updatedAt:
        serverTimestamp(),
    };

    try {
      if (editingHomeworkId) {
        await updateDoc(
          doc(
            db,
            "homeworks",
            editingHomeworkId
          ),
          homeworkToSave
        );
      } else {
        await addDoc(
          collection(
            db,
            "homeworks"
          ),
          {
            ...homeworkToSave,

            createdAt:
              serverTimestamp(),
          }
        );
      }

      closeHomeworkForm();
    } catch (error) {
      console.error(error);

      setMessage(
        "حدث خطأ أثناء حفظ الواجب."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleHomeworkVisibility(
    homework
  ) {
    try {
      await updateDoc(
        doc(
          db,
          "homeworks",
          homework.id
        ),
        {
          isPublished:
            homework.isPublished !==
            true,

          updatedAt:
            serverTimestamp(),
        }
      );
    } catch (error) {
      console.error(error);

      window.alert(
        "حدث خطأ أثناء تغيير حالة الواجب."
      );
    }
  }

  async function handleDeleteHomework(
    homework
  ) {
    const confirmed =
      window.confirm(
        `هل أنتِ متأكدة من حذف الواجب "${homework.title}"؟`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(
        doc(
          db,
          "homeworks",
          homework.id
        )
      );
    } catch (error) {
      console.error(error);

      window.alert(
        "حدث خطأ أثناء حذف الواجب."
      );
    }
  }

  return (
    <main className="admin-section-page">
      <div className="admin-section-container">
        <header className="admin-section-header">
          <div className="admin-section-title">
            <div className="admin-section-title-icon">
              <FaClipboardCheck />
            </div>

            <div>
              <span>
                لوحة تحكم المدرس
              </span>

              <h1>
                إدارة الواجبات
              </h1>

              <p>
                إضافة الواجبات وربطها
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
              onClick={
                openAddHomeworkForm
              }
            >
              <FaPlus />
              إضافة واجب
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
              placeholder="ابحثي باسم الواجب..."
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
              عدد الواجبات
            </span>

            <strong>
              {homeworks.length}
            </strong>
          </div>
        </section>

        {message &&
          !showHomeworkForm && (
            <div className="teacher-login-message error">
              {message}
            </div>
          )}

        {isLoading ? (
          <section className="admin-data-empty">
            <h2>
              جاري تحميل الواجبات...
            </h2>
          </section>
        ) : visibleHomeworks.length ===
          0 ? (
          <section className="admin-data-empty">
            <div className="admin-data-empty-icon">
              <FaTasks />
            </div>

            <h2>
              لا توجد واجبات حتى الآن
            </h2>

            <p>
              أضيفي أول واجب واربطِيه
              بمحاضرة.
            </p>

            <button
              type="button"
              className="admin-primary-btn"
              onClick={
                openAddHomeworkForm
              }
            >
              <FaPlus />
              إضافة أول واجب
            </button>
          </section>
        ) : (
          <section className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>الواجب</th>
                  <th>الكورس</th>
                  <th>المحاضرة</th>
                  <th>الدرجة</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>

              <tbody>
                {visibleHomeworks.map(
                  (homework) => (
                    <tr key={homework.id}>
                      <td>
                        <strong>
                          {homework.title}
                        </strong>
                      </td>

                      <td>
                        {getCourseTitle(
                          homework.courseId
                        )}
                      </td>

                      <td>
                        {getLessonTitle(
                          homework.lessonId
                        )}
                      </td>

                      <td>
                        {
                          homework.totalScore
                        }
                      </td>

                      <td>
                        <span
                          className={`admin-status ${
                            homework.isPublished
                              ? "published"
                              : "hidden"
                          }`}
                        >
                          {homework.isPublished
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
                              toggleHomeworkVisibility(
                                homework
                              )
                            }
                          >
                            {homework.isPublished ? (
                              <FaEyeSlash />
                            ) : (
                              <FaEye />
                            )}
                          </button>

                          <button
                            type="button"
                            className="admin-icon-btn edit"
                            onClick={() =>
                              openEditHomeworkForm(
                                homework
                              )
                            }
                          >
                            <FaEdit />
                          </button>

                          <button
                            type="button"
                            className="admin-icon-btn delete"
                            onClick={() =>
                              handleDeleteHomework(
                                homework
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

      {showHomeworkForm && (
        <div className="instructions-overlay">
          <div className="instructions-modal">
            <button
              type="button"
              onClick={
                closeHomeworkForm
              }
              aria-label="إغلاق"
            >
              <FaTimes />
            </button>

            <h2>
              {editingHomeworkId
                ? "تعديل الواجب"
                : "إضافة واجب جديد"}
            </h2>

            <form
              className="register-form"
              onSubmit={
                handleHomeworkSubmit
              }
            >
              <div className="form-grid">
                <div className="form-field full-width-field">
                  <input
                    type="text"
                    name="title"
                    value={
                      homeworkData.title
                    }
                    onChange={
                      handleHomeworkChange
                    }
                    placeholder="اسم الواجب"
                  />
                </div>

                <div className="form-field full-width-field">
                  <textarea
                    name="description"
                    value={
                      homeworkData.description
                    }
                    onChange={
                      handleHomeworkChange
                    }
                    placeholder="وصف الواجب"
                    rows="4"
                  />
                </div>

                <div className="form-field">
                  <select
                    name="courseId"
                    value={
                      homeworkData.courseId
                    }
                    onChange={
                      handleHomeworkChange
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
                      homeworkData.lessonId
                    }
                    onChange={
                      handleHomeworkChange
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
                      homeworkData.totalScore
                    }
                    onChange={
                      handleHomeworkChange
                    }
                    placeholder="الدرجة النهائية"
                  />
                </div>

                <div className="form-field">
                  <input
                    type="url"
                    name="submissionUrl"
                    value={
                      homeworkData.submissionUrl
                    }
                    onChange={
                      handleHomeworkChange
                    }
                    placeholder="رابط الواجب - اختياري"
                  />
                </div>
              </div>

              <label>
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={
                    homeworkData.isPublished
                  }
                  onChange={
                    handleHomeworkChange
                  }
                />

                إظهار الواجب للطلاب
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
                  : editingHomeworkId
                  ? "حفظ التعديلات"
                  : "إضافة الواجب"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Homeworks;