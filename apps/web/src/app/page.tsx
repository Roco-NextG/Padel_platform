import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { homePathForRoles } from "@/modules/auth/domain/roles";

/**
 * "/" nunca tuvo su propia página — el proxy solo redirige a /login cuando
 * NO hay sesión (session.ts), así que un usuario ya logueado que entraba
 * acá se encontraba con un 404 real, no con una pantalla vacía. Esta
 * página cierra ese hueco redirigiendo según el rol, mismo criterio que
 * usa signInAction al terminar de loguearse.
 */
export default async function RootPage() {
  const context = await getCurrentUserContext();
  redirect(context ? homePathForRoles(context.roles) : "/login");
}
