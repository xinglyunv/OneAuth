"use client"

import "@/app/globals.css"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface LoginFailure {
  id: string
  email: string
  ip_address: string
  reason: string
  created_at: string
}

interface IpRule {
  id: string
  ip_or_cidr: string
  type: string
  reason: string
}

export default function AdminSecurityPage() {
  const router = useRouter()

  // Login failures
  const [failures, setFailures] = useState<LoginFailure[]>([])
  const [failuresLoading, setFailuresLoading] = useState(true)
  const [failuresPage, setFailuresPage] = useState(1)
  const [failuresTotalPages, setFailuresTotalPages] = useState(1)

  // IP rules
  const [rules, setRules] = useState<IpRule[]>([])
  const [rulesLoading, setRulesLoading] = useState(true)
  const [formIp, setFormIp] = useState("")
  const [formType, setFormType] = useState("blacklist")
  const [formReason, setFormReason] = useState("")

  // Shared
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace("/login")
      return null
    }
    return { Authorization: `Bearer ${token}` }
  }, [router])

  const fetchFailures = useCallback(async () => {
    setFailuresLoading(true)
    setError("")
    try {
      const headers = authHeaders()
      if (!headers) return
      const res = await fetch(`/api/admin/security/login-failures?page=${failuresPage}&size=20`, { headers })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "请求失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setFailures(data.failures || data.data || [])
      setFailuresTotalPages(data.total_pages || data.pages || 1)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setFailuresLoading(false)
    }
  }, [failuresPage, authHeaders])

  const fetchRules = useCallback(async () => {
    setRulesLoading(true)
    setError("")
    try {
      const headers = authHeaders()
      if (!headers) return
      const res = await fetch("/api/admin/security/ip-rules", { headers })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "请求失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setRules(data.rules || data.data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setRulesLoading(false)
    }
  }, [authHeaders])

  useEffect(() => {
    const headers = authHeaders()
    if (!headers) return
    fetchFailures()
    fetchRules()
  }, [fetchFailures, fetchRules, authHeaders])

  const addRule = async () => {
    if (!formIp.trim()) return
    setSubmitting(true)
    setError("")
    try {
      const headers = authHeaders()
      if (!headers) return
      const res = await fetch("/api/admin/security/ip-rules", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ ip_or_cidr: formIp.trim(), type: formType, reason: formReason.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "添加失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setFormIp("")
      setFormType("blacklist")
      setFormReason("")
      await fetchRules()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const deleteRule = async (id: string) => {
    setDeleting(id)
    setError("")
    try {
      const headers = authHeaders()
      if (!headers) return
      const res = await fetch(`/api/admin/security/ip-rules/${id}`, {
        method: "DELETE",
        headers,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "删除失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      await fetchRules()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      <h1 className="dd-page-title">安全中心</h1>

      {error && (
        <div className="dd-alert dd-alert-error">{error}</div>
      )}

      {/* Section 1: 登录失败记录 */}
      <div className="dd-card" style={{ overflow: "hidden", marginBottom: "1.25rem" }}>
        <div className="dd-card-header">登录失败记录</div>
        <div className="dd-card-body" style={{ padding: 0 }}>
          {failuresLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
              <div className="dd-spinner" />
            </div>
          ) : failures.length === 0 ? (
            <div className="dd-empty">暂无登录失败记录</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="dd-table">
                <thead>
                  <tr>
                    <th>邮箱</th>
                    <th>IP 地址</th>
                    <th>失败原因</th>
                    <th>时间</th>
                  </tr>
                </thead>
                <tbody>
                  {failures.map(f => (
                    <tr key={f.id}>
                      <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {f.email}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--dd-text-secondary)" }}>
                        {f.ip_address}
                      </td>
                      <td>{f.reason}</td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--dd-text-secondary)", whiteSpace: "nowrap" }}>
                        {new Date(f.created_at).toLocaleString("zh-CN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {failuresTotalPages > 1 && (
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--dd-border)" }}>
            <div className="dd-pagination">
              <button
                type="button"
                className="dd-btn dd-btn-secondary dd-btn-sm"
                disabled={failuresPage <= 1}
                onClick={() => setFailuresPage(p => Math.max(1, p - 1))}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                上一页
              </button>
              <span className="dd-page-info">{failuresPage} / {failuresTotalPages}</span>
              <button
                type="button"
                className="dd-btn dd-btn-secondary dd-btn-sm"
                disabled={failuresPage >= failuresTotalPages}
                onClick={() => setFailuresPage(p => Math.min(failuresTotalPages, p + 1))}
              >
                下一页
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: IP 规则 */}
      <div className="dd-card" style={{ overflow: "hidden" }}>
        <div className="dd-card-header">IP 规则</div>
        <div className="dd-card-body">
          {/* Create form */}
          <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="dd-field" style={{ flex: "1 1 160px", minWidth: 140 }}>
              <span className="dd-label">IP/CIDR</span>
              <input
                className="dd-input"
                placeholder="如 192.168.1.0/24"
                value={formIp}
                onChange={e => setFormIp(e.target.value)}
              />
            </div>
            <div className="dd-field" style={{ flex: "0 0 130px" }}>
              <span className="dd-label">类型</span>
              <select
                className="dd-select"
                value={formType}
                onChange={e => setFormType(e.target.value)}
              >
                <option value="blacklist">黑名单</option>
                <option value="whitelist">白名单</option>
              </select>
            </div>
            <div className="dd-field" style={{ flex: "1 1 160px", minWidth: 140 }}>
              <span className="dd-label">原因</span>
              <input
                className="dd-input"
                placeholder="添加原因"
                value={formReason}
                onChange={e => setFormReason(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addRule() }}
              />
            </div>
            <button
              type="button"
              className="dd-btn dd-btn-primary"
              disabled={submitting || !formIp.trim()}
              onClick={addRule}
              style={{ marginBottom: 1 }}
            >
              {submitting ? <span className="dd-spinner" style={{ width: 14, height: 14 }} /> : "添加"}
            </button>
          </div>

          {/* Rules table */}
          {rulesLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem 0" }}>
              <div className="dd-spinner" />
            </div>
          ) : rules.length === 0 ? (
            <div className="dd-empty">暂无 IP 规则</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="dd-table">
                <thead>
                  <tr>
                    <th>IP/CIDR</th>
                    <th>类型</th>
                    <th>原因</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>{r.ip_or_cidr}</td>
                      <td>
                        {r.type === "blacklist" ? (
                          <span className="dd-badge dd-badge-danger">黑名单</span>
                        ) : (
                          <span className="dd-badge dd-badge-success">白名单</span>
                        )}
                      </td>
                      <td>{r.reason || "—"}</td>
                      <td>
                        <button
                          type="button"
                          className="dd-btn dd-btn-danger dd-btn-sm"
                          onClick={() => deleteRule(r.id)}
                          disabled={deleting === r.id}
                        >
                          {deleting === r.id ? (
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
      </div>
    </div>
  )
}
