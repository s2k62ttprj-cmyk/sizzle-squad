'use strict';
/* Navdeep's Farm - HUD, toasts and remote-friendly menus. */

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const img = (name, cls = '') => `<img class="icon ${cls}" src="${icon(name)}" alt="">`;
const fmtGold = n => n.toLocaleString('en-US') + 'g';
// On a touch screen the remote's OK and BACK are the on-screen A and B buttons.
const touchMode = !window.AndroidTV && (('ontouchstart' in window) || matchMedia('(pointer: coarse)').matches);
const keyLabel = k => (touchMode ? ({ OK: 'A', BACK: 'B', 'Hold OK': 'Hold A', '◀ ▲ ▼ ▶': 'Arrow pad' }[k] || k) : k);
const keyHint = (k, t) => `<span><b class="key">${keyLabel(k)}</b> ${t}</span>`;
const FOOTER = keyHint('▲▼', 'Choose') + keyHint('OK', 'Select') + keyHint('BACK', 'Close');

/* ---------- HUD ---------- */
const hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function setIcon(id, name) { const k = id + ':src'; if (hudCache[k] !== name) { hudCache[k] = name; $(id).src = icon(name); } }
function setWidth(id, pct) { const k = id + ':w'; const v = Math.round(pct) + '%'; if (hudCache[k] !== v) { hudCache[k] = v; $(id).style.width = v; } }
function setClass(id, cls, on) { $(id).classList.toggle(cls, on); }

function updateHud() {
  if (!S || mode !== 'play') return;
  setText('hud-day', `Day ${S.day}`);
  setText('hud-clock', fmtTime(S.time));
  setIcon('wx-icon', S.time >= 20 * 60 ? 'moon' : S.weather === 'rain' ? 'rain' : 'sun');
  setText('gold', fmtGold(S.gold));
  setWidth('energy-fill', 100 * S.energy / S.maxEnergy);
  setText('energy-text', String(S.energy));
  setClass('energy-fill', 'low', S.energy < 20);
  setWidth('water-fill', 100 * S.water / S.canMax);
  setText('water-text', String(S.water));
  if (S.hand) {
    setIcon('hand-icon', S.hand);
    setText('hand-name', itemName(S.hand));
    setText('hand-sub', `× ${handCount(S.hand)}  ·  ${touchMode ? 'tap ⇄' : 'hold OK'} to switch`);
  } else {
    setIcon('hand-icon', 'bag');
    setText('hand-name', 'No seeds');
    setText('hand-sub', "Buy some at Wren's stall");
  }
  const [tx, ty] = targetTile();
  const a = fishing ? { label: fishing.phase === 'bite' ? 'A bite! Press OK now!' : 'Wait for the "!", then press OK', run: true } : getAction(tx, ty);
  setClass('hud-hint', 'hidden', !a);
  if (a) {
    setText('hint-text', a.label + (a.cost ? `  (${a.cost} energy)` : ''));
    setClass('hud-hint', 'info', !a.run);
  }
  if (S.goal < GOALS.length) {
    const g = GOALS[S.goal];
    const have = Math.min(S.stats[g.stat] || 0, g.need);
    setText('goal-text', `${g.text}  ${have.toLocaleString('en-US')}/${g.need.toLocaleString('en-US')}`);
  } else setText('goal-text', 'Every goal complete. Master farmer!');
}

/* ---------- toasts ---------- */
function toast(msg, kind = '', iconName = null) {
  const box = $('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = (iconName ? img(iconName, 'sm') : '') + `<span>${esc(msg)}</span>`;
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 450); }, 2800);
}

