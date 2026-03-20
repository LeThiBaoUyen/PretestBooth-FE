import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import QueryProvider from "@/components/providers/QueryProvider";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "PRETEST BOOTH - Đánh giá năng lực sinh viên",
  description:
    "Nền tảng đánh giá năng lực sinh viên của Đại học Công nghiệp TP.HCM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <QueryProvider>
          <Header />
          <BackButton />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
