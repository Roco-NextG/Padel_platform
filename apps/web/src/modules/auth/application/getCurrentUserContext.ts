import { fetchAuthenticatedUser } from "../infrastructure/authRepository";
import { fetchRolesForUser } from "../infrastructure/roleRepository";
import type { RoleAssignment } from "../domain/roles";

export interface UserContext {
  userId: string;
  email: string | null;
  roles: RoleAssignment[];
}

/** The one place every server route/layout asks "who is this and what can they do". */
export async function getCurrentUserContext(): Promise<UserContext | null> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return null;

  const roles = await fetchRolesForUser(user.id);

  return {
    userId: user.id,
    email: user.email ?? null,
    roles,
  };
}
