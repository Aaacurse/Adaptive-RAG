import { useState, useRef, useEffect } from "react";

const API = "http://localhost:8000";

const COLORS = {
  bg: "#0a0a0f",
  surface: "#12121a",
  border: "#1e1e2e",
  accent: "#6ee7b7",
  accentDim: "#1a3a2e",
  web: "#f59e0b",
  webDim: "#2d1f00",
  text: "#e2e8f0",
  muted: "#64748b",
  error: "#f87171",
  hover: "#1a1a2e",
};

const Badge = ({ route }) => {
  const isWeb = route === "web";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 999, fontSize: 11,
      fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
      background: isWeb ? COLORS.webDim : COLORS.accentDim,
      color: isWeb ? COLORS.web : COLORS.accent,
      border: `1px solid ${isWeb ? COLORS.web : COLORS.accent}22`,
    }}>
      <span style={{ fontSize: 8 }}>●</span>
      {isWeb ? "Web Search" : "Vector"}
    </span>
  );
};

const RelevanceBar = ({ score }) => {
  const pct = Math.round((score || 0) * 100);
  const color = pct >= 70 ? COLORS.accent : pct >= 40 ? COLORS.web : COLORS.error;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: COLORS.border, borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", background: color,
          borderRadius: 2, transition: "width 0.6s cubic-bezier(.16,1,.3,1)",
        }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 700, minWidth: 32 }}>{pct}%</span>
    </div>
  );
};

const TracePanel = ({ message }) => {
  if (!message || message.role !== "assistant" || !message.route_taken) return null;
  return (
    <div style={{
      marginTop: 10, padding: "10px 14px", background: COLORS.surface,
      border: `1px solid ${COLORS.border}`, borderRadius: 8,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: COLORS.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Trace
        </span>
        <Badge route={message.route_taken} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>Relevance Score</div>
        <RelevanceBar score={message.avg_relevance} />
      </div>
    </div>
  );
};

const Message = ({ message }) => {
  const isUser = message.role === "user";
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: isUser ? "flex-end" : "flex-start", marginBottom: 20,
    }}>
      <div style={{
        maxWidth: "75%", padding: "12px 16px",
        borderRadius: isUser ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
        background: isUser ? COLORS.accentDim : COLORS.surface,
        border: `1px solid ${isUser ? COLORS.accent + "33" : COLORS.border}`,
        color: COLORS.text, fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap",
      }}>
        {message.content}
        {message.warning && (
          <div style={{ marginTop: 8, fontSize: 12, color: COLORS.web, opacity: 0.8 }}>
            ⚠️ May contain unverified claims
          </div>
        )}
      </div>
      {!isUser && <TracePanel message={message} />}
    </div>
  );
};

