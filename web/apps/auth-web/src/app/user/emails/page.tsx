"use client"

import "@/app/globals.css"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"

interface Email {
  id: string
  email: string
  is_primary: boolean
  verified: boolean
}

export default function EmailsPage() {
  const router = useRouter()
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [adding, setAdding] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)

  const headers = useCallback(() => {
    const token = localStorage.getItem("access_token")
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }
  }, [])

  const fetchEmails = useCallback(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace("/login")
      return
    }
    setLoading(true)
    fetch("/api/user/emails", { headers: headers() })
      .then((r) => {
        if (!r.ok) throw new Error("获取邮箱列表失败")
        return r.json()
      })
      .then(data => setEmails(data.emails))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [router, headers])

  useEffect(() => {
    fetchEmails()
  }, [fetchEmails])

  const handleAdd = async () => {
    if (!newEmail.trim()) return
    setError("")
    setAdding(true)
    try {
      const res = await fetch("/api/user/emails", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ email: newEmail.trim() }),
      })
      if (!res.ok) throw new Error("添加邮箱失败")
      setNewEmail("")
      await fetchEmails()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "添加邮箱失败")
    } finally {
      setAdding(false)
    }
  }

  const handleSetPrimary = async (id: string) => {
    setActionId(id)
    try {
      const res = await fetch(`/api/user/emails/${id}/primary`, { method: "PUT", headers: headers() })
      if (!res.ok) throw new Error("设置主邮箱失败")
      await fetchEmails()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "设置主邮箱失败")
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setActionId(id)
    try {
      const res = await fetch(`/api/user/emails/${id}`, { method: "DELETE", headers: headers() })
      if (!res.ok) throw new Error("删除邮箱失败")
      await fetchEmails()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "删除邮箱失败")
    } finally {
      setActionId(null)
    }
  }

  const handleVerify = async (id: string) => {
    setActionId(id)
    try {
      const res = await fetch(`/api/user/emails/${id}/verify`, { method: "POST", headers: headers() })
      if (!res.ok) throw new Error("发送验证邮件失败")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "发送验证邮件失败")
    } finally {
      setActionId(null)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 0" }}>
        <span className="cc-spinner" />
      </div>
    )
  }

  return (
    <div className="cc-wide">
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        邮箱管理
      </h2>

      {error && (
        <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {emails.length === 0 ? (
        <div className="cc-card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div className="cc-empty">暂无邮箱</div>
        </div>
      ) : (
        <div className="cc-card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {emails.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  padding: "0.75rem 0",
                  borderBottom: "1px solid var(--cc-border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 500 }}>{item.email}</span>
                  {item.is_primary && <span className="cc-badge cc-badge-primary">主邮箱</span>}
                  {!item.is_primary && item.verified && <span className="cc-badge cc-badge-success">已验证</span>}
                  {!item.verified && <span className="cc-badge cc-badge-warning">未验证</span>}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  {!item.is_primary && (
                    <button
                      className="cc-btn cc-btn-sm cc-btn-secondary"
                      onClick={() => handleSetPrimary(item.id)}
                      disabled={actionId === item.id}
                    >
                      {actionId === item.id ? "..." : "设为主邮箱"}
                    </button>
                  )}
                  {!item.verified && (
                    <button
                      className="cc-btn cc-btn-sm cc-btn-secondary"
                      onClick={() => handleVerify(item.id)}
                      disabled={actionId === item.id}
                    >
                      {actionId === item.id ? "..." : "验证"}
                    </button>
                  )}
                  {!item.is_primary && (
                    <button
                      className="cc-btn cc-btn-sm cc-btn-danger"
                      onClick={() => handleDelete(item.id)}
                      disabled={actionId === item.id}
                    >
                      {actionId === item.id ? "..." : "删除"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="cc-card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label className="cc-label" htmlFor="new_email">
              添加邮箱
            </label>
            <input
              id="new_email"
              className="cc-input"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="输入新邮箱地址"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <button
            className="cc-btn cc-btn-primary"
            onClick={handleAdd}
            disabled={adding || !newEmail.trim()}
            style={{ marginBottom: "0.125rem" }}
          >
            {adding ? "添加中..." : "添加邮箱"}
          </button>
        </div>
      </div>
    </div>
  )
}
