"use client"

import { useState } from "react"
import { api } from "@identity/shared"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [mfaToken, setMfaToken] = useState("")
  const [mfaCode, setMfaCode] = useState("")
  const [step, setStep] = useState<"login" | "mfa">("login")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      const f = await navigator.userAgent
      const res = await api.login(email, password, "Web Browser", btoa(f))
      if (res.mfa_required) {
        setMfaToken(res.mfa_session_token || "")
        setStep("mfa")
      } else {
        localStorage.setItem("access_token", res.access_token)
        localStorage.setItem("refresh_token", res.refresh_token)
        window.location.href = "/"
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleMFA = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      const res = await api.mfaValidate(mfaToken, mfaCode)
      localStorage.setItem("access_token", res.access_token)
      localStorage.setItem("refresh_token", res.refresh_token)
      window.location.href = "/"
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: 32, background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <h1 style={{ fontSize: 24, marginBottom: 24, textAlign: "center" }}>登录</h1>
      {step === "login" ? (
        <form onSubmit={handleLogin}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="邮箱" required
            style={{ width: "100%", padding: "10px 12px", marginBottom: 12, border: "1px solid #ddd", borderRadius: 4, fontSize: 14 }} />
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="密码" required
            style={{ width: "100%", padding: "10px 12px", marginBottom: 12, border: "1px solid #ddd", borderRadius: 4, fontSize: 14 }} />
          <button type="submit"
            style={{ width: "100%", padding: 12, background: "#1677ff", color: "#fff", border: "none", borderRadius: 4, fontSize: 16, cursor: "pointer" }}>
            登录
          </button>
          {error && <p style={{ color: "red", marginTop: 12, fontSize: 14 }}>{error}</p>}
          <div style={{ marginTop: 16, textAlign: "center", fontSize: 14 }}>
            <a href="/register" style={{ color: "#1677ff", textDecoration: "none" }}>注册账号</a>
            <span style={{ margin: "0 8px" }}>|</span>
            <a href="/forgot-password" style={{ color: "#1677ff", textDecoration: "none" }}>忘记密码</a>
          </div>
        </form>
      ) : (
        <form onSubmit={handleMFA}>
          <p style={{ fontSize: 14, marginBottom: 12, color: "#666" }}>请输入您绑定的身份验证器中的 6 位验证码</p>
          <input value={mfaCode} onChange={e => setMfaCode(e.target.value)} placeholder="TOTP 验证码" maxLength={6} required
            style={{ width: "100%", padding: "10px 12px", marginBottom: 12, border: "1px solid #ddd", borderRadius: 4, fontSize: 14, textAlign: "center" }} />
          <button type="submit"
            style={{ width: "100%", padding: 12, background: "#1677ff", color: "#fff", border: "none", borderRadius: 4, fontSize: 16, cursor: "pointer" }}>
            验证
          </button>
          {error && <p style={{ color: "red", marginTop: 12, fontSize: 14 }}>{error}</p>}
        </form>
      )}
    </div>
  )
}