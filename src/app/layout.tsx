import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SudaPoker — Planning Poker com as Emoções",
  description: "Transforme suas estimativas Scrum numa experiência divertida com os personagens do Divertida Mente!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka+One:wght@400&family=Nunito:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-[Nunito,sans-serif] bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
