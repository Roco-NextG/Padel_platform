import { z } from "zod";

export const setPasswordSchema = z.object({
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
