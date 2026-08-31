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
  FaUsers,
  FaUserGraduate,
  FaCheckCircle,
  FaTimesCircle,
  FaRedo,
} from "react-icons/fa";

import { db } from "./firebase";
import "./App.css";

/*
  =========================================================
  واجبات المنصة
  =========================================================
*/

const platformHomeworks = [
  {
    id: "third-month-lesson-1-homework",
    title: "واجب المحاضرة الأولى",
    courseId: "third-month-course",
    lessonId: "lesson-1",
    grade: "الثالث الثانوي",
    totalScore: 30,
    isPublished: true,
    isPlatformHomework: true,
  },
];

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

  const [
    firestoreHomeworks,
    setFirestoreHomeworks,
  ] = useState([]);

  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);

  const [activeTab, setActiveTab] =
    useState("students");

  const [searchText, setSearchText] =
    useState("");

  const [
    selectedCourseId,
    setSelectedCourseId,
  ] = useState("");

  const [
    studentSearchText,
    setStudentSearchText,
  ] = useState("");

  const [
    selectedGrade,
    setSelectedGrade,
  ] = useState("");

  const [
    selectedHomeworkId,
    setSelectedHomeworkId,
  ] = useState("");

  const [
    reopeningStudentId,
    setReopeningStudentId,
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

  /*
    =========================================================
    تحميل البيانات
    =========================================================
  */

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
                isPlatformHomework: false,
              })
            );

          setFirestoreHomeworks(
            homeworksData
          );

          setIsLoading(false);
          setMessage("");
        },

        (error) => {
          console.error(
            "Homeworks error:",
            error
          );

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
        },

        (error) => {
          console.error(
            "Courses error:",
            error
          );
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
        },

        (error) => {
          console.error(
            "Lessons error:",
            error
          );
        }
      );

    const unsubscribeStudents =
      onSnapshot(
        collection(db, "students"),

        (snapshot) => {
          const studentsData =
            snapshot.docs.map(
              (studentDocument) => ({
                uid: studentDocument.id,
                ...studentDocument.data(),
              })
            );

          setStudents(studentsData);
        },

        (error) => {
          console.error(
            "Students error:",
            error
          );
        }
      );

    return () => {
      unsubscribeHomeworks();
      unsubscribeCourses();
      unsubscribeLessons();
      unsubscribeStudents();
    };
  }, []);

  /*
    =========================================================
    دمج واجبات المنصة مع Firestore
    =========================================================
  */

  const homeworks =
    useMemo(() => {
      const map = new Map();

      platformHomeworks.forEach(
        (homework) => {
          map.set(
            homework.id,
            homework
          );
        }
      );

      firestoreHomeworks.forEach(
        (homework) => {
          map.set(
            homework.id,
            homework
          );
        }
      );

      return Array.from(
        map.values()
      );
    }, [firestoreHomeworks]);

  /*
    =========================================================
    Helpers
    =========================================================
  */

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function getCourseTitle(courseId) {
    const course =
      courses.find(
        (item) =>
          item.id === courseId
      );

    if (course?.title) {
      return course.title;
    }

    if (
      courseId ===
      "third-month-course"
    ) {
      return "كورس الشهر الثالث الثانوي";
    }

    return "كورس غير محدد";
  }

  function getLessonTitle(lessonId) {
    const lesson =
      lessons.find(
        (item) =>
          item.id === lessonId
      );

    if (lesson?.title) {
      return lesson.title;
    }

    if (lessonId === "lesson-1") {
      return "المحاضرة الأولى";
    }

    return "محاضرة غير محددة";
  }

  /*
    =========================================================
    الواجب المختار
    =========================================================
  */

  const selectedHomework =
    useMemo(() => {
      return (
        homeworks.find(
          (homework) =>
            homework.id ===
            selectedHomeworkId
        ) || null
      );
    }, [
      homeworks,
      selectedHomeworkId,
    ]);

  /*
    =========================================================
    الواجبات المناسبة للسنة
    =========================================================
  */

  const studentHomeworkOptions =
    useMemo(() => {
      return homeworks.filter(
        (homework) => {
          if (!selectedGrade) {
            return true;
          }

          if (homework.grade) {
            return (
              normalizeText(
                homework.grade
              ) ===
              normalizeText(
                selectedGrade
              )
            );
          }

          return true;
        }
      );
    }, [
      homeworks,
      selectedGrade,
    ]);

  useEffect(() => {
    if (!selectedHomeworkId) {
      return;
    }

    const exists =
      studentHomeworkOptions.some(
        (homework) =>
          homework.id ===
          selectedHomeworkId
      );

    if (!exists) {
      setSelectedHomeworkId("");
    }
  }, [
    studentHomeworkOptions,
    selectedHomeworkId,
  ]);

  /*
    =========================================================
    البحث الحقيقي عن الواجب داخل بيانات الطالب
    =========================================================
  */

  function getHomeworkTracking(
    student,
    homework
  ) {
    if (!student || !homework) {
      return {
        courseId:
          homework?.courseId || "",
        lessonId:
          homework?.lessonId || "",
        lessonProgress: {},
        result: null,
      };
    }

    const courseProgress =
      student.courseProgress &&
      typeof student.courseProgress ===
        "object"
        ? student.courseProgress
        : {};

    const results =
      Array.isArray(
        student.homeworkResults
      )
        ? student.homeworkResults
        : [];

    /*
      ==========================================
      أولاً:
      البحث داخل homeworkResults
      باستخدام homeworkId
      ==========================================
    */

    const exactResult =
      [...results]
        .reverse()
        .find((result) => {
          if (!result) {
            return false;
          }

          return (
            result.homeworkId ===
              homework.id ||
            result.id ===
              homework.id
          );
        });

    if (exactResult) {
      const resultCourseId =
        exactResult.courseId ||
        exactResult.courseID ||
        homework.courseId ||
        "";

      const resultLessonId =
        exactResult.lessonId ||
        exactResult.lessonID ||
        homework.lessonId ||
        "";

      const lessonProgress =
        courseProgress?.[
          resultCourseId
        ]?.lessons?.[
          resultLessonId
        ] || {};

      return {
        courseId:
          resultCourseId,
        lessonId:
          resultLessonId,
        lessonProgress,
        result: exactResult,
      };
    }

    /*
      ==========================================
      ثانياً:
      ندور على homeworkId داخل كل
      courseProgress
      ==========================================
    */

    for (const [
      courseId,
      courseData,
    ] of Object.entries(
      courseProgress
    )) {
      const lessonMap =
        courseData?.lessons &&
        typeof courseData.lessons ===
          "object"
          ? courseData.lessons
          : {};

      for (const [
        lessonId,
        lessonProgress,
      ] of Object.entries(
        lessonMap
      )) {
        if (
          lessonProgress?.homeworkId ===
          homework.id
        ) {
          const matchingResult =
            [...results]
              .reverse()
              .find(
                (result) =>
                  result?.homeworkId ===
                    homework.id ||
                  (
                    result?.courseId ===
                      courseId &&
                    result?.lessonId ===
                      lessonId
                  )
              ) || null;

          return {
            courseId,
            lessonId,
            lessonProgress:
              lessonProgress || {},
            result:
              matchingResult,
          };
        }
      }
    }

    /*
      ==========================================
      ثالثاً:
      courseId + lessonId
      ==========================================
    */

    const normalLessonProgress =
      courseProgress?.[
        homework.courseId
      ]?.lessons?.[
        homework.lessonId
      ] || {};

    const normalResult =
      [...results]
        .reverse()
        .find((result) => {
          if (!result) {
            return false;
          }

          const resultCourseId =
            result.courseId ||
            result.courseID ||
            "";

          const resultLessonId =
            result.lessonId ||
            result.lessonID ||
            "";

          return (
            resultCourseId ===
              homework.courseId &&
            resultLessonId ===
              homework.lessonId
          );
        }) || null;

    if (
      Object.keys(
        normalLessonProgress
      ).length > 0 ||
      normalResult
    ) {
      return {
        courseId:
          homework.courseId,
        lessonId:
          homework.lessonId,
        lessonProgress:
          normalLessonProgress,
        result:
          normalResult,
      };
    }

    /*
      ==========================================
      رابعاً:
      دعم البيانات القديمة باسم الواجب
      ==========================================
    */

    for (const [
      courseId,
      courseData,
    ] of Object.entries(
      courseProgress
    )) {
      const lessonMap =
        courseData?.lessons &&
        typeof courseData.lessons ===
          "object"
          ? courseData.lessons
          : {};

      for (const [
        lessonId,
        lessonProgress,
      ] of Object.entries(
        lessonMap
      )) {
        const sameTitle =
          normalizeText(
            lessonProgress?.homeworkTitle
          ) ===
          normalizeText(
            homework.title
          );

        if (sameTitle) {
          return {
            courseId,
            lessonId,
            lessonProgress:
              lessonProgress || {},
            result: null,
          };
        }
      }
    }

    /*
      ==========================================
      خامساً:
      لو فيه نتيجة بتقول إنها متسلمة
      لنفس المحاضرة حتى لو الـ ID قديم
      ==========================================
    */

    const possibleResult =
      [...results]
        .reverse()
        .find((result) => {
          if (!result) {
            return false;
          }

          const isSubmitted =
            result.submitted ===
              true ||
            result.completed ===
              true ||
            result.homeworkSubmitted ===
              true;

          if (!isSubmitted) {
            return false;
          }

          const resultLessonId =
            result.lessonId ||
            result.lessonID ||
            "";

          const resultCourseId =
            result.courseId ||
            result.courseID ||
            "";

          return (
            resultLessonId ===
              homework.lessonId &&
            (
              resultCourseId ===
                homework.courseId ||
              !resultCourseId
            )
          );
        }) || null;

    if (possibleResult) {
      return {
        courseId:
          possibleResult.courseId ||
          homework.courseId,
        lessonId:
          possibleResult.lessonId ||
          homework.lessonId,
        lessonProgress: {},
        result:
          possibleResult,
      };
    }

    return {
      courseId:
        homework.courseId,
      lessonId:
        homework.lessonId,
      lessonProgress: {},
      result: null,
    };
  }

  /*
    =========================================================
    حالة الطالب
    =========================================================
  */

  function getStudentHomeworkInfo(
    student,
    homework
  ) {
    if (!student || !homework) {
      return {
        submitted: false,
        score: null,
        totalScore: null,
        percentage: null,
        result: null,
        lessonProgress: {},
        actualCourseId: "",
        actualLessonId: "",
      };
    }

    const tracking =
      getHomeworkTracking(
        student,
        homework
      );

    const lessonProgress =
      tracking.lessonProgress ||
      {};

    const result =
      tracking.result || null;

    /*
      نفس العلامات اللي منصة الطالب
      بتحفظها عند التسليم
    */

    const submitted =
      lessonProgress.homeworkSubmitted ===
        true ||
      lessonProgress.homeworkCompleted ===
        true ||
      lessonProgress.homeworkDone ===
        true ||
      lessonProgress.homeworkSolutionUnlocked ===
        true ||
      result?.submitted === true ||
      result?.completed === true ||
      result?.homeworkSubmitted ===
        true;

    const score =
      lessonProgress.homeworkScore ??
      result?.score ??
      result?.studentScore ??
      result?.correctAnswers ??
      null;

    const totalScore =
      lessonProgress.homeworkTotal ??
      result?.total ??
      result?.totalScore ??
      homework.totalScore ??
      null;

    let percentage =
      lessonProgress.homeworkPercentage ??
      result?.percentage ??
      null;

    if (
      percentage === null &&
      score !== null &&
      totalScore !== null &&
      Number(totalScore) > 0
    ) {
      percentage =
        Math.round(
          (Number(score) /
            Number(totalScore)) *
            100
        );
    }

    return {
      submitted,
      score,
      totalScore,
      percentage,
      result,
      lessonProgress,

      actualCourseId:
        tracking.courseId ||
        homework.courseId,

      actualLessonId:
        tracking.lessonId ||
        homework.lessonId,
    };
  }

  /*
    =========================================================
    السنوات
    =========================================================
  */

  const grades =
    useMemo(() => {
      const studentGrades =
        students
          .map(
            (student) =>
              student.grade
          )
          .filter(Boolean);

      const homeworkGrades =
        platformHomeworks
          .map(
            (homework) =>
              homework.grade
          )
          .filter(Boolean);

      return [
        ...new Set([
          ...studentGrades,
          ...homeworkGrades,
        ]),
      ];
    }, [students]);

  /*
    =========================================================
    الطلاب الظاهرين
    =========================================================
  */

  const visibleStudents =
    useMemo(() => {
      const searchValue =
        normalizeText(
          studentSearchText
        );

      return students
        .filter((student) => {
          const name =
            normalizeText(
              student.fullName
            );

          const phone =
            normalizeText(
              student.studentPhone ||
                student.phone
            );

          const parentPhone =
            normalizeText(
              student.parentPhone
            );

          const matchesSearch =
            !searchValue ||
            name.includes(
              searchValue
            ) ||
            phone.includes(
              searchValue
            ) ||
            parentPhone.includes(
              searchValue
            );

          const matchesGrade =
            !selectedGrade ||
            normalizeText(
              student.grade
            ) ===
              normalizeText(
                selectedGrade
              );

          return (
            matchesSearch &&
            matchesGrade
          );
        })

        .sort(
          (first, second) =>
            String(
              first.fullName || ""
            ).localeCompare(
              String(
                second.fullName || ""
              ),
              "ar"
            )
        );
    }, [
      students,
      studentSearchText,
      selectedGrade,
    ]);

  /*
    =========================================================
    الإحصائيات
    =========================================================
  */

  const homeworkStatistics =
    useMemo(() => {
      if (!selectedHomework) {
        return {
          total:
            visibleStudents.length,
          submitted: 0,
          notSubmitted:
            visibleStudents.length,
        };
      }

      let submitted = 0;

      visibleStudents.forEach(
        (student) => {
          const info =
            getStudentHomeworkInfo(
              student,
              selectedHomework
            );

          if (info.submitted) {
            submitted += 1;
          }
        }
      );

      return {
        total:
          visibleStudents.length,

        submitted,

        notSubmitted:
          visibleStudents.length -
          submitted,
      };
    }, [
      visibleStudents,
      selectedHomework,
    ]);

  /*
    =========================================================
    إعادة فتح الواجب
    =========================================================
  */

  async function reopenHomeworkForStudent(
    student
  ) {
    if (
      !selectedHomework ||
      !student?.uid
    ) {
      return;
    }

    const info =
      getStudentHomeworkInfo(
        student,
        selectedHomework
      );

    if (!info.submitted) {
      window.alert(
        "الطالب لم يسلّم هذا الواجب حتى الآن."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `هل أنتِ متأكدة من إعادة فتح "${selectedHomework.title}" للطالب "${student.fullName || "الطالب"}"؟`
      );

    if (!confirmed) {
      return;
    }

    setReopeningStudentId(
      student.uid
    );

    try {
      const actualCourseId =
        info.actualCourseId ||
        selectedHomework.courseId;

      const actualLessonId =
        info.actualLessonId ||
        selectedHomework.lessonId;

      /*
        ==========================================
        ننسخ تقدم الطالب بالكامل
        ==========================================
      */

      const courseProgress = {
        ...(student.courseProgress ||
          {}),
      };

      const currentCourse = {
        ...(courseProgress[
          actualCourseId
        ] || {}),
      };

      const courseLessons = {
        ...(currentCourse.lessons ||
          {}),
      };

      const currentLessonProgress = {
        ...(courseLessons[
          actualLessonId
        ] || {}),
      };

      /*
        ==========================================
        نصفر بيانات الواجب فقط

        بنحافظ على:
        مشاهدة الفيديو
        نسبة المشاهدة
        تقدم المحاضرة
        تقدم الكورس
        ==========================================
      */

      courseLessons[
        actualLessonId
      ] = {
        ...currentLessonProgress,

        homeworkSubmitted:
          false,

        homeworkCompleted:
          false,

        homeworkDone:
          false,

        isHomeworkSubmitted:
          false,

        homeworkSolutionUnlocked:
          false,

        homeworkScore:
          null,

        homeworkTotal:
          null,

        homeworkPercentage:
          null,

        homeworkSubmittedAt:
          null,

        homeworkId:
          null,

        homeworkTitle:
          null,

        homeworkReopenedByTeacher:
          true,

        homeworkReopenedAt:
          new Date(),
      };

      currentCourse.lessons =
        courseLessons;

      courseProgress[
        actualCourseId
      ] = currentCourse;

      /*
        ==========================================
        نشيل نتيجة الواجب فقط
        ==========================================
      */

      const oldResults =
        Array.isArray(
          student.homeworkResults
        )
          ? student.homeworkResults
          : [];

      const newResults =
        oldResults.filter(
          (result) => {
            if (!result) {
              return true;
            }

            const resultCourseId =
              result.courseId ||
              result.courseID ||
              "";

            const resultLessonId =
              result.lessonId ||
              result.lessonID ||
              "";

            const sameHomeworkId =
              result.homeworkId ===
                selectedHomework.id ||
              result.id ===
                selectedHomework.id;

            const sameLocation =
              resultCourseId ===
                actualCourseId &&
              resultLessonId ===
                actualLessonId;

            return !(
              sameHomeworkId ||
              sameLocation
            );
          }
        );

      const updateData = {
        courseProgress,
        homeworkResults:
          newResults,
        updatedAt:
          serverTimestamp(),
      };

      /*
        لو عندنا عداد واجبات مكتملة
      */

      if (
        typeof student.completedHomeworks ===
        "number"
      ) {
        updateData.completedHomeworks =
          Math.max(
            0,
            student.completedHomeworks -
              1
          );
      }

      await updateDoc(
        doc(
          db,
          "students",
          student.uid
        ),
        updateData
      );

      window.alert(
        "تم إعادة فتح الواجب للطالب بنجاح."
      );
    } catch (error) {
      console.error(
        "Reopen homework error:",
        error
      );

      window.alert(
        "حدث خطأ أثناء إعادة فتح الواجب."
      );
    } finally {
      setReopeningStudentId(
        ""
      );
    }
  }

  /*
    =========================================================
    الواجبات في الإدارة
    =========================================================
  */

  const visibleHomeworks =
    useMemo(() => {
      const searchValue =
        normalizeText(
          searchText
        );

      return homeworks.filter(
        (homework) => {
          const matchesSearch =
            !searchValue ||
            normalizeText(
              homework.title
            ).includes(
              searchValue
            );

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

  /*
    =========================================================
    الفورم
    =========================================================
  */

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

        if (
          name === "courseId"
        ) {
          updatedData.lessonId =
            "";
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
    if (
      homework.isPlatformHomework
    ) {
      window.alert(
        "ده واجب موجود داخل كود منصة الطالب، وتعديله بيتم من ملف homeworkData في المنصة."
      );

      return;
    }

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
        homework.isPublished ===
        true,
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
      homeworkData.totalScore ===
        ""
    ) {
      setMessage(
        "من فضلك املئي جميع البيانات المطلوبة."
      );

      return;
    }

    const totalScore =
      Number(
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

    const course =
      courses.find(
        (item) =>
          item.id ===
          homeworkData.courseId
      );

    const lesson =
      lessons.find(
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
      if (
        editingHomeworkId
      ) {
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

  /*
    =========================================================
    إظهار وإخفاء
    =========================================================
  */

  async function toggleHomeworkVisibility(
    homework
  ) {
    if (
      homework.isPlatformHomework
    ) {
      window.alert(
        "ده واجب منصة أساسي، إظهاره أو إخفاؤه بيتم من كود منصة الطالب."
      );

      return;
    }

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

  /*
    =========================================================
    حذف
    =========================================================
  */

  async function handleDeleteHomework(
    homework
  ) {
    if (
      homework.isPlatformHomework
    ) {
      window.alert(
        "ده واجب موجود داخل منصة الطالب، مينفعش يتحذف من الداشبورد."
      );

      return;
    }

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

  /*
    =========================================================
    شكل الحالة
    =========================================================
  */

  function getStudentStatusStyle(
    submitted
  ) {
    if (submitted) {
      return {
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "7px 12px",
        borderRadius: "20px",
        background: "#e7f8ee",
        color: "#147347",
        fontWeight: "700",
        whiteSpace: "nowrap",
      };
    }

    return {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "7px 12px",
      borderRadius: "20px",
      background: "#fdeaea",
      color: "#b33131",
      fontWeight: "700",
      whiteSpace: "nowrap",
    };
  }

  /*
    =========================================================
    الصفحة
    =========================================================
  */

  return (
    <main className="admin-section-page">
      <div className="admin-section-container">

        {/* HEADER */}

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
                إدارة الواجبات ومتابعة
                تسليم الطلاب.
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
                openAddHomeworkForm
              }
            >
              <FaPlus />
              إضافة واجب
            </button>
          </div>
        </header>

        {/* TABS */}

        <section
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "25px",
          }}
        >
          <button
            type="button"
            className={
              activeTab === "students"
                ? "admin-primary-btn"
                : "admin-secondary-btn"
            }
            onClick={() =>
              setActiveTab(
                "students"
              )
            }
          >
            <FaUsers />
            متابعة الطلاب
          </button>

          <button
            type="button"
            className={
              activeTab === "homeworks"
                ? "admin-primary-btn"
                : "admin-secondary-btn"
            }
            onClick={() =>
              setActiveTab(
                "homeworks"
              )
            }
          >
            <FaTasks />
            إدارة الواجبات
          </button>
        </section>

        {/* =================================================
            متابعة الطلاب
        ================================================= */}

        {activeTab ===
          "students" && (
          <>
            <section className="admin-toolbar">

              <div className="admin-search-box">
                <FaSearch />

                <input
                  type="search"
                  value={
                    studentSearchText
                  }
                  onChange={(
                    event
                  ) =>
                    setStudentSearchText(
                      event.target.value
                    )
                  }
                  placeholder="ابحثي باسم الطالب أو رقم التليفون..."
                />
              </div>

              <div className="admin-filter-box">
                <FaUserGraduate />

                <select
                  value={
                    selectedGrade
                  }
                  onChange={(
                    event
                  ) =>
                    setSelectedGrade(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    كل السنوات
                  </option>

                  {grades.map(
                    (grade) => (
                      <option
                        key={grade}
                        value={grade}
                      >
                        {grade}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="admin-filter-box">
                <FaClipboardCheck />

                <select
                  value={
                    selectedHomeworkId
                  }
                  onChange={(
                    event
                  ) =>
                    setSelectedHomeworkId(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    اختاري الواجب
                  </option>

                  {studentHomeworkOptions.map(
                    (homework) => (
                      <option
                        key={
                          homework.id
                        }
                        value={
                          homework.id
                        }
                      >
                        {homework.title}
                      </option>
                    )
                  )}
                </select>
              </div>
            </section>

            {/* الإحصائيات */}

            <section
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "15px",
                margin: "20px 0 25px",
              }}
            >
              <div className="admin-total-box">
                <span>
                  عدد الطلاب
                </span>

                <strong>
                  {homeworkStatistics.total}
                </strong>
              </div>

              <div className="admin-total-box">
                <span>
                  تم التسليم
                </span>

                <strong
                  style={{
                    color: "#168754",
                  }}
                >
                  {homeworkStatistics.submitted}
                </strong>
              </div>

              <div className="admin-total-box">
                <span>
                  لم يسلّموا
                </span>

                <strong
                  style={{
                    color: "#c43838",
                  }}
                >
                  {homeworkStatistics.notSubmitted}
                </strong>
              </div>
            </section>

            {!selectedHomework ? (
              <section className="admin-data-empty">
                <div className="admin-data-empty-icon">
                  <FaClipboardCheck />
                </div>

                <h2>
                  اختاري الواجب
                </h2>

                <p>
                  اختاري السنة ثم الواجب
                  علشان تشوفي حالة كل
                  طالب.
                </p>
              </section>
            ) : visibleStudents.length ===
              0 ? (
              <section className="admin-data-empty">
                <div className="admin-data-empty-icon">
                  <FaUsers />
                </div>

                <h2>
                  لا يوجد طلاب
                </h2>
              </section>
            ) : (
              <>
                <div
                  style={{
                    padding: "16px 20px",
                    marginBottom: "20px",
                    background: "#ffffff",
                    border:
                      "1px solid #ececec",
                    borderRadius: "14px",
                  }}
                >
                  <strong>
                    {selectedHomework.title}
                  </strong>

                  <div
                    style={{
                      marginTop: "6px",
                      opacity: "0.75",
                    }}
                  >
                    {selectedHomework.grade ||
                      ""}

                    {selectedHomework.grade
                      ? " — "
                      : ""}

                    {getCourseTitle(
                      selectedHomework.courseId
                    )}

                    {" — "}

                    {getLessonTitle(
                      selectedHomework.lessonId
                    )}
                  </div>
                </div>

                <section className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>الطالب</th>
                        <th>السنة</th>
                        <th>رقم الطالب</th>
                        <th>الحالة</th>
                        <th>الدرجة</th>
                        <th>إعادة فتح</th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleStudents.map(
                        (student) => {
                          const info =
                            getStudentHomeworkInfo(
                              student,
                              selectedHomework
                            );

                          return (
                            <tr
                              key={
                                student.uid
                              }
                            >
                              <td>
                                <strong>
                                  {student.fullName ||
                                    "بدون اسم"}
                                </strong>
                              </td>

                              <td>
                                {student.grade ||
                                  "—"}
                              </td>

                              <td>
                                {student.studentPhone ||
                                  student.phone ||
                                  "—"}
                              </td>

                              <td>
                                <span
                                  style={getStudentStatusStyle(
                                    info.submitted
                                  )}
                                >
                                  {info.submitted ? (
                                    <>
                                      <FaCheckCircle />
                                      تم التسليم
                                    </>
                                  ) : (
                                    <>
                                      <FaTimesCircle />
                                      لم يسلّم
                                    </>
                                  )}
                                </span>
                              </td>

                              <td>
                                {info.submitted &&
                                info.score !==
                                  null ? (
                                  <strong>
                                    {info.score}

                                    {" / "}

                                    {info.totalScore ??
                                      "—"}

                                    {info.percentage !==
                                      null &&
                                      ` (${info.percentage}%)`}
                                  </strong>
                                ) : (
                                  "—"
                                )}
                              </td>

                              <td>
                                <button
                                  type="button"
                                  className="admin-icon-btn edit"
                                  disabled={
                                    !info.submitted ||
                                    reopeningStudentId ===
                                      student.uid
                                  }
                                  title={
                                    info.submitted
                                      ? "إعادة فتح الواجب"
                                      : "الطالب لم يسلّم الواجب"
                                  }
                                  onClick={() =>
                                    reopenHomeworkForStudent(
                                      student
                                    )
                                  }
                                >
                                  <FaRedo />
                                </button>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </section>
              </>
            )}
          </>
        )}

        {/* =================================================
            إدارة الواجبات
        ================================================= */}

        {activeTab ===
          "homeworks" && (
          <>
            <section className="admin-toolbar">
              <div className="admin-search-box">
                <FaSearch />

                <input
                  type="search"
                  value={searchText}
                  onChange={(
                    event
                  ) =>
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
                  value={
                    selectedCourseId
                  }
                  onChange={(
                    event
                  ) =>
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
                  لا توجد واجبات
                </h2>
              </section>
            ) : (
              <section className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>الواجب</th>
                      <th>السنة</th>
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
                        <tr
                          key={
                            homework.id
                          }
                        >
                          <td>
                            <strong>
                              {homework.title}
                            </strong>

                            {homework.isPlatformHomework && (
                              <div
                                style={{
                                  fontSize:
                                    "12px",
                                  marginTop:
                                    "4px",
                                  opacity:
                                    "0.65",
                                }}
                              >
                                واجب المنصة
                              </div>
                            )}
                          </td>

                          <td>
                            {homework.grade ||
                              "—"}
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
                            {homework.totalScore ??
                              "—"}
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

                              {!homework.isPlatformHomework && (
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
                              )}

                              {!homework.isPlatformHomework && (
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
                              )}

                              {!homework.isPlatformHomework && (
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
                              )}

                              {homework.isPlatformHomework && (
                                <span
                                  style={{
                                    fontSize:
                                      "13px",
                                    opacity:
                                      "0.7",
                                  }}
                                >
                                  من المنصة
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
          </>
        )}
      </div>

      {/* =================================================
          إضافة / تعديل
      ================================================= */}

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