"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function AdminLoginPage() {
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "login failed"); return }
      router.push("/")
    } catch { setError("Network error") }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #1e0835 0%, #2D1967 50%, #3a1f8a 100%)" }}>
      <div style={{ background: "#fff", padding: "2.5rem", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", width: 400 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontFamily: "Barlow, sans-serif", fontSize: "1.5rem", fontWeight: 700, color: "#2D1967" }}>OneAuth</h1>
          <p style={{ color: "#6C757D", fontSize: "0.875rem", marginTop: "0.25rem" }}>Admin Console</p>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: "#6C757D", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.375rem" }}>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #DEE2E6", borderRadius: 5, fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }} placeholder="admin" required />
          </div>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: "#6C757D", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.375rem" }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #DEE2E6", borderRadius: 5, fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }} placeholder="••••••••" required />
          </div>
          {error && <div style={{ padding: "0.5rem 0.75rem", background: "#fee2e2", color: "#991b1b", borderRadius: 5, fontSize: "0.8125rem", marginBottom: "1rem" }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "0.625rem", background: "#2D1967", color: "#fff", border: "none", borderRadius: 5, fontSize: "0.875rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  )
}
