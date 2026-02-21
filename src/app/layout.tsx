import type { Metadata } from "next";
import Script from 'next/script';
import "./globals.css";

export const metadata: Metadata = {
  title: "Tool Credit Score — MCP Tool Spec Analyzer",
  description: "Deterministic scoring + auto-fix for MCP tool specifications. Score, fix, and optionally polish your agent tool contracts.",
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
          strategy="afterInteractive"
          async
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
