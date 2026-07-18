import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "OneAuth Admin Console",
  description: "OneAuth Identity Platform Administration",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
