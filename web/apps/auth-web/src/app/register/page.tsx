"use client"
import { useState } from "react"
import { api } from "@identity/shared"
export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [msg, setMsg] = useState("")
  const [err, setErr] = useState("")
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setMsg("")
    try {
      const r = await api.register(email, username, password)
      setMsg("注册成功，请检查邮箱完成验证")
    } catch (x: any) { setErr(x.message) }
  }
  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: 32, background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <h1 style={{ fontSize: 24, marginBottom: 24, textAlign: "center" }}>注册</h1>
      <form onSubmit={handleSubmit}>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="邮箱" required
          style={{ width: "100%", padding: "10px 12px", marginBottom: 12, border: "1px solid #ddd", borderRadius: 4, fontSize: 14 }} />
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="用户名" required
          style={{ width: "100%", padding: "10px 12px", marginBottom: 12, border: "1px solid #ddd", borderRadius: 4, fontSize: 14 }} />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="密码（至少8位）" required
          style={{ width: "100%", padding: "10px 12px", marginBottom: 12, border: "1px solid #ddd", borderRadius: 4, fontSize: 14 }} />
        <button type="submit" style={{ width: "100%", padding: 12, background: "#1677ff", color: "#fff", border: "none", borderRadius: 4, fontSize: 16, cursor: "pointer" }}>注册</button>
        {msg && <p style={{ color: "green", marginTop: 12, fontSize: 14 }}>{msg}</p>}
        {err && <p style={{ color: "red", marginTop: 12, fontSize: 14 }}>{err}</p>}
        <p style={{ marginTop: 16, textAlign: "center", fontSize: 14 }}><a href="/login" style={{ color: "#1677ff", textDecoration: "none" }}>已有账号？登录</a></p>
      </form>
    </div>
  )
}
