/**
 * Hand-written subset of the generated Supabase types, covering the tables
 * touched so far (Auth, Players, Clubs, Organizers, Teams/Matches/SetScores/
 * RatingEvents/MatchConfirmations, a minimal Tournaments slice for
 * scoring_config — see supabase/migrations/0001_schema.sql). Tournament
 * lifecycle tables beyond that (categories/groups/phases) still aren't
 * typed here — add them when the Tournament Engine gets wired to the DB.
 * Once the project is linked to a live Supabase instance, consider
 * replacing this file with the real output of:
 *
 *   supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
 */

/**
 * MIXED added in 0020_gender_type_mixed.sql — only meaningful on
 * tournament_categories.gender_restriction (a pair with one player of each
 * gender), never on Player.gender itself (playerProfileSchema and every
 * player-facing form still only offer MALE/FEMALE/OTHER).
 */
export type GenderType = "MALE" | "FEMALE" | "OTHER" | "MIXED";
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
export type CourtStatus = "AVAILABLE" | "MAINTENANCE" | "DISABLED";
export type RatingReason = "TOURNAMENT_MATCH" | "COMPETITIVE_MATCH";
export type TournamentStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "IN_PROGRESS"
  | "FINISHED"
  | "CANCELLED"
  | "ARCHIVED";
export type PhaseType =
  | "GROUPS"
  | "ROUND_OF_32"
  | "ROUND_OF_16"
  | "QUARTERFINAL"
  | "SEMIFINAL"
  | "FINAL"
  | "CONSOLATION";

/**
 * `tournaments.scoring_config` JSONB shape — mirrors ScoringConfig from
 * @padel-platform/match-engine field-for-field (no translation layer needed).
 * Not fixed by the schema itself (`jsonb not null default '{}'::jsonb`), so
 * this is the shape this codebase defines and expects; a tournament that
 * hasn't configured it yet gets `{}`, parsed against DEFAULT_SCORING_CONFIG.
 */