/* ---------- menu stack ---------- */
const UI = {
  stack: [],
  active() { return this.stack.length > 0; },
  open(screen) {
    this.stack.push(screen);
    input.dirs = [];
    input.okAt = 0;
    input.queued = null;
    this.render();
  },
  close() { this.stack.pop(); this.render(); },
  closeAll() { this.stack = []; this.render(); },
  render() {
    const root = $('menu');
    const top = this.stack[this.stack.length - 1];
    if (!top) { root.className = 'hidden'; root.innerHTML = ''; return; }
    root.className = top.rootCls || '';
    root.innerHTML = top.html();
    const sel = root.querySelector('.sel');
    if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
  },
  key(k) { const top = this.stack[this.stack.length - 1]; if (top) top.key(k); },
};

// A list of choices driven by the remote: arrows move, OK picks, BACK closes.
function ListScreen(opts) {
  const s = { sel: opts.sel || 0, rootCls: opts.rootCls || '' };
  const items = () => (typeof opts.items === 'function' ? opts.items() : opts.items);
  s.html = () => {
    const list = items();
    s.sel = Math.max(0, Math.min(s.sel, list.length - 1));
    const sub = typeof opts.sub === 'function' ? opts.sub() : opts.sub;
    const header = typeof opts.header === 'function' ? opts.header() : opts.header;
    let h = `<div class="card ${opts.cls || ''}">`;
    if (header) h += header;
    if (opts.title) h += `<h2>${opts.icon ? img(opts.icon, 'lg') : ''}<span>${esc(opts.title)}</span></h2>`;
    if (sub) h += `<div class="sub">${sub}</div>`;
    h += `<div class="list ${opts.horizontal ? 'row' : ''}">`;
    list.forEach((it, n) => {
      h += `<div class="item ${n === s.sel ? 'sel' : ''} ${it.disabled ? 'disabled' : ''}">`;
      if (it.icon) h += img(it.icon, opts.horizontal ? 'lg' : '');
      h += `<div class="grow"><div class="label">${esc(it.label)}</div>${it.desc ? `<div class="desc">${esc(it.desc)}</div>` : ''}</div>`;
      if (it.value != null) h += `<div class="right">${esc(it.value)}</div>`;
      h += '</div>';
    });
    h += `</div><div class="footer">${opts.footer || FOOTER}</div></div>`;
    return h;
  };
  s.key = k => {
    const list = items(), it = list[s.sel];
    const prev = opts.horizontal ? 'left' : 'up', next = opts.horizontal ? 'right' : 'down';
    if (k === prev || k === next) {
      if (list.length > 1) {
        s.sel = (s.sel + (k === next ? 1 : -1) + list.length) % list.length;
        Sound.play('move');
        UI.render();
      }
    } else if (k === 'ok') {
      if (it && !it.disabled && it.ok) { Sound.play('select'); it.ok(); UI.render(); } else Sound.play('error');
    } else if ((k === 'left' || k === 'right') && it && it.adjust) {
      it.adjust(k === 'left' ? -1 : 1);
      UI.render();
    } else if (k === 'back' || k === 'menu') {
      Sound.play('back');
      if (opts.onBack) opts.onBack(); else UI.close();
    }
  };
  return s;
}

function confirmBox(title, text, yes, onYes, no = 'Cancel') {
  UI.open(ListScreen({
    title, sub: text ? esc(text) : '', cls: 'small',
    items: [
      { label: yes, ok: () => { UI.close(); onYes(); } },
      { label: no, ok: () => UI.close() },
    ],
  }));
}

/* ---------- screens ---------- */
function openTitle() {
  UI.stack = [];
  UI.open(ListScreen({
    cls: 'title-card', rootCls: 'clear',
    header: `<div class="logo">Navdeep's Farm</div><div class="tagline">${img('golu', 'lg')}<span>Starring farmer Bambi</span></div>`,
    items: () => {
      const hasSave = !!Store.get(SAVE_KEY);
      return [
        hasSave && { label: 'Continue', ok: () => { const s = loadSave(); startGame(s || newState(), !s); } },
        {
          label: 'New Game',
          ok: () => hasSave
            ? confirmBox('Start a new farm?', 'Your current farm will be replaced.', 'Start over', () => startGame(newState(), true), 'Keep my farm')
            : startGame(newState(), true),
        },
        { label: 'How to Play', ok: openHelp },
        window.AndroidTV && { label: 'Exit', ok: exitApp },
      ].filter(Boolean);
    },
    footer: keyHint('▲▼', 'Choose') + keyHint('OK', 'Select'),
    onBack: () => { if (window.AndroidTV) confirmBox("Leave Navdeep's Farm?", '', 'Exit', exitApp, 'Stay'); },
  }));
}

