import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "PortHub — your GitHub, as a bespoke portfolio",
  description:
    "Type your GitHub username, describe a vibe, and get a unique interactive portfolio in seconds.",
  openGraph: {
    title: "PortHub — your GitHub, as a bespoke portfolio",
    description:
      "Type your GitHub username, describe a vibe, and get a unique interactive portfolio in seconds.",
    type: "website",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "PortHub — Your GitHub, as a portfolio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PortHub — your GitHub, as a bespoke portfolio",
    description:
      "Type your GitHub username, describe a vibe, and get a unique interactive portfolio in seconds.",
    images: ["/api/og"],
  },
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
