import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://vnofpgowelblwkonkeab.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZub2ZwZ293ZWxibHdrb25rZWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MTIzNDEsImV4cCI6MjA5NTQ4ODM0MX0.WPHYoSzUjlXlB8ezsh_IrnFqWt_F33HL36tZgk0vjZc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
