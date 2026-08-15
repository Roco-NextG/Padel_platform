/**
 * Hand-written subset of the generated Supabase types, covering the tables
 * touched so far (Auth, Players, Clubs, Organizers, plus the Teams/Matches/
 * SetScores/RatingEvents slice needed to wire the Rating Engine — see
 * supabase/migrations/0001_schema.sql). Tournament lifecycle tables
 * (tournaments, tournament_categories/groups/phases) and the Match Engine's
 * own flow (match_confirmations) still aren't typed here — add them when
 * those modules get built. Once the project is linked to a live Supabase
 * instance, consider replacing this file with the real output of:
 *
 *   supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
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
export type MatchStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "DISPUTED"
  | "CANCELLED";
export type DbMatchType = "TOURNAMENT" | "COMPETITIVE" | "CASUAL";
export type RatingReason = "TOURNAMENT_MATCH" | "COMPETITIVE_MATCH";

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
      teams: {
        Relationships: [];
        Row: {
          id: string;
          tournament_category_id: string | null;
          group_id: string | null;
          seed: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tournament_category_id?: string | null;
          group_id?: string | null;
          seed?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
      };
      team_members: {
        Relationships: [];
        Row: {
          id: string;
          team_id: string;
          player_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          player_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["team_members"]["Insert"]>;
      };
      matches: {
        Relationships: [];
        Row: {
          id: string;
          tournament_id: string | null;
          phase_id: string | null;
          group_id: string | null;
          round_index: number | null;
          court_id: string | null;
          team_a_id: string | null;
          team_b_id: string | null;
          scheduled_start: string | null;
          scheduled_end: string | null;
          actual_start: string | null;
          actual_end: string | null;
          status: MatchStatus;
          winner_team_id: string | null;
          match_type: DbMatchType;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          tournament_id?: string | null;
          phase_id?: string | null;
          group_id?: string | null;
          round_index?: number | null;
          court_id?: string | null;
          team_a_id?: string | null;
          team_b_id?: string | null;
          scheduled_start?: string | null;
          scheduled_end?: string | null;
          status?: MatchStatus;
          winner_team_id?: string | null;
          match_type?: DbMatchType;
        };
        Update: Partial<Database["public"]["Tables"]["matches"]["Insert"]>;
      };
      set_scores: {
        Relationships: [];
        Row: {
          id: string;
          match_id: string;
          set_number: number;
          team_a_games: number;
          team_b_games: number;
          tiebreak_a: number | null;
          tiebreak_b: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          set_number: number;
          team_a_games: number;
          team_b_games: number;
          tiebreak_a?: number | null;
          tiebreak_b?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["set_scores"]["Insert"]>;
      };
      rating_events: {
        Relationships: [];
        Row: {
          id: string;
          player_id: string;
          match_id: string;
          partner_id: string | null;
          old_rating: number;
          new_rating: number;
          old_rd: number;
          new_rd: number;
          reason: RatingReason;
          algorithm_version: string;
          superseded: boolean;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          player_id: string;
          match_id: string;
          partner_id?: string | null;
          old_rating: number;
          new_rating: number;
          old_rd: number;
          new_rd: number;
          reason: RatingReason;
          algorithm_version: string;
        };
        Update: Partial<Database["public"]["Tables"]["rating_events"]["Insert"]>;
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
      record_rating_events: {
        Args: { p_events: RatingEventRpcInput[] };
        Returns: Database["public"]["Tables"]["rating_events"]["Row"][];
      };
    };
  };
}

/** Shape sent to the record_rating_events RPC — mirrors RatingEventOutput from @padel-platform/rating-engine. */
export interface RatingEventRpcInput {
  playerId: string;
  matchId: string;
  partnerId: string;
  oldRating: number;
  newRating: number;
  oldRD: number;
  newRD: number;
  reason: RatingReason;
  algorithmVersion: string;
}
