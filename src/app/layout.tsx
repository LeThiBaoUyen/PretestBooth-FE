import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import QueryProvider from "@/components/providers/QueryProvider";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import ResumeExamDialog from "@/components/exam/ResumeExamDialog";
import ConditionalFooter from "@/components/layout/ConditionalFooter";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "PRETEST BOOTH - Đánh giá năng lực sinh viên",
  description:
    "Nền tảng đánh giá năng lực sinh viên của Đại học Công nghiệp TP.HCM",
  icons: {
    icon: "/assets/iuhcm-logo.png",
    shortcut: "/assets/iuhcm-logo.png",
    apple: "/assets/iuhcm-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <QueryProvider>
          <Header />
          <BackButton />
          <ResumeExamDialog />
          {children}
          <ConditionalFooter />
        </QueryProvider>
      </body>
    </html>
  );
}
