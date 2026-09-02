import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export const supabase = createClient(
  'https://fobnuromfiznouecmrlg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvYm51cm9tZml6bm91ZWNtcmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTAxOTIsImV4cCI6MjA4OTQyNjE5Mn0.DEJY9bj3vxbjV4NKx7wncmTGlRdGXuCfJUHfDFFvZyo'
);
