"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"

export default function AdminLoginPage() {
  const router = useRouter()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    if (!username.trim() || !password.trim()) {
      setError("请输入管理员账号和密码")
      return
    }

    setLoading(true)
    try {
      const loginRes = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      })

      if (!loginRes.ok) {
        setError("管理员账号或密码错误")
        return
      }

      const loginData = await loginRes.json()
      const token = loginData.access_token
      if (!token) {
        setError("登录响应缺少 access_token")
        return
      }

      localStorage.setItem("access_token", token)

      router.push("/admin")
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#F5F7F9",
        fontFamily: 'Barlow, system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        className="dd-card"
        style={{
          maxWidth: 420,
          width: "100%",
          margin: "1rem",
          padding: "2rem",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2D1967"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: "0.75rem" }}
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <h2
            style={{
              fontSize: "1.375rem",
              fontWeight: 700,
              margin: 0,
              color: "#2D1967",
            }}
          >
            管理员登录
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--dd-text-muted, #6C757D)",
              margin: "0.25rem 0 0",
            }}
          >
            OneAuth 管理控制台
          </p>
        </div>

        {error && (
          <div className="dd-alert dd-alert-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label
            className="dd-label"
            htmlFor="admin-username"
            style={{
              display: "block",
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "var(--dd-text, #212529)",
              marginBottom: "0.375rem",
            }}
          >
            管理员账号
          </label>
          <input
            id="admin-username"
            className="dd-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="输入管理员账号"
            autoFocus
            autoComplete="username"
          />

          <div style={{ height: "1rem" }} />

          <label
            className="dd-label"
            htmlFor="admin-password"
            style={{
              display: "block",
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "var(--dd-text, #212529)",
              marginBottom: "0.375rem",
            }}
          >
            密码
          </label>
          <input
            id="admin-password"
            className="dd-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入密码"
            autoComplete="current-password"
          />

          <button
            type="submit"
            className="dd-btn dd-btn-primary"
            disabled={loading}
            style={{
              width: "100%",
              marginTop: "1.5rem",
              padding: "0.625rem 1rem",
              fontSize: "0.9375rem",
            }}
          >
            {loading ? (
              <>
                <span className="dd-spinner" style={{ width: "1em", height: "1em" }} />
                登录中...
              </>
            ) : (
              "登录"
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
