"use client"

import "@/app/globals.css"
import { useState, FormEvent, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { api } from "@identity/shared"

function OAuthRegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/oauth/login"

  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
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
    if (password.length < 8) {
      setError("密码至少 8 位")
      return
    }

    setLoading(true)
    try {
      await api.register(email.trim(), username.trim() || email.split("@")[0], password)
      router.push(next)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "注册失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="cc-label" htmlFor="email">邮箱</label>
      <input id="email" className="cc-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
      <div style={{ height: "1rem" }} />

      <label className="cc-label" htmlFor="username">用户名</label>
      <input id="username" className="cc-input" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="可选" />
      <div style={{ height: "1rem" }} />

      <label className="cc-label" htmlFor="password">密码</label>
      <input id="password" className="cc-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="至少 8 位" />

      <button type="submit" className="cc-btn cc-btn-primary cc-btn-block" disabled={loading} style={{ marginTop: "1.5rem" }}>
        {loading ? "注册中..." : "注册"}
      </button>
    </form>
  )
}

export default function OAuthRegisterPage() {
  return (
    <div className="cc-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="cc-container">
        <div className="cc-card" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.375rem", fontWeight: 700, margin: "0 0 0.25rem", color: "var(--cc-text)" }}>
            注册 OneAuth 账号
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--cc-text-secondary)", margin: "0 0 1.5rem" }}>
            创建账号后即可使用 OneAuth 登录第三方应用
          </p>

          <Suspense fallback={<div>加载中...</div>}>
            <OAuthRegisterForm />
          </Suspense>

          <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem" }}>
            <Link href="/oauth/login" style={{ color: "var(--cc-text-secondary)", textDecoration: "none" }}>
              已有账号？登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
