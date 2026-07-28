# Tactical Archive – Secured HTML Version

A pure **HTML + CSS + JavaScript** secured archive for gaming communities / units.

No Node.js, no Next.js, no build step. Just static files that work on **GitHub Pages**.

---

## What you get

- Real login (Supabase Auth)
- Rank system (Recruit → General)
- **Rank-gated reports** – users below the required rank cannot see the content
- Merits & Awards
- Training materials (download / links)
- Tutorial videos
- Tactical Centre (web + desktop app links)
- Comments under reports
- Admin panel to create reports
- Dark tactical military theme

### Security

Even though this is pure HTML, the real security lives in **Supabase Row Level Security (RLS)**.  
The browser cannot bypass the rank restrictions because the database itself refuses to return the data.

---

## Quick Setup

### 1. Create a free Supabase project
1. Go to https://supabase.com → New Project
2. Open **SQL Editor** → paste the entire contents of `supabase-schema.sql` → Run
3. Go to **Authentication → Providers** and enable Email
4. Copy your **Project URL** and **anon public key**

### 2. Put your keys in the code
Open `js/config.js` and replace:

```js
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY_HERE";
```

### 3. Make yourself admin
1. Open `index.html` in a browser (or host it)
2. Create an account
3. In Supabase → Table Editor → `profiles`
4. Find your user and set:
   - `role` = `admin`
   - `rank_level` = `9`
   - `rank_name` = `General`

### 4. Host on GitHub Pages
1. Create a new GitHub repository
2. Upload all the files from this folder
3. Go to **Settings → Pages**
4. Source: Deploy from branch `main` / root
5. Your site will be live at `https://yourusername.github.io/repo-name/`

---

## File Structure

```
gaming-archive-html/
├── index.html              ← Login page
├── dashboard.html
├── reports.html
├── report.html             ← Single report + comments
├── merits.html
├── training.html
├── tutorials.html
├── tactical-centre.html
├── admin.html              ← Staff only (create reports)
├── css/style.css
├── js/
│   ├── config.js           ← PUT YOUR SUPABASE KEYS HERE
│   ├── supabase-client.js
│   └── auth.js
├── supabase-schema.sql     ← Database + security rules
└── README.md
```

---

## Rank Levels

| Level | Name       |
|-------|------------|
| 1     | Recruit    |
| 2     | Private    |
| 3     | Corporal   |
| 4     | Sergeant   |
| 5     | Lieutenant |
| 6     | Captain    |
| 7     | Major      |
| 8     | Colonel    |
| 9     | General    |

When you create a report in the Admin panel you choose the minimum rank. Anyone below that rank sees a lock and the database will not return the row.

---

## Notes

- This version is perfect for GitHub Pages.
- File uploads are possible but simplified in this HTML version (you can still add files via Supabase Storage dashboard).
- For more advanced features (rich text editor, private signed downloads, Discord login) use the full Next.js version instead.

Enjoy your secured archive.
