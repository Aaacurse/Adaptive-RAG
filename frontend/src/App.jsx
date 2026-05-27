import { useState, useRef, useEffect, useCallback } from "react";

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
  errorDim: "#1f0a0a",
  hover: "#1a1a2e",
};

// ─── Auth helpers ────────────────────────────────────────────────────────────

const getToken = () => localStorage.getItem("token");
const setToken = (t) => localStorage.setItem("token", t);
const removeToken = () => localStorage.removeItem("token");

/** Wrapper around fetch that injects the JWT and handles 401 globally */
const authFetch = async (url, options = {}, onUnauthorized) => {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    removeToken();
    onUnauthorized?.();
    throw new Error("Unauthorized");
  }
  return res;
};

// ─── Shared small components ─────────────────────────────────────────────────

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
        <span style={{ fontSize: 11, color: COLORS.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Trace</span>
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", marginBottom: 20 }}>
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

// ─── Upload zone (needs token) ────────────────────────────────────────────────

const UploadZone = ({ onIngested, onUnauthorized }) => {
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
      const res = await authFetch(`${API}/ingest`, { method: "POST", body: form }, onUnauthorized);
      const data = await res.json();
      setStatus({ success: `✓ ${data.filename} — ${data.chunks_stored} chunks stored` });
      onIngested?.(data);
    } catch (err) {
      if (err.message !== "Unauthorized") setStatus({ error: "Upload failed. Is the server running?" });
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
          background: status.error ? COLORS.errorDim : COLORS.accentDim,
          color: status.error ? COLORS.error : COLORS.accent,
          border: `1px solid ${status.error ? COLORS.error : COLORS.accent}22`,
        }}>
          {status.error || status.success}
        </div>
      )}
    </div>
  );
};

// ─── Auth screen (Login + Register) ──────────────────────────────────────────

const AuthScreen = ({ onAuth }) => {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const inputStyle = {
    width: "100%", background: COLORS.surface,
    border: `1px solid ${COLORS.border}`, borderRadius: 8,
    padding: "10px 14px", color: COLORS.text, fontSize: 13,
    fontFamily: "inherit", outline: "none",
    transition: "border-color 0.2s",
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "register") {
        // 1. Register
        const res = await fetch(`${API}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Registration failed");
        }
        setSuccess("Account created! Logging you in…");
        // Fall through to auto-login after register
      }

      // 2. Login (also runs after successful register)
      const form = new URLSearchParams();
      form.append("username", email.trim()); // FastAPI OAuth2 uses "username" field
      form.append("password", password);
      const loginRes = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      if (!loginRes.ok) {
        const err = await loginRes.json();
        throw new Error(err.detail || "Login failed");
      }
      const data = await loginRes.json();
      setToken(data.access_token);
      onAuth(data.access_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: COLORS.bg, fontFamily: "'IBM Plex Mono', monospace",
    }}>
      {/* Subtle grid background */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: `linear-gradient(${COLORS.border}33 1px, transparent 1px),
                          linear-gradient(90deg, ${COLORS.border}33 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
        maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent)",
      }} />

      <div style={{
        position: "relative", width: "100%", maxWidth: 400,
        padding: 32, background: COLORS.surface,
        border: `1px solid ${COLORS.border}`, borderRadius: 16,
        boxShadow: `0 0 60px ${COLORS.accent}11`,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase",
            color: COLORS.accent, fontWeight: 700, marginBottom: 6,
          }}>
            ◆ Adaptive RAG
          </div>
          <div style={{ fontSize: 20, color: COLORS.text, fontWeight: 700 }}>
            {mode === "login" ? "Welcome back" : "Create account"}
          </div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>
            {mode === "login" ? "Sign in to continue" : "Join to get started"}
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: "flex", background: COLORS.bg, borderRadius: 8,
          padding: 3, marginBottom: 22, border: `1px solid ${COLORS.border}`,
        }}>
          {["login", "register"].map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(null); setSuccess(null); }}
              style={{
                flex: 1, padding: "7px", borderRadius: 6, border: "none",
                background: mode === m ? COLORS.accentDim : "transparent",
                color: mode === m ? COLORS.accent : COLORS.muted,
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.06em",
                transition: "all 0.15s",
              }}>
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: COLORS.muted, display: "block", marginBottom: 5, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Email
            </label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown} placeholder="you@example.com"
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = COLORS.accent}
              onBlur={(e) => e.target.style.borderColor = COLORS.border}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: COLORS.muted, display: "block", marginBottom: 5, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown} placeholder="••••••••"
                style={{ ...inputStyle, paddingRight: 42 }}
                onFocus={(e) => e.target.style.borderColor = COLORS.accent}
                onBlur={(e) => e.target.style.borderColor = COLORS.border}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: COLORS.muted, padding: 0, lineHeight: 1,
                  fontSize: 16, display: "flex", alignItems: "center",
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  // Eye-off SVG
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  // Eye SVG
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error / success */}
        {error && (
          <div style={{
            marginTop: 12, padding: "8px 12px", borderRadius: 6, fontSize: 12,
            background: COLORS.errorDim, color: COLORS.error,
            border: `1px solid ${COLORS.error}22`,
          }}>
            ✕ {error}
          </div>
        )}
        {success && (
          <div style={{
            marginTop: 12, padding: "8px 12px", borderRadius: 6, fontSize: 12,
            background: COLORS.accentDim, color: COLORS.accent,
            border: `1px solid ${COLORS.accent}22`,
          }}>
            ✓ {success}
          </div>
        )}

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading}
          style={{
            width: "100%", marginTop: 20, padding: "11px",
            background: loading ? COLORS.border : COLORS.accent,
            color: loading ? COLORS.muted : COLORS.bg,
            border: "none", borderRadius: 8,
            fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase",
            transition: "all 0.15s",
          }}>
          {loading ? "Please wait…" : mode === "login" ? "Sign In →" : "Create Account →"}
        </button>
      </div>
    </div>
  );
};

