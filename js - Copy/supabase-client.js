// Load Supabase from CDN and create client
// This file expects config.js to be loaded first

let supabase = null;

function initSupabase() {
  if (typeof window.supabase === "undefined") {
    console.error("Supabase JS library not loaded. Check the CDN script tag.");
    return null;
  }
  if (SUPABASE_URL.includes("YOUR_PROJECT") || SUPABASE_ANON_KEY.includes("YOUR_ANON")) {
    console.warn("⚠️ You still need to put your real Supabase URL and Anon Key in js/config.js");
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabase;
}
