export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      approval_links: {
        Row: {
          client_id: string;
          created_at: string;
          created_by: string | null;
          expires_at: string | null;
          id: string;
          label: string;
          last_used_at: string | null;
          revoked_at: string | null;
          token_hash: string;
          token_hint: string;
        };
        ComputedFields: never;
        Insert: {
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          label?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
          token_hash: string;
          token_hint: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          label?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
          token_hash?: string;
          token_hint?: string;
        };
        Relationships: [
          {
            foreignKeyName: "approval_links_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "approval_links_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      client_social_accounts: {
        Row: {
          client_id: string;
          connected_at: string | null;
          connection: Database["public"]["Enums"]["publish_mode"];
          created_at: string;
          external_id: string | null;
          external_name: string | null;
          handle: string;
          id: string;
          network: Database["public"]["Enums"]["social_network"];
          profile_url: string | null;
          token_expires_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          client_id: string;
          connected_at?: string | null;
          connection?: Database["public"]["Enums"]["publish_mode"];
          created_at?: string;
          external_id?: string | null;
          external_name?: string | null;
          handle: string;
          id?: string;
          network: Database["public"]["Enums"]["social_network"];
          profile_url?: string | null;
          token_expires_at?: string | null;
        };
        Update: {
          client_id?: string;
          connected_at?: string | null;
          connection?: Database["public"]["Enums"]["publish_mode"];
          created_at?: string;
          external_id?: string | null;
          external_name?: string | null;
          handle?: string;
          id?: string;
          network?: Database["public"]["Enums"]["social_network"];
          profile_url?: string | null;
          token_expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_social_accounts_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          archived_at: string | null;
          color_accent: string;
          color_primary: string;
          color_secondary: string;
          contact_email: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          created_at: string;
          id: string;
          industry: string | null;
          logo_url: string | null;
          name: string;
          notes: string | null;
          updated_at: string;
          website: string | null;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          color_accent?: string;
          color_primary?: string;
          color_secondary?: string;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          id?: string;
          industry?: string | null;
          logo_url?: string | null;
          name: string;
          notes?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          archived_at?: string | null;
          color_accent?: string;
          color_primary?: string;
          color_secondary?: string;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          id?: string;
          industry?: string | null;
          logo_url?: string | null;
          name?: string;
          notes?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      hashtag_groups: {
        Row: {
          client_id: string;
          created_at: string;
          hashtags: string[];
          id: string;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          client_id: string;
          created_at?: string;
          hashtags?: string[];
          id?: string;
          name: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          hashtags?: string[];
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hashtag_groups_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          id: string;
          invited_by: string | null;
          role: Database["public"]["Enums"]["user_role"];
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      media_assets: {
        Row: {
          client_id: string;
          created_at: string;
          duration_s: number | null;
          filename: string;
          folder_id: string | null;
          height: number | null;
          id: string;
          kind: Database["public"]["Enums"]["media_kind"];
          mime: string;
          size_bytes: number;
          storage_path: string;
          tags: string[];
          uploaded_by: string | null;
          width: number | null;
        };
        ComputedFields: never;
        Insert: {
          client_id: string;
          created_at?: string;
          duration_s?: number | null;
          filename: string;
          folder_id?: string | null;
          height?: number | null;
          id?: string;
          kind: Database["public"]["Enums"]["media_kind"];
          mime: string;
          size_bytes?: number;
          storage_path: string;
          tags?: string[];
          uploaded_by?: string | null;
          width?: number | null;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          duration_s?: number | null;
          filename?: string;
          folder_id?: string | null;
          height?: number | null;
          id?: string;
          kind?: Database["public"]["Enums"]["media_kind"];
          mime?: string;
          size_bytes?: number;
          storage_path?: string;
          tags?: string[];
          uploaded_by?: string | null;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_assets_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_assets_folder_id_fkey";
            columns: ["folder_id"];
            isOneToOne: false;
            referencedRelation: "media_folders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_assets_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      media_folders: {
        Row: {
          client_id: string;
          created_at: string;
          id: string;
          name: string;
          parent_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          client_id: string;
          created_at?: string;
          id?: string;
          name: string;
          parent_id?: string | null;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          parent_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_folders_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_folders_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "media_folders";
            referencedColumns: ["id"];
          },
        ];
      };
      members: {
        Row: {
          created_at: string;
          role: Database["public"]["Enums"]["user_role"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          role?: Database["public"]["Enums"]["user_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          role?: Database["public"]["Enums"]["user_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_metrics: {
        Row: {
          client_id: string;
          followers: number;
          id: string;
          impressions: number;
          interactions: number;
          month: string;
          network: Database["public"]["Enums"]["social_network"];
          notes: string | null;
          posts_count: number;
          reach: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          client_id: string;
          followers?: number;
          id?: string;
          impressions?: number;
          interactions?: number;
          month: string;
          network: Database["public"]["Enums"]["social_network"];
          notes?: string | null;
          posts_count?: number;
          reach?: number;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          followers?: number;
          id?: string;
          impressions?: number;
          interactions?: number;
          month?: string;
          network?: Database["public"]["Enums"]["social_network"];
          notes?: string | null;
          posts_count?: number;
          reach?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "monthly_metrics_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          post_id: string | null;
          read_at: string | null;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          post_id?: string | null;
          read_at?: string | null;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          post_id?: string | null;
          read_at?: string | null;
          type?: Database["public"]["Enums"]["notification_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      post_comments: {
        Row: {
          author_name: string;
          author_user_id: string | null;
          body: string;
          created_at: string;
          id: string;
          is_client: boolean;
          post_id: string;
        };
        ComputedFields: never;
        Insert: {
          author_name: string;
          author_user_id?: string | null;
          body: string;
          created_at?: string;
          id?: string;
          is_client?: boolean;
          post_id: string;
        };
        Update: {
          author_name?: string;
          author_user_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          is_client?: boolean;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_comments_author_user_id_fkey";
            columns: ["author_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_media: {
        Row: {
          media_id: string;
          position: number;
          post_id: string;
        };
        ComputedFields: never;
        Insert: {
          media_id: string;
          position?: number;
          post_id: string;
        };
        Update: {
          media_id?: string;
          position?: number;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_media_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_media_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_status_history: {
        Row: {
          actor_label: string | null;
          actor_user_id: string | null;
          created_at: string;
          from_status: Database["public"]["Enums"]["post_status"] | null;
          id: number;
          post_id: string;
          to_status: Database["public"]["Enums"]["post_status"];
        };
        ComputedFields: never;
        Insert: {
          actor_label?: string | null;
          actor_user_id?: string | null;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["post_status"] | null;
          id?: never;
          post_id: string;
          to_status: Database["public"]["Enums"]["post_status"];
        };
        Update: {
          actor_label?: string | null;
          actor_user_id?: string | null;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["post_status"] | null;
          id?: never;
          post_id?: string;
          to_status?: Database["public"]["Enums"]["post_status"];
        };
        Relationships: [
          {
            foreignKeyName: "post_status_history_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_status_history_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_targets: {
        Row: {
          attempts: number;
          caption_override: string | null;
          error: string | null;
          external_post_id: string | null;
          id: string;
          network: Database["public"]["Enums"]["social_network"];
          permalink: string | null;
          post_id: string;
          publish_mode: Database["public"]["Enums"]["publish_mode"];
          published_at: string | null;
          reminded_at: string | null;
          status: Database["public"]["Enums"]["target_status"];
        };
        ComputedFields: never;
        Insert: {
          attempts?: number;
          caption_override?: string | null;
          error?: string | null;
          external_post_id?: string | null;
          id?: string;
          network: Database["public"]["Enums"]["social_network"];
          permalink?: string | null;
          post_id: string;
          publish_mode?: Database["public"]["Enums"]["publish_mode"];
          published_at?: string | null;
          reminded_at?: string | null;
          status?: Database["public"]["Enums"]["target_status"];
        };
        Update: {
          attempts?: number;
          caption_override?: string | null;
          error?: string | null;
          external_post_id?: string | null;
          id?: string;
          network?: Database["public"]["Enums"]["social_network"];
          permalink?: string | null;
          post_id?: string;
          publish_mode?: Database["public"]["Enums"]["publish_mode"];
          published_at?: string | null;
          reminded_at?: string | null;
          status?: Database["public"]["Enums"]["target_status"];
        };
        Relationships: [
          {
            foreignKeyName: "post_targets_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          caption: string;
          client_id: string;
          created_at: string;
          created_by: string | null;
          first_comment: string;
          format: Database["public"]["Enums"]["post_format"];
          id: string;
          published_at: string | null;
          scheduled_at: string | null;
          status: Database["public"]["Enums"]["post_status"];
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          caption?: string;
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          first_comment?: string;
          format?: Database["public"]["Enums"]["post_format"];
          id?: string;
          published_at?: string | null;
          scheduled_at?: string | null;
          status?: Database["public"]["Enums"]["post_status"];
          title?: string;
          updated_at?: string;
        };
        Update: {
          caption?: string;
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          first_comment?: string;
          format?: Database["public"]["Enums"]["post_format"];
          id?: string;
          published_at?: string | null;
          scheduled_at?: string | null;
          status?: Database["public"]["Enums"]["post_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      social_tokens: {
        Row: {
          access_token_encrypted: string;
          account_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          access_token_encrypted: string;
          account_id: string;
          updated_at?: string;
        };
        Update: {
          access_token_encrypted?: string;
          account_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "social_tokens_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: true;
            referencedRelation: "client_social_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      templates: {
        Row: {
          caption: string;
          client_id: string;
          created_at: string;
          first_comment: string;
          format: Database["public"]["Enums"]["post_format"];
          id: string;
          name: string;
          networks: Database["public"]["Enums"]["social_network"][];
        };
        ComputedFields: never;
        Insert: {
          caption?: string;
          client_id: string;
          created_at?: string;
          first_comment?: string;
          format?: Database["public"]["Enums"]["post_format"];
          id?: string;
          name: string;
          networks?: Database["public"]["Enums"]["social_network"][];
        };
        Update: {
          caption?: string;
          client_id?: string;
          created_at?: string;
          first_comment?: string;
          format?: Database["public"]["Enums"]["post_format"];
          id?: string;
          name?: string;
          networks?: Database["public"]["Enums"]["social_network"][];
        };
        Relationships: [
          {
            foreignKeyName: "templates_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_edit: { Args: Record<PropertyKey, never>; Returns: boolean };
      claim_invitation: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_member: { Args: Record<PropertyKey, never>; Returns: boolean };
      my_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
    };
    Enums: {
      media_kind: "image" | "video";
      notification_type:
        | "publish_due"
        | "client_comment"
        | "client_approved"
        | "client_changes"
        | "publish_failed"
        | "published";
      post_format: "post" | "carousel" | "video" | "reel";
      post_status:
        | "idea"
        | "draft"
        | "in_review"
        | "approved"
        | "scheduled"
        | "published"
        | "failed";
      publish_mode: "auto" | "manual";
      social_network: "instagram" | "facebook" | "tiktok" | "linkedin" | "x";
      target_status: "pending" | "published" | "failed";
      user_role: "admin" | "editor" | "viewer";
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      media_kind: ["image", "video"],
      notification_type: [
        "publish_due",
        "client_comment",
        "client_approved",
        "client_changes",
        "publish_failed",
        "published",
      ],
      post_format: ["post", "carousel", "video", "reel"],
      post_status: [
        "idea",
        "draft",
        "in_review",
        "approved",
        "scheduled",
        "published",
        "failed",
      ],
      publish_mode: ["auto", "manual"],
      social_network: ["instagram", "facebook", "tiktok", "linkedin", "x"],
      target_status: ["pending", "published", "failed"],
      user_role: ["admin", "editor", "viewer"],
    },
  },
} as const;
