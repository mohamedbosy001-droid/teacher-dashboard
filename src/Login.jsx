import { useState } from "react";
import {
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  FaChalkboardTeacher,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

import { auth } from "./firebase";
import "./App.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const navigate = useNavigate();

  async function handleLogin(event) {
    event.preventDefault();

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setMessage(
        "من فضلك اكتب البريد الإلكتروني وكلمة المرور."
      );
      setMessageType("error");
      return;
    }

    setIsLoading(true);
    setMessage("جاري تسجيل الدخول...");
    setMessageType("pending");

    try {
      await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      setMessage("");
      setMessageType("");

      navigate("/dashboard");
    } catch (error) {
      console.error(
        "Teacher login error:",
        error
      );

      setMessage(
        "البريد الإلكتروني أو كلمة المرور غير صحيحة."
      );

      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="teacher-login-page">
      <section className="teacher-login-card">
        <div className="teacher-login-logo">
          <FaChalkboardTeacher />
        </div>

        <div className="teacher-login-heading">
          <span>منصة درس خصوصي</span>

          <h1>تسجيل دخول المدرس</h1>

          <p>
            أدخل بيانات حساب الإدارة للوصول إلى
            لوحة التحكم.
          </p>
        </div>

        <form
          className="teacher-login-form"
          onSubmit={handleLogin}
        >
          <label htmlFor="teacherEmail">
            البريد الإلكتروني
          </label>

          <div className="teacher-login-input">
            <FaEnvelope />

            <input
              id="teacherEmail"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setMessage("");
                setMessageType("");
              }}
              placeholder="teacher@example.com"
              autoComplete="email"
            />
          </div>

          <label htmlFor="teacherPassword">
            كلمة المرور
          </label>

          <div className="teacher-login-input">
            <FaLock />

            <input
              id="teacherPassword"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={password}
              onChange={(event) => {
                setPassword(
                  event.target.value
                );
                setMessage("");
                setMessageType("");
              }}
              placeholder="اكتب كلمة المرور"
              autoComplete="current-password"
            />

            <button
              type="button"
              className="teacher-password-toggle"
              onClick={() =>
                setShowPassword(
                  !showPassword
                )
              }
              aria-label={
                showPassword
                  ? "إخفاء كلمة المرور"
                  : "إظهار كلمة المرور"
              }
            >
              {showPassword ? (
                <FaEye />
              ) : (
                <FaEyeSlash />
              )}
            </button>
          </div>

          {message && (
            <div
              className={`teacher-login-message ${messageType}`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            className="teacher-login-btn"
            disabled={isLoading}
          >
            {isLoading
              ? "جاري الدخول..."
              : "دخول"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Login;