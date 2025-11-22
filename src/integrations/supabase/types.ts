export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_notification_preferences: {
        Row: {
          created_at: string | null
          id: string
          notify_new_employers: boolean | null
          notify_new_jobs: boolean | null
          notify_payment_issues: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notify_new_employers?: boolean | null
          notify_new_jobs?: boolean | null
          notify_payment_issues?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notify_new_employers?: boolean | null
          notify_new_jobs?: boolean | null
          notify_payment_issues?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          applicant_id: string
          created_at: string
          id: string
          job_id: string
          proposal_text: string
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          applicant_id: string
          created_at?: string
          id?: string
          job_id: string
          proposal_text: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          created_at?: string
          id?: string
          job_id?: string
          proposal_text?: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      employers: {
        Row: {
          company_description: string | null
          company_name: string
          created_at: string
          id: string
          successful_hires: number | null
          total_jobs_posted: number | null
          trust_score: number | null
          updated_at: string
          user_id: string
          verification_date: string | null
          verification_level: string | null
          verification_notes: string | null
          verified: boolean | null
          verified_by: string | null
          website: string | null
        }
        Insert: {
          company_description?: string | null
          company_name: string
          created_at?: string
          id?: string
          successful_hires?: number | null
          total_jobs_posted?: number | null
          trust_score?: number | null
          updated_at?: string
          user_id: string
          verification_date?: string | null
          verification_level?: string | null
          verification_notes?: string | null
          verified?: boolean | null
          verified_by?: string | null
          website?: string | null
        }
        Update: {
          company_description?: string | null
          company_name?: string
          created_at?: string
          id?: string
          successful_hires?: number | null
          total_jobs_posted?: number | null
          trust_score?: number | null
          updated_at?: string
          user_id?: string
          verification_date?: string | null
          verification_level?: string | null
          verification_notes?: string | null
          verified?: boolean | null
          verified_by?: string | null
          website?: string | null
        }
        Relationships: []
      }
      job_alerts: {
        Row: {
          active: boolean | null
          created_at: string | null
          frequency: string | null
          id: string
          last_sent_at: string | null
          locations: Json | null
          min_budget: number | null
          profile_id: string
          remote_only: boolean | null
          skills: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          frequency?: string | null
          id?: string
          last_sent_at?: string | null
          locations?: Json | null
          min_budget?: number | null
          profile_id: string
          remote_only?: boolean | null
          skills?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          frequency?: string | null
          id?: string
          last_sent_at?: string | null
          locations?: Json | null
          min_budget?: number | null
          profile_id?: string
          remote_only?: boolean | null
          skills?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_alerts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_scraping_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          jobs_created: number | null
          jobs_found: number | null
          jobs_rejected: number | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          jobs_created?: number | null
          jobs_found?: number | null
          jobs_rejected?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          jobs_created?: number | null
          jobs_found?: number | null
          jobs_rejected?: number | null
          status?: string | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          ai_scraped: boolean | null
          budget_max: number
          budget_min: number
          company_name: string | null
          created_at: string
          description: string
          duration_days: number | null
          employer_id: string | null
          external_url: string | null
          featured_until: string | null
          id: string
          is_featured: boolean | null
          location: string | null
          milestones: Json | null
          remote: boolean | null
          required_skills: Json | null
          source: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          ai_scraped?: boolean | null
          budget_max: number
          budget_min: number
          company_name?: string | null
          created_at?: string
          description: string
          duration_days?: number | null
          employer_id?: string | null
          external_url?: string | null
          featured_until?: string | null
          id?: string
          is_featured?: boolean | null
          location?: string | null
          milestones?: Json | null
          remote?: boolean | null
          required_skills?: Json | null
          source?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          ai_scraped?: boolean | null
          budget_max?: number
          budget_min?: number
          company_name?: string | null
          created_at?: string
          description?: string
          duration_days?: number | null
          employer_id?: string | null
          external_url?: string | null
          featured_until?: string | null
          id?: string
          is_featured?: boolean | null
          location?: string | null
          milestones?: Json | null
          remote?: boolean | null
          required_skills?: Json | null
          source?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_proofs: {
        Row: {
          bank_details: string | null
          created_at: string | null
          id: string
          notes: string | null
          proof_url: string
          transaction_id: string
          updated_at: string | null
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          bank_details?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          proof_url: string
          transaction_id: string
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          bank_details?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          proof_url?: string
          transaction_id?: string
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          id_verified: boolean | null
          location: string | null
          phone_number: string | null
          portfolio_links: Json | null
          rating: number | null
          skills: Json | null
          total_gigs_completed: number | null
          updated_at: string
          user_id: string
          video_intro_url: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          id_verified?: boolean | null
          location?: string | null
          phone_number?: string | null
          portfolio_links?: Json | null
          rating?: number | null
          skills?: Json | null
          total_gigs_completed?: number | null
          updated_at?: string
          user_id: string
          video_intro_url?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          id_verified?: boolean | null
          location?: string | null
          phone_number?: string | null
          portfolio_links?: Json | null
          rating?: number | null
          skills?: Json | null
          total_gigs_completed?: number | null
          updated_at?: string
          user_id?: string
          video_intro_url?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_minor_units: number
          created_at: string
          currency: string
          description: string | null
          external_reference: string | null
          from_user_id: string | null
          id: string
          job_id: string | null
          net_amount_minor_units: number | null
          payment_metadata: Json | null
          payment_provider: string | null
          platform_fee_minor_units: number | null
          status: Database["public"]["Enums"]["transaction_status"]
          to_user_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          amount_minor_units: number
          created_at?: string
          currency?: string
          description?: string | null
          external_reference?: string | null
          from_user_id?: string | null
          id?: string
          job_id?: string | null
          net_amount_minor_units?: number | null
          payment_metadata?: Json | null
          payment_provider?: string | null
          platform_fee_minor_units?: number | null
          status?: Database["public"]["Enums"]["transaction_status"]
          to_user_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          amount_minor_units?: number
          created_at?: string
          currency?: string
          description?: string | null
          external_reference?: string | null
          from_user_id?: string | null
          id?: string
          job_id?: string | null
          net_amount_minor_units?: number | null
          payment_metadata?: Json | null
          payment_provider?: string | null
          platform_fee_minor_units?: number | null
          status?: Database["public"]["Enums"]["transaction_status"]
          to_user_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance_minor_units: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_minor_units?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_minor_units?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_employer_trust_score: {
        Args: { employer_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "talent" | "employer" | "admin"
      application_status: "pending" | "accepted" | "rejected" | "completed"
      job_status: "draft" | "open" | "in_progress" | "completed" | "cancelled"
      transaction_status: "pending" | "completed" | "failed" | "cancelled"
      transaction_type: "escrow" | "release" | "payout" | "refund"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["talent", "employer", "admin"],
      application_status: ["pending", "accepted", "rejected", "completed"],
      job_status: ["draft", "open", "in_progress", "completed", "cancelled"],
      transaction_status: ["pending", "completed", "failed", "cancelled"],
      transaction_type: ["escrow", "release", "payout", "refund"],
    },
  },
} as const
