import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import SbfAiAssistant from "@/components/assistant/SbfAiAssistant";

export const metadata: Metadata = {
  title: "SBF WORLD OS — Institutional Capital Deployment System",
  description:
    "A private capital deployment, deal management, and investment operating system.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-ink-950 text-chalk antialiased">
        <SessionProvider>
          {children}
          <SbfAiAssistant />
        </SessionProvider>
      </body>
    </html>
  );
}
