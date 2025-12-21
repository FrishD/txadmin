import { useAdminPerms } from './auth';

export const usePermissions = () => {
  const { hasPerm } = useAdminPerms();

  const isAdmin = hasPerm('web.admin');
  const isPcChecker = hasPerm('web.pc_checker');

  return {
    isAdmin,
    isPcChecker,
    canSeePlayers: isAdmin || isPcChecker,
    canSeeHistory: isAdmin || isPcChecker,
    canSeeAdminManager: hasPerm('manage.admins'),
  };
};