export interface ScoringConfigJson {
  setsToWin?: number;
  gamesPerSet?: number;
  tiebreakPoints?: number;
  finalSetMode?: "REGULAR" | "SUPER_TIEBREAK";
  superTiebreakPoints?: number;
}

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
          /** 0019_player_category.sql — declarada al alta, nunca derivada de current_rating. */
          category: number | null;
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
          category?: number | null;
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
          latitude: number | null;
          longitude: number | null;
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
          latitude?: number | null;
          longitude?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["clubs"]["Insert"]>;
      };
      courts: {
        Relationships: [];
        Row: {
          id: string;
          club_id: string;
          name: string;
          number: number | null;
          indoor: boolean;
          status: CourtStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          name: string;
          number?: number | null;
          indoor?: boolean;
          status?: CourtStatus;
        };
        Update: Partial<Database["public"]["Tables"]["courts"]["Insert"]>;
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
      tournaments: {
        Relationships: [];
        Row: {
          id: string;
          name: string;
          description: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          organizer_id: string;
          club_id: string;
          status: TournamentStatus;
          is_published: boolean;
          start_date: string | null;
          end_date: string | null;
          scoring_config: ScoringConfigJson;
          tiebreak_rules: string[];
          entry_fee: number | null;
          entry_fee_currency: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          organizer_id: string;
          club_id: string;
          status?: TournamentStatus;
          is_published?: boolean;
          start_date?: string | null;
          end_date?: string | null;
          scoring_config?: ScoringConfigJson;
          entry_fee?: number | null;
          entry_fee_currency?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["tournaments"]["Insert"]>;
      };
      tournament_categories: {
        Relationships: [];
        Row: {
          id: string;
          tournament_id: string;
          name: string;
          level: string | null;
          gender_restriction: GenderType | null;
          max_teams: number | null;
          uses_group_stage: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          name: string;
          level?: string | null;
          gender_restriction?: GenderType | null;
          max_teams?: number | null;
          uses_group_stage?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["tournament_categories"]["Insert"]>;
      };
      sponsors: {
        Relationships: [];
        Row: {
          id: string;
          tournament_id: string;
          name: string;
          logo_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          name: string;
          logo_url: string;
        };
        Update: Partial<Database["public"]["Tables"]["sponsors"]["Insert"]>;
      };
      tournament_groups: {
        Relationships: [];
        Row: {
          id: string;
          category_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["tournament_groups"]["Insert"]>;
      };
      tournament_phases: {
        Relationships: [];
        Row: {
          id: string;
          category_id: string;
          type: PhaseType;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          type: PhaseType;
          order_index: number;
        };
        Update: Partial<Database["public"]["Tables"]["tournament_phases"]["Insert"]>;
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
          is_paused: boolean;
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
          is_paused?: boolean;
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
      match_confirmations: {
        Relationships: [];
        Row: {
          id: string;
          match_id: string;
          player_id: string;
          confirmed: boolean;
          confirmed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_id: string;
          confirmed: boolean;
          confirmed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["match_confirmations"]["Insert"]>;
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
      audit_log: {
        Relationships: [];
        Row: {
          id: string;
          actor_user_id: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          before: Record<string, unknown> | null;
          after: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          before?: Record<string, unknown> | null;
          after?: Record<string, unknown> | null;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
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
      submit_match_result: {
        Args: {
          p_match_id: string;
          p_sets: SetScoreRpcInput[];
          p_winner: "A" | "B";
          p_by_organizer: boolean;
        };
        Returns: Database["public"]["Tables"]["matches"]["Row"];
      };
      create_bracket_match: {
        Args: {
          p_tournament_id: string;
          p_phase_id: string;
          p_round_index: number;
          p_team_a_id: string;
          p_team_b_id: string;
          p_match_type: DbMatchType;
          p_completed_match_id: string;
        };
        Returns: Database["public"]["Tables"]["matches"]["Row"];
      };
      finish_tournament: {
        Args: { p_tournament_id: string; p_completed_match_id: string };
        Returns: Database["public"]["Tables"]["tournaments"]["Row"];
      };
      admin_search_users: {
        Args: { p_query: string };
        Returns: AdminUserSearchResult[];
      };
      admin_grant_role: {
        Args: {
          p_user_id: string;
          p_role: AppRole;
          p_club_id?: string | null;
          p_organizer_id?: string | null;
        };
        Returns: Database["public"]["Tables"]["user_roles"]["Row"];
      };
      admin_revoke_role: {
        Args: { p_role_id: string };
        Returns: void;
      };
      nearby_published_tournaments: {
        Args: { p_lat: number; p_lng: number; p_limit?: number };
        Returns: NearbyTournamentResult[];
      };
      apply_match_correction: {
        Args: {
          p_match_id: string;
          p_sets: SetScoreRpcInput[];
          p_winner_team_id: string;
          p_rating_events: RatingEventRpcInput[];
        };
        Returns: Database["public"]["Tables"]["matches"]["Row"];
      };
      search_players_for_enrollment: {
        Args: { p_query: string };
        Returns: EnrollmentPlayerResult[];
      };
      create_player_for_enrollment: {
        Args: {
          p_first_name: string;
          p_last_name: string;
          p_gender: GenderType;
          p_category: number;
        };
        Returns: Database["public"]["Tables"]["players"]["Row"];
      };
      assign_player_category: {
        Args: { p_player_id: string; p_category: number };
        Returns: Database["public"]["Tables"]["players"]["Row"];
      };
      get_players_by_ids: {
        Args: { p_player_ids: string[] };
        Returns: { player_id: string; gender: GenderType | null; category: number | null }[];
      };
    };
  };
}

/** Una fila de search_players_for_enrollment (0021) — email es null para un Player sin user_id (importado, sin cuenta). */
export interface EnrollmentPlayerResult {
  player_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  gender: GenderType | null;
  category: number | null;
}

/** Una fila de admin_search_users — auth.users.email nunca es null en la práctica, pero Supabase lo tipa nullable. */
export interface AdminUserSearchResult {
  user_id: string;
  email: string | null;
  player_id: string | null;
  first_name: string | null;
  last_name: string | null;
}

/** Una fila de nearby_published_tournaments (0017) — distance_km ya viene redondeado a 1 decimal desde la función. */
export interface NearbyTournamentResult {
  tournament_id: string;
  name: string;
  start_date: string | null;
  cover_image_url: string | null;
  entry_fee: number | null;
  entry_fee_currency: string | null;
  club_id: string;
  club_name: string;
  club_logo_url: string | null;
  club_city: string | null;
  distance_km: number;
}

/** Shape sent to submit_match_result — mirrors SetScoreInput from @padel-platform/match-engine. */
export interface SetScoreRpcInput {
  setNumber: number;
  teamAGames: number;
  teamBGames: number;
  tiebreakA?: number | null;
  tiebreakB?: number | null;
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
