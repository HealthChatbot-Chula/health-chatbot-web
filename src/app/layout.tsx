import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Health Chatbot",
  description: "LINE-gated web chat for the health chatbot"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
