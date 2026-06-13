import { useState } from "react";
import axios from "axios";

const API = "http://localhost:8000";

export default function Signup({ onSuccess, goToLogin }) {
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    guardian_phone: "", guardian_email: "", consent_given: false
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const update = (field, value) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const validate = () => {
    if (!form.name.trim())            return "Please enter your name";
    if (!form.email.includes("@"))    return "Please enter a valid email";
    if (form.password.length < 6)     return "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    if (!form.consent_given)          return "Please accept the terms to continue";
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/register`, {
        name:           form.name,
        email:          form.email,
        password:       form.password,
        guardian_phone: form.guardian_phone,
        guardian_email: form.guardian_email,
        consent_given:  form.consent_given
      });
      localStorage.setItem("maia_token", data.token);
      onSuccess({
        id:            data.user_id,
        name:          data.name,
        email:         data.email,
        guardianPhone: form.guardian_phone,
        guardianEmail: form.guardian_email
      });
    } catch (e) {
      setError(e.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={wrap}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 40 }}>🌿</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "8px 0 4px" }}>
          Create your Maia account
        </h1>
        <p style={{ color: "#6b7280", fontSize: 13 }}>
          Your safe space for mental wellness
        </p>
      </div>

      {/* Name */}
      <label style={lbl}>Your name *
        <input value={form.name} onChange={e => update("name", e.target.value)}
          placeholder="e.g. Riv Sharma" style={inp} />
      </label>

      {/* Email */}
      <label style={lbl}>Email address *
        <input type="email" value={form.email}
          onChange={e => update("email", e.target.value)}
          placeholder="your@email.com" style={inp} />
      </label>

      {/* Password */}
      <label style={lbl}>Password * (min 6 characters)
        <input type="password" value={form.password}
          onChange={e => update("password", e.target.value)}
          placeholder="Choose a strong password" style={inp} />
      </label>

      {/* Confirm password */}
      <label style={lbl}>Confirm password *
        <input type="password" value={form.confirmPassword}
          onChange={e => update("confirmPassword", e.target.value)}
          placeholder="Repeat your password" style={inp} />
      </label>

      {/* Emergency contact */}
      <div style={{ background: "#fffbeb", border: "1px solid #fcd34d",
                    borderRadius: 10, padding: 14, margin: "4px 0 14px" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#92400e", margin: "0 0 4px" }}>
          Emergency contact (optional but recommended)
        </p>
        <p style={{ fontSize: 12, color: "#78716c", margin: "0 0 10px" }}>
          If Maia detects a crisis, this person will be alerted with your consent.
        </p>
        {/* <input value={form.guardian_phone}
          onChange={e => update("guardian_phone", e.target.value)}
          placeholder="Guardian phone: +91XXXXXXXXXX"
          style={{ ...inp, marginBottom: 8 }} /> */}
        <input value={form.guardian_email}
          onChange={e => update("guardian_email", e.target.value)}
          placeholder="Guardian email (optional)" style={inp} />
      </div>

      {/* Consent */}
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start",
                      marginBottom: 20, cursor: "pointer" }}>
        <input type="checkbox" checked={form.consent_given}
          onChange={e => update("consent_given", e.target.checked)}
          style={{ marginTop: 3, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
          I understand Maia is an AI companion, not a therapist. I agree that
          if a crisis is detected, my emergency contact may be notified. *
        </span>
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
        {loading ? "Creating account..." : "Create account"}
      </button>

      <p style={{ textAlign: "center", fontSize: 13, color: "#6b7280", marginTop: 16 }}>
        Already have an account?{" "}
        <span onClick={goToLogin}
          style={{ color: "#7c3aed", cursor: "pointer", fontWeight: 500 }}>
          Log in
        </span>
      </p>

      <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 12 }}>
        Crisis helpline: iCall 9152987821 | Vandrevala: 1860-2662-345
      </p>
    </div>
  );
}

const wrap = { maxWidth: 440, margin: "40px auto", padding: "0 20px" };
const lbl  = { display: "block", fontSize: 13, fontWeight: 500,
               color: "#374151", marginBottom: 14 };
const inp  = { display: "block", width: "100%", padding: "9px 12px",
               marginTop: 4, border: "1px solid #d1d5db", borderRadius: 8,
               fontSize: 14, boxSizing: "border-box", outline: "none" };
const btn  = { width: "100%", padding: 13, background: "#7c3aed",
               color: "#fff", border: "none", borderRadius: 10,
               fontSize: 15, fontWeight: 600, cursor: "pointer" };