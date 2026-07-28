// ============================================================
// PURE LOCAL STORAGE DATABASE
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

function getRankName(level) {
  const r = RANKS.find(x => x.level === Number(level));
  return r ? r.name : "Unknown";
}

// Rank display — uses SVG icons from ranks-icons.js when available
function formatRank(level, size = 18) {
  const name = getRankName(level);
  if (typeof rankIcon === "function") {
    return rankIcon(level, size) + " " + name;
  }
  // Fallback text symbols if SVG script not loaded
  const n = Number(level);
  let icon = "■";
  if (n >= 22) icon = "★★★★";
  else if (n >= 21) icon = "★";
  else if (n >= 19) icon = "◆";
  else if (n >= 15) icon = "▮▮";
  else if (n >= 13) icon = "▮";
  else if (n >= 6) icon = "▲";
  else if (n >= 5) icon = "▼";
  return icon + " " + name;
}

function canAccess(userRank, requiredRank) {
  return Number(userRank) >= Number(requiredRank);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem("ta_" + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error("load error", key, e);
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem("ta_" + key, JSON.stringify(value));
  } catch (e) {
    console.error("save error", key, e);
    alert("Storage full or blocked on this device. Try leaving private browsing mode.");
  }
}

// Visible build version — change this when you deploy so users can confirm the update
const SITE_VERSION = "2026-07-28d";

function initDB() {
  const VERSION = 3;
  try {
    const storedVersion = Number(localStorage.getItem("ta_version") || 0);
    if (storedVersion < VERSION) {
      localStorage.setItem("ta_version", String(VERSION));
    }
  } catch (e) {}

  if (!localStorage.getItem("ta_users")) {
    const admin = {
      id: "admin",
      username: "admin",
      password: "admin123",
      role: "admin",
      rank_level: 22,
      created_at: new Date().toISOString()
    };
    save("users", [admin]);
  }
  if (!localStorage.getItem("ta_reports")) save("reports", []);
  if (!localStorage.getItem("ta_merits")) save("merits", []);
  if (!localStorage.getItem("ta_training")) save("training", []);
  if (!localStorage.getItem("ta_tutorials")) save("tutorials", []);
  if (!localStorage.getItem("ta_links")) save("links", []);
  if (!localStorage.getItem("ta_comments")) save("comments", []);
  if (!localStorage.getItem("ta_polls")) save("polls", []);
  if (!localStorage.getItem("ta_votes")) save("votes", []);
  if (!localStorage.getItem("ta_settings")) {
    save("settings", { background_image: "img/unit-logo.jpg" });
  }
}

/**
 * Load accounts + archive data from data/shared.json on GitHub Pages.
 * This is how OTHER users can log in: admin exports, uploads shared.json to the repo.
 */
function syncFromSharedFile() {
  return fetch("data/shared.json?v=" + Date.now(), { cache: "no-store" })
    .then(function(res) {
      if (!res.ok) throw new Error("no shared file");
      return res.json();
    })
    .then(function(data) {
      if (!data || typeof data !== "object") return { ok: false };

      // Merge users by username (shared file wins for matching usernames)
      if (Array.isArray(data.users) && data.users.length) {
        var local = load("users", []);
        var byName = {};
        local.forEach(function(u) { byName[u.username.toLowerCase()] = u; });
        data.users.forEach(function(u) {
          if (!u || !u.username) return;
          byName[u.username.toLowerCase()] = u;
        });
        save("users", Object.keys(byName).map(function(k) { return byName[k]; }));
      }

      // Optional: pull content if local is empty
      if (Array.isArray(data.reports) && data.reports.length && !load("reports", []).length) save("reports", data.reports);
      if (Array.isArray(data.merits) && data.merits.length && !load("merits", []).length) save("merits", data.merits);
      if (Array.isArray(data.training) && data.training.length && !load("training", []).length) save("training", data.training);
      if (Array.isArray(data.tutorials) && data.tutorials.length && !load("tutorials", []).length) save("tutorials", data.tutorials);
      if (Array.isArray(data.links) && data.links.length && !load("links", []).length) save("links", data.links);
      if (Array.isArray(data.polls) && data.polls.length && !load("polls", []).length) save("polls", data.polls);
      if (Array.isArray(data.votes) && data.votes.length && !load("votes", []).length) save("votes", data.votes);
      if (data.settings) save("settings", data.settings);

      try { localStorage.setItem("ta_shared_synced", new Date().toISOString()); } catch (e) {}
      return { ok: true, users: (data.users || []).length };
    })
    .catch(function() {
      return { ok: false };
    });
}

