"use client"

import "@/app/globals.css"
import { useState, FormEvent } from "react"
import Link from "next/link"
import { api } from "@identity/shared"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim() || !username.trim() || !password.trim()) {
      setError("请填写所有必填项")
      return
    }

    if (password.length < 8) {
      setError("密码长度至少 8 位")
      return
    }

    setLoading(true)
    try {
      await api.register(email.trim(), username.trim(), password)
      setSuccess(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "注册失败，请稍后重试"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="cc-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="cc-container">
          <div className="cc-card" style={{ padding: "2rem", textAlign: "center" }}>
            <div style={{ marginBottom: "1rem" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--cc-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 style={{ fontSize: "1.375rem", fontWeight: 700, margin: "0 0 0.5rem", color: "var(--cc-text)" }}>
              注册成功！
            </h2>
            <p style={{ fontSize: "0.875rem", color: "var(--cc-text-secondary)", margin: "0 0 1.5rem", lineHeight: 1.6 }}>
              您的账号已创建成功，请前往登录页面使用您的账号。
            </p>
            <Link href="/login" className="cc-btn cc-btn-primary cc-btn-block">
              前往登录
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cc-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="cc-container">
        <div className="cc-card" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.375rem", fontWeight: 700, margin: "0 0 1.5rem", color: "var(--cc-text)" }}>
            创建账号
          </h2>

          {error && <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

          <form onSubmit={handleRegister}>
            <label className="cc-label" htmlFor="email">邮箱</label>
            <input
              id="email"
              className="cc-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
            />
            <div style={{ height: "1rem" }} />

            <label className="cc-label" htmlFor="username">用户名</label>
            <input
              id="username"
              className="cc-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="选择用户名"
            />
            <div style={{ height: "1rem" }} />

            <label className="cc-label" htmlFor="password">密码</label>
            <input
              id="password"
              className="cc-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 8 位字符"
            />
            {password.length > 0 && password.length < 8 && (
              <div style={{ fontSize: "0.8125rem", color: "var(--cc-warning)", marginTop: "0.25rem" }}>
                密码长度至少 8 位（当前 {password.length} 位）
              </div>
            )}

            <button
              type="submit"
              className="cc-btn cc-btn-primary cc-btn-block"
              disabled={loading}
              style={{ marginTop: "1.5rem" }}
            >
              {loading && <span className="cc-spinner" />}
              {loading ? "注册中..." : "注册"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem" }}>
            <span style={{ color: "var(--cc-text-secondary)" }}>已有账号？</span>{" "}
            <Link href="/login" style={{ color: "var(--cc-primary)", textDecoration: "none", fontWeight: 500 }}>
              立即登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
