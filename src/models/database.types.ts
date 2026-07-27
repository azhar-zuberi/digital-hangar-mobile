export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      _health_check: {
        Row: {
          checked_at: string;
          id: string;
          label: string;
        };
        Insert: {
          checked_at?: string;
          id?: string;
          label: string;
        };
        Update: {
          checked_at?: string;
          id?: string;
          label?: string;
        };
        Relationships: [];
      };
      aircraft: {
        Row: {
          created_at: string;
          engine_information: string | null;
          home_airport: string | null;
          id: string;
          manufacturer: string;
          model: string;
          nickname: string | null;
          primary_photo_url: string | null;
          registration: string;
          serial_number: string | null;
          updated_at: string;
          visibility: string;
          year: number | null;
        };
        Insert: {
          created_at?: string;
          engine_information?: string | null;
          home_airport?: string | null;
          id?: string;
          manufacturer: string;
          model: string;
          nickname?: string | null;
          primary_photo_url?: string | null;
          registration: string;
          serial_number?: string | null;
          updated_at?: string;
          visibility?: string;
          year?: number | null;
        };
        Update: {
          created_at?: string;
          engine_information?: string | null;
          home_airport?: string | null;
          id?: string;
          manufacturer?: string;
          model?: string;
          nickname?: string | null;
          primary_photo_url?: string | null;
          registration?: string;
          serial_number?: string | null;
          updated_at?: string;
          visibility?: string;
          year?: number | null;
        };
        Relationships: [];
      };
      aircraft_memberships: {
        Row: {
          aircraft_id: string;
          created_at: string;
          id: string;
          relationship: string;
          user_id: string;
          verified: boolean;
        };
        Insert: {
          aircraft_id: string;
          created_at?: string;
          id?: string;
          relationship: string;
          user_id: string;
          verified?: boolean;
        };
        Update: {
          aircraft_id?: string;
          created_at?: string;
          id?: string;
          relationship?: string;
          user_id?: string;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'aircraft_memberships_aircraft_id_fkey';
            columns: ['aircraft_id'];
            isOneToOne: false;
            referencedRelation: 'aircraft';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'aircraft_memberships_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'aircraft_memberships_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      communities: {
        Row: {
          created_at: string;
          id: string;
          manufacturer: string;
          model: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          manufacturer: string;
          model: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          manufacturer?: string;
          model?: string;
          name?: string;
        };
        Relationships: [];
      };
      timeline_entries: {
        Row: {
          aircraft_id: string;
          created_at: string;
          created_by: string;
          description: string | null;
          event_date: string;
          id: string;
          title: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          aircraft_id: string;
          created_at?: string;
          created_by: string;
          description?: string | null;
          event_date: string;
          id?: string;
          title: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          aircraft_id?: string;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          event_date?: string;
          id?: string;
          title?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'timeline_entries_aircraft_id_fkey';
            columns: ['aircraft_id'];
            isOneToOne: false;
            referencedRelation: 'aircraft';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'timeline_entries_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'timeline_entries_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      timeline_photos: {
        Row: {
          created_at: string;
          id: string;
          storage_path: string;
          timeline_entry_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          storage_path: string;
          timeline_entry_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          storage_path?: string;
          timeline_entry_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'timeline_photos_timeline_entry_id_fkey';
            columns: ['timeline_entry_id'];
            isOneToOne: false;
            referencedRelation: 'timeline_entries';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          profile_photo_url: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          id: string;
          profile_photo_url?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          profile_photo_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      public_profiles: {
        Row: {
          display_name: string | null;
          id: string | null;
          profile_photo_url: string | null;
        };
        Insert: {
          display_name?: string | null;
          id?: string | null;
          profile_photo_url?: string | null;
        };
        Update: {
          display_name?: string | null;
          id?: string | null;
          profile_photo_url?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      aircraft_has_no_members: {
        Args: { target_aircraft_id: string };
        Returns: boolean;
      };
      can_view_aircraft: {
        Args: { target_aircraft_id: string };
        Returns: boolean;
      };
      create_aircraft_with_owner: {
        Args: {
          p_engine_information?: string;
          p_home_airport?: string;
          p_manufacturer: string;
          p_model: string;
          p_nickname?: string;
          p_primary_photo_url?: string;
          p_registration: string;
          p_serial_number?: string;
          p_year?: number;
        };
        Returns: {
          created_at: string;
          engine_information: string | null;
          home_airport: string | null;
          id: string;
          manufacturer: string;
          model: string;
          nickname: string | null;
          primary_photo_url: string | null;
          registration: string;
          serial_number: string | null;
          updated_at: string;
          visibility: string;
          year: number | null;
        };
        SetofOptions: {
          from: '*';
          to: 'aircraft';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      is_aircraft_member: {
        Args: { target_aircraft_id: string };
        Returns: boolean;
      };
      is_verified_owner: {
        Args: { target_aircraft_id: string };
        Returns: boolean;
      };
      storage_first_path_uuid: {
        Args: { object_name: string };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
