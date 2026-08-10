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
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      AccessProfile: {
        Row: {
          createdat: string;
          description: string | null;
          id: string;
          name: string;
          organizationid: string | null;
          permissions: Json;
          updatedat: string;
        };
        Insert: {
          createdat?: string;
          description?: string | null;
          id: string;
          name: string;
          organizationid?: string | null;
          permissions?: Json;
          updatedat?: string;
        };
        Update: {
          createdat?: string;
          description?: string | null;
          id?: string;
          name?: string;
          organizationid?: string | null;
          permissions?: Json;
          updatedat?: string;
        };
        Relationships: [];
      };
      agent_channels: {
        Row: {
          agent_id: string;
          can_apply_tags: boolean;
          can_create_lead: boolean;
          can_read: boolean;
          can_reply: boolean;
          can_suggest: boolean;
          can_transfer: boolean;
          channel_type: string;
          created_at: string;
          id: string;
          instance_id: string | null;
          is_primary: boolean;
          status: string;
          tenant_id: string;
        };
        Insert: {
          agent_id: string;
          can_apply_tags?: boolean;
          can_create_lead?: boolean;
          can_read?: boolean;
          can_reply?: boolean;
          can_suggest?: boolean;
          can_transfer?: boolean;
          channel_type: string;
          created_at?: string;
          id?: string;
          instance_id?: string | null;
          is_primary?: boolean;
          status?: string;
          tenant_id: string;
        };
        Update: {
          agent_id?: string;
          can_apply_tags?: boolean;
          can_create_lead?: boolean;
          can_read?: boolean;
          can_reply?: boolean;
          can_suggest?: boolean;
          can_transfer?: boolean;
          channel_type?: string;
          created_at?: string;
          id?: string;
          instance_id?: string | null;
          is_primary?: boolean;
          status?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'agent_channels_agent_id_fkey';
            columns: ['agent_id'];
            isOneToOne: false;
            referencedRelation: 'ai_agents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'agent_channels_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      agent_execution_logs: {
        Row: {
          actions_json: Json;
          agent_id: string | null;
          channel: string | null;
          conversation_id: string | null;
          error_message: string | null;
          event_type: string;
          executed_at: string;
          id: string;
          input_json: Json;
          instance_id: string | null;
          lead_id: string | null;
          output_json: Json;
          required_human_approval: boolean;
          status: string;
          tenant_id: string;
        };
        Insert: {
          actions_json?: Json;
          agent_id?: string | null;
          channel?: string | null;
          conversation_id?: string | null;
          error_message?: string | null;
          event_type: string;
          executed_at?: string;
          id?: string;
          input_json?: Json;
          instance_id?: string | null;
          lead_id?: string | null;
          output_json?: Json;
          required_human_approval?: boolean;
          status?: string;
          tenant_id: string;
        };
        Update: {
          actions_json?: Json;
          agent_id?: string | null;
          channel?: string | null;
          conversation_id?: string | null;
          error_message?: string | null;
          event_type?: string;
          executed_at?: string;
          id?: string;
          input_json?: Json;
          instance_id?: string | null;
          lead_id?: string | null;
          output_json?: Json;
          required_human_approval?: boolean;
          status?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'agent_execution_logs_agent_id_fkey';
            columns: ['agent_id'];
            isOneToOne: false;
            referencedRelation: 'ai_agents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'agent_execution_logs_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      agent_handoff_rules: {
        Row: {
          action_json: Json;
          active: boolean;
          agent_id: string;
          condition_type: string;
          config_json: Json;
          created_at: string;
          destination_id: string | null;
          destination_type: string | null;
          id: string;
          tenant_id: string;
        };
        Insert: {
          action_json?: Json;
          active?: boolean;
          agent_id: string;
          condition_type: string;
          config_json?: Json;
          created_at?: string;
          destination_id?: string | null;
          destination_type?: string | null;
          id?: string;
          tenant_id: string;
        };
        Update: {
          action_json?: Json;
          active?: boolean;
          agent_id?: string;
          condition_type?: string;
          config_json?: Json;
          created_at?: string;
          destination_id?: string | null;
          destination_type?: string | null;
          id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'agent_handoff_rules_agent_id_fkey';
            columns: ['agent_id'];
            isOneToOne: false;
            referencedRelation: 'ai_agents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'agent_handoff_rules_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      agent_knowledge_sources: {
        Row: {
          active: boolean;
          agent_id: string;
          config_json: Json;
          created_at: string;
          id: string;
          priority: number;
          source_id: string | null;
          source_type: string;
          tenant_id: string;
        };
        Insert: {
          active?: boolean;
          agent_id: string;
          config_json?: Json;
          created_at?: string;
          id?: string;
          priority?: number;
          source_id?: string | null;
          source_type: string;
          tenant_id: string;
        };
        Update: {
          active?: boolean;
          agent_id?: string;
          config_json?: Json;
          created_at?: string;
          id?: string;
          priority?: number;
          source_id?: string | null;
          source_type?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'agent_knowledge_sources_agent_id_fkey';
            columns: ['agent_id'];
            isOneToOne: false;
            referencedRelation: 'ai_agents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'agent_knowledge_sources_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      agent_metrics_config: {
        Row: {
          agent_id: string;
          created_at: string;
          enabled: boolean;
          id: string;
          metric_key: string;
          period: string | null;
          target_value: number | null;
          tenant_id: string;
        };
        Insert: {
          agent_id: string;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          metric_key: string;
          period?: string | null;
          target_value?: number | null;
          tenant_id: string;
        };
        Update: {
          agent_id?: string;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          metric_key?: string;
          period?: string | null;
          target_value?: number | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'agent_metrics_config_agent_id_fkey';
            columns: ['agent_id'];
            isOneToOne: false;
            referencedRelation: 'ai_agents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'agent_metrics_config_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      agent_permissions: {
        Row: {
          agent_id: string;
          created_at: string;
          enabled: boolean;
          id: string;
          permission_key: string;
          requires_approval: boolean;
          tenant_id: string;
        };
        Insert: {
          agent_id: string;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          permission_key: string;
          requires_approval?: boolean;
          tenant_id: string;
        };
        Update: {
          agent_id?: string;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          permission_key?: string;
          requires_approval?: boolean;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'agent_permissions_agent_id_fkey';
            columns: ['agent_id'];
            isOneToOne: false;
            referencedRelation: 'ai_agents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'agent_permissions_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      agent_pipelines: {
        Row: {
          agent_id: string;
          allowed_stages: Json;
          blocked_stages: Json;
          can_create_card: boolean;
          can_create_task: boolean;
          can_define_loss_reason: boolean;
          can_move_card: boolean;
          created_at: string;
          default_human_owner_id: string | null;
          id: string;
          pipeline_id: string;
          tenant_id: string;
        };
        Insert: {
          agent_id: string;
          allowed_stages?: Json;
          blocked_stages?: Json;
          can_create_card?: boolean;
          can_create_task?: boolean;
          can_define_loss_reason?: boolean;
          can_move_card?: boolean;
          created_at?: string;
          default_human_owner_id?: string | null;
          id?: string;
          pipeline_id: string;
          tenant_id: string;
        };
        Update: {
          agent_id?: string;
          allowed_stages?: Json;
          blocked_stages?: Json;
          can_create_card?: boolean;
          can_create_task?: boolean;
          can_define_loss_reason?: boolean;
          can_move_card?: boolean;
          created_at?: string;
          default_human_owner_id?: string | null;
          id?: string;
          pipeline_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'agent_pipelines_agent_id_fkey';
            columns: ['agent_id'];
            isOneToOne: false;
            referencedRelation: 'ai_agents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'agent_pipelines_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      agent_simulations: {
        Row: {
          agent_id: string | null;
          ai_response: string | null;
          created_at: string;
          handoff_prediction_json: Json;
          id: string;
          predicted_actions_json: Json;
          simulated_channel: string | null;
          simulated_instance_id: string | null;
          simulated_message: string;
          simulated_stage: string | null;
          tags_json: Json;
          tenant_id: string;
        };
        Insert: {
          agent_id?: string | null;
          ai_response?: string | null;
          created_at?: string;
          handoff_prediction_json?: Json;
          id?: string;
          predicted_actions_json?: Json;
          simulated_channel?: string | null;
          simulated_instance_id?: string | null;
          simulated_message: string;
          simulated_stage?: string | null;
          tags_json?: Json;
          tenant_id: string;
        };
        Update: {
          agent_id?: string | null;
          ai_response?: string | null;
          created_at?: string;
          handoff_prediction_json?: Json;
          id?: string;
          predicted_actions_json?: Json;
          simulated_channel?: string | null;
          simulated_instance_id?: string | null;
          simulated_message?: string;
          simulated_stage?: string | null;
          tags_json?: Json;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'agent_simulations_agent_id_fkey';
            columns: ['agent_id'];
            isOneToOne: false;
            referencedRelation: 'ai_agents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'agent_simulations_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      agent_triggers: {
        Row: {
          active: boolean;
          agent_id: string;
          config_json: Json;
          created_at: string;
          id: string;
          tenant_id: string;
          trigger_type: string;
        };
        Insert: {
          active?: boolean;
          agent_id: string;
          config_json?: Json;
          created_at?: string;
          id?: string;
          tenant_id: string;
          trigger_type: string;
        };
        Update: {
          active?: boolean;
          agent_id?: string;
          config_json?: Json;
          created_at?: string;
          id?: string;
          tenant_id?: string;
          trigger_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'agent_triggers_agent_id_fkey';
            columns: ['agent_id'];
            isOneToOne: false;
            referencedRelation: 'ai_agents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'agent_triggers_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      agent_workspaces: {
        Row: {
          agent_id: string;
          created_at: string;
          id: string;
          tenant_id: string;
          workspace_type: string;
        };
        Insert: {
          agent_id: string;
          created_at?: string;
          id?: string;
          tenant_id: string;
          workspace_type: string;
        };
        Update: {
          agent_id?: string;
          created_at?: string;
          id?: string;
          tenant_id?: string;
          workspace_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'agent_workspaces_agent_id_fkey';
            columns: ['agent_id'];
            isOneToOne: false;
            referencedRelation: 'ai_agents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'agent_workspaces_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_agents: {
        Row: {
          autonomy_level: number | null;
          avatar_url: string | null;
          capabilities: string[];
          channel: string;
          created_at: string;
          created_by: string | null;
          department: string | null;
          description: string | null;
          environment_id: string | null;
          handoff_rules: Json;
          icon: string | null;
          id: string;
          instructions: string | null;
          is_active: boolean;
          name: string;
          operation_mode: string | null;
          organization_id: string;
          personality: string | null;
          response_style: string;
          role: string;
          status: string | null;
          tools: string[];
          updated_at: string;
          working_hours: Json;
        };
        Insert: {
          autonomy_level?: number | null;
          avatar_url?: string | null;
          capabilities?: string[];
          channel?: string;
          created_at?: string;
          created_by?: string | null;
          department?: string | null;
          description?: string | null;
          environment_id?: string | null;
          handoff_rules?: Json;
          icon?: string | null;
          id?: string;
          instructions?: string | null;
          is_active?: boolean;
          name: string;
          operation_mode?: string | null;
          organization_id: string;
          personality?: string | null;
          response_style?: string;
          role?: string;
          status?: string | null;
          tools?: string[];
          updated_at?: string;
          working_hours?: Json;
        };
        Update: {
          autonomy_level?: number | null;
          avatar_url?: string | null;
          capabilities?: string[];
          channel?: string;
          created_at?: string;
          created_by?: string | null;
          department?: string | null;
          description?: string | null;
          environment_id?: string | null;
          handoff_rules?: Json;
          icon?: string | null;
          id?: string;
          instructions?: string | null;
          is_active?: boolean;
          name?: string;
          operation_mode?: string | null;
          organization_id?: string;
          personality?: string | null;
          response_style?: string;
          role?: string;
          status?: string | null;
          tools?: string[];
          updated_at?: string;
          working_hours?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_agents_environment_id_fkey';
            columns: ['environment_id'];
            isOneToOne: false;
            referencedRelation: 'environments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ai_agents_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      api_audit_logs: {
        Row: {
          api_name: string | null;
          dossier_id: string | null;
          http_status: number | null;
          id: string;
          request_url: string | null;
          response_body: Json | null;
          timestamp: string | null;
        };
        Insert: {
          api_name?: string | null;
          dossier_id?: string | null;
          http_status?: number | null;
          id?: string;
          request_url?: string | null;
          response_body?: Json | null;
          timestamp?: string | null;
        };
        Update: {
          api_name?: string | null;
          dossier_id?: string | null;
          http_status?: number | null;
          id?: string;
          request_url?: string | null;
          response_body?: Json | null;
          timestamp?: string | null;
        };
        Relationships: [];
      };
      billing: {
        Row: {
          amount: number | null;
          contract_id: string | null;
          created_at: string | null;
          description: string | null;
          due_date: string | null;
          environment_id: string | null;
          id: string;
          organization_id: string | null;
          payment_date: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          amount?: number | null;
          contract_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          environment_id?: string | null;
          id?: string;
          organization_id?: string | null;
          payment_date?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          amount?: number | null;
          contract_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          environment_id?: string | null;
          id?: string;
          organization_id?: string | null;
          payment_date?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'billing_environment_id_fkey';
            columns: ['environment_id'];
            isOneToOne: false;
            referencedRelation: 'environments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'billing_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      billings: {
        Row: {
          amount: number;
          barcode: string | null;
          category: string | null;
          client_id: string | null;
          contract_id: string | null;
          created_at: string | null;
          description: string | null;
          due_date: string;
          id: string;
          invoice_url: string | null;
          nosso_numero: string | null;
          organization_id: string | null;
          payment_date: string | null;
          payment_gateway_id: string | null;
          pix_code: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          amount: number;
          barcode?: string | null;
          category?: string | null;
          client_id?: string | null;
          contract_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          due_date: string;
          id?: string;
          invoice_url?: string | null;
          nosso_numero?: string | null;
          organization_id?: string | null;
          payment_date?: string | null;
          payment_gateway_id?: string | null;
          pix_code?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          amount?: number;
          barcode?: string | null;
          category?: string | null;
          client_id?: string | null;
          contract_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          due_date?: string;
          id?: string;
          invoice_url?: string | null;
          nosso_numero?: string | null;
          organization_id?: string | null;
          payment_date?: string | null;
          payment_gateway_id?: string | null;
          pix_code?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'billings_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'billings_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      blocks: {
        Row: {
          created_at: string | null;
          development_id: string | null;
          id: string;
          name: string;
          organization_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          development_id?: string | null;
          id?: string;
          name: string;
          organization_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          development_id?: string | null;
          id?: string;
          name?: string;
          organization_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'blocks_development_id_fkey';
            columns: ['development_id'];
            isOneToOne: false;
            referencedRelation: 'developments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'blocks_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_messages: {
        Row: {
          content: string | null;
          created_at: string | null;
          direction: string | null;
          external_id: string | null;
          id: string;
          lead_id: string | null;
          media_url: string | null;
          message_type: string | null;
          organization_id: string | null;
        };
        Insert: {
          content?: string | null;
          created_at?: string | null;
          direction?: string | null;
          external_id?: string | null;
          id?: string;
          lead_id?: string | null;
          media_url?: string | null;
          message_type?: string | null;
          organization_id?: string | null;
        };
        Update: {
          content?: string | null;
          created_at?: string | null;
          direction?: string | null;
          external_id?: string | null;
          id?: string;
          lead_id?: string | null;
          media_url?: string | null;
          message_type?: string | null;
          organization_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_messages_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_messages_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      clients: {
        Row: {
          address_city: string | null;
          address_complement: string | null;
          address_neighborhood: string | null;
          address_number: string | null;
          address_state: string | null;
          address_street: string | null;
          address_zip: string | null;
          birth_date: string | null;
          created_at: string | null;
          document_number: string | null;
          document_type: string | null;
          email: string | null;
          id: string;
          marital_status: string | null;
          monthly_income: number | null;
          name: string;
          notes: string | null;
          organization_id: string | null;
          phone: string | null;
          profession: string | null;
          roles: string[] | null;
          updated_at: string | null;
        };
        Insert: {
          address_city?: string | null;
          address_complement?: string | null;
          address_neighborhood?: string | null;
          address_number?: string | null;
          address_state?: string | null;
          address_street?: string | null;
          address_zip?: string | null;
          birth_date?: string | null;
          created_at?: string | null;
          document_number?: string | null;
          document_type?: string | null;
          email?: string | null;
          id?: string;
          marital_status?: string | null;
          monthly_income?: number | null;
          name: string;
          notes?: string | null;
          organization_id?: string | null;
          phone?: string | null;
          profession?: string | null;
          roles?: string[] | null;
          updated_at?: string | null;
        };
        Update: {
          address_city?: string | null;
          address_complement?: string | null;
          address_neighborhood?: string | null;
          address_number?: string | null;
          address_state?: string | null;
          address_street?: string | null;
          address_zip?: string | null;
          birth_date?: string | null;
          created_at?: string | null;
          document_number?: string | null;
          document_type?: string | null;
          email?: string | null;
          id?: string;
          marital_status?: string | null;
          monthly_income?: number | null;
          name?: string;
          notes?: string | null;
          organization_id?: string | null;
          phone?: string | null;
          profession?: string | null;
          roles?: string[] | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'clients_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      comparable_sales: {
        Row: {
          area_ha: number | null;
          area_m2: number | null;
          city: string | null;
          created_at: string | null;
          features_summary: Json | null;
          id: string;
          neighborhood: string | null;
          notes: string | null;
          organization_id: string | null;
          property_id: string | null;
          property_type: string | null;
          reliability: number | null;
          sale_date: string;
          sale_price: number;
          source: string;
          source_url: string | null;
          state: string | null;
        };
        Insert: {
          area_ha?: number | null;
          area_m2?: number | null;
          city?: string | null;
          created_at?: string | null;
          features_summary?: Json | null;
          id?: string;
          neighborhood?: string | null;
          notes?: string | null;
          organization_id?: string | null;
          property_id?: string | null;
          property_type?: string | null;
          reliability?: number | null;
          sale_date: string;
          sale_price: number;
          source?: string;
          source_url?: string | null;
          state?: string | null;
        };
        Update: {
          area_ha?: number | null;
          area_m2?: number | null;
          city?: string | null;
          created_at?: string | null;
          features_summary?: Json | null;
          id?: string;
          neighborhood?: string | null;
          notes?: string | null;
          organization_id?: string | null;
          property_id?: string | null;
          property_type?: string | null;
          reliability?: number | null;
          sale_date?: string;
          sale_price?: number;
          source?: string;
          source_url?: string | null;
          state?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'comparable_sales_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comparable_sales_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
      contacts: {
        Row: {
          created_at: string | null;
          id: string;
          instance_id: string | null;
          name: string | null;
          organization_id: string | null;
          profile_pic_url: string | null;
          updated_at: string | null;
          whatsapp_number: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          instance_id?: string | null;
          name?: string | null;
          organization_id?: string | null;
          profile_pic_url?: string | null;
          updated_at?: string | null;
          whatsapp_number: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          instance_id?: string | null;
          name?: string | null;
          organization_id?: string | null;
          profile_pic_url?: string | null;
          updated_at?: string | null;
          whatsapp_number?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contacts_instance_id_fkey';
            columns: ['instance_id'];
            isOneToOne: false;
            referencedRelation: 'instances';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contacts_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      contract_renewals: {
        Row: {
          adjustment_index: string | null;
          contract_id: string | null;
          created_at: string | null;
          id: string;
          new_end_date: string | null;
          new_rent: number | null;
          new_start_date: string | null;
          observation: string | null;
          old_end_date: string | null;
          old_rent: number | null;
          organization_id: string | null;
          renewal_type: string | null;
        };
        Insert: {
          adjustment_index?: string | null;
          contract_id?: string | null;
          created_at?: string | null;
          id?: string;
          new_end_date?: string | null;
          new_rent?: number | null;
          new_start_date?: string | null;
          observation?: string | null;
          old_end_date?: string | null;
          old_rent?: number | null;
          organization_id?: string | null;
          renewal_type?: string | null;
        };
        Update: {
          adjustment_index?: string | null;
          contract_id?: string | null;
          created_at?: string | null;
          id?: string;
          new_end_date?: string | null;
          new_rent?: number | null;
          new_start_date?: string | null;
          observation?: string | null;
          old_end_date?: string | null;
          old_rent?: number | null;
          organization_id?: string | null;
          renewal_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'contract_renewals_contract_id_fkey';
            columns: ['contract_id'];
            isOneToOne: false;
            referencedRelation: 'rental_contracts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contract_renewals_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      contracts: {
        Row: {
          content: string | null;
          contract_type: string;
          created_at: string | null;
          id: string;
          lead_id: string | null;
          organization_id: string | null;
          property_id: string | null;
          signed_at: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          content?: string | null;
          contract_type: string;
          created_at?: string | null;
          id?: string;
          lead_id?: string | null;
          organization_id?: string | null;
          property_id?: string | null;
          signed_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          content?: string | null;
          contract_type?: string;
          created_at?: string | null;
          id?: string;
          lead_id?: string | null;
          organization_id?: string | null;
          property_id?: string | null;
          signed_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'contracts_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contracts_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contracts_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
      developments: {
        Row: {
          address: string | null;
          available_units: number | null;
          city: string | null;
          created_at: string | null;
          description: string | null;
          environment_id: string | null;
          id: string;
          images: string[] | null;
          name: string;
          organization_id: string | null;
          progress_pct: number | null;
          registration_number: string | null;
          state: string | null;
          status: string | null;
          total_area: number | null;
          total_units: number | null;
        };
        Insert: {
          address?: string | null;
          available_units?: number | null;
          city?: string | null;
          created_at?: string | null;
          description?: string | null;
          environment_id?: string | null;
          id?: string;
          images?: string[] | null;
          name: string;
          organization_id?: string | null;
          progress_pct?: number | null;
          registration_number?: string | null;
          state?: string | null;
          status?: string | null;
          total_area?: number | null;
          total_units?: number | null;
        };
        Update: {
          address?: string | null;
          available_units?: number | null;
          city?: string | null;
          created_at?: string | null;
          description?: string | null;
          environment_id?: string | null;
          id?: string;
          images?: string[] | null;
          name?: string;
          organization_id?: string | null;
          progress_pct?: number | null;
          registration_number?: string | null;
          state?: string | null;
          status?: string | null;
          total_area?: number | null;
          total_units?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'developments_environment_id_fkey';
            columns: ['environment_id'];
            isOneToOne: false;
            referencedRelation: 'environments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'developments_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      document_analyses: {
        Row: {
          analysis_type: string;
          confidence: number | null;
          created_at: string | null;
          document_id: string | null;
          error: string | null;
          id: string;
          input_tokens: number | null;
          model_name: string | null;
          output_tokens: number | null;
          processing_time_ms: number | null;
          property_id: string | null;
          provider: string;
          result: Json | null;
        };
        Insert: {
          analysis_type: string;
          confidence?: number | null;
          created_at?: string | null;
          document_id?: string | null;
          error?: string | null;
          id?: string;
          input_tokens?: number | null;
          model_name?: string | null;
          output_tokens?: number | null;
          processing_time_ms?: number | null;
          property_id?: string | null;
          provider: string;
          result?: Json | null;
        };
        Update: {
          analysis_type?: string;
          confidence?: number | null;
          created_at?: string | null;
          document_id?: string | null;
          error?: string | null;
          id?: string;
          input_tokens?: number | null;
          model_name?: string | null;
          output_tokens?: number | null;
          processing_time_ms?: number | null;
          property_id?: string | null;
          provider?: string;
          result?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'document_analyses_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'document_analyses_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
      document_external_validations: {
        Row: {
          created_at: string | null;
          document_id: string | null;
          error: string | null;
          id: string;
          match_confidence: number | null;
          matched: boolean | null;
          queried_at: string | null;
          response_data: Json | null;
          response_status: string | null;
          response_time_ms: number | null;
          source: string;
        };
        Insert: {
          created_at?: string | null;
          document_id?: string | null;
          error?: string | null;
          id?: string;
          match_confidence?: number | null;
          matched?: boolean | null;
          queried_at?: string | null;
          response_data?: Json | null;
          response_status?: string | null;
          response_time_ms?: number | null;
          source: string;
        };
        Update: {
          created_at?: string | null;
          document_id?: string | null;
          error?: string | null;
          id?: string;
          match_confidence?: number | null;
          matched?: boolean | null;
          queried_at?: string | null;
          response_data?: Json | null;
          response_status?: string | null;
          response_time_ms?: number | null;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'document_external_validations_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
        ];
      };
      documents: {
        Row: {
          bucket: string;
          classification_confidence: number | null;
          classified_at: string | null;
          classified_by: string | null;
          created_at: string | null;
          document_type: string | null;
          extracted_data: Json | null;
          id: string;
          mime_type: string | null;
          object_key: string;
          ocr_confidence: number | null;
          organization_id: string | null;
          original_name: string;
          processing_error: string | null;
          property_id: string | null;
          raw_text: string | null;
          sha256: string | null;
          size_bytes: number | null;
          status: string | null;
          updated_at: string | null;
          validation_details: Json | null;
          validation_score: number | null;
          validation_status: string | null;
        };
        Insert: {
          bucket?: string;
          classification_confidence?: number | null;
          classified_at?: string | null;
          classified_by?: string | null;
          created_at?: string | null;
          document_type?: string | null;
          extracted_data?: Json | null;
          id?: string;
          mime_type?: string | null;
          object_key: string;
          ocr_confidence?: number | null;
          organization_id?: string | null;
          original_name: string;
          processing_error?: string | null;
          property_id?: string | null;
          raw_text?: string | null;
          sha256?: string | null;
          size_bytes?: number | null;
          status?: string | null;
          updated_at?: string | null;
          validation_details?: Json | null;
          validation_score?: number | null;
          validation_status?: string | null;
        };
        Update: {
          bucket?: string;
          classification_confidence?: number | null;
          classified_at?: string | null;
          classified_by?: string | null;
          created_at?: string | null;
          document_type?: string | null;
          extracted_data?: Json | null;
          id?: string;
          mime_type?: string | null;
          object_key?: string;
          ocr_confidence?: number | null;
          organization_id?: string | null;
          original_name?: string;
          processing_error?: string | null;
          property_id?: string | null;
          raw_text?: string | null;
          sha256?: string | null;
          size_bytes?: number | null;
          status?: string | null;
          updated_at?: string | null;
          validation_details?: Json | null;
          validation_score?: number | null;
          validation_status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
      domains: {
        Row: {
          created_at: string | null;
          domain: string;
          id: string;
          is_custom: boolean | null;
          is_primary: boolean | null;
          organization_id: string | null;
          purpose: string | null;
          ssl_status: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          domain: string;
          id?: string;
          is_custom?: boolean | null;
          is_primary?: boolean | null;
          organization_id?: string | null;
          purpose?: string | null;
          ssl_status?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          domain?: string;
          id?: string;
          is_custom?: boolean | null;
          is_primary?: boolean | null;
          organization_id?: string | null;
          purpose?: string | null;
          ssl_status?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'domains_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      due_diligence_items: {
        Row: {
          created_at: string | null;
          documents: string[] | null;
          id: string;
          item_type: string;
          notes: string | null;
          property_id: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          documents?: string[] | null;
          id?: string;
          item_type: string;
          notes?: string | null;
          property_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          documents?: string[] | null;
          id?: string;
          item_type?: string;
          notes?: string | null;
          property_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'due_diligence_items_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
      email_accounts: {
        Row: {
          auth_method: string;
          created_at: string | null;
          email: string;
          encrypted_password: string;
          id: string;
          imap_host: string | null;
          imap_port: number | null;
          imap_secure: boolean | null;
          is_active: boolean | null;
          last_inbox_uid: number | null;
          last_synced_at: string | null;
          oauth_account_id: string | null;
          oauth_provider: string | null;
          organization_id: string | null;
          smtp_host: string | null;
          smtp_port: number | null;
          smtp_secure: boolean | null;
          sync_error: string | null;
          sync_status: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          auth_method?: string;
          created_at?: string | null;
          email: string;
          encrypted_password: string;
          id?: string;
          imap_host?: string | null;
          imap_port?: number | null;
          imap_secure?: boolean | null;
          is_active?: boolean | null;
          last_inbox_uid?: number | null;
          last_synced_at?: string | null;
          oauth_account_id?: string | null;
          oauth_provider?: string | null;
          organization_id?: string | null;
          smtp_host?: string | null;
          smtp_port?: number | null;
          smtp_secure?: boolean | null;
          sync_error?: string | null;
          sync_status?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          auth_method?: string;
          created_at?: string | null;
          email?: string;
          encrypted_password?: string;
          id?: string;
          imap_host?: string | null;
          imap_port?: number | null;
          imap_secure?: boolean | null;
          is_active?: boolean | null;
          last_inbox_uid?: number | null;
          last_synced_at?: string | null;
          oauth_account_id?: string | null;
          oauth_provider?: string | null;
          organization_id?: string | null;
          smtp_host?: string | null;
          smtp_port?: number | null;
          smtp_secure?: boolean | null;
          sync_error?: string | null;
          sync_status?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'email_accounts_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'email_accounts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      email_automation_jobs: {
        Row: {
          created_at: string;
          email_id: string | null;
          id: string;
          job_type: string;
          organization_id: string;
          payload: Json;
          result: Json;
          run_after: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email_id?: string | null;
          id?: string;
          job_type: string;
          organization_id: string;
          payload?: Json;
          result?: Json;
          run_after?: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email_id?: string | null;
          id?: string;
          job_type?: string;
          organization_id?: string;
          payload?: Json;
          result?: Json;
          run_after?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'email_automation_jobs_email_id_fkey';
            columns: ['email_id'];
            isOneToOne: false;
            referencedRelation: 'emails';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'email_automation_jobs_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      email_events: {
        Row: {
          account_id: string | null;
          created_at: string;
          email_id: string | null;
          event_type: string;
          id: string;
          organization_id: string;
          payload: Json;
          processed_at: string | null;
          user_id: string | null;
        };
        Insert: {
          account_id?: string | null;
          created_at?: string;
          email_id?: string | null;
          event_type: string;
          id?: string;
          organization_id: string;
          payload?: Json;
          processed_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          account_id?: string | null;
          created_at?: string;
          email_id?: string | null;
          event_type?: string;
          id?: string;
          organization_id?: string;
          payload?: Json;
          processed_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'email_events_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'email_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'email_events_email_id_fkey';
            columns: ['email_id'];
            isOneToOne: false;
            referencedRelation: 'emails';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'email_events_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      emails: {
        Row: {
          account_id: string | null;
          ai_metadata: Json;
          body_html: string | null;
          body_text: string | null;
          cc_email: string[] | null;
          created_at: string | null;
          date: string;
          direction: string | null;
          folder: string | null;
          from_email: string;
          from_name: string | null;
          id: string;
          imap_uid: number | null;
          in_reply_to: string | null;
          is_archived: boolean | null;
          is_read: boolean | null;
          lead_id: string | null;
          message_id: string | null;
          organization_id: string | null;
          preview: string | null;
          raw_headers: Json | null;
          references_ids: string[] | null;
          subject: string | null;
          thread_id: string | null;
          to_email: string[] | null;
          updated_at: string;
        };
        Insert: {
          account_id?: string | null;
          ai_metadata?: Json;
          body_html?: string | null;
          body_text?: string | null;
          cc_email?: string[] | null;
          created_at?: string | null;
          date: string;
          direction?: string | null;
          folder?: string | null;
          from_email: string;
          from_name?: string | null;
          id?: string;
          imap_uid?: number | null;
          in_reply_to?: string | null;
          is_archived?: boolean | null;
          is_read?: boolean | null;
          lead_id?: string | null;
          message_id?: string | null;
          organization_id?: string | null;
          preview?: string | null;
          raw_headers?: Json | null;
          references_ids?: string[] | null;
          subject?: string | null;
          thread_id?: string | null;
          to_email?: string[] | null;
          updated_at?: string;
        };
        Update: {
          account_id?: string | null;
          ai_metadata?: Json;
          body_html?: string | null;
          body_text?: string | null;
          cc_email?: string[] | null;
          created_at?: string | null;
          date?: string;
          direction?: string | null;
          folder?: string | null;
          from_email?: string;
          from_name?: string | null;
          id?: string;
          imap_uid?: number | null;
          in_reply_to?: string | null;
          is_archived?: boolean | null;
          is_read?: boolean | null;
          lead_id?: string | null;
          message_id?: string | null;
          organization_id?: string | null;
          preview?: string | null;
          raw_headers?: Json | null;
          references_ids?: string[] | null;
          subject?: string | null;
          thread_id?: string | null;
          to_email?: string[] | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'emails_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'email_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'emails_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'emails_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      environments: {
        Row: {
          brand_config: Json;
          created_at: string;
          feature_flags: Json;
          id: string;
          is_primary: boolean;
          name: string;
          organization_id: string;
          slug: string;
          status: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          brand_config?: Json;
          created_at?: string;
          feature_flags?: Json;
          id?: string;
          is_primary?: boolean;
          name: string;
          organization_id: string;
          slug: string;
          status?: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          brand_config?: Json;
          created_at?: string;
          feature_flags?: Json;
          id?: string;
          is_primary?: boolean;
          name?: string;
          organization_id?: string;
          slug?: string;
          status?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'environments_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      external_data_cache: {
        Row: {
          cache_key: string;
          data: Json;
          etag: string | null;
          expires_at: string | null;
          fetched_at: string | null;
          id: string;
          source: string;
          ttl_seconds: number | null;
        };
        Insert: {
          cache_key: string;
          data: Json;
          etag?: string | null;
          expires_at?: string | null;
          fetched_at?: string | null;
          id?: string;
          source: string;
          ttl_seconds?: number | null;
        };
        Update: {
          cache_key?: string;
          data?: Json;
          etag?: string | null;
          expires_at?: string | null;
          fetched_at?: string | null;
          id?: string;
          source?: string;
          ttl_seconds?: number | null;
        };
        Relationships: [];
      };
      ibge_municipios: {
        Row: {
          area_km2: number | null;
          codigo_ibge: string;
          created_at: string | null;
          geom: unknown;
          idh: number | null;
          nome: string;
          pib_per_capita: number | null;
          populacao: number | null;
          regiao: string | null;
          uf: string;
          updated_at: string | null;
        };
        Insert: {
          area_km2?: number | null;
          codigo_ibge: string;
          created_at?: string | null;
          geom?: unknown;
          idh?: number | null;
          nome: string;
          pib_per_capita?: number | null;
          populacao?: number | null;
          regiao?: string | null;
          uf: string;
          updated_at?: string | null;
        };
        Update: {
          area_km2?: number | null;
          codigo_ibge?: string;
          created_at?: string | null;
          geom?: unknown;
          idh?: number | null;
          nome?: string;
          pib_per_capita?: number | null;
          populacao?: number | null;
          regiao?: string | null;
          uf?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      impersonation_sessions: {
        Row: {
          actor_user_id: string;
          created_at: string | null;
          expires_at: string;
          id: string;
          impersonated_user_id: string;
          reason: string | null;
          status: string;
          tenant_id: string | null;
        };
        Insert: {
          actor_user_id: string;
          created_at?: string | null;
          expires_at: string;
          id?: string;
          impersonated_user_id: string;
          reason?: string | null;
          status?: string;
          tenant_id?: string | null;
        };
        Update: {
          actor_user_id?: string;
          created_at?: string | null;
          expires_at?: string;
          id?: string;
          impersonated_user_id?: string;
          reason?: string | null;
          status?: string;
          tenant_id?: string | null;
        };
        Relationships: [];
      };
      instances: {
        Row: {
          connection_status: string | null;
          created_at: string | null;
          id: string;
          name: string;
          organization_id: string | null;
          settings: Json | null;
          updated_at: string | null;
        };
        Insert: {
          connection_status?: string | null;
          created_at?: string | null;
          id?: string;
          name: string;
          organization_id?: string | null;
          settings?: Json | null;
          updated_at?: string | null;
        };
        Update: {
          connection_status?: string | null;
          created_at?: string | null;
          id?: string;
          name?: string;
          organization_id?: string | null;
          settings?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'instances_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      landing_pages: {
        Row: {
          blocks: Json | null;
          content: Json | null;
          created_at: string | null;
          custom_css: string | null;
          custom_head: string | null;
          custom_js: string | null;
          description: string | null;
          environment_id: string | null;
          form_config: Json | null;
          id: string;
          is_active: boolean | null;
          leads_count: number | null;
          meta_description: string | null;
          meta_keywords: string[] | null;
          meta_title: string | null;
          name: string | null;
          og_image: string | null;
          organization_id: string | null;
          property_selection: Json | null;
          published_at: string | null;
          settings: Json | null;
          slug: string;
          status: string | null;
          template_id: string | null;
          theme_config: Json | null;
          title: string | null;
          updated_at: string | null;
          user_id: string | null;
          views_count: number | null;
        };
        Insert: {
          blocks?: Json | null;
          content?: Json | null;
          created_at?: string | null;
          custom_css?: string | null;
          custom_head?: string | null;
          custom_js?: string | null;
          description?: string | null;
          environment_id?: string | null;
          form_config?: Json | null;
          id?: string;
          is_active?: boolean | null;
          leads_count?: number | null;
          meta_description?: string | null;
          meta_keywords?: string[] | null;
          meta_title?: string | null;
          name?: string | null;
          og_image?: string | null;
          organization_id?: string | null;
          property_selection?: Json | null;
          published_at?: string | null;
          settings?: Json | null;
          slug: string;
          status?: string | null;
          template_id?: string | null;
          theme_config?: Json | null;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
          views_count?: number | null;
        };
        Update: {
          blocks?: Json | null;
          content?: Json | null;
          created_at?: string | null;
          custom_css?: string | null;
          custom_head?: string | null;
          custom_js?: string | null;
          description?: string | null;
          environment_id?: string | null;
          form_config?: Json | null;
          id?: string;
          is_active?: boolean | null;
          leads_count?: number | null;
          meta_description?: string | null;
          meta_keywords?: string[] | null;
          meta_title?: string | null;
          name?: string | null;
          og_image?: string | null;
          organization_id?: string | null;
          property_selection?: Json | null;
          published_at?: string | null;
          settings?: Json | null;
          slug?: string;
          status?: string | null;
          template_id?: string | null;
          theme_config?: Json | null;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
          views_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'landing_pages_environment_id_fkey';
            columns: ['environment_id'];
            isOneToOne: false;
            referencedRelation: 'environments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'landing_pages_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'landing_pages_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      lead_activities: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          description: string;
          id: string;
          lead_id: string | null;
          metadata: Json | null;
          organization_id: string | null;
          type: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          description: string;
          id?: string;
          lead_id?: string | null;
          metadata?: Json | null;
          organization_id?: string | null;
          type: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string;
          id?: string;
          lead_id?: string | null;
          metadata?: Json | null;
          organization_id?: string | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_activities_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_activities_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_activities_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      lead_followups: {
        Row: {
          created_at: string;
          due_at: string;
          id: string;
          kind: string;
          lead_id: string;
          metadata: Json | null;
          notes: string | null;
          organization_id: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          due_at: string;
          id?: string;
          kind?: string;
          lead_id: string;
          metadata?: Json | null;
          notes?: string | null;
          organization_id: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          due_at?: string;
          id?: string;
          kind?: string;
          lead_id?: string;
          metadata?: Json | null;
          notes?: string | null;
          organization_id?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_followups_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_followups_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      lead_tags: {
        Row: {
          created_at: string;
          id: string;
          lead_id: string;
          organization_id: string;
          tag: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          lead_id: string;
          organization_id: string;
          tag: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          lead_id?: string;
          organization_id?: string;
          tag?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_tags_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_tags_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      leads: {
        Row: {
          ad_reference: string | null;
          ai_last_confidence: number | null;
          ai_last_intent: string | null;
          ai_next_action: string | null;
          ai_profile: Json | null;
          aptitude_interest: string[] | null;
          assigned_to: string | null;
          budget: number | null;
          campaign: string | null;
          chat_jid: string | null;
          classification: string | null;
          client_id: string | null;
          company_name: string | null;
          created_at: string | null;
          email: string | null;
          environment_id: string | null;
          id: string;
          last_contacted_at: string | null;
          lead_score: number | null;
          match_profile: string | null;
          match_summary: string | null;
          matched_at: string | null;
          matched_properties: Json | null;
          name: string;
          next_follow_up_at: string | null;
          next_visit_at: string | null;
          notes: string | null;
          organic_channel: string | null;
          organization_id: string | null;
          phone: string | null;
          preferences: Json | null;
          property_id: string | null;
          qualification_score: number | null;
          qualified_by_ai: boolean | null;
          scheduled_at: string | null;
          source: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          ad_reference?: string | null;
          ai_last_confidence?: number | null;
          ai_last_intent?: string | null;
          ai_next_action?: string | null;
          ai_profile?: Json | null;
          aptitude_interest?: string[] | null;
          assigned_to?: string | null;
          budget?: number | null;
          campaign?: string | null;
          chat_jid?: string | null;
          classification?: string | null;
          client_id?: string | null;
          company_name?: string | null;
          created_at?: string | null;
          email?: string | null;
          environment_id?: string | null;
          id?: string;
          last_contacted_at?: string | null;
          lead_score?: number | null;
          match_profile?: string | null;
          match_summary?: string | null;
          matched_at?: string | null;
          matched_properties?: Json | null;
          name: string;
          next_follow_up_at?: string | null;
          next_visit_at?: string | null;
          notes?: string | null;
          organic_channel?: string | null;
          organization_id?: string | null;
          phone?: string | null;
          preferences?: Json | null;
          property_id?: string | null;
          qualification_score?: number | null;
          qualified_by_ai?: boolean | null;
          scheduled_at?: string | null;
          source?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          ad_reference?: string | null;
          ai_last_confidence?: number | null;
          ai_last_intent?: string | null;
          ai_next_action?: string | null;
          ai_profile?: Json | null;
          aptitude_interest?: string[] | null;
          assigned_to?: string | null;
          budget?: number | null;
          campaign?: string | null;
          chat_jid?: string | null;
          classification?: string | null;
          client_id?: string | null;
          company_name?: string | null;
          created_at?: string | null;
          email?: string | null;
          environment_id?: string | null;
          id?: string;
          last_contacted_at?: string | null;
          lead_score?: number | null;
          match_profile?: string | null;
          match_summary?: string | null;
          matched_at?: string | null;
          matched_properties?: Json | null;
          name?: string;
          next_follow_up_at?: string | null;
          next_visit_at?: string | null;
          notes?: string | null;
          organic_channel?: string | null;
          organization_id?: string | null;
          phone?: string | null;
          preferences?: Json | null;
          property_id?: string | null;
          qualification_score?: number | null;
          qualified_by_ai?: boolean | null;
          scheduled_at?: string | null;
          source?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'leads_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leads_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leads_environment_id_fkey';
            columns: ['environment_id'];
            isOneToOne: false;
            referencedRelation: 'environments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leads_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leads_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
      leases: {
        Row: {
          activated_at: string | null;
          adjustment_index: string | null;
          adjustment_period_months: number | null;
          analysis_notes: string | null;
          caution_amount: number | null;
          caution_payment_date: string | null;
          co_tenants: string[] | null;
          commission_payer: string | null;
          commission_percent: number | null;
          condominium_fee: number | null;
          contract_duration_months: number | null;
          contract_number: string | null;
          created_at: string | null;
          created_by: string | null;
          credit_score: number | null;
          currency_correction: boolean | null;
          current_template_id: string | null;
          due_day: number | null;
          end_date: string | null;
          evaluation_score: number | null;
          evaluation_status: string | null;
          guarantee_details: Json | null;
          guarantee_type: string | null;
          guarantee_value: number | null;
          guarantor_cpf: string | null;
          guarantor_email: string | null;
          guarantor_id: string | null;
          guarantor_monthly_income: number | null;
          guarantor_name: string | null;
          guarantor_phone: string | null;
          has_restrictions: boolean | null;
          id: string;
          insurance_company: string | null;
          insurance_policy_number: string | null;
          iptu_amount: number | null;
          key_delivery_date: string | null;
          last_rent_adjustment: string | null;
          late_fee_percent: number | null;
          late_interest_percent: number | null;
          monthly_rent: number;
          next_rent_adjustment: string | null;
          occupation_date: string | null;
          organization_id: string | null;
          owner_id: string | null;
          payment_status: string | null;
          previous_lease_id: string | null;
          property_id: string | null;
          renewal_count: number | null;
          rental_purpose: string | null;
          restriction_notes: string | null;
          signature_method: string | null;
          signature_status: string | null;
          signed_at: string | null;
          signed_document_url: string | null;
          start_date: string | null;
          status: string;
          tenant_birth_date: string | null;
          tenant_cpf: string | null;
          tenant_email: string | null;
          tenant_employer: string | null;
          tenant_id: string | null;
          tenant_marital_status: string | null;
          tenant_monthly_income: number | null;
          tenant_name: string | null;
          tenant_phone: string | null;
          tenant_profession: string | null;
          tenant_rg: string | null;
          tenant_type: string | null;
          terminated_at: string | null;
          updated_at: string | null;
          updated_by: string | null;
          witness_1_cpf: string | null;
          witness_1_id: string | null;
          witness_1_name: string | null;
          witness_2_cpf: string | null;
          witness_2_id: string | null;
          witness_2_name: string | null;
        };
        Insert: {
          activated_at?: string | null;
          adjustment_index?: string | null;
          adjustment_period_months?: number | null;
          analysis_notes?: string | null;
          caution_amount?: number | null;
          caution_payment_date?: string | null;
          co_tenants?: string[] | null;
          commission_payer?: string | null;
          commission_percent?: number | null;
          condominium_fee?: number | null;
          contract_duration_months?: number | null;
          contract_number?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          credit_score?: number | null;
          currency_correction?: boolean | null;
          current_template_id?: string | null;
          due_day?: number | null;
          end_date?: string | null;
          evaluation_score?: number | null;
          evaluation_status?: string | null;
          guarantee_details?: Json | null;
          guarantee_type?: string | null;
          guarantee_value?: number | null;
          guarantor_cpf?: string | null;
          guarantor_email?: string | null;
          guarantor_id?: string | null;
          guarantor_monthly_income?: number | null;
          guarantor_name?: string | null;
          guarantor_phone?: string | null;
          has_restrictions?: boolean | null;
          id?: string;
          insurance_company?: string | null;
          insurance_policy_number?: string | null;
          iptu_amount?: number | null;
          key_delivery_date?: string | null;
          last_rent_adjustment?: string | null;
          late_fee_percent?: number | null;
          late_interest_percent?: number | null;
          monthly_rent?: number;
          next_rent_adjustment?: string | null;
          occupation_date?: string | null;
          organization_id?: string | null;
          owner_id?: string | null;
          payment_status?: string | null;
          previous_lease_id?: string | null;
          property_id?: string | null;
          renewal_count?: number | null;
          rental_purpose?: string | null;
          restriction_notes?: string | null;
          signature_method?: string | null;
          signature_status?: string | null;
          signed_at?: string | null;
          signed_document_url?: string | null;
          start_date?: string | null;
          status?: string;
          tenant_birth_date?: string | null;
          tenant_cpf?: string | null;
          tenant_email?: string | null;
          tenant_employer?: string | null;
          tenant_id?: string | null;
          tenant_marital_status?: string | null;
          tenant_monthly_income?: number | null;
          tenant_name?: string | null;
          tenant_phone?: string | null;
          tenant_profession?: string | null;
          tenant_rg?: string | null;
          tenant_type?: string | null;
          terminated_at?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          witness_1_cpf?: string | null;
          witness_1_id?: string | null;
          witness_1_name?: string | null;
          witness_2_cpf?: string | null;
          witness_2_id?: string | null;
          witness_2_name?: string | null;
        };
        Update: {
          activated_at?: string | null;
          adjustment_index?: string | null;
          adjustment_period_months?: number | null;
          analysis_notes?: string | null;
          caution_amount?: number | null;
          caution_payment_date?: string | null;
          co_tenants?: string[] | null;
          commission_payer?: string | null;
          commission_percent?: number | null;
          condominium_fee?: number | null;
          contract_duration_months?: number | null;
          contract_number?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          credit_score?: number | null;
          currency_correction?: boolean | null;
          current_template_id?: string | null;
          due_day?: number | null;
          end_date?: string | null;
          evaluation_score?: number | null;
          evaluation_status?: string | null;
          guarantee_details?: Json | null;
          guarantee_type?: string | null;
          guarantee_value?: number | null;
          guarantor_cpf?: string | null;
          guarantor_email?: string | null;
          guarantor_id?: string | null;
          guarantor_monthly_income?: number | null;
          guarantor_name?: string | null;
          guarantor_phone?: string | null;
          has_restrictions?: boolean | null;
          id?: string;
          insurance_company?: string | null;
          insurance_policy_number?: string | null;
          iptu_amount?: number | null;
          key_delivery_date?: string | null;
          last_rent_adjustment?: string | null;
          late_fee_percent?: number | null;
          late_interest_percent?: number | null;
          monthly_rent?: number;
          next_rent_adjustment?: string | null;
          occupation_date?: string | null;
          organization_id?: string | null;
          owner_id?: string | null;
          payment_status?: string | null;
          previous_lease_id?: string | null;
          property_id?: string | null;
          renewal_count?: number | null;
          rental_purpose?: string | null;
          restriction_notes?: string | null;
          signature_method?: string | null;
          signature_status?: string | null;
          signed_at?: string | null;
          signed_document_url?: string | null;
          start_date?: string | null;
          status?: string;
          tenant_birth_date?: string | null;
          tenant_cpf?: string | null;
          tenant_email?: string | null;
          tenant_employer?: string | null;
          tenant_id?: string | null;
          tenant_marital_status?: string | null;
          tenant_monthly_income?: number | null;
          tenant_name?: string | null;
          tenant_phone?: string | null;
          tenant_profession?: string | null;
          tenant_rg?: string | null;
          tenant_type?: string | null;
          terminated_at?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          witness_1_cpf?: string | null;
          witness_1_id?: string | null;
          witness_1_name?: string | null;
          witness_2_cpf?: string | null;
          witness_2_id?: string | null;
          witness_2_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'leases_guarantor_id_fkey';
            columns: ['guarantor_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leases_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leases_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leases_previous_lease_id_fkey';
            columns: ['previous_lease_id'];
            isOneToOne: false;
            referencedRelation: 'leases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leases_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leases_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leases_witness_1_id_fkey';
            columns: ['witness_1_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leases_witness_2_id_fkey';
            columns: ['witness_2_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      lots: {
        Row: {
          area_m2: number;
          back_m: number | null;
          block_id: string | null;
          coordinates: Json | null;
          created_at: string | null;
          current_client_id: string | null;
          development_id: string | null;
          front_m: number | null;
          id: string;
          left_m: number | null;
          number: string;
          organization_id: string | null;
          price: number;
          right_m: number | null;
          status: string | null;
        };
        Insert: {
          area_m2: number;
          back_m?: number | null;
          block_id?: string | null;
          coordinates?: Json | null;
          created_at?: string | null;
          current_client_id?: string | null;
          development_id?: string | null;
          front_m?: number | null;
          id?: string;
          left_m?: number | null;
          number: string;
          organization_id?: string | null;
          price: number;
          right_m?: number | null;
          status?: string | null;
        };
        Update: {
          area_m2?: number;
          back_m?: number | null;
          block_id?: string | null;
          coordinates?: Json | null;
          created_at?: string | null;
          current_client_id?: string | null;
          development_id?: string | null;
          front_m?: number | null;
          id?: string;
          left_m?: number | null;
          number?: string;
          organization_id?: string | null;
          price?: number;
          right_m?: number | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lots_block_id_fkey';
            columns: ['block_id'];
            isOneToOne: false;
            referencedRelation: 'blocks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lots_development_id_fkey';
            columns: ['development_id'];
            isOneToOne: false;
            referencedRelation: 'developments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lots_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      market_indicators: {
        Row: {
          city: string | null;
          created_at: string | null;
          id: string;
          indicator_key: string;
          indicator_type: string;
          metadata: Json | null;
          reference_date: string;
          source: string;
          state: string | null;
          unit: string | null;
          updated_at: string | null;
          value: number;
        };
        Insert: {
          city?: string | null;
          created_at?: string | null;
          id?: string;
          indicator_key: string;
          indicator_type: string;
          metadata?: Json | null;
          reference_date: string;
          source: string;
          state?: string | null;
          unit?: string | null;
          updated_at?: string | null;
          value: number;
        };
        Update: {
          city?: string | null;
          created_at?: string | null;
          id?: string;
          indicator_key?: string;
          indicator_type?: string;
          metadata?: Json | null;
          reference_date?: string;
          source?: string;
          state?: string | null;
          unit?: string | null;
          updated_at?: string | null;
          value?: number;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          contact_id: string | null;
          content: string | null;
          created_at: string | null;
          from_me: boolean | null;
          id: string;
          instance_id: string | null;
          key_id: string;
          media_type: string | null;
          message_id: string | null;
          organization_id: string | null;
          raw_payload: Json | null;
          status: string | null;
          timestamp: string | null;
        };
        Insert: {
          contact_id?: string | null;
          content?: string | null;
          created_at?: string | null;
          from_me?: boolean | null;
          id?: string;
          instance_id?: string | null;
          key_id: string;
          media_type?: string | null;
          message_id?: string | null;
          organization_id?: string | null;
          raw_payload?: Json | null;
          status?: string | null;
          timestamp?: string | null;
        };
        Update: {
          contact_id?: string | null;
          content?: string | null;
          created_at?: string | null;
          from_me?: boolean | null;
          id?: string;
          instance_id?: string | null;
          key_id?: string;
          media_type?: string | null;
          message_id?: string | null;
          organization_id?: string | null;
          raw_payload?: Json | null;
          status?: string | null;
          timestamp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_contact_id_fkey';
            columns: ['contact_id'];
            isOneToOne: false;
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_instance_id_fkey';
            columns: ['instance_id'];
            isOneToOne: false;
            referencedRelation: 'instances';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      migration_config_snapshots: {
        Row: {
          config: Json;
          created_at: string;
          created_by: string | null;
          id: string;
          job_id: string | null;
          snapshot_type: string;
        };
        Insert: {
          config?: Json;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          job_id?: string | null;
          snapshot_type: string;
        };
        Update: {
          config?: Json;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          job_id?: string | null;
          snapshot_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'migration_config_snapshots_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'migration_jobs';
            referencedColumns: ['id'];
          },
        ];
      };
      migration_credentials: {
        Row: {
          created_at: string;
          created_by: string | null;
          encrypted_payload: string;
          id: string;
          job_id: string;
          scope: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          encrypted_payload: string;
          id?: string;
          job_id: string;
          scope: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          encrypted_payload?: string;
          id?: string;
          job_id?: string;
          scope?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'migration_credentials_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'migration_jobs';
            referencedColumns: ['id'];
          },
        ];
      };
      migration_errors: {
        Row: {
          created_at: string;
          entity_name: string | null;
          entity_type: string | null;
          error_message: string;
          id: number;
          job_id: string | null;
          payload: Json;
          step: string | null;
        };
        Insert: {
          created_at?: string;
          entity_name?: string | null;
          entity_type?: string | null;
          error_message: string;
          id?: number;
          job_id?: string | null;
          payload?: Json;
          step?: string | null;
        };
        Update: {
          created_at?: string;
          entity_name?: string | null;
          entity_type?: string | null;
          error_message?: string;
          id?: number;
          job_id?: string | null;
          payload?: Json;
          step?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'migration_errors_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'migration_jobs';
            referencedColumns: ['id'];
          },
        ];
      };
      migration_file_map: {
        Row: {
          bucket: string | null;
          content_type: string | null;
          created_at: string;
          error_message: string | null;
          id: string;
          job_id: string | null;
          new_url: string | null;
          old_url: string | null;
          path: string | null;
          size: number | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          bucket?: string | null;
          content_type?: string | null;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          job_id?: string | null;
          new_url?: string | null;
          old_url?: string | null;
          path?: string | null;
          size?: number | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          bucket?: string | null;
          content_type?: string | null;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          job_id?: string | null;
          new_url?: string | null;
          old_url?: string | null;
          path?: string | null;
          size?: number | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'migration_file_map_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'migration_jobs';
            referencedColumns: ['id'];
          },
        ];
      };
      migration_jobs: {
        Row: {
          created_at: string;
          created_by: string | null;
          dry_run_approved: boolean;
          finished_at: string | null;
          id: string;
          progress: number;
          selected_buckets: string[];
          selected_schemas: string[];
          source_supabase_url: string | null;
          started_at: string | null;
          status: string;
          target_minio_endpoint: string | null;
          target_supabase_url: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          dry_run_approved?: boolean;
          finished_at?: string | null;
          id?: string;
          progress?: number;
          selected_buckets?: string[];
          selected_schemas?: string[];
          source_supabase_url?: string | null;
          started_at?: string | null;
          status?: string;
          target_minio_endpoint?: string | null;
          target_supabase_url?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          dry_run_approved?: boolean;
          finished_at?: string | null;
          id?: string;
          progress?: number;
          selected_buckets?: string[];
          selected_schemas?: string[];
          source_supabase_url?: string | null;
          started_at?: string | null;
          status?: string;
          target_minio_endpoint?: string | null;
          target_supabase_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      migration_logs: {
        Row: {
          created_at: string;
          id: number;
          job_id: string | null;
          level: string;
          message: string;
          metadata: Json;
          step: string | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          job_id?: string | null;
          level?: string;
          message: string;
          metadata?: Json;
          step?: string | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          job_id?: string | null;
          level?: string;
          message?: string;
          metadata?: Json;
          step?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'migration_logs_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'migration_jobs';
            referencedColumns: ['id'];
          },
        ];
      };
      migration_steps: {
        Row: {
          created_at: string;
          finished_at: string | null;
          id: string;
          job_id: string;
          metadata: Json;
          progress: number;
          started_at: string | null;
          status: string;
          step: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          finished_at?: string | null;
          id?: string;
          job_id: string;
          metadata?: Json;
          progress?: number;
          started_at?: string | null;
          status?: string;
          step: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          finished_at?: string | null;
          id?: string;
          job_id?: string;
          metadata?: Json;
          progress?: number;
          started_at?: string | null;
          status?: string;
          step?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'migration_steps_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'migration_jobs';
            referencedColumns: ['id'];
          },
        ];
      };
      migration_table_map: {
        Row: {
          created_at: string;
          error_message: string | null;
          id: string;
          job_id: string | null;
          migrated_count: number;
          schema_name: string;
          source_count: number | null;
          status: string;
          table_name: string;
          target_count: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          job_id?: string | null;
          migrated_count?: number;
          schema_name: string;
          source_count?: number | null;
          status?: string;
          table_name: string;
          target_count?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          job_id?: string | null;
          migrated_count?: number;
          schema_name?: string;
          source_count?: number | null;
          status?: string;
          table_name?: string;
          target_count?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'migration_table_map_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'migration_jobs';
            referencedColumns: ['id'];
          },
        ];
      };
      Organization: {
        Row: {
          createdat: string;
          domain: string | null;
          id: string;
          name: string;
          plan: string;
          planid: string | null;
          slug: string | null;
          updatedat: string;
        };
        Insert: {
          createdat?: string;
          domain?: string | null;
          id: string;
          name: string;
          plan?: string;
          planid?: string | null;
          slug?: string | null;
          updatedat: string;
        };
        Update: {
          createdat?: string;
          domain?: string | null;
          id?: string;
          name?: string;
          plan?: string;
          planid?: string | null;
          slug?: string | null;
          updatedat?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'Organization_planId_fkey';
            columns: ['planid'];
            isOneToOne: false;
            referencedRelation: 'Plan';
            referencedColumns: ['id'];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string | null;
          custom_domain: string | null;
          feature_flags: Json;
          gateway_api_key: string | null;
          gateway_provider: string | null;
          id: string;
          is_reseller: boolean | null;
          logo_url: string | null;
          name: string;
          niche: string | null;
          owner_email: string | null;
          owner_name: string | null;
          parent_id: string | null;
          plan_id: string | null;
          platform_domain: string | null;
          portal_logo_url: string | null;
          selected_plan_at: string | null;
          slug: string;
          status: string | null;
          subdomain: string | null;
          subscription_status: string | null;
          trial_ends_at: string | null;
          updated_at: string | null;
          webhook_secret: string | null;
        };
        Insert: {
          created_at?: string | null;
          custom_domain?: string | null;
          feature_flags?: Json;
          gateway_api_key?: string | null;
          gateway_provider?: string | null;
          id?: string;
          is_reseller?: boolean | null;
          logo_url?: string | null;
          name: string;
          niche?: string | null;
          owner_email?: string | null;
          owner_name?: string | null;
          parent_id?: string | null;
          plan_id?: string | null;
          platform_domain?: string | null;
          portal_logo_url?: string | null;
          selected_plan_at?: string | null;
          slug: string;
          status?: string | null;
          subdomain?: string | null;
          subscription_status?: string | null;
          trial_ends_at?: string | null;
          updated_at?: string | null;
          webhook_secret?: string | null;
        };
        Update: {
          created_at?: string | null;
          custom_domain?: string | null;
          feature_flags?: Json;
          gateway_api_key?: string | null;
          gateway_provider?: string | null;
          id?: string;
          is_reseller?: boolean | null;
          logo_url?: string | null;
          name?: string;
          niche?: string | null;
          owner_email?: string | null;
          owner_name?: string | null;
          parent_id?: string | null;
          plan_id?: string | null;
          platform_domain?: string | null;
          portal_logo_url?: string | null;
          selected_plan_at?: string | null;
          slug?: string;
          status?: string | null;
          subdomain?: string | null;
          subscription_status?: string | null;
          trial_ends_at?: string | null;
          updated_at?: string | null;
          webhook_secret?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'organizations_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organizations_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_history: {
        Row: {
          amount_due: number | null;
          amount_paid: number | null;
          contract_id: string | null;
          created_at: string | null;
          due_date: string | null;
          id: string;
          observation: string | null;
          organization_id: string | null;
          payment_date: string | null;
          payment_method: string | null;
          status: string | null;
        };
        Insert: {
          amount_due?: number | null;
          amount_paid?: number | null;
          contract_id?: string | null;
          created_at?: string | null;
          due_date?: string | null;
          id?: string;
          observation?: string | null;
          organization_id?: string | null;
          payment_date?: string | null;
          payment_method?: string | null;
          status?: string | null;
        };
        Update: {
          amount_due?: number | null;
          amount_paid?: number | null;
          contract_id?: string | null;
          created_at?: string | null;
          due_date?: string | null;
          id?: string;
          observation?: string | null;
          organization_id?: string | null;
          payment_date?: string | null;
          payment_method?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_history_contract_id_fkey';
            columns: ['contract_id'];
            isOneToOne: false;
            referencedRelation: 'rental_contracts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_history_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      Plan: {
        Row: {
          ailimit: number;
          clientslimit: number;
          createdat: string;
          description: string | null;
          features: Json | null;
          id: string;
          leadslimit: number;
          name: string;
          updatedat: string;
        };
        Insert: {
          ailimit?: number;
          clientslimit?: number;
          createdat?: string;
          description?: string | null;
          features?: Json | null;
          id: string;
          leadslimit?: number;
          name: string;
          updatedat: string;
        };
        Update: {
          ailimit?: number;
          clientslimit?: number;
          createdat?: string;
          description?: string | null;
          features?: Json | null;
          id?: string;
          leadslimit?: number;
          name?: string;
          updatedat?: string;
        };
        Relationships: [];
      };
      plans: {
        Row: {
          created_at: string | null;
          features: Json | null;
          id: string;
          is_active: boolean | null;
          limits: Json | null;
          name: string;
          price_monthly: number | null;
          slug: string | null;
          trial_days: number | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          features?: Json | null;
          id?: string;
          is_active?: boolean | null;
          limits?: Json | null;
          name: string;
          price_monthly?: number | null;
          slug?: string | null;
          trial_days?: number | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          features?: Json | null;
          id?: string;
          is_active?: boolean | null;
          limits?: Json | null;
          name?: string;
          price_monthly?: number | null;
          slug?: string | null;
          trial_days?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      price_history: {
        Row: {
          changed_by: string | null;
          created_at: string | null;
          id: string;
          metadata: Json | null;
          price: number;
          price_per_ha: number | null;
          price_per_m2: number | null;
          property_id: string | null;
          source: string | null;
        };
        Insert: {
          changed_by?: string | null;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          price: number;
          price_per_ha?: number | null;
          price_per_m2?: number | null;
          property_id?: string | null;
          source?: string | null;
        };
        Update: {
          changed_by?: string | null;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          price?: number;
          price_per_ha?: number | null;
          price_per_m2?: number | null;
          property_id?: string | null;
          source?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'price_history_changed_by_fkey';
            columns: ['changed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'price_history_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string | null;
          id: string;
          name: string | null;
          organization_id: string | null;
          role: string | null;
          phone: string | null;
          creci: string | null;
          commission_rate: number | null;
          payment_info: Json | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string | null;
          id: string;
          name?: string | null;
          organization_id?: string | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          name?: string | null;
          organization_id?: string | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      properties: {
        Row: {
          access_type: string | null;
          address: string | null;
          ai_analysis: Json | null;
          aptitude: string[] | null;
          area_benfeitoria_ha: number | null;
          area_total_ha: number | null;
          area_util_ha: number | null;
          boundaries_description: string | null;
          broker_id: string | null;
          certifications: string[] | null;
          city: string | null;
          created_at: string | null;
          currency: string | null;
          description: string | null;
          description_draft: string | null;
          energy_type: string | null;
          environment_id: string | null;
          environmental_licenses: string[] | null;
          external_id: string | null;
          external_listing_status: string | null;
          external_updated_at: string | null;
          favorites_count: number | null;
          features: Json | null;
          highlight_status: string | null;
          highlighted: boolean | null;
          id: string;
          images: string[] | null;
          imported_at: string | null;
          infrastructure: string[] | null;
          location_city: string | null;
          location_coordinates: unknown;
          location_region: string | null;
          location_state: string | null;
          market_value: number | null;
          neighborhood: string | null;
          niche: string | null;
          organization_id: string;
          owner_id: string | null;
          owner_info: Json | null;
          price: number | null;
          price_per_ha: number | null;
          price_per_m2: number | null;
          property_deed: string | null;
          property_title: string | null;
          property_type: string | null;
          published_at: string | null;
          purpose: string | null;
          registration_number: string | null;
          registry_office: string | null;
          rental_value: number | null;
          solo_type: string | null;
          source: string | null;
          state: string | null;
          status: string | null;
          title: string;
          topography: string | null;
          total_area_ha: number | null;
          updated_at: string | null;
          useful_area_ha: number | null;
          video_url: string | null;
          views_count: number | null;
          virtual_tour_url: string | null;
          water_sources: string[] | null;
          zoning: string | null;
        };
        Insert: {
          access_type?: string | null;
          address?: string | null;
          ai_analysis?: Json | null;
          aptitude?: string[] | null;
          area_benfeitoria_ha?: number | null;
          area_total_ha?: number | null;
          area_util_ha?: number | null;
          boundaries_description?: string | null;
          broker_id?: string | null;
          certifications?: string[] | null;
          city?: string | null;
          created_at?: string | null;
          currency?: string | null;
          description?: string | null;
          description_draft?: string | null;
          energy_type?: string | null;
          environment_id?: string | null;
          environmental_licenses?: string[] | null;
          external_id?: string | null;
          external_listing_status?: string | null;
          external_updated_at?: string | null;
          favorites_count?: number | null;
          features?: Json | null;
          highlight_status?: string | null;
          highlighted?: boolean | null;
          id?: string;
          images?: string[] | null;
          imported_at?: string | null;
          infrastructure?: string[] | null;
          location_city?: string | null;
          location_coordinates?: unknown;
          location_region?: string | null;
          location_state?: string | null;
          market_value?: number | null;
          neighborhood?: string | null;
          niche?: string | null;
          organization_id: string;
          owner_id?: string | null;
          owner_info?: Json | null;
          price?: number | null;
          price_per_ha?: number | null;
          price_per_m2?: number | null;
          property_deed?: string | null;
          property_title?: string | null;
          property_type?: string | null;
          published_at?: string | null;
          purpose?: string | null;
          registration_number?: string | null;
          registry_office?: string | null;
          rental_value?: number | null;
          solo_type?: string | null;
          source?: string | null;
          state?: string | null;
          status?: string | null;
          title: string;
          topography?: string | null;
          total_area_ha?: number | null;
          updated_at?: string | null;
          useful_area_ha?: number | null;
          video_url?: string | null;
          views_count?: number | null;
          virtual_tour_url?: string | null;
          water_sources?: string[] | null;
          zoning?: string | null;
        };
        Update: {
          access_type?: string | null;
          address?: string | null;
          ai_analysis?: Json | null;
          aptitude?: string[] | null;
          area_benfeitoria_ha?: number | null;
          area_total_ha?: number | null;
          area_util_ha?: number | null;
          boundaries_description?: string | null;
          broker_id?: string | null;
          certifications?: string[] | null;
          city?: string | null;
          created_at?: string | null;
          currency?: string | null;
          description?: string | null;
          description_draft?: string | null;
          energy_type?: string | null;
          environment_id?: string | null;
          environmental_licenses?: string[] | null;
          external_id?: string | null;
          external_listing_status?: string | null;
          external_updated_at?: string | null;
          favorites_count?: number | null;
          features?: Json | null;
          highlight_status?: string | null;
          highlighted?: boolean | null;
          id?: string;
          images?: string[] | null;
          imported_at?: string | null;
          infrastructure?: string[] | null;
          location_city?: string | null;
          location_coordinates?: unknown;
          location_region?: string | null;
          location_state?: string | null;
          market_value?: number | null;
          neighborhood?: string | null;
          niche?: string | null;
          organization_id?: string;
          owner_id?: string | null;
          owner_info?: Json | null;
          price?: number | null;
          price_per_ha?: number | null;
          price_per_m2?: number | null;
          property_deed?: string | null;
          property_title?: string | null;
          property_type?: string | null;
          published_at?: string | null;
          purpose?: string | null;
          registration_number?: string | null;
          registry_office?: string | null;
          rental_value?: number | null;
          solo_type?: string | null;
          source?: string | null;
          state?: string | null;
          status?: string | null;
          title?: string;
          topography?: string | null;
          total_area_ha?: number | null;
          updated_at?: string | null;
          useful_area_ha?: number | null;
          video_url?: string | null;
          views_count?: number | null;
          virtual_tour_url?: string | null;
          water_sources?: string[] | null;
          zoning?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'properties_broker_id_fkey';
            columns: ['broker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'properties_environment_id_fkey';
            columns: ['environment_id'];
            isOneToOne: false;
            referencedRelation: 'environments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'properties_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'properties_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      property_polygons: {
        Row: {
          area_ha: number | null;
          created_at: string | null;
          geometry: unknown;
          id: string;
          name: string | null;
          property_id: string | null;
        };
        Insert: {
          area_ha?: number | null;
          created_at?: string | null;
          geometry?: unknown;
          id?: string;
          name?: string | null;
          property_id?: string | null;
        };
        Update: {
          area_ha?: number | null;
          created_at?: string | null;
          geometry?: unknown;
          id?: string;
          name?: string | null;
          property_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'property_polygons_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
      property_valuations: {
        Row: {
          breakdown: Json | null;
          confidence: number | null;
          created_at: string | null;
          currency: string | null;
          estimated_value: number;
          factors: Json | null;
          id: string;
          max_value: number | null;
          method: string;
          min_value: number | null;
          model_version: string | null;
          organization_id: string | null;
          property_id: string | null;
          rules_applied: string[] | null;
          triggered_at: string | null;
          triggered_by: string | null;
        };
        Insert: {
          breakdown?: Json | null;
          confidence?: number | null;
          created_at?: string | null;
          currency?: string | null;
          estimated_value: number;
          factors?: Json | null;
          id?: string;
          max_value?: number | null;
          method: string;
          min_value?: number | null;
          model_version?: string | null;
          organization_id?: string | null;
          property_id?: string | null;
          rules_applied?: string[] | null;
          triggered_at?: string | null;
          triggered_by?: string | null;
        };
        Update: {
          breakdown?: Json | null;
          confidence?: number | null;
          created_at?: string | null;
          currency?: string | null;
          estimated_value?: number;
          factors?: Json | null;
          id?: string;
          max_value?: number | null;
          method?: string;
          min_value?: number | null;
          model_version?: string | null;
          organization_id?: string | null;
          property_id?: string | null;
          rules_applied?: string[] | null;
          triggered_at?: string | null;
          triggered_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'property_valuations_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'property_valuations_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'property_valuations_triggered_by_fkey';
            columns: ['triggered_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      quiz_campaigns: {
        Row: {
          branding: Json;
          created_at: string;
          created_by: string | null;
          disqualification_message: string;
          id: string;
          intro_copy: string;
          intro_title: string;
          organization_id: string;
          property_label: string;
          qualification_threshold: number;
          questions: Json;
          slug: string;
          status: string;
          success_message: string;
          title: string;
          updated_at: string;
          whatsapp_number: string;
        };
        Insert: {
          branding?: Json;
          created_at?: string;
          created_by?: string | null;
          disqualification_message: string;
          id?: string;
          intro_copy: string;
          intro_title: string;
          organization_id: string;
          property_label: string;
          qualification_threshold?: number;
          questions?: Json;
          slug: string;
          status?: string;
          success_message: string;
          title: string;
          updated_at?: string;
          whatsapp_number: string;
        };
        Update: {
          branding?: Json;
          created_at?: string;
          created_by?: string | null;
          disqualification_message?: string;
          id?: string;
          intro_copy?: string;
          intro_title?: string;
          organization_id?: string;
          property_label?: string;
          qualification_threshold?: number;
          questions?: Json;
          slug?: string;
          status?: string;
          success_message?: string;
          title?: string;
          updated_at?: string;
          whatsapp_number?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quiz_campaigns_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      quiz_submissions: {
        Row: {
          answers: Json;
          campaign_id: string;
          created_at: string;
          disqualification_reasons: string[];
          email: string | null;
          id: string;
          lead_id: string | null;
          name: string;
          organization_id: string;
          phone: string;
          qualification_status: string;
          score: number;
          utm: Json;
        };
        Insert: {
          answers?: Json;
          campaign_id: string;
          created_at?: string;
          disqualification_reasons?: string[];
          email?: string | null;
          id?: string;
          lead_id?: string | null;
          name: string;
          organization_id: string;
          phone: string;
          qualification_status: string;
          score?: number;
          utm?: Json;
        };
        Update: {
          answers?: Json;
          campaign_id?: string;
          created_at?: string;
          disqualification_reasons?: string[];
          email?: string | null;
          id?: string;
          lead_id?: string | null;
          name?: string;
          organization_id?: string;
          phone?: string;
          qualification_status?: string;
          score?: number;
          utm?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'quiz_submissions_campaign_id_fkey';
            columns: ['campaign_id'];
            isOneToOne: false;
            referencedRelation: 'quiz_campaigns';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quiz_submissions_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quiz_submissions_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      rental_contracts: {
        Row: {
          adjustment_index: string | null;
          analysis_notes: string | null;
          created_at: string | null;
          credit_score: number | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          end_date: string | null;
          environment_id: string | null;
          evaluation_score: number | null;
          evaluation_status: string | null;
          guarantee_document: string | null;
          guarantee_type: string | null;
          guarantor_cpf: string | null;
          guarantor_monthly_income: number | null;
          guarantor_name: string | null;
          guarantor_phone: string | null;
          has_restrictions: boolean | null;
          id: string;
          income_proof_status: string | null;
          monthly_rent: number | null;
          observation: string | null;
          organization_id: string | null;
          payment_status: string | null;
          property_id: string | null;
          recommended_limit: number | null;
          reference_1_name: string | null;
          reference_1_phone: string | null;
          reference_2_name: string | null;
          reference_2_phone: string | null;
          restriction_notes: string | null;
          start_date: string | null;
          status: string | null;
          tenant_address: string | null;
          tenant_birth_date: string | null;
          tenant_city: string | null;
          tenant_cpf: string | null;
          tenant_email: string | null;
          tenant_employer: string | null;
          tenant_marital_status: string | null;
          tenant_monthly_income: number | null;
          tenant_name: string;
          tenant_phone: string | null;
          tenant_profession: string | null;
          tenant_rg: string | null;
          tenant_state: string | null;
          tenant_zip: string | null;
          updated_at: string | null;
        };
        Insert: {
          adjustment_index?: string | null;
          analysis_notes?: string | null;
          created_at?: string | null;
          credit_score?: number | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          end_date?: string | null;
          environment_id?: string | null;
          evaluation_score?: number | null;
          evaluation_status?: string | null;
          guarantee_document?: string | null;
          guarantee_type?: string | null;
          guarantor_cpf?: string | null;
          guarantor_monthly_income?: number | null;
          guarantor_name?: string | null;
          guarantor_phone?: string | null;
          has_restrictions?: boolean | null;
          id?: string;
          income_proof_status?: string | null;
          monthly_rent?: number | null;
          observation?: string | null;
          organization_id?: string | null;
          payment_status?: string | null;
          property_id?: string | null;
          recommended_limit?: number | null;
          reference_1_name?: string | null;
          reference_1_phone?: string | null;
          reference_2_name?: string | null;
          reference_2_phone?: string | null;
          restriction_notes?: string | null;
          start_date?: string | null;
          status?: string | null;
          tenant_address?: string | null;
          tenant_birth_date?: string | null;
          tenant_city?: string | null;
          tenant_cpf?: string | null;
          tenant_email?: string | null;
          tenant_employer?: string | null;
          tenant_marital_status?: string | null;
          tenant_monthly_income?: number | null;
          tenant_name: string;
          tenant_phone?: string | null;
          tenant_profession?: string | null;
          tenant_rg?: string | null;
          tenant_state?: string | null;
          tenant_zip?: string | null;
          updated_at?: string | null;
        };
        Update: {
          adjustment_index?: string | null;
          analysis_notes?: string | null;
          created_at?: string | null;
          credit_score?: number | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          end_date?: string | null;
          environment_id?: string | null;
          evaluation_score?: number | null;
          evaluation_status?: string | null;
          guarantee_document?: string | null;
          guarantee_type?: string | null;
          guarantor_cpf?: string | null;
          guarantor_monthly_income?: number | null;
          guarantor_name?: string | null;
          guarantor_phone?: string | null;
          has_restrictions?: boolean | null;
          id?: string;
          income_proof_status?: string | null;
          monthly_rent?: number | null;
          observation?: string | null;
          organization_id?: string | null;
          payment_status?: string | null;
          property_id?: string | null;
          recommended_limit?: number | null;
          reference_1_name?: string | null;
          reference_1_phone?: string | null;
          reference_2_name?: string | null;
          reference_2_phone?: string | null;
          restriction_notes?: string | null;
          start_date?: string | null;
          status?: string | null;
          tenant_address?: string | null;
          tenant_birth_date?: string | null;
          tenant_city?: string | null;
          tenant_cpf?: string | null;
          tenant_email?: string | null;
          tenant_employer?: string | null;
          tenant_marital_status?: string | null;
          tenant_monthly_income?: number | null;
          tenant_name?: string;
          tenant_phone?: string | null;
          tenant_profession?: string | null;
          tenant_rg?: string | null;
          tenant_state?: string | null;
          tenant_zip?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'rental_contracts_environment_id_fkey';
            columns: ['environment_id'];
            isOneToOne: false;
            referencedRelation: 'environments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rental_contracts_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rental_contracts_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
      reseller_infrastructure: {
        Row: {
          created_at: string | null;
          domain: string;
          id: string;
          is_active: boolean | null;
          minio_access_key: string | null;
          minio_bucket_name: string | null;
          minio_endpoint: string | null;
          minio_secret_key: string | null;
          organization_id: string;
          supabase_anon_key: string | null;
          supabase_service_role_key: string | null;
          supabase_url: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          domain: string;
          id?: string;
          is_active?: boolean | null;
          minio_access_key?: string | null;
          minio_bucket_name?: string | null;
          minio_endpoint?: string | null;
          minio_secret_key?: string | null;
          organization_id: string;
          supabase_anon_key?: string | null;
          supabase_service_role_key?: string | null;
          supabase_url?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          domain?: string;
          id?: string;
          is_active?: boolean | null;
          minio_access_key?: string | null;
          minio_bucket_name?: string | null;
          minio_endpoint?: string | null;
          minio_secret_key?: string | null;
          organization_id?: string;
          supabase_anon_key?: string | null;
          supabase_service_role_key?: string | null;
          supabase_url?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reseller_infrastructure_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: true;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      rural_location_search_logs: {
        Row: {
          confidence: string | null;
          created_at: string | null;
          error_message: string | null;
          google_maps_url: string | null;
          id: string;
          lat: number;
          lng: number;
          match_mode: string | null;
          municipality: string | null;
          organization_id: string | null;
          request_payload: Json | null;
          response_summary: Json | null;
          source_endpoint: string | null;
          source_layer: string | null;
          total_matches: number | null;
          uf: string | null;
          user_id: string | null;
        };
        Insert: {
          confidence?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          google_maps_url?: string | null;
          id?: string;
          lat: number;
          lng: number;
          match_mode?: string | null;
          municipality?: string | null;
          organization_id?: string | null;
          request_payload?: Json | null;
          response_summary?: Json | null;
          source_endpoint?: string | null;
          source_layer?: string | null;
          total_matches?: number | null;
          uf?: string | null;
          user_id?: string | null;
        };
        Update: {
          confidence?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          google_maps_url?: string | null;
          id?: string;
          lat?: number;
          lng?: number;
          match_mode?: string | null;
          municipality?: string | null;
          organization_id?: string | null;
          request_payload?: Json | null;
          response_summary?: Json | null;
          source_endpoint?: string | null;
          source_layer?: string | null;
          total_matches?: number | null;
          uf?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      saas_settings: {
        Row: {
          created_at: string | null;
          default_plan_id: string | null;
          global_evolution_api_key: string | null;
          global_evolution_url: string | null;
          id: number;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          default_plan_id?: string | null;
          global_evolution_api_key?: string | null;
          global_evolution_url?: string | null;
          id?: number;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          default_plan_id?: string | null;
          global_evolution_api_key?: string | null;
          global_evolution_url?: string | null;
          id?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'saas_settings_default_plan_id_fkey';
            columns: ['default_plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      site_settings: {
        Row: {
          agency_name: string | null;
          contact: Json | null;
          contact_email: string | null;
          contact_phone: string | null;
          contact_whatsapp_template: string | null;
          created_at: string | null;
          environment_id: string | null;
          facebook_url: string | null;
          footer_text: string | null;
          header_color: string | null;
          id: string;
          instagram_url: string | null;
          integrations: Json | null;
          is_live: boolean | null;
          layout_config: Json | null;
          linkedin_url: string | null;
          logo_url: string | null;
          onboarding_config: Json | null;
          organization_id: string | null;
          primary_color: string | null;
          secondary_color: string | null;
          seo: Json | null;
          smtp_config: Json | null;
          social_links: Json | null;
          theme: Json | null;
          tracking_pixels: Json | null;
          updated_at: string | null;
          whatsapp_url: string | null;
          youtube_url: string | null;
        };
        Insert: {
          agency_name?: string | null;
          contact?: Json | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          contact_whatsapp_template?: string | null;
          created_at?: string | null;
          environment_id?: string | null;
          facebook_url?: string | null;
          footer_text?: string | null;
          header_color?: string | null;
          id?: string;
          instagram_url?: string | null;
          integrations?: Json | null;
          is_live?: boolean | null;
          layout_config?: Json | null;
          linkedin_url?: string | null;
          logo_url?: string | null;
          onboarding_config?: Json | null;
          organization_id?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          seo?: Json | null;
          smtp_config?: Json | null;
          social_links?: Json | null;
          theme?: Json | null;
          tracking_pixels?: Json | null;
          updated_at?: string | null;
          whatsapp_url?: string | null;
          youtube_url?: string | null;
        };
        Update: {
          agency_name?: string | null;
          contact?: Json | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          contact_whatsapp_template?: string | null;
          created_at?: string | null;
          environment_id?: string | null;
          facebook_url?: string | null;
          footer_text?: string | null;
          header_color?: string | null;
          id?: string;
          instagram_url?: string | null;
          integrations?: Json | null;
          is_live?: boolean | null;
          layout_config?: Json | null;
          linkedin_url?: string | null;
          logo_url?: string | null;
          onboarding_config?: Json | null;
          organization_id?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          seo?: Json | null;
          smtp_config?: Json | null;
          social_links?: Json | null;
          theme?: Json | null;
          tracking_pixels?: Json | null;
          updated_at?: string | null;
          whatsapp_url?: string | null;
          youtube_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'site_settings_environment_id_fkey';
            columns: ['environment_id'];
            isOneToOne: false;
            referencedRelation: 'environments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'site_settings_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: true;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      site_texts: {
        Row: {
          created_at: string | null;
          id: string;
          key: string;
          organization_id: string | null;
          section: string | null;
          updated_at: string | null;
          value: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          key: string;
          organization_id?: string | null;
          section?: string | null;
          updated_at?: string | null;
          value?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          key?: string;
          organization_id?: string | null;
          section?: string | null;
          updated_at?: string | null;
          value?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'site_texts_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      spatial_ref_sys: {
        Row: {
          auth_name: string | null;
          auth_srid: number | null;
          proj4text: string | null;
          srid: number;
          srtext: string | null;
        };
        Insert: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid: number;
          srtext?: string | null;
        };
        Update: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid?: number;
          srtext?: string | null;
        };
        Relationships: [];
      };
      storage_admin_actions: {
        Row: {
          action: string;
          admin_id: string | null;
          bucket: string | null;
          created_at: string | null;
          details: Json | null;
          id: string;
        };
        Insert: {
          action: string;
          admin_id?: string | null;
          bucket?: string | null;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
        };
        Update: {
          action?: string;
          admin_id?: string | null;
          bucket?: string | null;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'storage_admin_actions_admin_id_fkey';
            columns: ['admin_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      storage_inventory_snapshots: {
        Row: {
          bucket: string;
          etag: string | null;
          extension: string | null;
          id: string;
          is_delete_marker: boolean | null;
          is_version: boolean | null;
          last_modified: string | null;
          object_key: string;
          prefix: string | null;
          scanned_at: string | null;
          size_bytes: number | null;
          tenant_id: string | null;
          version_id: string | null;
        };
        Insert: {
          bucket: string;
          etag?: string | null;
          extension?: string | null;
          id?: string;
          is_delete_marker?: boolean | null;
          is_version?: boolean | null;
          last_modified?: string | null;
          object_key: string;
          prefix?: string | null;
          scanned_at?: string | null;
          size_bytes?: number | null;
          tenant_id?: string | null;
          version_id?: string | null;
        };
        Update: {
          bucket?: string;
          etag?: string | null;
          extension?: string | null;
          id?: string;
          is_delete_marker?: boolean | null;
          is_version?: boolean | null;
          last_modified?: string | null;
          object_key?: string;
          prefix?: string | null;
          scanned_at?: string | null;
          size_bytes?: number | null;
          tenant_id?: string | null;
          version_id?: string | null;
        };
        Relationships: [];
      };
      storage_objects: {
        Row: {
          bucket: string;
          created_at: string | null;
          deleted_at: string | null;
          entity_id: string | null;
          entity_type: string | null;
          etag: string | null;
          expires_at: string | null;
          id: string;
          mime_type: string | null;
          object_key: string;
          sha256: string | null;
          size_bytes: number | null;
          source: string | null;
          tenant_id: string | null;
        };
        Insert: {
          bucket: string;
          created_at?: string | null;
          deleted_at?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          etag?: string | null;
          expires_at?: string | null;
          id?: string;
          mime_type?: string | null;
          object_key: string;
          sha256?: string | null;
          size_bytes?: number | null;
          source?: string | null;
          tenant_id?: string | null;
        };
        Update: {
          bucket?: string;
          created_at?: string | null;
          deleted_at?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          etag?: string | null;
          expires_at?: string | null;
          id?: string;
          mime_type?: string | null;
          object_key?: string;
          sha256?: string | null;
          size_bytes?: number | null;
          source?: string | null;
          tenant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'storage_objects_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      support_messages: {
        Row: {
          created_at: string | null;
          id: string;
          is_admin_reply: boolean | null;
          message: string;
          ticket_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_admin_reply?: boolean | null;
          message: string;
          ticket_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_admin_reply?: boolean | null;
          message?: string;
          ticket_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'support_messages_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'support_tickets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_messages_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      support_tickets: {
        Row: {
          created_at: string | null;
          description: string;
          id: string;
          organization_id: string | null;
          priority: string;
          status: string;
          subject: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          description: string;
          id?: string;
          organization_id?: string | null;
          priority?: string;
          status?: string;
          subject: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string;
          id?: string;
          organization_id?: string | null;
          priority?: string;
          status?: string;
          subject?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'support_tickets_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_tickets_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      User: {
        Row: {
          accessprofileid: string | null;
          createdat: string;
          email: string;
          id: string;
          name: string | null;
          organizationid: string | null;
          password: string;
          permissions: Json | null;
          role: string;
          status: string;
          updatedat: string;
        };
        Insert: {
          accessprofileid?: string | null;
          createdat?: string;
          email: string;
          id: string;
          name?: string | null;
          organizationid?: string | null;
          password: string;
          permissions?: Json | null;
          role?: string;
          status?: string;
          updatedat?: string;
        };
        Update: {
          accessprofileid?: string | null;
          createdat?: string;
          email?: string;
          id?: string;
          name?: string | null;
          organizationid?: string | null;
          password?: string;
          permissions?: Json | null;
          role?: string;
          status?: string;
          updatedat?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'User_accessProfileId_fkey';
            columns: ['accessprofileid'];
            isOneToOne: false;
            referencedRelation: 'AccessProfile';
            referencedColumns: ['id'];
          },
        ];
      };
      valuation_rules: {
        Row: {
          city: string | null;
          conditions: Json;
          created_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          organization_id: string | null;
          priority: number | null;
          property_type: string | null;
          rule_type: string;
          state: string | null;
          updated_at: string | null;
          value: number;
        };
        Insert: {
          city?: string | null;
          conditions?: Json;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          organization_id?: string | null;
          priority?: number | null;
          property_type?: string | null;
          rule_type: string;
          state?: string | null;
          updated_at?: string | null;
          value: number;
        };
        Update: {
          city?: string | null;
          conditions?: Json;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          organization_id?: string | null;
          priority?: number | null;
          property_type?: string | null;
          rule_type?: string;
          state?: string | null;
          updated_at?: string | null;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'valuation_rules_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      whatsapp_chats: {
        Row: {
          avatar_url: string | null;
          chat_jid: string;
          created_at: string;
          id: string;
          instance_id: string;
          is_group: boolean;
          last_message: string | null;
          last_message_at: string | null;
          name: string;
          unread_count: number;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          chat_jid: string;
          created_at?: string;
          id?: string;
          instance_id: string;
          is_group?: boolean;
          last_message?: string | null;
          last_message_at?: string | null;
          name?: string;
          unread_count?: number;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          chat_jid?: string;
          created_at?: string;
          id?: string;
          instance_id?: string;
          is_group?: boolean;
          last_message?: string | null;
          last_message_at?: string | null;
          name?: string;
          unread_count?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsapp_chats_instance_id_fkey';
            columns: ['instance_id'];
            isOneToOne: false;
            referencedRelation: 'whatsapp_instances';
            referencedColumns: ['id'];
          },
        ];
      };
      whatsapp_contacts: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          id: string;
          instance_id: string;
          phone: string;
          push_name: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name: string;
          id?: string;
          instance_id: string;
          phone: string;
          push_name?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          instance_id?: string;
          phone?: string;
          push_name?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsapp_contacts_instance_id_fkey';
            columns: ['instance_id'];
            isOneToOne: false;
            referencedRelation: 'whatsapp_instances';
            referencedColumns: ['id'];
          },
        ];
      };
      whatsapp_instances: {
        Row: {
          created_at: string;
          environment_id: string | null;
          id: string;
          jid: string | null;
          name: string;
          phone: string | null;
          qr_code: string | null;
          status: string;
          tenant_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          environment_id?: string | null;
          id?: string;
          jid?: string | null;
          name: string;
          phone?: string | null;
          qr_code?: string | null;
          status?: string;
          tenant_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          environment_id?: string | null;
          id?: string;
          jid?: string | null;
          name?: string;
          phone?: string | null;
          qr_code?: string | null;
          status?: string;
          tenant_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsapp_instances_environment_id_fkey';
            columns: ['environment_id'];
            isOneToOne: false;
            referencedRelation: 'environments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'whatsapp_instances_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      whatsapp_media: {
        Row: {
          ai_metadata: Json;
          bucket: string;
          claimed_at: string | null;
          created_at: string;
          duration_ms: number | null;
          extracted_tasks: Json | null;
          filename: string | null;
          height: number | null;
          id: string;
          instance_id: string;
          last_error: string | null;
          message_id: string;
          mime_type: string | null;
          next_retry_at: string;
          object_key: string;
          ocr_text: string | null;
          provider: string;
          public_url: string | null;
          retry_count: number;
          sentiment: string | null;
          size_bytes: number | null;
          source_message_id: string | null;
          status: string;
          summary: string | null;
          tenant_id: string;
          thumbnail_bucket: string | null;
          thumbnail_object_key: string | null;
          thumbnail_url: string | null;
          transcription: string | null;
          type: string;
          updated_at: string;
          waveform: Json | null;
          whatsapp_payload: string | null;
          width: number | null;
        };
        Insert: {
          ai_metadata?: Json;
          bucket?: string;
          claimed_at?: string | null;
          created_at?: string;
          duration_ms?: number | null;
          extracted_tasks?: Json | null;
          filename?: string | null;
          height?: number | null;
          id?: string;
          instance_id: string;
          last_error?: string | null;
          message_id: string;
          mime_type?: string | null;
          next_retry_at?: string;
          object_key?: string;
          ocr_text?: string | null;
          provider?: string;
          public_url?: string | null;
          retry_count?: number;
          sentiment?: string | null;
          size_bytes?: number | null;
          source_message_id?: string | null;
          status?: string;
          summary?: string | null;
          tenant_id: string;
          thumbnail_bucket?: string | null;
          thumbnail_object_key?: string | null;
          thumbnail_url?: string | null;
          transcription?: string | null;
          type: string;
          updated_at?: string;
          waveform?: Json | null;
          whatsapp_payload?: string | null;
          width?: number | null;
        };
        Update: {
          ai_metadata?: Json;
          bucket?: string;
          claimed_at?: string | null;
          created_at?: string;
          duration_ms?: number | null;
          extracted_tasks?: Json | null;
          filename?: string | null;
          height?: number | null;
          id?: string;
          instance_id?: string;
          last_error?: string | null;
          message_id?: string;
          mime_type?: string | null;
          next_retry_at?: string;
          object_key?: string;
          ocr_text?: string | null;
          provider?: string;
          public_url?: string | null;
          retry_count?: number;
          sentiment?: string | null;
          size_bytes?: number | null;
          source_message_id?: string | null;
          status?: string;
          summary?: string | null;
          tenant_id?: string;
          thumbnail_bucket?: string | null;
          thumbnail_object_key?: string | null;
          thumbnail_url?: string | null;
          transcription?: string | null;
          type?: string;
          updated_at?: string;
          waveform?: Json | null;
          whatsapp_payload?: string | null;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsapp_media_instance_id_fkey';
            columns: ['instance_id'];
            isOneToOne: false;
            referencedRelation: 'whatsapp_instances';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'whatsapp_media_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'whatsapp_messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'whatsapp_media_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      whatsapp_messages: {
        Row: {
          chat_id: string;
          content: string | null;
          created_at: string;
          delivery_status: string;
          id: string;
          instance_id: string;
          is_from_me: boolean;
          is_group: boolean;
          media_error: string | null;
          media_filename: string | null;
          media_mimetype: string | null;
          media_retry_count: number;
          media_status: string;
          media_url: string | null;
          message_id: string;
          quoted_message_id: string | null;
          sender_name: string;
          sender_phone: string;
          timestamp: string;
          type: string;
        };
        Insert: {
          chat_id: string;
          content?: string | null;
          created_at?: string;
          delivery_status?: string;
          id?: string;
          instance_id: string;
          is_from_me?: boolean;
          is_group?: boolean;
          media_error?: string | null;
          media_filename?: string | null;
          media_mimetype?: string | null;
          media_retry_count?: number;
          media_status?: string;
          media_url?: string | null;
          message_id: string;
          quoted_message_id?: string | null;
          sender_name?: string;
          sender_phone: string;
          timestamp?: string;
          type?: string;
        };
        Update: {
          chat_id?: string;
          content?: string | null;
          created_at?: string;
          delivery_status?: string;
          id?: string;
          instance_id?: string;
          is_from_me?: boolean;
          is_group?: boolean;
          media_error?: string | null;
          media_filename?: string | null;
          media_mimetype?: string | null;
          media_retry_count?: number;
          media_status?: string;
          media_url?: string | null;
          message_id?: string;
          quoted_message_id?: string | null;
          sender_name?: string;
          sender_phone?: string;
          timestamp?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsapp_messages_chat_id_fkey';
            columns: ['chat_id'];
            isOneToOne: false;
            referencedRelation: 'whatsapp_chats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'whatsapp_messages_instance_id_fkey';
            columns: ['instance_id'];
            isOneToOne: false;
            referencedRelation: 'whatsapp_instances';
            referencedColumns: ['id'];
          },
        ];
      };
      whatsmeow_app_state_mutation_macs: {
        Row: {
          index_mac: string;
          jid: string;
          name: string;
          value_mac: string;
          version: number;
        };
        Insert: {
          index_mac: string;
          jid: string;
          name: string;
          value_mac: string;
          version: number;
        };
        Update: {
          index_mac?: string;
          jid?: string;
          name?: string;
          value_mac?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsmeow_app_state_mutation_macs_jid_name_fkey';
            columns: ['jid', 'name'];
            isOneToOne: false;
            referencedRelation: 'whatsmeow_app_state_version';
            referencedColumns: ['jid', 'name'];
          },
        ];
      };
      whatsmeow_app_state_sync_keys: {
        Row: {
          fingerprint: string;
          jid: string;
          key_data: string;
          key_id: string;
          timestamp: number;
        };
        Insert: {
          fingerprint: string;
          jid: string;
          key_data: string;
          key_id: string;
          timestamp: number;
        };
        Update: {
          fingerprint?: string;
          jid?: string;
          key_data?: string;
          key_id?: string;
          timestamp?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsmeow_app_state_sync_keys_jid_fkey';
            columns: ['jid'];
            isOneToOne: false;
            referencedRelation: 'whatsmeow_device';
            referencedColumns: ['jid'];
          },
        ];
      };
      whatsmeow_app_state_version: {
        Row: {
          hash: string;
          jid: string;
          name: string;
          version: number;
        };
        Insert: {
          hash: string;
          jid: string;
          name: string;
          version: number;
        };
        Update: {
          hash?: string;
          jid?: string;
          name?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsmeow_app_state_version_jid_fkey';
            columns: ['jid'];
            isOneToOne: false;
            referencedRelation: 'whatsmeow_device';
            referencedColumns: ['jid'];
          },
        ];
      };
      whatsmeow_chat_settings: {
        Row: {
          archived: boolean;
          chat_jid: string;
          muted_until: number;
          our_jid: string;
          pinned: boolean;
        };
        Insert: {
          archived?: boolean;
          chat_jid: string;
          muted_until?: number;
          our_jid: string;
          pinned?: boolean;
        };
        Update: {
          archived?: boolean;
          chat_jid?: string;
          muted_until?: number;
          our_jid?: string;
          pinned?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsmeow_chat_settings_our_jid_fkey';
            columns: ['our_jid'];
            isOneToOne: false;
            referencedRelation: 'whatsmeow_device';
            referencedColumns: ['jid'];
          },
        ];
      };
      whatsmeow_contacts: {
        Row: {
          business_name: string | null;
          first_name: string | null;
          full_name: string | null;
          our_jid: string;
          push_name: string | null;
          redacted_phone: string | null;
          their_jid: string;
        };
        Insert: {
          business_name?: string | null;
          first_name?: string | null;
          full_name?: string | null;
          our_jid: string;
          push_name?: string | null;
          redacted_phone?: string | null;
          their_jid: string;
        };
        Update: {
          business_name?: string | null;
          first_name?: string | null;
          full_name?: string | null;
          our_jid?: string;
          push_name?: string | null;
          redacted_phone?: string | null;
          their_jid?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsmeow_contacts_our_jid_fkey';
            columns: ['our_jid'];
            isOneToOne: false;
            referencedRelation: 'whatsmeow_device';
            referencedColumns: ['jid'];
          },
        ];
      };
      whatsmeow_device: {
        Row: {
          adv_account_sig: string;
          adv_account_sig_key: string;
          adv_details: string;
          adv_device_sig: string;
          adv_key: string;
          business_name: string;
          facebook_uuid: string | null;
          identity_key: string;
          jid: string;
          lid: string | null;
          lid_migration_ts: number;
          noise_key: string;
          platform: string;
          push_name: string;
          registration_id: number;
          signed_pre_key: string;
          signed_pre_key_id: number;
          signed_pre_key_sig: string;
        };
        Insert: {
          adv_account_sig: string;
          adv_account_sig_key: string;
          adv_details: string;
          adv_device_sig: string;
          adv_key: string;
          business_name?: string;
          facebook_uuid?: string | null;
          identity_key: string;
          jid: string;
          lid?: string | null;
          lid_migration_ts?: number;
          noise_key: string;
          platform?: string;
          push_name?: string;
          registration_id: number;
          signed_pre_key: string;
          signed_pre_key_id: number;
          signed_pre_key_sig: string;
        };
        Update: {
          adv_account_sig?: string;
          adv_account_sig_key?: string;
          adv_details?: string;
          adv_device_sig?: string;
          adv_key?: string;
          business_name?: string;
          facebook_uuid?: string | null;
          identity_key?: string;
          jid?: string;
          lid?: string | null;
          lid_migration_ts?: number;
          noise_key?: string;
          platform?: string;
          push_name?: string;
          registration_id?: number;
          signed_pre_key?: string;
          signed_pre_key_id?: number;
          signed_pre_key_sig?: string;
        };
        Relationships: [];
      };
      whatsmeow_event_buffer: {
        Row: {
          ciphertext_hash: string;
          insert_timestamp: number;
          our_jid: string;
          plaintext: string | null;
          server_timestamp: number;
        };
        Insert: {
          ciphertext_hash: string;
          insert_timestamp: number;
          our_jid: string;
          plaintext?: string | null;
          server_timestamp: number;
        };
        Update: {
          ciphertext_hash?: string;
          insert_timestamp?: number;
          our_jid?: string;
          plaintext?: string | null;
          server_timestamp?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsmeow_event_buffer_our_jid_fkey';
            columns: ['our_jid'];
            isOneToOne: false;
            referencedRelation: 'whatsmeow_device';
            referencedColumns: ['jid'];
          },
        ];
      };
      whatsmeow_identity_keys: {
        Row: {
          identity: string;
          our_jid: string;
          their_id: string;
        };
        Insert: {
          identity: string;
          our_jid: string;
          their_id: string;
        };
        Update: {
          identity?: string;
          our_jid?: string;
          their_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsmeow_identity_keys_our_jid_fkey';
            columns: ['our_jid'];
            isOneToOne: false;
            referencedRelation: 'whatsmeow_device';
            referencedColumns: ['jid'];
          },
        ];
      };
      whatsmeow_lid_map: {
        Row: {
          lid: string;
          pn: string;
        };
        Insert: {
          lid: string;
          pn: string;
        };
        Update: {
          lid?: string;
          pn?: string;
        };
        Relationships: [];
      };
      whatsmeow_message_secrets: {
        Row: {
          chat_jid: string;
          key: string;
          message_id: string;
          our_jid: string;
          sender_jid: string;
        };
        Insert: {
          chat_jid: string;
          key: string;
          message_id: string;
          our_jid: string;
          sender_jid: string;
        };
        Update: {
          chat_jid?: string;
          key?: string;
          message_id?: string;
          our_jid?: string;
          sender_jid?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsmeow_message_secrets_our_jid_fkey';
            columns: ['our_jid'];
            isOneToOne: false;
            referencedRelation: 'whatsmeow_device';
            referencedColumns: ['jid'];
          },
        ];
      };
      whatsmeow_pre_keys: {
        Row: {
          jid: string;
          key: string;
          key_id: number;
          uploaded: boolean;
        };
        Insert: {
          jid: string;
          key: string;
          key_id: number;
          uploaded: boolean;
        };
        Update: {
          jid?: string;
          key?: string;
          key_id?: number;
          uploaded?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsmeow_pre_keys_jid_fkey';
            columns: ['jid'];
            isOneToOne: false;
            referencedRelation: 'whatsmeow_device';
            referencedColumns: ['jid'];
          },
        ];
      };
      whatsmeow_privacy_tokens: {
        Row: {
          our_jid: string;
          sender_timestamp: number | null;
          their_jid: string;
          timestamp: number;
          token: string;
        };
        Insert: {
          our_jid: string;
          sender_timestamp?: number | null;
          their_jid: string;
          timestamp: number;
          token: string;
        };
        Update: {
          our_jid?: string;
          sender_timestamp?: number | null;
          their_jid?: string;
          timestamp?: number;
          token?: string;
        };
        Relationships: [];
      };
      whatsmeow_retry_buffer: {
        Row: {
          chat_jid: string;
          format: string;
          message_id: string;
          our_jid: string;
          plaintext: string;
          timestamp: number;
        };
        Insert: {
          chat_jid: string;
          format: string;
          message_id: string;
          our_jid: string;
          plaintext: string;
          timestamp: number;
        };
        Update: {
          chat_jid?: string;
          format?: string;
          message_id?: string;
          our_jid?: string;
          plaintext?: string;
          timestamp?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsmeow_retry_buffer_our_jid_fkey';
            columns: ['our_jid'];
            isOneToOne: false;
            referencedRelation: 'whatsmeow_device';
            referencedColumns: ['jid'];
          },
        ];
      };
      whatsmeow_sender_keys: {
        Row: {
          chat_id: string;
          our_jid: string;
          sender_id: string;
          sender_key: string;
        };
        Insert: {
          chat_id: string;
          our_jid: string;
          sender_id: string;
          sender_key: string;
        };
        Update: {
          chat_id?: string;
          our_jid?: string;
          sender_id?: string;
          sender_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsmeow_sender_keys_our_jid_fkey';
            columns: ['our_jid'];
            isOneToOne: false;
            referencedRelation: 'whatsmeow_device';
            referencedColumns: ['jid'];
          },
        ];
      };
      whatsmeow_sessions: {
        Row: {
          our_jid: string;
          session: string | null;
          their_id: string;
        };
        Insert: {
          our_jid: string;
          session?: string | null;
          their_id: string;
        };
        Update: {
          our_jid?: string;
          session?: string | null;
          their_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsmeow_sessions_our_jid_fkey';
            columns: ['our_jid'];
            isOneToOne: false;
            referencedRelation: 'whatsmeow_device';
            referencedColumns: ['jid'];
          },
        ];
      };
      whatsmeow_version: {
        Row: {
          compat: number | null;
          version: number | null;
        };
        Insert: {
          compat?: number | null;
          version?: number | null;
        };
        Update: {
          compat?: number | null;
          version?: number | null;
        };
        Relationships: [];
      };
    };
    Views: {
      public_tenant_discovery: {
        Row: {
          domain: string | null;
          supabase_anon_key: string | null;
          supabase_url: string | null;
        };
        Insert: {
          domain?: string | null;
          supabase_anon_key?: string | null;
          supabase_url?: string | null;
        };
        Update: {
          domain?: string | null;
          supabase_anon_key?: string | null;
          supabase_url?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      exec_sql: { Args: { sql: string }; Returns: undefined };
      get_auth_organization_id: { Args: never; Returns: string };
      get_my_org_id: { Args: never; Returns: string };
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

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
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
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
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
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
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
