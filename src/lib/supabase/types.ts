export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CartColor =
  | "warm-pink"
  | "pink"
  | "cool-pink"
  | "red"
  | "yellow"
  | "green"
  | "mint"
  | "purple"
  | "grey";

export type ItemCategory =
  | "cafe-snack"
  | "daily-supplies"
  | "etc"
  | "food"
  | "gift"
  | "health"
  | "hobby-leisure"
  | "self-development"
  | "shopping";

export type ItemReason =
  | "discount"
  | "gift-purpose"
  | "hobby-fandom"
  | "hungry"
  | "necessary"
  | "no-reason"
  | "other"
  | "planned"
  | "refresh";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          email: string | null;
          id: string;
          terms_agreed_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id: string;
          terms_agreed_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          terms_agreed_at?: string | null;
        };
        Relationships: [];
      };
      items: {
        Row: {
          cart_color: CartColor;
          category: ItemCategory | null;
          created_at: string;
          date: string;
          id: string;
          original_image_url: string | null;
          price: number;
          purchase_time: string | null;
          reason: ItemReason | null;
          removed_bg_image_url: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cart_color?: CartColor;
          category?: ItemCategory | null;
          created_at?: string;
          date: string;
          id?: string;
          original_image_url?: string | null;
          price: number;
          purchase_time?: string | null;
          reason?: ItemReason | null;
          removed_bg_image_url?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cart_color?: CartColor;
          category?: ItemCategory | null;
          created_at?: string;
          date?: string;
          id?: string;
          original_image_url?: string | null;
          price?: number;
          purchase_time?: string | null;
          reason?: ItemReason | null;
          removed_bg_image_url?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "items_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      no_spend_days: {
        Row: {
          created_at: string;
          date: string;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          date: string;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "no_spend_days_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Profile = Tables<"profiles">;
export type ProfileInsert = TablesInsert<"profiles">;
export type ProfileUpdate = TablesUpdate<"profiles">;

export type Item = Tables<"items">;
export type ItemInsert = TablesInsert<"items">;
export type ItemUpdate = TablesUpdate<"items">;

export type NoSpendDay = Tables<"no_spend_days">;
export type NoSpendDayInsert = TablesInsert<"no_spend_days">;
export type NoSpendDayUpdate = TablesUpdate<"no_spend_days">;
