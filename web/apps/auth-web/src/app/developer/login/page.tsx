"use client"

import "@/app/globals.css"
import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@identity/shared"

export default function DeveloperLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email.trim() || !password.trim()) { setError("请输入邮箱和密码"); return }
    setLoading(true)
    try {
      const res = await api.login(email.trim(), password, "Developer Portal", undefined)
      localStorage.setItem("access_token", res.access_token)
      localStorage.setItem("refresh_token", res.refresh_token)
      router.push("/developer")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "登录失败")
    } finally { setLoading(false) }
  }

  return (
    <div className="cc-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="cc-container">
        <div className="cc-card" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.375rem", fontWeight: 700, margin: "0 0 0.25rem", color: "var(--cc-text)" }}>开发者登录</h2>
          <p style={{ fontSize: "0.875rem", color: "var(--cc-text-secondary)", margin: "0 0 1.5rem" }}>OneAuth 开发者中心</p>
          {error && <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}
          <form onSubmit={handleLogin}>
            <label className="cc-label" htmlFor="email">邮箱</label>
            <input id="email" className="cc-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
            <div style={{ height: "1rem" }} />
            <label className="cc-label" htmlFor="password">密码</label>
            <input id="password" className="cc-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="输入密码" />
            <button type="submit" className="cc-btn cc-btn-primary cc-btn-block" disabled={loading} style={{ marginTop: "1.5rem" }}>
              {loading ? "登录中..." : "登录"}
            </button>
          </form>
          <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem" }}>
            <span style={{ color: "var(--cc-text-secondary)" }}>没有开发者账号？</span>{" "}
            <Link href="/developer/register" style={{ color: "var(--cc-primary)", textDecoration: "none", fontWeight: 500 }}>注册</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