function openPauseMenu() {
  Sound.play('select');
  UI.open(ListScreen({
    title: 'Menu', icon: 'bag',
    sub: () => `Day ${S.day} · ${fmtTime(S.time)} · ${fmtGold(S.gold)}`,
    items: [
      { label: 'Resume', icon: 'play', ok: () => UI.close() },
      { label: 'Bag', icon: 'bag', desc: 'Pick seeds to hold, eat a snack', ok: openBag },
      { label: 'Farm Managers', icon: 'hire', desc: 'Hire help, choose where they work', ok: openManagers },
      { label: 'Customer Reviews', icon: 'happy', desc: 'What people say about Bambi', ok: openReviews },
      { label: 'Farm Journal', icon: 'book', desc: 'Goals and rewards', ok: openJournal },
      { label: 'How to Play', icon: 'help', ok: openHelp },
      { label: 'Settings', icon: 'gear', desc: 'Music and sound', ok: openSettings },
      { label: 'Save & Quit to Title', icon: 'door', ok: () => { UI.closeAll(); backToTitle(); } },
    ],
  }));
}

function openBag() {
  UI.open(ListScreen({
    title: 'Bag', icon: 'bag',
    sub: () => `Energy ${S.energy}/${S.maxEnergy} · Water ${S.water}/${S.canMax} · ${fmtGold(S.gold)}`,
    items: () => {
      const list = [];
      for (const h of handOptions()) {
        list.push({
          label: itemName(h), icon: h, value: `× ${handCount(h)}`,
          desc: S.hand === h ? 'In your hand' : 'OK: hold this',
          ok: () => { S.hand = h; toast(`Holding ${itemName(h)}`, '', h); },
        });
      }
      for (const id of [...CROP_IDS, ...Object.keys(GOODS)]) {
        if (!invCount(id)) continue;
        const g = CROPS[id] || GOODS[id];
        const desc = (g.energy ? `OK: eat (+${g.energy} energy)` : "Can't be eaten") + (g.sell ? ` · sells for ${g.sell}g` : '');
        list.push({ label: g.name, icon: id, value: `× ${invCount(id)}`, desc, ok: () => eat(id) });
      }
      if (!list.length) list.push({ label: 'Your bag is empty', disabled: true });
      return list;
    },
  }));
}

function openJournal() {
  UI.open(ListScreen({
    title: 'Farm Journal', icon: 'book',
    sub: () => `Harvested ${S.stats.harvested} · Sold ${S.stats.shipped} items · Earned ${fmtGold(S.stats.earned)}`,
    items: () => GOALS.map((g, n) => {
      const done = n < S.goal, current = n === S.goal;
      const have = Math.min(S.stats[g.stat] || 0, g.need);
      return {
        label: n > S.goal ? '???' : g.text,
        icon: done ? 'check' : current ? 'star' : 'lock',
        desc: done ? 'Done!' : current ? `In progress: ${have.toLocaleString('en-US')} of ${g.need.toLocaleString('en-US')}` : 'Finish the goal above to unlock',
        value: n > S.goal ? '' : rewardText(g.reward),
        disabled: n > S.goal,
        ok: () => {},
      };
    }),
  }));
}

