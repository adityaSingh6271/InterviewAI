import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Poppins } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "react-hot-toast";
import Providers from "./components/providers/Providers";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "InterviewAI - Nail your next interview with AI Precision",
  description:
    "Practice realistic technical and behavioral interviews with AI. Receive real-time, actionable feedback on technical depth, communication clarity, and confidence.",
  icons: {
    icon: "/icon.svg",
  },
};

export default async function RootLayout(props: {
  children: React.ReactNode;
  params?: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (props.params) {
    await props.params;
  }
  return (
    <html lang="en" className={cn("font-sans", poppins.variable)}>
      <body className="min-h-screen relative flex flex-col selection:bg-indigo-100 selection:text-indigo-900 antialiased">
        <Providers>
          <div className="ambient-glow-bg" />
          <main className="relative z-10 flex-1 flex flex-col">{props.children}</main>
        </Providers>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              maxWidth: "480px",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
              fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
            },
          }}
        />
      </body>
    </html>
  );
}
