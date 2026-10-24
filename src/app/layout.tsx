import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { Suspense } from "react";
import "./globals.css";
import { MobileShell } from "@/src/components/shell/mobile-shell";
import { ThemeScript } from "@/src/components/shell/theme-script";
import { BottomNav } from "@/src/components/shell/bottom-nav";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["700"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Super Petes Lagunak",
  description: "Super Manager privado del Lagunak Senior Masculino A",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcf9f8" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${jakarta.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex h-dvh flex-col overflow-hidden">
        <MobileShell
          barraNavegacion={
            <Suspense fallback={null}>
              <BottomNav />
            </Suspense>
          }
        >
          {children}
        </MobileShell>
      </body>
    </html>
  );
}
