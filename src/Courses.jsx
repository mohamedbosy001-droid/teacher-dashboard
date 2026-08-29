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
  FaBookOpen,
  FaPlus,
  FaSearch,
  FaFilter,
  FaEdit,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
  FaGraduationCap,
  FaTimes,
} from "react-icons/fa";

import { db } from "./firebase";
import "./App.css";

const initialCourseData = {
  title: "",
  description: "",
  grade: "",
  studentType: "",
  price: "",
  image: "",
  isPublished: false,
};

function Courses() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);

  const [searchText, setSearchText] =
    useState("");

  const [selectedGrade, setSelectedGrade] =
    useState("");

  const [
    selectedStudentType,
    setSelectedStudentType,
  ] = useState("");

  const [showCourseForm, setShowCourseForm] =
    useState(false);

  const [courseData, setCourseData] =
    useState(initialCourseData);

  const [editingCourseId, setEditingCourseId] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    const coursesReference = collection(
      db,
      "courses"
    );

    const unsubscribe = onSnapshot(
      coursesReference,
      (snapshot) => {
        const coursesData =
          snapshot.docs.map(
            (courseDocument) => ({
              id: courseDocument.id,
              ...courseDocument.data(),
            })
          );

        setCourses(coursesData);
        setIsLoading(false);
        setMessage("");
      },
      (error) => {
        console.error(error);

        setMessage(
          "حدث خطأ أثناء تحميل الكورسات."
        );

        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const visibleCourses = useMemo(() => {
    return courses.filter((course) => {
      const searchValue =
        searchText.trim().toLowerCase();

      const matchesSearch =
        !searchValue ||
        course.title
          ?.toLowerCase()
          .includes(searchValue);

      const matchesGrade =
        !selectedGrade ||
        course.grade === selectedGrade;

      const matchesStudentType =
        !selectedStudentType ||
        course.studentType ===
          selectedStudentType;

      return (
        matchesSearch &&
        matchesGrade &&
        matchesStudentType
      );
    });
  }, [
    courses,
    searchText,
    selectedGrade,
    selectedStudentType,
  ]);

  function getStudentTypeText(type) {
    if (type === "center") {
      return "طالب سنتر";
    }

    if (type === "online") {
      return "طالب أونلاين";
    }

    if (type === "both") {
      return "سنتر وأونلاين";
    }

    return "غير محدد";
  }

  function handleCourseChange(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setCourseData((previousData) => ({
      ...previousData,

      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));

    setMessage("");
  }

  function openAddCourseForm() {
    setEditingCourseId(null);

    setCourseData(
      initialCourseData
    );

    setMessage("");
    setShowCourseForm(true);
  }

  function openEditCourseForm(course) {
    setEditingCourseId(course.id);

    setCourseData({
      title:
        course.title || "",

      description:
        course.description || "",

      grade:
        course.grade || "",

      studentType:
        course.studentType || "",

      price:
        course.price === undefined
          ? ""
          : String(course.price),

      image:
        course.image || "",

      isPublished:
        course.isPublished === true,
    });

    setMessage("");
    setShowCourseForm(true);
  }

  function closeCourseForm() {
    setShowCourseForm(false);
    setEditingCourseId(null);

    setCourseData(
      initialCourseData
    );

    setMessage("");
  }

  async function handleCourseSubmit(
    event
  ) {
    event.preventDefault();

    if (
      !courseData.title.trim() ||
      !courseData.description.trim() ||
      !courseData.grade ||
      !courseData.studentType ||
      courseData.price === ""
    ) {
      setMessage(
        "من فضلك املئي جميع البيانات المطلوبة."
      );

      return;
    }

    const price = Number(
      courseData.price
    );

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

    const courseToSave = {
      title:
        courseData.title.trim(),

      description:
        courseData.description.trim(),

      grade:
        courseData.grade,

      studentType:
        courseData.studentType,

      price,

      image:
        courseData.image.trim(),

      isPublished:
        courseData.isPublished,

      updatedAt:
        serverTimestamp(),
    };

    try {
      if (editingCourseId) {
        await updateDoc(
          doc(
            db,
            "courses",
            editingCourseId
          ),
          courseToSave
        );
      } else {
        await addDoc(
          collection(
            db,
            "courses"
          ),
          {
            ...courseToSave,

            lessons: [],

            createdAt:
              serverTimestamp(),
          }
        );
      }

      closeCourseForm();
    } catch (error) {
      console.error(error);

      setMessage(
        "حدث خطأ أثناء حفظ الكورس."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleCourseVisibility(
    course
  ) {
    try {
      await updateDoc(
        doc(
          db,
          "courses",
          course.id
        ),
        {
          isPublished:
            course.isPublished !==
            true,

          updatedAt:
            serverTimestamp(),
        }
      );
    } catch (error) {
      console.error(error);

      window.alert(
        "حدث خطأ أثناء تغيير حالة الكورس."
      );
    }
  }

  async function handleDeleteCourse(
    course
  ) {
    const confirmed =
      window.confirm(
        `هل أنتِ متأكدة من حذف كورس "${course.title}"؟`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(
        doc(
          db,
          "courses",
          course.id
        )
      );
    } catch (error) {
      console.error(error);

      window.alert(
        "حدث خطأ أثناء حذف الكورس."
      );
    }
  }

  return (
    <main className="admin-section-page">
      <div className="admin-section-container">
        <header className="admin-section-header">
          <div className="admin-section-title">
            <div className="admin-section-title-icon">
              <FaBookOpen />
            </div>

            <div>
              <span>
                لوحة تحكم المدرس
              </span>

              <h1>
                إدارة الكورسات
              </h1>

              <p>
                إضافة وتعديل وإظهار
                وإخفاء الكورسات.
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

            <button
              type="button"
              className="admin-primary-btn"
              onClick={
                openAddCourseForm
              }
            >
              <FaPlus />
              إضافة كورس
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
              placeholder="ابحثي باسم الكورس..."
            />
          </div>

          <div className="admin-filter-box">
            <FaFilter />

            <select
              value={selectedGrade}
              onChange={(event) =>
                setSelectedGrade(
                  event.target.value
                )
              }
            >
              <option value="">
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
          </div>

          <div className="admin-filter-box">
            <FaFilter />

            <select
              value={
                selectedStudentType
              }
              onChange={(event) =>
                setSelectedStudentType(
                  event.target.value
                )
              }
            >
              <option value="">
                كل أنواع الطلاب
              </option>

              <option value="center">
                طالب سنتر
              </option>

              <option value="online">
                طالب أونلاين
              </option>

              <option value="both">
                سنتر وأونلاين
              </option>
            </select>
          </div>

          <div className="admin-total-box">
            <span>
              عدد الكورسات
            </span>

            <strong>
              {courses.length}
            </strong>
          </div>
        </section>

        {message &&
          !showCourseForm && (
            <div className="teacher-login-message error">
              {message}
            </div>
          )}

        {isLoading ? (
          <section className="admin-data-empty">
            <h2>
              جاري تحميل الكورسات...
            </h2>
          </section>
        ) : visibleCourses.length ===
          0 ? (
          <section className="admin-data-empty">
            <div className="admin-data-empty-icon">
              <FaGraduationCap />
            </div>

            <h2>
              لا توجد كورسات حتى الآن
            </h2>

            <p>
              اضغطي على إضافة كورس
              لإنشاء أول كورس.
            </p>

            <button
              type="button"
              className="admin-primary-btn"
              onClick={
                openAddCourseForm
              }
            >
              <FaPlus />
              إضافة أول كورس
            </button>
          </section>
        ) : (
          <section className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>
                    الكورس
                  </th>

                  <th>
                    الصف
                  </th>

                  <th>
                    نوع الطالب
                  </th>

                  <th>
                    السعر
                  </th>

                  <th>
                    الحالة
                  </th>

                  <th>
                    الإجراءات
                  </th>
                </tr>
              </thead>

              <tbody>
                {visibleCourses.map(
                  (course) => (
                    <tr
                      key={
                        course.id
                      }
                    >
                      <td>
                        <div className="admin-course-cell">
                          <div className="admin-course-image">
                            {course.image ? (
                              <img
                                src={
                                  course.image
                                }
                                alt={
                                  course.title
                                }
                              />
                            ) : (
                              <FaBookOpen />
                            )}
                          </div>

                          <div>
                            <strong>
                              {
                                course.title
                              }
                            </strong>

                            <span>
                              {
                                course.description
                              }
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        {course.grade}
                      </td>

                      <td>
                        {getStudentTypeText(
                          course.studentType
                        )}
                      </td>

                      <td>
                        {Number(
                          course.price
                        ) === 0
                          ? "مجاني"
                          : `${course.price} جنيه`}
                      </td>

                      <td>
                        <span
                          className={`admin-status ${
                            course.isPublished
                              ? "published"
                              : "hidden"
                          }`}
                        >
                          {course.isPublished
                            ? "ظاهر"
                            : "مخفي"}
                        </span>
                      </td>

                      <td>
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="admin-icon-btn view"
                            title={
                              course.isPublished
                                ? "إخفاء الكورس"
                                : "إظهار الكورس"
                            }
                            onClick={() =>
                              toggleCourseVisibility(
                                course
                              )
                            }
                          >
                            {course.isPublished ? (
                              <FaEyeSlash />
                            ) : (
                              <FaEye />
                            )}
                          </button>

                          <button
                            type="button"
                            className="admin-icon-btn edit"
                            title="تعديل الكورس"
                            onClick={() =>
                              openEditCourseForm(
                                course
                              )
                            }
                          >
                            <FaEdit />
                          </button>

                          <button
                            type="button"
                            className="admin-icon-btn delete"
                            title="حذف الكورس"
                            onClick={() =>
                              handleDeleteCourse(
                                course
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

      {showCourseForm && (
        <div className="instructions-overlay">
          <div className="instructions-modal">
            <button
              type="button"
              onClick={
                closeCourseForm
              }
              aria-label="إغلاق"
            >
              <FaTimes />
            </button>

            <h2>
              {editingCourseId
                ? "تعديل الكورس"
                : "إضافة كورس جديد"}
            </h2>

            <form
              className="register-form"
              onSubmit={
                handleCourseSubmit
              }
            >
              <div className="form-grid">
                <div className="form-field full-width-field">
                  <input
                    type="text"
                    name="title"
                    value={
                      courseData.title
                    }
                    onChange={
                      handleCourseChange
                    }
                    placeholder="اسم الكورس"
                  />
                </div>

                <div className="form-field full-width-field">
                  <textarea
                    name="description"
                    value={
                      courseData.description
                    }
                    onChange={
                      handleCourseChange
                    }
                    placeholder="وصف الكورس"
                    rows="4"
                  />
                </div>

                <div className="form-field">
                  <select
                    name="grade"
                    value={
                      courseData.grade
                    }
                    onChange={
                      handleCourseChange
                    }
                  >
                    <option value="">
                      اختر الصف
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
                </div>

                <div className="form-field">
                  <select
                    name="studentType"
                    value={
                      courseData.studentType
                    }
                    onChange={
                      handleCourseChange
                    }
                  >
                    <option value="">
                      اختر نوع الطالب
                    </option>

                    <option value="center">
                      طالب سنتر
                    </option>

                    <option value="online">
                      طالب أونلاين
                    </option>

                    <option value="both">
                      سنتر وأونلاين
                    </option>
                  </select>
                </div>

                <div className="form-field">
                  <input
                    type="number"
                    name="price"
                    min="0"
                    value={
                      courseData.price
                    }
                    onChange={
                      handleCourseChange
                    }
                    placeholder="السعر"
                  />
                </div>

                <div className="form-field">
                  <input
                    type="text"
                    name="image"
                    value={
                      courseData.image
                    }
                    onChange={
                      handleCourseChange
                    }
                    placeholder="رابط صورة الكورس"
                  />
                </div>
              </div>

              <label>
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={
                    courseData.isPublished
                  }
                  onChange={
                    handleCourseChange
                  }
                />

                إظهار الكورس للطلاب
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
                  : editingCourseId
                  ? "حفظ التعديلات"
                  : "إضافة الكورس"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Courses;