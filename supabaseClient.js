// ============================================================
// Supabase client initialization — shared by app.js and admin.js
// Loaded as an ES module: <script type="module" src="supabaseClient.js">
// ============================================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// TODO: replace with your project's values (Project Settings → API)
// SUPABASE_URL   -> "Project URL", looks like https://xxxxxxxx.supabase.co
// SUPABASE_ANON_KEY -> the "publishable" key (sb_publishable_...) or legacy "anon public" key.
// NEVER put the "secret" key (sb_secret_... / service_role) here — this file ships to every visitor's browser.
const SUPABASE_URL = 'https://vpxxnhkbotjxngvrnpws.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cswsbvkEoLY0WmC6qem_dQ_osOJW4Gw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Shared constants used by both storefront and admin code
export const PRODUCT_IMAGE_BUCKET = 'product-images';
export const ORDER_STATUSES = ['New', 'In Transit', 'Delivered'];
