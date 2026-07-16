export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: "-apple-system, sans-serif", background: "#f5f5f5" }}>
        <nav style={{ background: "#fff", borderBottom: "1px solid #e0e0e0", padding: "12px 24px", display: "flex", gap: 24 }}>
          <a href="/profile" style={{ color: "#333", textDecoration: "none" }}>个人资料</a>
          <a href="/security" style={{ color: "#333", textDecoration: "none" }}>安全设置</a>
          <a href="/devices" style={{ color: "#333", textDecoration: "none" }}>登录设备</a>
          <a href="/apps" style={{ color: "#333", textDecoration: "none" }}>已授权应用</a>
        </nav>
        <main style={{ maxWidth: 800, margin: "24px auto", padding: "0 24px" }}>{children}</main>
      </body>
    </html>
  )
}
