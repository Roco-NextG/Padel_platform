import { z } from "zod";

const baseFields = {
  firstName: z.string().trim().min(1, "Ingresa el nombre."),
  lastName: z.string().trim().min(1, "Ingresa el apellido."),
  phone: z.string().trim().min(1, "Ingresa el teléfono."),
  email: z.string().trim().email("Ingresa un email válido."),
};

export const createAccountSchema = z.discriminatedUnion("tipoUsuario", [
  z.object({ tipoUsuario: z.literal("JUGADOR"), ...baseFields }),
  z.object({
    tipoUsuario: z.literal("CLUB"),
    ...baseFields,
    planId: z.string().uuid().nullable(),
    entityName: z.string().trim().min(2, "Ingresa el nombre del club."),
    entityCity: z.string().trim().optional(),
    entityContactEmail: z.string().trim().email("Ingresa un email válido.").optional().or(z.literal("")),
  }),
  z.object({
    tipoUsuario: z.literal("ORGANIZADOR"),
    ...baseFields,
    planId: z.string().uuid().nullable(),
    entityName: z.string().trim().min(2, "Ingresa el nombre del organizador."),
    entityCity: z.string().trim().optional(),
    entityContactEmail: z.string().trim().email("Ingresa un email válido.").optional().or(z.literal("")),
  }),
]);

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
