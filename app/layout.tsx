import type { Metadata } from "next";
import { Inter, Orbitron, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });
const orbitron = Orbitron({
    subsets: ["latin"],
    variable: '--font-orbitron',
    weight: ['400', '500', '600', '700', '800', '900']
});
const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: '--font-jetbrains',
    weight: ['400', '500', '600', '700']
});

// export const metadata: Metadata = {
//     title: "CHST-Chatbot V1.9",
//     description: "CHST Chatbot V1.9 - AI-powered research policy assistant",
// };

export const metadata: Metadata = {
    title: {
        default: "CHST AI Portal",
        template: "%s | CHST AI Portal"
    },
    description: "Centre for Healthcare Science and Technology AI assistant. Get instant answers about courses, research, healthcare science programs, and academic policies at Universiti Tunku Abdul Rahman.",
    keywords: [
        "CHST AI assistant",
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
            <body className={`${inter.className} ${orbitron.variable} ${jetbrainsMono.variable}`}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
