export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          phone_number: string | null;
          salesforce_connected: boolean | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          stripe_price_id: string | null;
          subscription_status: string | null;
          plan_type: string | null;
          subscription_current_period_end: string | null;
          subscription_cancel_at_period_end: boolean | null;
          trial_started_at: string | null;
          trial_used: boolean | null;
          trial_expires_at: string | null;
          seat_count: number | null;
          seats_used: number | null;
          ltd_events_used: number | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          phone_number?: string | null;
          salesforce_connected?: boolean | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          subscription_status?: string | null;
          plan_type?: string | null;
          subscription_current_period_end?: string | null;
          subscription_cancel_at_period_end?: boolean | null;
          trial_started_at?: string | null;
          trial_used?: boolean | null;
          trial_expires_at?: string | null;
          seat_count?: number | null;
          seats_used?: number | null;
          ltd_events_used?: number | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          phone_number?: string | null;
          salesforce_connected?: boolean | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          subscription_status?: string | null;
          plan_type?: string | null;
          subscription_current_period_end?: string | null;
          subscription_cancel_at_period_end?: boolean | null;
          trial_started_at?: string | null;
          trial_used?: boolean | null;
          trial_expires_at?: string | null;
          seat_count?: number | null;
          seats_used?: number | null;
          ltd_events_used?: number | null;
        };
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          start_date: string | null;
          end_date: string | null;
          estimated_costs: number | null;
          phone_number_id: string | null;
          timezone: string | null;
          morning_message_sent: boolean | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          start_date?: string | null;
          end_date?: string | null;
          estimated_costs?: number | null;
          phone_number_id?: string | null;
          timezone?: string | null;
          morning_message_sent?: boolean | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          start_date?: string | null;
          end_date?: string | null;
          estimated_costs?: number | null;
          phone_number_id?: string | null;
          timezone?: string | null;
          morning_message_sent?: boolean | null;
        };
      };
      leads: {
        Row: {
          id: string;
          event_id: string;
          vorname: string | null;
          nachname: string | null;
          email: string | null;
          firma: string | null;
          telefon: string | null;
          zusammenfassung: string | null;
          potential: string | null;
          jobtitel: string | null;
          structured_data: Json | null;
          created_at: string | null;
          deleted_at: string | null;
          followup_mail_sent_at: string | null;
        };
        Insert: {
          id?: string;
          event_id: string;
          vorname?: string | null;
          nachname?: string | null;
          email?: string | null;
          firma?: string | null;
          telefon?: string | null;
          zusammenfassung?: string | null;
          potential?: string | null;
          jobtitel?: string | null;
          structured_data?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          event_id?: string;
          vorname?: string | null;
          nachname?: string | null;
          email?: string | null;
          firma?: string | null;
          telefon?: string | null;
          zusammenfassung?: string | null;
          potential?: string | null;
          jobtitel?: string | null;
          structured_data?: Json | null;
          created_at?: string | null;
        };
      };
      phone_numbers: {
        Row: {
          id: string;
          user_id: string;
          phone_number: string;
          assigned_to_event_id: string | null;
          is_active: boolean;
          verified: boolean;
          verification_code: string | null;
          verification_code_expires_at: string | null;
          verification_attempts: number;
          last_verification_request_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          phone_number: string;
          assigned_to_event_id?: string | null;
          is_active?: boolean;
          verified?: boolean;
          verification_code?: string | null;
          verification_code_expires_at?: string | null;
          verification_attempts?: number;
          last_verification_request_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          phone_number?: string;
          assigned_to_event_id?: string | null;
          is_active?: boolean;
          verified?: boolean;
          verification_code?: string | null;
          verification_code_expires_at?: string | null;
          verification_attempts?: number;
          last_verification_request_at?: string | null;
          created_at?: string | null;
        };
      };
      integrations: {
        Row: {
          user_id: string;
          crm_type: string | null;
          crm_access_token: string | null;
          crm_refresh_token: string | null;
          crm_token_expires_at: string | null;
          crm_instance_url: string | null;
          crm_org_id: string | null;
          crm_user_id: string | null;
          crm_connection_type: string | null;
          salesforce_access_token: string | null;
          salesforce_refresh_token: string | null;
          salesforce_token_expires_at: string | null;
          salesforce_instance_url: string | null;
          salesforce_org_id: string | null;
          salesforce_user_id: string | null;
          salesforce_connection_type: string | null;
          salesforce_field_mapping: Json | null;
        };
        Insert: {
          user_id: string;
          crm_type?: string | null;
          crm_access_token?: string | null;
          crm_refresh_token?: string | null;
          crm_token_expires_at?: string | null;
          crm_instance_url?: string | null;
          crm_org_id?: string | null;
          crm_user_id?: string | null;
          crm_connection_type?: string | null;
          salesforce_access_token?: string | null;
          salesforce_refresh_token?: string | null;
          salesforce_token_expires_at?: string | null;
          salesforce_instance_url?: string | null;
          salesforce_org_id?: string | null;
          salesforce_user_id?: string | null;
          salesforce_connection_type?: string | null;
          salesforce_field_mapping?: Json | null;
        };
        Update: {
          user_id?: string;
          crm_type?: string | null;
          crm_access_token?: string | null;
          crm_refresh_token?: string | null;
          crm_token_expires_at?: string | null;
          crm_instance_url?: string | null;
          crm_org_id?: string | null;
          crm_user_id?: string | null;
          crm_connection_type?: string | null;
          salesforce_access_token?: string | null;
          salesforce_refresh_token?: string | null;
          salesforce_token_expires_at?: string | null;
          salesforce_instance_url?: string | null;
          salesforce_org_id?: string | null;
          salesforce_user_id?: string | null;
          salesforce_connection_type?: string | null;
          salesforce_field_mapping?: Json | null;
        };
      };
      sent_emails: {
        Row: {
          id: string;
          user_id: string;
          lead_id: string | null;
          subject: string;
          body: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          lead_id?: string | null;
          subject: string;
          body: string;
          sent_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          lead_id?: string | null;
          subject?: string;
          body?: string;
          sent_at?: string | null;
        };
      };
      user_settings: {
        Row: {
          user_id: string;
          email_on_lead: boolean | null;
          weekly_summary: boolean | null;
          crm_sync_reports: boolean | null;
        };
        Insert: {
          user_id: string;
          email_on_lead?: boolean | null;
          weekly_summary?: boolean | null;
          crm_sync_reports?: boolean | null;
        };
        Update: {
          user_id?: string;
          email_on_lead?: boolean | null;
          weekly_summary?: boolean | null;
          crm_sync_reports?: boolean | null;
        };
      };
    };
  };
}
