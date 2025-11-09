const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const cors = require('cors');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

const app = express();
app.use(cors());
app.use(express.static('public'));

// simple in-memory cache for store API
const storeCache = new Map();
const STORE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hrs

async function getStoreInfo(appid) {
  const cached = storeCache.get(appid);
  if (cached && (Date.now() - cached.ts) < STORE_CACHE_TTL) {
    return cached.value;
  }

  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&l=en`;
    const res = await fetch(url, { timeout: 10000 });
    const json = await res.json();
    if (json && json[appid] && json[appid].success && json[appid].data) {
      const data = json[appid].data;
      const info = {
        name: data.name || `App ${appid}`,
        header_image: data.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`,
        short_description: data.short_description || ''
      };
      storeCache.set(appid, { value: info, ts: Date.now() });
      return info;
    }
  } catch (err) {
    console.warn(`Failed to fetch store info for ${appid}: ${err.message}`);
  }

  // fallback
  const fallback = {
    name: `App ${appid}`,
    header_image: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`,
    short_description: ''
  };
  storeCache.set(appid, { value: fallback, ts: Date.now() });
  return fallback;
}

async function findAchievementJSON(dir) {
  // try files that contain "achiev" in name first
  try {
    const files = await fs.readdir(dir);
    const jsonFiles = files.filter(f => f.toLowerCase().endsWith('.json'));
    const preferred = jsonFiles.filter(f => f.toLowerCase().includes('achiev'));

    const tryFiles = preferred.length ? preferred : jsonFiles;
    for (const f of tryFiles) {
      const p = path.join(dir, f);
      try {
        const content = await fs.readFile(p, 'utf8');
        const parsed = JSON.parse(content);
        // we allow arrays or objects
        return parsed;
      } catch (err) {
        // ignore parse errors and continue
      }
    }
  } catch (err) {
    // directory may not exist
  }
  return null;
}

function normalizeAchievements(raw) {
  if (!raw) return [];

  // If the top-level is an object containing "achievements" array
  if (typeof raw === 'object' && !Array.isArray(raw) && raw.achievements && Array.isArray(raw.achievements)) {
    raw = raw.achievements;
  }

  // If it's an object mapping ids -> objects, convert to array
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const arr = [];
    for (const [k, v] of Object.entries(raw)) {
      if (v && typeof v === 'object') {
        arr.push({
          id: k,
          name: v.displayName || v.name || v.title || k,
          description: v.description || v.hint || '',
          unlocked: Boolean(v.unlocked || v.achieved || v.owned),
          unlocktime: v.unlocktime || v.unlock_time || v.time || null
        });
      } else {
        arr.push({ id: k, name: String(v), unlocked: false });
      }
    }
    return arr;
  }

  // If already an array
  if (Array.isArray(raw)) {
    const arr = raw.map((it, idx) => {
      if (typeof it === 'string') {
        return { id: `${idx}`, name: it, unlocked: false };
      }
      if (typeof it === 'object') {
        return {
          id: it.name || it.apiName || it.id || `${idx}`,
          name: it.displayName || it.name || it.title || it.apiName || `Achievement ${idx + 1}`,
          description: it.description || it.desc || it.hint || '',
          unlocked: Boolean(it.unlocked || it.achieved || it.owned),
          unlocktime: it.unlocktime || it.unlock_time || it.time || null
        };
      }
      return { id: `${idx}`, name: String(it), unlocked: false };
    });
    return arr;
  }

  // unknown shape
  return [];
}

app.get('/api/games', async (req, res) => {
  try {
    const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
    const appDirs = entries.filter(e => e.isDirectory() && /^
\d+$/.test(e.name));
    const results = [];
    for (const d of appDirs) {
      const appid = d.name;
      const dirPath = path.join(DATA_DIR, appid);
      const rawAchievements = await findAchievementJSON(dirPath);
      const achievements = normalizeAchievements(rawAchievements);
      const info = await getStoreInfo(appid);
      results.push({
        appid,
        name: info.name,
        header_image: info.header_image,
        short_description: info.short_description,
        achievements
      });
    }
    // sort by name for stable UI
    results.sort((a, b) => a.name.localeCompare(b.name));
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Achievement Viewer running on http://localhost:${PORT}`);
  console.log(`Serving data from ${DATA_DIR}`);
});