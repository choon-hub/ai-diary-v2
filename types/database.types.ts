export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      diaries: {
        Row: {
          id: string
          user_key: string
          content: string
          ai_summary: string | null
          ai_emotion: string | null
          ai_next_action: string | null
          ai_tags: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          user_key: string
          content: string
          ai_summary?: string | null
          ai_emotion?: string | null
          ai_next_action?: string | null
          ai_tags?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          user_key?: string
          content?: string
          ai_summary?: string | null
          ai_emotion?: string | null
          ai_next_action?: string | null
          ai_tags?: string[] | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
