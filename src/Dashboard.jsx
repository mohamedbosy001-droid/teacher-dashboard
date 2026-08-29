import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";

import {
  FaBookOpen,
  FaUsers,
  FaVideo,
  FaClipboardCheck,
  FaFileAlt,
  FaCreditCard,
  FaKey,
  FaChartLine,
  FaSignOutAlt,
  FaUserGraduate,
  FaLock,
} from "react-icons/fa";

import { auth } from "./firebase";
import "./App.css";

function Dashboard() {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error(
        "Error logging out:",
        error
      );

      window.alert(
        "حدث خطأ أثناء تسجيل الخروج."
      );
    }
  }

  const menuItems = [
    {
      title: "إدارة الكورسات",
      description:
        "إضافة وتعديل وحذف الكورسات",
      icon: <FaBookOpen />,
      path: "/courses",
    },
    {
      title: "إدارة الطلاب",
      description:
        "عرض الطلاب وتفعيل الحسابات",
      icon: <FaUsers />,
      path: "/students",
    },
    {
      title: "ملفات الطلاب الشاملة",
      description:
        "البحث عن أي طالب ومتابعة النقاط والمشاهدات والدرجات طوال السنة",
      icon: <FaUserGraduate />,
      path: "/student-records",
    },

    {
      title: "إدارة كلمات المرور",
      description:
        "البحث عن الطالب وتعيين كلمة مرور جديدة عند نسيانها",
      icon: <FaLock />,
      path: "/passwords",
    },

    {
      title: "إدارة المحاضرات",
      description:
        "إضافة الفيديوهات والمحتوى",
      icon: <FaVideo />,
      path: "/lessons",
    },
    {
      title: "الواجبات",
      description:
        "إنشاء ومراجعة الواجبات",
      icon: <FaClipboardCheck />,
      path: "/homeworks",
    },
    {
      title: "الامتحانات",
      description:
        "إضافة الامتحانات والدرجات",
      icon: <FaFileAlt />,
      path: "/exams",
    },
    {
      title: "الفواتير",
      description:
        "متابعة الاشتراكات والمدفوعات",
      icon: <FaCreditCard />,
      path: "/invoices",
    },
    {
      title: "أكواد التفعيل",
      description:
        "إنشاء أكواد للمحاضرات والكورسات",
      icon: <FaKey />,
      path: "/codes",
    },
    {
      title: "التقارير",
      description:
        "متابعة أداء الطلاب والمنصة",
      icon: <FaChartLine />,
      path: "/reports",
    },
  ];

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-title">
          <h1>لوحة تحكم المدرس</h1>
          <p>منصة درس خصوصي</p>
        </div>

        <button
          type="button"
          className="admin-logout-btn"
          onClick={handleLogout}
        >
          <FaSignOutAlt />
          تسجيل الخروج
        </button>
      </header>

      <main className="admin-main">
        <section className="admin-welcome-card">
          <h2>
            أهلًا بك في لوحة الإدارة 👋
          </h2>

          <p>
            من هنا تقدر تتحكم في الكورسات
            والطلاب والمحاضرات والامتحانات
            والفواتير وكل محتوى المنصة.
          </p>
        </section>

        <section className="admin-grid">
          {menuItems.map((item) => (
            <button
              key={item.title}
              type="button"
              className="admin-card"
              onClick={() =>
                navigate(item.path)
              }
            >
              <div className="admin-card-icon">
                {item.icon}
              </div>

              <h3>{item.title}</h3>

              <p>{item.description}</p>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;