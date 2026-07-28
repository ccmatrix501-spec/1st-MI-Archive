# Tactical Archive – Pure HTML (GitHub Pages)

100% client-side archive. No backend. Runs on GitHub Pages.

## Features

- Login / Register
- 22 military ranks (Private → General)
- Rank-gated Reports
- Merits & Awards
- Training materials
- Tutorial videos
- Tactical Centre links
- Comments on reports
- Full Admin panel with **Edit** support for all content
- Create / promote admins
- Profile settings (change password + site background image)
- Export / Import as JSON

## Ranks

1. Private  
2. Private First Class  
3. Lance Corporal  
4. Specialist  
5. Corporal  
6. Sergeant  
7. Staff Sergeant  
8. Gunnery Sergeant  
9. Master Sergeant  
10. First Sergeant  
11. Master Gunnery Sergeant  
12. Officer Cadet  
13. Second Lieutenant  
14. First Lieutenant  
15. Captain  
16. Warrant Officer  
17. Sergeant Major  
18. Command Sergeant Major  
19. Major  
20. Lieutenant Colonel  
21. Colonel  
22. General  

## Setup on GitHub Pages

1. Create a public GitHub repo  
2. Upload all files from this folder  
3. Settings → Pages → Source = `main` / root  
4. Site goes live at `https://YOUR_USERNAME.github.io/REPO_NAME/`

## Default admin

| Username | Password  |
|----------|-----------|
| admin    | admin123  |

Go to **Profile** (admins only) to change password and set a background image.

## Sharing data with the unit

1. Admin creates content  
2. Admin → Export / Import → Download Backup JSON  
3. Share the JSON file  
4. Members import it  

---

All data is stored in the browser (localStorage). Not real server security.
