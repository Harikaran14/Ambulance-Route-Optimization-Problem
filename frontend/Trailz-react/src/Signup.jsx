import { useState } from "react";
import { API_URL } from "./api";

export default function Signup({ onSwitch }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (res.ok) {
      alert("Signup successful. Please log in.");
      onSwitch();
    } else {
      setError(data.error || "Signup failed");
    }
  }

  return (
    <div className="auth-container">
      <form onSubmit={handleSignup}>
        <h2>Signup</h2>
        {error && <p className="error-message">{error}</p>}
        <input
          placeholder="Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <div className="button-group">
          <button type="submit">Signup</button>
        </div>
        <p className="switch-form">
          Already have an account?{" "}
          <button type="button" onClick={onSwitch} className="link-button">Log in</button>
        </p>
      </form>
    </div>
  );
}
