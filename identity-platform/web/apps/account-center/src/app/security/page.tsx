"use client"
import { useState } from "react"
import { api } from "@identity/shared"
export default function SecurityPage() {
  const [secret, setSecret] = useState("")
  const [qrUrl, setQrUrl] = useState("")
  const [code, setCode] = useState("")
  const [msg, setMsg] = useState("")
  const token = () => localStorage.getItem("access_token") || ""
  const handleEnable = async () => {
    const r = await api.enableMFA(token())
    setSecret(r.secret); setQrUrl(r.qr_code_url)
  }
  const handleDisable = async () => {
    await api.disableMFA(token(), code)
    setMsg("MFA 已关闭"); setSecret(""); setQrUrl("")
  }
  return (
    <div style={{ background: "#fff", padding: 24, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <h2 style={{ fontSize: 20, marginBottom: 16 }}>安全设置</h2>
      <h3>多因素认证 (MFA)</h3>
      {!secret ? (
        <button onClick={handleEnable} style={{ padding: "10px 20px", background: "#1677ff", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>开启 MFA</button>
      ) : (
        <div>
          <p style={{ fontSize: 14, color: "#666" }}>使用 Google Authenticator 或类似应用扫描二维码：</p>
          <div style={{ background: "#f0f0f0", padding: 16, borderRadius: 4, margin: "12px 0" }}>
            <img src={qrUrl} alt="MFA QR Code" style={{ width: 180, height: 180 }} />
          </div>
          <p style={{ fontSize: 12, color: "#999" }}>密钥：{secret}</p>
          <p style={{ fontSize: 14, marginTop: 16 }}>验证并关闭 MFA：</p>
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="输入 TOTP 验证码" style={{ width: 200, padding: 8, border: "1px solid #ddd", borderRadius: 4, fontSize: 14, marginRight: 8 }} />
          <button onClick={handleDisable} style={{ padding: "8px 16px", background: "#ff4d4f", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>关闭 MFA</button>
          {msg && <p style={{ color: "green", marginTop: 8 }}>{msg}</p>}
        </div>
      )}
    </div>
  )
}