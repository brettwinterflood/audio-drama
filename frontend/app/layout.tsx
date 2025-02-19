import type React from "react"
import "./globals.css"
import { Inter } from 'next/font/google'
import Script from "next/script"
import Sidebar from "@/components/Sidebar"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "60 Second Audio Drama Generator",
  description: "Generate short audio dramas from scripts",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <Script src="https://unpkg.com/wavesurfer.js@6.6.3/dist/wavesurfer.min.js" strategy="beforeInteractive" />
      </head>
      <body className={inter.className}>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}

