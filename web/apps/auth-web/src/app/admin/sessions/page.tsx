"use client"

import "@/app/globals.css"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface Session {
  id: string
  user_id: string
  ip_address: string
  status: string
  last_active: string
  created_at: string
}

export default function AdminSessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        router.replace("/login")
        return
      }
      const res = await fetch(`/api/admin/sessions?page=${page}&size=20`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "请求失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setSessions(data.sessions || data.data || [])
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
    fetchSessions()
  }, [fetchSessions, router])

  const deleteSession = async (id: string) => {
    const token = localStorage.getItem("access_token")
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/sessions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "操作失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      await fetchSessions()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeleting(null)
    }
  }

  const truncateId = (id: string) => {
    if (id.length <= 12) return id
    return id.slice(0, 6) + "..." + id.slice(-6)
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="dd-badge dd-badge-success">活跃</span>
      case "expired":
        return <span className="dd-badge dd-badge-warning">已过期</span>
      case "terminated":
        return <span className="dd-badge dd-badge-danger">已终止</span>
      default:
        return <span className="dd-badge">{status}</span>
    }
  }

  return (
    <div>
      <h1 className="dd-page-title">Session 管理</h1>

      {error && (
        <div className="dd-alert dd-alert-error">{error}</div>
      )}

      <div className="dd-card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
            <div className="dd-spinner" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="dd-empty">暂无 Session 数据</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="dd-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>用户ID</th>
                  <th>IP 地址</th>
                  <th>状态</th>
                  <th>最后活跃</th>
                  <th>创建日期</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td
                      style={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                      title={s.id}
                    >
                      {truncateId(s.id)}
                    </td>
                    <td
                      style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--dd-text-secondary)" }}
                      title={s.user_id}
                    >
                      {truncateId(s.user_id)}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--dd-text-secondary)" }}>
                      {s.ip_address || "—"}
                    </td>
                    <td>{statusBadge(s.status)}</td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--dd-text-secondary)" }}>
                      {new Date(s.last_active).toLocaleDateString("zh-CN")}
                    </td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--dd-text-secondary)" }}>
                      {new Date(s.created_at).toLocaleDateString("zh-CN")}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="dd-btn dd-btn-sm dd-btn-danger"
                        onClick={() => deleteSession(s.id)}
                        disabled={deleting === s.id}
                      >
                        {deleting === s.id ? (
                          <span className="dd-spinner" style={{ width: 12, height: 12 }} />
                        ) : (
                          "删除"
                        )}
                      </button>
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
            type="button"
            className="dd-btn dd-btn-secondary dd-btn-sm"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            上一页
          </button>
          <span className="dd-page-info">{page} / {totalPages}</span>
          <button
            type="button"
            className="dd-btn dd-btn-secondary dd-btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
