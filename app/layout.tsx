import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

// export const metadata: Metadata = {
//     title: "CHST-Chatbot V1.9",
//     description: "CHST Chatbot V1.9 - AI-powered research policy assistant",
// };

export const metadata: Metadata = {
    title: {
        default: "CHST Chatbot - UTAR Centre for Healthcare Science and Technology",
        template: "%s | CHST Chatbot"
    },
    description: "Centre for Healthcare Science and Technology AI chatbot assistant. Get instant answers about courses, research, healthcare science programs, and academic policies at Universiti Tunku Abdul Rahman.",
    keywords: [
        "CHST chatbot",
        "UTAR chatbot",
        "Universiti Tunku Abdul Rahman",
        "Centre for Healthcare Science and Technology",
        "UTAR AI assistant",
        "healthcare science chatbot"
    ],
    authors: [{ name: "Ir. Ts. Dr. Hum Yan Chai" }],
    openGraph: {
        title: "CHST Chatbot - UTAR",
        description: "Official UTAR CHST AI chatbot assistant for students and staff",
        url: "https://chst-chatbot-v1.vercel.app",
        siteName: "CHST Chatbot",
        type: "website",
    },
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
