"use client"

import "@/app/globals.css"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"

interface LoginLog {
  id: string
  action: string
  resource_type: string
  resource_id: string
  ip_address: string
  created_at: string
  user_agent: string
}

interface PageResponse {
  logs: LoginLog[]
  total: number
  page: number
  size: number
}

const ACTION_LABEL: Record<string, string> = {
  login: "登录",
  logout: "登出",
  register: "注册",
  mfa_enable: "启用MFA",
  mfa_disable: "禁用MFA",
  password_change: "修改密码",
  email_verify: "邮箱验证",
  token_refresh: "刷新令牌",
}

export default function ActivityPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<LoginLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        router.replace("/login")
        return
      }
      const res = await fetch(`/api/user/login-activity?page=${page}&size=20`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "请求失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data: PageResponse = await res.json()
      setLogs(data.logs || [])
      setTotalPages(Math.max(1, Math.ceil(data.total / (data.size || 20))))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [page, router])

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace("/login")
      return
    }
    fetchLogs()
  }, [fetchLogs, router])

  return (
    <div className="cc-wide">
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        登录活动
      </h2>

      {error && (
        <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div className="cc-card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem 0" }}>
            <span className="cc-spinner" />
          </div>
        ) : logs.length === 0 ? (
          <div className="cc-empty">暂无登录活动</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="cc-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>操作</th>
                  <th>资源</th>
                  <th>IP 地址</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontSize: "0.8125rem", color: "var(--cc-text-secondary)", whiteSpace: "nowrap" }}>
                      {new Date(l.created_at).toLocaleString("zh-CN")}
                    </td>
                    <td>
                      <span className="cc-badge cc-badge-primary" style={{ fontWeight: 500 }}>
                        {ACTION_LABEL[l.action] || l.action}
                      </span>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--cc-text-secondary)" }}>
                      {l.resource_type}/{l.resource_id}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--cc-text-secondary)" }}>
                      {l.ip_address}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginTop: "1.25rem" }}>
          <button
            className="cc-btn cc-btn-secondary cc-btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            上一页
          </button>
          <span style={{ fontSize: "0.875rem", color: "var(--cc-text-secondary)" }}>
            {page} / {totalPages}
          </span>
          <button
            className="cc-btn cc-btn-secondary cc-btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            下一页
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
