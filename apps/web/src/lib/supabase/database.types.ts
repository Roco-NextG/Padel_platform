/**
 * Hand-written subset of the generated Supabase types, covering only the
 * tables/enums touched by this phase (Auth, Players, Clubs, Organizers —
 * see supabase/migrations/0001_schema.sql). Once the project is linked to a
 * live Supabase instance, replace this file with the real output of:
 *
 *   supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
 *
 * which will cover the full schema (tournaments, matches, rating_events...)
 * as those modules get built.
 */

export type GenderType = "MALE" | "FEMALE" | "OTHER";
export type HandType = "RIGHT" | "LEFT";
export type PositionType = "DRIVE" | "REVES" | "BOTH";
export type ClubRole = "MEMBER" | "STAFF" | "OWNER" | "MANAGER";
export type OrganizerType = "INDIVIDUAL" | "COMPANY";
export type AppRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CLUB_OWNER"
  | "CLUB_MANAGER"
  | "ORGANIZER"
  | "TOURNAMENT_STAFF"
  | "PLAYER";

export interface ClubBranding {
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent?: string | null;
  font?: string | null;
}

export interface Database {
  public: {
    Tables: {
      players: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string | null;
          first_name: string;
          last_name: string;
          photo_url: string | null;
          birth_date: string | null;
          gender: GenderType | null;
          country_id: string | null;
          city: string | null;
          hand: HandType | null;
          preferred_position: PositionType | null;
          public_profile: boolean;
          primary_club_id: string | null;
          current_rating: number | null;
          current_rating_deviation: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          first_name: string;
          last_name: string;
          photo_url?: string | null;
          birth_date?: string | null;
          gender?: GenderType | null;
          country_id?: string | null;
          city?: string | null;
          hand?: HandType | null;
          preferred_position?: PositionType | null;
          public_profile?: boolean;
          primary_club_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["players"]["Insert"]>;
      };
      clubs: {
        Relationships: [];
        Row: {
          id: string;
          name: string;
          country_id: string | null;
          city: string | null;
          address: string | null;
          branding: ClubBranding;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          country_id?: string | null;
          city?: string | null;
          address?: string | null;
          branding?: ClubBranding;
        };
        Update: Partial<Database["public"]["Tables"]["clubs"]["Insert"]>;
      };
      organizers: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: OrganizerType;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type?: OrganizerType;
        };
        Update: Partial<Database["public"]["Tables"]["organizers"]["Insert"]>;
      };
      club_memberships: {
        Relationships: [];
        Row: {
          id: string;
          player_id: string;
          club_id: string;
          role: ClubRole;
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          club_id: string;
          role?: ClubRole;
        };
        Update: Partial<Database["public"]["Tables"]["club_memberships"]["Insert"]>;
      };
      user_roles: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string;
          role: AppRole;
          club_id: string | null;
          organizer_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: AppRole;
          club_id?: string | null;
          organizer_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["user_roles"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_club: {
        Args: {
          p_name: string;
          p_city?: string | null;
          p_address?: string | null;
          p_branding?: ClubBranding;
        };
        Returns: Database["public"]["Tables"]["clubs"]["Row"];
      };
      update_club_branding: {
        Args: { p_club_id: string; p_branding: ClubBranding };
        Returns: Database["public"]["Tables"]["clubs"]["Row"];
      };
    };
  };
}
