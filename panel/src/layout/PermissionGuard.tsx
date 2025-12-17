import { useAdminPerms } from "@/hooks/auth";
import { useLocation, Redirect } from "wouter";

export default function PermissionGuard({ children }: { children: JSX.Element }) {
    const { perms } = useAdminPerms();
    const [location] = useLocation();

    if (
        perms.includes('players.pc_checker') &&
        !perms.some(p => p !== 'players.pc_checker' && p !== 'players.pc_manager') &&
        location !== '/pc_checker'
    ) {
        return <Redirect to="/pc_checker" />;
    }

    if (
        perms.includes('players.pc_manager') &&
        !perms.some(p => p !== 'players.pc_checker' && p !== 'players.pc_manager') &&
        location !== '/pc_checker'
    ) {
        return <Redirect to="/pc_checker" />;
    }

    return children;
}
