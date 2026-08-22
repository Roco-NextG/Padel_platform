/**
 * Hand-written subset of the generated Supabase types, covering the reset
 * schema plus admin panel v2 billing (see supabase/migrations/0002_schema.sql
 * through 0006_billing_rls.sql) — clubs, organizers, role_assignments,
 * players, pending_invites, plans, account_billing, billing_events,
 * account_activity. Once these are applied to the live project, regenerate
 * for real via the Supabase Dashboard's "Generate types" (or the CLI) and
 * diff against this file to catch drift — don't keep hand-typing this
 * long-term.
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
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          first_name: string;
          last_name: string;
          phone?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["players"]["Insert"]>;
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
      redeem_invite: {
        Args: Record<string, never>;
        Returns: Database["public"]["Tables"]["role_assignments"]["Row"];
      };
    };
    Enums: {
      app_role: AppRole;
      invite_status: InviteStatus;
      payment_status: PaymentStatus;
    };
  };
}
