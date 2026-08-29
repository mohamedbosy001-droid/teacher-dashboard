import {
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

import Login from "./Login";
import Dashboard from "./Dashboard";
import Courses from "./Courses";
import Students from "./Students";
import StudentRecords from "./StudentRecords";
import StudentProfile from "./StudentProfile";
import Lessons from "./Lessons";
import Homeworks from "./Homeworks";
import Exams from "./Exams";
import Invoices from "./Invoices";
import Codes from "./Codes";
import Reports from "./Reports";
import PasswordManagement from "./PasswordManagement";

import "./App.css";

function EmptyPage({ title, icon }) {
  const navigate = useNavigate();

  return (
    <div className="admin-empty-page">
      <div className="admin-empty-container">
        <header className="admin-page-heading">
          <div className="admin-page-heading-content">
            <div className="admin-page-heading-icon">
              {icon}
            </div>

            <h1>{title}</h1>
          </div>

          <button
            type="button"
            className="admin-back-btn"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            الرجوع للوحة التحكم
          </button>
        </header>

        <section className="admin-empty-card">
          <div className="admin-empty-icon">
            {icon}
          </div>

          <h2>لا توجد بيانات حتى الآن</h2>

          <p>
            الصفحة جاهزة، وأي بيانات تتم
            إضافتها لاحقًا ستظهر هنا.
          </p>
        </section>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/dashboard"
        element={<Dashboard />}
      />

      <Route
        path="/courses"
        element={<Courses />}
      />

      <Route
        path="/students"
        element={<Students />}
      />

      <Route
        path="/student-records"
        element={<StudentRecords />}
      />

      <Route
        path="/student-records/:studentId"
        element={<StudentProfile />}
      />

      <Route
        path="/lessons"
        element={<Lessons />}
      />

      <Route
        path="/homeworks"
        element={<Homeworks />}
      />

      <Route
        path="/exams"
        element={<Exams />}
      />

      <Route
        path="/invoices"
        element={<Invoices />}
      />

      <Route
        path="/codes"
        element={<Codes />}
      />

      <Route
        path="/reports"
        element={<Reports />}
      />
<Route
  path="/passwords"
  element={<PasswordManagement />}
 />
      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;