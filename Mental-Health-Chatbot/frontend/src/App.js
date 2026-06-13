import { useState, useEffect } from "react";
import axios from "axios";
import Login        from "./Login";
import Signup       from "./Signup";
import ChatWindow   from "./ChatWindow";
import MoodDashboard from "./MoodDashboard";
import Journal      from "./Journal";
import Settings     from "./Settings";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function App() {
  const [user,      setUser]      = useState(null);
  const [authScreen, setAuthScreen] = useState("login"); // "login" | "signup"
  const [screen,    setScreen]    = useState("chat");
  const [restoring, setRestoring] = useState(true);    // checking saved token

  // ── Restore session from localStorage on app load ──────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("maia_token");
    if (!token) { setRestoring(false); return; }

    axios.get(`${API}/me?token=${token}`)
      .then(({ data }) => {
        setUser({
          id:            data.user_id,
          name:          data.name,
          email:         data.email,
          guardianPhone: data.guardian_phone,
          guardianEmail: data.guardian_email,
          consentGiven:  data.consent_given
        });
      })
      .catch(() => {
        localStorage.removeItem("maia_token"); // token expired or invalid
      })
      .finally(() => setRestoring(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("maia_token");
    setUser(null);
    setAuthScreen("login");
    setScreen("chat");
  };

  // ── Loading state while restoring session ──────────────────────────────────
  if (restoring) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
                    height: "100vh", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 36 }}>🌿</div>
        <p style={{ color: "#6b7280", fontSize: 14 }}>Loading Maia...</p>
      </div>
    );
  }

  // ── Not logged in — show auth screens ──────────────────────────────────────
  if (!user) {
    return authScreen === "signup"
      ? <Signup
          onSuccess={setUser}
          goToLogin={() => setAuthScreen("login")} />
      : <Login
          onSuccess={setUser}
          goToSignup={() => setAuthScreen("signup")} />;
  }

  // ── Logged in — show main app ───────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", height: "100vh",
                  display: "flex", flexDirection: "column",
                  fontFamily: "system-ui, sans-serif" }}>

      {/* Top navigation */}
      <nav style={{ display: "flex", gap: 4, padding: "8px 12px",
                    borderBottom: "1px solid #e5e7eb", background: "#fff",
                    alignItems: "center" }}>
        <div style={{ fontSize: 18, marginRight: 4 }}>🌿</div>

        {[["chat","Chat"],["journal","Journal"],["settings","Settings"]]
          .map(([id, label]) => (
          <button key={id} onClick={() => setScreen(id)}
            style={{ padding: "6px 14px", borderRadius: 8, border: "none",
                     cursor: "pointer", fontSize: 13,
                     fontWeight: screen === id ? 600 : 400,
                     background: screen === id ? "#7c3aed" : "transparent",
                     color: screen === id ? "#fff" : "#6b7280" }}>
            {label}
          </button>
        ))}

        {/* Right side — user info + logout */}
        <div style={{ marginLeft: "auto", display: "flex",
                      alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>
            Hi, {user.name.split(" ")[0]}
          </span>
          <button onClick={handleLogout}
            style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #e5e7eb",
                     background: "none", fontSize: 12, color: "#6b7280", cursor: "pointer" }}>
            Log out
          </button>
        </div>
      </nav>

      {/* Screen content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {screen === "chat"     && <ChatWindow     user={user} />}
        {screen === "mood"     && <MoodDashboard  user={user} />}
        {screen === "journal"  && <Journal        user={user} />}
        {screen === "settings" && <Settings       user={user} setUser={setUser} onLogout={handleLogout} />}
      </div>
    </div>
  );
}