"use client"

import "@/app/globals.css"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  email: string
  username: string
  status: string
  mfa_enabled: boolean
  created_at: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [toggling, setToggling] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        router.replace("/login")
        return
      }
      const params = new URLSearchParams({ page: String(page), size: "20" })
      if (search) params.set("search", search)
      if (statusFilter) params.set("status", statusFilter)

      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "请求失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setUsers(data.users || data.data || [])
      setTotalPages(data.total_pages || data.pages || 1)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, router])

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace("/login")
      return
    }
    fetchUsers()
  }, [fetchUsers, router])

  const toggleStatus = async (userId: string) => {
    const token = localStorage.getItem("access_token")
    setToggling(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-status`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "操作失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      await fetchUsers()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setToggling(null)
    }
  }

  const truncateId = (id: string) => {
    if (id.length <= 12) return id
    return id.slice(0, 6) + "..." + id.slice(-6)
  }

  const handleSearch = () => {
    setPage(1)
    fetchUsers()
  }

  return (
    <div>
      <h1 className="dd-page-title">用户管理</h1>

      {/* Search Bar */}
      <div className="dd-search-bar">
        <div className="dd-field">
          <span className="dd-label">搜索</span>
          <input
            className="dd-input"
            placeholder="搜索邮箱或用户名..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSearch() }}
          />
        </div>
        <div className="dd-field">
          <span className="dd-label">状态</span>
          <select
            className="dd-select"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          >
            <option value="">全部</option>
            <option value="active">活跃</option>
            <option value="disabled">禁用</option>
          </select>
        </div>
        <button
          type="button"
          className="dd-btn dd-btn-primary"
          onClick={handleSearch}
        >
          搜索
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="dd-alert dd-alert-error">{error}</div>
      )}

      {/* Table */}
      <div className="dd-card" style={{ overflow: "hidden" }}>
        <div className="dd-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
              <div className="dd-spinner" />
            </div>
          ) : users.length === 0 ? (
            <div className="dd-empty">暂无用户数据</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="dd-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>邮箱</th>
                    <th>用户名</th>
                    <th>状态</th>
                    <th>MFA</th>
                    <th>创建日期</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td
                        style={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                        title={u.id}
                      >
                        {truncateId(u.id)}
                      </td>
                      <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.email}
                      </td>
                      <td>{u.username || "—"}</td>
                      <td>
                        {u.status === "active" ? (
                          <span className="dd-badge-success">活跃</span>
                        ) : (
                          <span className="dd-badge-danger">禁用</span>
                        )}
                      </td>
                      <td>
                        {u.mfa_enabled ? (
                          <span className="dd-badge-purple">已启用</span>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>未启用</span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.8125rem" }}>
                        {new Date(u.created_at).toLocaleDateString("zh-CN")}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`dd-btn dd-btn-sm ${u.status === "active" ? "dd-btn-danger" : "dd-btn-secondary"}`}
                          onClick={() => toggleStatus(u.id)}
                          disabled={toggling === u.id}
                        >
                          {toggling === u.id ? (
                            <span className="dd-spinner" style={{ width: 12, height: 12 }} />
                          ) : u.status === "active" ? (
                            "禁用"
                          ) : (
                            "启用"
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
      </div>

      {/* Pagination */}
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
