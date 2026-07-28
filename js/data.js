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
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem("ta_" + key, JSON.stringify(value));
}

function initDB() {
  // Version 2 = 22-rank system with icons
  const VERSION = 2;
  const storedVersion = Number(localStorage.getItem("ta_version") || 0);
  if (storedVersion < VERSION) {
    localStorage.setItem("ta_version", String(VERSION));
    // Keep existing data; ranks above old max still work via canAccess
  }

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
  if (!localStorage.getItem("ta_settings")) {
    save("settings", { background_image: "img/unit-logo.jpg" });
  }
}

// Auth
function getSession() {
  const raw = sessionStorage.getItem("ta_session");
  return raw ? JSON.parse(raw) : null;
}

function setSession(user) {
  const safe = { id: user.id, username: user.username, role: user.role, rank_level: user.rank_level };
  sessionStorage.setItem("ta_session", JSON.stringify(safe));
}

function clearSession() {
  sessionStorage.removeItem("ta_session");
}

function login(username, password) {
  const users = load("users", []);
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) return { error: "Invalid username or password" };
  setSession(user);
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
  setSession(user);
  return { user };
}

function requireAuth() {
  const session = getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  return session;
}

function requireStaff() {
  const session = requireAuth();
  if (!session) return null;
  if (session.role !== "admin" && session.role !== "moderator") {
    window.location.href = "dashboard.html";
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
function getSettings() { return load("settings", { background_image: "" }); }
function saveSettings(data) { save("settings", data); }

// Export / Import
function exportData() {
  const payload = {
    users: getUsers().map(u => ({ ...u, password: undefined })),
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
        if (data.reports) saveReports(data.reports);
        if (data.merits) saveMerits(data.merits);
        if (data.training) saveTraining(data.training);
        if (data.tutorials) saveTutorials(data.tutorials);
        if (data.links) saveLinks(data.links);
        if (data.comments) saveComments(data.comments);
        if (data.settings) saveSettings(data.settings);
        resolve(true);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
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

initDB();
