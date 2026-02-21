import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import {
    PrismaClient,
    Prisma,
    $Enums,
} from "../../prisma/generated/client/client.js";
import { CONFIG } from "../config/index.js";

const dbUrl = CONFIG.dbUrl;
const port = dbUrl.port ? parseInt(dbUrl.port, 10) : 3306;

const adapter = new PrismaMariaDb({
    host: dbUrl.hostname,
    port,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.slice(1),
    connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

export { prisma, Prisma, PrismaClient, $Enums };
