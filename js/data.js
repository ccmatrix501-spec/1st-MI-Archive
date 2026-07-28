// ============================================================
// PURE LOCAL STORAGE DATABASE
// Everything is stored in the browser. No external services.
// ============================================================

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
  const r = RANKS.find(x => x.level === Number(level));
  return r ? r.name : "Unknown";
}

function canAccess(userRank, requiredRank) {
  return Number(userRank) >= Number(requiredRank);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- Storage helpers ----------
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

// ---------- Init default data ----------
function initDB() {
  if (!localStorage.getItem("ta_users")) {
    // Default admin account
    // username: admin   password: admin123
    const admin = {
      id: "admin",
      username: "admin",
      password: "admin123",   // plain for simplicity (this is not real security)
      role: "admin",
      rank_level: 9,
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
}

// ---------- Auth ----------
function getSession() {
  const raw = sessionStorage.getItem("ta_session");
  return raw ? JSON.parse(raw) : null;
}

function setSession(user) {
  // never store password in session
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

// ---------- Data helpers ----------
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

// ---------- Export / Import ----------
function exportData() {
  const payload = {
    users: getUsers().map(u => ({ ...u, password: undefined })), // strip passwords on export
    reports: getReports(),
    merits: getMerits(),
    training: getTraining(),
    tutorials: getTutorials(),
    links: getLinks(),
    comments: getComments(),
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
        // users are not imported for safety
        resolve(true);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}

// ---------- Navbar helper ----------
function renderNavbar(active) {
  const session = getSession();
  if (!session) return;

  const isStaff = session.role === "admin" || session.role === "moderator";

  const links = [
    { href: "dashboard.html", label: "Dashboard" },
    { href: "reports.html", label: "Reports" },
    { href: "merits.html", label: "Merits" },
    { href: "training.html", label: "Training" },
    { href: "tutorials.html", label: "Tutorials" },
    { href: "tactical-centre.html", label: "Tactical Centre" },
  ];

  if (isStaff) links.push({ href: "admin.html", label: "Admin", admin: true });

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
          <div class="rank rank-${session.rank_level}">${getRankName(session.rank_level)} • ${session.role}</div>
        </div>
        <button class="btn-logout" onclick="logout()">Logout</button>
      </div>
    </div>
  </nav>`);
}

// Boot
initDB();
