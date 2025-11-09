async function fetchGames() {
  const res = await fetch('/api/games');
  if (!res.ok) throw new Error('Failed to load games');
  return res.json();
}

function formatTime(ts) {
  if (!ts) return '';
  const t = Number(ts) * (ts < 1e10 ? 1 : 1); // ensure number
  const d = new Date(t * 1000);
  return d.toLocaleString();
}

function createCard(game) {
  const card = document.createElement('div');
  card.className = 'card';

  const cover = document.createElement('div');
  cover.className = 'cover';
  cover.style.backgroundImage = `url("${game.header_image}")`;
  card.appendChild(cover);

  const body = document.createElement('div');
  body.className = 'body';

  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = `${game.name} (${game.appid})`;
  body.appendChild(title);

  if (game.short_description) {
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = game.short_description;
    body.appendChild(meta);
  }

  const achievements = game.achievements || [];
  const list = document.createElement('ul');
  list.className = 'ach-list';

  if (!achievements.length) {
    const li = document.createElement('li');
    li.textContent = 'No achievement data found in data/' + game.appid;
    list.appendChild(li);
  } else {
    achievements.forEach(a => {
      const li = document.createElement('li');
      const dot = document.createElement('span');
      dot.textContent = a.unlocked ? '●' : '○';
      dot.style.width = '1.2em';
      dot.style.display = 'inline-block';
      dot.style.color = a.unlocked ? 'green' : '#aaa';
      const name = document.createElement('span');
      name.textContent = a.name;
      name.style.flex = '1';
      name.className = a.unlocked ? 'ach-unlocked' : 'ach-locked';
      li.appendChild(dot);
      li.appendChild(name);
      if (a.unlocktime) {
        const tspan = document.createElement('span');
        tspan.style.marginLeft = '8px';
        tspan.style.fontSize = '0.85em';
        tspan.style.color = '#666';
        tspan.textContent = formatTime(a.unlocktime);
        li.appendChild(tspan);
      }
      list.appendChild(li);
    });
  }

  body.appendChild(list);
  card.appendChild(body);
  return card;
}

async function init() {
  const status = document.getElementById('status');
  const container = document.getElementById('games');
  try {
    const games = await fetchGames();
    status.textContent = `Found ${games.length} games`;
    container.innerHTML = '';
    if (games.length === 0) {
      container.textContent = 'No AppID folders found in /data';
    }
    games.forEach(g => container.appendChild(createCard(g)));
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
  }
}

init();
