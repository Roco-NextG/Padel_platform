import { fetchAllPlatformUsers, type PlatformAccount } from "../infrastructure/usersRepository";
import { fetchPlans, type PlanRow } from "../infrastructure/billingRepository";

export interface UsersData {
  accounts: PlatformAccount[];
  plans: PlanRow[];
}

export async function getUsersData(): Promise<UsersData> {
  const [accounts, plans] = await Promise.all([fetchAllPlatformUsers(), fetchPlans()]);
  return { accounts, plans: plans.filter((p) => p.isActive) };
}
