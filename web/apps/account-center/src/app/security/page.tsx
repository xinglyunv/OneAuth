"use client"
import { useEffect, useState } from "react"
import { api, MFASetupResponse } from "@identity/shared"

export default function SecurityPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mfaSetup, setMfaSetup] = useState<MFASetupResponse | null>(null)
  const [totpCode, setTotpCode] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : ""

  const loadProfile = async () => {
    if (!token) { window.location.href = "http://localhost:3001/login"; return }
    try {
      const p = await api.getProfile(token)
      setProfile(p)
    } catch { window.location.href = "http://localhost:3001/login" }
    finally { setLoading(false) }
  }

  useEffect(() => { loadProfile() }, [])

  const handleEnableMFA = async () => {
    setError("")
    setSuccess("")
    setActionLoading(true)
    try {
      const resp = await api.enableMFA(token)
      setMfaSetup(resp)
      setSuccess("MFA 密钥已生成，请扫码设置")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "启用失败")
    }
    setActionLoading(false)
  }

  const handleVerifyMFA = async () => {
    if (totpCode.length < 6) { setError("请输入 6 位验证码"); return }
    setError("")
    setActionLoading(true)
    try {
      await api.mfaValidate("setup", totpCode)
      setSuccess("MFA 设置成功")
      setMfaSetup(null)
      setTotpCode("")
      loadProfile()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "验证失败")
    }
    setActionLoading(false)
  }

  const handleDisableMFA = async () => {
    if (!totpCode) { setError("请输入验证码"); return }
    setError("")
    setActionLoading(true)
    try {
      await api.disableMFA(token, totpCode)
      setSuccess("MFA 已禁用")
      setTotpCode("")
      loadProfile()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "操作失败")
    }
    setActionLoading(false)
  }

  if (loading) return <div className="cc-card" style={{ padding: "2rem", textAlign: "center" }}><div className="cc-skeleton" style={{ width: "100%", height: 120 }} /></div>
  if (!profile) return <div className="cc-alert cc-alert-error">加载失败</div>

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>安全设置</h2>

      {error && <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}
      {success && <div className="cc-alert cc-alert-success" style={{ marginBottom: "1rem" }}>{success}</div>}

      <div className="cc-card" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>多因素认证 (MFA)</h3>
        <p style={{ fontSize: "0.875rem", color: "var(--cc-text-secondary)", marginBottom: "1rem" }}>
          启用 TOTP 多因素认证为账户增加额外的安全保护
        </p>

        {profile.mfa_enabled ? (
          <div>
            <div className="cc-badge cc-badge-success" style={{ marginBottom: "1rem" }}>已启用</div>
            <div style={{ marginBottom: "0.75rem" }}>
              <label className="cc-label">TOTP 验证码</label>
              <input className="cc-input" type="text" maxLength={6} inputMode="numeric" value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, ""))} placeholder="输入 6 位验证码" style={{ maxWidth: 240 }} />
            </div>
            <button className="cc-btn cc-btn-danger" onClick={handleDisableMFA} disabled={actionLoading}>
              {actionLoading ? "处理中..." : "禁用 MFA"}
            </button>
          </div>
        ) : (
          <div>
            {mfaSetup ? (
              <div>
                <div style={{ marginBottom: "0.75rem" }}>
                  <label className="cc-label">密钥</label>
                  <code style={{ display: "block", padding: "0.5rem", background: "#f1f5f9", borderRadius: "var(--cc-radius-sm)", fontSize: "0.875rem", fontFamily: "monospace", wordBreak: "break-all" }}>{mfaSetup.secret}</code>
                </div>
                {mfaSetup.qr_code_url && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <label className="cc-label">扫码设置</label>
                    <img src={mfaSetup.qr_code_url} alt="MFA QR Code" style={{ width: 160, height: 160, border: "1px solid var(--cc-border)", borderRadius: "var(--cc-radius-sm)" }} />
                  </div>
                )}
                <div style={{ marginBottom: "0.75rem" }}>
                  <label className="cc-label">验证 TOTP 验证码</label>
                  <input className="cc-input" type="text" maxLength={6} inputMode="numeric" value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, ""))} placeholder="输入 6 位验证码" style={{ maxWidth: 240 }} />
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="cc-btn cc-btn-primary" onClick={handleVerifyMFA} disabled={actionLoading || totpCode.length < 6}>
                    {actionLoading ? "验证中..." : "验证并启用"}
                  </button>
                  <button className="cc-btn cc-btn-ghost" onClick={() => { setMfaSetup(null); setTotpCode("") }}>
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <button className="cc-btn cc-btn-primary" onClick={handleEnableMFA} disabled={actionLoading}>
                {actionLoading ? "生成中..." : "启用 MFA"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
