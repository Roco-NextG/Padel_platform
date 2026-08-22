import { fetchPendingInvites } from "../infrastructure/adminRepository";
import type { PendingInviteRow } from "../infrastructure/adminRepository";

export async function getPendingInvites(): Promise<PendingInviteRow[]> {
  return fetchPendingInvites();
}
