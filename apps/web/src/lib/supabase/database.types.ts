/**
 * Hand-written subset of the generated Supabase types, covering the reset
 * schema, admin panel v2 billing, and the resurrected tournament domain (see
 * supabase/migrations/0002_schema.sql through 0017_sponsors.sql). Once these
 * are applied to the live project, regenerate for real via the Supabase
 * Dashboard's "Generate types" (or the CLI) and diff against this file to
 * catch drift — don't keep hand-typing this long-term.
 */

export type AppRole = "ADMIN" | "CLUB" | "ORGANIZADOR" | "JUGADOR";
export type InviteStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
export type PaymentStatus =
  | "NONE"
  | "ACTIVE"
  | "TRIALING"
  | "PAST_DUE"
  | "CANCELED"
  | "INCOMPLETE"
  | "UNPAID";
export type CourtStatus = "AVAILABLE" | "MAINTENANCE" | "DISABLED";
export type GenderType = "MALE" | "FEMALE" | "OTHER" | "MIXED";
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
export type DbMatchType = "TOURNAMENT" | "COMPETITIVE" | "CASUAL";
export type MatchStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "DISPUTED"
  | "CANCELLED";
export type RatingReason = "TOURNAMENT_MATCH" | "COMPETITIVE_MATCH";

/**
 * `tournaments.scoring_config` JSONB shape — mirrors ScoringConfig from
 * @padel-platform/match-engine field-for-field (no translation layer
 * needed). Not fixed by the schema itself (`jsonb not null default '{}'`),
 * so this is the shape this codebase defines/expects; an unconfigured
 * tournament gets `{}`, parsed against DEFAULT_SCORING_CONFIG.
 */
export interface ScoringConfigJson {
  setsToWin?: number;
  gamesPerSet?: number;
  tiebreakPoints?: number;
  finalSetMode?: "REGULAR" | "SUPER_TIEBREAK";
  superTiebreakPoints?: number;
}

