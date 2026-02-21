import type { NextConfig } from "next";
import { CONFIG } from "./src/config";

const nextConfig: NextConfig = {
    reactStrictMode: false,
    async rewrites() {
        return [
            {
                source: `${CONFIG.browserUrl}/:path*`,
                destination: `${CONFIG.internalUrl}/:path*`,
            },
        ];
    },
};

export default nextConfig;
