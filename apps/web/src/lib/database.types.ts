
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "public": {
          Tables: {
            "bookmarks": {
                  Row: {
                    "created_at": string,"user_id": string,"website_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_id": string,"website_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string,"website_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookmarks_website_id_fkey"
      columns: ["website_id"]
isOneToOne: false
      referencedRelation: "websites"
      referencedColumns: ["id"]
    }
                  ]
                },"bump_history": {
                  Row: {
                    "discovered_at": string,"id": string,"request_id": string,"source": string,"user_id": string,"website_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "discovered_at"?: string,"id"?: string,"request_id": string,"source": string,"user_id": string,"website_id": string
                  }
                  Update: {
                    "discovered_at"?: string,"id"?: string,"request_id"?: string,"source"?: string,"user_id"?: string,"website_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bump_history_website_id_fkey"
      columns: ["website_id"]
isOneToOne: false
      referencedRelation: "websites"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "active": boolean,"created_at": string,"description": string,"display_name": string,"display_order": number,"id": string,"slug": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"description": string,"display_name": string,"display_order"?: number,"id"?: string,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"description"?: string,"display_name"?: string,"display_order"?: number,"id"?: string,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"created_at": string,"id": string,"updated_at": string,"username": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"created_at"?: string,"id": string,"updated_at"?: string,"username"?: string | null
                  }
                  Update: {
                    "avatar_path"?: string | null,"created_at"?: string,"id"?: string,"updated_at"?: string,"username"?: string | null
                  }
                  Relationships: [

                  ]
                },"user_interests": {
                  Row: {
                    "category_id": string,"created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"created_at"?: string,"user_id": string
                  }
                  Update: {
                    "category_id"?: string,"created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_interests_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"website_categories": {
                  Row: {
                    "category_id": string,"website_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"website_id": string
                  }
                  Update: {
                    "category_id"?: string,"website_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "website_categories_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "website_categories_website_id_fkey"
      columns: ["website_id"]
isOneToOne: false
      referencedRelation: "websites"
      referencedColumns: ["id"]
    }
                  ]
                },"website_reactions": {
                  Row: {
                    "created_at": string,"reaction": string,"reason": string | null,"updated_at": string,"user_id": string,"website_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"reaction": string,"reason"?: string | null,"updated_at"?: string,"user_id": string,"website_id": string
                  }
                  Update: {
                    "created_at"?: string,"reaction"?: string,"reason"?: string | null,"updated_at"?: string,"user_id"?: string,"website_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "website_reactions_website_id_fkey"
      columns: ["website_id"]
isOneToOne: false
      referencedRelation: "websites"
      referencedColumns: ["id"]
    }
                  ]
                },"website_submissions": {
                  Row: {
                    "description": string | null,"id": string,"normalised_url": string,"raw_url": string,"request_id": string,"resolved_website_id": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": string,"submitted_at": string,"submitter_id": string | null,"suggested_categories": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"id"?: string,"normalised_url": string,"raw_url": string,"request_id"?: string,"resolved_website_id"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"submitted_at"?: string,"submitter_id"?: string | null,"suggested_categories"?: (string)[]
                  }
                  Update: {
                    "description"?: string | null,"id"?: string,"normalised_url"?: string,"raw_url"?: string,"request_id"?: string,"resolved_website_id"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"submitted_at"?: string,"submitter_id"?: string | null,"suggested_categories"?: (string)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "website_submissions_resolved_website_id_fkey"
      columns: ["resolved_website_id"]
isOneToOne: false
      referencedRelation: "websites"
      referencedColumns: ["id"]
    }
                  ]
                },"websites": {
                  Row: {
                    "active": boolean,"approval_status": string,"approved_at": string | null,"description": string,"embedding_status": string,"id": string,"last_validated_at": string | null,"normalised_url": string,"original_url": string,"submitted_at": string,"thumbnail_path": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"approval_status"?: string,"approved_at"?: string | null,"description": string,"embedding_status"?: string,"id"?: string,"last_validated_at"?: string | null,"normalised_url": string,"original_url": string,"submitted_at"?: string,"thumbnail_path"?: string | null,"title": string
                  }
                  Update: {
                    "active"?: boolean,"approval_status"?: string,"approved_at"?: string | null,"description"?: string,"embedding_status"?: string,"id"?: string,"last_validated_at"?: string | null,"normalised_url"?: string,"original_url"?: string,"submitted_at"?: string,"thumbnail_path"?: string | null,"title"?: string
                  }
                  Relationships: [

                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_catalogue_list":
{ Args: { "p_actor_id": string,"p_search"?: string }; Returns: Json
                           },
"admin_catalogue_page":
{ Args: { "p_actor_id": string,"p_after_id"?: string,"p_after_title"?: string,"p_search"?: string }; Returns: Json
                           },
"admin_category_list":
{ Args: { "p_actor_id": string }; Returns: Json
                           },
"admin_recheck_queue":
{ Args: { "p_actor_id": string }; Returns: Json
                           },
"admin_report_queue":
{ Args: { "p_actor_id": string }; Returns: Json
                           },
"admin_submission_queue":
{ Args: { "p_actor_id": string }; Returns: Json
                           },
"catalogue_admin":
{ Args: { "p_actor_id": string }; Returns: boolean
                           },
"complete_recheck":
{ Args: { "p_actor_id": string,"p_checked_url": string,"p_note": string,"p_outcome": string,"p_website_id": string }; Returns: string
                           },
"delete_website_permanently":
{ Args: { "p_actor_id": string,"p_confirm_title": string,"p_website_id": string }; Returns: Json
                           },
"manage_category":
{ Args: { "p_active": boolean,"p_actor_id": string,"p_category_id": string,"p_description": string,"p_display_order": number,"p_name": string,"p_slug": string }; Returns: string
                           },
"manage_website":
{ Args: { "p_active": boolean,"p_actor_id": string,"p_category_ids": (string)[],"p_description": string,"p_embedding_status": string,"p_note": string,"p_thumbnail_path": string,"p_title": string,"p_website_id": string }; Returns: string
                           },
"review_reports":
{ Args: { "p_actor_id": string,"p_note": string,"p_website_id": string }; Returns: string
                           },
"review_submission":
{ Args: { "p_actor_id": string,"p_category_ids": (string)[],"p_decision": string,"p_description": string,"p_note": string,"p_submission_id": string,"p_title": string }; Returns: {
              "review_status": string,"website_id": string
            }[]
                           },
"submit_website_intake":
{ Args: { "p_description": string,"p_normalised_url": string,"p_raw_url": string,"p_request_id": string,"p_submitter_id": string,"p_suggested_categories": (string)[] }; Returns: {
              "result": string,"submission_id": string
            }[]
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {

          }
        }
} as const
