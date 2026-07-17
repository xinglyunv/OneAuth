"use client"

import "@/app/globals.css"
import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@identity/shared"

enum Step {
  Login = "login",
  MFA = "mfa",
}

function detectDeviceInfo(): { name: string; fingerprint: string } {
  if (typeof navigator === "undefined") return { name: "Web", fingerprint: "" }
  const ua = navigator.userAgent
  const lower = ua.toLowerCase()
  let name = "Web"
  if (/iphone/i.test(ua)) name = "iPhone"
  else if (/ipad/i.test(ua)) name = "iPad"
  else if (/android.*mobile/i.test(ua)) name = "Android Phone"
  else if (/android/i.test(ua)) name = "Android Tablet"
  else if (/macintosh|mac os/i.test(ua)) name = "Mac"
  else if (/windows/i.test(ua)) name = "PC"
  else if (/linux/i.test(ua)) name = "Linux"
  const screenSize = typeof screen !== "undefined" ? `${screen.width}x${screen.height}` : ""
  const fp = [ua, screenSize, new Date().getTimezoneOffset()].join("|")
  let hash = 0
  for (let i = 0; i < fp.length; i++) { const c = fp.charCodeAt(i); hash = ((hash << 5) - hash) + c; hash |= 0 }
  return { name, fingerprint: Math.abs(hash).toString(36) }
}

export default function LoginPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>(Step.Login)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // MFA state
  const [mfaToken, setMfaToken] = useState("")
  const [totpCode, setTotpCode] = useState("")

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim() || !password.trim()) {
      setError("请输入邮箱和密码")
      return
    }

    setLoading(true)
    try {
      const di = detectDeviceInfo()
      const res = await api.login(
        email.trim(),
        password,
        di.name,
        di.fingerprint,
      )

      if (res.mfa_required && res.mfa_session_token) {
        setMfaToken(res.mfa_session_token)
        setStep(Step.MFA)
        return
      }

      localStorage.setItem("access_token", res.access_token)
      localStorage.setItem("refresh_token", res.refresh_token)
      const me = await api.getMe()
      router.push(me.role === "DEVELOPER" ? "/developer" : "/user")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "登录失败，请稍后重试"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleMFA = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    if (totpCode.length < 6) {
      setError("请输入完整的 6 位验证码")
      return
    }

    setLoading(true)
    try {
      const res = await api.mfaValidate(mfaToken, totpCode)
      localStorage.setItem("access_token", res.access_token)
      localStorage.setItem("refresh_token", res.refresh_token)
      const me = await api.getMe()
      router.push(me.role === "DEVELOPER" ? "/developer" : "/user")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "验证失败，请重试"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (step === Step.MFA) {
    return (
      <div className="cc-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="cc-container">
          <div className="cc-card" style={{ padding: "2rem" }}>
            <h2 style={{ fontSize: "1.375rem", fontWeight: 700, margin: "0 0 0.25rem", color: "var(--cc-text)" }}>
              二次验证
            </h2>
            <p style={{ fontSize: "0.875rem", color: "var(--cc-text-secondary)", margin: "0 0 1.5rem" }}>
              需要二次验证
            </p>

            {error && <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

            <form onSubmit={handleMFA}>
              <label className="cc-label" htmlFor="totp">TOTP 验证码</label>
              <input
                id="totp"
                className="cc-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                style={{ textAlign: "center", fontSize: "1.75rem", letterSpacing: "0.5em", fontFamily: "monospace" }}
                placeholder="000000"
                autoFocus
              />

              <button
                type="submit"
                className="cc-btn cc-btn-primary cc-btn-block"
                disabled={loading || totpCode.length < 6}
                style={{ marginTop: "1.25rem" }}
              >
                {loading && <span className="cc-spinner" />}
                {loading ? "验证中..." : "验证"}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem", color: "var(--cc-text-secondary)" }}>
              <Link href="/login" className="cc-btn cc-btn-ghost cc-btn-sm" onClick={() => setStep(Step.Login)}>
                返回登录
              </Link>
            </div>
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
            登录
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--cc-text-secondary)", margin: "0 0 1.5rem" }}>
            欢迎回来
          </p>

          {error && <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

          <form onSubmit={handleLogin}>
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

            <label className="cc-label" htmlFor="password">密码</label>
            <input
              id="password"
              className="cc-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
            />

            <button
              type="submit"
              className="cc-btn cc-btn-primary cc-btn-block"
              disabled={loading}
              style={{ marginTop: "1.5rem" }}
            >
              {loading && <span className="cc-spinner" />}
              {loading ? "登录中..." : "登录"}
            </button>
          </form>

          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
            marginTop: "1.5rem",
            fontSize: "0.875rem",
          }}>
            <Link href="/register" style={{ color: "var(--cc-text-secondary)", textDecoration: "none" }}>
              注册账号
            </Link>
            <span style={{ color: "var(--cc-border)" }}>|</span>
            <Link href="/forgot-password" style={{ color: "var(--cc-text-secondary)", textDecoration: "none" }}>
              忘记密码
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
