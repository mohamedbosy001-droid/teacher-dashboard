import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  FaArrowRight,
  FaSearch,
  FaUserGraduate,
  FaPhoneAlt,
  FaCopy,
  FaEnvelope,
  FaKey,
  FaEye,
  FaEyeSlash,
  FaSyncAlt,
} from "react-icons/fa";

import {
  auth,
  db,
} from "./firebase";

import "./App.css";

const PASSWORD_WORKER_URL =
  "https://dars-khososy-password.mohamedbosy001.workers.dev/";

const ADMIN_EMAIL =
  "ziadk@gmail.com";

function PasswordManagement() {
  const navigate = useNavigate();

  const [phone, setPhone] =
    useState("");

  const [student, setStudent] =
    useState(null);

  const [isSearching, setIsSearching] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    isChangingPassword,
    setIsChangingPassword,
  ] = useState(false);

  /*
    ننتظر Firebase لحد ما يحدد
    هل فيه مستخدم مسجل دخوله أم لا.
  */
  function waitForCurrentUser() {
    return new Promise((resolve) => {
      if (auth.currentUser) {
        resolve(auth.currentUser);
        return;
      }

      let finished = false;

      const unsubscribe =
        onAuthStateChanged(
          auth,
          (user) => {
            if (finished) {
              return;
            }

            finished = true;
            unsubscribe();

            resolve(user);
          },
          () => {
            if (finished) {
              return;
            }

            finished = true;
            unsubscribe();

            resolve(null);
          }
        );

      /*
        احتياطًا لو Firebase تأخر
        بشكل غير طبيعي.
      */
      setTimeout(() => {
        if (finished) {
          return;
        }

        finished = true;
        unsubscribe();

        resolve(
          auth.currentUser ||
          null
        );
      }, 3000);
    });
  }

  async function searchStudent(event) {
    event.preventDefault();

    setStudent(null);
    setNewPassword("");
    setMessage("");
    setMessageType("");

    const cleanPhone =
      phone.trim();

    if (
      !/^01[0125][0-9]{8}$/.test(
        cleanPhone
      )
    ) {
      setMessage(
        "من فضلك اكتب رقم هاتف الطالب بشكل صحيح."
      );

      setMessageType("error");
      return;
    }

    setIsSearching(true);

    try {
      const studentsReference =
        collection(
          db,
          "students"
        );

      const studentQuery =
        query(
          studentsReference,
          where(
            "studentPhone",
            "==",
            cleanPhone
          )
        );

      const snapshot =
        await getDocs(
          studentQuery
        );

      if (snapshot.empty) {
        setMessage(
          "لم يتم العثور على طالب بهذا الرقم."
        );

        setMessageType(
          "error"
        );

        return;
      }

      const studentDocument =
        snapshot.docs[0];

      const firestoreData =
        studentDocument.data();

      const studentData = {
        ...firestoreData,

        uid:
          firestoreData.uid ||
          studentDocument.id,
      };

      setStudent(
        studentData
      );

      setMessage(
        "تم العثور على حساب الطالب."
      );

      setMessageType(
        "success"
      );
    } catch (error) {
      console.error(
        "Error searching student:",
        error
      );

      setMessage(
        "حدث خطأ أثناء البحث عن الطالب."
      );

      setMessageType(
        "error"
      );
    } finally {
      setIsSearching(
        false
      );
    }
  }

  async function changePassword() {
    if (!student?.uid) {
      setMessage(
        "معرف حساب الطالب غير موجود."
      );

      setMessageType(
        "error"
      );

      return;
    }

    const cleanPassword =
      newPassword.trim();

    if (
      cleanPassword.length < 6
    ) {
      setMessage(
        "كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف أو أرقام."
      );

      setMessageType(
        "error"
      );

      return;
    }

    setIsChangingPassword(true);
    setMessage("");
    setMessageType("");

    try {
      /*
        بدل فحص auth.currentUser
        مباشرة، ننتظر Firebase.
      */
      const currentUser =
        await waitForCurrentUser();

      if (!currentUser) {
        setMessage(
          "يجب تسجيل الدخول بحساب الأدمن أولًا."
        );

        setMessageType(
          "error"
        );

        return;
      }

      /*
        حماية إضافية:
        نتأكد إن الحساب المفتوح
        هو حساب الأدمن.
      */
      const currentEmail =
        String(
          currentUser.email || ""
        )
          .trim()
          .toLowerCase();

      if (
        currentEmail !==
        ADMIN_EMAIL.toLowerCase()
      ) {
        setMessage(
          "الحساب الحالي ليس حساب الأدمن المسموح له بتغيير كلمات المرور."
        );

        setMessageType(
          "error"
        );

        return;
      }

      const confirmChange =
        window.confirm(
          `هل أنتِ متأكدة من تغيير كلمة مرور ${
            student.fullName ||
            "الطالب"
          }؟`
        );

      if (!confirmChange) {
        return;
      }

      /*
        نجلب Token جديد لحساب الأدمن.
      */
      const idToken =
        await currentUser.getIdToken(
          true
        );

      /*
        إرسال الطلب إلى
        Cloudflare Worker.
      */
      const response =
        await fetch(
          PASSWORD_WORKER_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${idToken}`,
            },

            body:
              JSON.stringify({
                uid:
                  student.uid,

                newPassword:
                  cleanPassword,
              }),
          }
        );

      let data = null;

      try {
        data =
          await response.json();
      } catch {
        data = null;
      }

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.message ||
          "تعذر تغيير كلمة المرور."
        );
      }

      setMessage(
        "تم تغيير كلمة مرور الطالب بنجاح. يمكنك الآن إرسال كلمة المرور الجديدة للطالب."
      );

      setMessageType(
        "success"
      );
    } catch (error) {
      console.error(
        "Password change error:",
        error
      );

      setMessage(
        error?.message ||
        "حدث خطأ أثناء تغيير كلمة المرور."
      );

      setMessageType(
        "error"
      );
    } finally {
      setIsChangingPassword(
        false
      );
    }
  }

  async function copyText(
    text,
    label
  ) {
    try {
      await navigator.clipboard.writeText(
        text
      );

      setMessage(
        `تم نسخ ${label} بنجاح.`
      );

      setMessageType(
        "success"
      );
    } catch (error) {
      console.error(
        "Copy error:",
        error
      );

      setMessage(
        "تعذر نسخ البيانات."
      );

      setMessageType(
        "error"
      );
    }
  }

  const studentEmail =
    student
      ? (
          student.email ||
          student.authEmail ||
          `${student.studentPhone}@dars-khososy.com`
        )
      : "";

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-title">
          <h1>
            إدارة كلمات المرور
          </h1>

          <p>
            البحث عن حساب الطالب
            وتغيير كلمة المرور
          </p>
        </div>

        <button
          type="button"
          className="admin-back-btn"
          onClick={() =>
            navigate(
              "/dashboard"
            )
          }
        >
          <FaArrowRight />

          الرجوع للوحة التحكم
        </button>
      </header>

      <main className="admin-main">
        <section className="admin-welcome-card">
          <h2>
            البحث عن حساب الطالب 🔐
          </h2>

          <p>
            اكتبي رقم هاتف الطالب،
            وبعد العثور عليه يمكنكِ
            تعيين كلمة مرور جديدة.
          </p>
        </section>

        <section
          className="admin-empty-card"
          style={{
            maxWidth:
              "750px",

            margin:
              "0 auto",
          }}
        >
          <form
            onSubmit={
              searchStudent
            }
          >
            <div
              style={{
                display:
                  "grid",

                gap:
                  "12px",
              }}
            >
              <label
                style={{
                  fontWeight:
                    "800",
                }}
              >
                رقم هاتف الطالب
              </label>

              <div
                style={{
                  display:
                    "flex",

                  gap:
                    "10px",
                }}
              >
                <input
                  type="tel"
                  value={phone}
                  onChange={(
                    event
                  ) =>
                    setPhone(
                      event.target.value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                  placeholder="01xxxxxxxxx"
                  maxLength="11"
                  inputMode="numeric"
                  style={{
                    flex: 1,

                    minHeight:
                      "50px",

                    padding:
                      "0 15px",

                    border:
                      "1px solid #d8bea0",

                    borderRadius:
                      "12px",

                    fontSize:
                      "16px",
                  }}
                />

                <button
                  type="submit"
                  disabled={
                    isSearching
                  }
                  className="admin-card"
                  style={{
                    width:
                      "150px",

                    minHeight:
                      "50px",

                    padding:
                      "10px",
                  }}
                >
                  <FaSearch />

                  {isSearching
                    ? "جاري البحث..."
                    : "بحث"}
                </button>
              </div>
            </div>
          </form>

          {message && (
            <div
              style={{
                marginTop:
                  "18px",

                padding:
                  "12px",

                borderRadius:
                  "10px",

                fontWeight:
                  "800",

                color:
                  messageType ===
                  "error"
                    ? "#c94d43"
                    : "#188b50",
              }}
            >
              {message}
            </div>
          )}

          {student && (
            <div
              style={{
                marginTop:
                  "25px",

                padding:
                  "22px",

                border:
                  "1px solid #dfc5a3",

                borderRadius:
                  "15px",
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                }}
              >
                بيانات الحساب
              </h2>

              <div
                style={{
                  display:
                    "grid",

                  gap:
                    "15px",
                }}
              >
                <p>
                  <FaUserGraduate />{" "}

                  <strong>
                    اسم الطالب:
                  </strong>{" "}

                  {student.fullName ||
                    "غير مسجل"}
                </p>

                <p>
                  <FaPhoneAlt />{" "}

                  <strong>
                    رقم الهاتف:
                  </strong>{" "}

                  {
                    student.studentPhone
                  }
                </p>

                <p>
                  <FaEnvelope />{" "}

                  <strong>
                    إيميل الحساب:
                  </strong>{" "}

                  <span
                    dir="ltr"
                    style={{
                      display:
                        "inline-block",
                    }}
                  >
                    {studentEmail}
                  </span>
                </p>

                <p>
                  <FaKey />{" "}

                  <strong>
                    UID:
                  </strong>{" "}

                  <span
                    dir="ltr"
                    style={{
                      display:
                        "inline-block",
                    }}
                  >
                    {student.uid}
                  </span>
                </p>
              </div>

              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "1fr 1fr",

                  gap:
                    "10px",

                  marginTop:
                    "20px",
                }}
              >
                <button
                  type="button"
                  className="admin-card"
                  onClick={() =>
                    copyText(
                      studentEmail,
                      "إيميل الحساب"
                    )
                  }
                >
                  <FaCopy />

                  نسخ إيميل الحساب
                </button>

                <button
                  type="button"
                  className="admin-card"
                  onClick={() =>
                    copyText(
                      student.uid,
                      "UID"
                    )
                  }
                >
                  <FaCopy />

                  نسخ UID
                </button>
              </div>

              <div
                style={{
                  marginTop:
                    "25px",

                  padding:
                    "20px",

                  border:
                    "1px solid #d8bea0",

                  borderRadius:
                    "15px",
                }}
              >
                <h3
                  style={{
                    marginTop:
                      0,
                  }}
                >
                  تغيير كلمة المرور
                </h3>

                <p>
                  اكتبي كلمة المرور
                  الجديدة التي سيتم
                  إعطاؤها للطالب.
                </p>

                <div
                  style={{
                    position:
                      "relative",

                    marginTop:
                      "15px",
                  }}
                >
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      newPassword
                    }
                    onChange={(
                      event
                    ) =>
                      setNewPassword(
                        event.target
                          .value
                      )
                    }
                    placeholder="كلمة المرور الجديدة"
                    autoComplete="new-password"
                    style={{
                      width:
                        "100%",

                      minHeight:
                        "52px",

                      padding:
                        "0 50px 0 15px",

                      border:
                        "1px solid #d8bea0",

                      borderRadius:
                        "12px",

                      fontSize:
                        "16px",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (
                          current
                        ) =>
                          !current
                      )
                    }
                    style={{
                      position:
                        "absolute",

                      right:
                        "12px",

                      top:
                        "50%",

                      transform:
                        "translateY(-50%)",

                      border:
                        "none",

                      background:
                        "transparent",

                      cursor:
                        "pointer",

                      fontSize:
                        "18px",
                    }}
                  >
                    {showPassword ? (
                      <FaEyeSlash />
                    ) : (
                      <FaEye />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  className="admin-card"
                  disabled={
                    isChangingPassword
                  }
                  onClick={
                    changePassword
                  }
                  style={{
                    width:
                      "100%",

                    marginTop:
                      "15px",

                    minHeight:
                      "52px",

                    opacity:
                      isChangingPassword
                        ? 0.7
                        : 1,
                  }}
                >
                  <FaSyncAlt />

                  {isChangingPassword
                    ? "جاري تغيير كلمة المرور..."
                    : "تغيير كلمة مرور الطالب"}
                </button>

                {newPassword && (
                  <button
                    type="button"
                    className="admin-card"
                    onClick={() =>
                      copyText(
                        newPassword,
                        "كلمة المرور الجديدة"
                      )
                    }
                    style={{
                      width:
                        "100%",

                      marginTop:
                        "10px",
                    }}
                  >
                    <FaCopy />

                    نسخ كلمة المرور الجديدة
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default PasswordManagement;