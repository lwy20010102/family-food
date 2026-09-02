import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaRegister } from "@/app/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FamilyFood",
    template: "%s · FamilyFood",
  },
  description: "家庭智能点菜平台",
  applicationName: "FamilyFood",
  appleWebApp: {
    capable: true,
    title: "FamilyFood",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#15803d",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
