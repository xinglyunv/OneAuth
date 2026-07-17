"use client"

import "@/app/globals.css"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface AuditLog {
  id: string
  timestamp: string
  user_email: string
  action: string
  resource: string
  ip_address: string
}

const ACTION_LABEL: Record<string, string> = {
  login: "登录",
  logout: "登出",
  register: "注册",
  mfa_enable: "启用MFA",
  mfa_disable: "禁用MFA",
  app_create: "创建应用",
  app_delete: "删除应用",
  app_approve: "审核通过",
  app_reject: "审核拒绝",
  user_toggle: "切换状态",
  token_refresh: "刷新令牌",
  password_change: "修改密码",
  email_verify: "邮箱验证",
}

function actionBadgeClass(action: string): string {
  switch (action) {
    case "login":
    case "logout":
    case "register":
    case "token_refresh":
      return "dd-badge-brand"
    case "password_change":
    case "email_verify":
      return "dd-badge-success"
    case "mfa_enable":
    case "mfa_disable":
      return "dd-badge-purple"
    case "app_create":
    case "app_delete":
      return "dd-badge-warning"
    case "app_approve":
      return "dd-badge-success"
    case "app_reject":
      return "dd-badge-danger"
    case "user_toggle":
      return "dd-badge-danger"
    default:
      return "dd-badge-brand"
  }
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export default function AdminAuditPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
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
      const res = await fetch(`/api/admin/audit-logs?page=${page}&size=50`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "请求失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setLogs(data.logs || data.data || [])
      setTotalPages(data.total_pages || data.pages || 1)
    } catch (e: any) {
      setError(e.message)
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
    <div>
      <h1 className="dd-page-title">审计日志</h1>

      {error && (
        <div className="dd-alert dd-alert-error">{error}</div>
      )}

      <div className="dd-card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
            <div className="dd-spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : logs.length === 0 ? (
          <div className="dd-empty">暂无审计日志</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="dd-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>用户</th>
                  <th>操作</th>
                  <th>资源</th>
                  <th>IP 地址</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontSize: "0.8125rem", color: "var(--dd-text-secondary)", whiteSpace: "nowrap" }}>
                      {formatTime(l.timestamp)}
                    </td>
                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.user_email || "—"}
                    </td>
                    <td>
                      <span className={`dd-badge ${actionBadgeClass(l.action)}`}>
                        {ACTION_LABEL[l.action] || l.action}
                      </span>
                    </td>
                    <td
                      style={{
                        fontFamily: "monospace",
                        fontSize: "0.75rem",
                        color: "var(--dd-text-secondary)",
                        maxWidth: 180,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={l.resource}
                    >
                      {l.resource || "—"}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--dd-text-secondary)" }}>
                      {l.ip_address || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="dd-pagination">
          <button
            className="dd-btn dd-btn-secondary dd-btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            上一页
          </button>
          <span className="dd-page-info">{page} / {totalPages}</span>
          <button
            className="dd-btn dd-btn-secondary dd-btn-sm"
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
