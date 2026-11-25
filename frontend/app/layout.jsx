import "./globals.css";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import AppToaster from "@/components/AppToaster";
import { AuthProvider } from "@/context/AuthContext";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap", axes: ["opsz"] });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata = {
  title: { default: "PromptToInvoice - Describe it. Send it. Get paid.", template: "%s | PromptToInvoice" },
  description: "AI-powered invoicing for freelancers and small businesses. Turn a plain-language description into a professional invoice in seconds.",
  icons: { icon: "/favicon.svg" },
  robots: { index: true, follow: true },
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#0F6F4E" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="bg-paper text-ink-900 font-sans antialiased selection:bg-signal selection:text-ink-950">
        <AuthProvider>{children}</AuthProvider>
        <AppToaster />
      </body>
    </html>
  );
}
