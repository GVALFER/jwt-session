import { isMaintenanceStatus, maintenancePath } from "@/src/lib/authRouting";
import { parseError } from "./parseError";
import { redirect } from "next/navigation";

export const redirectOnError = (error: unknown): never => {
    const status = parseError(error).status;

    if (isMaintenanceStatus(status)) {
        redirect(maintenancePath(status));
    }

    redirect("/login");
};
