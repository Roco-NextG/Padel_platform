import { createClient } from "@/lib/supabase/server";
import type { Sponsor } from "../domain/sponsor";

export async function fetchSponsors(tournamentId: string): Promise<Sponsor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sponsors")
    .select("id, tournament_id, name, logo_url")
    .eq("tournament_id", tournamentId)
    .order("created_at");
  if (error) throw new Error(error.message);

  return (data ?? []).map((s) => ({ id: s.id, tournamentId: s.tournament_id, name: s.name, logoUrl: s.logo_url }));
}

export async function uploadSponsorLogo(tournamentId: string, file: File): Promise<string> {
  const supabase = await createClient();
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${tournamentId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("sponsor-logos").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from("sponsor-logos").getPublicUrl(path);
  return data.publicUrl;
}

export async function insertSponsor(tournamentId: string, name: string, logoUrl: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sponsors")
    .insert({ tournament_id: tournamentId, name, logo_url: logoUrl })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function removeSponsor(sponsorId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("sponsors").delete().eq("id", sponsorId);
  if (error) throw new Error(error.message);
}
