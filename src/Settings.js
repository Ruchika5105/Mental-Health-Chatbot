import { useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function Settings({ user, setUser, onLogout }) {
  const [phone,         setPhone]         = useState(user.guardianPhone || "");
  const [email,         setEmail]         = useState(user.guardianEmail || "");
  const [consent,       setConsent]       = useState(user.consentGiven ?? true);
  const [saved,         setSaved]         = useState(false);
  const [saving,        setSaving]        = useState(false);   // ← was missing
  const [saveError,     setSaveError]     = useState("");      // ← was missing
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted,       setDeleted]       = useState(false);

  const save = async () => {
    if (!user || !user.id) {
      setSaveError("Session error. Please log out and log back in.");
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const { data } = await axios.put(`${API}/user/${user.id}`, {
        guardian_phone: phone,
        guardian_email: email,
        consent_given:  consent
      });

      // Update parent state so crisis alerts use new values immediately
      setUser(prev => ({
        ...prev,
        guardianPhone: data.guardian_phone,
        guardianEmail: data.guardian_email,
        consentGiven:  data.consent_given
      }));

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

    } catch (e) {
      setSaveError(e.response?.data?.detail || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/user/${user.id}`);
      localStorage.removeItem("maia_token");
      setDeleted(true);
      setTimeout(() => onLogout(), 2000);
    } catch {
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div style={{ padding: 20, overflowY: "auto", height: "100%",
                  maxWidth: 500, margin: "0 auto" }}>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Settings</h2>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>
        Manage your emergency contact and preferences.
      </p>

      {/* Account info */}
      <div style={{ background: "#f9fafb", borderRadius: 10,
                    padding: 14, marginBottom: 24 }}>
        <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600,
                    margin: "0 0 4px", textTransform: "uppercase",
                    letterSpacing: "0.05em" }}>Account</p>
        <p style={{ fontSize: 14, fontWeight: 600,
                    margin: "0 0 2px", color: "#111827" }}>{user.name}</p>
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>{user.email}</p>
      </div>

      {/* Emergency contact */}
      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600,
                     marginBottom: 6, color: "#374151" }}>
          Emergency contact
        </h3>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
          If Maia detects a crisis, this person will be contacted immediately.
        </p>
        {/* <label style={lbl}>Guardian phone number
          <input value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="+91XXXXXXXXXX" style={inp} />
        </label> */}
        <label style={lbl}>Guardian email address
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="guardian@example.com" style={inp} />
        </label>
      </section>

      {/* Consent */}
      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600,
                     marginBottom: 8, color: "#374151" }}>
          Crisis alert consent
        </h3>
        <label style={{ display: "flex", gap: 10,
                        alignItems: "flex-start", cursor: "pointer" }}>
          <input type="checkbox" checked={consent}
            onChange={e => setConsent(e.target.checked)}
            style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
            Allow Maia to notify my emergency contact if a crisis is detected.
          </span>
        </label>
      </section>

      {/* Error message */}
      {saveError && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5",
                      borderRadius: 8, padding: "10px 14px",
                      marginBottom: 12, fontSize: 13, color: "#dc2626" }}>
          {saveError}
        </div>
      )}

      {/* Save button */}
      <button onClick={save} disabled={saving}
        style={{ padding: "10px 28px", background: "#7c3aed", color: "#fff",
                 border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500,
                 cursor: saving ? "not-allowed" : "pointer",
                 opacity: saving ? 0.6 : 1, marginBottom: 32 }}>
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save changes"}
      </button>

      {/* Disclaimer */}
      <div style={{ padding: 14, background: "#f9fafb", borderRadius: 10,
                    fontSize: 12, color: "#9ca3af", marginBottom: 28 }}>
        <strong style={{ color: "#374151" }}>Important:</strong> Maia is an AI
        companion, not a licensed therapist. If you are in crisis right now,
        please call iCall: <strong style={{ color: "#374151" }}>9152987821</strong> or
        Vandrevala: <strong style={{ color: "#374151" }}>1860-2662-345</strong>
      </div>

      {/* Danger zone */}
      <div style={{ borderTop: "1px solid #fee2e2", paddingTop: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 500,
                     color: "#dc2626", marginBottom: 8 }}>
          Danger zone
        </h3>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
          Permanently delete your account and all data including mood logs,
          journal entries and chat history. This cannot be undone.
        </p>

        {!confirmDelete && !deleted && (
          <button onClick={() => setConfirmDelete(true)}
            style={{ padding: "8px 20px", background: "none",
                     color: "#dc2626", border: "1px solid #dc2626",
                     borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
            Delete my account and all data
          </button>
        )}

        {confirmDelete && !deleted && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5",
                        borderRadius: 10, padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 500,
                        color: "#991b1b", marginBottom: 12 }}>
              Are you absolutely sure? This deletes everything permanently.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDelete}
                style={{ padding: "8px 20px", background: "#dc2626",
                         color: "#fff", border: "none", borderRadius: 8,
                         fontSize: 13, cursor: "pointer" }}>
                Yes, delete everything
              </button>
              <button onClick={() => setConfirmDelete(false)}
                style={{ padding: "8px 20px", background: "none",
                         color: "#374151", border: "1px solid #d1d5db",
                         borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {deleted && (
          <p style={{ fontSize: 13, color: "#166534", fontWeight: 500 }}>
            Your account and all data have been permanently deleted.
          </p>
        )}
      </div>
    </div>
  );
}

const lbl = { display: "block", fontSize: 13, fontWeight: 500,
              color: "#374151", marginBottom: 14 };
const inp = { display: "block", width: "100%", padding: "9px 12px",
              marginTop: 4, border: "1px solid #d1d5db", borderRadius: 8,
              fontSize: 14, boxSizing: "border-box", outline: "none" };