function openHelp() {
  const p = (k, t) => `<p>${k ? `<b class="key">${keyLabel(k)}</b> ` : ''}${t}</p>`;
  UI.open({
    html: () => `<div class="card help"><h2>${img('help', 'lg')}<span>How to Play</span></h2><div class="help-body">
      <p class="h">Controls</p>
      ${p('◀ ▲ ▼ ▶', 'Walk around your farm.')}
      ${p('OK', 'Use whatever is in front of you. The box in the bottom-right corner says what will happen.')}
      ${p('Hold OK', "or CH +/− to switch which seeds you're holding.")}
      ${p('BACK', 'Open the menu.')}
      <p class="h">Growing crops</p>
      <p>Till grass, plant seeds, then water them every day. Crops only grow on days they were watered, and rain counts!</p>
      <p>Refill your watering can at the <b>well</b> or the <b>pond</b>.</p>
      <p class="h">Money</p>
      <p>Sell crops and eggs at the <b>market crate</b> beside your house, or stock the <b>veggie stand</b> by the lane: customers pay more and say what they think of Bambi.</p>
      <p>Buy seeds, saplings, a fishing rod, chickens, cows, sheep, goats and pigs at <b>Wren's stall</b> in the top-right corner.</p>
      <p class="h">Animals, fruit and fish</p>
      <p>Animals in the pasture give milk, wool or truffles every morning: walk up and press OK. Pick fruit in the orchard below the field. Hold the fishing rod, face the pond, press OK, then press OK again the moment you see "!".</p>
      <p class="h">Cooking</p>
      <p>Face the walls of your house (not the door) to cook dishes like Veggie Curry and Mango Lassi. They sell for a lot!</p>
      <p class="h">Managers</p>
      <p>Hire help at the <b>HIRING board</b>: watering, crops, clean-up, animals, orchard and stand sellers. They are paid every morning.</p>
      <p class="h">Ending the day</p>
      <p>Walk up to your front door to sleep. Sleeping saves the game and refills your energy. Stay up past midnight and you'll pass out!</p>
      </div><div class="footer">${keyHint('BACK', 'Close')}</div></div>`,
    key: k => { if (k === 'back' || k === 'ok' || k === 'menu') { Sound.play('back'); UI.close(); } },
  });
}

function openSettings() {
  const st = Sound.settings;
  const toggle = key => {
    st[key] = !st[key];
    Sound.applySettings();
    Store.set('sunpatch-settings', JSON.stringify(st));
  };
  UI.open(ListScreen({
    title: 'Settings', icon: 'gear',
    items: () => [
      { label: 'Music', value: st.music ? 'On' : 'Off', ok: () => toggle('music'), adjust: () => toggle('music') },
      { label: 'Sound effects', value: st.sfx ? 'On' : 'Off', ok: () => toggle('sfx'), adjust: () => toggle('sfx') },
    ],
  }));
}

function openShop() {
  const qty = {};
  Sound.play('select');
  UI.open(ListScreen({
    title: "Wren's Seed Stall", icon: 'shop', cls: 'wide',
    sub: () => `"Fresh seeds, fair prices!" &nbsp;You have <b>${fmtGold(S.gold)}</b>`,
    items: () => SHOP.map(it => {
      const q = qty[it.id] || 1;
      const soldOut = (it.id === 'can' && S.canMax >= 50) || (it.id === 'chicken' && S.chickens.length >= MAX_CHICKENS)
        || (it.id === 'rod' && S.inv.rod) || (it.id.startsWith('animal:') && S.animals.length >= MAX_ANIMALS);
      let owned = '';
      if (it.id.startsWith('seed:')) owned = ` · you have ${S.inv.seeds[it.id.slice(5)] || 0}`;
      else if (it.id === 'sprinkler') owned = ` · you have ${S.inv.sprinkler}`;
      else if (it.id === 'chicken') owned = ` · you have ${S.chickens.length} of ${MAX_CHICKENS}`;
      return {
        label: it.stack ? `${it.name}  × ${q}` : it.name,
        desc: soldOut ? (it.id === 'can' ? 'Already upgraded' : 'Your coop is full') : it.desc + owned,
        icon: shopIcon(it),
        value: soldOut ? 'Sold out' : fmtGold(it.price * q),
        disabled: soldOut,
        adjust: it.stack ? d => { qty[it.id] = Math.max(1, Math.min(99, q + d)); Sound.play('move'); } : null,
        ok: () => buyItem(it, q),
      };
    }),
    footer: keyHint('▲▼', 'Choose') + keyHint('◀▶', 'Amount') + keyHint('OK', 'Buy') + keyHint('BACK', 'Leave'),
  }));
}

