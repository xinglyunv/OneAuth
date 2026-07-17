"use client"

import "@/app/globals.css"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { api } from "@identity/shared"
import type { UserProfile } from "@identity/shared"

export default function MfaPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const [mfaSecret, setMfaSecret] = useState("")
  const [mfaQrUrl, setMfaQrUrl] = useState("")
  const [disableCode, setDisableCode] = useState("")
  const [showDisableInput, setShowDisableInput] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace("/login")
      return
    }

    api
      .getProfile(token)
      .then(setProfile)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [router])

  const handleEnable = async () => {
    setError("")
    setSuccess("")
    setActionLoading(true)

    const token = localStorage.getItem("access_token") || ""
    try {
      const result = await api.enableMFA(token)
      setMfaSecret(result.secret)
      setMfaQrUrl(result.qr_code_url)
      // Refresh profile to reflect MFA status
      const updated = await api.getProfile(token)
      setProfile(updated)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "启用 MFA 失败")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDisable = async () => {
    if (!disableCode.trim()) {
      setError("请输入 TOTP 验证码")
      return
    }

    setError("")
    setSuccess("")
    setActionLoading(true)

    const token = localStorage.getItem("access_token") || ""
    try {
      await api.disableMFA(token, disableCode.trim())
      setSuccess("MFA 已成功禁用")
      setShowDisableInput(false)
      setDisableCode("")
      setMfaSecret("")
      setMfaQrUrl("")
      // Refresh profile
      const updated = await api.getProfile(token)
      setProfile(updated)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "禁用 MFA 失败")
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 0" }}>
        <span className="cc-spinner" />
      </div>
    )
  }

  if (!profile && error) {
    return <div className="cc-alert cc-alert-error">{error}</div>
  }

  const mfaEnabled = profile?.mfa_enabled || false

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        多因素认证 (MFA)
      </h2>

      {error && (
        <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}
      {success && (
        <div className="cc-alert cc-alert-success" style={{ marginBottom: "1rem" }}>
          {success}
        </div>
      )}

      {/* Status Card */}
      <div className="cc-card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.375rem" }}>
              MFA 状态
            </div>
            <span
              className={mfaEnabled ? "cc-badge cc-badge-success" : "cc-badge cc-badge-warning"}
            >
              {mfaEnabled ? "已启用" : "未启用"}
            </span>
          </div>
          {!mfaEnabled && (
            <button
              className="cc-btn cc-btn-primary"
              onClick={handleEnable}
              disabled={actionLoading}
            >
              {actionLoading ? "启用中..." : "启用 MFA"}
            </button>
          )}
        </div>
      </div>

      {/* Setup QR/Secret - shown after enable is called */}
      {mfaSecret && (
        <div className="cc-card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "1rem" }}>
            MFA 配置信息
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--cc-text-secondary)", marginBottom: "0.75rem" }}>
            请使用 Google Authenticator 或 Authy 等应用扫描以下二维码，或手动输入密钥。
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1.5rem", flexWrap: "wrap" }}>
            {mfaQrUrl && (
              <div
                style={{
                  padding: "0.75rem",
                  border: "1px solid var(--cc-border)",
                  borderRadius: "var(--cc-radius-sm)",
                  display: "inline-block",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mfaQrUrl}
                  alt="MFA QR Code"
                  style={{ width: 160, height: 160, display: "block" }}
                />
              </div>
            )}
            <div>
              <div style={{ fontSize: "0.8125rem", color: "var(--cc-text-muted)", marginBottom: "0.375rem" }}>
                手动密钥
              </div>
              <code
                style={{
                  background: "#f1f5f9",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "var(--cc-radius-sm)",
                  fontSize: "0.875rem",
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                }}
              >
                {mfaSecret}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Disable MFA */}
      {mfaEnabled && (
        <div className="cc-card" style={{ padding: "1.5rem" }}>
          <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.5rem" }}>
            禁用 MFA
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--cc-text-secondary)", marginBottom: "1rem" }}>
            禁用后将关闭双因素认证保护。
          </div>
          {!showDisableInput ? (
            <button
              className="cc-btn cc-btn-danger"
              onClick={() => setShowDisableInput(true)}
            >
              禁用 MFA
            </button>
          ) : (
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <input
                  className="cc-input"
                  type="text"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  placeholder="输入 TOTP 验证码"
                  maxLength={6}
                />
              </div>
              <button
                className="cc-btn cc-btn-danger"
                onClick={handleDisable}
                disabled={actionLoading}
              >
                {actionLoading ? "验证中..." : "确认禁用"}
              </button>
              <button
                className="cc-btn cc-btn-secondary"
                onClick={() => {
                  setShowDisableInput(false)
                  setDisableCode("")
                }}
              >
                取消
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
