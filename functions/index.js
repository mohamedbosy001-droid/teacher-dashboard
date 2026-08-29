const {
  onCall,
  HttpsError,
} = require("firebase-functions/v2/https");

const {
  setGlobalOptions,
} = require("firebase-functions/v2");

const admin = require("firebase-admin");

admin.initializeApp();

setGlobalOptions({
  maxInstances: 10,
});

const TEACHER_EMAIL =
  "ziadk@gmail.com";

exports.changeStudentPassword = onCall(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "يجب تسجيل الدخول أولًا."
      );
    }

    const loggedInEmail =
      request.auth.token.email || "";

    if (
      loggedInEmail.toLowerCase() !==
      TEACHER_EMAIL.toLowerCase()
    ) {
      throw new HttpsError(
        "permission-denied",
        "غير مسموح لك بتغيير كلمات المرور."
      );
    }

    const {
      uid,
      newPassword,
    } = request.data || {};

    if (!uid) {
      throw new HttpsError(
        "invalid-argument",
        "معرف الطالب غير موجود."
      );
    }

    if (
      typeof newPassword !== "string" ||
      newPassword.length < 6
    ) {
      throw new HttpsError(
        "invalid-argument",
        "كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام."
      );
    }

    try {
      await admin.auth().updateUser(
        uid,
        {
          password: newPassword,
        }
      );

      return {
        success: true,
        message:
          "تم تغيير كلمة مرور الطالب بنجاح.",
      };
    } catch (error) {
      console.error(error);

      throw new HttpsError(
        "internal",
        "حدث خطأ أثناء تغيير كلمة المرور."
      );
    }
  }
);