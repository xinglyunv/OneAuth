"use client"

import "@/app/globals.css"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { api } from "@identity/shared"
import type { Session } from "@identity/shared"

export default function SessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [revoking, setRevoking] = useState<string | null>(null)

  const fetchSessions = useCallback(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace("/login")
      return
    }

    api
      .listSessions(token)
      .then(data => setSessions(data.sessions ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [router])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleRevoke = async (sessionId: string) => {
    setRevoking(sessionId)
    const token = localStorage.getItem("access_token") || ""
    try {
      await api.revokeSession(token, sessionId)
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "撤销会话失败")
    } finally {
      setRevoking(null)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 0" }}>
        <span className="cc-spinner" />
      </div>
    )
  }

  if (error) {
    return <div className="cc-alert cc-alert-error">{error}</div>
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        活动会话
      </h2>

      {sessions.length === 0 ? (
        <div className="cc-empty">没有活动会话</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {sessions.map((session) => (
            <div
              key={session.session_id}
              className="cc-card"
              style={{
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.9375rem",
                    marginBottom: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {session.device_name || "未知设备"}
                  {session.is_current && (
                    <span className="cc-badge cc-badge-primary">当前</span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--cc-text-secondary)",
                    display: "flex",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    {[session.os, session.browser].filter(Boolean).join(" / ") || "未知平台"}
                  </span>
                  <span>IP: {session.ip_address}</span>
                  <span>
                    {new Date(session.created_at).toLocaleString("zh-CN")}
                  </span>
                </div>
              </div>
              {!session.is_current && (
                <button
                  className="cc-btn cc-btn-danger cc-btn-sm"
                  onClick={() => handleRevoke(session.session_id)}
                  disabled={revoking === session.session_id}
                >
                  {revoking === session.session_id ? "撤销中..." : "撤销"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
