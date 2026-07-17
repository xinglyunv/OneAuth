"use client"

import "@/app/globals.css"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface Token {
  id: string
  user_id: string
  expires_at: string
  status: string
  created_at: string
}

export default function AdminTokensPage() {
  const router = useRouter()
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [revoking, setRevoking] = useState<string | null>(null)

  const fetchTokens = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        router.replace("/login")
        return
      }
      const res = await fetch(`/api/admin/tokens?page=${page}&size=20`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "请求失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setTokens(data.tokens || data.data || [])
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
    fetchTokens()
  }, [fetchTokens, router])

  const revokeToken = async (id: string) => {
    const token = localStorage.getItem("access_token")
    setRevoking(id)
    try {
      const res = await fetch(`/api/admin/tokens/${id}/revoke`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "操作失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      await fetchTokens()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setRevoking(null)
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
      case "revoked":
        return <span className="dd-badge dd-badge-danger">已撤销</span>
      case "expired":
        return <span className="dd-badge dd-badge-warning">已过期</span>
      default:
        return <span className="dd-badge">{status}</span>
    }
  }

  return (
    <div>
      <h1 className="dd-page-title">Token 管理</h1>

      {error && (
        <div className="dd-alert dd-alert-error">{error}</div>
      )}

      <div className="dd-card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
            <div className="dd-spinner" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="dd-empty">暂无 Token 数据</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="dd-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>用户ID</th>
                  <th>过期时间</th>
                  <th>状态</th>
                  <th>创建日期</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map(t => (
                  <tr key={t.id}>
                    <td
                      style={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                      title={t.id}
                    >
                      {truncateId(t.id)}
                    </td>
                    <td
                      style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--dd-text-secondary)" }}
                      title={t.user_id}
                    >
                      {truncateId(t.user_id)}
                    </td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--dd-text-secondary)" }}>
                      {new Date(t.expires_at).toLocaleDateString("zh-CN")}
                    </td>
                    <td>{statusBadge(t.status)}</td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--dd-text-secondary)" }}>
                      {new Date(t.created_at).toLocaleDateString("zh-CN")}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="dd-btn dd-btn-sm dd-btn-danger"
                        onClick={() => revokeToken(t.id)}
                        disabled={revoking === t.id || t.status !== "active"}
                      >
                        {revoking === t.id ? (
                          <span className="dd-spinner" style={{ width: 12, height: 12 }} />
                        ) : (
                          "撤销"
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
