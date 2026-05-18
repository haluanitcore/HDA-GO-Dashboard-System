import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RootWrapper } from "@/components/shared/RootWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HDA Go | Creator Growth OS",
  description: "Next-gen platform for creators to grow and manage their ecosystem.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.className} bg-[#0C0E10] text-white antialiased`}>
        <RootWrapper>
          {children}
        </RootWrapper>
      </body>
    </html>
  );
}
