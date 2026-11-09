import { API_BASE_URL, API_KEY, MODELS } from "./config";
import type { Mode, StoredMessage } from "./store";

type LLMMessage = { role: "system" | "user" | "assistant"; content: string };

export function systemPrompt(mode: Mode) {
  if (mode === "code") {
    return "أنت مساعد برمجة عربي عملي. اشرح قبل الكود باختصار، اكتب كوداً قابلاً للتشغيل، استخدم Markdown و fenced code blocks، واذكر الافتراضات والأخطاء المحتملة. لا تختلق نتائج تشغيل لم تنفذها. أجب بالعربية إلا إذا طلب المستخدم لغة أخرى.";
  }
  if (mode === "compare") {
    return "أنت مساعد دقيق. حلل السؤال بوضوح، افصل الحقائق عن الافتراضات، وأجب بالعربية. إذا كان الطلب برمجياً استخدم كتل كود منظمة.";
  }
  return "أنت مِداد، مساعد عربي واضح وودود. أجب باللهجة العراقية الخفيفة عندما تناسب السياق، وكن عملياً ومباشراً. استخدم Markdown عند الحاجة ولا تدّعي معلومات غير مؤكدة.";
}

async function callModel(messages: LLMMessage[], model: string) {
  const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 1800 }),
  });
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  const answer = typeof content === "string"
    ? content.trim()
    : Array.isArray(content)
      ? content.map((part: { text?: string }) => part.text ?? "").join("\n").trim()
      : "";
  if (!answer) throw new Error("لم يرجع النموذج جواباً نصياً");
  return { answer, model: (data?.model as string) || model };
}

export async function ask(options: {
  mode: Mode;
  model?: string;
  prompt: string;
  attachment?: { name: string; content: string };
  previous: StoredMessage[];
}): Promise<{ answer: string; model: string }> {
  const { mode, prompt, attachment, previous } = options;
  const primary = options.model && options.model !== "auto" ? options.model : MODELS[0].id;
  const userContent = attachment
    ? `${prompt}\n\nمرفق باسم ${attachment.name}:\n\n${attachment.content}`
    : prompt;
  const history: LLMMessage[] = [
    { role: "system", content: systemPrompt(mode) },
    ...previous.slice(-10).map(message => ({ role: message.role, content: message.content })),
    { role: "user", content: userContent },
  ];

  if (mode === "compare" && MODELS.length >= 2) {
    const candidates = [...new Set([primary, ...MODELS.map(item => item.id)])].slice(0, 2);
    const results = await Promise.all(candidates.map(id => callModel(history, id)));
    try {
      const merged = await callModel([
        { role: "system", content: "أنت محرر نهائي. ادمج إجابتين من نموذجين في جواب واحد أدق وأوضح. لا تذكر عملية المقارنة ولا تخترع معلومات جديدة. أجب بالعربية واستخدم Markdown." },
        { role: "user", content: `السؤال:\n${userContent}\n\nالإجابة الأولى (${results[0].model}):\n${results[0].answer}\n\nالإجابة الثانية (${results[1].model}):\n${results[1].answer}` },
      ], candidates[0]);
      return { answer: merged.answer, model: `مقارنة: ${results.map(item => item.model).join(" + ")}` };
    } catch {
      return results[0];
    }
  }
  return callModel(history, primary);
}
