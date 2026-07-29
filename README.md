# Tactical Archive (GitHub Pages + Supabase)

Shared unit archive: reports, voting, training, tutorials, tactical centre links, merits.
Username login only (no email/phone for members). Hosted as static HTML on GitHub Pages.

## Quick setup

### 1. Fill keys

Edit `js/config.js`:

- `SUPABASE_ANON_KEY` — Project Settings → API → anon public
- `SUPABASE_SERVICE_ROLE_KEY` — service_role (secret; only for admin password reset / delete / login username change)

### 2. Run SQL

Supabase → SQL Editor → paste and run `sql/setup.sql`

### 3. Auth settings

- Authentication → Providers → Email → **enable** Email + Sign ups  
- **Disable** Confirm email (for testing)

### 4. Create first admin

Authentication → Users → Add user  

- Email: `admin@unit.local`  
- Password: your choice  

Then SQL:

```sql
insert into profiles (id, username, role, rank_level)
select id, 'admin', 'admin', 22
from auth.users
where email = 'admin@unit.local'
on conflict (id) do update
  set username = 'admin', role = 'admin', rank_level = 22;
```

Login on the site with username **admin** and that password.

### 5. Deploy to GitHub Pages

Upload the whole folder to your repo root (or `/docs`).  
Settings → Pages → Deploy from branch → root (or docs).

Site URL example: `https://YOURUSER.github.io/REPO/`

## Features

| Feature | Details |
|--------|---------|
| Login | Username + password (`name@unit.local` under the hood) |
| Ranks | Private → General (22 levels) |
| Companies | Demon, Nightmare, Cerberus, Hellfire |
| Reports | Min rank + company (or tagged). **No admin bypass.** Admins can edit reports they can access. |
| Voting | Yes/No/Maybe, min rank, company scope |
| Admin | Create members, reset passwords, delete accounts, manage content |

## Files

- `index.html` — login  
- `dashboard.html` — home  
- `reports.html` / `report.html`  
- `voting.html`  
- `training.html` / `tutorials.html` / `tactical-centre.html` / `merits.html`  
- `admin.html` / `profile.html`  
- `js/config.js` `js/data.js` `js/ranks-icons.js`  
- `css/style.css`  
- `sql/setup.sql`
