"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/src/lib/api";
import { parseError } from "@/src/lib/parseError";

const PASSWORD_HINT = "Use at least 5 characters.";

const RegisterPage = () => {
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
            await api.post("auth/register", { json: { email, password } });
            router.push("/login");
        } catch (err) {
            setError(parseError(err).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="auth-shell">
            <section className="auth-card">
                <h1>Create account</h1>
                <p>Register with a strong password to start securely.</p>

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
                            autoComplete="new-password"
                            required
                            minLength={5}
                            value={password}
                            onChange={(event) => {
                                setPassword(event.target.value);
                            }}
                        />
                        <p>{PASSWORD_HINT}</p>
                    </div>

                    {error ? <p className="auth-error">{error}</p> : null}

                    <button
                        className="auth-button"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Creating account..." : "Create account"}
                    </button>
                </form>

                <p className="auth-footer">
                    Already registered? <Link href="/login">Sign in</Link>
                </p>
            </section>
        </main>
    );
};

export default RegisterPage;
