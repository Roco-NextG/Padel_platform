import { z } from "zod";

export const signUpSchema = z.object({
  firstName: z.string().trim().min(1, "Ingresa tu nombre."),
  lastName: z.string().trim().min(1, "Ingresa tu apellido."),
  email: z.string().trim().email("Ingresa un email válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export const signInSchema = z.object({
  email: z.string().trim().email("Ingresa un email válido."),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
