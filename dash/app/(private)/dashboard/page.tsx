"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/src/lib/api";
import { parseError } from "@/src/lib/parseError";
import { useSession } from "@/src/providers/sessionProvider";

const DashboardPage = () => {
    const session = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onLogout = async () => {
        setLoading(true);
        setError(null);

        try {
            await api.post("auth/logout");
            router.push("/login");
            router.refresh();
        } catch (err) {
            setError(parseError(err).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="dashboard">
            <section className="dashboard-card">
                <div className="dashboard-top">
                    <div>
                        <h1>Dashboard</h1>
                        <p>
                            You are authenticated with a secure server session.
                        </p>
                    </div>
                    <div>
                        <button
                            className="logout-button"
                            onClick={onLogout}
                            disabled={loading}
                        >
                            {loading ? "Signing out..." : "Sign out"}
                        </button>
                        {error ? <p className="auth-error">{error}</p> : null}
                    </div>
                </div>
                <hr />
                <p>
                    <strong>User ID:</strong> {session.userId}
                </p>
                <p>
                    <strong>Email:</strong> {session.email}
                </p>
            </section>
        </main>
    );
};

export default DashboardPage;
