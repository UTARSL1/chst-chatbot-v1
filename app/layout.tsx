import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "CHST-Chatbot V1.7",
    description: "CHST Chatbot V1.7 - AI-powered research policy assistant",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <body className={inter.className}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
