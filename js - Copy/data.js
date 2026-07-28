// ============================================================
// TACTICAL ARCHIVE — Supabase data layer (shared worldwide)
// ============================================================

const RANKS = [
  { level: 1,  name: "Private" },
  { level: 2,  name: "Private First Class" },
  { level: 3,  name: "Lance Corporal" },
  { level: 4,  name: "Specialist" },
  { level: 5,  name: "Corporal" },
  { level: 6,  name: "Sergeant" },
  { level: 7,  name: "Staff Sergeant" },
  { level: 8,  name: "Gunnery Sergeant" },
  { level: 9,  name: "Master Sergeant" },
  { level: 10, name: "First Sergeant" },
  { level: 11, name: "Master Gunnery Sergeant" },
  { level: 12, name: "Officer Cadet" },
  { level: 13, name: "Second Lieutenant" },
  { level: 14, name: "First Lieutenant" },
  { level: 15, name: "Captain" },
  { level: 16, name: "Warrant Officer" },
  { level: 17, name: "Sergeant Major" },
  { level: 18, name: "Command Sergeant Major" },
  { level: 19, name: "Major" },
  { level: 20, name: "Lieutenant Colonel" },
  { level: 21, name: "Colonel" },
  { level: 22, name: "General" },
];


// Username-only auth: Supabase requires an email field internally.
// We map username → username@unit.local so members never see emails.
function usernameToEmail(username) {
  const clean = String(username || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return clean + "@unit.local";
}

function getRankName(level) {
  const r = RANKS.find(x => x.level === Number(level));
  return r ? r.name : "Unknown";
}

function formatRank(level, size) {
  size = size || 18;
  const name = getRankName(level);
  if (typeof rankIcon === "function") return rankIcon(level, size) + " " + name;
  return name;
}

function canAccess(userRank, requiredRank) {
  return Number(userRank) >= Number(requiredRank);
}

function rankOptions(selected) {
  return RANKS.map(r =>
    `<option value="${r.level}" ${Number(selected) === r.level ? "selected" : ""}>${r.name}</option>`
  ).join("");
}

function esc(s) {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---- Supabase client ----
let supabase = null;

function initSupabase() {
  const cfg = window.TA_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.indexOf("PASTE_") === 0) {
    console.error("Missing Supabase config. Edit js/config.js");
    return null;
  }
  if (!window.supabase || !window.supabase.createClient) {
    console.error("Supabase JS library not loaded");
    return null;
  }
  supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  return supabase;
}

function db() {
  if (!supabase) initSupabase();
  return supabase;
}

// ---- Session / profile ----
let _session = null;
let _profile = null;

async function loadSession() {
  const client = db();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  _session = session;
  if (!session) {
    _profile = null;
    return null;
  }
  const { data: profile } = await client
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();
  _profile = profile;
  return getAppUser();
}

function getAppUser() {
  if (!_session || !_profile) return null;
  return {
    id: _profile.id,
    username: _profile.username,
    role: _profile.role,
    rank_level: _profile.rank_level
  };
}

function getSession() {
  return getAppUser();
}

async function login(username, password) {
  const client = db();
  if (!client) return { error: "Supabase not configured. Edit js/config.js" };
  const email = usernameToEmail(username);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    // Friendlier message — never mention email
    const msg = error.message || "Login failed";
    if (/invalid login|invalid credentials|email/i.test(msg)) {
      return { error: "Invalid username or password" };
    }
    return { error: msg };
  }
  _session = data.session;
  const { data: profile, error: pErr } = await client
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();
  if (pErr || !profile) {
    return { error: "Logged in but profile missing. Check SQL setup / trigger." };
  }
  _profile = profile;
  return { user: getAppUser() };
}

async function logout() {
  const client = db();
  if (client) await client.auth.signOut();
  _session = null;
  _profile = null;
  window.location.href = "index.html";
}

