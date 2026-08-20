/**
 * Hand-written subset of the generated Supabase types, covering the reset
 * schema (see supabase/migrations/0002_schema.sql) — clubs, organizers,
 * role_assignments, players (minimal placeholder), pending_invites. Once
 * 0001-0004 are applied to the live project, regenerate for real via the
 * Supabase Dashboard's "Generate types" (or the CLI) and diff against this
 * file to catch drift — don't keep hand-typing this long-term.
 */

export type AppRole = "ADMIN" | "CLUB" | "ORGANIZADOR" | "JUGADOR";
export type InviteStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

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
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_email?: string | null;
          city?: string | null;
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
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_email?: string | null;
          city?: string | null;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          first_name: string;
          last_name: string;
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
          invited_by: string;
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
    };
  };
}
