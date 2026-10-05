import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mafia Night — Social Deduction",
  description: "A cinematic multiplayer Mafia party game.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#050507", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
