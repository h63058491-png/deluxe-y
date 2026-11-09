// ============================================================
//  إعدادات ثابتة للـ API — عدّل هذي القيم فقط قبل بناء الـ APK
//  (الـ API مثبت داخل التطبيق ومحد يحتاج يدخله)
// ============================================================
// أي مزود متوافق مع OpenAI: OpenRouter / OpenAI / Groq / DeepSeek ...
export const API_BASE_URL = "https://openrouter.ai/api/v1";
export const API_KEY = "ضع_مفتاح_الـAPI_هنا";

// النماذج الظاهرة بالقائمة. أول واحد هو الافتراضي (تلقائي).
export const MODELS: { id: string; label: string }[] = [
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini" },
  { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
];
