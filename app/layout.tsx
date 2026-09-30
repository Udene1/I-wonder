import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "I Wonder…", description: "A quiet place for questions worth following." };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}