export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      application_questions: {
        Row: {
          canonical_key: string | null;
          category: string | null;
          created_at: string;
          id: string;
          normalized_question: string;
          question_type: string;
          requires_confirmation: boolean;
          sensitive: boolean;
          updated_at: string;
        };
        Insert: {
          canonical_key?: string | null;
          category?: string | null;
          created_at?: string;
          id?: string;
          normalized_question: string;
          question_type: string;
          requires_confirmation?: boolean;
          sensitive?: boolean;
          updated_at?: string;
        };
        Update: {
          canonical_key?: string | null;
          category?: string | null;
          created_at?: string;
          id?: string;
          normalized_question?: string;
          question_type?: string;
          requires_confirmation?: boolean;
          sensitive?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      application_responses: {
        Row: {
          answer_text: string | null;
          application_id: string;
          confidence: number | null;
          created_at: string;
          id: string;
          normalized_question: string | null;
          provenance: string;
          question_text: string;
          requires_review: boolean;
          reviewed: boolean;
          source: string | null;
        };
        Insert: {
          answer_text?: string | null;
          application_id: string;
          confidence?: number | null;
          created_at?: string;
          id?: string;
          normalized_question?: string | null;
          provenance?: string;
          question_text: string;
          requires_review?: boolean;
          reviewed?: boolean;
          source?: string | null;
        };
        Update: {
          answer_text?: string | null;
          application_id?: string;
          confidence?: number | null;
          created_at?: string;
          id?: string;
          normalized_question?: string | null;
          provenance?: string;
          question_text?: string;
          requires_review?: boolean;
          reviewed?: boolean;
          source?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "application_responses_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
        ];
      };
      applications: {
        Row: {
          application_confirmation: string | null;
          cover_letter: string | null;
          created_at: string;
          id: string;
          job_id: string;
          notes: string | null;
          profile_id: string;
          resume_version_id: string | null;
          started_at: string | null;
          status: string;
          submitted_at: string | null;
          updated_at: string;
        };
        Insert: {
          application_confirmation?: string | null;
          cover_letter?: string | null;
          created_at?: string;
          id?: string;
          job_id: string;
          notes?: string | null;
          profile_id: string;
          resume_version_id?: string | null;
          started_at?: string | null;
          status?: string;
          submitted_at?: string | null;
          updated_at?: string;
        };
        Update: {
          application_confirmation?: string | null;
          cover_letter?: string | null;
          created_at?: string;
          id?: string;
          job_id?: string;
          notes?: string | null;
          profile_id?: string;
          resume_version_id?: string | null;
          started_at?: string | null;
          status?: string;
          submitted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "candidate_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_resume_version_id_profile_id_job_id_fkey";
            columns: ["resume_version_id", "profile_id", "job_id"];
            isOneToOne: false;
            referencedRelation: "resume_versions";
            referencedColumns: ["id", "profile_id", "job_id"];
          },
        ];
      };
      candidate_answers: {
        Row: {
          answer_boolean: boolean | null;
          answer_number: number | null;
          answer_text: string | null;
          canonical_key: string | null;
          created_at: string;
          id: string;
          profile_id: string;
          question_id: string | null;
          question_pattern: string | null;
          safe_to_reuse: boolean;
          updated_at: string;
          verified: boolean;
        };
        Insert: {
          answer_boolean?: boolean | null;
          answer_number?: number | null;
          answer_text?: string | null;
          canonical_key?: string | null;
          created_at?: string;
          id?: string;
          profile_id: string;
          question_id?: string | null;
          question_pattern?: string | null;
          safe_to_reuse?: boolean;
          updated_at?: string;
          verified?: boolean;
        };
        Update: {
          answer_boolean?: boolean | null;
          answer_number?: number | null;
          answer_text?: string | null;
          canonical_key?: string | null;
          created_at?: string;
          id?: string;
          profile_id?: string;
          question_id?: string | null;
          question_pattern?: string | null;
          safe_to_reuse?: boolean;
          updated_at?: string;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "candidate_answers_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "candidate_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "candidate_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "application_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      candidate_facts: {
        Row: {
          categories: string[];
          created_at: string;
          description: string | null;
          fact_type: string;
          id: string;
          keywords: string[];
          metadata: Json;
          profile_id: string;
          revision: number;
          sensitivity: string;
          source_reference: string | null;
          title: string | null;
          updated_at: string;
          valid_from: string | null;
          valid_from_precision: string;
          valid_to: string | null;
          valid_to_precision: string;
          value_number: number | null;
          value_text: string | null;
          verified: boolean;
          verified_at: string | null;
        };
        Insert: {
          categories?: string[];
          created_at?: string;
          description?: string | null;
          fact_type: string;
          id?: string;
          keywords?: string[];
          metadata?: Json;
          profile_id: string;
          revision?: number;
          sensitivity?: string;
          source_reference?: string | null;
          title?: string | null;
          updated_at?: string;
          valid_from?: string | null;
          valid_from_precision?: string;
          valid_to?: string | null;
          valid_to_precision?: string;
          value_number?: number | null;
          value_text?: string | null;
          verified?: boolean;
          verified_at?: string | null;
        };
        Update: {
          categories?: string[];
          created_at?: string;
          description?: string | null;
          fact_type?: string;
          id?: string;
          keywords?: string[];
          metadata?: Json;
          profile_id?: string;
          revision?: number;
          sensitivity?: string;
          source_reference?: string | null;
          title?: string | null;
          updated_at?: string;
          valid_from?: string | null;
          valid_from_precision?: string;
          valid_to?: string | null;
          valid_to_precision?: string;
          value_number?: number | null;
          value_text?: string | null;
          verified?: boolean;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "candidate_facts_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "candidate_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      candidate_profiles: {
        Row: {
          city: string | null;
          country: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          github_url: string | null;
          id: string;
          linkedin_url: string | null;
          personal_source_reference: string | null;
          personal_verified: boolean;
          personal_verified_at: string | null;
          phone: string | null;
          portfolio_url: string | null;
          preferred_name: string | null;
          professional_summary: string | null;
          province: string | null;
          revision: number;
          summary_source_reference: string | null;
          summary_verified: boolean;
          summary_verified_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          city?: string | null;
          country?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          github_url?: string | null;
          id?: string;
          linkedin_url?: string | null;
          personal_source_reference?: string | null;
          personal_verified?: boolean;
          personal_verified_at?: string | null;
          phone?: string | null;
          portfolio_url?: string | null;
          preferred_name?: string | null;
          professional_summary?: string | null;
          province?: string | null;
          revision?: number;
          summary_source_reference?: string | null;
          summary_verified?: boolean;
          summary_verified_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          city?: string | null;
          country?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          github_url?: string | null;
          id?: string;
          linkedin_url?: string | null;
          personal_source_reference?: string | null;
          personal_verified?: boolean;
          personal_verified_at?: string | null;
          phone?: string | null;
          portfolio_url?: string | null;
          preferred_name?: string | null;
          professional_summary?: string | null;
          province?: string | null;
          revision?: number;
          summary_source_reference?: string | null;
          summary_verified?: boolean;
          summary_verified_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      education: {
        Row: {
          categories: string[];
          created_at: string;
          credential: string | null;
          end_date: string | null;
          end_date_precision: string;
          field_of_study: string | null;
          id: string;
          institution: string;
          location: string | null;
          profile_id: string;
          revision: number;
          source_reference: string | null;
          start_date: string | null;
          start_date_precision: string;
          updated_at: string;
          verified: boolean;
          verified_at: string | null;
        };
        Insert: {
          categories?: string[];
          created_at?: string;
          credential?: string | null;
          end_date?: string | null;
          end_date_precision?: string;
          field_of_study?: string | null;
          id?: string;
          institution: string;
          location?: string | null;
          profile_id: string;
          revision?: number;
          source_reference?: string | null;
          start_date?: string | null;
          start_date_precision?: string;
          updated_at?: string;
          verified?: boolean;
          verified_at?: string | null;
        };
        Update: {
          categories?: string[];
          created_at?: string;
          credential?: string | null;
          end_date?: string | null;
          end_date_precision?: string;
          field_of_study?: string | null;
          id?: string;
          institution?: string;
          location?: string | null;
          profile_id?: string;
          revision?: number;
          source_reference?: string | null;
          start_date?: string | null;
          start_date_precision?: string;
          updated_at?: string;
          verified?: boolean;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "education_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "candidate_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      experience_bullets: {
        Row: {
          categories: string[];
          created_at: string;
          experience_id: string;
          id: string;
          keywords: string[];
          original_text: string;
          revision: number;
          skills: string[];
          source_reference: string | null;
          updated_at: string;
          verified: boolean;
          verified_at: string | null;
        };
        Insert: {
          categories?: string[];
          created_at?: string;
          experience_id: string;
          id?: string;
          keywords?: string[];
          original_text: string;
          revision?: number;
          skills?: string[];
          source_reference?: string | null;
          updated_at?: string;
          verified?: boolean;
          verified_at?: string | null;
        };
        Update: {
          categories?: string[];
          created_at?: string;
          experience_id?: string;
          id?: string;
          keywords?: string[];
          original_text?: string;
          revision?: number;
          skills?: string[];
          source_reference?: string | null;
          updated_at?: string;
          verified?: boolean;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "experience_bullets_experience_id_fkey";
            columns: ["experience_id"];
            isOneToOne: false;
            referencedRelation: "experiences";
            referencedColumns: ["id"];
          },
        ];
      };
      experiences: {
        Row: {
          categories: string[];
          company: string;
          created_at: string;
          currently_employed: boolean;
          employment_type: string | null;
          end_date: string | null;
          end_date_precision: string;
          id: string;
          location: string | null;
          profile_id: string;
          revision: number;
          source_reference: string | null;
          start_date: string | null;
          start_date_precision: string;
          title: string;
          updated_at: string;
          verified: boolean;
          verified_at: string | null;
        };
        Insert: {
          categories?: string[];
          company: string;
          created_at?: string;
          currently_employed?: boolean;
          employment_type?: string | null;
          end_date?: string | null;
          end_date_precision?: string;
          id?: string;
          location?: string | null;
          profile_id: string;
          revision?: number;
          source_reference?: string | null;
          start_date?: string | null;
          start_date_precision?: string;
          title: string;
          updated_at?: string;
          verified?: boolean;
          verified_at?: string | null;
        };
        Update: {
          categories?: string[];
          company?: string;
          created_at?: string;
          currently_employed?: boolean;
          employment_type?: string | null;
          end_date?: string | null;
          end_date_precision?: string;
          id?: string;
          location?: string | null;
          profile_id?: string;
          revision?: number;
          source_reference?: string | null;
          start_date?: string | null;
          start_date_precision?: string;
          title?: string;
          updated_at?: string;
          verified?: boolean;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "experiences_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "candidate_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_analysis: {
        Row: {
          analyzed_at: string;
          concerns: Json;
          created_at: string;
          fit_score: number | null;
          id: string;
          job_id: string;
          matched_requirements: Json;
          missing_preferred_requirements: Json;
          missing_required_requirements: Json;
          model: string;
          partial_requirements: Json;
          preference_id: string | null;
          profile_id: string;
          prompt_version: string;
          reasoning_summary: string | null;
          recommendation: string | null;
          strengths: Json;
        };
        Insert: {
          analyzed_at?: string;
          concerns?: Json;
          created_at?: string;
          fit_score?: number | null;
          id?: string;
          job_id: string;
          matched_requirements?: Json;
          missing_preferred_requirements?: Json;
          missing_required_requirements?: Json;
          model: string;
          partial_requirements?: Json;
          preference_id?: string | null;
          profile_id: string;
          prompt_version: string;
          reasoning_summary?: string | null;
          recommendation?: string | null;
          strengths?: Json;
        };
        Update: {
          analyzed_at?: string;
          concerns?: Json;
          created_at?: string;
          fit_score?: number | null;
          id?: string;
          job_id?: string;
          matched_requirements?: Json;
          missing_preferred_requirements?: Json;
          missing_required_requirements?: Json;
          model?: string;
          partial_requirements?: Json;
          preference_id?: string | null;
          profile_id?: string;
          prompt_version?: string;
          reasoning_summary?: string | null;
          recommendation?: string | null;
          strengths?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "job_analysis_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_analysis_preference_id_profile_id_fkey";
            columns: ["preference_id", "profile_id"];
            isOneToOne: false;
            referencedRelation: "job_preferences";
            referencedColumns: ["id", "profile_id"];
          },
          {
            foreignKeyName: "job_analysis_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "candidate_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_preferences: {
        Row: {
          created_at: string;
          employment_types: string[];
          enabled: boolean;
          excluded_keywords: string[];
          excluded_titles: string[];
          id: string;
          keywords: string[];
          max_commute_km: number | null;
          metadata: Json;
          min_salary: number | null;
          minimum_fit_score: number | null;
          name: string;
          profile_id: string;
          remote_preferences: string[];
          salary_period: string | null;
          target_locations: string[];
          target_titles: string[];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          employment_types?: string[];
          enabled?: boolean;
          excluded_keywords?: string[];
          excluded_titles?: string[];
          id?: string;
          keywords?: string[];
          max_commute_km?: number | null;
          metadata?: Json;
          min_salary?: number | null;
          minimum_fit_score?: number | null;
          name: string;
          profile_id: string;
          remote_preferences?: string[];
          salary_period?: string | null;
          target_locations?: string[];
          target_titles?: string[];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          employment_types?: string[];
          enabled?: boolean;
          excluded_keywords?: string[];
          excluded_titles?: string[];
          id?: string;
          keywords?: string[];
          max_commute_km?: number | null;
          metadata?: Json;
          min_salary?: number | null;
          minimum_fit_score?: number | null;
          name?: string;
          profile_id?: string;
          remote_preferences?: string[];
          salary_period?: string | null;
          target_locations?: string[];
          target_titles?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_preferences_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "candidate_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_sources: {
        Row: {
          configuration: Json;
          created_at: string;
          display_name: string;
          enabled: boolean;
          id: string;
          last_synced_at: string | null;
          profile_id: string;
          provider: string;
          updated_at: string;
        };
        Insert: {
          configuration?: Json;
          created_at?: string;
          display_name: string;
          enabled?: boolean;
          id?: string;
          last_synced_at?: string | null;
          profile_id: string;
          provider: string;
          updated_at?: string;
        };
        Update: {
          configuration?: Json;
          created_at?: string;
          display_name?: string;
          enabled?: boolean;
          id?: string;
          last_synced_at?: string | null;
          profile_id?: string;
          provider?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_sources_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "candidate_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          application_url: string | null;
          canonical_url: string | null;
          company: string | null;
          country: string | null;
          created_at: string;
          description: string | null;
          discovered_at: string;
          employment_type: string | null;
          external_job_id: string | null;
          fingerprint: string | null;
          id: string;
          location: string | null;
          normalized_company: string | null;
          normalized_location: string | null;
          normalized_title: string | null;
          posted_at: string | null;
          provider: string;
          remote_type: string | null;
          salary_currency: string | null;
          salary_max: number | null;
          salary_min: number | null;
          source_metadata: Json;
          title: string;
          updated_at: string;
        };
        Insert: {
          application_url?: string | null;
          canonical_url?: string | null;
          company?: string | null;
          country?: string | null;
          created_at?: string;
          description?: string | null;
          discovered_at?: string;
          employment_type?: string | null;
          external_job_id?: string | null;
          fingerprint?: string | null;
          id?: string;
          location?: string | null;
          normalized_company?: string | null;
          normalized_location?: string | null;
          normalized_title?: string | null;
          posted_at?: string | null;
          provider: string;
          remote_type?: string | null;
          salary_currency?: string | null;
          salary_max?: number | null;
          salary_min?: number | null;
          source_metadata?: Json;
          title: string;
          updated_at?: string;
        };
        Update: {
          application_url?: string | null;
          canonical_url?: string | null;
          company?: string | null;
          country?: string | null;
          created_at?: string;
          description?: string | null;
          discovered_at?: string;
          employment_type?: string | null;
          external_job_id?: string | null;
          fingerprint?: string | null;
          id?: string;
          location?: string | null;
          normalized_company?: string | null;
          normalized_location?: string | null;
          normalized_title?: string | null;
          posted_at?: string | null;
          provider?: string;
          remote_type?: string | null;
          salary_currency?: string | null;
          salary_max?: number | null;
          salary_min?: number | null;
          source_metadata?: Json;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          achievements: string[];
          categories: string[];
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          profile_id: string;
          revision: number;
          source_reference: string | null;
          technologies: string[];
          updated_at: string;
          url: string | null;
          verified: boolean;
          verified_at: string | null;
        };
        Insert: {
          achievements?: string[];
          categories?: string[];
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          profile_id: string;
          revision?: number;
          source_reference?: string | null;
          technologies?: string[];
          updated_at?: string;
          url?: string | null;
          verified?: boolean;
          verified_at?: string | null;
        };
        Update: {
          achievements?: string[];
          categories?: string[];
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          profile_id?: string;
          revision?: number;
          source_reference?: string | null;
          technologies?: string[];
          updated_at?: string;
          url?: string | null;
          verified?: boolean;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "projects_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "candidate_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      resume_versions: {
        Row: {
          created_at: string;
          id: string;
          job_id: string;
          model: string;
          pdf_storage_path: string | null;
          profile_id: string;
          prompt_version: string;
          structured_content: Json;
          validation_result: Json;
        };
        Insert: {
          created_at?: string;
          id?: string;
          job_id: string;
          model: string;
          pdf_storage_path?: string | null;
          profile_id: string;
          prompt_version: string;
          structured_content?: Json;
          validation_result?: Json;
        };
        Update: {
          created_at?: string;
          id?: string;
          job_id?: string;
          model?: string;
          pdf_storage_path?: string | null;
          profile_id?: string;
          prompt_version?: string;
          structured_content?: Json;
          validation_result?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "resume_versions_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resume_versions_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "candidate_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
