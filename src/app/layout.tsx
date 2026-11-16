import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { AccountProvider } from "./account-provider";

export const metadata: Metadata = {
  title: "CareerBridge — Career and education guidance",
  description:
    "Explore career and education possibilities at your own pace with CareerBridge.",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <ClerkProvider>
          <AccountProvider>{children}</AccountProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
