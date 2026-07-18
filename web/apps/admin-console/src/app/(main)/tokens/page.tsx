"use client"
import { useEffect, useState } from "react"

export default function AdminTokensPage() {
  const [tokens, setTokens] = useState<any[]>([])
  const [total, setTotal] = useState(0); const [page, setPage] = useState(1); const size = 30
  const [loading, setLoading] = useState(true)

  function fetchTokens() {
    setLoading(true)
    fetch("/api/admin/tokens?page=" + page + "&size=" + size, { credentials: "include" })
      .then(r => r.json()).then(d => { setTokens(d.tokens || []); setTotal(d.total || 0) })
      .catch(() => setTokens([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTokens() }, [page])

  async function revokeToken(tid: string) {
    if (!confirm("Revoke this token?")) return
    await fetch("/api/admin/tokens/" + tid, { method: "DELETE", credentials: "include" })
    fetchTokens()
  }

  const totalPages = Math.ceil(total / size) || 1

  return (
    <div>
      <div className="dd-page-title">Access Tokens</div>
      <div className="dd-card"><div className="dd-card-body" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: "2rem", textAlign: "center" }}><div className="dd-spinner" /></div> : (
          <table className="dd-table">
            <thead><tr><th>Client ID</th><th>User ID</th><th>Scope</th><th>Expires</th><th style={{ width: 80 }}>Actions</th></tr></thead>
            <tbody>
              {tokens.map((t: any) => (
                <tr key={t.id}>
                  <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{t.client_id?.substring(0, 16)}...</td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{t.user_id?.substring(0, 12)}...</td>
                  <td style={{ fontSize: "0.75rem" }}>{t.scope || "-"}</td>
                  <td style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>{t.expires_at ? new Date(t.expires_at).toLocaleString() : "-"}</td>
                  <td><button className="dd-btn dd-btn-sm dd-btn-danger" onClick={() => revokeToken(t.id)}>Revoke</button></td>
                </tr>
              ))}
              {tokens.length === 0 && <tr><td colSpan={5}><div className="dd-empty">No tokens found</div></td></tr>}
            </tbody>
          </table>
        )}
      </div></div>
      {totalPages > 1 && <div className="dd-pagination">
        <button className="dd-btn dd-btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
        <span className="dd-page-info">Page {page} of {totalPages}</span>
        <button className="dd-btn dd-btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>}
    </div>
  )
}