function openSellMenu() {
  Sound.play('select');
  UI.open(ListScreen({
    title: 'Market Crate', icon: 'coin', sub: 'Sell your harvest for gold.',
    items: () => {
      const list = sellables();
      if (!list.length) return [{ label: 'Nothing left to sell', disabled: true }];
      const total = list.reduce((a, [, n, p]) => a + n * p, 0);
      return [
        { label: 'Sell everything', icon: 'coin', value: fmtGold(total), ok: () => { sellAll(); UI.close(); } },
        ...list.map(([id, n, p]) => ({ label: `${itemName(id)} × ${n}`, icon: id, desc: `${p}g each`, value: fmtGold(n * p), ok: () => sellStack(id) })),
      ];
    },
  }));
}

function openHandPicker() {
  const opts = handOptions();
  if (!opts.length) { toast("You have no seeds. Buy some at Wren's stall!", 'bad'); Sound.play('error'); return; }
  Sound.play('select');
  UI.open(ListScreen({
    horizontal: true, rootCls: 'clear bottom', cls: 'picker', title: 'Hold which item?',
    sel: Math.max(0, opts.indexOf(S.hand)),
    items: () => opts.map(h => ({
      label: itemName(h).replace(' Seeds', ''), icon: h, value: `× ${handCount(h)}`,
      ok: () => { S.hand = h; UI.close(); updateHud(); },
    })),
    footer: keyHint('◀▶', 'Choose') + keyHint('OK', 'Hold') + keyHint('BACK', 'Cancel'),
  }));
}

function askSleep() {
  const late = S.time < 18 * 60 ? ' It is still early!' : '';
  confirmBox('Go to bed?', 'Sleeping ends the day and saves your farm.' + late, 'Sleep', () => beginSleep(false), 'Not yet');
}

function summaryCard(title, iconName, lines) {
  return `<h2>${img(iconName, 'lg')}<span>${esc(title)}</span></h2>` +
    lines.map(([ic, t]) => `<div class="line">${img(ic)}<span>${esc(t)}</span></div>`).join('');
}

function showDaySummary(rep) {
  const lines = [];
  if (rep.passedOut) lines.push(['bolt', 'You stayed up too late and passed out! You only got back 60% of your energy.']);
  lines.push(rep.weather === 'rain' ? ['rain', "It's raining today. All of your crops are already watered!"] : ['sun', "It's a sunny day. Don't forget to water your crops."]);
  if (rep.grew) lines.push(['seed:radish', `${rep.grew} watered crop${rep.grew > 1 ? 's' : ''} grew overnight.`]);
  if (rep.sprinkled) lines.push(['sprinkler', `Your sprinklers watered ${rep.sprinkled} tile${rep.sprinkled > 1 ? 's' : ''}.`]);
  const eggs = rep.eggs + rep.bigEggs;
  if (eggs) lines.push(['egg', `Your chickens laid ${eggs} egg${eggs > 1 ? 's' : ''} in the yard${rep.bigEggs ? ` (${rep.bigEggs} big!)` : ''}.`]);
  const ready = Object.values(S.crops).filter(c => c.ready).length;
  if (ready) lines.push(['star', `${ready} crop${ready > 1 ? 's are' : ' is'} ready to harvest.`]);
  if (rep.animalGoods) lines.push(['milk', `Your animals have ${rep.animalGoods} things ready to collect in the pasture.`]);
  if (rep.fruit) lines.push(['apple', `${rep.fruit} new fruit grew in the orchard.`]);
  if (rep.wages) lines.push(['hire', `You paid your managers ${fmtGold(rep.wages)} in wages.`]);
  if (rep.unpaid.length) lines.push(['grumpy', `${rep.unpaid.join(' and ')} stayed home: you couldn't pay their wages.`]);
  const start = () => { UI.closeAll(); $('fade').classList.remove('on'); morningSpray(); updateHud(); };
  UI.open(ListScreen({
    cls: 'summary', rootCls: 'clear',
    header: summaryCard(`Good morning! Day ${rep.day}`, rep.weather === 'rain' ? 'rain' : 'sun', lines),
    items: [{ label: 'Start the day', icon: 'play', ok: start }],
    footer: keyHint('OK', 'Continue'),
    onBack: start,
  }));
}