// ─── Main chat app ────────────────────────────────────────────────────────────

function ChatApp({ onLogout }) {
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

  // Called whenever the backend returns 401 — token expired / invalid
  const handleUnauthorized = useCallback(() => {
    removeToken();
    onLogout();
  }, [onLogout]);

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
      const res = await authFetch(`${API}/chats`, {}, handleUnauthorized);
      const data = await res.json();
      setChats(data);
    } catch (err) {
      if (err.message !== "Unauthorized") console.error("Failed to load chats");
    }
  };

  const createChat = async () => {
    try {
      const res = await authFetch(`${API}/chats`, { method: "POST" }, handleUnauthorized);
      const chat = await res.json();
      setChats((prev) => [chat, ...prev]);
      switchChat(chat);
    } catch (err) {
      if (err.message !== "Unauthorized") console.error("Failed to create chat");
    }
  };

  const switchChat = async (chat) => {
    setActiveChatId(chat.id);
    localStorage.setItem("activeChatId", chat.id);
    setChatHistory([]);
    try {
      const res = await authFetch(`${API}/chats/${chat.id}`, {}, handleUnauthorized);
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
      await authFetch(`${API}/chats/${chatId}`, { method: "DELETE" }, handleUnauthorized);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChatId === chatId) { setActiveChatId(null); setMessages([]); setChatHistory([]); }
    } catch (err) {
      if (err.message !== "Unauthorized") console.error("Failed to delete chat");
    }
  };

  const startRename = (e, chat) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const saveRename = async (chatId) => {
    try {
      await authFetch(`${API}/chats/${chatId}/title`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editingTitle }),
      }, handleUnauthorized);
      setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, title: editingTitle } : c));
    } catch (err) {
      if (err.message !== "Unauthorized") console.error("Failed to rename chat");
    } finally { setEditingChatId(null); }
  };

  const sendQuery = async () => {
    const query = input.trim();
    if (!query || loading || !activeChatId) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setLoading(true);
    try {
      const res = await authFetch(`${API}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, chat_id: activeChatId, chat_history: chatHistory }),
      }, handleUnauthorized);
      const data = await res.json();
      const hasWarning = data.answer?.includes("Warning:");
      const cleanAnswer = data.answer?.replace(/\n\n.*Warning:.*$/, "").trim();
      const assistantMsg = {
        role: "assistant", content: cleanAnswer || "No answer generated.",
        route_taken: data.route_taken, avg_relevance: data.avg_relevance, warning: hasWarning,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setChatHistory((prev) => [...prev,
        { role: "user", content: query },
        { role: "assistant", content: cleanAnswer },
      ]);

      // Auto-rename on first message
      const currentChat = chats.find((c) => c.id === activeChatId);
      if (currentChat?.title === "New Chat") {
        const newTitle = query.slice(0, 30) + (query.length > 30 ? "..." : "");
        await authFetch(`${API}/chats/${activeChatId}/title`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        }, handleUnauthorized);
        setChats((prev) => prev.map((c) => c.id === activeChatId ? { ...c, title: newTitle } : c));
      }
    } catch (err) {
      if (err.message !== "Unauthorized")
        setMessages((prev) => [...prev, { role: "assistant", content: "Error connecting to backend." }]);
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    removeToken();
    localStorage.removeItem("activeChatId");
    onLogout();
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
            <UploadZone onUnauthorized={handleUnauthorized} />
          </div>

          {/* Logout button at the very bottom of the sidebar */}
          <div style={{ padding: "10px 12px", borderTop: `1px solid ${COLORS.border}` }}>
            <button onClick={handleLogout} style={{
              width: "100%", padding: "8px", borderRadius: 8,
              background: "transparent", border: `1px solid ${COLORS.border}`,
              color: COLORS.muted, fontSize: 11, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
              letterSpacing: "0.06em", textTransform: "uppercase",
              transition: "all 0.15s",
            }}
              onMouseOver={(e) => { e.target.style.borderColor = COLORS.error; e.target.style.color = COLORS.error; }}
              onMouseOut={(e) => { e.target.style.borderColor = COLORS.border; e.target.style.color = COLORS.muted; }}
            >
              ⎋ Sign Out
            </button>
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

// ─── Root: decides whether to show auth or app ───────────────────────────────

export default function App() {
  // initialise from localStorage so page refresh keeps you logged in
  const [token, setTokenState] = useState(() => getToken());

  const handleAuth = (newToken) => {
    setToken(newToken);
    setTokenState(newToken);
  };

  const handleLogout = () => {
    removeToken();
    setTokenState(null);
  };

  if (!token) return <AuthScreen onAuth={handleAuth} />;
  return <ChatApp onLogout={handleLogout} />;
}