import { useAdminPerms } from "./auth";

export const usePermissions = () => {
    const { hasPerm, isMaster } = useAdminPerms();

    const isAdmin = isMaster || hasPerm('all_permissions') || hasPerm('web.admin');
    const isPcChecker = isMaster || hasPerm('all_permissions') || hasPerm('web.pc_checker');

    return {
        isAdmin,
        isPcChecker,
    };
};
