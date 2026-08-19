import { z } from "zod";

export const signUpSchema = z.object({
  firstName: z.string().trim().min(1, "Ingresa tu nombre."),
  lastName: z.string().trim().min(1, "Ingresa tu apellido."),
  email: z.string().trim().email("Ingresa un email válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  // Requeridos para cuentas nuevas — evita el gap que hoy bloquea inscribir
  // una pareja con este jugador en un torneo (docs/11_UX_HANDOFF.md §4 #7).
  // Cuentas existentes quedan con category NULL, sin backfill forzado.
  gender: z.enum(["MALE", "FEMALE", "OTHER"], { message: "Selecciona tu género." }),
  category: z.coerce
    .number()
    .int()
    .min(1, "La categoría debe estar entre 1 y 7.")
    .max(7, "La categoría debe estar entre 1 y 7."),
});

export const signInSchema = z.object({
  email: z.string().trim().email("Ingresa un email válido."),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
