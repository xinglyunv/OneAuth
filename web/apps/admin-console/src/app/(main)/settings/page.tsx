"use client"
import { useEffect, useState } from "react"

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editKey, setEditKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  function fetchSettings() {
    setLoading(true)
    fetch("/api/admin/settings", { credentials: "include" })
      .then(r => r.json()).then(d => setSettings(d.settings || []))
      .catch(() => setSettings([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchSettings() }, [])

  async function handleUpdate(key: string) {
    const res = await fetch("/api/admin/settings/" + key, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: editValue }), credentials: "include",
    })
    if (res.ok) { setEditKey(null); fetchSettings() }
    else alert((await res.json()).error || "Failed")
  }

  return (
    <div>
      <div className="dd-page-title">System Settings</div>
      <div className="dd-card"><div className="dd-card-body" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: "2rem", textAlign: "center" }}><div className="dd-spinner" /></div> : (
          <table className="dd-table">
            <thead><tr><th>Key</th><th>Value</th><th>Updated</th><th style={{ width: 80 }}>Actions</th></tr></thead>
            <tbody>
              {settings.map((s: any) => (
                <tr key={s.id}>
                  <td style={{ fontFamily: "monospace", fontWeight: 500, fontSize: "0.8125rem" }}>{s.key}</td>
                  <td>
                    {editKey === s.key ? (
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <input className="dd-input" value={editValue} onChange={e => setEditValue(e.target.value)} style={{ minWidth: 200 }} />
                        <button className="dd-btn dd-btn-sm dd-btn-primary" onClick={() => handleUpdate(s.key)}>Save</button>
                        <button className="dd-btn dd-btn-sm" onClick={() => setEditKey(null)}>Cancel</button>
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.8125rem" }}>{s.value}</span>
                    )}
                  </td>
                  <td style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>{s.updated_at ? new Date(s.updated_at).toLocaleString() : "-"}</td>
                  <td><button className="dd-btn dd-btn-sm" onClick={() => { setEditKey(s.key); setEditValue(s.value) }}>Edit</button></td>
                </tr>
              ))}
              {settings.length === 0 && <tr><td colSpan={4}><div className="dd-empty">No settings found</div></td></tr>}
            </tbody>
          </table>
        )}
      </div></div>
    </div>
  )
}
