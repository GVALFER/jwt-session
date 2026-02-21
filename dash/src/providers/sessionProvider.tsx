"use client";

import { createContext, useContext } from "react";

export type AuthUser = {
    userId: string;
    email: string;
};

export type SessionState = {
    expiresAt: string;
    rotateAt: string;
};

export type Session = {
    user: AuthUser;
    session: SessionState;
};

const SessionContext = createContext<AuthUser | null>(null);

export const useSession = (): AuthUser => {
    const ctx = useContext(SessionContext);
    if (!ctx) {
        throw new Error("useSession must be used within a SessionProvider");
    }
    return ctx;
};

type SessionProviderProps = {
    payload: Session;
    children: React.ReactNode;
};

export const SessionProvider = ({
    payload,
    children,
}: SessionProviderProps) => {
    return (
        <SessionContext.Provider value={payload.user}>
            {children}
        </SessionContext.Provider>
    );
};
