"use client"

import "@/app/globals.css"
import { useState, FormEvent } from "react"
import Link from "next/link"
import { api } from "@identity/shared"

enum Step {
  Email = "email",
  Sent = "sent",
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>(Step.Email)
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim()) {
      setError("请输入邮箱地址")
      return
    }

    setLoading(true)
    try {
      await api.forgotPassword(email.trim())
      setStep(Step.Sent)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "请求失败，请稍后重试"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (step === Step.Sent) {
    return (
      <div className="cc-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="cc-container">
          <div className="cc-card" style={{ padding: "2rem", textAlign: "center" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: "#d1fae5",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1rem",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{ fontSize: "1.375rem", fontWeight: 700, margin: "0 0 0.5rem", color: "var(--cc-text)" }}>
              邮件已发送
            </h2>
            <p style={{ fontSize: "0.875rem", color: "var(--cc-text-secondary)", margin: "0 0 1.5rem", lineHeight: 1.6 }}>
              如果该邮箱已注册，您将收到一封包含密码重置链接的邮件。<br />
              请检查您的收件箱和垃圾邮件文件夹。
            </p>
            <Link href="/login" className="cc-btn cc-btn-primary" style={{ textDecoration: "none", display: "inline-block" }}>
              返回登录
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
          <h2 style={{ fontSize: "1.375rem", fontWeight: 700, margin: "0 0 0.25rem", color: "var(--cc-text)" }}>
            忘记密码
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--cc-text-secondary)", margin: "0 0 1.5rem" }}>
            输入您的注册邮箱，我们将发送密码重置链接
          </p>

          {error && <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

          <form onSubmit={handleSubmit}>
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

            <button
              type="submit"
              className="cc-btn cc-btn-primary cc-btn-block"
              disabled={loading}
              style={{ marginTop: "1.5rem" }}
            >
              {loading && <span className="cc-spinner" />}
              {loading ? "发送中..." : "发送重置链接"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem" }}>
            <Link href="/login" style={{ color: "var(--cc-text-secondary)", textDecoration: "none" }}>
              返回登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
