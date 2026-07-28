// ============================================================
// CONFIG - Replace these with your own Supabase project values
// ============================================================
const SUPABASE_URL = "https://gubizstvrwaxrnivciqy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1Yml6c3R2cndheHJuaXZjaXF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMDg2NDIsImV4cCI6MjEwMDc4NDY0Mn0.W4NX2C-jiBJSUiLjYfrn7XwsQHXIzmt3JIUfA2L2znI";

// Rank definitions
const RANKS = [
  { level: 1, name: "Recruit" },
  { level: 2, name: "Private" },
  { level: 3, name: "Corporal" },
  { level: 4, name: "Sergeant" },
  { level: 5, name: "Lieutenant" },
  { level: 6, name: "Captain" },
  { level: 7, name: "Major" },
  { level: 8, name: "Colonel" },
  { level: 9, name: "General" },
];

function getRankName(level) {
  const r = RANKS.find((x) => x.level === Number(level));
  return r ? r.name : "Unknown";
}

function canAccess(userRank, requiredRank) {
  return Number(userRank) >= Number(requiredRank);
}
