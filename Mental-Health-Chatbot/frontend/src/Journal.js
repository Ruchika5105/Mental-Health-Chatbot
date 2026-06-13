import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000";
const PROMPTS = [
  "What's one thing that made you feel something today?",
  "What's weighing on you right now?",
  "What's one small thing you're grateful for?",
  "What would you tell a friend going through what you're going through?",
  "What do you need more of in your life right now?"
];

export default function Journal({ user }) {
  const [entries,  setEntries]  = useState([]);
  const [content,  setContent]  = useState("");
  const [prompt,   setPrompt]   = useState(PROMPTS[0]);
  const [saved,    setSaved]    = useState(false);

  useEffect(() => {
    axios.get(`${API}/journal/${user.id}`).then(({ data }) => setEntries(data));
    setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  }, [user.id]);

  const save = async () => {
    if (!content.trim()) return;
    await axios.post(`${API}/journal`, { user_id: user.id, content, prompt });
    setEntries(prev => [{ content, prompt, timestamp: new Date().toISOString() }, ...prev]);
    setContent("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ padding: 20, overflowY: "auto", height: "100%" }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Journal</h2>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
        A private space to put your thoughts into words.
      </p>

      <div style={{ background: "#f3e8ff", borderRadius: 10, padding: 14, marginBottom: 12 }}>
        <p style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600, margin: "0 0 4px" }}>Today's prompt</p>
        <p style={{ fontSize: 14, color: "#4c1d95", margin: 0 }}>{prompt}</p>
      </div>

      <textarea value={content} onChange={e => setContent(e.target.value)}
        placeholder="Write freely — no one else will see this..."
        style={{ width: "100%", minHeight: 140, padding: 14, borderRadius: 10, fontSize: 14,
                 border: "1px solid #d1d5db", resize: "vertical", boxSizing: "border-box",
                 lineHeight: 1.6, outline: "none" }} />

      <button onClick={save} disabled={!content.trim()}
        style={{ marginTop: 8, padding: "10px 24px", background: "#7c3aed", color: "#fff",
                 border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer",
                 opacity: !content.trim() ? 0.5 : 1 }}>
        {saved ? "Saved ✓" : "Save entry"}
      </button>

      {entries.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "28px 0 12px" }}>Past entries</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {entries.map((e, i) => (
              <div key={i} style={{ background: "#f9fafb", borderRadius: 10,
                                    padding: 14, fontSize: 13 }}>
                <p style={{ color: "#9ca3af", fontSize: 11, margin: "0 0 6px" }}>
                  {new Date(e.timestamp).toLocaleDateString("en-IN",
                    { day: "numeric", month: "short", year: "numeric" })}
                  {e.prompt && ` — ${e.prompt}`}
                </p>
                <p style={{ margin: 0, lineHeight: 1.6, color: "#374151" }}>{e.content}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}