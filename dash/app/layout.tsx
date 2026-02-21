import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
    title: "Secure Auth",
    description: "Minimal secure authentication with Next.js and Hono",
};

type RootLayoutProps = {
    children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
};

export default RootLayout;
