import { z } from "zod";

export const inviteSchema = z.object({
  role: z.enum(["CLUB", "ORGANIZADOR"], { message: "Elige un rol." }),
  name: z.string().trim().min(2, "Ingresa un nombre."),
  email: z.string().trim().email("Ingresa un email válido."),
});

export type InviteInput = z.infer<typeof inviteSchema>;