// Auth
function getSession() {
  try {
    // Prefer localStorage (more reliable on mobile); fall back to sessionStorage
    const raw = localStorage.getItem("ta_session") || sessionStorage.getItem("ta_session");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("getSession error", e);
    return null;
  }
}

function setSession(user) {
  try {
    const safe = {
      id: user.id,
      username: user.username,
      role: user.role,
      rank_level: user.rank_level
    };
    const str = JSON.stringify(safe);
    localStorage.setItem("ta_session", str);
    try { sessionStorage.setItem("ta_session", str); } catch (_) {}
  } catch (e) {
    console.error("setSession error", e);
    alert("Unable to save login on this device. Check if private browsing is on, or allow site data.");
  }
}

function clearSession() {
  try { localStorage.removeItem("ta_session"); } catch (_) {}
  try { sessionStorage.removeItem("ta_session"); } catch (_) {}
  try { localStorage.removeItem("ta_active_user"); } catch (_) {}
}

function login(username, password) {
  const users = load("users", []);
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) return { error: "Invalid username or password" };

  // Single active login per browser: sign out whoever was logged in before
  clearSession();
  setSession(user);

  // Mark active session owner (prevents switching accounts without logout on this device)
  try {
    localStorage.setItem("ta_active_user", user.id);
  } catch (e) {}

  return { user };
}

function register(username, password) {
  const users = load("users", []);
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return { error: "Username already taken" };
  }
  if (username.length < 3) return { error: "Username too short" };
  if (password.length < 4) return { error: "Password too short" };

  const user = {
    id: uid(),
    username: username.trim(),
    password,
    role: "member",
    rank_level: 1,
    created_at: new Date().toISOString()
  };
  users.push(user);
  save("users", users);
  clearSession();
  setSession(user);
  try { localStorage.setItem("ta_active_user", user.id); } catch (e) {}
  return { user };
}

function requireAuth() {
  const session = getSession();
  if (!session) {
    window.location.replace("index.html");
    return null;
  }
  return session;
}

function requireStaff() {
  const session = requireAuth();
  if (!session) return null;
  if (session.role !== "admin" && session.role !== "moderator") {
    window.location.replace("dashboard.html");
    return null;
  }
  return session;
}

function logout() {
  clearSession();
  window.location.href = "index.html";
}

// Data helpers
function getReports() { return load("reports", []); }
function saveReports(data) { save("reports", data); }
function getMerits() { return load("merits", []); }
function saveMerits(data) { save("merits", data); }
function getTraining() { return load("training", []); }
function saveTraining(data) { save("training", data); }
function getTutorials() { return load("tutorials", []); }
function saveTutorials(data) { save("tutorials", data); }
function getLinks() { return load("links", []); }
function saveLinks(data) { save("links", data); }
function getComments() { return load("comments", []); }
function saveComments(data) { save("comments", data); }
function getUsers() { return load("users", []); }
function saveUsers(data) { save("users", data); }
function getPolls() { return load("polls", []); }
function savePolls(data) { save("polls", data); }

function getSettings() { return load("settings", { background_image: "" }); }
function saveSettings(data) { save("settings", data); }
function getVotes() { return load("votes", []); }
function saveVotes(data) { save("votes", data); }

