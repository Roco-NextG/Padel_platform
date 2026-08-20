import { isAuthApiError } from "@supabase/supabase-js";

/**
 * Supabase's auth-js attaches a stable `code` (e.g. "email_address_invalid",
 * "over_email_send_rate_limit") to every AuthApiError — matching on that is
 * reliable across SDK/locale versions, unlike substring-matching `.message`.
 * Full list: node_modules/@supabase/auth-js/src/lib/error-codes.ts.
 */
export function translateAuthError(error: unknown): string {
  const code = isAuthApiError(error) ? error.code : undefined;

  switch (code) {
    case "invalid_credentials":
      return "Email o contraseña incorrectos.";
    case "user_already_exists":
    case "email_exists":
      return "Ya existe una cuenta con este email.";
    case "weak_password":
      return "La contraseña debe tener al menos 8 caracteres.";
    case "email_address_invalid":
      return "Ese email no es válido. Revisa que esté bien escrito.";
    case "over_email_send_rate_limit":
      return "Se enviaron demasiados emails en poco tiempo. Espera unos minutos e intenta de nuevo.";
    case "over_request_rate_limit":
      return "Demasiados intentos. Espera un momento e intenta de nuevo.";
    case "user_banned":
      return "Esta cuenta fue suspendida.";
    default:
      return "Ocurrió un error. Intenta de nuevo.";
  }
}
