import { z } from "zod";

export const planSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre del plan."),
  monthlyPriceCents: z.coerce.number().int().min(0, "El precio no puede ser negativo."),
  currency: z.string().trim().length(3, "Usa un código de moneda de 3 letras, ej. USD.").toUpperCase(),
  stripePriceId: z.string().trim().optional().or(z.literal("")),
});

export type PlanInput = z.infer<typeof planSchema>;

export function slugifyPlanName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
