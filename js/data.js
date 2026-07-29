// Tactical Archive API — never declares a binding named "supabase"
(function (global) {
  "use strict";

  var RANKS = [
    { level: 1, name: "Private" },
    { level: 2, name: "Private First Class" },
    { level: 3, name: "Lance Corporal" },
    { level: 4, name: "Specialist" },
    { level: 5, name: "Corporal" },
    { level: 6, name: "Sergeant" },
    { level: 7, name: "Staff Sergeant" },
    { level: 8, name: "Gunnery Sergeant" },
    { level: 9, name: "Master Sergeant" },
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
    { level: 22, name: "General" }
  ];

  var _client = null;
  var _session = null;
  var _profile = null;

  function usernameToEmail(username) {
    var clean = String(username || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    return clean + "@unit.local";
  }

  function getRankName(level) {
    for (var i = 0; i < RANKS.length; i++) {
      if (RANKS[i].level === Number(level)) return RANKS[i].name;
    }
    return "Unknown";
  }

  function formatRank(level, size) {
    size = size || 18;
    var name = getRankName(level);
    if (typeof global.rankIcon === "function") return global.rankIcon(level, size) + " " + name;
    return name;
  }

  function canAccess(userRank, requiredRank) {
    return Number(userRank) >= Number(requiredRank);
  }

  function rankOptions(selected) {
    return RANKS.map(function (r) {
      return '<option value="' + r.level + '"' +
        (Number(selected) === r.level ? " selected" : "") + ">" + r.name + "</option>";
    }).join("");
  }

  function esc(s) {
    if (!s) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function initSupabase() {
    var cfg = global.TA_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || String(cfg.SUPABASE_ANON_KEY).indexOf("PASTE_") === 0) {
      console.error("Missing Supabase config. Edit js/config.js");
      return null;
    }
    if (!global.supabase || !global.supabase.createClient) {
      console.error("Supabase JS library not loaded");
      return null;
    }
    _client = global.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    return _client;
  }

  function db() {
    if (!_client) initSupabase();
    return _client;
  }

  function getAppUser() {
    if (!_session || !_profile) return null;
    return {
      id: _profile.id,
      email: _session.user && _session.user.email,
      username: _profile.username,
      role: _profile.role,
      rank_level: _profile.rank_level,
      company_id: _profile.company_id || null
    };
  }

  function getSession() { return getAppUser(); }

  async function loadSession() {
    var client = db();
    if (!client) return null;
    var res = await client.auth.getSession();
    _session = res.data && res.data.session;
    if (!_session) { _profile = null; return null; }
    var pr = await client.from("profiles").select("*").eq("id", _session.user.id).maybeSingle();
    _profile = pr.data || null;
    return getAppUser();
  }

  async function login(username, password) {
    var client = db();
    if (!client) return { error: "Supabase not configured. Edit js/config.js" };
    var email = usernameToEmail(username);
    var res;
    try {
      res = await client.auth.signInWithPassword({ email: email, password: password });
    } catch (e) {
      return { error: "Network error: " + (e.message || String(e)) };
    }
    if (res.error) {
      var msg = res.error.message || "Login failed";
      if (/invalid login|invalid credentials/i.test(msg)) return { error: "Invalid username or password" };
      if (/email not confirmed/i.test(msg)) return { error: "Turn OFF Confirm email in Supabase Auth settings" };
      return { error: msg };
    }
    if (!res.data || !res.data.user) return { error: "Login failed (no user)" };
    _session = res.data.session;
    var pr = await client.from("profiles").select("*").eq("id", res.data.user.id).maybeSingle();
    if (pr.error) return { error: "Profile read failed: " + pr.error.message };
    _profile = pr.data;
    if (!_profile) {
      var uname = String(username || "").trim().toLowerCase() || "user";
      var ins = await client.from("profiles").insert({
        id: res.data.user.id, username: uname, role: "member", rank_level: 1
      }).select("*").maybeSingle();
      if (ins.error) return { error: "No profile row. Run profile SQL. (" + ins.error.message + ")" };
      _profile = ins.data;
    }
    return { user: getAppUser() };
  }

  async function logout() {
    var client = db();
    if (client) await client.auth.signOut();
    _session = null; _profile = null;
    global.location.href = "index.html";
  }

  async function requireAuth() {
    var user = await loadSession();
    if (!user) { global.location.replace("index.html"); return null; }
    return user;
  }

  async function requireAdmin() {
    var user = await requireAuth();
    if (!user) return null;
    if (user.role !== "admin") { global.location.replace("dashboard.html"); return null; }
    return user;
  }

  async function requireStaff() {
    var user = await requireAuth();
    if (!user) return null;
    if (user.role !== "admin" && user.role !== "moderator") {
      global.location.replace("dashboard.html"); return null;
    }
    return user;
  }

  function canSeeReport(report, user) {
    // Strict for everyone including admins:
    // tagged users always see it; otherwise must meet min rank AND company (or unit-wide).
    if (!report || !user) return false;
    var tags = report.tagged_admin_ids || [];
    if (tags.indexOf(user.id) >= 0) return true;
    if (!canAccess(user.rank_level, report.min_rank_level || 1)) return false;
    if (report.company_id) {
      if (!user.company_id || user.company_id !== report.company_id) return false;
    }
    return true;
  }

  function canSeePoll(poll, user) {
    if (!poll || !user) return false;
    if (user.role === "admin" || user.role === "moderator") return true;
    if (!canAccess(user.rank_level, poll.min_rank_level || 1)) return false;
    if (poll.company_id) {
      if (!user.company_id || user.company_id !== poll.company_id) return false;
    }
    return true;
  }

  async function getReports() {
    var r = await db().from("reports").select("*").order("created_at", { ascending: false });
    return r.data || [];
  }
  async function saveReport(row) {
    if (row.id) return !(await db().from("reports").update(row).eq("id", row.id)).error;
    return !(await db().from("reports").insert(row)).error;
  }
  async function deleteReport(id) {
    return !(await db().from("reports").delete().eq("id", id)).error;
  }

  async function getMerits() {
    var r = await db().from("merits").select("*").order("created_at", { ascending: false });
    return r.data || [];
  }
  async function saveMerit(row) {
    if (row.id) return !(await db().from("merits").update(row).eq("id", row.id)).error;
    return !(await db().from("merits").insert(row)).error;
  }
  async function deleteMerit(id) {
    return !(await db().from("merits").delete().eq("id", id)).error;
  }

  async function getTraining() {
    var r = await db().from("training").select("*").order("created_at", { ascending: false });
    return r.data || [];
  }
  async function saveTrainingItem(row) {
    if (row.id) return !(await db().from("training").update(row).eq("id", row.id)).error;
    return !(await db().from("training").insert(row)).error;
  }
  async function deleteTraining(id) {
    return !(await db().from("training").delete().eq("id", id)).error;
  }

  async function getTutorials() {
    var r = await db().from("tutorials").select("*").order("created_at", { ascending: false });
    return r.data || [];
  }
  async function saveTutorial(row) {
    if (row.id) return !(await db().from("tutorials").update(row).eq("id", row.id)).error;
    return !(await db().from("tutorials").insert(row)).error;
  }
  async function deleteTutorial(id) {
    return !(await db().from("tutorials").delete().eq("id", id)).error;
  }

  async function getLinks() {
    var r = await db().from("links").select("*").order("created_at", { ascending: false });
    return r.data || [];
  }
  async function saveLink(row) {
    if (row.id) return !(await db().from("links").update(row).eq("id", row.id)).error;
    return !(await db().from("links").insert(row)).error;
  }
  async function deleteLink(id) {
    return !(await db().from("links").delete().eq("id", id)).error;
  }

  async function getComments(reportId) {
    var q = db().from("comments").select("*").order("created_at", { ascending: true });
    if (reportId) q = q.eq("report_id", reportId);
    var r = await q;
    return r.data || [];
  }
  async function addComment(row) {
    return !(await db().from("comments").insert(row)).error;
  }

  async function getPolls() {
    var r = await db().from("polls").select("*").order("created_at", { ascending: false });
    return r.data || [];
  }
  async function savePoll(row) {
    if (row.id) return !(await db().from("polls").update(row).eq("id", row.id)).error;
    return !(await db().from("polls").insert(row)).error;
  }
  async function deletePoll(id) {
    await db().from("votes").delete().eq("poll_id", id);
    return !(await db().from("polls").delete().eq("id", id)).error;
  }

  async function getVotes(pollId) {
    var q = db().from("votes").select("*");
    if (pollId) q = q.eq("poll_id", pollId);
    var r = await q;
    return r.data || [];
  }
  async function castVote(row) {
    var r = await db().from("votes").insert(row);
    return { ok: !r.error, error: r.error ? r.error.message : null };
  }

  async function getProfiles() {
    var r = await db().from("profiles").select("*").order("username");
    return r.data || [];
  }
  async function updateProfile(id, patch) {
    return !(await db().from("profiles").update(patch).eq("id", id)).error;
  }

  async function getSettings() {
    var r = await db().from("settings").select("*").eq("id", 1).maybeSingle();
    return r.data || { background_image: "img/unit-logo.jpg" };
  }
  async function saveSettings(patch) {
    return !(await db().from("settings").upsert(Object.assign({ id: 1 }, patch))).error;
  }

  async function applyBackground() {
    try {
      var s = await getSettings();
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
      var el = document.createElement("div");
      el.style.cssText = "position:fixed;bottom:6px;right:8px;font-size:10px;color:#4a5a4a;z-index:99;pointer-events:none;";
      el.textContent = "build " + (global.SITE_VERSION || "ta");
      document.body.appendChild(el);
    } catch (e) {}
  }

  async function getCompanies() {
    var r = await db().from("companies").select("*").order("name");
    return r.data || [];
  }
  async function saveCompany(row) {
    if (row.id) return !(await db().from("companies").update(row).eq("id", row.id)).error;
    return !(await db().from("companies").insert(row)).error;
  }
  async function deleteCompany(id) {
    return !(await db().from("companies").delete().eq("id", id)).error;
  }
  function buildCompanyOptions(companies, selected, includeUnitWide) {
    var h = "";
    if (includeUnitWide) {
      h += '<option value=""' + (!selected ? " selected" : "") + ">Unit-wide (all companies)</option>";
    }
    (companies || []).forEach(function (c) {
      h += '<option value="' + c.id + '"' + (selected === c.id ? " selected" : "") + ">" +
        esc(c.name) + (c.code ? " (" + esc(c.code) + ")" : "") + "</option>";
    });
    return h;
  }
  function companyName(companies, id) {
    if (!id) return "Unit-wide";
    for (var i = 0; i < (companies || []).length; i++) {
      if (companies[i].id === id) return companies[i].name;
    }
    return "—";
  }

  async function uploadFile(file, folder) {
    folder = folder || "uploads";
    var client = db();
    if (!client) return { error: "Not connected" };
    if (!file) return { error: "No file" };
    var safe = String(file.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
    var path = folder + "/" + Date.now() + "_" + safe;
    var up = await client.storage.from("archive-files").upload(path, file, {
      cacheControl: "3600", upsert: false
    });
    if (up.error) return { error: up.error.message };
    var pub = client.storage.from("archive-files").getPublicUrl(path);
    var url = pub.data && pub.data.publicUrl;
    if (!url) {
      var signed = await client.storage.from("archive-files").createSignedUrl(path, 60 * 60 * 24 * 365);
      url = signed.data && signed.data.signedUrl;
    }
    return { path: path, url: url, name: file.name, mime: file.type, size: file.size };
  }

  async function uploadFiles(fileList, folder) {
    var out = [];
    var files = Array.from(fileList || []);
    for (var i = 0; i < files.length; i++) {
      var r = await uploadFile(files[i], folder);
      if (r.error) return { error: r.error, partial: out };
      out.push(r);
    }
    return { files: out };
  }

  async function createMemberAccount(username, password, rankLevel, role, companyId) {
    role = role || "member";
    rankLevel = Number(rankLevel) || 1;
    companyId = companyId || null;
    username = String(username || "").trim();
    if (username.length < 3) return { error: "Username too short" };
    if (!password || password.length < 6) return { error: "Password must be at least 6 characters" };
    var client = db();
    var email = usernameToEmail(username);
    var existing = await client.from("profiles").select("id").eq("username", username).maybeSingle();
    if (existing.data) return { error: "Username already taken" };
    var res = await client.auth.signUp({
      email: email, password: password,
      options: { data: { username: username, role: role, rank_level: rankLevel } }
    });
    if (res.error) {
      var msg = res.error.message || "Could not create account";
      if (/already|registered|exists/i.test(msg)) return { error: "Username already taken" };
      return { error: msg };
    }
    if (res.data && res.data.user) {
      await client.from("profiles").upsert({
        id: res.data.user.id, username: username, role: role,
        rank_level: rankLevel, company_id: companyId
      });
    }
    return { user: res.data && res.data.user };
  }

  function getAdminClient() {
    var cfg = global.TA_CONFIG || {};
    if (!cfg.SUPABASE_SERVICE_ROLE_KEY || String(cfg.SUPABASE_SERVICE_ROLE_KEY).indexOf("PASTE_") === 0) {
      return null;
    }
    if (!global.supabase || !global.supabase.createClient) return null;
    return global.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }

  async function adminUpdateUsername(userId, newUsername) {
    newUsername = String(newUsername || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (newUsername.length < 3) return { error: "Username too short" };
    var admin = getAdminClient();
    if (!admin) return { error: "Add SUPABASE_SERVICE_ROLE_KEY to js/config.js to change login usernames." };
    var existing = await db().from("profiles").select("id").eq("username", newUsername).maybeSingle();
    if (existing.data && existing.data.id !== userId) return { error: "Username already taken" };
    var newEmail = newUsername + "@unit.local";
    var authRes = await admin.auth.admin.updateUserById(userId, { email: newEmail, email_confirm: true });
    if (authRes.error) return { error: "Auth update failed: " + authRes.error.message };
    var up = await admin.from("profiles").update({ username: newUsername }).eq("id", userId);
    if (up.error) return { error: "Profile update failed: " + up.error.message };
    return { ok: true };
  }

  async function adminSetPassword(userId, newPassword) {
    if (!newPassword || newPassword.length < 6) return { error: "Password min 6 characters" };
    var admin = getAdminClient();
    if (!admin) return { error: "Add SUPABASE_SERVICE_ROLE_KEY to js/config.js to reset passwords." };
    var res = await admin.auth.admin.updateUserById(userId, { password: newPassword });
    if (res.error) return { error: res.error.message };
    return { ok: true };
  }

  async function adminDeleteUser(userId) {
    var admin = getAdminClient();
    if (!admin) return { error: "Add SUPABASE_SERVICE_ROLE_KEY to js/config.js to delete accounts." };
    var res = await admin.auth.admin.deleteUser(userId);
    if (res.error) return { error: res.error.message };
    await admin.from("profiles").delete().eq("id", userId);
    return { ok: true };
  }

  global.RANKS = RANKS;
  global.usernameToEmail = usernameToEmail;
  global.getRankName = getRankName;
  global.formatRank = formatRank;
  global.canAccess = canAccess;
  global.rankOptions = rankOptions;
  global.esc = esc;
  global.initSupabase = initSupabase;
  global.db = db;
  global.getSession = getSession;
  global.loadSession = loadSession;
  global.login = login;
  global.logout = logout;
  global.requireAuth = requireAuth;
  global.requireAdmin = requireAdmin;
  global.requireStaff = requireStaff;
  global.canSeeReport = canSeeReport;
  global.canSeePoll = canSeePoll;
  global.getReports = getReports;
  global.saveReport = saveReport;
  global.deleteReport = deleteReport;
  global.getMerits = getMerits;
  global.saveMerit = saveMerit;
  global.deleteMerit = deleteMerit;
  global.getTraining = getTraining;
  global.saveTrainingItem = saveTrainingItem;
  global.deleteTraining = deleteTraining;
  global.getTutorials = getTutorials;
  global.saveTutorial = saveTutorial;
  global.deleteTutorial = deleteTutorial;
  global.getLinks = getLinks;
  global.saveLink = saveLink;
  global.deleteLink = deleteLink;
  global.getComments = getComments;
  global.addComment = addComment;
  global.getPolls = getPolls;
  global.savePoll = savePoll;
  global.deletePoll = deletePoll;
  global.getVotes = getVotes;
  global.castVote = castVote;
  global.getProfiles = getProfiles;
  global.updateProfile = updateProfile;
  global.getSettings = getSettings;
  global.saveSettings = saveSettings;
  global.applyBackground = applyBackground;
  global.showVersion = showVersion;
  global.createMemberAccount = createMemberAccount;
  global.getCompanies = getCompanies;
  global.saveCompany = saveCompany;
  global.deleteCompany = deleteCompany;
  global.buildCompanyOptions = buildCompanyOptions;
  global.companyName = companyName;
  global.uploadFile = uploadFile;
  global.uploadFiles = uploadFiles;
  global.getAdminClient = getAdminClient;
  global.adminUpdateUsername = adminUpdateUsername;
  global.adminSetPassword = adminSetPassword;
  global.adminDeleteUser = adminDeleteUser;

  initSupabase();
})(typeof window !== "undefined" ? window : this);
