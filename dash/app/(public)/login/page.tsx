"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/src/lib/api";
import { parseError } from "@/src/lib/parseError";

const LoginPage = () => {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const onSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await api.post("auth/login", { json: { email, password } });
            router.push("dashboard");
            router.refresh();
        } catch (err) {
            setError(parseError(err).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="auth-shell">
            <section className="auth-card">
                <h1>Welcome back</h1>
                <p>Sign in to continue with your secure session.</p>

                <form className="auth-form" onSubmit={onSubmit}>
                    <div className="auth-field">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(event) => {
                                setEmail(event.target.value);
                            }}
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(event) => {
                                setPassword(event.target.value);
                            }}
                        />
                    </div>

                    {error ? <p className="auth-error">{error}</p> : null}

                    <button
                        className="auth-button"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                </form>

                <p className="auth-footer">
                    Need an account? <Link href="/register">Create one</Link>
                </p>
            </section>
        </main>
    );
};

export default LoginPage;
