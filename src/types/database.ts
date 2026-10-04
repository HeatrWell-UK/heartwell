// Generated from the staging database by Supabase (generate_typescript_types).
// Do not edit by hand: regenerate after every migration.

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
      admins: {
        Row: {
          claimed_at: string | null
          created_at: string
          email: string
          is_active: boolean
          name: string | null
          user_id: string | null
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          email: string
          is_active?: boolean
          name?: string | null
          user_id?: string | null
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          email?: string
          is_active?: boolean
          name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      attribution_actions: {
        Row: {
          action_type: string
          arrival_id: string | null
          created_at: string
          id: string
          is_test: boolean
          metadata: Json | null
          order_id: string | null
          page_url: string | null
          product_id: string | null
          session_id: string | null
          variant_id: string | null
          visitor_id: string | null
          whatsapp_reference: string | null
        }
        Insert: {
          action_type: string
          arrival_id?: string | null
          created_at?: string
          id?: string
          is_test?: boolean
          metadata?: Json | null
          order_id?: string | null
          page_url?: string | null
          product_id?: string | null
          session_id?: string | null
          variant_id?: string | null
          visitor_id?: string | null
          whatsapp_reference?: string | null
        }
        Update: {
          action_type?: string
          arrival_id?: string | null
          created_at?: string
          id?: string
          is_test?: boolean
          metadata?: Json | null
          order_id?: string | null
          page_url?: string | null
          product_id?: string | null
          session_id?: string | null
          variant_id?: string | null
          visitor_id?: string | null
          whatsapp_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attribution_actions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_actions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_actions_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      attribution_sessions: {
        Row: {
          arrival_id: string
          created_at: string
          fbclid: string | null
          first_touch_campaign: string | null
          first_touch_content: string | null
          first_touch_medium: string | null
          first_touch_source: string | null
          first_touch_term: string | null
          ga_client_id: string | null
          gbraid: string | null
          gclid: string | null
          id: string
          initial_product_id: string | null
          initial_variant_id: string | null
          is_test: boolean
          landing_page: string | null
          last_seen_at: string
          last_touch_campaign: string | null
          last_touch_content: string | null
          last_touch_medium: string | null
          last_touch_source: string | null
          last_touch_term: string | null
          meta_fbc: string | null
          meta_fbp: string | null
          referrer: string | null
          session_id: string
          visitor_id: string
          wbraid: string | null
        }
        Insert: {
          arrival_id: string
          created_at?: string
          fbclid?: string | null
          first_touch_campaign?: string | null
          first_touch_content?: string | null
          first_touch_medium?: string | null
          first_touch_source?: string | null
          first_touch_term?: string | null
          ga_client_id?: string | null
          gbraid?: string | null
          gclid?: string | null
          id?: string
          initial_product_id?: string | null
          initial_variant_id?: string | null
          is_test?: boolean
          landing_page?: string | null
          last_seen_at?: string
          last_touch_campaign?: string | null
          last_touch_content?: string | null
          last_touch_medium?: string | null
          last_touch_source?: string | null
          last_touch_term?: string | null
          meta_fbc?: string | null
          meta_fbp?: string | null
          referrer?: string | null
          session_id: string
          visitor_id: string
          wbraid?: string | null
        }
        Update: {
          arrival_id?: string
          created_at?: string
          fbclid?: string | null
          first_touch_campaign?: string | null
          first_touch_content?: string | null
          first_touch_medium?: string | null
          first_touch_source?: string | null
          first_touch_term?: string | null
          ga_client_id?: string | null
          gbraid?: string | null
          gclid?: string | null
          id?: string
          initial_product_id?: string | null
          initial_variant_id?: string | null
          is_test?: boolean
          landing_page?: string | null
          last_seen_at?: string
          last_touch_campaign?: string | null
          last_touch_content?: string | null
          last_touch_medium?: string | null
          last_touch_source?: string | null
          last_touch_term?: string | null
          meta_fbc?: string | null
          meta_fbp?: string | null
          referrer?: string | null
          session_id?: string
          visitor_id?: string
          wbraid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attribution_sessions_initial_product_id_fkey"
            columns: ["initial_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_sessions_initial_variant_id_fkey"
            columns: ["initial_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      basket_reminder_leads: {
        Row: {
          arrival_id: string
          basket: Json
          consent_at: string
          consent_copy_version: string
          converted_order_id: string | null
          created_at: string
          done_at: string | null
          email: string | null
          email_opt_in: boolean
          expires_at: string
          id: string
          is_test: boolean
          phone: string | null
          reminder_sent_at: string | null
          session_id: string
          status: string
          updated_at: string
          visitor_id: string
          whatsapp_opt_in: boolean
        }
        Insert: {
          arrival_id: string
          basket?: Json
          consent_at?: string
          consent_copy_version: string
          converted_order_id?: string | null
          created_at?: string
          done_at?: string | null
          email?: string | null
          email_opt_in?: boolean
          expires_at?: string
          id?: string
          is_test?: boolean
          phone?: string | null
          reminder_sent_at?: string | null
          session_id: string
          status?: string
          updated_at?: string
          visitor_id: string
          whatsapp_opt_in?: boolean
        }
        Update: {
          arrival_id?: string
          basket?: Json
          consent_at?: string
          consent_copy_version?: string
          converted_order_id?: string | null
          created_at?: string
          done_at?: string | null
          email?: string | null
          email_opt_in?: boolean
          expires_at?: string
          id?: string
          is_test?: boolean
          phone?: string | null
          reminder_sent_at?: string | null
          session_id?: string
          status?: string
          updated_at?: string
          visitor_id?: string
          whatsapp_opt_in?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "basket_reminder_leads_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_outbox: {
        Row: {
          attempts: number
          created_at: string
          error: Json | null
          event_id: string
          event_name: string
          id: string
          last_attempt_at: string | null
          lease_until: string | null
          order_id: string
          platform: string
          response: Json | null
          send_after: string
          sent_at: string | null
          skip_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: Json | null
          event_id: string
          event_name: string
          id?: string
          last_attempt_at?: string | null
          lease_until?: string | null
          order_id: string
          platform: string
          response?: Json | null
          send_after?: string
          sent_at?: string | null
          skip_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: Json | null
          event_id?: string
          event_name?: string
          id?: string
          last_attempt_at?: string | null
          lease_until?: string | null
          order_id?: string
          platform?: string
          response?: Json | null
          send_after?: string
          sent_at?: string | null
          skip_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversion_outbox_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          created_at: string
          error: string | null
          id: string
          intended_recipient: string | null
          kind: string
          order_id: string | null
          provider_message_id: string | null
          recipient: string
          status: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          intended_recipient?: string | null
          kind: string
          order_id?: string | null
          provider_message_id?: string | null
          recipient: string
          status: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          intended_recipient?: string | null
          kind?: string
          order_id?: string | null
          provider_message_id?: string | null
          recipient?: string
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      job_runs: {
        Row: {
          detail: Json | null
          error: string | null
          finished_at: string | null
          id: number
          job: string
          started_at: string
          status: string
        }
        Insert: {
          detail?: Json | null
          error?: string | null
          finished_at?: string | null
          id?: never
          job: string
          started_at?: string
          status?: string
        }
        Update: {
          detail?: Json | null
          error?: string | null
          finished_at?: string | null
          id?: never
          job?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      material_collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          kind: string
          name: string
          slug: string
          sort: number
          supplier: string | null
          supplier_handle: string | null
          surcharge: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name: string
          slug: string
          sort?: number
          supplier?: string | null
          supplier_handle?: string | null
          surcharge?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          slug?: string
          sort?: number
          supplier?: string | null
          supplier_handle?: string | null
          surcharge?: number
          updated_at?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          code: string
          collection_id: string
          created_at: string
          hex: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_swatchable: boolean
          name: string
          sort: number
          supplier_title: string | null
          updated_at: string
        }
        Insert: {
          code: string
          collection_id: string
          created_at?: string
          hex?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_swatchable?: boolean
          name: string
          sort?: number
          supplier_title?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          collection_id?: string
          created_at?: string
          hex?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_swatchable?: boolean
          name?: string
          sort?: number
          supplier_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "material_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          confirm_token: string
          confirmed_at: string | null
          consent_ip: string | null
          consent_user_agent: string | null
          created_at: string
          email: string
          id: string
          last_sent_at: string | null
          status: string
          subscribed_at: string
          unsubscribe_token: string
          unsubscribed_at: string | null
        }
        Insert: {
          confirm_token?: string
          confirmed_at?: string | null
          consent_ip?: string | null
          consent_user_agent?: string | null
          created_at?: string
          email: string
          id?: string
          last_sent_at?: string | null
          status?: string
          subscribed_at?: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
        }
        Update: {
          confirm_token?: string
          confirmed_at?: string | null
          consent_ip?: string | null
          consent_user_agent?: string | null
          created_at?: string
          email?: string
          id?: string
          last_sent_at?: string | null
          status?: string
          subscribed_at?: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      offer_codes: {
        Row: {
          code: string
          created_at: string
          is_active: boolean
          label: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          is_active?: boolean
          label?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          is_active?: boolean
          label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      offer_entitlements: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          qualifying_arrival_id: string | null
          revoked_at: string | null
          source: string
          started_at: string
          token: string
          updated_at: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          qualifying_arrival_id?: string | null
          revoked_at?: string | null
          source: string
          started_at?: string
          token?: string
          updated_at?: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          qualifying_arrival_id?: string | null
          revoked_at?: string | null
          source?: string
          started_at?: string
          token?: string
          updated_at?: string
          visitor_id?: string
        }
        Relationships: []
      }
      offer_product_tiers: {
        Row: {
          product_id: string
          tier: string
        }
        Insert: {
          product_id: string
          tier: string
        }
        Update: {
          product_id?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_product_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor: string | null
          at: string
          from_status: string | null
          id: number
          kind: string
          note: string | null
          order_id: string
          to_status: string | null
        }
        Insert: {
          actor?: string | null
          at?: string
          from_status?: string | null
          id?: never
          kind: string
          note?: string | null
          order_id: string
          to_status?: string | null
        }
        Update: {
          actor?: string | null
          at?: string
          from_status?: string | null
          id?: never
          kind?: string
          note?: string | null
          order_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          colour_name: string | null
          created_at: string
          custom_title: string | null
          customisation: Json | null
          id: string
          material_code: string | null
          material_collection: string | null
          material_id: string | null
          material_name: string | null
          order_id: string
          position: number
          product_id: string
          quantity: number
          sku: string
          title: string
          trade_title: string | null
          unit_price: number
          variant_id: string
        }
        Insert: {
          colour_name?: string | null
          created_at?: string
          custom_title?: string | null
          customisation?: Json | null
          id?: string
          material_code?: string | null
          material_collection?: string | null
          material_id?: string | null
          material_name?: string | null
          order_id: string
          position?: number
          product_id: string
          quantity: number
          sku: string
          title: string
          trade_title?: string | null
          unit_price: number
          variant_id: string
        }
        Update: {
          colour_name?: string | null
          created_at?: string
          custom_title?: string | null
          customisation?: Json | null
          id?: string
          material_code?: string | null
          material_collection?: string | null
          material_id?: string | null
          material_name?: string | null
          order_id?: string
          position?: number
          product_id?: string
          quantity?: number
          sku?: string
          title?: string
          trade_title?: string | null
          unit_price?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          arrival_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          customer_email: string | null
          customer_ip: string | null
          customer_name: string
          customer_phone: string
          customer_user_agent: string | null
          delivered_at: string | null
          delivery_floor: number
          delivery_has_lift: boolean
          delivery_total: number
          delivery_zone: string
          discount_amount: number
          discount_tier: string | null
          fbclid: string | null
          fee_assembly: number
          fee_removal: number
          fee_upstairs: number
          ga_client_id: string | null
          gbraid: string | null
          gclid: string | null
          has_made_to_order: boolean
          id: string
          is_test: boolean
          items_subtotal: number
          landing_page: string | null
          manual_acquisition_at: string | null
          manual_acquisition_note: string | null
          manual_acquisition_source: string | null
          meta_fbc: string | null
          meta_fbp: string | null
          offer_source: string | null
          order_number: number
          postcode: string
          preferred_delivery_date: string | null
          processing_at: string | null
          promotion_code: string | null
          purchase_event_id: string
          reference: string | null
          referrer: string | null
          removal_seats: number | null
          review_request_sent_at: string | null
          session_id: string | null
          shipped_at: string | null
          shipping_address: string
          source: string
          special_instructions: string | null
          status: string
          test_reason: string | null
          total_amount: number
          tracking_consent: string
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string | null
          wants_assembly: boolean
          wants_removal: boolean
          wbraid: string | null
          whatsapp_reference: string | null
        }
        Insert: {
          arrival_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          customer_email?: string | null
          customer_ip?: string | null
          customer_name: string
          customer_phone: string
          customer_user_agent?: string | null
          delivered_at?: string | null
          delivery_floor?: number
          delivery_has_lift?: boolean
          delivery_total?: number
          delivery_zone?: string
          discount_amount?: number
          discount_tier?: string | null
          fbclid?: string | null
          fee_assembly?: number
          fee_removal?: number
          fee_upstairs?: number
          ga_client_id?: string | null
          gbraid?: string | null
          gclid?: string | null
          has_made_to_order?: boolean
          id?: string
          is_test?: boolean
          items_subtotal?: number
          landing_page?: string | null
          manual_acquisition_at?: string | null
          manual_acquisition_note?: string | null
          manual_acquisition_source?: string | null
          meta_fbc?: string | null
          meta_fbp?: string | null
          offer_source?: string | null
          order_number?: number
          postcode: string
          preferred_delivery_date?: string | null
          processing_at?: string | null
          promotion_code?: string | null
          purchase_event_id?: string
          reference?: string | null
          referrer?: string | null
          removal_seats?: number | null
          review_request_sent_at?: string | null
          session_id?: string | null
          shipped_at?: string | null
          shipping_address: string
          source?: string
          special_instructions?: string | null
          status?: string
          test_reason?: string | null
          total_amount: number
          tracking_consent?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
          wants_assembly?: boolean
          wants_removal?: boolean
          wbraid?: string | null
          whatsapp_reference?: string | null
        }
        Update: {
          arrival_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          customer_email?: string | null
          customer_ip?: string | null
          customer_name?: string
          customer_phone?: string
          customer_user_agent?: string | null
          delivered_at?: string | null
          delivery_floor?: number
          delivery_has_lift?: boolean
          delivery_total?: number
          delivery_zone?: string
          discount_amount?: number
          discount_tier?: string | null
          fbclid?: string | null
          fee_assembly?: number
          fee_removal?: number
          fee_upstairs?: number
          ga_client_id?: string | null
          gbraid?: string | null
          gclid?: string | null
          has_made_to_order?: boolean
          id?: string
          is_test?: boolean
          items_subtotal?: number
          landing_page?: string | null
          manual_acquisition_at?: string | null
          manual_acquisition_note?: string | null
          manual_acquisition_source?: string | null
          meta_fbc?: string | null
          meta_fbp?: string | null
          offer_source?: string | null
          order_number?: number
          postcode?: string
          preferred_delivery_date?: string | null
          processing_at?: string | null
          promotion_code?: string | null
          purchase_event_id?: string
          reference?: string | null
          referrer?: string | null
          removal_seats?: number | null
          review_request_sent_at?: string | null
          session_id?: string | null
          shipped_at?: string | null
          shipping_address?: string
          source?: string
          special_instructions?: string | null
          status?: string
          test_reason?: string | null
          total_amount?: number
          tracking_consent?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
          wants_assembly?: boolean
          wants_removal?: boolean
          wbraid?: string | null
          whatsapp_reference?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          category_id: string
          product_id: string
        }
        Insert: {
          category_id: string
          product_id: string
        }
        Update: {
          category_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_types: {
        Row: {
          created_at: string
          filters: Json
          google_product_category: string | null
          id: string
          material_kinds: string[]
          meta_product_category: string | null
          name: string
          name_plural: string
          removal_unit: string
          size_guide: string | null
          slug: string
          sort: number
          spec_fields: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          google_product_category?: string | null
          id?: string
          material_kinds?: string[]
          meta_product_category?: string | null
          name: string
          name_plural: string
          removal_unit?: string
          size_guide?: string | null
          slug: string
          sort?: number
          spec_fields?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          filters?: Json
          google_product_category?: string | null
          id?: string
          material_kinds?: string[]
          meta_product_category?: string | null
          name?: string
          name_plural?: string
          removal_unit?: string
          size_guide?: string | null
          slug?: string
          sort?: number
          spec_fields?: Json
          updated_at?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          colour_hex: string | null
          colour_name: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          material_label: string | null
          price_adjustment: number
          product_id: string
          sku: string
          sort: number
          updated_at: string
        }
        Insert: {
          colour_hex?: string | null
          colour_name?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          material_label?: string | null
          price_adjustment?: number
          product_id: string
          sku: string
          sort?: number
          updated_at?: string
        }
        Update: {
          colour_hex?: string | null
          colour_name?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          material_label?: string | null
          price_adjustment?: number
          product_id?: string
          sku?: string
          sort?: number
          updated_at?: string
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
          average_rating: number
          axis1_value: string | null
          axis2_value: string | null
          base_price: number
          created_at: string
          depth_cm: number | null
          description: string | null
          dimensions_note: string | null
          gallery_images: string[]
          height_cm: number | null
          highlights: string[]
          id: string
          is_active: boolean
          is_featured: boolean
          made_to_order: boolean
          origin: string
          primary_category_id: string | null
          product_type_id: string
          range_id: string | null
          review_count: number
          seat_depth_cm: number | null
          seat_height_cm: number | null
          seo_description: string | null
          seo_title: string | null
          side_a_cm: number | null
          side_b_cm: number | null
          slug: string
          sort: number
          specifications: Json
          title: string
          trade_title: string | null
          updated_at: string
          width_cm: number | null
        }
        Insert: {
          average_rating?: number
          axis1_value?: string | null
          axis2_value?: string | null
          base_price: number
          created_at?: string
          depth_cm?: number | null
          description?: string | null
          dimensions_note?: string | null
          gallery_images?: string[]
          height_cm?: number | null
          highlights?: string[]
          id?: string
          is_active?: boolean
          is_featured?: boolean
          made_to_order?: boolean
          origin?: string
          primary_category_id?: string | null
          product_type_id: string
          range_id?: string | null
          review_count?: number
          seat_depth_cm?: number | null
          seat_height_cm?: number | null
          seo_description?: string | null
          seo_title?: string | null
          side_a_cm?: number | null
          side_b_cm?: number | null
          slug: string
          sort?: number
          specifications?: Json
          title: string
          trade_title?: string | null
          updated_at?: string
          width_cm?: number | null
        }
        Update: {
          average_rating?: number
          axis1_value?: string | null
          axis2_value?: string | null
          base_price?: number
          created_at?: string
          depth_cm?: number | null
          description?: string | null
          dimensions_note?: string | null
          gallery_images?: string[]
          height_cm?: number | null
          highlights?: string[]
          id?: string
          is_active?: boolean
          is_featured?: boolean
          made_to_order?: boolean
          origin?: string
          primary_category_id?: string | null
          product_type_id?: string
          range_id?: string | null
          review_count?: number
          seat_depth_cm?: number | null
          seat_height_cm?: number | null
          seo_description?: string | null
          seo_title?: string | null
          side_a_cm?: number | null
          side_b_cm?: number | null
          slug?: string
          sort?: number
          specifications?: Json
          title?: string
          trade_title?: string | null
          updated_at?: string
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_primary_category_id_fkey"
            columns: ["primary_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_product_type_id_fkey"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_range_id_fkey"
            columns: ["range_id"]
            isOneToOne: false
            referencedRelation: "ranges"
            referencedColumns: ["id"]
          },
        ]
      }
      ranges: {
        Row: {
          axis1_name: string
          axis2_name: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort: number
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          axis1_name?: string
          axis2_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort?: number
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          axis1_name?: string
          axis2_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort?: number
          trade_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          approved_at: string | null
          comment: string | null
          created_at: string
          customer_name: string
          id: string
          image_url: string | null
          is_approved: boolean
          order_id: string | null
          product_id: string | null
          rating: number
          title: string | null
        }
        Insert: {
          approved_at?: string | null
          comment?: string | null
          created_at?: string
          customer_name: string
          id?: string
          image_url?: string | null
          is_approved?: boolean
          order_id?: string | null
          product_id?: string | null
          rating: number
          title?: string | null
        }
        Update: {
          approved_at?: string | null
          comment?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          image_url?: string | null
          is_approved?: boolean
          order_id?: string | null
          product_id?: string | null
          rating?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_request_items: {
        Row: {
          id: string
          material_code: string
          material_collection: string
          material_id: string | null
          material_name: string
          request_id: string
        }
        Insert: {
          id?: string
          material_code: string
          material_collection: string
          material_id?: string | null
          material_name: string
          request_id: string
        }
        Update: {
          id?: string
          material_code?: string
          material_collection?: string
          material_id?: string | null
          material_name?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sample_request_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "sample_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_requests: {
        Row: {
          created_at: string
          customer_email: string
          customer_ip: string | null
          customer_name: string
          customer_phone: string | null
          customer_user_agent: string | null
          id: string
          is_test: boolean
          postcode: string
          posted_at: string | null
          session_id: string | null
          shipping_address: string
          status: string
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_ip?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_user_agent?: string | null
          id?: string
          is_test?: boolean
          postcode: string
          posted_at?: string | null
          session_id?: string | null
          shipping_address: string
          status?: string
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_ip?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_user_agent?: string | null
          id?: string
          is_test?: boolean
          postcode?: string
          posted_at?: string | null
          session_id?: string | null
          shipping_address?: string
          status?: string
          visitor_id?: string | null
        }
        Relationships: []
      }
      shop_settings: {
        Row: {
          assembly_fee: number
          delivery_max_working_days: number
          delivery_min_working_days: number
          id: boolean
          max_floor: number
          offer_tier_high: number
          offer_tier_mid: number
          offer_tier_standard: number
          orderflow_enabled: boolean
          paid_offer_days: number
          preferred_date_max_days: number
          preferred_date_min_days: number
          removal_default_seats: number
          removal_max_seats: number
          removal_min_seats: number
          removal_per_seat: number
          sample_limit: number
          updated_at: string
          upstairs_first_floor: number
          upstairs_per_extra_floor: number
        }
        Insert: {
          assembly_fee?: number
          delivery_max_working_days?: number
          delivery_min_working_days?: number
          id?: boolean
          max_floor?: number
          offer_tier_high?: number
          offer_tier_mid?: number
          offer_tier_standard?: number
          orderflow_enabled?: boolean
          paid_offer_days?: number
          preferred_date_max_days?: number
          preferred_date_min_days?: number
          removal_default_seats?: number
          removal_max_seats?: number
          removal_min_seats?: number
          removal_per_seat?: number
          sample_limit?: number
          updated_at?: string
          upstairs_first_floor?: number
          upstairs_per_extra_floor?: number
        }
        Update: {
          assembly_fee?: number
          delivery_max_working_days?: number
          delivery_min_working_days?: number
          id?: boolean
          max_floor?: number
          offer_tier_high?: number
          offer_tier_mid?: number
          offer_tier_standard?: number
          orderflow_enabled?: boolean
          paid_offer_days?: number
          preferred_date_max_days?: number
          preferred_date_min_days?: number
          removal_default_seats?: number
          removal_max_seats?: number
          removal_min_seats?: number
          removal_per_seat?: number
          sample_limit?: number
          updated_at?: string
          upstairs_first_floor?: number
          upstairs_per_extra_floor?: number
        }
        Relationships: []
      }
      videos: {
        Row: {
          caption: string | null
          created_at: string
          duration: number | null
          height: number | null
          id: string
          is_active: boolean
          kind: string
          product_id: string | null
          public_id: string
          sort: number
          url: string
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          duration?: number | null
          height?: number | null
          id?: string
          is_active?: boolean
          kind: string
          product_id?: string | null
          public_id: string
          sort?: number
          url: string
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          duration?: number | null
          height?: number | null
          id?: string
          is_active?: boolean
          kind?: string
          product_id?: string | null
          public_id?: string
          sort?: number
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_enquiries: {
        Row: {
          arrival_id: string | null
          converted_at: string | null
          converted_order_id: string | null
          created_at: string
          fbclid: string | null
          ga_client_id: string | null
          gbraid: string | null
          gclid: string | null
          id: string
          is_test: boolean
          meta_fbc: string | null
          meta_fbp: string | null
          page_context: string | null
          page_url: string | null
          product_id: string | null
          product_name: string | null
          reference: string
          session_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          variant_id: string | null
          visitor_id: string | null
          wbraid: string | null
        }
        Insert: {
          arrival_id?: string | null
          converted_at?: string | null
          converted_order_id?: string | null
          created_at?: string
          fbclid?: string | null
          ga_client_id?: string | null
          gbraid?: string | null
          gclid?: string | null
          id?: string
          is_test?: boolean
          meta_fbc?: string | null
          meta_fbp?: string | null
          page_context?: string | null
          page_url?: string | null
          product_id?: string | null
          product_name?: string | null
          reference?: string
          session_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          variant_id?: string | null
          visitor_id?: string | null
          wbraid?: string | null
        }
        Update: {
          arrival_id?: string | null
          converted_at?: string | null
          converted_order_id?: string | null
          created_at?: string
          fbclid?: string | null
          ga_client_id?: string | null
          gbraid?: string | null
          gclid?: string | null
          id?: string
          is_test?: boolean
          meta_fbc?: string | null
          meta_fbp?: string | null
          page_context?: string | null
          page_url?: string | null
          product_id?: string | null
          product_name?: string | null
          reference?: string
          session_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          variant_id?: string | null
          visitor_id?: string | null
          wbraid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_enquiries_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_enquiries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_enquiries_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_status: { Args: never; Returns: Json }
      calculate_order_offer: {
        Args: {
          p_items: Json
          p_offer_entitlement_token?: string
          p_promotion_code?: string
        }
        Returns: Json
      }
      claim_admin: { Args: never; Returns: boolean }
      classify_postcode: {
        Args: { p_mixed_area_evidence?: string; p_postcode: string }
        Returns: Json
      }
      clean_text: { Args: { p_max: number; p_text: string }; Returns: string }
      confirm_order: { Args: { p_order_id: string }; Returns: Json }
      create_whatsapp_enquiry: { Args: { p_input: Json }; Returns: Json }
      health_ping: { Args: never; Returns: Json }
      import_catalogue: { Args: { p: Json; p_update?: boolean }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      issue_paid_offer_entitlement: {
        Args: { p_arrival_id?: string; p_source: string; p_visitor_id: string }
        Returns: Json
      }
      newsletter_confirm: { Args: { p_token: string }; Returns: Json }
      newsletter_subscribe: {
        Args: { p_email: string; p_ip?: string; p_user_agent?: string }
        Returns: Json
      }
      newsletter_unsubscribe: { Args: { p_token: string }; Returns: Json }
      normalise_postcode: { Args: { p_raw: string }; Returns: string }
      order_for_confirmation: { Args: { p_order_id: string }; Returns: Json }
      order_lines: {
        Args: { p_allow_inactive?: boolean; p_items: Json; p_staff?: boolean }
        Returns: {
          catalogue_price: number
          colour_name: string
          custom_title: string
          customisation: Json
          item_id: string
          line_no: number
          made_to_order: boolean
          material_code: string
          material_collection: string
          material_id: string
          material_name: string
          product_id: string
          quantity: number
          sets_custom_title: boolean
          sku: string
          title: string
          trade_title: string
          unit_price: number
          variant_id: string
        }[]
      }
      order_status_allowed: {
        Args: { p_from: string; p_to: string }
        Returns: boolean
      }
      place_manual_order: { Args: { p_input: Json }; Returns: Json }
      place_order: { Args: { p_input: Json }; Returns: Json }
      postcode_from_text: { Args: { p_text: string }; Returns: string }
      price_order: { Args: { p_input: Json }; Returns: Json }
      quote_delivery: {
        Args: {
          p_assembly?: boolean
          p_floor?: number
          p_has_lift?: boolean
          p_removal?: boolean
          p_removal_seats?: number
        }
        Returns: Json
      }
      random_code: { Args: { p_length: number }; Returns: string }
      refresh_product_review_stats: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      request_samples: { Args: { p_input: Json }; Returns: Json }
      require_admin: { Args: never; Returns: undefined }
      run_daily_cleanup: { Args: never; Returns: Json }
      set_order_status: {
        Args: { p_order_id: string; p_reason?: string; p_status: string }
        Returns: Json
      }
      set_order_test: {
        Args: { p_is_test: boolean; p_order_id: string; p_reason?: string }
        Returns: undefined
      }
      track_order: {
        Args: { p_postcode: string; p_reference: string }
        Returns: Json
      }
      try_uuid: { Args: { p_text: string }; Returns: string }
      update_order_details: {
        Args: { p_input: Json; p_order_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
