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

import platformHomeworkData from "./pages/homeworkData";

import "./App.css";

/*

  =========================================================

  واجبات المنصة

  المصدر الأساسي هنا هو homeworkData.js

  أي واجب يتضاف في homeworkData

  هيظهر تلقائيًا في لوحة المدرس.

  واجب المحاضرة الأولى القديم

  كان بيتحفظ عند بعض الطلاب باسم:

  homework-1

  =========================================================

*/

const LEGACY_HOMEWORK_IDS = {

  "third-month-lesson-1-homework": [

    "homework-1",

  ],

  "third-month-lesson-2-homework": [

    "third-homework-2",

  ],


};

/*

  تحويل homeworkData

  إلى شكل مناسب للداشبورد

*/

const platformHomeworks =

  Object.values(

    platformHomeworkData || {}

  ).map((homework) => {

    const questions =

      Array.isArray(

        homework.questions

      )

        ? homework.questions

        : [];

    /*

      السؤال الملغي لا يدخل

      في الدرجة النهائية.

    */

    const totalScore =

      questions.filter(

        (question) =>

          question?.cancelled !== true

      ).length;

    return {

      ...homework,

      id: homework.id,

      legacyHomeworkIds:

        LEGACY_HOMEWORK_IDS[

          homework.id

        ] || [],

      title:

        homework.title ||

        "واجب بدون اسم",

      courseId:

        homework.courseId || "",

      lessonId:

        homework.lessonId || "",

      grade:

        homework.grade || "",

      totalScore,

      isPublished: true,

      isPlatformHomework: true,

      questions,

    };

  });

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

  const [courses, setCourses] =

    useState([]);

  const [lessons, setLessons] =

    useState([]);

  const [students, setStudents] =

    useState([]);

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

  /*

    بيانات فورم إضافة الواجب

  */

  const [

    homeworkFormData,

    setHomeworkFormData,

  ] = useState(

    initialHomeworkData

  );

  const [

    editingHomeworkId,

    setEditingHomeworkId,

  ] = useState(null);

  /*

    الطالب المفتوح في التفاصيل

  */

  const [

    selectedStudentDetails,

    setSelectedStudentDetails,

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

                isPlatformHomework:

                  false,

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

                uid:

                  studentDocument.id,

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

    Helpers

    =========================================================

  */

  function normalizeText(value) {

    return String(value || "")

      .trim()

      .toLowerCase();

  }

  /*

    توحيد أسماء السنوات

    مثال:

    الصف الثالث الثانوي

    الثالث الثانوي

    الاتنين يبقوا:

    الثالث الثانوي

  */

  function normalizeGrade(value) {

    const text =

      String(value || "")

        .trim()

        .replace(/^الصف\s+/u, "");

    if (

      text.includes("الأول") ||

      text.includes("الاول") ||

      text.includes("أولى") ||

      text.includes("اولى")

    ) {

      return "الأول الثانوي";

    }

    if (

      text.includes("الثاني") ||

      text.includes("الثانى") ||

      text.includes("تاني") ||

      text.includes("تانية")

    ) {

      return "الثاني الثانوي";

    }

    if (

      text.includes("الثالث") ||

      text.includes("تالت") ||

      text.includes("تالتة")

    ) {

      return "الثالث الثانوي";

    }

    return text;

  }

  /*

    =========================================================

    كل IDs الخاصة بالواجب

    =========================================================

  */

  function getHomeworkIds(homework) {

    if (!homework) {

      return [];

    }

    const ids = [

      homework.id,

      homework.legacyHomeworkId,

    ];

    if (

      Array.isArray(

        homework.legacyHomeworkIds

      )

    ) {

      ids.push(

        ...homework.legacyHomeworkIds

      );

    }

    return [

      ...new Set(

        ids.filter(Boolean)

      ),

    ];

  }

  function isSameHomeworkId(

    savedId,

    homework

  ) {

    if (

      !savedId ||

      !homework

    ) {

      return false;

    }

    return getHomeworkIds(

      homework

    ).includes(savedId);

  }

  /*

    =========================================================

    دمج واجبات المنصة و Firestore

    مهم:

    لو فيه واجب Firestore لنفس

    الكورس + المحاضرة الموجودة

    أصلًا في homeworkData

    مش هنظهره مرتين.

    =========================================================

  */

  const homeworks =

    useMemo(() => {

      const result = [];

      /*

        نضيف واجبات homeworkData أولًا

      */

      platformHomeworks.forEach(

        (homework) => {

          result.push(homework);

        }

      );

      /*

        واجبات Firestore

        لو نفس ID أو نفس

        courseId + lessonId

        لواجب منصة موجود

        نتجاهله حتى لا يتكرر.

      */

      firestoreHomeworks.forEach(

        (firestoreHomework) => {

          const duplicate =

            result.some(

              (existingHomework) => {

                if (

                  existingHomework.id ===

                  firestoreHomework.id

                ) {

                  return true;

                }

                if (

                  existingHomework

                    .isPlatformHomework &&

                  existingHomework

                    .courseId &&

                  existingHomework

                    .lessonId &&

                  firestoreHomework

                    .courseId &&

                  firestoreHomework

                    .lessonId &&

                  existingHomework

                    .courseId ===

                    firestoreHomework

                      .courseId &&

                  existingHomework

                    .lessonId ===

                    firestoreHomework

                      .lessonId

                ) {

                  return true;

                }

                return false;

              }

            );

          if (!duplicate) {

            result.push(

              firestoreHomework

            );

          }

        }

      );

      return result;

    }, [firestoreHomeworks]);

  /*

    =========================================================

    اسم الكورس

    =========================================================

  */

  function getCourseTitle(

    courseId

  ) {

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

    if (

      courseId ===

      "third-term-course"

    ) {

      return "كورس الترم الثالث الثانوي";

    }

    if (

      courseId ===

      "second-month-course"

    ) {

      return "كورس الشهر الثاني الثانوي";

    }

    if (

      courseId ===

      "second-term-course"

    ) {

      return "كورس الترم الثاني الثانوي";

    }

    if (

      courseId ===

      "first-month-course"

    ) {

      return "كورس الشهر الأول الثانوي";

    }

    if (

      courseId ===

      "first-term-course"

    ) {

      return "كورس الترم الأول الثانوي";

    }

    return "كورس غير محدد";

  }

  /*

    =========================================================

    اسم المحاضرة

    =========================================================

  */

  function getLessonTitle(

    lessonId,

    courseId = ""

  ) {

    /*

      الأول ندور في lessons collection

    */

    const lesson =

      lessons.find(

        (item) =>

          item.id === lessonId &&

          (

            !courseId ||

            !item.courseId ||

            item.courseId ===

              courseId

          )

      );

    if (lesson?.title) {

      return lesson.title;

    }

    /*

      بعدها ندور جوه الكورس

    */

    const course =

      courses.find(

        (item) =>

          item.id === courseId

      );

    if (

      Array.isArray(

        course?.lessons

      )

    ) {

      const nestedLesson =

        course.lessons.find(

          (item) =>

            item?.id === lessonId

        );

      if (

        nestedLesson?.title

      ) {

        return nestedLesson.title;

      }

    }

    /*

      fallback

    */

    if (

      lessonId === "lesson-1"

    ) {

      return "المحاضرة الأولى";

    }

    if (

      lessonId === "lesson-2"

    ) {

      return "المحاضرة الثانية";

    }

    if (

      lessonId === "lesson-3"

    ) {

      return "المحاضرة الثالثة";

    }

    if (

      lessonId === "lesson-4"

    ) {

      return "المحاضرة الرابعة";

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

              normalizeGrade(

                homework.grade

              ) ===

              normalizeGrade(

                selectedGrade

              )

            );

          }

          /*

            لو واجب Firestore

            ومفيهوش grade

            نشوف السنة من الكورس

          */

          const course =

            courses.find(

              (item) =>

                item.id ===

                homework.courseId

            );

          if (course?.grade) {

            return (

              normalizeGrade(

                course.grade

              ) ===

              normalizeGrade(

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

      courses,

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

    البحث داخل homeworkAttempts

    =========================================================

  */

  function getHomeworkAttempt(

    student,

    homework

  ) {

    if (

      !student ||

      !homework

    ) {

      return {

        attempt: null,

        attemptId: "",

      };

    }

    const attempts =

      student.homeworkAttempts &&

      typeof student.homeworkAttempts ===

        "object"

        ? student.homeworkAttempts

        : {};

    const homeworkIds =

      getHomeworkIds(homework);

    /*

      أولًا:

      Map key نفسه

    */

    for (

      const homeworkId

      of homeworkIds

    ) {

      if (

        attempts[

          homeworkId

        ]

      ) {

        return {

          attempt:

            attempts[

              homeworkId

            ],

          attemptId:

            homeworkId,

        };

      }

    }

    /*

      ثانيًا:

      نبحث داخل بيانات المحاولة

    */

    for (

      const [

        attemptKey,

        attemptData,

      ]

      of Object.entries(

        attempts

      )

    ) {

      if (

        isSameHomeworkId(

          attemptData?.homeworkId,

          homework

        ) ||

        isSameHomeworkId(

          attemptData?.id,

          homework

        )

      ) {

        return {

          attempt:

            attemptData,

          attemptId:

            attemptKey,

        };

      }

      /*

        دعم البيانات الجديدة

        courseId + lessonId

      */

      if (

        attemptData?.courseId ===

          homework.courseId &&

        attemptData?.lessonId ===

          homework.lessonId

      ) {

        return {

          attempt:

            attemptData,

          attemptId:

            attemptKey,

        };

      }

    }

    return {

      attempt: null,

      attemptId: "",

    };

  }

  /*

    =========================================================

    البحث داخل homeworkResults

    =========================================================

  */

  function getHomeworkResult(

    student,

    homework

  ) {

    if (

      !student ||

      !homework

    ) {

      return null;

    }

    const results =

      Array.isArray(

        student.homeworkResults

      )

        ? student.homeworkResults

        : [];

    /*

      البحث بالـ ID

    */

    const byHomeworkId =

      [...results]

        .reverse()

        .find(

          (result) => {

            if (!result) {

              return false;

            }

            return (

              isSameHomeworkId(

                result.homeworkId,

                homework

              ) ||

              isSameHomeworkId(

                result.id,

                homework

              )

            );

          }

        );

    if (byHomeworkId) {

      return byHomeworkId;

    }

    /*

      البحث بالكورس والمحاضرة

    */

    const byCourseAndLesson =

      [...results]

        .reverse()

        .find(

          (result) => {

            if (!result) {

              return false;

            }

            return (

              result.courseId ===

                homework.courseId &&

              result.lessonId ===

                homework.lessonId

            );

          }

        );

    return (

      byCourseAndLesson ||

      null

    );

  }

  /*

    =========================================================

    Progress

    =========================================================

  */

  function getLessonProgress(

    student,

    homework

  ) {

    if (

      !student ||

      !homework

    ) {

      return {

        progress: {},

        courseId:

          homework?.courseId ||

          "",

        lessonId:

          homework?.lessonId ||

          "",

      };

    }

    const courseProgress =

      student.courseProgress &&

      typeof student.courseProgress ===

        "object"

        ? student.courseProgress

        : {};

    /*

      المكان الطبيعي

    */

    const normalProgress =

      courseProgress?.[

        homework.courseId

      ]?.lessons?.[

        homework.lessonId

      ];

    if (normalProgress) {

      return {

        progress:

          normalProgress,

        courseId:

          homework.courseId,

        lessonId:

          homework.lessonId,

      };

    }

    /*

      البحث داخل كل Progress

      بالـ homeworkId

    */

    for (

      const [

        courseId,

        courseData,

      ]

      of Object.entries(

        courseProgress

      )

    ) {

      const lessonMap =

        courseData?.lessons &&

        typeof courseData.lessons ===

          "object"

          ? courseData.lessons

          : {};

      for (

        const [

          lessonId,

          lessonProgress,

        ]

        of Object.entries(

          lessonMap

        )

      ) {

        if (

          isSameHomeworkId(

            lessonProgress?.homeworkId,

            homework

          )

        ) {

          return {

            progress:

              lessonProgress ||

              {},

            courseId,

            lessonId,

          };

        }

      }

    }

    return {

      progress: {},

      courseId:

        homework.courseId,

      lessonId:

        homework.lessonId,

    };

  }

  /*

    =========================================================

    حالة الطالب في الواجب

    =========================================================

  */

  function getStudentHomeworkInfo(

    student,

    homework

  ) {

    if (

      !student ||

      !homework

    ) {

      return {

        submitted: false,

        score: null,

        totalScore: null,

        percentage: null,

        result: null,

        attempt: null,

        attemptId: "",

        lessonProgress: {},

        actualCourseId: "",

        actualLessonId: "",

      };

    }

    const {

      attempt,

      attemptId,

    } = getHomeworkAttempt(

      student,

      homework

    );

    const result =

      getHomeworkResult(

        student,

        homework

      );

    const progressData =

      getLessonProgress(

        student,

        homework

      );

    const lessonProgress =

      progressData.progress ||

      {};

    /*

      هل الطالب سلّم؟

    */

    const submitted =

      attempt?.completed === true ||

      attempt?.submitted === true ||

      attempt?.result?.completed ===

        true ||

      result?.completed === true ||

      result?.submitted === true ||

      result?.homeworkSubmitted ===

        true ||

      lessonProgress.homeworkSubmitted ===

        true ||

      lessonProgress.homeworkCompleted ===

        true ||

      lessonProgress.homeworkDone ===

        true ||

      lessonProgress.homeworkSolutionUnlocked ===

        true;

    /*

      الدرجة

    */

    const score =

      attempt?.result?.score ??

      attempt?.score ??

      result?.score ??

      result?.studentScore ??

      result?.correctAnswers ??

      lessonProgress.homeworkScore ??

      null;

    /*

      إجمالي الدرجة

    */

    const totalScore =

      attempt?.result?.totalQuestions ??

      attempt?.result?.total ??

      attempt?.totalQuestions ??

      result?.totalQuestions ??

      result?.total ??

      result?.totalScore ??

      lessonProgress.homeworkTotal ??

      homework.totalScore ??

      null;

    /*

      النسبة

    */

    let percentage =

      attempt?.result?.percentage ??

      attempt?.percentage ??

      result?.percentage ??

      lessonProgress.homeworkPercentage ??

      null;

    if (

      percentage === null &&

      score !== null &&

      totalScore !== null &&

      Number(totalScore) > 0

    ) {

      percentage =

        Math.round(

          (

            Number(score) /

            Number(totalScore)

          ) *

            100

        );

    }

    return {

      submitted,

      score,

      totalScore,

      percentage,

      result,

      attempt,

      attemptId,

      lessonProgress,

      actualCourseId:

        progressData.courseId ||

        homework.courseId,

      actualLessonId:

        progressData.lessonId ||

        homework.lessonId,

    };

  }

  /*

    =========================================================

    تفاصيل إجابات الطالب

    =========================================================

  */

  function getHomeworkQuestions(

    homework

  ) {

    if (!homework) {

      return [];

    }

    /*

      الواجب الأساسي من homeworkData

    */

    const source =

      platformHomeworkData?.[

        homework.id

      ];

    if (

      Array.isArray(

        source?.questions

      )

    ) {

      return source.questions;

    }

    if (

      Array.isArray(

        homework.questions

      )

    ) {

      return homework.questions;

    }

    return [];

  }

  /*

    قيمة الإجابة من أي شكل محفوظ

  */

  function getAnswerValue(

    answer

  ) {

    if (

      answer === undefined ||

      answer === null

    ) {

      return null;

    }

    if (

      typeof answer !==

      "object"

    ) {

      return answer;

    }

    return (

      answer.studentAnswer ??

      answer.selectedAnswer ??

      answer.selectedOption ??

      answer.selected ??

      answer.answer ??

      answer.value ??

      answer.option ??

      answer.optionIndex ??

      answer.choice ??

      null

    );

  }

  /*

    نبحث عن إجابة السؤال

    في reviewedAnswers

  */

  function findReviewedAnswer(

    reviewedAnswers,

    question,

    questionIndex

  ) {

    if (

      !Array.isArray(

        reviewedAnswers

      )

    ) {

      return null;

    }

    /*

      أولًا بالـ questionId

    */

    const byId =

      reviewedAnswers.find(

        (item) =>

          item?.questionId ===

            question.id ||

          item?.id ===

            question.id

      );

    if (byId) {

      return byId;

    }

    /*

      بعدها برقم السؤال

    */

    const byNumber =

      reviewedAnswers.find(

        (item) =>

          Number(

            item?.questionNumber

          ) ===

          questionIndex + 1

      );

    if (byNumber) {

      return byNumber;

    }

    /*

      بعدها questionIndex

    */

    const byIndex =

      reviewedAnswers.find(

        (item) =>

          Number(

            item?.questionIndex

          ) === questionIndex

      );

    if (byIndex) {

      return byIndex;

    }

    /*

      fallback بنفس ترتيب الأسئلة

    */

    return (

      reviewedAnswers[

        questionIndex

      ] || null

    );

  }

  /*

    استخراج إجابة الطالب

  */

  function getSavedAnswer(

    info,

    question,

    questionIndex

  ) {

    /*

      =================================================

      1) reviewedAnswers

      =================================================

    */

    const reviewedSources = [

      info.result

        ?.reviewedAnswers,

      info.attempt?.result

        ?.reviewedAnswers,

      info.attempt

        ?.reviewedAnswers,

    ];

    for (

      const reviewedAnswers

      of reviewedSources

    ) {

      const reviewed =

        findReviewedAnswer(

          reviewedAnswers,

          question,

          questionIndex

        );

      if (reviewed) {

        const value =

          getAnswerValue(

            reviewed

          );

        if (

          value !== null &&

          value !== undefined

        ) {

          return {

            value,

            savedIsCorrect:

              typeof reviewed.isCorrect ===

              "boolean"

                ? reviewed.isCorrect

                : typeof reviewed.correct ===

                    "boolean"

                  ? reviewed.correct

                  : null,

          };

        }

      }

    }

    /*

      =================================================

      2) answers

      =================================================

    */

    const answerSources = [

      info.attempt?.answers,

      info.result?.answers,

      info.attempt?.result

        ?.answers,

    ];

    for (

      const answers

      of answerSources

    ) {

      if (!answers) {

        continue;

      }

      /*

        Array

      */

      if (

        Array.isArray(

          answers

        )

      ) {

        const raw =

          answers[

            questionIndex

          ];

        if (

          raw !== undefined &&

          raw !== null

        ) {

          return {

            value:

              getAnswerValue(

                raw

              ),

            savedIsCorrect:

              typeof raw?.isCorrect ===

              "boolean"

                ? raw.isCorrect

                : null,

          };

        }

        continue;

      }

      /*

        Object

      */

      if (

        typeof answers ===

        "object"

      ) {

        const possibleKeys = [

          question.id,

          `q${

            questionIndex + 1

          }`,

          String(

            questionIndex + 1

          ),

          String(

            questionIndex

          ),

        ];

        for (

          const key

          of possibleKeys

        ) {

          if (

            Object.prototype.hasOwnProperty.call(

              answers,

              key

            )

          ) {

            const raw =

              answers[key];

            return {

              value:

                getAnswerValue(

                  raw

                ),

              savedIsCorrect:

                typeof raw?.isCorrect ===

                "boolean"

                  ? raw.isCorrect

                  : null,

            };

          }

        }

      }

    }

    return {

      value: null,

      savedIsCorrect: null,

    };

  }

  /*

    تحويل إجابة الطالب

    من رقم الاختيار إلى النص

  */

  function formatStudentAnswer(

    rawAnswer,

    question

  ) {

    if (

      rawAnswer === null ||

      rawAnswer === undefined ||

      rawAnswer === ""

    ) {

      return "لم يجب";

    }

    const options =

      Array.isArray(

        question?.options

      )

        ? question.options

        : [];

    /*

      لو الرقم Number

    */

    if (

      typeof rawAnswer ===

        "number" &&

      options[

        rawAnswer

      ] !== undefined

    ) {

      return options[

        rawAnswer

      ];

    }

    /*

      لو الرقم String

      مثال "2"

    */

    if (

      typeof rawAnswer ===

        "string" &&

      /^\d+$/.test(

        rawAnswer.trim()

      )

    ) {

      const index =

        Number(

          rawAnswer.trim()

        );

      if (

        options[

          index

        ] !== undefined

      ) {

        return options[

          index

        ];

      }

    }

    /*

      لو أ / ب / ج / د

    */

    const answerLetters = [

      "أ",

      "ب",

      "ج",

      "د",

    ];

    const letterIndex =

      answerLetters.indexOf(

        String(

          rawAnswer

        ).trim()

      );

    if (

      letterIndex !== -1 &&

      options[

        letterIndex

      ] !== undefined

    ) {

      return options[

        letterIndex

      ];

    }

    return String(

      rawAnswer

    );

  }

  /*

    الإجابة الصحيحة

  */

  function getCorrectAnswerText(

    question

  ) {

    if (

      question?.cancelled ===

      true

    ) {

      return "السؤال ملغي";

    }

    const correctAnswer =

      question?.correctAnswer;

    if (

      correctAnswer ===

        undefined ||

      correctAnswer === null

    ) {

      return "—";

    }

    if (

      Array.isArray(

        question.options

      ) &&

      question.options[

        correctAnswer

      ] !== undefined

    ) {

      return question.options[

        correctAnswer

      ];

    }

    return String(

      correctAnswer

    );

  }

  /*

    هل الإجابة صح؟

  */

  function isStudentAnswerCorrect(

    rawAnswer,

    question,

    savedIsCorrect

  ) {

    if (

      question?.cancelled ===

      true

    ) {

      return true;

    }

    /*

      لو النظام حافظ

      isCorrect نستعمله

    */

    if (

      typeof savedIsCorrect ===

      "boolean"

    ) {

      return savedIsCorrect;

    }

    if (

      rawAnswer === null ||

      rawAnswer === undefined ||

      rawAnswer === ""

    ) {

      return false;

    }

    const correctIndex =

      question.correctAnswer;

    /*

      لو الإجابة رقم

    */

    if (

      typeof rawAnswer ===

        "number"

    ) {

      return (

        Number(rawAnswer) ===

        Number(correctIndex)

      );

    }

    /*

      لو الرقم كنص

    */

    if (

      typeof rawAnswer ===

        "string" &&

      /^\d+$/.test(

        rawAnswer.trim()

      )

    ) {

      return (

        Number(

          rawAnswer.trim()

        ) ===

        Number(correctIndex)

      );

    }

    /*

      مقارنة نص الاختيار

    */

    const studentAnswer =

      normalizeText(

        formatStudentAnswer(

          rawAnswer,

          question

        )

      );

    const correctAnswer =

      normalizeText(

        getCorrectAnswerText(

          question

        )

      );

    return (

      studentAnswer ===

      correctAnswer

    );

  }

  /*

    تجهيز تفاصيل كل الأسئلة

  */

  function getStudentAnswerDetails(

    student,

    homework

  ) {

    const info =

      getStudentHomeworkInfo(

        student,

        homework

      );

    const questions =

      getHomeworkQuestions(

        homework

      );

    return questions.map(

      (

        question,

        questionIndex

      ) => {

        const savedAnswer =

          getSavedAnswer(

            info,

            question,

            questionIndex

          );

        const isCorrect =

          isStudentAnswerCorrect(

            savedAnswer.value,

            question,

            savedAnswer.savedIsCorrect

          );

        return {

          id:

            question.id ||

            `q${

              questionIndex + 1

            }`,

          number:

            questionIndex + 1,

          question:

            question.question ||

            `السؤال ${

              questionIndex + 1

            }`,

          studentAnswer:

            formatStudentAnswer(

              savedAnswer.value,

              question

            ),

          correctAnswer:

            getCorrectAnswerText(

              question

            ),

          isCorrect,

          cancelled:

            question.cancelled ===

            true,

        };

      }

    );

  }

  /*

    فتح التفاصيل

  */

  function openStudentDetails(

    student

  ) {

    if (!selectedHomework) {

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

    const answers =

      getStudentAnswerDetails(

        student,

        selectedHomework

      );

    setSelectedStudentDetails({

      student,

      homework:

        selectedHomework,

      info,

      answers,

    });

  }

  function closeStudentDetails() {

    setSelectedStudentDetails(

      null

    );

  }

  /*

    =========================================================

    السنوات

    بنوحّد السنة قبل إضافة Set

    علشان الثالث الثانوي

    ما يظهرش مرتين.

    =========================================================

  */

  const grades =

    useMemo(() => {

      const studentGrades =

        students

          .map(

            (student) =>

              normalizeGrade(

                student.grade

              )

          )

          .filter(Boolean);

      const homeworkGrades =

        homeworks

          .map(

            (homework) =>

              normalizeGrade(

                homework.grade

              )

          )

          .filter(Boolean);

      return [

        ...new Set([

          ...studentGrades,

          ...homeworkGrades,

        ]),

      ];

    }, [

      students,

      homeworks,

    ]);

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

        .filter(

          (student) => {

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

              normalizeGrade(

                student.grade

              ) ===

                normalizeGrade(

                  selectedGrade

                );

            return (

              matchesSearch &&

              matchesGrade

            );

          }

        )

        .sort(

          (

            first,

            second

          ) =>

            String(

              first.fullName ||

                ""

            ).localeCompare(

              String(

                second.fullName ||

                  ""

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

      /*

        =================================================

        1) courseProgress

        =================================================

      */

      const courseProgress = {

        ...(student.courseProgress ||

          {}),

      };

      const actualCourseId =

        info.actualCourseId ||

        selectedHomework.courseId;

      const actualLessonId =

        info.actualLessonId ||

        selectedHomework.lessonId;

      if (

        courseProgress?.[

          actualCourseId

        ]

      ) {

        const currentCourse = {

          ...courseProgress[

            actualCourseId

          ],

        };

        const courseLessons = {

          ...(currentCourse.lessons ||

            {}),

        };

        if (

          courseLessons[

            actualLessonId

          ]

        ) {

          const currentLesson = {

            ...courseLessons[

              actualLessonId

            ],

          };

          courseLessons[

            actualLessonId

          ] = {

            ...currentLesson,

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

        }

      }

      /*

        =================================================

        2) homeworkResults

        =================================================

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

            const sameHomework =

              isSameHomeworkId(

                result.homeworkId,

                selectedHomework

              ) ||

              isSameHomeworkId(

                result.id,

                selectedHomework

              );

            const sameCourseAndLesson =

              result.courseId ===

                selectedHomework.courseId &&

              result.lessonId ===

                selectedHomework.lessonId;

            return !(

              sameHomework ||

              sameCourseAndLesson

            );

          }

        );

      /*

        =================================================

        3) homeworkAttempts

        =================================================

      */

      const homeworkAttempts = {

        ...(student.homeworkAttempts ||

          {}),

      };

      const attemptId =

        info.attemptId ||

        getHomeworkIds(

          selectedHomework

        )[0] ||

        selectedHomework.id;

      if (

        attemptId &&

        homeworkAttempts[

          attemptId

        ]

      ) {

        const oldAttempt = {

          ...homeworkAttempts[

            attemptId

          ],

        };

        homeworkAttempts[

          attemptId

        ] = {

          ...oldAttempt,

          completed: false,

          submitted: false,

          completedAt: null,

          submittedAt: null,

          result: null,

          answers: {},

          currentQuestionIndex: 0,

          reopenedByTeacher:

            true,

          reopenedAt:

            new Date(),

          updatedAt:

            new Date(),

        };

      }

      const updateData = {

        courseProgress,

        homeworkResults:

          newResults,

        homeworkAttempts,

        updatedAt:

          serverTimestamp(),

      };

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

    الواجبات في تبويب الإدارة

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

  /*

    =========================================================

    المحاضرات المتاحة في فورم الإضافة

    =========================================================

  */

  const availableLessons =

    lessons.filter(

      (lesson) =>

        !homeworkFormData.courseId ||

        lesson.courseId ===

          homeworkFormData.courseId

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

    setHomeworkFormData(

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

    setHomeworkFormData(

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

    setHomeworkFormData({

      title:

        homework.title || "",

      description:

        homework.description ||

        "",

      courseId:

        homework.courseId ||

        "",

      lessonId:

        homework.lessonId ||

        "",

      submissionUrl:

        homework.submissionUrl ||

        "",

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

    setHomeworkFormData(

      initialHomeworkData

    );

    setMessage("");

  }

  async function handleHomeworkSubmit(

    event

  ) {

    event.preventDefault();

    if (

      !homeworkFormData.title.trim() ||

      !homeworkFormData.description.trim() ||

      !homeworkFormData.courseId ||

      !homeworkFormData.lessonId ||

      homeworkFormData.totalScore ===

        ""

    ) {

      setMessage(

        "من فضلك املئي جميع البيانات المطلوبة."

      );

      return;

    }

    const totalScore =

      Number(

        homeworkFormData.totalScore

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

          homeworkFormData.courseId

      );

    const lesson =

      lessons.find(

        (item) =>

          item.id ===

          homeworkFormData.lessonId

      );

    const homeworkToSave = {

      title:

        homeworkFormData.title.trim(),

      description:

        homeworkFormData.description.trim(),

      courseId:

        homeworkFormData.courseId,

      courseTitle:

        course?.title || "",

      grade:

        course?.grade || "",

      lessonId:

        homeworkFormData.lessonId,

      lessonTitle:

        lesson?.title || "",

      submissionUrl:

        homeworkFormData.submissionUrl.trim(),

      totalScore,

      isPublished:

        homeworkFormData.isPublished,

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

            marginBottom:

              "25px",

          }}

        >

          <button

            type="button"

            className={

              activeTab ===

              "students"

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

              activeTab ===

              "homeworks"

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

                        {

                          homework.title

                        }

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

                margin:

                  "20px 0 25px",

              }}

            >

              <div className="admin-total-box">

                <span>

                  عدد الطلاب

                </span>

                <strong>

                  {

                    homeworkStatistics.total

                  }

                </strong>

              </div>

              <div className="admin-total-box">

                <span>

                  تم التسليم

                </span>

                <strong

                  style={{

                    color:

                      "#168754",

                  }}

                >

                  {

                    homeworkStatistics.submitted

                  }

                </strong>

              </div>

              <div className="admin-total-box">

                <span>

                  لم يسلّموا

                </span>

                <strong

                  style={{

                    color:

                      "#c43838",

                  }}

                >

                  {

                    homeworkStatistics.notSubmitted

                  }

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

                  اختاري السنة ثم

                  الواجب علشان تشوفي

                  حالة كل طالب.

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

                    padding:

                      "16px 20px",

                    marginBottom:

                      "20px",

                    background:

                      "#ffffff",

                    border:

                      "1px solid #ececec",

                    borderRadius:

                      "14px",

                  }}

                >

                  <strong>

                    {

                      selectedHomework.title

                    }

                  </strong>

                  <div

                    style={{

                      marginTop:

                        "6px",

                      opacity:

                        "0.75",

                    }}

                  >

                    {normalizeGrade(

                      selectedHomework.grade

                    )}

                    {selectedHomework.grade

                      ? " — "

                      : ""}

                    {getCourseTitle(

                      selectedHomework.courseId

                    )}

                    {" — "}

                    {getLessonTitle(

                      selectedHomework.lessonId,

                      selectedHomework.courseId

                    )}

                  </div>

                </div>

                <section className="admin-table-wrapper">

                  <table className="admin-table">

                    <thead>

                      <tr>

                        <th>

                          الطالب

                        </th>

                        <th>

                          السنة

                        </th>

                        <th>

                          رقم الطالب

                        </th>

                        <th>

                          الحالة

                        </th>

                        <th>

                          الدرجة

                        </th>

                        <th>

                          التفاصيل

                        </th>

                        <th>

                          إعادة فتح

                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {visibleStudents.map(

                        (

                          student

                        ) => {

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

                                {normalizeGrade(

                                  student.grade

                                ) ||

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

                                    {

                                      info.score

                                    }

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

                              {/* التفاصيل */}

                              <td>

                                <button

                                  type="button"

                                  className="admin-icon-btn view"

                                  disabled={

                                    !info.submitted

                                  }

                                  title={

                                    info.submitted

                                      ? "عرض تفاصيل الإجابات"

                                      : "الطالب لم يسلّم الواجب"

                                  }

                                  onClick={() =>

                                    openStudentDetails(

                                      student

                                    )

                                  }

                                >

                                  <FaEye />

                                </button>

                              </td>

                              {/* إعادة فتح */}

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

                        key={

                          course.id

                        }

                        value={

                          course.id

                        }

                      >

                        {

                          course.title

                        }

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

                  {

                    homeworks.length

                  }

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

                  جاري تحميل

                  الواجبات...

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

                      <th>

                        الواجب

                      </th>

                      <th>

                        السنة

                      </th>

                      <th>

                        الكورس

                      </th>

                      <th>

                        المحاضرة

                      </th>

                      <th>

                        الدرجة

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

                    {visibleHomeworks.map(

                      (

                        homework

                      ) => (

                        <tr

                          key={

                            homework.id

                          }

                        >

                          <td>

                            <strong>

                              {

                                homework.title

                              }

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

                            {normalizeGrade(

                              homework.grade

                            ) ||

                              "—"}

                          </td>

                          <td>

                            {getCourseTitle(

                              homework.courseId

                            )}

                          </td>

                          <td>

                            {getLessonTitle(

                              homework.lessonId,

                              homework.courseId

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

          تفاصيل إجابات الطالب

      ================================================= */}

      {selectedStudentDetails && (

        <div

          className="instructions-overlay"

          onClick={

            closeStudentDetails

          }

        >

          <div

            className="instructions-modal"

            onClick={(

              event

            ) =>

              event.stopPropagation()

            }

            style={{

              width: "94%",

              maxWidth:

                "900px",

              maxHeight:

                "90vh",

              overflowY:

                "auto",

            }}

          >

            <button

              type="button"

              onClick={

                closeStudentDetails

              }

              aria-label="إغلاق"

            >

              <FaTimes />

            </button>

            <h2>

              تفاصيل إجابات الطالب

            </h2>

            <div

              style={{

                padding:

                  "16px",

                marginBottom:

                  "20px",

                borderRadius:

                  "14px",

                background:

                  "#f7f7f7",

              }}

            >

              <strong>

                {selectedStudentDetails

                  .student

                  .fullName ||

                  "الطالب"}

              </strong>

              <div

                style={{

                  marginTop:

                    "7px",

                }}

              >

                {

                  selectedStudentDetails

                    .homework

                    .title

                }

              </div>

              <div

                style={{

                  marginTop:

                    "7px",

                  fontWeight:

                    "700",

                }}

              >

                الدرجة:{" "}

                {selectedStudentDetails

                  .info.score ??

                  "—"}

                {" / "}

                {selectedStudentDetails

                  .info

                  .totalScore ??

                  selectedStudentDetails

                    .homework

                    .totalScore ??

                  "—"}

              </div>

            </div>

            {selectedStudentDetails

              .answers.length ===

            0 ? (

              <div

                style={{

                  textAlign:

                    "center",

                  padding:

                    "30px",

                  borderRadius:

                    "14px",

                  background:

                    "#f8f8f8",

                }}

              >

                لا توجد تفاصيل إجابات

                محفوظة لهذا التسليم.

              </div>

            ) : (

              <div

                style={{

                  display:

                    "grid",

                  gap:

                    "12px",

                }}

              >

                {selectedStudentDetails.answers.map(

                  (

                    answer

                  ) => (

                    <div

                      key={

                        answer.id

                      }

                      style={{

                        padding:

                          "16px",

                        borderRadius:

                          "14px",

                        border:

                          answer.cancelled

                            ? "1px solid #d6d6d6"

                            : answer.isCorrect

                              ? "1px solid #b9e5cb"

                              : "1px solid #efbaba",

                        background:

                          answer.cancelled

                            ? "#f7f7f7"

                            : answer.isCorrect

                              ? "#f0fbf4"

                              : "#fff2f2",

                      }}

                    >

                      <div

                        style={{

                          display:

                            "flex",

                          alignItems:

                            "center",

                          justifyContent:

                            "space-between",

                          gap:

                            "10px",

                          flexWrap:

                            "wrap",

                          marginBottom:

                            "12px",

                        }}

                      >

                        <strong>

                          السؤال رقم{" "}

                          {

                            answer.number

                          }

                        </strong>

                        {answer.cancelled ? (

                          <span

                            style={{

                              fontWeight:

                                "700",

                            }}

                          >

                            سؤال ملغي

                          </span>

                        ) : answer.isCorrect ? (

                          <span

                            style={{

                              color:

                                "#168754",

                              fontWeight:

                                "800",

                            }}

                          >

                            <FaCheckCircle />{" "}

                            صح

                          </span>

                        ) : (

                          <span

                            style={{

                              color:

                                "#c43838",

                              fontWeight:

                                "800",

                            }}

                          >

                            <FaTimesCircle />{" "}

                            غلط

                          </span>

                        )}

                      </div>

                      <div

                        style={{

                          marginBottom:

                            "12px",

                          lineHeight:

                            "1.8",

                          fontWeight:

                            "700",

                        }}

                      >

                        {

                          answer.question

                        }

                      </div>

                      <div

                        style={{

                          marginBottom:

                            "8px",

                        }}

                      >

                        <strong>

                          إجابة الطالب:

                        </strong>{" "}

                        {

                          answer.studentAnswer

                        }

                      </div>

                      {!answer.cancelled &&

                        !answer.isCorrect && (

                          <div

                            style={{

                              marginTop:

                                "8px",

                              color:

                                "#168754",

                              fontWeight:

                                "800",

                            }}

                          >

                            الإجابة الصحيحة:{" "}

                            {

                              answer.correctAnswer

                            }

                          </div>

                        )}

                    </div>

                  )

                )}

              </div>

            )}

          </div>

        </div>

      )}

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

                      homeworkFormData.title

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

                      homeworkFormData.description

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

                      homeworkFormData.courseId

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

                          key={

                            course.id

                          }

                          value={

                            course.id

                          }

                        >

                          {

                            course.title

                          }

                        </option>

                      )

                    )}

                  </select>

                </div>

                <div className="form-field">

                  <select

                    name="lessonId"

                    value={

                      homeworkFormData.lessonId

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

                          key={

                            lesson.id

                          }

                          value={

                            lesson.id

                          }

                        >

                          {

                            lesson.title

                          }

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

                      homeworkFormData.totalScore

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

                      homeworkFormData.submissionUrl

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

                    homeworkFormData.isPublished

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

                disabled={

                  isSaving

                }

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