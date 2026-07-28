// Auth helpers

async function getSession() {
  if (!supabase) initSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}

async function getProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Profile fetch error:", error);
    return null;
  }
  return data;
}

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = "index.html";
    return null;
  }
  return user;
}

async function requireStaff() {
  const profile = await getProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
    window.location.href = "dashboard.html";
    return null;
  }
  return profile;
}

async function logout() {
  await supabase.auth.signOut();
  window.location.href = "index.html";
}

// Protect page on load
async function protectPage() {
  const user = await requireAuth();
  if (!user) return null;

  const profile = await getProfile();
  if (!profile) {
    alert("Profile not found. Contact an admin.");
    await logout();
    return null;
  }

  // Inject user info into navbar if elements exist
  const nameEl = document.getElementById("nav-username");
  const rankEl = document.getElementById("nav-rank");
  if (nameEl) nameEl.textContent = profile.username;
  if (rankEl) {
    rankEl.textContent = `${getRankName(profile.rank_level)} • ${profile.role}`;
    rankEl.className = `rank rank-${profile.rank_level}`;
  }

  // Show admin link if staff
  const adminLink = document.getElementById("nav-admin");
  if (adminLink && (profile.role === "admin" || profile.role === "moderator")) {
    adminLink.classList.remove("hidden");
  }

  return profile;
}
