# مِداد — نسخة التطبيق (بدون سيرفر)

- المحادثات تنحفظ داخل الجهاز (localStorage)، ما في قاعدة بيانات ولا تسجيل دخول.
- الـ API ثابت: عدّل `client/src/lib/config.ts` (الرابط والمفتاح والنماذج).

## بناء الـ APK
**الطريقة 1 (بدون جهاز): GitHub Actions**
ارفع المجلد لمستودع GitHub، بعدها Actions ← Build APK ← Run workflow، وحمّل `medad-apk`.

**الطريقة 2: محلياً (يحتاج Android Studio + JDK 21)**
```bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
# الملف: android/app/build/outputs/apk/debug/app-debug.apk
```

> تنبيه: المفتاح داخل التطبيق يكدر أي واحد يفك الـ APK ويستخرجه. استخدم مفتاح بحد صرف (spending limit) أو مفتاح مخصص لهذا التطبيق فقط.
