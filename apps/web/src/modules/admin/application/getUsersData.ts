import { fetchAdmins, fetchAllPlatformUsers, type AdminAccount, type PlatformAccount } from "../infrastructure/usersRepository";
import { fetchPlans, type PlanRow } from "../infrastructure/billingRepository";

export interface UsersData {
  accounts: PlatformAccount[];
  plans: PlanRow[];
  admins: AdminAccount[];
}

export async function getUsersData(): Promise<UsersData> {
  const [accounts, plans, admins] = await Promise.all([fetchAllPlatformUsers(), fetchPlans(), fetchAdmins()]);
  return { accounts, plans: plans.filter((p) => p.isActive), admins };
}
