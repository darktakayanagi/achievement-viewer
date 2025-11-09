# Achievement Viewer

A small Node.js + Express app that loads Steam emulator achievement data from a local `data/AppID/*/` folder (where `*` are different Steam AppIDs) and shows an index page with each game's image and its achievement information.

Features
- Scans `./data` for numeric subfolders (AppIDs).
- Looks for JSON files inside each AppID folder (e.g. `achievements.json`, `user_123456_achievements.json`) and attempts to parse achievement data.
- Fetches game metadata (name and header image) from the Steam Store API (with a CDN image fallback).
- Serves a simple frontend at `index.html` which lists games and their achievements.

Quick start (local)
1. Clone the repository.
2. Install dependencies:
   npm install
3. Prepare a `data` directory with a structure like:
   data/570/achievements.json
   data/440/achievements.json
   (Each AppID folder can have any JSON file containing achievement info.)
4. Optionally set environment variables:
   - STEAM_API_KEY (not required for the store image fallback, but you may set it if you extend the app)
   - STEAM_ID
   Example (macOS / Linux):
   STEAM_API_KEY=... STEAM_ID=... PORT=3000 npm start
5. Start:
   npm start
6. Open http://localhost:3000

Expected/Supported achievement file formats
- An array of achievement objects:
  [
    { "name": "First Steps", "description": "Do X", "unlocked": true, "unlocktime": 1630000000 },
    { "name": "Secret", "unlocked": false }
  ]
- An object with an `achievements` array:
  { "achievements": [ ... ] }
- A mapping of keys to objects:
  { "ACH_WIN_ONE_GAME": { "name": "Winner", "unlocked": true } }

The frontend will try to normalize common shapes into a list of achievements with:
- id
- name/title
- description (if available)
- unlocked (boolean)
- unlocktime (if available)

Repository contents
- server.js — Express server and API that reads local data and fetches store info
- public/index.html — Frontend UI
- public/app.js — Frontend logic
- data/ — sample data folder with an example
- package.json — dependencies and scripts

Notes
- The Steam Store API (https://store.steampowered.com/api/appdetails?appids=APPID) is used to fetch game name and header. This does not require a key. If you need richer data (schemas, official achievement lists), you can add use of the Steam Web API (ISteamUserStats) and provide STEAM_API_KEY / STEAM_ID in repo secrets or environment for server-side calls.
- Place your emulator output JSON inside `data/<AppID>/` for each game.

If you want, I can:
- Add support to call Steam Web API (ISteamUserStats/GetSchemaForGame or GetPlayerAchievements) using your STEAM_API_KEY to compute completion percentages or to merge emulator/unofficial data with official achievement metadata.
- Add authentication or a small admin interface to upload emulator export files through the UI.
- Improve the UI (filters, completion percentages, sorting, nicer layout).