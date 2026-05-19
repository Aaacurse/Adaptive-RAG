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
};

const Badge = ({ route }) => {
  const isWeb = route === "web";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        background: isWeb ? COLORS.webDim : COLORS.accentDim,
        color: isWeb ? COLORS.web : COLORS.accent,
        border: `1px solid ${isWeb ? COLORS.web : COLORS.accent}22`,
      }}
    >
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
      <div
        style={{
          flex: 1,
          height: 4,
          background: COLORS.border,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 2,
            transition: "width 0.6s cubic-bezier(.16,1,.3,1)",
          }}
        />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 700, minWidth: 32 }}>{pct}%</span>
    </div>
  );
};

const TracePanel = ({ message }) => {
  if (!message || message.role !== "assistant") return null;
  const { route_taken, avg_relevance } = message;
  if (!route_taken) return null;
  return (
    <div
      style={{
        marginTop: 10,
        padding: "10px 14px",
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: COLORS.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Trace
        </span>
        <Badge route={route_taken} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>Relevance Score</div>
        <RelevanceBar score={avg_relevance} />
      </div>
    </div>
  );
};

const Message = ({ message }) => {
  const isUser = message.role === "user";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        marginBottom: 20,
      }}
    >
      <div
        style={{
          maxWidth: "75%",
          padding: "12px 16px",
          borderRadius: isUser ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
          background: isUser ? COLORS.accentDim : COLORS.surface,
          border: `1px solid ${isUser ? COLORS.accent + "33" : COLORS.border}`,
          color: COLORS.text,
          fontSize: 14,
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
        }}
      >
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
          borderRadius: 10,
          padding: "20px 16px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? COLORS.accentDim : "transparent",
          transition: "all 0.2s",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.pdf"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <div style={{ fontSize: 22, marginBottom: 6 }}>{loading ? "⏳" : "📄"}</div>
        <div style={{ fontSize: 13, color: COLORS.muted }}>
          {loading ? "Uploading..." : "Drop a .txt or .pdf file, or click to browse"}
        </div>
      </div>
      {status && (
        <div style={{
          marginTop: 8,
          fontSize: 12,
          padding: "6px 10px",
          borderRadius: 6,
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
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! Upload a document and ask me anything about it. I'll search your knowledge base first, and fall back to the web if needed.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendQuery = async () => {
    const query = input.trim();
    if (!query || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      const hasWarning = data.answer?.includes("Warning:");
      const cleanAnswer = data.answer?.replace(/\n\n.*Warning:.*$/, "").trim();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: cleanAnswer || "No answer generated.",
          route_taken: data.route_taken,
          avg_relevance: data.avg_relevance,
          warning: hasWarning,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error connecting to backend. Is the server running?" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Sidebar */}
      {sidebarOpen && (
        <div style={{
          width: 280,
          borderRight: `1px solid ${COLORS.border}`,
          display: "flex",
          flexDirection: "column",
          padding: 20,
          gap: 0,
          flexShrink: 0,
        }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: COLORS.accent, fontWeight: 700, marginBottom: 4 }}>
              Adaptive RAG
            </div>
            <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.5 }}>
              Upload documents to your knowledge base
            </div>
          </div>
          <UploadZone />
          <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 11, color: COLORS.muted, lineHeight: 1.6 }}>
              <div style={{ marginBottom: 4, color: COLORS.text, fontWeight: 600 }}>How it works</div>
              <div>1. Upload a .txt or .pdf file</div>
              <div>2. Ask a question</div>
              <div>3. Vector search runs first</div>
              <div>4. Falls back to web if needed</div>
            </div>
          </div>
        </div>
      )}

      {/* Main chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          padding: "14px 20px",
          borderBottom: `1px solid ${COLORS.border}`,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            style={{
              background: "none",
              border: `1px solid ${COLORS.border}`,
              color: COLORS.muted,
              borderRadius: 6,
              padding: "4px 8px",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
          <span style={{ fontSize: 13, color: COLORS.muted }}>Chat</span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {messages.map((msg, i) => (
            <Message key={i} message={msg} />
          ))}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.muted, fontSize: 13, marginBottom: 20 }}>
              <span style={{ animation: "pulse 1s infinite" }}>◆</span> Thinking...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "16px 20px",
          borderTop: `1px solid ${COLORS.border}`,
          display: "flex",
          gap: 10,
          flexShrink: 0,
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendQuery()}
            placeholder="Ask something about your documents..."
            style={{
              flex: 1,
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding: "10px 14px",
              color: COLORS.text,
              fontSize: 14,
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={sendQuery}
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? COLORS.border : COLORS.accent,
              color: loading || !input.trim() ? COLORS.muted : COLORS.bg,
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            Send
          </button>
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
