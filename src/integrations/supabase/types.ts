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
      contracts: {
        Row: {
          created_at: string
          fechado: boolean
          fechado_em: string | null
          harvest_id: string
          id: string
          producer_id: string
          updated_at: string
          user_id: string
          valor_por_saco: number
        }
        Insert: {
          created_at?: string
          fechado?: boolean
          fechado_em?: string | null
          harvest_id: string
          id?: string
          producer_id: string
          updated_at?: string
          user_id: string
          valor_por_saco: number
        }
        Update: {
          created_at?: string
          fechado?: boolean
          fechado_em?: string | null
          harvest_id?: string
          id?: string
          producer_id?: string
          updated_at?: string
          user_id?: string
          valor_por_saco?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_harvest_id_fkey"
            columns: ["harvest_id"]
            isOneToOne: false
            referencedRelation: "harvests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          contract_id: string | null
          created_at: string
          data: string
          descricao: string | null
          harvest_id: string | null
          id: string
          tipo: string
          trip_id: string | null
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          data: string
          descricao?: string | null
          harvest_id?: string | null
          id?: string
          tipo: string
          trip_id?: string | null
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          harvest_id?: string | null
          id?: string
          tipo?: string
          trip_id?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenses_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_harvest_id_fkey"
            columns: ["harvest_id"]
            isOneToOne: false
            referencedRelation: "harvests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      harvests: {
        Row: {
          ano: number
          created_at: string
          fechada: boolean
          fechada_em: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ano: number
          created_at?: string
          fechada?: boolean
          fechada_em?: string | null
          id?: string
          nome: string
          tipo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ano?: number
          created_at?: string
          fechada?: boolean
          fechada_em?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      phone_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed: boolean
          created_at: string
          expires_at: string
          id: string
          telefone: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed?: boolean
          created_at?: string
          expires_at: string
          id?: string
          telefone: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          telefone?: string
        }
        Relationships: []
      }
      producers: {
        Row: {
          created_at: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          nome: string | null
          recovery_code: string | null
          telefone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          recovery_code?: string | null
          telefone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          recovery_code?: string | null
          telefone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recovery_attempts: {
        Row: {
          cpf: string
          created_at: string
          id: string
          ip: string | null
          reason: string | null
          success: boolean
        }
        Insert: {
          cpf: string
          created_at?: string
          id?: string
          ip?: string | null
          reason?: string | null
          success?: boolean
        }
        Update: {
          cpf?: string
          created_at?: string
          id?: string
          ip?: string | null
          reason?: string | null
          success?: boolean
        }
        Relationships: []
      }
      trips: {
        Row: {
          contract_id: string | null
          created_at: string
          data: string
          destino: string | null
          id: string
          kind: string
          numero_nota: string | null
          observacao: string | null
          origem: string | null
          peso_kg: number | null
          peso_toneladas: number | null
          sacos: number | null
          transportadora: string | null
          truck_id: string | null
          updated_at: string
          user_id: string
          valor_por_saco_override: number | null
          valor_por_tonelada: number | null
          valor_total: number
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          data: string
          destino?: string | null
          id?: string
          kind: string
          numero_nota?: string | null
          observacao?: string | null
          origem?: string | null
          peso_kg?: number | null
          peso_toneladas?: number | null
          sacos?: number | null
          transportadora?: string | null
          truck_id?: string | null
          updated_at?: string
          user_id: string
          valor_por_saco_override?: number | null
          valor_por_tonelada?: number | null
          valor_total?: number
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          data?: string
          destino?: string | null
          id?: string
          kind?: string
          numero_nota?: string | null
          observacao?: string | null
          origem?: string | null
          peso_kg?: number | null
          peso_toneladas?: number | null
          sacos?: number | null
          transportadora?: string | null
          truck_id?: string | null
          updated_at?: string
          user_id?: string
          valor_por_saco_override?: number | null
          valor_por_tonelada?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "trips_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      trucks: {
        Row: {
          created_at: string
          id: string
          modelo: string | null
          placa: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          modelo?: string | null
          placa: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          modelo?: string | null
          placa?: string
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
