import { useState } from "react";
import axios from "axios";

const API = "http://localhost:8000";

export default function Onboarding({ onComplete }) {
  const [name,    setName]    = useState("");
  const [phone,   setPhone]   = useState("");
  const [email,   setEmail]   = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const submit = async () => {
    if (!name.trim() || !consent) return;
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/onboard`, {
        name, guardian_phone: phone, guardian_email: email, consent_given: consent
      });
      onComplete({ id: data.user_id, name: data.name,
                   guardianPhone: phone, guardianEmail: email });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 460, margin: "60px auto", padding: "0 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🌿</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Meet Maia</h1>
        <p style={{ color: "#6b7280", marginTop: 6, fontSize: 14 }}>
          Your compassionate mental health companion
        </p>
      </div>

      <label style={labelStyle}>
        Your name *
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Aryan Sharma" style={inputStyle} />
      </label>

      <div style={{ background: "#fffbeb", border: "1px solid #fcd34d",
                    borderRadius: 10, padding: 16, margin: "16px 0" }}>
        <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 4px", color: "#92400e" }}>
          Emergency contact (optional but recommended)
        </p>
        <p style={{ fontSize: 12, color: "#78716c", margin: "0 0 12px" }}>
          If Maia detects you may be in crisis, this person will be alerted.
          They'll be told you need support — nothing more.
        </p>
        <input value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="Guardian phone: +91XXXXXXXXXX" style={{...inputStyle, marginBottom: 8}} />
        <input value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Guardian email (optional)" style={inputStyle} />
      </div>

      <label style={{ display: "flex", gap: 10, alignItems: "flex-start",
                      cursor: "pointer", marginBottom: 24 }}>
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
          style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
          I understand Maia is an AI companion, not a therapist. I agree that if the
          system detects I may be in crisis, my emergency contact may be notified.
          I can update this anytime in Settings. *
        </span>
      </label>

      {error && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <button onClick={submit} disabled={!name || !consent || loading}
        style={{ width: "100%", padding: 14, background: "#7c3aed", color: "#fff",
                 border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600,
                 cursor: "pointer", opacity: (!name || !consent || loading) ? 0.5 : 1 }}>
        {loading ? "Setting up..." : "Start talking to Maia"}
      </button>

      <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 16 }}>
        Maia is not a substitute for professional mental health care.
        Crisis helpline: iCall 9152987821
      </p>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 13, fontWeight: 500,
                     color: "#374151", marginBottom: 16 };
const inputStyle  = { display: "block", width: "100%", padding: "9px 12px", marginTop: 4,
                      border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14,
                      boxSizing: "border-box", outline: "none" };