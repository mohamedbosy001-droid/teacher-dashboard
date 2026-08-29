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
  FaCreditCard,
  FaArrowRight,
  FaMoneyCheckAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaTimes,
  FaSearch,
  FaFilter,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
} from "react-icons/fa";

import { db } from "./firebase";
import "./App.css";

const initialInvoiceData = {
  studentId: "",
  itemTitle: "",
  amount: "",
  paymentMethod: "",
  status: "pending",
  notes: "",
};

function Invoices() {
  const navigate = useNavigate();

  const [invoices, setInvoices] =
    useState([]);

  const [students, setStudents] =
    useState([]);

  const [searchText, setSearchText] =
    useState("");

  const [selectedStatus, setSelectedStatus] =
    useState("");

  const [showInvoiceForm, setShowInvoiceForm] =
    useState(false);

  const [invoiceData, setInvoiceData] =
    useState(initialInvoiceData);

  const [editingInvoiceId, setEditingInvoiceId] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    const unsubscribeInvoices = onSnapshot(
      collection(db, "invoices"),
      (snapshot) => {
        const invoicesData =
          snapshot.docs.map(
            (invoiceDocument) => ({
              id: invoiceDocument.id,
              ...invoiceDocument.data(),
            })
          );

        setInvoices(invoicesData);
        setIsLoading(false);
        setMessage("");
      },
      (error) => {
        console.error(error);

        setMessage(
          "حدث خطأ أثناء تحميل الفواتير."
        );

        setIsLoading(false);
      }
    );

    const unsubscribeStudents = onSnapshot(
      collection(db, "students"),
      (snapshot) => {
        const studentsData =
          snapshot.docs.map(
            (studentDocument) => ({
              id: studentDocument.id,
              ...studentDocument.data(),
            })
          );

        setStudents(studentsData);
      },
      (error) => {
        console.error(
          "Students loading error:",
          error
        );
      }
    );

    return () => {
      unsubscribeInvoices();
      unsubscribeStudents();
    };
  }, []);

  const visibleInvoices = useMemo(() => {
    const searchValue =
      searchText.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const studentName =
        invoice.studentName || "";

      const itemTitle =
        invoice.itemTitle || "";

      const matchesSearch =
        !searchValue ||
        studentName
          .toLowerCase()
          .includes(searchValue) ||
        itemTitle
          .toLowerCase()
          .includes(searchValue);

      const matchesStatus =
        !selectedStatus ||
        invoice.status === selectedStatus;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    invoices,
    searchText,
    selectedStatus,
  ]);

  function getStudentName(studentId) {
    const student = students.find(
      (item) => item.id === studentId
    );

    return (
      student?.fullName ||
      "طالب غير محدد"
    );
  }

  function getStatusText(status) {
    if (status === "paid") {
      return "مدفوعة";
    }

    if (status === "cancelled") {
      return "ملغية";
    }

    return "قيد المراجعة";
  }

  function getStatusIcon(status) {
    if (status === "paid") {
      return <FaCheckCircle />;
    }

    if (status === "cancelled") {
      return <FaTimesCircle />;
    }

    return <FaClock />;
  }

  function formatInvoiceDate(dateValue) {
    if (!dateValue) {
      return "غير محدد";
    }

    try {
      const date =
        typeof dateValue.toDate ===
        "function"
          ? dateValue.toDate()
          : new Date(dateValue);

      return new Intl.DateTimeFormat(
        "ar-EG",
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        }
      ).format(date);
    } catch {
      return "غير محدد";
    }
  }

  function handleInvoiceChange(event) {
    const { name, value } =
      event.target;

    setInvoiceData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setMessage("");
  }

  function openAddInvoiceForm() {
    setEditingInvoiceId(null);
    setInvoiceData(initialInvoiceData);
    setMessage("");
    setShowInvoiceForm(true);
  }

  function openEditInvoiceForm(invoice) {
    setEditingInvoiceId(invoice.id);

    setInvoiceData({
      studentId:
        invoice.studentId || "",

      itemTitle:
        invoice.itemTitle || "",

      amount:
        invoice.amount === undefined
          ? ""
          : String(invoice.amount),

      paymentMethod:
        invoice.paymentMethod || "",

      status:
        invoice.status || "pending",

      notes:
        invoice.notes || "",
    });

    setMessage("");
    setShowInvoiceForm(true);
  }

  function closeInvoiceForm() {
    setShowInvoiceForm(false);
    setEditingInvoiceId(null);
    setInvoiceData(initialInvoiceData);
    setMessage("");
  }

  async function handleInvoiceSubmit(
    event
  ) {
    event.preventDefault();

    if (
      !invoiceData.studentId ||
      !invoiceData.itemTitle.trim() ||
      invoiceData.amount === "" ||
      !invoiceData.paymentMethod ||
      !invoiceData.status
    ) {
      setMessage(
        "من فضلك املئي جميع البيانات المطلوبة."
      );

      return;
    }

    const amount = Number(
      invoiceData.amount
    );

    if (
      Number.isNaN(amount) ||
      amount < 0
    ) {
      setMessage(
        "من فضلك اكتبي مبلغًا صحيحًا."
      );

      return;
    }

    const selectedStudent =
      students.find(
        (student) =>
          student.id ===
          invoiceData.studentId
      );

    if (!selectedStudent) {
      setMessage(
        "تعذر العثور على بيانات الطالب."
      );

      return;
    }

    setIsSaving(true);
    setMessage("");

    const invoiceToSave = {
      studentId:
        invoiceData.studentId,

      studentUid:
        selectedStudent.uid ||
        selectedStudent.id,

      studentName:
        selectedStudent.fullName ||
        "طالب المنصة",

      studentPhone:
        selectedStudent.studentPhone ||
        "",

      itemTitle:
        invoiceData.itemTitle.trim(),

      amount,

      paymentMethod:
        invoiceData.paymentMethod,

      status:
        invoiceData.status,

      notes:
        invoiceData.notes.trim(),

      updatedAt:
        serverTimestamp(),
    };

    try {
      if (editingInvoiceId) {
        await updateDoc(
          doc(
            db,
            "invoices",
            editingInvoiceId
          ),
          invoiceToSave
        );
      } else {
        await addDoc(
          collection(db, "invoices"),
          {
            ...invoiceToSave,

            createdAt:
              serverTimestamp(),
          }
        );
      }

      closeInvoiceForm();
    } catch (error) {
      console.error(error);

      setMessage(
        "حدث خطأ أثناء حفظ الفاتورة."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteInvoice(
    invoice
  ) {
    const confirmed =
      window.confirm(
        `هل أنتِ متأكدة من حذف فاتورة الطالب "${invoice.studentName}"؟`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(
        doc(
          db,
          "invoices",
          invoice.id
        )
      );
    } catch (error) {
      console.error(error);

      window.alert(
        "حدث خطأ أثناء حذف الفاتورة."
      );
    }
  }

  return (
    <main className="admin-section-page">
      <div className="admin-section-container">
        <header className="admin-section-header">
          <div className="admin-section-title">
            <div className="admin-section-title-icon">
              <FaCreditCard />
            </div>

            <div>
              <span>
                لوحة تحكم المدرس
              </span>

              <h1>
                الفواتير والمدفوعات
              </h1>

              <p>
                إضافة ومراجعة مدفوعات
                الطلاب واشتراكاتهم.
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
              onClick={openAddInvoiceForm}
            >
              <FaPlus />
              إضافة فاتورة
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
              placeholder="ابحثي باسم الطالب أو الاشتراك..."
            />
          </div>

          <div className="admin-filter-box">
            <FaFilter />

            <select
              value={selectedStatus}
              onChange={(event) =>
                setSelectedStatus(
                  event.target.value
                )
              }
            >
              <option value="">
                كل الحالات
              </option>

              <option value="pending">
                قيد المراجعة
              </option>

              <option value="paid">
                مدفوعة
              </option>

              <option value="cancelled">
                ملغية
              </option>
            </select>
          </div>

          <div className="admin-total-box">
            <span>
              عدد الفواتير
            </span>

            <strong>
              {invoices.length}
            </strong>
          </div>
        </section>

        {message &&
          !showInvoiceForm && (
            <div className="teacher-login-message error">
              {message}
            </div>
          )}

        {isLoading ? (
          <section className="admin-data-empty">
            <h2>
              جاري تحميل الفواتير...
            </h2>
          </section>
        ) : visibleInvoices.length ===
          0 ? (
          <section className="admin-data-empty">
            <div className="admin-data-empty-icon">
              <FaMoneyCheckAlt />
            </div>

            <h2>
              لا توجد فواتير حتى الآن
            </h2>

            <p>
              أضيفي أول فاتورة لطالب،
              وستظهر له في حسابه.
            </p>

            <button
              type="button"
              className="admin-primary-btn"
              onClick={openAddInvoiceForm}
            >
              <FaPlus />
              إضافة أول فاتورة
            </button>
          </section>
        ) : (
          <section className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>الاشتراك</th>
                  <th>المبلغ</th>
                  <th>طريقة الدفع</th>
                  <th>التاريخ</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>

              <tbody>
                {visibleInvoices.map(
                  (invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <strong>
                          {invoice.studentName ||
                            getStudentName(
                              invoice.studentId
                            )}
                        </strong>

                        <br />

                        <small>
                          {invoice.studentPhone ||
                            ""}
                        </small>
                      </td>

                      <td>
                        {invoice.itemTitle}
                      </td>

                      <td>
                        {invoice.amount} جنيه
                      </td>

                      <td>
                        {
                          invoice.paymentMethod
                        }
                      </td>

                      <td>
                        {formatInvoiceDate(
                          invoice.createdAt
                        )}
                      </td>

                      <td>
                        <span
                          className={`admin-status ${
                            invoice.status ===
                            "paid"
                              ? "published"
                              : "hidden"
                          }`}
                        >
                          {getStatusIcon(
                            invoice.status
                          )}

                          {getStatusText(
                            invoice.status
                          )}
                        </span>
                      </td>

                      <td>
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="admin-icon-btn edit"
                            title="تعديل الفاتورة"
                            onClick={() =>
                              openEditInvoiceForm(
                                invoice
                              )
                            }
                          >
                            <FaEdit />
                          </button>

                          <button
                            type="button"
                            className="admin-icon-btn delete"
                            title="حذف الفاتورة"
                            onClick={() =>
                              handleDeleteInvoice(
                                invoice
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

      {showInvoiceForm && (
        <div className="instructions-overlay">
          <div className="instructions-modal">
            <button
              type="button"
              onClick={closeInvoiceForm}
              aria-label="إغلاق"
            >
              <FaTimes />
            </button>

            <h2>
              {editingInvoiceId
                ? "تعديل الفاتورة"
                : "إضافة فاتورة جديدة"}
            </h2>

            <form
              className="register-form"
              onSubmit={
                handleInvoiceSubmit
              }
            >
              <div className="form-grid">
                <div className="form-field full-width-field">
                  <select
                    name="studentId"
                    value={
                      invoiceData.studentId
                    }
                    onChange={
                      handleInvoiceChange
                    }
                  >
                    <option value="">
                      اختر الطالب
                    </option>

                    {students.map(
                      (student) => (
                        <option
                          key={student.id}
                          value={student.id}
                        >
                          {student.fullName ||
                            "طالب"}{" "}
                          —{" "}
                          {student.studentPhone ||
                            "بدون رقم"}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="form-field full-width-field">
                  <input
                    type="text"
                    name="itemTitle"
                    value={
                      invoiceData.itemTitle
                    }
                    onChange={
                      handleInvoiceChange
                    }
                    placeholder="اسم الكورس أو المحاضرة"
                  />
                </div>

                <div className="form-field">
                  <input
                    type="number"
                    name="amount"
                    min="0"
                    value={
                      invoiceData.amount
                    }
                    onChange={
                      handleInvoiceChange
                    }
                    placeholder="المبلغ"
                  />
                </div>

                <div className="form-field">
                  <select
                    name="paymentMethod"
                    value={
                      invoiceData.paymentMethod
                    }
                    onChange={
                      handleInvoiceChange
                    }
                  >
                    <option value="">
                      طريقة الدفع
                    </option>

                    <option value="فودافون كاش">
                      فودافون كاش
                    </option>

                    <option value="إنستا باي">
                      إنستا باي
                    </option>

                    <option value="دفع في السنتر">
                      دفع في السنتر
                    </option>

                    <option value="تحويل بنكي">
                      تحويل بنكي
                    </option>

                    <option value="أخرى">
                      أخرى
                    </option>
                  </select>
                </div>

                <div className="form-field full-width-field">
                  <select
                    name="status"
                    value={
                      invoiceData.status
                    }
                    onChange={
                      handleInvoiceChange
                    }
                  >
                    <option value="pending">
                      قيد المراجعة
                    </option>

                    <option value="paid">
                      مدفوعة
                    </option>

                    <option value="cancelled">
                      ملغية
                    </option>
                  </select>
                </div>

                <div className="form-field full-width-field">
                  <textarea
                    name="notes"
                    value={
                      invoiceData.notes
                    }
                    onChange={
                      handleInvoiceChange
                    }
                    placeholder="ملاحظات — اختياري"
                    rows="4"
                  />
                </div>
              </div>

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
                  : editingInvoiceId
                    ? "حفظ التعديلات"
                    : "إضافة الفاتورة"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Invoices;