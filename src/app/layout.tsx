import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Routy — Interactive Skill Tree",
  description: "Turn any learning goal into an RPG-style skill tree. AI-powered learning roadmaps with gamification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
