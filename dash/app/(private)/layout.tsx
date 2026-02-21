import { api } from '@/src/lib/api';
import { redirectOnError } from '@/src/lib/redirectOnError';
import { Session, SessionProvider } from '@/src/providers/sessionProvider';
import type { ReactNode } from 'react';

const PrivateLayout = async ({ children }: { children: ReactNode }) => {
    const payload: Session = await api
        .get('auth/session')
        .json<Session>()
        .catch((err) => redirectOnError(err));

    return <SessionProvider payload={payload}>{children}</SessionProvider>;
};

export default PrivateLayout;
