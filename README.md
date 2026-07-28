# Tactical Archive – Pure HTML (GitHub Pages)

A complete **client-side** archive for gaming communities / units.

- No Supabase
- No backend
- No build step
- Runs 100% on GitHub Pages

---

## Features

- Login / Register
- Rank system (Recruit → General)
- Rank-gated Reports (users below the required rank see a lock)
- Merits & Awards
- Training materials
- Tutorial videos
- Tactical Centre links (web + desktop)
- Comments on reports
- Full Admin panel (create everything + manage ranks/roles)
- Export / Import as JSON (so you can share the archive with the unit)

---

## How to put it on GitHub Pages

1. Create a new **public** GitHub repository
2. Upload **all** the files from this folder (keep the folder structure)
3. Go to **Settings → Pages**
4. Source = `main` branch, folder = `/ (root)`
5. Wait ~30 seconds

Your site will be live at:
```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

---

## First login

Default admin account (change it immediately):

| Username | Password  |
|----------|-----------|
| admin    | admin123  |

After login go to **Admin → Users** and change ranks/roles as needed.

---

## How the community shares data

Because everything is stored in each person’s browser:

1. An admin creates reports, awards, etc.
2. Admin goes to **Admin → Export / Import** and downloads the JSON backup
3. Admin shares the JSON file with the unit (Discord, Drive, etc.)
4. Other members go to Admin → Import and load the same file

This is the practical way to keep everyone on the same archive without a real database.

---

## File structure

```
index.html              ← Login
dashboard.html
reports.html
report.html
merits.html
training.html
tutorials.html
tactical-centre.html
admin.html              ← Full management
css/style.css
js/data.js              ← All logic + localStorage
README.md
```

---

## Security note

This is pure client-side storage. It is **not** real server security.  
Anyone with browser dev tools can see the data.  
It is suitable for a private community archive, not for highly sensitive information.

---

Enjoy.
