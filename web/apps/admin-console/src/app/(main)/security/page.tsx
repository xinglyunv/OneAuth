"use client"
import { useEffect, useState } from "react"

export default function AdminSecurityPage() {
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: "", rule_type: "ip_allow", value: "", enabled: true })

  function fetchRules() {
    setLoading(true)
    fetch("/api/admin/security/ip-rules", { credentials: "include" })
      .then(r => r.json()).then(d => setRules(d.rules || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRules() }, [])

  async function handleCreate() {
    const res = await fetch("/api/admin/security/ip-rules", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form), credentials: "include",
    })
    if (res.ok) { setShowCreate(false); setForm({ name: "", rule_type: "ip_allow", value: "", enabled: true }); fetchRules() }
    else alert((await res.json()).error || "Failed")
  }

  async function toggleRule(id: string) {
    await fetch("/api/admin/security/ip-rules/" + id + "/toggle", { method: "PUT", credentials: "include" })
    fetchRules()
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div className="dd-page-title" style={{ margin: 0 }}>Security Rules</div>
        <button className="dd-btn dd-btn-primary" onClick={() => setShowCreate(true)}>+ Add Rule</button>
      </div>

      <div className="dd-card"><div className="dd-card-body">
        {loading ? <div style={{ textAlign: "center", padding: "1rem" }}><div className="dd-spinner" /></div> : (
          <table className="dd-table">
            <thead><tr><th>Name</th><th>Type</th><th>Value</th><th>Enabled</th><th style={{ width: 100 }}>Actions</th></tr></thead>
            <tbody>
              {rules.map((r: any) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.name}</td>
                  <td><span className="dd-badge dd-badge-purple">{r.rule_type}</span></td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>{r.value}</td>
                  <td>{r.enabled ? <span className="dd-badge dd-badge-success">Enabled</span> : <span className="dd-badge dd-badge-danger">Disabled</span>}</td>
                  <td><button className="dd-btn dd-btn-sm" onClick={() => toggleRule(r.id)}>{r.enabled ? "Disable" : "Enable"}</button></td>
                </tr>
              ))}
              {rules.length === 0 && <tr><td colSpan={5}><div className="dd-empty">No security rules. Add your first rule to restrict access.</div></td></tr>}
            </tbody>
          </table>
        )}
      </div></div>

      {showCreate && <div className="dd-modal-overlay" onClick={() => setShowCreate(false)}>
        <div className="dd-modal" onClick={e => e.stopPropagation()}>
          <h3>Add IP Rule</h3>
          <div className="sub">Restrict access based on IP address</div>
          <div className="dd-field" style={{ marginBottom: "1rem" }}><label className="dd-label">Name</label><input className="dd-input" style={{ width: "100%" }} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="dd-field" style={{ marginBottom: "1rem" }}><label className="dd-label">Type</label><select className="dd-select" style={{ width: "100%" }} value={form.rule_type} onChange={e => setForm(f => ({ ...f, rule_type: e.target.value }))}><option value="ip_allow">IP Allow</option><option value="ip_deny">IP Deny</option></select></div>
          <div className="dd-field" style={{ marginBottom: "1rem" }}><label className="dd-label">IP / CIDR</label><input className="dd-input" style={{ width: "100%" }} placeholder="192.168.1.0/24" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></div>
          <div className="dd-modal-actions"><button className="dd-btn" onClick={() => setShowCreate(false)}>Cancel</button><button className="dd-btn dd-btn-primary" onClick={handleCreate}>Add</button></div>
        </div>
      </div>}
    </div>
  )
}
