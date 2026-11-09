// حفظ المحادثات داخل الجهاز (localStorage) — بدون سيرفر وبدون قاعدة بيانات.
export type Mode = "chat" | "code" | "compare";
export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string | null;
  attachmentName?: string | null;
  attachmentContent?: string | null;
  createdAt: number;
};
export type Conversation = {
  id: string;
  title: string;
  model?: string;
  mode: Mode;
  createdAt: number;
  updatedAt: number;
  messages: StoredMessage[];
};

const KEY = "medad.conversations.v1";

function read(): Conversation[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch {
    return [];
  }
}

function write(list: Conversation[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (error) {
    console.warn("[store] تعذر الحفظ", error);
  }
}

export const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function listConversations(): Conversation[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getConversation(id: string): Conversation | undefined {
  return read().find(item => item.id === id);
}

export function saveConversation(conversation: Conversation) {
  const list = read().filter(item => item.id !== conversation.id);
  list.push(conversation);
  write(list);
}

export function deleteConversation(id: string) {
  write(read().filter(item => item.id !== id));
}
