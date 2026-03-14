import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Chauchero — Tu dinero, claro.",
    template: "%s · Chauchero",
  },
  description:
    "Rastreador de gastos bancarios chileno. Extrae transacciones automáticamente desde tus emails de banco.",
  keywords: ["gastos", "banco", "chile", "transacciones", "finanzas personales"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#09090B" },
    { media: "(prefers-color-scheme: light)", color: "#F2F3F8" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
