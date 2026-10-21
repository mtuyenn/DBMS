import type { RoleId } from "../../shared/types/domain";
import type { View } from "./staffAccounts";
import LoginPage from "../../features/auth/LoginPage";
import CustomerPortal from "../../features/customer/CustomerPortal";
import FrontDeskPMS from "../../features/front-desk/FrontDeskPMS";
import HousekeepingStation from "../../features/housekeeping/HousekeepingStation";
import AccountingStation from "../../features/accounting/AccountingStation";
import ManagerDashboard from "../../features/management/ManagerDashboard";

interface ScreenRouterProps {
  view: View;
  role: RoleId;
  onLogin: (identity: string, password: string) => Promise<string | null>;
  onCustomerBack: () => void;
  onOpenLogin: () => void;
  onLogout: () => Promise<void>;
}

export function ScreenRouter({
  view,
  role,
  onLogin,
  onCustomerBack,
  onOpenLogin,
  onLogout,
}: ScreenRouterProps) {
  if (view === "login") return <LoginPage onLogin={onLogin} onBack={onCustomerBack} />;
  if (view === "frontdesk") return <FrontDeskPMS onBack={onLogout} />;
  if (view === "housekeeping") return <HousekeepingStation onBack={onLogout} />;
  if (view === "accounting") return <AccountingStation onBack={onLogout} />;
  if (view === "manager") return <ManagerDashboard role="manager" onBack={onLogout} />;

  return (
    <CustomerPortal
      onLogin={onOpenLogin}
      onLogout={onLogout}
      isAuthenticated={false}
    />
  );
}
