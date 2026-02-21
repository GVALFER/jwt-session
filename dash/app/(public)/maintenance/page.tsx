"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

type MaintenanceInfo = {
    title: string;
    description: string;
    retryText: string;
    showRetryAfter: boolean;
};

const MAINTENANCE_CONFIGS: Record<string, MaintenanceInfo> = {
    "429": {
        title: "Too Many Requests",
        description:
            "You've exceeded the rate limit. Please wait a moment before trying again.",
        retryText: "Try Again",
        showRetryAfter: true,
    },
    "503": {
        title: "Service Temporarily Unavailable",
        description:
            "We're currently performing scheduled maintenance. Please check back in a few minutes.",
        retryText: "Check Again",
        showRetryAfter: false,
    },
    default: {
        title: "Service Temporarily Unavailable",
        description:
            "We're experiencing some technical difficulties. Please try again later.",
        retryText: "Try Again",
        showRetryAfter: false,
    },
};

const getConfig = (status: string | null): MaintenanceInfo => {
    if (status && status in MAINTENANCE_CONFIGS) {
        return MAINTENANCE_CONFIGS[status];
    }
    return MAINTENANCE_CONFIGS.default;
};

const MaintenanceContent = () => {
    const searchParams = useSearchParams();
    const status = searchParams.get("status");
    const config = getConfig(status);

    const onRetry = () => {
        window.history.back();
    };

    return (
        <main className="auth-shell">
            <section className="auth-card">
                <h1>{config.title}</h1>
                <p>{config.description}</p>

                {config.showRetryAfter && (
                    <p>Please wait a few seconds before retrying.</p>
                )}

                <button className="auth-button" onClick={onRetry}>
                    {config.retryText}
                </button>
            </section>
        </main>
    );
};

const MaintenanceFallback = () => {
    const config = MAINTENANCE_CONFIGS.default;

    return (
        <main className="auth-shell">
            <section className="auth-card">
                <h1>{config.title}</h1>
                <p>{config.description}</p>
                <button className="auth-button" onClick={() => window.history.back()}>
                    {config.retryText}
                </button>
            </section>
        </main>
    );
};

const MaintenancePage = () => {
    return (
        <Suspense fallback={<MaintenanceFallback />}>
            <MaintenanceContent />
        </Suspense>
    );
};

export default MaintenancePage;
