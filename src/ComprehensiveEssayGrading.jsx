import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, Timestamp, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { FaArrowRight, FaClipboardCheck, FaRedo, FaSave } from "react-icons/fa";
import { db } from "./firebase";
import "./App.css";

function ComprehensiveEssayGrading() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [grades, setGrades] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    return onSnapshot(collection(db, "students"), (snapshot) => {
      setStudents(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Failed to load comprehensive exam submissions", error);
      setMessage("حصل خطأ أثناء تحميل إجابات الطلاب.");
      setLoading(false);
    });
  }, []);

  // اجمع المحاولات من examResults و examAttempts؛ بعض النسخ القديمة تحفظ بيانات
  // المحاولة في examAttempts فقط، ولذلك لا يجوز أن تختفي من لوحة التصحيح.
  const submissions = useMemo(() => {
    const rows = [];
    students.forEach((student) => {
      const byExamId = new Map();
      const results = Array.isArray(student.examResults) ? student.examResults : [];

      results.forEach((result) => {
        if (!result?.isComprehensiveExam || !result?.examId) return;
        byExamId.set(String(result.examId), result);
      });

      const attempts = student.examAttempts && typeof student.examAttempts === "object"
        ? student.examAttempts
        : {};
      Object.entries(attempts).forEach(([examId, attempt]) => {
        const attemptResult = attempt?.result && typeof attempt.result === "object"
          ? attempt.result
          : {
              ...attempt,
              examId: attempt?.examId || examId,
              examTitle: attempt?.examTitle || "امتحان الشامل",
              answers: Array.isArray(attempt?.answers) ? attempt.answers : [],
              isComprehensiveExam: attempt?.isComprehensiveExam === true,
              gradingStatus: attempt?.gradingStatus || "pending_essay",
            };
        if (!attemptResult?.isComprehensiveExam || !attemptResult?.examId) return;
        const key = String(attemptResult.examId || examId);
        // احتفظ بنتيجة examResults إن وُجدت، وإلا استخدم النتيجة الموجودة بالمحاولة.
        if (!byExamId.has(key)) byExamId.set(key, attemptResult);
      });

      byExamId.forEach((result) => rows.push({ student, result }));
    });
    return rows;
  }, [students]);

  function openSubmission(row) {
    setSelected(row);
    const initial = {};
    (row.result.answers || []).filter((answer) => answer.type === "essay").forEach((answer) => {
      initial[answer.questionId] = answer.teacherScore ?? "";
    });
    setGrades(initial);
    setMessage("");
  }

  async function approveGrades() {
    if (!selected) return;
    const essays = (selected.result.answers || []).filter((answer) => answer.type === "essay");
    if (essays.length === 0) {
      setMessage("المحاولة دي مفيهاش أسئلة مقالية للتصحيح.");
      return;
    }
    if (essays.some((answer) => grades[answer.questionId] === "" || grades[answer.questionId] == null || !Number.isFinite(Number(grades[answer.questionId])) || Number(grades[answer.questionId]) < 0)) {
      setMessage("اكتبي درجة لكل سؤال مقالي قبل اعتماد النتيجة.");
      return;
    }

    setSaving(true);
    setMessage("جاري حفظ التصحيح واعتماد النتيجة...");
    try {
      const student = selected.student;
      const result = selected.result;
      const updatedAnswers = (result.answers || []).map((answer) => {
        if (answer.type !== "essay") return answer;
        const teacherScore = Number(grades[answer.questionId]);
        return { ...answer, teacherScore, earnedPoints: teacherScore, isCorrect: null, manuallyGraded: true };
      });
      const essayScore = updatedAnswers.filter((answer) => answer.type === "essay").reduce((sum, answer) => sum + Number(answer.earnedPoints || 0), 0);
      const mcqScore = updatedAnswers.filter((answer) => answer.type !== "essay").reduce((sum, answer) => sum + Number(answer.earnedPoints || 0), 0);
      const score = mcqScore + essayScore;
      const totalQuestions = Number(result.totalQuestions || 0);
      const finalResult = {
        ...result,
        answers: updatedAnswers,
        score,
        totalQuestions,
        percentage: totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0,
        gradingStatus: "graded",
        essayGradedAt: Timestamp.now(),
      };
      const existingResults = Array.isArray(student.examResults) ? student.examResults : [];
      const matchingResultIndex = existingResults.findIndex((item) => item?.examId === result.examId);
      const examResults = [...existingResults];
      if (matchingResultIndex >= 0) {
        examResults[matchingResultIndex] = finalResult;
      } else {
        // If the dashboard row came from an attempt record but the result array is missing it,
        // still persist the approved result so the student-side listener can find it.
        examResults.push(finalResult);
      }
      const attempt = student.examAttempts?.[result.examId] || {};
      const examAttempts = {
        ...(student.examAttempts || {}),
        [result.examId]: {
          ...attempt,
          examId: result.examId,
          examTitle: result.examTitle || attempt.examTitle || "امتحان الشامل",
          completed: true,
          isComprehensiveExam: true,
          gradingStatus: "graded",
          result: finalResult,
          answers: attempt.answers || updatedAnswers,
          updatedAt: Timestamp.now(),
        },
      };
      await updateDoc(doc(db, "students", student.id), { examResults, examAttempts, updatedAt: Timestamp.now() });
      setSelected(null);
      setMessage("✅ تم اعتماد التصحيح وحفظ النتيجة النهائية للطالب بنجاح.");
    } catch (error) {
      console.error(error);
      setMessage(`تعذر حفظ التصحيح: ${error?.message || "خطأ غير معروف"}`);
    } finally {
      setSaving(false);
    }
  }

  async function reopenAttempt(row) {
    const { student, result } = row;
    const confirmed = window.confirm(`إعادة فتح محاولة امتحان الشامل للطالب ${student.name || student.fullName || student.id}؟ سيتم حذف النتيجة الحالية لهذا الامتحان وبدء محاولة جديدة.`);
    if (!confirmed) return;
    setSaving(true);
    setMessage("");
    try {
      const examResults = (Array.isArray(student.examResults) ? student.examResults : []).filter((item) => item.examId !== result.examId);
      const examAttempts = {
        ...(student.examAttempts || {}),
        [result.examId]: {
          ...(student.examAttempts?.[result.examId] || {}),
          completed: false,
          adminReopened: true,
          answers: {},
          currentQuestionIndex: 0,
          started: false,
          updatedAt: Timestamp.now(),
        },
      };
      await updateDoc(doc(db, "students", student.id), { examResults, examAttempts, updatedAt: Timestamp.now() });
      setSelected(null);
      setMessage("تم فتح محاولة جديدة للطالب.");
    } catch (error) {
      console.error(error);
      setMessage("تعذر إعادة فتح المحاولة. تأكدي من صلاحيات Firebase.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-title">
          <h1>تصحيح المقالي — امتحان الشامل</h1>
          <p>راجعي إجابات الطلاب واعتمدي الدرجات يدويًا</p>
        </div>
        <button className="admin-logout-btn" onClick={() => navigate("/dashboard")} type="button"><FaArrowRight /> لوحة التحكم</button>
      </header>
      <main className="admin-main">
        {message && (
          <p
            role="status"
            aria-live="polite"
            style={{
              padding: 12,
              marginBottom: 16,
              borderRadius: 8,
              background: "#f3f4f6",
              color: "#3a2416",
              fontWeight: 800,
              overflowWrap: "anywhere",
            }}
          >
            {message}
          </p>
        )}
        {loading ? <p>جاري تحميل إجابات الطلاب...</p> : (
          <section className="admin-grid">
            {submissions.length === 0 && <div className="admin-welcome-card"><h2>لا توجد إجابات مقالية تنتظر التصحيح</h2><p>ستظهر هنا محاولات امتحان الشامل بعد تسليم الطلاب لها.</p></div>}
            {submissions.map((row) => (
              <article className="admin-card" key={`${row.student.id}-${row.result.examId}`}>
                <div className="admin-card-icon"><FaClipboardCheck /></div>
                <h3>{row.student.name || row.student.fullName || row.student.displayName || "طالب بدون اسم"}</h3>
                <p>{row.result.examTitle || "امتحان الشامل"}</p>
                <p>الحالة: {row.result.gradingStatus === "pending_essay" ? "بانتظار التصحيح" : "تم التصحيح"}</p>
                <p>أسئلة مقالية: {(row.result.answers || []).filter((answer) => answer.type === "essay").length}</p>
                <button type="button" className="admin-back-btn" onClick={() => openSubmission(row)}>فتح الإجابات وتصحيحها</button>
                <button type="button" className="admin-back-btn" style={{ marginTop: 8 }} disabled={saving} onClick={() => reopenAttempt(row)}><FaRedo /> إعادة فتح المحاولة</button>
              </article>
            ))}
          </section>
        )}
        {selected && (
          <section className="admin-welcome-card" style={{ marginTop: 24 }}>
            <h2>{selected.student.name || selected.student.fullName || selected.student.displayName || "الطالب"} — {selected.result.examTitle || "امتحان الشامل"}</h2>
            <p>درجة الاختيار المصححة تلقائيًا: {(selected.result.answers || []).filter((a) => a.type !== "essay").reduce((sum, a) => sum + Number(a.earnedPoints || 0), 0)}</p>
            {(selected.result.answers || []).filter((answer) => answer.type === "essay").map((answer, index) => (
              <div key={answer.questionId} style={{ padding: 16, marginTop: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                <h3>السؤال المقالي {index + 1}</h3>
                <p><strong>السؤال:</strong> {answer.question}</p>
                <p style={{ whiteSpace: "pre-wrap" }}><strong>إجابة الطالب:</strong> {answer.studentAnswer || "لم يكتب إجابة."}</p>
                <label style={{ display: "block", marginBottom: 6 }}>الدرجة التي يستحقها الطالب</label>
                <input type="number" min="0" step="0.5" value={grades[answer.questionId] ?? ""} onChange={(event) => setGrades((current) => ({ ...current, [answer.questionId]: event.target.value }))} style={{ width: "100%", maxWidth: 220, padding: 10 }} />
                <p style={{ fontSize: 13, opacity: 0.75 }}>اكتبي الدرجة التي تقررينها لهذا السؤال؛ لا يتم افتراض درجة قصوى.</p>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <button type="button" className="admin-back-btn" disabled={saving} onClick={approveGrades}><FaSave /> {saving ? "جاري الحفظ..." : "تم التصحيح واعتماد النتيجة"}</button>
              <button type="button" className="admin-back-btn" disabled={saving} onClick={() => setSelected(null)}>إلغاء</button>
              {message && (
                <p
                  role="status"
                  aria-live="polite"
                  style={{
                    flexBasis: "100%",
                    padding: 12,
                    marginTop: 8,
                    borderRadius: 8,
                    background: message.startsWith("تعذر") ? "#fff0f0" : "#fff6e8",
                    color: "#6b4228",
                    fontWeight: 800,
                    overflowWrap: "anywhere",
                  }}
                >
                  {message}
                </p>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default ComprehensiveEssayGrading;