async function requireAuth() {
  const user = await loadSession();
  if (!user) {
    window.location.replace("index.html");
    return null;
  }
  return user;
}

async function requireAdmin() {
  const user = await requireAuth();
  if (!user) return null;
  if (user.role !== "admin") {
    window.location.replace("dashboard.html");
    return null;
  }
  return user;
}

async function requireStaff() {
  const user = await requireAuth();
  if (!user) return null;
  if (user.role !== "admin" && user.role !== "moderator") {
    window.location.replace("dashboard.html");
    return null;
  }
  return user;
}

// ---- Data helpers ----
async function getReports() {
  const { data, error } = await db().from("reports").select("*").order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

async function saveReport(row) {
  if (row.id) {
    const { error } = await db().from("reports").update(row).eq("id", row.id);
    return !error;
  }
  const { error } = await db().from("reports").insert(row);
  return !error;
}

async function deleteReport(id) {
  const { error } = await db().from("reports").delete().eq("id", id);
  return !error;
}

async function getMerits() {
  const { data, error } = await db().from("merits").select("*").order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}

async function saveMerit(row) {
  if (row.id) {
    const { error } = await db().from("merits").update(row).eq("id", row.id);
    return !error;
  }
  const { error } = await db().from("merits").insert(row);
  return !error;
}

async function deleteMerit(id) {
  const { error } = await db().from("merits").delete().eq("id", id);
  return !error;
}

async function getTraining() {
  const { data, error } = await db().from("training").select("*").order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}

async function saveTrainingItem(row) {
  if (row.id) {
    const { error } = await db().from("training").update(row).eq("id", row.id);
    return !error;
  }
  const { error } = await db().from("training").insert(row);
  return !error;
}

async function deleteTraining(id) {
  const { error } = await db().from("training").delete().eq("id", id);
  return !error;
}

async function getTutorials() {
  const { data, error } = await db().from("tutorials").select("*").order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}

async function saveTutorial(row) {
  if (row.id) {
    const { error } = await db().from("tutorials").update(row).eq("id", row.id);
    return !error;
  }
  const { error } = await db().from("tutorials").insert(row);
  return !error;
}

async function deleteTutorial(id) {
  const { error } = await db().from("tutorials").delete().eq("id", id);
  return !error;
}

async function getLinks() {
  const { data, error } = await db().from("links").select("*").order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}

async function saveLink(row) {
  if (row.id) {
    const { error } = await db().from("links").update(row).eq("id", row.id);
    return !error;
  }
  const { error } = await db().from("links").insert(row);
  return !error;
}

async function deleteLink(id) {
  const { error } = await db().from("links").delete().eq("id", id);
  return !error;
}

async function getComments(reportId) {
  let q = db().from("comments").select("*").order("created_at", { ascending: true });
  if (reportId) q = q.eq("report_id", reportId);
  const { data, error } = await q;
  if (error) return [];
  return data || [];
}

async function addComment(row) {
  const { error } = await db().from("comments").insert(row);
  return !error;
}

async function getPolls() {
  const { data, error } = await db().from("polls").select("*").order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}

async function savePoll(row) {
  if (row.id) {
    const { error } = await db().from("polls").update(row).eq("id", row.id);
    return !error;
  }
  const { error } = await db().from("polls").insert(row);
  return !error;
}

async function deletePoll(id) {
  await db().from("votes").delete().eq("poll_id", id);
  const { error } = await db().from("polls").delete().eq("id", id);
  return !error;
}

async function getVotes(pollId) {
  let q = db().from("votes").select("*");
  if (pollId) q = q.eq("poll_id", pollId);
  const { data, error } = await q;
  if (error) return [];
  return data || [];
}

async function castVote(row) {
  const { error } = await db().from("votes").insert(row);
  return { ok: !error, error: error ? error.message : null };
}

async function getProfiles() {
  const { data, error } = await db().from("profiles").select("*").order("username");
  if (error) return [];
  return data || [];
}

async function updateProfile(id, patch) {
  const { error } = await db().from("profiles").update(patch).eq("id", id);
  return !error;
}

async function getSettings() {
  const { data } = await db().from("settings").select("*").eq("id", 1).maybeSingle();
  return data || { background_image: "img/unit-logo.jpg" };
}

async function saveSettings(patch) {
  const { error } = await db().from("settings").upsert({ id: 1, ...patch });
  return !error;
}

async function applyBackground() {
  try {
    const s = await getSettings();
    if (s && s.background_image) {
      document.body.style.backgroundColor = "#0a0f0a";
      document.body.style.backgroundImage =
        "linear-gradient(rgba(10,15,10,0.82), rgba(10,15,10,0.88)), url('" + s.background_image + "')";
      document.body.style.backgroundSize = "cover, contain";
      document.body.style.backgroundPosition = "center, center";
      document.body.style.backgroundAttachment = "fixed, fixed";
      document.body.style.backgroundRepeat = "no-repeat, no-repeat";
    }
  } catch (e) {}
}

function showVersion() {
  try {
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;bottom:6px;right:8px;font-size:10px;color:#4a5a4a;z-index:99;pointer-events:none;";
    el.textContent = "build " + (window.SITE_VERSION || "supabase");
    document.body.appendChild(el);
  } catch (e) {}
}

function renderNavbar(active) {
  const session = getAppUser();
  if (!session) return;
  const isAdmin = session.role === "admin";
  const isStaff = isAdmin || session.role === "moderator";
  const links = [
    { href: "dashboard.html", label: "Dashboard" },
    { href: "reports.html", label: "Reports" },
    { href: "voting.html", label: "Voting" },
    { href: "training.html", label: "Training" },
    { href: "tutorials.html", label: "Tutorials" },
    { href: "tactical-centre.html", label: "Tactical Centre" },
  ];
  if (isAdmin) links.push({ href: "merits.html", label: "Merits", admin: true });
  if (isAdmin) links.push({ href: "admin.html", label: "Admin", admin: true });
  if (isAdmin) links.push({ href: "profile.html", label: "Profile", admin: true });

  document.write(`
  <nav class="navbar">
    <div class="nav-inner">
      <div class="nav-brand"><span>◆</span> TACTICAL ARCHIVE</div>
      <div class="nav-links">
        ${links.map(l => `
          <a href="${l.href}" class="${active === l.href ? "active" : ""}"
             style="${l.admin ? "color:#fbbf24" : ""}">${l.label}</a>
        `).join("")}
      </div>
      <div class="nav-user">
        <div>
          <div style="font-weight:600">${esc(session.username)}</div>
          <div class="rank rank-${session.rank_level}">${formatRank(session.rank_level)} · ${session.role}</div>
        </div>
        <button class="btn-logout" onclick="logout()">Logout</button>
      </div>
    </div>
  </nav>`);
}

// Create member via signUp (admin panel). May switch session — caller handles.
async function createMemberAccount(username, password, rankLevel, role) {
  role = role || "member";
  rankLevel = Number(rankLevel) || 1;
  username = String(username || "").trim();
  if (username.length < 3) return { error: "Username too short" };
  if (!password || password.length < 6) return { error: "Password must be at least 6 characters" };

  const client = db();
  const email = usernameToEmail(username);

  // Prevent duplicate usernames in profiles
  const { data: existing } = await client.from("profiles").select("id").eq("username", username).maybeSingle();
  if (existing) return { error: "Username already taken" };

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { username, role, rank_level: rankLevel }
    }
  });
  if (error) {
    const msg = error.message || "Could not create account";
    if (/already|registered|exists/i.test(msg)) return { error: "Username already taken" };
    return { error: msg };
  }
  if (data.user) {
    await client.from("profiles").upsert({
      id: data.user.id,
      username,
      role,
      rank_level: rankLevel
    });
  }
  return { user: data.user };
}

initSupabase();
