import { fetchAccounts, fetchPendingInvites } from "../infrastructure/adminRepository";
import type { AccountRow, PendingInviteRow } from "../infrastructure/adminRepository";

export async function getAccounts(): Promise<AccountRow[]> {
  return fetchAccounts();
}

export async function getPendingInvites(): Promise<PendingInviteRow[]> {
  return fetchPendingInvites();
}
