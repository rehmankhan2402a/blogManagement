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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      blog_tags: {
        Row: {
          blog_id: string
          tag_id: string
        }
        Insert: {
          blog_id: string
          tag_id: string
        }
        Update: {
          blog_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_tags_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blogs: {
        Row: {
          author_id: string | null
          canonical_url: string | null
          category_id: string | null
          content: Json | null
          content_html: string | null
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          focus_keyword: string | null
          gallery: Json
          id: string
          is_featured: boolean
          meta_description: string | null
          meta_title: string | null
          og_image_url: string | null
          published_at: string | null
          reading_time_min: number
          slug: string
          status: Database["public"]["Enums"]["blog_status"]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id?: string | null
          canonical_url?: string | null
          category_id?: string | null
          content?: Json | null
          content_html?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          focus_keyword?: string | null
          gallery?: Json
          id?: string
          is_featured?: boolean
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          published_at?: string | null
          reading_time_min?: number
          slug: string
          status?: Database["public"]["Enums"]["blog_status"]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string | null
          canonical_url?: string | null
          category_id?: string | null
          content?: Json | null
          content_html?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          focus_keyword?: string | null
          gallery?: Json
          id?: string
          is_featured?: boolean
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          published_at?: string | null
          reading_time_min?: number
          slug?: string
          status?: Database["public"]["Enums"]["blog_status"]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "blogs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      media: {
        Row: {
          created_at: string
          filename: string
          height: number | null
          id: string
          mime: string | null
          path: string
          size_bytes: number | null
          uploaded_by: string | null
          url: string
          width: number | null
        }
        Insert: {
          created_at?: string
          filename: string
          height?: number | null
          id?: string
          mime?: string | null
          path: string
          size_bytes?: number | null
          uploaded_by?: string | null
          url: string
          width?: number | null
        }
        Update: {
          created_at?: string
          filename?: string
          height?: number | null
          id?: string
          mime?: string | null
          path?: string
          size_bytes?: number | null
          uploaded_by?: string | null
          url?: string
          width?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_name: string | null
          content_html: string | null
          created_at: string
          description: string
          featured_image_url: string | null
          gallery: Json | null
          id: string
          is_featured: boolean
          location: string | null
          scope: string | null
          slug: string
          sort_order: number
          status: string
          tag: string
          title: string
          updated_at: string
          year: string | null
        }
        Insert: {
          client_name?: string | null
          content_html?: string | null
          created_at?: string
          description: string
          featured_image_url?: string | null
          gallery?: Json | null
          id?: string
          is_featured?: boolean
          location?: string | null
          scope?: string | null
          slug: string
          sort_order?: number
          status?: string
          tag?: string
          title: string
          updated_at?: string
          year?: string | null
        }
        Update: {
          client_name?: string | null
          content_html?: string | null
          created_at?: string
          description?: string
          featured_image_url?: string | null
          gallery?: Json | null
          id?: string
          is_featured?: boolean
          location?: string | null
          scope?: string | null
          slug?: string
          sort_order?: number
          status?: string
          tag?: string
          title?: string
          updated_at?: string
          year?: string | null
        }
        Relationships: []
      }
      project_gallery: {
        Row: {
          created_at: string
          id: string
          image_url: string
          project_id: string | null
          sort_order: number
          status: string
          tag: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          project_id?: string | null
          sort_order?: number
          status?: string
          tag?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          project_id?: string | null
          sort_order?: number
          status?: string
          tag?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string
          featured_image_url: string | null
          features: Json | null
          id: string
          images: Json | null
          name: string
          slug: string
          sort_order: number
          specs: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description: string
          featured_image_url?: string | null
          features?: Json | null
          id?: string
          images?: Json | null
          name: string
          slug: string
          sort_order?: number
          specs?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string
          featured_image_url?: string | null
          features?: Json | null
          id?: string
          images?: Json | null
          name?: string
          slug?: string
          sort_order?: number
          specs?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          detailed_desc: string | null
          features: Json | null
          icon_name: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          short_desc: string
          slug: string
          sort_order: number
          specs: Json | null
          status: string
          tag: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          detailed_desc?: string | null
          features?: Json | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          short_desc: string
          slug: string
          sort_order?: number
          specs?: Json | null
          status?: string
          tag: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          detailed_desc?: string | null
          features?: Json | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          short_desc?: string
          slug?: string
          sort_order?: number
          specs?: Json | null
          status?: string
          tag?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
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
      contact_messages: {
        Row: {
          id: string
          created_at: string
          full_name: string
          email: string
          phone: string | null
          service: string | null
          message: string
          status: "unread" | "read" | "replied"
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          full_name: string
          email: string
          phone?: string | null
          service?: string | null
          message: string
          status?: "unread" | "read" | "replied"
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          full_name?: string
          email?: string
          phone?: string | null
          service?: string | null
          message?: string
          status?: "unread" | "read" | "replied"
          notes?: string | null
        }
        Relationships: []
      }
      calculator_settings: {
        Row: {
          id: string
          core_rooms: {
            bedroom: number
            bath: number
            kitchen: number
            lounge: number
            passage: number
          }
          area_base_prices: Record<string, number>
          stage_multipliers: Record<string, number>
          commercial_multiplier: number
          updated_at: string
        }
        Insert: {
          id?: string
          core_rooms?: {
            bedroom: number
            bath: number
            kitchen: number
            lounge: number
            passage: number
          }
          area_base_prices?: Record<string, number>
          stage_multipliers?: Record<string, number>
          commercial_multiplier?: number
          updated_at?: string
        }
        Update: {
          id?: string
          core_rooms?: {
            bedroom: number
            bath: number
            kitchen: number
            lounge: number
            passage: number
          }
          area_base_prices?: Record<string, number>
          stage_multipliers?: Record<string, number>
          commercial_multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      calculator_spaces: {
        Row: {
          id: string
          label: string
          base_price: number
          is_default_selected: boolean
          default_package: string
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          label: string
          base_price: number
          is_default_selected?: boolean
          default_package: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          label?: string
          base_price?: number
          is_default_selected?: boolean
          default_package?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      calculator_quotes: {
        Row: {
          id: string
          created_at: string
          full_name: string
          email: string
          phone: string
          city: string | null
          notes: string | null
          site_type: string
          area_range: string
          site_stage: string
          room_counts: Record<string, number>
          other_spaces: Array<{
            id: string
            label: string
            count: number
            basePrice: number
            packageType: string
          }>
          estimated_total: number
          status: "new" | "contacted" | "survey_scheduled" | "converted" | "archived"
          admin_notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          full_name: string
          email: string
          phone: string
          city?: string | null
          notes?: string | null
          site_type: string
          area_range: string
          site_stage: string
          room_counts: Record<string, number>
          other_spaces: Array<{
            id: string
            label: string
            count: number
            basePrice: number
            packageType: string
          }>
          estimated_total: number
          status?: "new" | "contacted" | "survey_scheduled" | "converted" | "archived"
          admin_notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          full_name?: string
          email?: string
          phone?: string
          city?: string | null
          notes?: string | null
          site_type?: string
          area_range?: string
          site_stage?: string
          room_counts?: Record<string, number>
          other_spaces?: Array<{
            id: string
            label: string
            count: number
            basePrice: number
            packageType: string
          }>
          estimated_total?: number
          status?: "new" | "contacted" | "survey_scheduled" | "converted" | "archived"
          admin_notes?: string | null
        }
        Relationships: []
      }
      smtp_settings: {
        Row: {
          id: string
          provider: "custom_smtp" | "resend" | "gmail" | "sendgrid"
          smtp_host: string
          smtp_port: number
          smtp_encryption: "TLS" | "SSL" | "None"
          smtp_user: string | null
          smtp_pass: string | null
          from_name: string
          from_email: string
          admin_recipient_email: string
          resend_api_key: string | null
          notify_on_quote: boolean
          notify_on_contact: boolean
          auto_reply_to_customer: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          provider?: "custom_smtp" | "resend" | "gmail" | "sendgrid"
          smtp_host?: string
          smtp_port?: number
          smtp_encryption?: "TLS" | "SSL" | "None"
          smtp_user?: string | null
          smtp_pass?: string | null
          from_name?: string
          from_email?: string
          admin_recipient_email?: string
          resend_api_key?: string | null
          notify_on_quote?: boolean
          notify_on_contact?: boolean
          auto_reply_to_customer?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          provider?: "custom_smtp" | "resend" | "gmail" | "sendgrid"
          smtp_host?: string
          smtp_port?: number
          smtp_encryption?: "TLS" | "SSL" | "None"
          smtp_user?: string | null
          smtp_pass?: string | null
          from_name?: string
          from_email?: string
          admin_recipient_email?: string
          resend_api_key?: string | null
          notify_on_quote?: boolean
          notify_on_contact?: boolean
          auto_reply_to_customer?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor"
      blog_status: "draft" | "published"
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
      app_role: ["admin", "editor"],
      blog_status: ["draft", "published"],
    },
  },
} as const
