"use client"

import "@/app/globals.css"
import { useState, FormEvent, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { api } from "@identity/shared"

function OAuthLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/oauth/authorize"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim() || !password.trim()) {
      setError("请输入邮箱和密码")
      return
    }

    setLoading(true)
    try {
      const res = await api.login(email.trim(), password, "Web", "")
      localStorage.setItem("access_token", res.access_token)
      localStorage.setItem("refresh_token", res.refresh_token)

      if (res.mfa_required) {
        localStorage.setItem("mfa_session_token", res.mfa_session_token || "")
        localStorage.setItem("mfa_next", next)
        router.push("/oauth/login?mfa=true")
        return
      }

      const me = await api.getMe()
      if (me.role === "DEVELOPER") {
        setError("开发者账号不能通过 OAuth 登录")
        return
      }
      if (me.role === "ADMIN" || me.role === "SUPER_ADMIN") {
        setError("管理员账号不能通过 OAuth 登录")
        return
      }
      router.push(next)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "登录失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cc-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="cc-container">
        <div className="cc-card" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.375rem", fontWeight: 700, margin: "0 0 0.25rem", color: "var(--cc-text)" }}>
            第三方应用登录
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--cc-text-secondary)", margin: "0 0 1.5rem" }}>
            使用 OneAuth 账号登录第三方应用
          </p>

          {error && <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

          <form onSubmit={handleSubmit}>
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
            <Link href="/oauth/register" style={{ color: "var(--cc-text-secondary)", textDecoration: "none" }}>
              注册新账号
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OAuthLoginPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>加载中...</div>}>
      <OAuthLoginForm />
    </Suspense>
  )
}
