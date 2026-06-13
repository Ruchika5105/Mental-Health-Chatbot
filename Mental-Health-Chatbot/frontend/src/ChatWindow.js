import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API   = process.env.REACT_APP_API_URL || "http://localhost:8000";
const MOODS = ["😔","😟","😐","🙂","😊"];

const MODE_PILL = {
  crisis:        { bg: "#fef2f2", color: "#991b1b", label: "Crisis support" },
  cbt:           { bg: "#f3e8ff", color: "#6b21a8", label: "CBT mode" },
  vent:          { bg: "#eff6ff", color: "#1e40af", label: "Vent mode" },
  stress_relief: { bg: "#f0fdf4", color: "#166534", label: "Stress relief" },
  pst:           { bg: "#fff7ed", color: "#9a3412", label: "Problem solving" },
  general:       { bg: "#f9fafb", color: "#374151", label: "General support" }
};

const MODE_COLORS = {
  crisis: "#dc2626", cbt: "#7c3aed", vent: "#2563eb",
  stress_relief: "#16a34a", pst: "#ea580c", general: "#6b7280"
};

export default function ChatWindow({ user }) {
  const [messages,      setMessages]      = useState([]);
  const [input,         setInput]         = useState("");
  const [mode,          setMode]          = useState("general");
  const [loading,       setLoading]       = useState(false);
  const [moodDone,      setMoodDone]      = useState(false);
  const [moodScore,     setMoodScore]     = useState(3);
  const [alertSent,     setAlertSent]     = useState(false);
  const [showSosBanner, setShowSosBanner] = useState(false);
  const [showSidebar,   setShowSidebar]   = useState(false);
  const [sessions,      setSessions]      = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef(null);

  // ── Load chat history on mount ────────────────────────────────────────────
  useEffect(() => {
    loadHistory();
    loadSessions();
  }, [user.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const loadHistory = async () => {
    try {
      const { data } = await axios.get(`${API}/messages/${user.id}?limit=100`);
      if (data.length > 0) {
        setMessages(data.map(m => ({
          role:    m.role,
          content: m.content,
          mode:    m.mode
        })));
        setMoodDone(true);  // skip mood check-in if returning user
      } else {
        // First time — show welcome message
        setMessages([{
          role:    "assistant",
          content: `Hi ${user.name}! 🌿 I'm Maia, your mental health companion. How are you feeling today?`
        }]);
      }
    } catch (e) {
      setMessages([{
        role:    "assistant",
        content: `Welcome back, ${user.name}! 🌿 How are you feeling today?`
      }]);
    } finally {
      setHistoryLoaded(true);
    }
  };

  const loadSessions = async () => {
    try {
      const { data } = await axios.get(`${API}/sessions/${user.id}`);
      setSessions(data);
    } catch (e) {
      console.log("Could not load sessions");
    }
  };

  const handleMoodSelect = async (i) => {
    const score = i + 1;
    setMoodScore(score);
    setMoodDone(true);
    await axios.post(`${API}/mood`, { user_id: user.id, mood_score: score });
    const reply = score <= 2
      ? "I'm really sorry you're feeling that way. I'm here for you — take your time."
      : score === 3
      ? "Thanks for checking in. What's on your mind today?"
      : "That's lovely to hear! How can I support you today?";
    setMessages(prev => [...prev, { role: "assistant", content: reply }]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg    = { role: "user", content: input };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const { data } = await axios.post(`${API}/chat`, {
        user_id:                user.id,
        message:                input,
        mood_score:             moodScore,
        alert_sent_this_session: alertSent,
        history:                messages
          .filter(m => m.role !== "system-alert")
          .slice(-20)           // last 20 messages for context
          .map(m => ({ role: m.role, content: m.content }))
      });

      const assistantMsg = { role: "assistant", content: data.reply, mode: data.mode };
      setMessages([...newHistory, assistantMsg]);
      setMode(data.mode);

      // Refresh sidebar after new message
      loadSessions();

      if (data.sos_triggered && !alertSent) {
        setAlertSent(true);
        setShowSosBanner(true);
        setMessages(prev => [...prev, {
          role:    "system-alert",
          content: "We've notified your emergency contact. You are not alone. 💙"
        }]);
      }
    } catch {
      setMessages([...newHistory, {
        role:    "assistant",
        content: "Sorry, I had trouble connecting. Please try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!window.confirm("Clear all chat history? This cannot be undone.")) return;
    await axios.delete(`${API}/messages/${user.id}`);
    setMessages([{
      role:    "assistant",
      content: `Chat cleared. Hi ${user.name}! How are you feeling today?`
    }]);
    setMoodDone(false);
    setSessions([]);
  };

  const pill = MODE_PILL[mode] || MODE_PILL.general;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      {showSidebar && (
        <div style={{
          width: 260, borderRight: "1px solid #e5e7eb", background: "#fafafa",
          display: "flex", flexDirection: "column", flexShrink: 0
        }}>
          {/* Sidebar header */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #e5e7eb",
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Recent chats
            </span>
            <button onClick={() => setShowSidebar(false)}
              style={{ background: "none", border: "none",
                       cursor: "pointer", fontSize: 18, color: "#9ca3af" }}>×</button>
          </div>

          {/* Clear history button */}
          <div style={{ padding: "8px 14px", borderBottom: "1px solid #f3f4f6" }}>
            <button onClick={clearHistory}
              style={{ width: "100%", padding: "6px 0", background: "none",
                       border: "1px solid #e5e7eb", borderRadius: 6,
                       fontSize: 12, color: "#6b7280", cursor: "pointer" }}>
              🗑 Clear chat history
            </button>
          </div>

          {/* Sessions list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {sessions.length === 0 ? (
              <p style={{ fontSize: 12, color: "#9ca3af",
                          textAlign: "center", padding: 20 }}>
                No chat history yet
              </p>
            ) : (
              sessions.map((session, si) => (
                <div key={si}>
                  {/* Date header */}
                  <div style={{ padding: "8px 14px 4px",
                                fontSize: 11, fontWeight: 600,
                                color: "#9ca3af", letterSpacing: "0.05em",
                                textTransform: "uppercase" }}>
                    {session.date}
                  </div>

                  {/* Message previews */}
                  {session.messages.map((msg, mi) => (
                    <div key={mi} style={{
                      padding: "8px 14px", cursor: "pointer",
                      borderLeft: `3px solid ${MODE_COLORS[msg.mode] || "#e5e7eb"}`,
                      margin: "2px 8px", borderRadius: "0 6px 6px 0",
                      background: "#fff"
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"}
                      onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                      <div style={{ fontSize: 12, color: "#374151",
                                    lineHeight: 1.4, marginBottom: 3 }}>
                        {msg.preview}
                      </div>
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>
                        {msg.time} · {(MODE_PILL[msg.mode] || MODE_PILL.general).label}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Main chat area ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column",
                    overflow: "hidden", padding: 12 }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center",
                      gap: 8, marginBottom: 8 }}>
          {/* Sidebar toggle */}
          <button onClick={() => setShowSidebar(!showSidebar)}
            title="Recent chats"
            style={{ background: showSidebar ? "#f3e8ff" : "none",
                     border: "1px solid #e5e7eb", borderRadius: 8,
                     padding: "5px 10px", cursor: "pointer",
                     fontSize: 16, color: "#7c3aed" }}>
            💬
          </button>

          {/* Mode badge */}
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20,
                         background: pill.bg, color: pill.color,
                         fontWeight: 500, border: `1px solid ${pill.color}22` }}>
            {pill.label}
          </span>

          {/* Disclaimer */}
          <span style={{ marginLeft: "auto", fontSize: 10,
                         color: "#9ca3af" }}>
            AI companion · Not a therapist
          </span>
        </div>

        {/* SOS banner */}
        {showSosBanner && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5",
                        borderRadius: 8, padding: "10px 14px", marginBottom: 8,
                        fontSize: 13, color: "#991b1b",
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center" }}>
            <span>🚨 Emergency contact has been notified.</span>
            <button onClick={() => setShowSosBanner(false)}
              style={{ background: "none", border: "none",
                       cursor: "pointer", color: "#991b1b", fontSize: 18 }}>×</button>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto",
                      display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Mood check-in */}
          {!moodDone && historyLoaded && (
            <div style={{ background: "#f3e8ff", borderRadius: 12,
                          padding: "14px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 500,
                          marginBottom: 12, color: "#6b21a8" }}>
                How are you feeling right now?
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
                {MOODS.map((e, i) => (
                  <button key={i} onClick={() => handleMoodSelect(i)}
                    style={{ fontSize: 26, background: "none", border: "none",
                             cursor: "pointer", transition: "transform .1s" }}
                    onMouseEnter={ev => ev.target.style.transform = "scale(1.35)"}
                    onMouseLeave={ev => ev.target.style.transform = "scale(1)"}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((m, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end"
                            : m.role === "system-alert" ? "center"
                            : "flex-start"
            }}>
              {m.role === "system-alert" ? (
                <div style={{ background: "#fef9c3", color: "#713f12",
                              fontSize: 13, padding: "8px 16px",
                              borderRadius: 20, fontWeight: 500 }}>
                  {m.content}
                </div>
              ) : (
                <div style={{
                  maxWidth: "78%", padding: "10px 14px",
                  borderRadius: 18, fontSize: 14, lineHeight: 1.6,
                  borderBottomRightRadius: m.role === "user" ? 4 : 18,
                  borderBottomLeftRadius:  m.role === "user" ? 18 : 4,
                  background: m.role === "user" ? "#7c3aed" : "#f3f4f6",
                  color:      m.role === "user" ? "#fff"    : "#111827"
                }}>
                  {m.content}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: "flex" }}>
              <div style={{ background: "#f3f4f6", padding: "10px 16px",
                            borderRadius: 18, borderBottomLeftRadius: 4 }}>
                <div style={{ display: "flex", gap: 5 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: "#9ca3af",
                      animation: "bounce 1s infinite",
                      animationDelay: `${i * 0.15}s`
                    }}/>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Share what's on your mind..."
            style={{ flex: 1, padding: "10px 16px", borderRadius: 24,
                     fontSize: 14, border: "1px solid #d1d5db", outline: "none" }}
          />
          <button onClick={sendMessage} disabled={loading}
            style={{ background: "#7c3aed", color: "#fff", border: "none",
                     borderRadius: 24, padding: "10px 20px", fontSize: 14,
                     cursor: "pointer", opacity: loading ? 0.5 : 1 }}>
            Send
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%,80%,100% { transform: translateY(0) }
          40%          { transform: translateY(-5px) }
        }
      `}</style>
    </div>
  );
}