// Export / Import
function exportData() {
  const payload = {
    users: getUsers(),
    polls: getPolls(),
    votes: getVotes(),
    reports: getReports(),
    merits: getMerits(),
    training: getTraining(),
    tutorials: getTutorials(),
    links: getLinks(),
    comments: getComments(),
    settings: getSettings(),
    exported_at: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tactical-archive-backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        // Import users WITH passwords so members can log in
        if (data.users && Array.isArray(data.users) && data.users.length) {
          saveUsers(data.users);
        }
        if (data.reports) saveReports(data.reports);
        if (data.merits) saveMerits(data.merits);
        if (data.training) saveTraining(data.training);
        if (data.tutorials) saveTutorials(data.tutorials);
        if (data.links) saveLinks(data.links);
        if (data.comments) saveComments(data.comments);
        if (data.polls && typeof savePolls === "function") savePolls(data.polls);
        if (data.settings) saveSettings(data.settings);
        resolve(true);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

// Load shared archive from the repo file data/shared.json
async function loadSharedArchive(force) {
  try {
    const res = await fetch("data/shared.json?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.users && Array.isArray(data.users) && data.users.length) {
      saveUsers(data.users);
    }
    if (data.reports) saveReports(data.reports);
    if (data.merits) saveMerits(data.merits);
    if (data.training) saveTraining(data.training);
    if (data.tutorials) saveTutorials(data.tutorials);
    if (data.links) saveLinks(data.links);
    if (data.comments) saveComments(data.comments);
    if (data.settings) saveSettings(data.settings);
    try {
      localStorage.setItem("ta_shared_loaded", data.exported_at || new Date().toISOString());
    } catch (_) {}
    return true;
  } catch (e) {
    console.log("shared.json not loaded:", e.message);
    return false;
  }
}

// Apply background image if set
function applyBackground() {
  const settings = getSettings();
  if (settings.background_image) {
    document.body.style.backgroundColor = "#0a0f0a";
    document.body.style.backgroundImage =
      "linear-gradient(rgba(10,15,10,0.82), rgba(10,15,10,0.88)), url('" + settings.background_image + "')";
    document.body.style.backgroundSize = "cover, contain";
    document.body.style.backgroundPosition = "center, center";
    document.body.style.backgroundAttachment = "fixed, fixed";
    document.body.style.backgroundRepeat = "no-repeat, no-repeat";
  } else {
    document.body.style.backgroundImage = "";
    document.body.style.backgroundColor = "";
  }
}

// Rank dropdown HTML helper
function rankOptions(selected) {
  return RANKS.map(r =>
    `<option value="${r.level}" ${Number(selected) === r.level ? "selected" : ""}>${r.name}</option>`
  ).join("");
}

// Navbar
function renderNavbar(active) {
  const session = getSession();
  if (!session) return;

  const isStaff = session.role === "admin" || session.role === "moderator";

  const isAdmin = session.role === "admin";

  const links = [
    { href: "dashboard.html", label: "Dashboard" },
    { href: "reports.html", label: "Reports" },
    { href: "voting.html", label: "Voting" },
    { href: "training.html", label: "Training" },
    { href: "tutorials.html", label: "Tutorials" },
    { href: "tactical-centre.html", label: "Tactical Centre" },
  ];

  // Merits & Awards — admin only
  if (isAdmin) links.push({ href: "merits.html", label: "Merits", admin: true });
  // Admin panel — admin only
  if (isAdmin) links.push({ href: "admin.html", label: "Admin", admin: true });
  // Profile — admin only
  if (isAdmin) links.push({ href: "profile.html", label: "Profile", admin: true });

  document.write(`
  <nav class="navbar">
    <div class="nav-inner">
      <div class="nav-brand"><span>◆</span> TACTICAL ARCHIVE</div>
      <div class="nav-links">
        ${links.map(l => `
          <a href="${l.href}" class="${active === l.href ? 'active' : ''}"
             style="${l.admin ? 'color:#fbbf24' : ''}">${l.label}</a>
        `).join("")}
      </div>
      <div class="nav-user">
        <div>
          <div style="font-weight:600">${session.username}</div>
          <div class="rank rank-${session.rank_level}">${formatRank(session.rank_level)} • ${session.role}</div>
        </div>
        <button class="btn-logout" onclick="logout()">Logout</button>
      </div>
    </div>
  </nav>`);
}

function showVersion() {
  try {
    var el = document.createElement("div");
    el.id = "site-version";
    el.style.cssText = "position:fixed;bottom:6px;right:8px;font-size:10px;color:#4a5a4a;z-index:99;pointer-events:none;";
    el.textContent = "build " + SITE_VERSION;
    document.body.appendChild(el);
  } catch (e) {}
}

initDB();
try { showVersion(); } catch (e) {}
// Sync shared accounts so members on other devices can log in
try {
  syncFromSharedFile().then(function(r) {
    if (r && r.ok) console.log("Synced shared users:", r.users);
  });
} catch (e) {}
