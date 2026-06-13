import { useState } from "react";
import axios from "axios";

const API = "http://localhost:8000";

export default function Login({ onSuccess, goToSignup }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const submit = async () => {
    if (!email || !password) { setError("Please fill in all fields"); return; }
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/login`, { email, password });
      localStorage.setItem("maia_token", data.token);
      onSuccess({
        id:            data.user_id,
        name:          data.name,
        email:         data.email,
        guardianPhone: data.guardian_phone,
        guardianEmail: data.guardian_email,
        consentGiven:  data.consent_given
      });
    } catch (e) {
      setError(e.response?.data?.detail || "Login failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={wrap}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 40 }}>🌿</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "8px 0 4px" }}>
          Welcome back
        </h1>
        <p style={{ color: "#6b7280", fontSize: 13 }}>
          Log in to continue with Maia
        </p>
      </div>

      <label style={lbl}>Email address
        <input type="email" value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="your@email.com" style={inp} />
      </label>

      <label style={lbl}>Password
        <input type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="Your password" style={inp} />
      </label>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5",
                      borderRadius: 8, padding: "10px 14px", marginBottom: 14,
                      fontSize: 13, color: "#dc2626" }}>
          {error}
        </div>
      )}

      <button onClick={submit} disabled={loading}
        style={{ ...btn, opacity: loading ? 0.6 : 1 }}>
        {loading ? "Logging in..." : "Log in"}
      </button>

      <p style={{ textAlign: "center", fontSize: 13, color: "#6b7280", marginTop: 16 }}>
        Don't have an account?{" "}
        <span onClick={goToSignup}
          style={{ color: "#7c3aed", cursor: "pointer", fontWeight: 500 }}>
          Sign up
        </span>
      </p>

      <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 12 }}>
        Crisis helpline: iCall 9152987821
      </p>
    </div>
  );
}

const wrap = { maxWidth: 440, margin: "60px auto", padding: "0 20px" };
const lbl  = { display: "block", fontSize: 13, fontWeight: 500,
               color: "#374151", marginBottom: 16 };
const inp  = { display: "block", width: "100%", padding: "9px 12px",
               marginTop: 4, border: "1px solid #d1d5db", borderRadius: 8,
               fontSize: 14, boxSizing: "border-box", outline: "none" };
const btn  = { width: "100%", padding: 13, background: "#7c3aed",
               color: "#fff", border: "none", borderRadius: 10,
               fontSize: 15, fontWeight: 600, cursor: "pointer" };