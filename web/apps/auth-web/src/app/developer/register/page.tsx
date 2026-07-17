"use client"

import "@/app/globals.css"
import { useState, FormEvent } from "react"
import Link from "next/link"
import { api } from "@identity/shared"

export default function DeveloperRegisterPage() {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email.trim() || !username.trim() || !password.trim()) { setError("请填写所有必填项"); return }
    if (password.length < 8) { setError("密码长度至少 8 位"); return }
    setLoading(true)
    try {
      await api.register(email.trim(), username.trim(), password)
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "注册失败")
    } finally { setLoading(false) }
  }

  if (success) {
    return (
      <div className="cc-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="cc-container">
          <div className="cc-card" style={{ padding: "2rem", textAlign: "center" }}>
            <h2 style={{ fontSize: "1.375rem", fontWeight: 700, margin: "0 0 0.5rem" }}>注册成功！</h2>
            <p style={{ fontSize: "0.875rem", color: "var(--cc-text-secondary)", margin: "0 0 1.5rem" }}>请前往登录</p>
            <Link href="/developer/login" className="cc-btn cc-btn-primary cc-btn-block">前往登录</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cc-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="cc-container">
        <div className="cc-card" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.375rem", fontWeight: 700, margin: "0 0 1.5rem" }}>注册开发者账号</h2>
          {error && <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}
          <form onSubmit={handleRegister}>
            <label className="cc-label" htmlFor="email">邮箱</label>
            <input id="email" className="cc-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
            <div style={{ height: "1rem" }} />
            <label className="cc-label" htmlFor="username">用户名</label>
            <input id="username" className="cc-input" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="选择用户名" />
            <div style={{ height: "1rem" }} />
            <label className="cc-label" htmlFor="password">密码</label>
            <input id="password" className="cc-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="至少 8 位字符" />
            <button type="submit" className="cc-btn cc-btn-primary cc-btn-block" disabled={loading} style={{ marginTop: "1.5rem" }}>
              {loading ? "注册中..." : "注册"}
            </button>
          </form>
          <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem" }}>
            <span style={{ color: "var(--cc-text-secondary)" }}>已有账号？</span>{" "}
            <Link href="/developer/login" style={{ color: "var(--cc-primary)", textDecoration: "none", fontWeight: 500 }}>立即登录</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
