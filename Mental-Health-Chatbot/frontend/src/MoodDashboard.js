import { useEffect, useState } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip,
         ResponsiveContainer, CartesianGrid } from "recharts";

const API  = "http://localhost:8000";
const MOODS = ["","😔","😟","😐","🙂","😊"];

export default function MoodDashboard({ user }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    axios.get(`${API}/mood/${user.id}`).then(({ data }) => {
      setLogs(data.reverse().map((l, i) => ({
        day:   `Day ${i + 1}`,
        mood:  l.mood_score,
        label: l.emotion,
        mode:  l.mode
      })));
    });
  }, [user.id]);

  const avg = logs.length
    ? (logs.reduce((s, l) => s + l.mood, 0) / logs.length).toFixed(1)
    : "-";

  return (
    <div style={{ padding: 20, overflowY: "auto", height: "100%" }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Your mood over time</h2>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
        Average: {avg}/5 over {logs.length} check-ins
      </p>

      {logs.length === 0 ? (
        <div style={{ textAlign: "center", color: "#9ca3af", marginTop: 60 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
          <p>No mood data yet. Start chatting with Maia!</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={logs}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]}
                tickFormatter={v => MOODS[v]} tick={{ fontSize: 14 }} />
              <Tooltip formatter={(v) => [MOODS[v], "Mood"]} />
              <Line type="monotone" dataKey="mood" stroke="#7c3aed"
                strokeWidth={2} dot={{ r: 4, fill: "#7c3aed" }} />
            </LineChart>
          </ResponsiveContainer>

          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "24px 0 12px" }}>Recent check-ins</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...logs].reverse().slice(0, 10).map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12,
                                    padding: "10px 14px", background: "#f9fafb",
                                    borderRadius: 10, fontSize: 13 }}>
                <span style={{ fontSize: 22 }}>{MOODS[l.mood]}</span>
                <div>
                  <div style={{ fontWeight: 500, textTransform: "capitalize" }}>{l.label}</div>
                  <div style={{ color: "#9ca3af", fontSize: 11 }}>{l.mode} mode</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}