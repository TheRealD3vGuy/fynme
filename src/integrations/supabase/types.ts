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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          summary: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          summary?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          summary?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          name: string
          position: number
          seo_description: string | null
          seo_title: string | null
          slug: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          name: string
          position?: number
          seo_description?: string | null
          seo_title?: string | null
          slug: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          name?: string
          position?: number
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
        }
        Relationships: []
      }
      contact_notes: {
        Row: {
          author_id: string | null
          created_at: string
          id: string
          note: string
          submission_id: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: string
          note: string
          submission_id: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: string
          note?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "contact_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          email: string
          id: string
          message: string
          name: string
          order_number: string | null
          status: string
          subject: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          order_number?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          order_number?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          city: string
          country: string
          id: string
          is_default: boolean
          label: string | null
          line1: string
          line2: string | null
          postal: string
          state: string | null
          user_id: string
        }
        Insert: {
          city: string
          country?: string
          id?: string
          is_default?: boolean
          label?: string | null
          line1: string
          line2?: string | null
          postal: string
          state?: string | null
          user_id: string
        }
        Update: {
          city?: string
          country?: string
          id?: string
          is_default?: boolean
          label?: string | null
          line1?: string
          line2?: string | null
          postal?: string
          state?: string | null
          user_id?: string
        }
        Relationships: []
      }
      discounts: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          min_order_cents: number | null
          starts_at: string | null
          times_used: number
          type: string
          usage_limit: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_order_cents?: number | null
          starts_at?: string | null
          times_used?: number
          type: string
          usage_limit?: number | null
          value?: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_order_cents?: number | null
          starts_at?: string | null
          times_used?: number
          type?: string
          usage_limit?: number | null
          value?: number
        }
        Relationships: []
      }
      inventory_adjustments: {
        Row: {
          created_at: string
          created_by: string | null
          delta: number
          id: string
          note: string | null
          reason: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delta: number
          id?: string
          note?: string | null
          reason?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delta?: number
          id?: string
          note?: string | null
          reason?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt: string | null
          created_at: string
          created_by: string | null
          file_size: number | null
          folder: string | null
          height: number | null
          id: string
          name: string
          url: string
          width: number | null
        }
        Insert: {
          alt?: string | null
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          folder?: string | null
          height?: number | null
          id?: string
          name: string
          url: string
          width?: number | null
        }
        Update: {
          alt?: string | null
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          folder?: string | null
          height?: number | null
          id?: string
          name?: string
          url?: string
          width?: number | null
        }
        Relationships: []
      }
      navigation_items: {
        Row: {
          href: string
          id: string
          is_visible: boolean
          label: string
          location: string
          position: number
        }
        Insert: {
          href: string
          id?: string
          is_visible?: boolean
          label: string
          location: string
          position?: number
        }
        Update: {
          href?: string
          id?: string
          is_visible?: boolean
          label?: string
          location?: string
          position?: number
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          consented_at: string
          email: string
          id: string
          unsubscribed_at: string | null
        }
        Insert: {
          consented_at?: string
          email: string
          id?: string
          unsubscribed_at?: string | null
        }
        Update: {
          consented_at?: string
          email?: string
          id?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          name: string
          order_id: string
          product_id: string | null
          quantity: number
          unit_price_cents: number
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          id?: string
          name: string
          order_id: string
          product_id?: string | null
          quantity?: number
          unit_price_cents: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          id?: string
          name?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          unit_price_cents?: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          discount_cents: number
          email: string
          fulfillment_status: string
          id: string
          internal_notes: string | null
          order_number: string
          payment_status: string
          shipping_address: Json | null
          shipping_cents: number
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          tracking_number: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          discount_cents?: number
          email: string
          fulfillment_status?: string
          id?: string
          internal_notes?: string | null
          order_number: string
          payment_status?: string
          shipping_address?: Json | null
          shipping_cents?: number
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          tracking_number?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          discount_cents?: number
          email?: string
          fulfillment_status?: string
          id?: string
          internal_notes?: string | null
          order_number?: string
          payment_status?: string
          shipping_address?: Json | null
          shipping_cents?: number
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          tracking_number?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      page_sections: {
        Row: {
          content: Json
          id: string
          is_visible: boolean
          page_id: string
          position: number
          type: string
        }
        Insert: {
          content?: Json
          id?: string
          is_visible?: boolean
          page_id: string
          position?: number
          type: string
        }
        Update: {
          content?: Json
          id?: string
          is_visible?: boolean
          page_id?: string
          position?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          id: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          id?: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          id?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt: string | null
          id: string
          position: number
          product_id: string
          url: string
        }
        Insert: {
          alt?: string | null
          id?: string
          position?: number
          product_id: string
          url: string
        }
        Update: {
          alt?: string | null
          id?: string
          position?: number
          product_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          id: string
          name: string
          options: Json
          position: number
          price_cents: number | null
          product_id: string
          sku: string | null
          stock: number
        }
        Insert: {
          id?: string
          name: string
          options?: Json
          position?: number
          price_cents?: number | null
          product_id: string
          sku?: string | null
          stock?: number
        }
        Update: {
          id?: string
          name?: string
          options?: Json
          position?: number
          price_cents?: number | null
          product_id?: string
          sku?: string | null
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          collection_id: string | null
          compare_at_price_cents: number | null
          created_at: string
          description: string | null
          id: string
          is_featured: boolean
          is_new: boolean
          is_published: boolean
          name: string
          price_cents: number
          seo_description: string | null
          seo_title: string | null
          sku: string | null
          slug: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          collection_id?: string | null
          compare_at_price_cents?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          is_new?: boolean
          is_published?: boolean
          name: string
          price_cents?: number
          seo_description?: string | null
          seo_title?: string | null
          sku?: string | null
          slug: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          collection_id?: string | null
          compare_at_price_cents?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          is_new?: boolean
          is_published?: boolean
          name?: string
          price_cents?: number
          seo_description?: string | null
          seo_title?: string | null
          sku?: string | null
          slug?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      staff_invitations: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      is_staff: { Args: { _user_id?: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "owner"
        | "administrator"
        | "editor"
        | "store_manager"
        | "support"
        | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "owner",
        "administrator",
        "editor",
        "store_manager",
        "support",
        "viewer",
      ],
    },
  },
} as const
