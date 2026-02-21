import { compare, hash } from "bcryptjs";

const BCRYPT_ROUNDS = 12;

const DUMMY_PASSWORD_HASH =
    "$2b$12$9Yekf3ycJpub0Eb65V.gkudm9xGUpP.lr2zgPRkhNZQLIQX2.gV1e";

export const hashPassword = async (password: string): Promise<string> => {
    return hash(password, BCRYPT_ROUNDS);
};

export const verifyPassword = async (
    password: string,
    passwordHash: string | null | undefined,
): Promise<boolean> => {
    return compare(password, passwordHash ?? DUMMY_PASSWORD_HASH);
};
