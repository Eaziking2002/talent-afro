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
      certifications: {
        Row: {
          certificate_name: string
          certificate_url: string
          created_at: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          talent_id: string
          updated_at: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          certificate_name: string
          certificate_url: string
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          talent_id: string
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          certificate_name?: string
          certificate_url?: string
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          talent_id?: string
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certifications_talent_id_fkey"
            columns: ["talent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_amendments: {
        Row: {
          amendment_data: Json
          amendment_type: string
          approved_by: string | null
          contract_id: string
          created_at: string | null
          id: string
          proposed_by: string
          rejection_reason: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amendment_data: Json
          amendment_type: string
          approved_by?: string | null
          contract_id: string
          created_at?: string | null
          id?: string
          proposed_by: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amendment_data?: Json
          amendment_type?: string
          approved_by?: string | null
          contract_id?: string
          created_at?: string | null
          id?: string
          proposed_by?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_amendments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_messages: {
        Row: {
          contract_id: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          message_text: string
          read_at: string | null
          response_time_minutes: number | null
          sender_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message_text: string
          read_at?: string | null
          response_time_minutes?: number | null
          sender_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message_text?: string
          read_at?: string | null
          response_time_minutes?: number | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_messages_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          created_at: string | null
          default_currency: string | null
          default_duration_days: number | null
          default_terms: string | null
          description: string | null
          employer_id: string
          id: string
          milestones: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_currency?: string | null
          default_duration_days?: number | null
          default_terms?: string | null
          description?: string | null
          employer_id: string
          id?: string
          milestones?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_currency?: string | null
          default_duration_days?: number | null
          default_terms?: string | null
          description?: string | null
          employer_id?: string
          id?: string
          milestones?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          application_id: string
          created_at: string
          currency: string
          employer_id: string
          end_date: string | null
          escrow_status: string | null
          id: string
          is_renewal: boolean | null
          job_id: string
          parent_contract_id: string | null
          start_date: string | null
          status: string
          talent_id: string
          terms: string | null
          total_amount_minor_units: number
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          currency?: string
          employer_id: string
          end_date?: string | null
          escrow_status?: string | null
          id?: string
          is_renewal?: boolean | null
          job_id: string
          parent_contract_id?: string | null
          start_date?: string | null
          status?: string
          talent_id: string
          terms?: string | null
          total_amount_minor_units: number
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          currency?: string
          employer_id?: string
          end_date?: string | null
          escrow_status?: string | null
          id?: string
          is_renewal?: boolean | null
          job_id?: string
          parent_contract_id?: string | null
          start_date?: string | null
          status?: string
          talent_id?: string
          terms?: string | null
          total_amount_minor_units?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_parent_contract_id_fkey"
            columns: ["parent_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverables: {
        Row: {
          description: string
          file_url: string | null
          id: string
          milestone_id: string
          reviewed_at: string | null
          status: string
          submitted_at: string
          submitted_by: string
        }
        Insert: {
          description: string
          file_url?: string | null
          id?: string
          milestone_id: string
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          submitted_by: string
        }
        Update: {
          description?: string
          file_url?: string | null
          id?: string
          milestone_id?: string
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_escalations: {
        Row: {
          dispute_id: string
          escalated_at: string | null
          escalated_to: string | null
          escalation_notes: string | null
          id: string
          resolved_at: string | null
        }
        Insert: {
          dispute_id: string
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_notes?: string | null
          id?: string
          resolved_at?: string | null
        }
        Update: {
          dispute_id?: string
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_notes?: string | null
          id?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_escalations_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          raised_by: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          raised_by: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          raised_by?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      employers: {
        Row: {
          average_rating: number | null
          company_description: string | null
          company_name: string
          created_at: string
          id: string
          successful_hires: number | null
          total_jobs_posted: number | null
          total_reviews: number | null
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
          average_rating?: number | null
          company_description?: string | null
          company_name: string
          created_at?: string
          id?: string
          successful_hires?: number | null
          total_jobs_posted?: number | null
          total_reviews?: number | null
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
          average_rating?: number | null
          company_description?: string | null
          company_name?: string
          created_at?: string
          id?: string
          successful_hires?: number | null
          total_jobs_posted?: number | null
          total_reviews?: number | null
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
      job_bookmarks: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          notes: string | null
          profile_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          notes?: string | null
          profile_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          profile_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_bookmarks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_bookmarks_profile_id_fkey"
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
      job_views: {
        Row: {
          id: string
          job_id: string
          session_id: string
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          id?: string
          job_id: string
          session_id: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          id?: string
          job_id?: string
          session_id?: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_views_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
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
      messages: {
        Row: {
          application_id: string | null
          created_at: string
          id: string
          message_text: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          id?: string
          message_text: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          id?: string
          message_text?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_application"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_reminders: {
        Row: {
          id: string
          milestone_id: string
          reminder_type: string
          sent_at: string | null
        }
        Insert: {
          id?: string
          milestone_id: string
          reminder_type: string
          sent_at?: string | null
        }
        Update: {
          id?: string
          milestone_id?: string
          reminder_type?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestone_reminders_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          amount_minor_units: number
          contract_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amount_minor_units: number
          contract_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount_minor_units?: number
          contract_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
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
      portfolio_items: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          file_type: string
          file_url: string
          id: string
          profile_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          file_type: string
          file_url: string
          id?: string
          profile_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          file_type?: string
          file_url?: string
          id?: string
          profile_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          average_rating: number | null
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
          total_reviews: number | null
          updated_at: string
          user_id: string
          video_intro_url: string | null
        }
        Insert: {
          average_rating?: number | null
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
          total_reviews?: number | null
          updated_at?: string
          user_id: string
          video_intro_url?: string | null
        }
        Update: {
          average_rating?: number | null
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
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
          video_intro_url?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          referred_email: string
          referred_id: string | null
          referred_type: string
          referrer_id: string
          reward_credits: number | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referred_email: string
          referred_id?: string | null
          referred_type: string
          referrer_id: string
          reward_credits?: number | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referred_email?: string
          referred_id?: string | null
          referred_type?: string
          referrer_id?: string
          reward_credits?: number | null
          status?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          rating: number
          review_text: string | null
          reviewee_id: string
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          reviewee_id: string
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          reviewee_id?: string
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_assessments: {
        Row: {
          assessed_by: string
          assessment_notes: string | null
          assessment_score: number
          created_at: string | null
          id: string
          skill_name: string
          talent_id: string
        }
        Insert: {
          assessed_by: string
          assessment_notes?: string | null
          assessment_score: number
          created_at?: string | null
          id?: string
          skill_name: string
          talent_id: string
        }
        Update: {
          assessed_by?: string
          assessment_notes?: string | null
          assessment_score?: number
          created_at?: string | null
          id?: string
          skill_name?: string
          talent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_assessments_talent_id_fkey"
            columns: ["talent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      video_calls: {
        Row: {
          application_id: string
          created_at: string
          ended_at: string | null
          id: string
          initiator_id: string
          recipient_id: string
          room_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          application_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          initiator_id: string
          recipient_id: string
          room_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          initiator_id?: string
          recipient_id?: string
          room_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_calls_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
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
