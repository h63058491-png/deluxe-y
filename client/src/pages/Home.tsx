import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MODELS } from "@/lib/config";
import { ask } from "@/lib/ai";
import { deleteConversation, getConversation, listConversations, newId, saveConversation, type Conversation } from "@/lib/store";
import { Streamdown } from "streamdown";
import {
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  Code2,
  FileCode2,
  FileText,
  History,
  Menu,
  MessageSquarePlus,
  MoreHorizontal,
  Paperclip,
  PanelRightClose,
  PanelRightOpen,
  Send,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Mode = "chat" | "code" | "compare";
type LocalMessage = { id: string | number; role: "user" | "assistant"; content: string; model?: string | null; attachmentName?: string | null };

const suggestions = [
  { label: "خطط لي مشروع", icon: WandSparkles, prompt: "خطط لي مشروع صغير أقدر أبدأ بيه من العراق، وخليه بخطوات عملية." },
  { label: "صححلي كود", icon: Code2, prompt: "عندي كود وأريدك تراجعه وتشرحلي الأخطاء وتكتب النسخة المصححة." },
  { label: "اختصرلي موضوع", icon: FileText, prompt: "اختصرلي هذا الموضوع بنقاط بسيطة وواضحة، واذكر أهم الأفكار." },
];

function initials(name?: string | null) {
  return (name?.trim().slice(0, 1) || "م").toUpperCase();
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("chat");
  const [selectedModel, setSelectedModel] = useState("auto");
  const [prompt, setPrompt] = useState("");
  const [attachment, setAttachment] = useState<{ name: string; content: string } | undefined>();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === "undefined" ? true : window.innerWidth > 760);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationList, setConversationList] = useState<Conversation[]>(() => listConversations());
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const refreshList = () => setConversationList(listConversations());

  const availableModels = useMemo(
    () => [{ id: "auto", label: "تلقائي — يختار الأنسب", provider: "مِداد" }, ...MODELS],
    [],
  );

  const conversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? conversationList.filter(item => item.title.toLowerCase().includes(q)) : conversationList;
  }, [conversationList, search]);

  const openConversation = (id: string) => {
    const conversation = getConversation(id);
    if (!conversation) return;
    setActiveConversationId(id);
    setMessages(conversation.messages.map(message => ({
      id: message.id,
      role: message.role,
      content: message.content,
      model: message.model,
      attachmentName: message.attachmentName,
    })));
    setMode(conversation.mode || "chat");
    setSelectedModel(conversation.model || "auto");
    if (typeof window !== "undefined" && window.innerWidth <= 760) setSidebarOpen(false);
  };

  const deleteChat = (id: string) => {
    deleteConversation(id);
    setActiveConversationId(null);
    setMessages([]);
    refreshList();
    toast.success("انحذفت المحادثة");
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setPrompt("");
    setAttachment(undefined);
    setMode("chat");
    inputRef.current?.focus();
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    if (file.size > 100_000) {
      toast.error("الملف كبير. النسخة الأولى تدعم ملفات نصية إلى 100KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || "");
      setAttachment({ name: file.name, content: content.slice(0, 50_000) });
      toast.success(`تعلق الملف: ${file.name}`);
    };
    reader.onerror = () => toast.error("ما گدرت أقرأ الملف");
    reader.readAsText(file);
  };

  const submit = async () => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || sending) return;
    const now = Date.now();
    const existing = activeConversationId ? getConversation(activeConversationId) : undefined;
    const conversation: Conversation = existing ?? {
      id: newId(),
      title: cleanPrompt.slice(0, 72),
      mode,
      model: selectedModel === "auto" ? undefined : selectedModel,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    conversation.mode = mode;
    conversation.model = selectedModel === "auto" ? undefined : selectedModel;
    const previous = [...conversation.messages];
    const userMessage = {
      id: newId(),
      role: "user" as const,
      content: cleanPrompt,
      attachmentName: attachment?.name ?? null,
      attachmentContent: attachment?.content ?? null,
      createdAt: now,
    };
    conversation.messages.push(userMessage);
    conversation.updatedAt = now;
    saveConversation(conversation);
    setActiveConversationId(conversation.id);
    setMessages(current => [...current, { id: userMessage.id, role: "user", content: cleanPrompt, attachmentName: attachment?.name }]);
    const sentAttachment = attachment;
    setPrompt("");
    setAttachment(undefined);
    refreshList();
    setSending(true);
    try {
      const result = await ask({ mode, model: selectedModel, prompt: cleanPrompt, attachment: sentAttachment, previous });
      conversation.messages.push({ id: newId(), role: "assistant", content: result.answer, model: result.model, createdAt: Date.now() });
      conversation.updatedAt = Date.now();
      saveConversation(conversation);
      setMessages(current => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content: result.answer, model: result.model }]);
      refreshList();
    } catch (error) {
      console.error(error);
      toast.error("تعذر الوصول إلى نموذج الذكاء الاصطناعي حالياً. جرّب مرة ثانية.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="app-shell" dir="rtl">
      <aside className={`history-sidebar ${sidebarOpen ? "is-open" : "is-closed"}`}>
        <div className="sidebar-topline">
          <div className="brand-lockup">
            <div className="brand-mark">م</div>
            {sidebarOpen && <div><strong>مِداد</strong><span>مساحتك الذكية</span></div>}
          </div>
          <button className="icon-button subtle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="إظهار أو إخفاء السجل">
            {sidebarOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          </button>
        </div>
        {sidebarOpen && (
          <>
            <Button className="new-chat-button" onClick={startNewChat}><MessageSquarePlus size={18} /> محادثة جديدة</Button>
            <label className="search-box">
              <History size={16} />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث بالمحادثات" />
            </label>
            <div className="history-label"><span>المحفوظات</span><span>{conversations.length || 0}</span></div>
            <div className="conversation-list">
              {conversations.map(conversation => (
                <button key={conversation.id} className={`conversation-item ${activeConversationId === conversation.id ? "active" : ""}`} onClick={() => openConversation(conversation.id)}>
                  <MessageSquarePlus size={16} />
                  <span>{conversation.title}</span>
                </button>
              ))}
              {!conversations.length && <div className="empty-history">بعد ما عندك محادثات محفوظة.<br />ابدأ أول وحدة من هنا.</div>}
            </div>
            <div className="sidebar-note"><Sparkles size={15} /><span>اختار الوضع المناسب حتى تحصل على جواب أدق.</span></div>
            <div className="sidebar-footer"><div className="sidebar-note"><Sparkles size={15} /><span>محادثاتك محفوظة على جهازك فقط.</span></div></div>
          </>
        )}
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div className="header-context">
            <button className="mobile-menu icon-button" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
            <div className="eyebrow"><span className="status-dot" /> شغال وياك هسه</div>
            <h1>{activeConversationId ? "نكمل من وين وقفنا" : "شنو ننجز اليوم؟"}</h1>
          </div>
          <div className="header-actions">
            <div className="model-pill"><Bot size={15} /><select value={selectedModel} onChange={event => setSelectedModel(event.target.value)} aria-label="اختيار النموذج">
              {availableModels.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}
            </select><ChevronDown size={14} /></div>
          </div>
        </header>

        <section className="chat-stage">
          {!messages.length && !sending ? (
            <div className="welcome-panel">
              <div className="welcome-orbit"><div className="brand-mark brand-mark-xl">م</div><span className="orbit-dot dot-a" /><span className="orbit-dot dot-b" /><span className="orbit-dot dot-c" /></div>
              <Badge variant="outline" className="welcome-badge"><Sparkles size={13} /> نسخة أولى حقيقية</Badge>
              <h2>أهلاً، أنا <em>مِداد</em></h2>
              <p>مساعدك العربي للكتابة، الأفكار والبرمجة.<br />اكتب سؤالك، وأنا أرتبه وياك خطوة بخطوة.</p>
              <div className="suggestion-row">{suggestions.map(suggestion => <button key={suggestion.label} className="suggestion-card" onClick={() => { setPrompt(suggestion.prompt); inputRef.current?.focus(); }}><suggestion.icon size={18} /><span>{suggestion.label}</span><ChevronDown className="suggestion-arrow" size={15} /></button>)}</div>
            </div>
          ) : (
            <div className="message-stream">
              {messages.map(message => <article key={message.id} className={`message-row ${message.role}`}>
                <div className={`message-avatar ${message.role}`}>{message.role === "assistant" ? "م" : initials("أنت")}</div>
                <div className="message-content">
                  <div className="message-meta"><strong>{message.role === "assistant" ? "مِداد" : "أنت"}</strong>{message.role === "assistant" && message.model && <Badge variant="outline">{message.model}</Badge>}</div>
                  {message.attachmentName && <div className="attachment-chip"><FileCode2 size={14} /> {message.attachmentName}</div>}
                  <div className="message-body">{message.role === "assistant" ? <Streamdown>{message.content}</Streamdown> : <p>{message.content}</p>}</div>
                </div>
              </article>)}
              {sending && <article className="message-row assistant"><div className="message-avatar assistant">م</div><div className="message-content"><div className="message-meta"><strong>مِداد</strong><Badge variant="outline">يفكر...</Badge></div><div className="thinking-line"><span /><span /><span /> أرتب الجواب إلك</div></div></article>}
              <div className="stream-end" />
            </div>
          )}
        </section>

        <section className="composer-wrap">
          <div className="mode-tabs" role="tablist" aria-label="وضع المساعدة">
            <button className={mode === "chat" ? "selected" : ""} onClick={() => setMode("chat")}><Sparkles size={15} /> عادي</button>
            <button className={mode === "code" ? "selected code" : ""} onClick={() => setMode("code")}><Code2 size={15} /> برمجة</button>
            <button className={mode === "compare" ? "selected compare" : ""} onClick={() => setMode("compare")}><BrainCircuit size={15} /> قارن الإجابات</button>
          </div>
          {attachment && <div className="pending-attachment"><FileText size={15} /><span>{attachment.name}</span><button onClick={() => setAttachment(undefined)} aria-label="إزالة المرفق"><X size={14} /></button></div>}
          <div className="composer-box">
            <Textarea ref={inputRef} value={prompt} onChange={event => setPrompt(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder={mode === "code" ? "اكتب مشكلة الكود أو الصق الشيفرة هنا..." : "اكتب سؤالك هنا..."} rows={2} />
            <div className="composer-tools"><label className="attach-button" title="إرفاق ملف نصي أو شيفرة"><input type="file" accept=".txt,.md,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.sql,.java,.go,.rs" onChange={event => handleFile(event.target.files?.[0])} /><Paperclip size={18} /></label><span className="composer-tip">Enter للإرسال · Shift + Enter لسطر جديد</span><Button className="send-button" size="icon" onClick={() => void submit()} disabled={!prompt.trim() || sending} aria-label="إرسال"><Send size={18} /></Button></div>
          </div>
          <div className="composer-disclaimer"><span>مِداد ممكن يخطئ أحياناً، راجع المعلومات المهمة.</span>{activeConversationId && <button className="delete-chat" onClick={() => deleteChat(activeConversationId)}><Trash2 size={13} /> حذف المحادثة</button>}</div>
        </section>
      </main>
    </div>
  );
}
