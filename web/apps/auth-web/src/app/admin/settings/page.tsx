"use client"

import "@/app/globals.css"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface Setting {
  key: string
  value: string
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [formKey, setFormKey] = useState("")
  const [formValue, setFormValue] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace("/login")
      return null
    }
    return { Authorization: `Bearer ${token}` }
  }, [router])

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const headers = authHeaders()
      if (!headers) return
      const res = await fetch("/api/admin/settings", { headers })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "请求失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setSettings(data.settings || data.data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [authHeaders])

  useEffect(() => {
    const headers = authHeaders()
    if (!headers) return
    fetchSettings()
  }, [fetchSettings, authHeaders])

  const saveSetting = async (key: string, value: string) => {
    setSavingKey(key)
    setError("")
    try {
      const headers = authHeaders()
      if (!headers) return
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "保存失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setEditingKey(null)
      setFormKey("")
      setFormValue("")
      await fetchSettings()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSavingKey(null)
    }
  }

  const deleteSetting = async (key: string) => {
    setSavingKey(key)
    setError("")
    try {
      const headers = authHeaders()
      if (!headers) return
      const res = await fetch(`/api/admin/settings/${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "删除失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      await fetchSettings()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSavingKey(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formKey.trim() || !formValue.trim()) return
    saveSetting(formKey.trim(), formValue.trim())
  }

  const startEdit = (s: Setting) => {
    setEditingKey(s.key)
    setFormKey(s.key)
    setFormValue(s.value)
  }

  return (
    <div>
      <h1 className="dd-page-title">系统设置</h1>

      {error && (
        <div className="dd-alert dd-alert-error">{error}</div>
      )}

      <div className="dd-card" style={{ overflow: "hidden" }}>
        <div className="dd-card-header">配置项</div>
        <div className="dd-card-body" style={{ padding: 0 }}>
          {/* Create / update form */}
          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              gap: 8,
              padding: "1rem",
              borderBottom: "1px solid var(--dd-border)",
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            <div className="dd-field" style={{ flex: "1 1 180px", minWidth: 140 }}>
              <span className="dd-label">键</span>
              <input
                className="dd-input"
                placeholder="配置键名"
                value={formKey}
                onChange={e => setFormKey(e.target.value)}
                disabled={editingKey !== null}
              />
            </div>
            <div className="dd-field" style={{ flex: "1 1 240px", minWidth: 160 }}>
              <span className="dd-label">值</span>
              <input
                className="dd-input"
                placeholder="配置值"
                value={formValue}
                onChange={e => setFormValue(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="dd-btn dd-btn-primary"
              disabled={submitting || !formKey.trim() || !formValue.trim()}
              style={{ marginBottom: 1 }}
            >
              {submitting ? (
                <span className="dd-spinner" style={{ width: 14, height: 14 }} />
              ) : (
                "保存"
              )}
            </button>
            {editingKey && (
              <button
                type="button"
                className="dd-btn dd-btn-secondary"
                onClick={() => { setEditingKey(null); setFormKey(""); setFormValue("") }}
                style={{ marginBottom: 1 }}
              >
                取消
              </button>
            )}
          </form>

          {/* Table */}
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
              <div className="dd-spinner" />
            </div>
          ) : settings.length === 0 ? (
            <div className="dd-empty">暂无配置项</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="dd-table">
                <thead>
                  <tr>
                    <th>键</th>
                    <th>值</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.map(s => (
                    <tr key={s.key}>
                      <td style={{ fontFamily: "monospace", fontSize: "0.8125rem", fontWeight: 500 }}>
                        {s.key}
                      </td>
                      <td style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.value}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            className="dd-btn dd-btn-primary dd-btn-sm"
                            onClick={() => startEdit(s)}
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            className="dd-btn dd-btn-danger dd-btn-sm"
                            onClick={() => deleteSetting(s.key)}
                            disabled={savingKey === s.key}
                          >
                            {savingKey === s.key ? (
                              <span className="dd-spinner" style={{ width: 12, height: 12 }} />
                            ) : (
                              "删除"
                            )}
                          </button>
                        </div>
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