function showWelcome() {
  UI.open(ListScreen({
    cls: 'summary',
    header: summaryCard('Welcome home, Bambi!', 'golu', [
      ['sun', "Navdeep's Farm has grown wild, but a little work will bring it back to life."],
      ['play', touchMode ? 'Walk with the arrow pad. Tap A to use whatever is in front of you.' : 'Walk with the arrow buttons. Press OK to use whatever is in front of you.'],
      ['seed:radish', 'Plant your radish seeds in the tilled patch south of the lane, then water them.'],
      ['seed:strawberry', 'Strawberries are growing on Guri Farm and corn on Kiran Farm. Keep them watered!'],
      ['happy', 'Gurinder may "just happen" to drop by around lunchtime...'],
      ['stand', 'Stock the veggie stand for customers, and hire managers at the HIRING board.'],
    ]),
    items: [{ label: "Let's farm!", icon: 'play', ok: () => UI.close() }],
    footer: keyHint('OK', 'Start'),
  }));
}

/* ---------- managers, the veggie stand and reviews ---------- */
const roleName = m => ROLE_NAMES[m.role];
const roleIcon = m => ROLE_ICONS[m.role];
const workPlace = (m, h) => (AREA_ROLES.includes(m.role) ? AREAS[h.area].name : { fruit: 'the orchard', animals: 'the pasture and coop', sell: 'the veggie stand' }[m.role]);

function openKitchen() {
  Sound.play('select');
  UI.open(ListScreen({
    title: "Bambi's Kitchen", icon: 'curry', cls: 'wide',
    sub: 'Cook dishes from your harvest. Dishes sell for much more, or eat them for lots of energy.',
    items: () => RECIPES.map(r => ({
      label: r.name, icon: r.id, value: invCount(r.id) ? `have ${invCount(r.id)}` : `${r.sell}g`, disabled: !canCook(r),
      desc: Object.entries(r.needs).map(([id, n]) => `${n} ${itemName(id)} (${invCount(id)})`).join(' + ') + ` · +${r.energy} energy`,
      ok: () => cook(r),
    })),
    footer: keyHint('▲▼', 'Choose') + keyHint('OK', 'Cook') + keyHint('BACK', 'Close'),
  }));
}

function openManagers() {
  Sound.play('select');
  UI.open(ListScreen({
    title: 'Farm Managers', icon: 'hire', cls: 'wide',
    sub: () => `They work from 7 AM to 7 PM and are paid every morning. You have <b>${fmtGold(S.gold)}</b>`,
    items: () => MANAGERS.map(m => {
      const h = S.managers[m.id];
      if (!h) {
        return { label: `${mgrName(m)} · ${roleName(m)}`, icon: roleIcon(m), desc: `${ROLE_TEXT[m.role]} · ${m.wage}g a day`, value: `Hire ${fmtGold(m.fee)}`, ok: () => hireManager(m) };
      }
      const what = m.role === 'crop' ? ` · plants ${CROPS[h.seed].name.toLowerCase()}` : '';
      return {
        label: `${mgrName(m)} · ${roleName(m)}`, icon: 'check', value: 'Manage',
        desc: `Works on ${workPlace(m, h)}${what}` + (h.paid === false ? " · stayed home (couldn't be paid)" : ''),
        ok: () => openManagerDetail(m),
      };
    }),
    footer: keyHint('▲▼', 'Choose') + keyHint('OK', 'Hire / Manage') + keyHint('BACK', 'Close'),
  }));
}

