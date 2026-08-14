import { fetchAuthenticatedUser } from "../infrastructure/authRepository";
import { fetchRolesForUser } from "../infrastructure/roleRepository";
import { fetchPlayerByUserId } from "@/modules/players/infrastructure/playerRepository";
import type { RoleAssignment } from "../domain/roles";

export interface UserContext {
  userId: string;
  email: string | null;
  roles: RoleAssignment[];
  player: { id: string; firstName: string; lastName: string } | null;
}

/** The one place every server route/layout asks "who is this and what can they do". */
export async function getCurrentUserContext(): Promise<UserContext | null> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return null;

  const [roles, player] = await Promise.all([
    fetchRolesForUser(user.id),
    fetchPlayerByUserId(user.id),
  ]);

  return {
    userId: user.id,
    email: user.email ?? null,
    roles,
    player: player
      ? { id: player.id, firstName: player.first_name, lastName: player.last_name }
      : null,
  };
}