export interface Database {
  public: {
    Tables: {
      clubs: {
        Relationships: [];
        Row: {
          id: string;
          name: string;
          contact_email: string | null;
          city: string | null;
          contact_first_name: string | null;
          contact_last_name: string | null;
          contact_phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_email?: string | null;
          city?: string | null;
          contact_first_name?: string | null;
          contact_last_name?: string | null;
          contact_phone?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["clubs"]["Insert"]>;
      };
      organizers: {
        Relationships: [];
        Row: {
          id: string;
          name: string;
          contact_email: string | null;
          city: string | null;
          contact_first_name: string | null;
          contact_last_name: string | null;
          contact_phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_email?: string | null;
          city?: string | null;
          contact_first_name?: string | null;
          contact_last_name?: string | null;
          contact_phone?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["organizers"]["Insert"]>;
      };
      role_assignments: {
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
        Update: Partial<Database["public"]["Tables"]["role_assignments"]["Insert"]>;
      };
      players: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string | null;
          first_name: string;
          last_name: string;
          phone: string | null;
          is_active: boolean;
          current_rating: number | null;
          current_rating_deviation: number | null;
          category: number | null;
          gender: GenderType | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          first_name: string;
          last_name: string;
          phone?: string | null;
          is_active?: boolean;
          current_rating?: number | null;
          current_rating_deviation?: number | null;
          category?: number | null;
          gender?: GenderType | null;
        };
        Update: Partial<Database["public"]["Tables"]["players"]["Insert"]>;
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
      tournaments: {
        Relationships: [];
        Row: {
          id: string;
          name: string;
          description: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          club_id: string;
          organizer_id: string | null;
          status: TournamentStatus;
          is_published: boolean;
          start_date: string | null;
          end_date: string | null;
          scoring_config: ScoringConfigJson;
          tiebreak_rules: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          club_id: string;
          organizer_id?: string | null;
          status?: TournamentStatus;
          is_published?: boolean;
          start_date?: string | null;
          end_date?: string | null;
          scoring_config?: ScoringConfigJson;
          tiebreak_rules?: string[];
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
      tournament_groups: {
        Relationships: [];
        Row: { id: string; category_id: string; name: string; created_at: string; updated_at: string };
        Insert: { id?: string; category_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["tournament_groups"]["Insert"]>;
      };
      tournament_phases: {
        Relationships: [];
        Row: { id: string; category_id: string; type: PhaseType; order_index: number; created_at: string; updated_at: string };
        Insert: { id?: string; category_id: string; type: PhaseType; order_index: number };
        Update: Partial<Database["public"]["Tables"]["tournament_phases"]["Insert"]>;
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
        Insert: { id?: string; tournament_category_id?: string | null; group_id?: string | null; seed?: number | null };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
      };
      team_members: {
        Relationships: [];
        Row: { id: string; team_id: string; player_id: string; created_at: string };
        Insert: { id?: string; team_id: string; player_id: string };
        Update: Partial<Database["public"]["Tables"]["team_members"]["Insert"]>;
      };
      roster_memberships: {
        Relationships: [];
        Row: { id: string; player_id: string; club_id: string | null; organizer_id: string | null; joined_at: string };
        Insert: { id?: string; player_id: string; club_id?: string | null; organizer_id?: string | null };
        Update: Partial<Database["public"]["Tables"]["roster_memberships"]["Insert"]>;
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
        Row: { id: string; match_id: string; player_id: string; confirmed: boolean; confirmed_at: string | null; created_at: string };
        Insert: { id?: string; match_id: string; player_id: string; confirmed?: boolean; confirmed_at?: string | null };
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
          superseded?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["rating_events"]["Insert"]>;
      };
      sponsors: {
        Relationships: [];
        Row: { id: string; tournament_id: string; name: string; logo_url: string; created_at: string };
        Insert: { id?: string; tournament_id: string; name: string; logo_url: string };
        Update: Partial<Database["public"]["Tables"]["sponsors"]["Insert"]>;
      };
      pending_invites: {
        Relationships: [];
        Row: {
          id: string;
          email: string;
          role: AppRole;
          club_id: string | null;
          organizer_id: string | null;
          invited_by: string | null;
          auth_user_id: string | null;
          status: InviteStatus;
          expires_at: string;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          role: AppRole;
          club_id?: string | null;
          organizer_id?: string | null;
          invited_by: string;
          auth_user_id?: string | null;
          status?: InviteStatus;
          expires_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pending_invites"]["Insert"]>;
      };
      plans: {
        Relationships: [];
        Row: {
          id: string;
          name: string;
          slug: string;
          monthly_price_cents: number;
          currency: string;
          stripe_price_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          monthly_price_cents?: number;
          currency?: string;
          stripe_price_id?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["plans"]["Insert"]>;
      };
      account_billing: {
        Relationships: [];
        Row: {
          id: string;
          club_id: string | null;
          organizer_id: string | null;
          plan_id: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          payment_status: PaymentStatus;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id?: string | null;
          organizer_id?: string | null;
          plan_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          payment_status?: PaymentStatus;
          current_period_end?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["account_billing"]["Insert"]>;
      };
      billing_events: {
        Relationships: [];
        Row: {
          id: string;
          club_id: string | null;
          organizer_id: string | null;
          event_type: string;
          from_plan_id: string | null;
          to_plan_id: string | null;
          payment_status_after: PaymentStatus | null;
          amount_cents: number | null;
          stripe_event_id: string | null;
          raw_payload: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          club_id?: string | null;
          organizer_id?: string | null;
          event_type: string;
          from_plan_id?: string | null;
          to_plan_id?: string | null;
          payment_status_after?: PaymentStatus | null;
          amount_cents?: number | null;
          stripe_event_id?: string | null;
          raw_payload?: Record<string, unknown> | null;
        };
        Update: Partial<Database["public"]["Tables"]["billing_events"]["Insert"]>;
      };
      account_activity: {
        Relationships: [];
        Row: {
          user_id: string;
          last_active_at: string;
        };
        Insert: {
          user_id: string;
          last_active_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["account_activity"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_club: { Args: { target_club_id: string }; Returns: boolean };
      is_organizer: { Args: { target_organizer_id: string }; Returns: boolean };
      is_tournament_manager: { Args: { target_tournament_id: string }; Returns: boolean };
      is_tournament_staff: { Args: Record<string, never>; Returns: boolean };
      redeem_invite: {
        Args: Record<string, never>;
        Returns: Database["public"]["Tables"]["role_assignments"]["Row"];
      };
      search_players_for_enrollment: {
        Args: { p_tournament_id: string; p_query: string };
        Returns: { player_id: string; first_name: string; last_name: string; email: string | null; gender: GenderType | null; category: number | null }[];
      };
      create_player_for_enrollment: {
        Args: { p_first_name: string; p_last_name: string; p_gender: GenderType | null; p_category: number };
        Returns: Database["public"]["Tables"]["players"]["Row"];
      };
      get_players_by_ids: {
        Args: { p_player_ids: string[] };
        Returns: { player_id: string; gender: GenderType | null; category: number | null }[];
      };
      assign_player_category: {
        Args: { p_player_id: string; p_category: number };
        Returns: Database["public"]["Tables"]["players"]["Row"];
      };
      submit_match_result: {
        Args: { p_match_id: string; p_sets: unknown; p_winner: string; p_by_organizer: boolean };
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
      apply_match_correction: {
        Args: { p_match_id: string; p_sets: unknown; p_winner_team_id: string; p_rating_events: unknown };
        Returns: Database["public"]["Tables"]["matches"]["Row"];
      };
      record_rating_events: {
        Args: { p_events: unknown };
        Returns: Database["public"]["Tables"]["rating_events"]["Row"][];
      };
    };
    Enums: {
      app_role: AppRole;
      invite_status: InviteStatus;
      payment_status: PaymentStatus;
      court_status: CourtStatus;
      gender_type: GenderType;
      tournament_status: TournamentStatus;
      phase_type: PhaseType;
      match_type: DbMatchType;
      match_status: MatchStatus;
      rating_reason: RatingReason;
    };
  };
}