const UploadZone = ({ onIngested }) => {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.endsWith(".txt") && !file.name.endsWith(".pdf")) {
      setStatus({ error: "Only .txt and .pdf files supported" });
      return;
    }
    setLoading(true);
    setStatus(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`${API}/ingest`, { method: "POST", body: form });
      const data = await res.json();
      setStatus({ success: `✓ ${data.filename} — ${data.chunks_stored} chunks stored` });
      onIngested && onIngested(data);
    } catch {
      setStatus({ error: "Upload failed. Is the server running?" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "0 0 16px" }}>
      <div
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        style={{
          border: `1.5px dashed ${dragging ? COLORS.accent : COLORS.border}`,
          borderRadius: 10, padding: "16px", textAlign: "center",
          cursor: "pointer", background: dragging ? COLORS.accentDim : "transparent",
          transition: "all 0.2s",
        }}
      >
        <input ref={inputRef} type="file" accept=".txt,.pdf"
          style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
        <div style={{ fontSize: 18, marginBottom: 4 }}>{loading ? "⏳" : "📄"}</div>
        <div style={{ fontSize: 12, color: COLORS.muted }}>
          {loading ? "Uploading..." : "Drop .txt or .pdf, or click"}
        </div>
      </div>
      {status && (
        <div style={{
          marginTop: 8, fontSize: 11, padding: "6px 10px", borderRadius: 6,
          background: status.error ? "#1f0a0a" : COLORS.accentDim,
          color: status.error ? COLORS.error : COLORS.accent,
          border: `1px solid ${status.error ? COLORS.error : COLORS.accent}22`,
        }}>
          {status.error || status.success}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const bottomRef = useRef();

  useEffect(() => { loadChats(); }, []);
  useEffect(() => {
    if (chats.length > 0) {
        const savedId = localStorage.getItem("activeChatId");
        if (savedId) {
            const chat = chats.find((c) => c.id === savedId);
            if (chat) switchChat(chat);
        }
    }
}, [chats]); 
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const loadChats = async () => {
    try {
      const res = await fetch(`${API}/chats`);
      const data = await res.json();
      setChats(data);
    } catch { console.error("Failed to load chats"); }
  };

  const createChat = async () => {
    try {
      const res = await fetch(`${API}/chats`, { method: "POST" });
      const chat = await res.json();
      setChats((prev) => [chat, ...prev]);
      switchChat(chat);
    } catch { console.error("Failed to create chat"); }
  };

  const switchChat = async (chat) => {
    setActiveChatId(chat.id);
    localStorage.setItem("activeChatId", chat.id);
    setChatHistory([]);
    try {
      const res = await fetch(`${API}/chats/${chat.id}`);
      const data = await res.json();
      const loadedMessages = (data.messages || []).map((m) => ({
        role: m.role, content: m.content,
        route_taken: m.route_taken, avg_relevance: m.avg_relevance,
      }));
      setMessages(loadedMessages);
      setChatHistory(loadedMessages.map((m) => ({ role: m.role, content: m.content })));
    } catch { setMessages([]); }
  };

  const deleteChat = async (e, chatId) => {
    e.stopPropagation();
    try {
      await fetch(`${API}/chats/${chatId}`, { method: "DELETE" });
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChatId === chatId) { setActiveChatId(null); setMessages([]); setChatHistory([]); }
    } catch { console.error("Failed to delete chat"); }
  };

  const startRename = (e, chat) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const saveRename = async (chatId) => {
    try {
      await fetch(`${API}/chats/${chatId}/title`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editingTitle }),
      });
      setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, title: editingTitle } : c));
    } catch { console.error("Failed to rename chat"); }
    finally { setEditingChatId(null); }
  };

  const sendQuery = async () => {
    const query = input.trim();
    if (!query || loading || !activeChatId) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, chat_id: activeChatId, chat_history: chatHistory }),
      });
      const data = await res.json();
      const hasWarning = data.answer?.includes("Warning:");
      const cleanAnswer = data.answer?.replace(/\n\n.*Warning:.*$/, "").trim();
      const assistantMsg = {
        role: "assistant", content: cleanAnswer || "No answer generated.",
        route_taken: data.route_taken, avg_relevance: data.avg_relevance, warning: hasWarning,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setChatHistory((prev) => [...prev, { role: "user", content: query }, { role: "assistant", content: cleanAnswer }]);

      // Auto-rename on first message
      const currentChat = chats.find((c) => c.id === activeChatId);
      if (currentChat?.title === "New Chat") {
        const newTitle = query.slice(0, 30) + (query.length > 30 ? "..." : "");
        await fetch(`${API}/chats/${activeChatId}/title`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });
        setChats((prev) => prev.map((c) => c.id === activeChatId ? { ...c, title: newTitle } : c));
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error connecting to backend." }]);
    } finally { setLoading(false); }
  };

  const activeChat = chats.find((c) => c.id === activeChatId);

  return (
    <div style={{ display: "flex", height: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'IBM Plex Mono', monospace" }}>
      {sidebarOpen && (
        <div style={{ width: 260, borderRight: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "16px 16px 8px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: COLORS.accent, fontWeight: 700, marginBottom: 12 }}>
              Adaptive RAG
            </div>
            <button onClick={createChat} style={{
              width: "100%", padding: "8px", borderRadius: 8,
              background: COLORS.accentDim, border: `1px solid ${COLORS.accent}33`,
              color: COLORS.accent, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>+ New Chat</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {chats.length === 0 && (
              <div style={{ fontSize: 12, color: COLORS.muted, textAlign: "center", marginTop: 20 }}>
                No chats yet. Create one!
              </div>
            )}
            {chats.map((chat) => (
              <div key={chat.id} onClick={() => switchChat(chat)} style={{
                padding: "8px 10px", borderRadius: 8, marginBottom: 4, cursor: "pointer",
                background: activeChatId === chat.id ? COLORS.accentDim : "transparent",
                border: `1px solid ${activeChatId === chat.id ? COLORS.accent + "33" : "transparent"}`,
                transition: "all 0.15s",
              }}>
                {editingChatId === chat.id ? (
                  <input value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => saveRename(chat.id)} onKeyDown={(e) => e.key === "Enter" && saveRename(chat.id)}
                    onClick={(e) => e.stopPropagation()} autoFocus
                    style={{
                      width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.accent}`,
                      borderRadius: 4, padding: "2px 6px", color: COLORS.text, fontSize: 12,
                      fontFamily: "inherit", outline: "none",
                    }} />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                    <span style={{ fontSize: 12, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {chat.title}
                    </span>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button onClick={(e) => startRename(e, chat)}
                        style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 11, padding: "0 2px" }}>✏️</button>
                      <button onClick={(e) => deleteChat(e, chat.id)}
                        style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 11, padding: "0 2px" }}>🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ padding: "12px 12px 0", borderTop: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 8 }}>Knowledge Base</div>
            <UploadZone />
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen((v) => !v)} style={{
            background: "none", border: `1px solid ${COLORS.border}`, color: COLORS.muted,
            borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 14,
          }}>{sidebarOpen ? "◀" : "▶"}</button>
          <span style={{ fontSize: 13, color: COLORS.muted }}>
            {activeChat ? activeChat.title : "Select or create a chat"}
          </span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {!activeChatId && (
            <div style={{ textAlign: "center", marginTop: 80, color: COLORS.muted }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>💬</div>
              <div style={{ fontSize: 14 }}>Create a new chat or select one from the sidebar</div>
            </div>
          )}
          {messages.map((msg, i) => <Message key={i} message={msg} />)}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.muted, fontSize: 13, marginBottom: 20 }}>
              <span style={{ animation: "pulse 1s infinite" }}>◆</span> Thinking...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: "16px 20px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, flexShrink: 0 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendQuery()}
            placeholder={activeChatId ? "Ask something about your documents..." : "Create a chat first..."}
            disabled={!activeChatId}
            style={{
              flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.border}`,
              borderRadius: 8, padding: "10px 14px", color: COLORS.text, fontSize: 14,
              outline: "none", fontFamily: "inherit", opacity: activeChatId ? 1 : 0.5,
            }} />
          <button onClick={sendQuery} disabled={loading || !input.trim() || !activeChatId}
            style={{
              background: loading || !input.trim() || !activeChatId ? COLORS.border : COLORS.accent,
              color: loading || !input.trim() || !activeChatId ? COLORS.muted : COLORS.bg,
              border: "none", borderRadius: 8, padding: "10px 18px",
              cursor: loading || !input.trim() || !activeChatId ? "not-allowed" : "pointer",
              fontSize: 13, fontWeight: 700, fontFamily: "inherit", transition: "all 0.15s",
            }}>Send</button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 2px; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}