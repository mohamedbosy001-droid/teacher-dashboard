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
  FaKey,
  FaArrowRight,
  FaTicketAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaTimes,
  FaSearch,
  FaFilter,
  FaEye,
  FaEyeSlash,
  FaCopy,
} from "react-icons/fa";

import { db } from "./firebase";
import "./App.css";

const initialCodeData = {
  code: "",
  targetType: "course",
  courseId: "",
  lessonId: "",
  maxUses: "1",
  expiresAt: "",
  isActive: true,
};

function Codes() {
  const navigate = useNavigate();

  const [codes, setCodes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);

  const [searchText, setSearchText] =
    useState("");

  const [selectedTargetType, setSelectedTargetType] =
    useState("");

  const [showCodeForm, setShowCodeForm] =
    useState(false);

  const [codeData, setCodeData] =
    useState(initialCodeData);

  const [editingCodeId, setEditingCodeId] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    const unsubscribeCodes = onSnapshot(
      collection(db, "activationCodes"),
      (snapshot) => {
        const loadedCodes = snapshot.docs.map(
          (codeDocument) => ({
            id: codeDocument.id,
            ...codeDocument.data(),
          })
        );

        setCodes(loadedCodes);
        setIsLoading(false);
        setMessage("");
      },
      (error) => {
        console.error(
          "Codes loading error:",
          error
        );

        setMessage(
          "حدث خطأ أثناء تحميل أكواد التفعيل."
        );

        setIsLoading(false);
      }
    );

    const unsubscribeCourses = onSnapshot(
      collection(db, "courses"),
      (snapshot) => {
        setCourses(
          snapshot.docs.map(
            (courseDocument) => ({
              id: courseDocument.id,
              ...courseDocument.data(),
            })
          )
        );
      }
    );

    const unsubscribeLessons = onSnapshot(
      collection(db, "lessons"),
      (snapshot) => {
        setLessons(
          snapshot.docs.map(
            (lessonDocument) => ({
              id: lessonDocument.id,
              ...lessonDocument.data(),
            })
          )
        );
      }
    );

    return () => {
      unsubscribeCodes();
      unsubscribeCourses();
      unsubscribeLessons();
    };
  }, []);

  const visibleCodes = useMemo(() => {
    const searchValue =
      searchText.trim().toLowerCase();

    return codes.filter((activationCode) => {
      const matchesSearch =
        !searchValue ||
        activationCode.code
          ?.toLowerCase()
          .includes(searchValue) ||
        activationCode.targetTitle
          ?.toLowerCase()
          .includes(searchValue);

      const matchesType =
        !selectedTargetType ||
        activationCode.targetType ===
          selectedTargetType;

      return matchesSearch && matchesType;
    });
  }, [
    codes,
    searchText,
    selectedTargetType,
  ]);

  const availableLessons = lessons.filter(
    (lesson) =>
      !codeData.courseId ||
      lesson.courseId === codeData.courseId
  );

  function generateRandomCode() {
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const numbers = "23456789";

    let generatedCode = "OMAR-";

    for (let index = 0; index < 4; index += 1) {
      generatedCode +=
        letters[
          Math.floor(
            Math.random() * letters.length
          )
        ];
    }

    generatedCode += "-";

    for (let index = 0; index < 4; index += 1) {
      generatedCode +=
        numbers[
          Math.floor(
            Math.random() * numbers.length
          )
        ];
    }

    setCodeData((previousData) => ({
      ...previousData,
      code: generatedCode,
    }));
  }

  function handleCodeChange(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setCodeData((previousData) => {
      const updatedData = {
        ...previousData,
        [name]:
          type === "checkbox"
            ? checked
            : value,
      };

      if (name === "targetType") {
        updatedData.courseId = "";
        updatedData.lessonId = "";
      }

      if (name === "courseId") {
        updatedData.lessonId = "";
      }

      return updatedData;
    });

    setMessage("");
  }

  function openAddCodeForm() {
    setEditingCodeId(null);
    setCodeData(initialCodeData);
    setMessage("");
    setShowCodeForm(true);
  }

  function openEditCodeForm(activationCode) {
    setEditingCodeId(activationCode.id);

    setCodeData({
      code:
        activationCode.code || "",

      targetType:
        activationCode.targetType ||
        "course",

      courseId:
        activationCode.courseId || "",

      lessonId:
        activationCode.lessonId || "",

      maxUses:
        activationCode.maxUses === undefined
          ? "1"
          : String(
              activationCode.maxUses
            ),

      expiresAt:
        activationCode.expiresAt || "",

      isActive:
        activationCode.isActive !== false,
    });

    setMessage("");
    setShowCodeForm(true);
  }

  function closeCodeForm() {
    setShowCodeForm(false);
    setEditingCodeId(null);
    setCodeData(initialCodeData);
    setMessage("");
  }

  async function handleCodeSubmit(event) {
    event.preventDefault();

    const cleanCode =
      codeData.code.trim().toUpperCase();

    if (!cleanCode) {
      setMessage(
        "من فضلك اكتبي كود التفعيل أو اضغطي توليد كود."
      );
      return;
    }

    if (
      codeData.targetType === "course" &&
      !codeData.courseId
    ) {
      setMessage(
        "من فضلك اختاري الكورس."
      );
      return;
    }

    if (
      codeData.targetType === "lesson" &&
      (!codeData.courseId ||
        !codeData.lessonId)
    ) {
      setMessage(
        "من فضلك اختاري الكورس والمحاضرة."
      );
      return;
    }

    const maxUses = Number(
      codeData.maxUses
    );

    if (
      Number.isNaN(maxUses) ||
      maxUses < 1
    ) {
      setMessage(
        "عدد مرات الاستخدام يجب أن يكون 1 أو أكثر."
      );
      return;
    }

    const codeAlreadyExists = codes.some(
      (item) =>
        item.code?.toUpperCase() ===
          cleanCode &&
        item.id !== editingCodeId
    );

    if (codeAlreadyExists) {
      setMessage(
        "هذا الكود موجود بالفعل. استخدمي كودًا مختلفًا."
      );
      return;
    }

    const selectedCourse = courses.find(
      (course) =>
        course.id === codeData.courseId
    );

    const selectedLesson = lessons.find(
      (lesson) =>
        lesson.id === codeData.lessonId
    );

    const targetTitle =
      codeData.targetType === "course"
        ? selectedCourse?.title || ""
        : selectedLesson?.title || "";

    setIsSaving(true);
    setMessage("");

    const codeToSave = {
      code: cleanCode,

      targetType:
        codeData.targetType,

      courseId:
        codeData.courseId,

      courseTitle:
        selectedCourse?.title || "",

      lessonId:
        codeData.targetType === "lesson"
          ? codeData.lessonId
          : "",

      lessonTitle:
        codeData.targetType === "lesson"
          ? selectedLesson?.title || ""
          : "",

      targetTitle,

      maxUses,

      expiresAt:
        codeData.expiresAt || "",

      isActive:
        codeData.isActive,

      updatedAt:
        serverTimestamp(),
    };

    try {
      if (editingCodeId) {
        await updateDoc(
          doc(
            db,
            "activationCodes",
            editingCodeId
          ),
          codeToSave
        );
      } else {
        await addDoc(
          collection(
            db,
            "activationCodes"
          ),
          {
            ...codeToSave,

            usedCount: 0,
            usedBy: [],

            createdAt:
              serverTimestamp(),
          }
        );
      }

      closeCodeForm();
    } catch (error) {
      console.error(
        "Code saving error:",
        error
      );

      setMessage(
        "حدث خطأ أثناء حفظ كود التفعيل."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleCodeStatus(
    activationCode
  ) {
    try {
      await updateDoc(
        doc(
          db,
          "activationCodes",
          activationCode.id
        ),
        {
          isActive:
            activationCode.isActive ===
            false,

          updatedAt:
            serverTimestamp(),
        }
      );
    } catch (error) {
      console.error(error);

      window.alert(
        "حدث خطأ أثناء تغيير حالة الكود."
      );
    }
  }

  async function handleDeleteCode(
    activationCode
  ) {
    const confirmed = window.confirm(
      `هل أنتِ متأكدة من حذف الكود "${activationCode.code}"؟`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(
        doc(
          db,
          "activationCodes",
          activationCode.id
        )
      );
    } catch (error) {
      console.error(error);

      window.alert(
        "حدث خطأ أثناء حذف الكود."
      );
    }
  }

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(
        code
      );

      window.alert(
        "تم نسخ الكود بنجاح."
      );
    } catch {
      window.alert(
        `الكود هو: ${code}`
      );
    }
  }

  function getTargetTypeText(type) {
    return type === "lesson"
      ? "محاضرة"
      : "كورس";
  }

  return (
    <main className="admin-section-page">
      <div className="admin-section-container">
        <header className="admin-section-header">
          <div className="admin-section-title">
            <div className="admin-section-title-icon">
              <FaKey />
            </div>

            <div>
              <span>
                لوحة تحكم المدرس
              </span>

              <h1>أكواد التفعيل</h1>

              <p>
                إنشاء أكواد لتفعيل الكورسات
                أو المحاضرات للطلاب.
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
              onClick={openAddCodeForm}
            >
              <FaPlus />
              إنشاء كود
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
              placeholder="ابحثي بالكود أو اسم الكورس..."
            />
          </div>

          <div className="admin-filter-box">
            <FaFilter />

            <select
              value={selectedTargetType}
              onChange={(event) =>
                setSelectedTargetType(
                  event.target.value
                )
              }
            >
              <option value="">
                كل الأنواع
              </option>

              <option value="course">
                أكواد الكورسات
              </option>

              <option value="lesson">
                أكواد المحاضرات
              </option>
            </select>
          </div>

          <div className="admin-total-box">
            <span>عدد الأكواد</span>
            <strong>{codes.length}</strong>
          </div>
        </section>

        {message &&
          !showCodeForm && (
            <div className="teacher-login-message error">
              {message}
            </div>
          )}

        {isLoading ? (
          <section className="admin-data-empty">
            <h2>
              جاري تحميل الأكواد...
            </h2>
          </section>
        ) : visibleCodes.length === 0 ? (
          <section className="admin-data-empty">
            <div className="admin-data-empty-icon">
              <FaTicketAlt />
            </div>

            <h2>
              لا توجد أكواد حتى الآن
            </h2>

            <p>
              أنشئي أول كود لتفعيل كورس أو
              محاضرة للطلاب.
            </p>

            <button
              type="button"
              className="admin-primary-btn"
              onClick={openAddCodeForm}
            >
              <FaPlus />
              إنشاء أول كود
            </button>
          </section>
        ) : (
          <section className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>النوع</th>
                  <th>الكورس أو المحاضرة</th>
                  <th>الاستخدامات</th>
                  <th>تاريخ الانتهاء</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>

              <tbody>
                {visibleCodes.map(
                  (activationCode) => (
                    <tr
                      key={
                        activationCode.id
                      }
                    >
                      <td>
                        <strong>
                          {activationCode.code}
                        </strong>
                      </td>

                      <td>
                        {getTargetTypeText(
                          activationCode.targetType
                        )}
                      </td>

                      <td>
                        {activationCode.targetTitle ||
                          "غير محدد"}
                      </td>

                      <td>
                        {Number(
                          activationCode.usedCount ||
                            0
                        )}{" "}
                        من{" "}
                        {activationCode.maxUses ||
                          1}
                      </td>

                      <td>
                        {activationCode.expiresAt ||
                          "بدون تاريخ"}
                      </td>

                      <td>
                        <span
                          className={`admin-status ${
                            activationCode.isActive !==
                            false
                              ? "published"
                              : "hidden"
                          }`}
                        >
                          {activationCode.isActive !==
                          false
                            ? "فعال"
                            : "متوقف"}
                        </span>
                      </td>

                      <td>
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="admin-icon-btn view"
                            title="نسخ الكود"
                            onClick={() =>
                              copyCode(
                                activationCode.code
                              )
                            }
                          >
                            <FaCopy />
                          </button>

                          <button
                            type="button"
                            className="admin-icon-btn view"
                            title={
                              activationCode.isActive !==
                              false
                                ? "إيقاف الكود"
                                : "تشغيل الكود"
                            }
                            onClick={() =>
                              toggleCodeStatus(
                                activationCode
                              )
                            }
                          >
                            {activationCode.isActive !==
                            false ? (
                              <FaEyeSlash />
                            ) : (
                              <FaEye />
                            )}
                          </button>

                          <button
                            type="button"
                            className="admin-icon-btn edit"
                            title="تعديل الكود"
                            onClick={() =>
                              openEditCodeForm(
                                activationCode
                              )
                            }
                          >
                            <FaEdit />
                          </button>

                          <button
                            type="button"
                            className="admin-icon-btn delete"
                            title="حذف الكود"
                            onClick={() =>
                              handleDeleteCode(
                                activationCode
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

      {showCodeForm && (
        <div className="instructions-overlay">
          <div className="instructions-modal">
            <button
              type="button"
              onClick={closeCodeForm}
              aria-label="إغلاق"
            >
              <FaTimes />
            </button>

            <h2>
              {editingCodeId
                ? "تعديل كود التفعيل"
                : "إنشاء كود تفعيل"}
            </h2>

            <form
              className="register-form"
              onSubmit={handleCodeSubmit}
            >
              <div className="form-grid">
                <div className="form-field full-width-field">
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                    }}
                  >
                    <input
                      type="text"
                      name="code"
                      value={codeData.code}
                      onChange={
                        handleCodeChange
                      }
                      placeholder="كود التفعيل"
                    />

                    <button
                      type="button"
                      className="admin-primary-btn"
                      onClick={
                        generateRandomCode
                      }
                    >
                      توليد كود
                    </button>
                  </div>
                </div>

                <div className="form-field full-width-field">
                  <select
                    name="targetType"
                    value={
                      codeData.targetType
                    }
                    onChange={
                      handleCodeChange
                    }
                  >
                    <option value="course">
                      تفعيل كورس كامل
                    </option>

                    <option value="lesson">
                      تفعيل محاضرة واحدة
                    </option>
                  </select>
                </div>

                <div className="form-field full-width-field">
                  <select
                    name="courseId"
                    value={
                      codeData.courseId
                    }
                    onChange={
                      handleCodeChange
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

                {codeData.targetType ===
                  "lesson" && (
                  <div className="form-field full-width-field">
                    <select
                      name="lessonId"
                      value={
                        codeData.lessonId
                      }
                      onChange={
                        handleCodeChange
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
                )}

                <div className="form-field">
                  <input
                    type="number"
                    name="maxUses"
                    min="1"
                    value={
                      codeData.maxUses
                    }
                    onChange={
                      handleCodeChange
                    }
                    placeholder="عدد مرات الاستخدام"
                  />
                </div>

                <div className="form-field">
                  <input
                    type="date"
                    name="expiresAt"
                    value={
                      codeData.expiresAt
                    }
                    onChange={
                      handleCodeChange
                    }
                  />
                </div>
              </div>

              <label>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={
                    codeData.isActive
                  }
                  onChange={
                    handleCodeChange
                  }
                />

                الكود فعال
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
                  : editingCodeId
                    ? "حفظ التعديلات"
                    : "إنشاء الكود"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Codes;