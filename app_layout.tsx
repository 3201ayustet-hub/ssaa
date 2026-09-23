import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "日本全国陣取りゲーム",
  description: "旅行の思い出で日本を塗り分ける4人用陣取りゲーム",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