function openManagerDetail(m) {
  const h = S.managers[m.id];
  const cycle = (list, cur, d) => list[(list.indexOf(cur) + d + list.length) % list.length];
  const setArea = d => { h.area = cycle(AREA_IDS, h.area, d); Sound.play('move'); };
  const setSeed = d => { h.seed = cycle(CROP_IDS, h.seed, d); Sound.play('move'); };
  UI.open(ListScreen({
    title: `${mgrName(m)}, ${roleName(m).toLowerCase()}`, icon: roleIcon(m), sub: ROLE_TEXT[m.role] + '.',
    items: () => [
      AREA_ROLES.includes(m.role)
        ? { label: 'Works on', value: AREAS[h.area].name, desc: '◀ ▶ or OK to change', adjust: setArea, ok: () => setArea(1) }
        : { label: 'Works on', value: workPlace(m, h), desc: 'Their job covers the whole farm', ok: () => {} },
      m.role === 'crop' && { label: 'Plants', value: CROPS[h.seed].name, icon: 'seed:' + h.seed, desc: `◀ ▶ or OK to change · ${CROPS[h.seed].seed}g a packet`, adjust: setSeed, ok: () => setSeed(1) },
      { label: `Let ${mgrName(m)} go`, icon: 'door', desc: 'You can hire them again later (the hiring fee is not refunded).', ok: () => confirmBox(`Let ${mgrName(m)} go?`, '', 'Yes', () => { fireManager(m); UI.close(); }, 'No') },
    ].filter(Boolean),
  }));
}

function openStand() {
  Sound.play('select');
  UI.open(ListScreen({
    title: "Navdeep's Veggie Stand", icon: 'stand', cls: 'wide',
    sub: () => {
      const n = Object.values(S.stand).reduce((a, b) => a + b, 0);
      return `Customers pay 1.5 times the crate price, then tell everyone what they think of Bambi. <b>${n}</b> for sale.`;
    },
    items: () => {
      const list = [];
      const bag = sellables();
      if (bag.length) {
        const total = bag.reduce((a, [, n]) => a + n, 0);
        list.push({ label: 'Put everything from your bag on the stand', icon: 'bag', value: `${total} items`, ok: () => { for (const [id, n] of bag) moveToStand(id, n); } });
      }
      for (const [id, n] of bag) list.push({ label: `Add ${itemName(id)}`, icon: id, value: `× ${n}`, desc: `Customers pay ${standPrice(id)}g each`, ok: () => moveToStand(id, n) });
      for (const id of Object.keys(S.stand)) list.push({ label: `On the stand: ${itemName(id)}`, icon: id, value: `× ${S.stand[id]}`, desc: 'OK: take back into your bag', ok: () => takeFromStand(id) });
      if (!list.length) list.push({ label: 'Harvest some crops first, then put them out here', disabled: true });
      return list;
    },
  }));
}

function openReviews() {
  Sound.play('select');
  const stars = Math.round(S.rep / 20);
  UI.open(ListScreen({
    title: 'Customer Reviews', icon: 'happy', cls: 'wide',
    sub: () => `Reputation <b>${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</b> · ${S.stats.happy} happy customers. A good reputation brings more customers.`,
    items: () => (S.reviews.length
      ? S.reviews.map(r => ({ label: `"${r.text}"`, icon: r.good ? 'happy' : 'grumpy', desc: `${r.name}, day ${r.day}`, ok: () => {} }))
      : [{ label: 'No reviews yet. Stock the veggie stand by the lane!', disabled: true }]),
  }));
}
