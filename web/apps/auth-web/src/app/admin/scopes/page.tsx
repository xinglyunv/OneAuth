"use client"

import "@/app/globals.css"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface Scope {
  id: string
  name: string
  description: string
  is_default: boolean
  created_at: string
}

export default function AdminScopesPage() {
  const router = useRouter()
  const [scopes, setScopes] = useState<Scope[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [creating, setCreating] = useState(false)

  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchScopes = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        router.replace("/login")
        return
      }
      const res = await fetch("/api/admin/scopes", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "请求失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setScopes(data.scopes || data.data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace("/login")
      return
    }
    fetchScopes()
  }, [fetchScopes, router])

  const createScope = async () => {
    if (!name.trim()) return
    const token = localStorage.getItem("access_token")
    setCreating(true)
    setError("")
    try {
      const res = await fetch("/api/admin/scopes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), is_default: isDefault }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "创建失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setName("")
      setDescription("")
      setIsDefault(false)
      await fetchScopes()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const deleteScope = async (id: string) => {
    const token = localStorage.getItem("access_token")
    setDeleting(id)
    setError("")
    try {
      const res = await fetch(`/api/admin/scopes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "删除失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      await fetchScopes()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      <h1 className="dd-page-title">Scope 管理</h1>

      {error && (
        <div className="dd-alert dd-alert-error">{error}</div>
      )}

      <div className="dd-card">
        <div className="dd-card-header">创建 Scope</div>
        <div className="dd-card-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--dd-spacing-md)" }}>
            <div className="dd-field">
              <span className="dd-label">名称</span>
              <input className="dd-input" placeholder="scope:read" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="dd-field">
              <span className="dd-label">描述</span>
              <input className="dd-input" placeholder="Scope 描述" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: "var(--dd-spacing-md)" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
              <span className="dd-label" style={{ margin: 0 }}>默认 scope</span>
            </label>
          </div>
          <div style={{ marginTop: "var(--dd-spacing-md)" }}>
            <button type="button" className="dd-btn dd-btn-primary" onClick={createScope} disabled={creating || !name.trim()}>
              {creating ? <span className="dd-spinner" /> : "创建"}
            </button>
          </div>
        </div>
      </div>

      <div className="dd-card" style={{ overflow: "hidden", marginTop: "var(--dd-spacing-lg)" }}>
        <div className="dd-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
              <div className="dd-spinner" />
            </div>
          ) : scopes.length === 0 ? (
            <div className="dd-empty">暂无 scope 数据</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="dd-table">
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>描述</th>
                    <th>默认</th>
                    <th>创建日期</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {scopes.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 500, fontFamily: "monospace" }}>{s.name}</td>
                      <td>{s.description || "—"}</td>
                      <td>
                        {s.is_default ? (
                          <span className="dd-badge-success">是</span>
                        ) : (
                          <span style={{ color: "var(--dd-text-muted)" }}>否</span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                        {new Date(s.created_at).toLocaleDateString("zh-CN")}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="dd-btn dd-btn-sm dd-btn-danger"
                          onClick={() => deleteScope(s.id)}
                          disabled={deleting === s.id}
                        >
                          {deleting === s.id ? <span className="dd-spinner" style={{ width: 12, height: 12 }} /> : "删除"}
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
    </div>
  )
}
