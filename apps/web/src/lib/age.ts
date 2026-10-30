/**
 * Edad cumplida a una fecha de referencia — usada para elegibilidad de
 * categorías por edad (Master/Junior). La referencia es la fecha de inicio
 * del torneo/liga (pedido explícito: todos los jugadores de un mismo
 * torneo se miden con la misma fecha de corte, no con el día en que cada
 * uno se inscribió).
 */
export function calculateAge(birthDate: string, referenceDate: string): number {
  const birth = new Date(birthDate);
  const ref = new Date(referenceDate);
  let age = ref.getUTCFullYear() - birth.getUTCFullYear();
  const hasHadBirthdayThisYear =
    ref.getUTCMonth() > birth.getUTCMonth() ||
    (ref.getUTCMonth() === birth.getUTCMonth() && ref.getUTCDate() >= birth.getUTCDate());
  if (!hasHadBirthdayThisYear) age--;
  return age;
}
