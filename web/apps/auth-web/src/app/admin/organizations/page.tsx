"use client"

import "@/app/globals.css"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface Organization {
  id: string
  name: string
  slug: string
  domain: string
  status: string
  created_at: string
}

export default function AdminOrganizationsPage() {
  const router = useRouter()
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [domain, setDomain] = useState("")
  const [creating, setCreating] = useState(false)

  const fetchOrgs = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        router.replace("/login")
        return
      }
      const params = new URLSearchParams({ page: String(page), size: "20" })
      const res = await fetch(`/api/admin/organizations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "请求失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setOrgs(data.organizations || data.data || [])
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
    fetchOrgs()
  }, [fetchOrgs, router])

  const createOrg = async () => {
    if (!name.trim() || !slug.trim()) return
    const token = localStorage.getItem("access_token")
    setCreating(true)
    setError("")
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), description: description.trim(), domain: domain.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "创建失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setName("")
      setSlug("")
      setDescription("")
      setDomain("")
      setPage(1)
      await fetchOrgs()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <h1 className="dd-page-title">组织管理</h1>

      {error && (
        <div className="dd-alert dd-alert-error">{error}</div>
      )}

      <div className="dd-card">
        <div className="dd-card-header">创建组织</div>
        <div className="dd-card-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--dd-spacing-md)" }}>
            <div className="dd-field">
              <span className="dd-label">名称</span>
              <input className="dd-input" placeholder="组织名称" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="dd-field">
              <span className="dd-label">Slug</span>
              <input className="dd-input" placeholder="organization-slug" value={slug} onChange={e => setSlug(e.target.value)} />
            </div>
            <div className="dd-field">
              <span className="dd-label">描述</span>
              <input className="dd-input" placeholder="组织描述" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="dd-field">
              <span className="dd-label">域名</span>
              <input className="dd-input" placeholder="example.com" value={domain} onChange={e => setDomain(e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: "var(--dd-spacing-md)" }}>
            <button type="button" className="dd-btn dd-btn-primary" onClick={createOrg} disabled={creating || !name.trim() || !slug.trim()}>
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
          ) : orgs.length === 0 ? (
            <div className="dd-empty">暂无组织数据</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="dd-table">
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>Slug</th>
                    <th>域名</th>
                    <th>状态</th>
                    <th>创建日期</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 500 }}>{o.name}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>{o.slug}</td>
                      <td>{o.domain || "—"}</td>
                      <td>
                        {o.status === "active" ? (
                          <span className="dd-badge-success">活跃</span>
                        ) : (
                          <span className="dd-badge-danger">禁用</span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                        {new Date(o.created_at).toLocaleDateString("zh-CN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
