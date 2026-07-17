"use client"

import "@/app/globals.css"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface OAuthApp {
  id: string
  name: string
  client_id: string
  type: string
  status: string
  redirect_uris: string[]
  created_at: string
}

export default function AdminAppsPage() {
  const router = useRouter()
  const [apps, setApps] = useState<OAuthApp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [actingId, setActingId] = useState<string | null>(null)

  const fetchApps = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        router.replace("/login")
        return
      }
      const res = await fetch(`/api/admin/apps?page=${page}&size=20`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "请求失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setApps(data.apps || data.data || [])
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
    fetchApps()
  }, [fetchApps, router])

  const approveApp = async (id: string) => {
    const token = localStorage.getItem("access_token")
    setActingId(id)
    try {
      const res = await fetch(`/api/admin/apps/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "操作失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      await fetchApps()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setActingId(null)
    }
  }

  const rejectApp = async (id: string) => {
    const token = localStorage.getItem("access_token")
    setActingId(id)
    try {
      const res = await fetch(`/api/admin/apps/${id}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "操作失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      await fetchApps()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setActingId(null)
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="dd-badge dd-badge-success">已通过</span>
      case "pending":
        return <span className="dd-badge dd-badge-warning">待审核</span>
      case "disabled":
      case "rejected":
        return <span className="dd-badge dd-badge-danger">已拒绝</span>
      default:
        return <span className="dd-badge">{status}</span>
    }
  }

  const truncateClientId = (id: string) => {
    if (!id || id.length <= 14) return id || "—"
    return id.slice(0, 8) + "..." + id.slice(-6)
  }

  return (
    <div>
      <h2 className="dd-page-title">应用审核</h2>

      {error && (
        <div className="dd-alert dd-alert-error">{error}</div>
      )}

      <div className="dd-card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0", fontSize: "1.75rem" }}>
            <div className="dd-spinner" />
          </div>
        ) : apps.length === 0 ? (
          <div className="dd-empty">暂无应用数据</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="dd-table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>Client ID</th>
                  <th>类型</th>
                  <th>状态</th>
                  <th>回调地址</th>
                  <th>创建日期</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {apps.map(a => (
                  <tr key={a.id || a.client_id}>
                    <td style={{ fontWeight: 500 }}>{a.name}</td>
                    <td
                      style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--dd-text-secondary)", maxWidth: 140 }}
                      title={a.client_id}
                    >
                      {truncateClientId(a.client_id)}
                    </td>
                    <td>
                      <span className="dd-badge dd-badge-brand">{a.type || "confidential"}</span>
                    </td>
                    <td>{statusBadge(a.status)}</td>
                    <td style={{ maxWidth: 180 }}>
                      {Array.isArray(a.redirect_uris) && a.redirect_uris.length > 0 ? (
                        <span
                          style={{
                            display: "block",
                            fontSize: "0.75rem",
                            fontFamily: "monospace",
                            color: "var(--dd-text-secondary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={a.redirect_uris[0]}
                        >
                          {a.redirect_uris[0]}
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "var(--dd-text-muted)" }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--dd-text-secondary)", whiteSpace: "nowrap" }}>
                      {new Date(a.created_at).toLocaleDateString("zh-CN")}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        {(a.status === "disabled" || a.status === "rejected" || a.status === "pending") && (
                          <button
                            className="dd-btn dd-btn-primary dd-btn-sm"
                            onClick={() => approveApp(a.id || a.client_id)}
                            disabled={actingId === (a.id || a.client_id)}
                          >
                            {actingId === (a.id || a.client_id) ? (
                              <span className="dd-spinner" style={{ fontSize: "0.75rem" }} />
                            ) : (
                              "通过"
                            )}
                          </button>
                        )}
                        {a.status === "active" && (
                          <button
                            className="dd-btn dd-btn-danger dd-btn-sm"
                            onClick={() => rejectApp(a.id || a.client_id)}
                            disabled={actingId === (a.id || a.client_id)}
                          >
                            {actingId === (a.id || a.client_id) ? (
                              <span className="dd-spinner" style={{ fontSize: "0.75rem" }} />
                            ) : (
                              "拒绝"
                            )}
                          </button>
                        )}
                      </div>
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
            onClick={() => setPage(p => Math.max(1, p - 1))}
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
