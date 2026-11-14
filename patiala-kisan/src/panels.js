// Menus for the decoration shop, a placed item, the Mali's stall, the police desk and the
// weather forecast. Plain functions that take the UI; ui.js calls them from render() and handle().
import { PETS, PADDOCK, MELA, VEHICLES, PLANE, PLANE_ENGINES, DECOR, DECOR_CATS, DECOR_MAX, DECOR_REFUND, THEMES, BEAUTY_TIERS, beautyTier, beautyOf, GARDEN, POLICE, ITEMS, SKINS, RARITY, HAIRSTYLES } from './config.js';
import { fmt } from './pads.js';
import { activeCase, caseValue, caseCount } from './crime.js';
import { rainLabel } from './weather.js';
import { BENCHES } from './baradari.js';

const money = (n) => `₹${fmt(n)}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const itemList = (items) => Object.entries(items).map(([k, q]) => `<li>${ITEMS[k].icon} <b>${q}</b> × ${ITEMS[k].name} <small>(₹${fmt(ITEMS[k].price * q)})</small></li>`).join('');
const mins = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// ---------------------------------------------------------------- the decoration shop (Shop → 🌳 Garden)
export function decorShopHTML(ui) {
  const g = ui.game, st = g.state, dec = g.decor;
  const cats = [...DECOR_CATS.filter(([c]) => c !== 'royal'), ['stored', `📦 Stored (${dec.storedCount()})`]];
  const cat = ui.decorCat && ui.decorCat !== 'royal' ? ui.decorCat : 'tree', theme = ui.decorTheme || '';
  const b = dec.beauty || 0, ti = beautyTier(b), next = BEAUTY_TIERS[ti + 1];
  let h = `<div class="card2 gold"><b class="big">🌸 Beauty ${b}</b><small>${BEAUTY_TIERS[ti].name} farm${next ? ` · ${next.at - b} more for ${next.name} (+${money(next.money)})` : ' · the most beautiful farm in Punjab!'}</small></div>`;
  h += `<p class="hint">Tap <b>Preview &amp; place</b>, walk to a spot (green fits) and press Place. ▦ Grid snaps things into neat rows; ✥ Free lets you put them anywhere. Tap a placed item to turn, move, store or sell it. Placed <b>${dec.list.length}/${DECOR_MAX}</b>. Varied gardens score the most beauty.</p>`;
  h += `<div class="chips">${cats.map(([c, n]) => `<button class="chip ${c === cat ? 'on' : ''}" data-act="decorCat" data-c="${c}">${n}</button>`).join('')}</div>`;
  if (cat === 'stored') {
    const inv = Object.entries(st.deco.inv).filter(([k]) => DECOR[k]);
    if (!inv.length) return h + '<p class="empty">Your store is empty. Tap a placed decoration and choose 📦 Put in store to keep it here.</p>';
    for (const [k, n] of inv) { const d = DECOR[k]; h += ui.row(d.icon, `${d.name} <span class="tag">×${n}</span>`, d.desc, ui.btn('📍 Place (free)', 'decorPlaceStored', { k }, dec.list.length >= DECOR_MAX)); }
    return h;
  }
  h += `<div class="chips"><button class="chip ${theme ? '' : 'on'}" data-act="decorTheme" data-t="">All styles</button>${Object.entries(THEMES).map(([t, T]) => `<button class="chip ${t === theme ? 'on' : ''}" data-act="decorTheme" data-t="${t}">${T.icon} ${T.name}</button>`).join('')}</div>`;
  let shown = 0;
  for (const [k, d] of Object.entries(DECOR)) {
    if (d.cat === 'royal' || (theme ? !d.th?.includes(theme) : d.cat !== cat)) continue;
    shown++;
    const locked = st.level < d.level, need = d.bty && Math.max(b, st.stats.beauty || 0) < d.bty, n = dec.count(k);
    const extra = d.fruit ? ` · ${ITEMS[d.fruit.item].icon} ${d.fruit.n} ${ITEMS[d.fruit.item].name} every ${Math.round(d.fruit.every / 60)} min` : d.glow ? ' · glows at dusk' : d.spray ? ' · sprays water' : '';
    const tags = (d.th || []).map((t) => THEMES[t].icon).join('');
    const btn = locked ? `<span class="tag">🔒 L${d.level}</span>` : need ? `<span class="tag">🌸 Beauty ${d.bty}</span>` : ui.btn(`👁️ Preview &amp; place · ${money(d.cost)}`, 'decorBuy', { k }, dec.list.length >= DECOR_MAX);
    h += ui.row(d.icon, `${d.name}${n ? ` <span class="tag">${n}</span>` : ''}${dec.stored(k) ? ` <span class="tag">📦${dec.stored(k)}</span>` : ''}`, `${d.desc}${extra} · +${beautyOf(k)} beauty ${tags}`, btn, locked || need ? 'locked' : '');
  }
  if (!shown) h += '<p class="empty">Nothing in this style here yet.</p>';
  return h;
}

// ---------------------------------------------------------------- one placed item
export function decorItemHTML(ui) {
  const g = ui.game, d = ui.decorItem;
  if (!d || !g.decor.list.includes(d)) return '<p class="empty">That item is gone.</p>';
  const D = DECOR[d.k], back = Math.floor((D.tokens || D.cost) * DECOR_REFUND);
  let h = `<div class="card2"><div class="ct"><b>${D.icon} ${D.name}</b></div><small>${D.desc}</small>`;
  if (D.fruit) {
    const ripe = g.decor.ripeNow(d);
    h += `<small>${ripe ? `🟢 Ripe! Walk up to it and press Pick to get ${D.fruit.n} ${ITEMS[D.fruit.item].name}.` : `⏳ Ripe in ${mins(g.decor.untilRipe(d) * 1000)}`}</small>`;
  }
  h += '</div>';
  h += `<div class="row2"><button class="btn ghost" data-act="decorTurn">⟳ Turn</button><button class="btn ghost" data-act="decorMove">↔️ Move</button></div>`;
  h += `<div class="row2"><button class="btn ghost" data-act="decorStore">📦 Put in store</button></div>`;
  h += `<div class="row2"><button class="btn ghost danger" data-act="decorRemove">🗑️ Take down · +${D.tokens ? `${back} 🌹` : money(back)}</button></div>`;
  h += `<p class="hint small">The store keeps it to place again for free. Taking it down sells it back for ${Math.round(DECOR_REFUND * 100)}% of what it cost.</p>`;
  return h;
}

// ---------------------------------------------------------------- the hangar (airplane: fuel, engines, sky games)
export function hangarHTML(ui) {
  const g = ui.game, st = g.state, V = VEHICLES.plane, pd = st.vehicles.plane, A = g.airfield;
  if (!pd.owned) return `<div class="card2"><b>✈️ ${V.name}</b><small>${V.desc}</small></div><p class="hint">Buy the airplane in Shop → Vehicles (level ${V.level}, ${money(V.cost)}). It waits here, by the runway.</p>`;
  const E = PLANE_ENGINES[pd.hp] || PLANE_ENGINES[0], next = PLANE_ENGINES[pd.hp + 1], fuel = Math.round(pd.fuel ?? E.fuel), need = Math.max(0, E.fuel - fuel), flying = !!A.plane()?.flying;
  let h = `<div class="card2 gold"><b class="big">⛽ ${fuel}/${E.fuel}</b><small>${E.name} · top ${Math.round(E.top * 3.6)} km/h · climbs ${E.climb} m/s</small></div>`;
  h += ui.row('⛽', 'Fill the tank', need ? `${need} units · ${money(need * PLANE.fuelPrice)}` : 'Full', need ? ui.btn(`Fill · ${money(need * PLANE.fuelPrice)}`, 'planeFuel', {}, st.money < need * PLANE.fuelPrice) : '<span class="tag ok">Full</span>');
  if (next) h += ui.row('🔧', `Engine: ${next.name}`, `Top ${Math.round(next.top * 3.6)} km/h, climbs ${next.climb} m/s, ${next.fuel} fuel`, st.level < next.level ? `<span class="tag">🔒 L${next.level}</span>` : ui.btn(`Fit · ${money(next.cost)}`, 'planeEngine', {}, st.money < next.cost));
  h += `<p class="hint">How to fly: get in the plane by the runway, push the stick to taxi and speed up, then hold <b>⬆️</b> (R on a keyboard) to take off. Steer with the stick, <b>⬇️</b> (F) to come down. Fly low over your fields to water them from the sky.</p>`;
  h += '<h3>🎯 Sky games</h3>';
  h += ui.row('🎯', 'Sky tour', `Fly through ${PLANE.rings.length} golden rings in ${PLANE.ringTime} s · +${money(PLANE.ringPay)}${st.sky.best ? ` · best ${st.sky.best} s` : ''}`, ui.btn(flying ? 'Start' : 'Take off first', 'skyTour', {}, !flying));
  h += ui.row('🪁', 'Kites', `${st.sky.kites.length}/${PLANE.kites} caught today · ${money(PLANE.kitePay)} each · fly into them`, '');
  PLANE.cargo.forEach((c, i) => { h += ui.row('📦', c.name, `Fly through the green beam low within ${PLANE.cargoTime} s · +${money(c.pay)}`, ui.btn(flying ? 'Go' : 'Take off first', 'cargoRun', { i }, !flying)); });
  return h;
}

// ---------------------------------------------------------------- the mela and pets
export function melaHTML(ui) {
  const g = ui.game, st = g.state, M = g.extras.mela, ms = st.mela, v = g.player.vehicle;
  let h = '<p class="hint">Games at the village mela. Prizes are paid in rupees and XP.</p>';
  if (M.status()) h += `<div class="card2 gold"><b>${M.status()}</b></div>`;
  h += ui.row('🏁', 'Navi Zameen race', `Drive any vehicle through ${MELA.race.length} red flags in order within ${MELA.raceTime} s · +${money(MELA.racePay + st.level * 40)}${ms.best ? ` · record ${ms.best} s` : ''}`, ui.btn(v && v.kind !== 'plane' ? 'Start' : 'Get on a vehicle', 'melaRace', {}, !v || v.kind === 'plane'));
  h += ui.row('🌾', 'Harvest challenge', `Harvest as many ripe crops as you can in ${MELA.harvestTime} s · ${money(MELA.harvestPay)} a crop${ms.hBest ? ` · record ${ms.hBest}` : ''}`, ui.btn('Start', 'melaHarvest'));
  h += ui.row('🏺', 'Hidden golden matkas', `${ms.found.length}/${MELA.matkas} found today · ${money(MELA.matkaPay)} each, ${money(MELA.matkaBonus)} for all · they hide near trees around the farm and in Navi Zameen`, '');
  h += ui.row('📸', 'Visitors', `When your farm's beauty reaches ${MELA.visitorBeauty}, visitors come to admire it and tip you · ${st.stats.visitors || 0} so far`, '');
  return h;
}
export function petsHTML(ui) {
  const g = ui.game, st = g.state, P = st.pets;
  let h = '<h3>🐾 Pets and paddock</h3>';
  for (const [k, d] of Object.entries(PETS)) {
    if (!d.name) continue;
    const own = P.owned[k], b = own ? ui.btn(P.active === k ? '🏠 Leave at home' : '🐾 Take along', 'pet', { k }) : st.level < d.level ? `<span class="tag">🔒 L${d.level}</span>` : ui.btn(`Adopt · ${money(d.cost)}`, 'pet', { k }, st.money < d.cost);
    h += ui.row(d.icon, `${d.name}${own ? ' <span class="tag ok">Yours</span>' : ''}`, `${d.desc}. Walk up and pat for XP.`, b);
  }
  h += ui.row('🐴', 'Ghoda Tabela (paddock)', 'Horses and a duck pond in Navi Zameen · feed the horses daily for XP and soul · stand on its pad to buy', st.paddock.owned ? '<span class="tag ok">Owned</span>' : st.level < PADDOCK.level ? `<span class="tag">🔒 L${PADDOCK.level}</span>` : ui.btn('📍', 'guide', { t: 'paddock' }));
  return h;
}

// ---------------------------------------------------------------- the Mali's stall
export function maliHTML(ui) {
  const g = ui.game, st = g.state, gd = st.garden, B = g.baradari;
  let h = `<div class="card2 gold"><b class="big">🌹 ${gd.tokens}</b><small>Baradari roses · ${gd.total} found in all</small></div>`;
  h += `<p class="hint">Find roses in Baradari Gardens: eight hide among the beds every day, the fountain gives some when you make a wish, and calm days on the benches earn one. Spend them here on specials for your farm.</p>`;
  const relaxed = BENCHES.filter((_, i) => gd.sat[i] === B.today).length;
  h += ui.row('🌹', 'Hidden roses today', `${GARDEN.roses - B.roseLeft()} of ${GARDEN.roses} found${gd.bonus ? ' · daily bonus paid ✔' : ` · finish all for +${GARDEN.rosesBonus.tokens} roses`}`, '');
  h += ui.row('⛲', 'Fountain wish', gd.wished === B.today ? 'Made today ✔' : `Not yet today · ₹${GARDEN.wishCost}`, '');
  h += ui.row('🪑', 'Relaxing on benches', `${relaxed} of ${BENCHES.length} today · three give a rose`, '');
  h += '<h3>👑 Baradari specials</h3>';
  for (const [k, d] of Object.entries(DECOR)) {
    if (d.cat !== 'royal') continue;
    const b = st.level < d.level ? `<span class="tag">🔒 L${d.level}</span>` : ui.btn(`${d.tokens} 🌹 · Preview &amp; place`, 'maliBuy', { k }, gd.tokens < d.tokens || g.decor.list.length >= DECOR_MAX);
    h += ui.row(d.icon, d.name, d.desc, b);
  }
  return h;
}

// ---------------------------------------------------------------- the police desk
const SAY = {
  none: 'Sat Sri Akal ji! All quiet at the thana. Kiddan aaye? Koi shikayat?',
  open: 'Oye hoye, a theft! Sit down, ji. Tell me, file the report and we will chase him.',
  reported: 'Your case is with my best men. Be patient, ji, chor kithe jaayega.',
  caught: 'Good news, ji: we have the chor in the lock-up! Now the decision is yours.',
};
export function policeHTML(ui) {
  const g = ui.game, st = g.state, c = activeCase(st), step = ui.pStep || 'greet';
  const officer = (t) => `<div class="card2 officer"><div class="of">👮</div><div><b>Inspector Sandhu</b><small>${t}</small></div></div>`;
  let h = '';
  if (step === 'greet') {
    h += officer(SAY[c ? c.status : 'none']);
    h += ui.row('📝', 'Report a theft', c?.status === 'open' ? `${caseCount(c)} items were stolen from your godown` : c ? 'Nothing new to report' : 'No theft to report', c?.status === 'open' ? ui.btn('Report', 'pDetails') : '<span class="tag">—</span>');
    h += ui.row('🔎', 'Case status', c ? (c.status === 'reported' ? `Investigating · about ${mins(c.due - Date.now())} left` : c.status === 'caught' ? 'Thief caught!' : 'Not reported yet') : 'No open case', ui.btn('Ask', 'pStatus'));
    if (c?.status === 'caught') h += ui.row('🥷', `${esc(c.thief.name)} is in custody`, 'Decide what happens to him', ui.btn('Decide', 'pCaught', {}, false, 'go'));
    h += `<p class="hint small">Police trust: ${'★'.repeat(st.police.trust)}${'☆'.repeat(POLICE.trustMax - st.police.trust)} · higher trust means faster investigations. ${st.police.stats.thefts} thefts so far, ${st.police.stats.caught} settled.</p>`;
  } else if (step === 'details') {
    if (!c || c.status !== 'open') { ui.pStep = 'greet'; return policeHTML(ui); }
    h += officer('Let me note it down. This is what was taken from your godown:');
    h += `<ul class="unl">${itemList(c.items)}</ul><p class="gain">${caseCount(c)} items · about ${money(caseValue(c))}</p><p class="hint small">The thief is unknown. The goods are kept safe in your case file and come back to you when he is caught.</p>`;
    h += `<div class="row2"><button class="btn ghost" data-act="pBack">⬅ Back</button><button class="btn" data-act="pSubmit">✅ Submit the report</button></div>`;
  } else if (step === 'filed') {
    h += officer(`FIR number PS-${String(c?.no || 0).padStart(4, '0')} registered. The investigation has started, ji. We will let you know when he is caught.`);
    h += `<div class="card2 gold"><b>🔎 Investigation started</b><small>Expect news in about ${c ? mins(c.due - Date.now()) : '–'} (it also runs while the game is closed)</small></div><button class="btn wide" data-act="pDone">Dhanwaad, Inspector ji</button>`;
  } else if (step === 'status') {
    h += officer('Here is where your cases stand:');
    const list = [...st.police.cases].reverse();
    if (!list.length) h += '<p class="empty">No cases yet. Keep your godown safe!</p>';
    for (const k of list) {
      const t = { open: '🚨 Not reported yet', reported: `🔎 Investigating · ${mins(k.due - Date.now())}`, caught: '👮 Thief caught', closed: `✅ Closed · ${{ confront: 'you confronted him', forgive: 'you forgave him', police: 'police handled it' }[k.outcome] || ''}` }[k.status];
      h += ui.row('📁', `PS-${String(k.no).padStart(4, '0')} · ${caseCount(k)} items`, t, '');
    }
    h += `<button class="btn wide ghost" data-act="pBack">⬅ Back</button>`;
  } else if (step === 'caught') {
    if (!c || c.status !== 'caught') { ui.pStep = 'greet'; return policeHTML(ui); }
    const v = caseValue(c), R = POLICE.rewards;
    h += officer(`${esc(c.thief.name)}, known as "${esc(c.thief.tag)}", is in the lock-up. Your goods are ready to go back to you. What do you want to do with him?`);
    h += `<ul class="unl">${itemList(c.items)}</ul>`;
    h += `<div class="card2"><b>👊 A: Confront him</b><small>A short scuffle: hit him three times when the needle is in the green. Goods back, +${R.confront.xp * st.level} XP. The police frown on fighting (trust −1). If you miss too often, the police step in.</small><button class="btn wide" data-act="pFight">👊 Confront ${esc(c.thief.name)}</button></div>`;
    h += `<div class="card2"><b>🙏 B: Forgive him</b><small>Goods back, +${R.forgive.soul} soul points, and he repays you ${money(Math.round(v * R.forgive.thanks))} out of gratitude.</small><button class="btn wide" data-act="pForgive">🙏 Forgive him</button></div>`;
    h += `<div class="card2"><b>👮 C: Let the police handle it</b><small>Goods back, a ${money(Math.round(v * R.police.reward))} police reward, and trust in the thana grows (+1: faster investigations).</small><button class="btn wide" data-act="pPolice">👮 Leave it to the police</button></div>`;
    h += `<button class="btn wide ghost" data-act="pBack">⬅ Not now</button>`;
  } else if (step === 'result') {
    const r = ui.pResult || {};
    const talk = r.timeout ? '"He wriggled out of your grip, so we stepped in, ji. Do not worry: the goods are back with you."' : { confront: '"Hai, maaf karo ji! I will never touch your godown again!" the thief cries, rubbing his arm. Inspector Sandhu nods: "Taught him well."', forgive: '"Tusi rabb ho ji…" the thief folds his hands, eyes wet. "I will work an honest day from tomorrow." The Inspector smiles.', police: '"We will see to it that he learns," says the Inspector, locking the register. "Case closed."' }[r.option];
    h += officer(talk || 'Case closed.');
    h += `<div class="card2 gold"><b>✅ Goods returned to your godown</b><ul class="unl">${itemList(r.items || {})}</ul>`;
    const bits = [r.money ? `+${money(r.money)}` : '', r.soul ? `+${r.soul} 🙏 soul points` : '', r.xp ? `+${r.xp} XP` : ''].filter(Boolean);
    if (bits.length) h += `<p class="gain">${bits.join(' · ')}</p>`;
    h += '</div><button class="btn wide" data-act="pDone">Shabaash!</button>';
  }
  return h;
}

// ---------------------------------------------------------------- the weather forecast
export function weatherModal(ui) {
  const g = ui.game, W = g.weather, f = W.forecast(), N = { sunny: '☀️ Sunny', cloudy: '⛅ Cloudy', rain: '🌧️ Rain', storm: '⛈️ Thunderstorm' };
  const tips = [];
  if (f.today === 'storm' || f.tomorrow === 'storm') tips.push('Harvest what is ripe and finish outdoor jobs before the storm', 'The storm waters every crop for free: save your watering can', 'Crows stay away in the rain, and lightning is only for show: nobody gets hurt', 'Roads get slippery: the Bullet grips less while it rains');
  else if (f.today === 'rain' || f.tomorrow === 'rain') tips.push('Rain waters your crops: no need to water today', 'Roads are a little slippery for the Bullet');
  else tips.push('Fair weather: a good day for the tractor and the ring road');
  ui.modal(`<div class="big">${W.stormy ? '⛈️' : N[f.today].slice(0, 2)}</div><h2>Weather</h2>
    <p><b>Now:</b> ${esc(W.statusText())}${f.today === 'rain' ? ` (${rainLabel(f.rainI)} today)` : ''}</p>
    <p><b>Today:</b> ${N[f.today]}<br><b>Tomorrow:</b> ${N[f.tomorrow] || '–'}</p>
    <ul class="unl">${tips.map((t) => `<li>${t}</li>`).join('')}</ul>`, 'OK');
}

// ---------------------------------------------------------------- the wardrobe (Shop → 👕 Wardrobe)
export function wardrobeHTML(ui) {
  const g = ui.game, st = g.state, W = g.wardrobe, w = st.wardrobe;
  const sel = ui.wardSel && SKINS[ui.wardSel] ? ui.wardSel : W.current(), S = SKINS[sel], R = RARITY[S.rarity];
  const owned = !!w.owned[sel], wearing = W.current() === sel && w.gender === S.gender, err = W.buyError(sel);
  const btn = wearing ? '<span class="tag ok">✔ Wearing</span>' : owned ? `<button class="btn" data-act="wardWear" data-id="${sel}">👕 Wear</button>`
    : `<button class="btn" data-act="wardBuy" data-id="${sel}" ${err ? 'disabled' : ''}>Buy · ${money(S.price)}</button>${err ? `<small class="warn">${esc(err)}</small>` : ''}`;
  let h = `<div class="wardtop"><canvas id="wardCanvas" width="300" height="380"></canvas>
    <div class="wardinfo"><span class="rar" style="--c:${R.color}">${R.name}</span><b>${esc(S.name)}</b><small>${esc(S.desc)}</small>
      <small>${owned ? '🟢 Yours' : `🔒 Level ${S.level} · ${money(S.price)}`}</small>${btn}<small class="hint">Drag the model to turn it round</small></div></div>`;
  h += `<div class="seg wardg"><button data-act="wardGender" data-g="m" class="${w.gender === 'm' ? 'on' : ''}">👳 Sardar ji</button><button data-act="wardGender" data-g="f" class="${w.gender === 'f' ? 'on' : ''}">👩 Sardarni ji</button></div>`;
  if (w.gender === 'f' && SKINS[W.current()]?.look.female) h += `<div class="chips">${HAIRSTYLES.map(([k, n]) => `<button class="chip ${w.hair === k ? 'on' : ''}" data-act="wardHair" data-h="${k}">💇 ${n}</button>`).join('')}</div>`;
  h += '<div class="wardgrid">';
  for (const [id, s] of Object.entries(SKINS)) {
    if (s.gender !== w.gender) continue;
    const r = RARITY[s.rarity], mine = !!w.owned[id], on = W.current() === id;
    const sw = '#' + (s.look.shirt ?? 0xf7f3e8).toString(16).padStart(6, '0'), sw2 = '#' + (s.look.pants ?? s.look.shirt ?? 0xf2eee2).toString(16).padStart(6, '0');
    h += `<button class="wtile ${id === sel ? 'sel' : ''} ${mine ? 'own' : ''}" data-act="wardPick" data-id="${id}" style="--r:${r.color}">
      <i style="background:linear-gradient(135deg, ${sw} 0 55%, ${sw2} 55%)"></i><b>${esc(s.name)}</b><small>${on ? '✔ Wearing' : mine ? 'Yours' : st.level < s.level ? `🔒 L${s.level}` : money(s.price)}</small><em>${r.name}</em></button>`;
  }
  h += '</div><p class="hint small">Outfits are for looks only: they never change prices, speed or harvests. Bought once, yours for good.</p>';
  return h;
}

// ---------------------------------------------------------------- buttons
// returns 'done' (handled, nothing to redraw), 'render' (handled, redraw the menu) or null (not mine)
export async function handlePanels(ui, act, d) {
  const g = ui.game;
  const fail = (m) => { ui.toast(m); g.audio.play('error'); return 'done'; };
  switch (act) {
    case 'wardPick': ui.wardSel = d.id; g.wardrobe.show(d.id); g.audio.play('click'); return 'render';
    case 'wardGender': g.wardrobe.setGender(d.g); ui.wardSel = g.wardrobe.current(); return 'render';
    case 'wardHair': g.wardrobe.setHair(d.h); return 'render';
    case 'wardWear': { const e = g.wardrobe.wear(d.id); if (e) return fail(e); ui.toast(`👕 Now wearing ${SKINS[d.id].name}`); g.audio.play('yay'); return 'render'; }
    case 'wardBuy': {
      const S = SKINS[d.id], e = g.wardrobe.buyError(d.id);
      if (e) return fail(e);
      if (!await ui.confirm(`<div class="big">👕</div><h2>Buy ${esc(S.name)}?</h2><p>${money(S.price)} · ${RARITY[S.rarity].name}. It's yours for good and only changes how you look.</p>`, `Buy ${money(S.price)}`)) return 'done';
      const err = g.wardrobe.buy(d.id); if (err) return fail(err);
      g.wardrobe.wear(d.id); g.audio.play('buy'); ui.toast(`🎉 ${S.name} is yours and you are wearing it!`, 3); return 'render';
    }
    case 'decorCat': ui.decorCat = d.c; ui.decorTheme = ''; return 'render';
    case 'planeFuel': {
      const pd = g.state.vehicles.plane, E = PLANE_ENGINES[pd.hp] || PLANE_ENGINES[0], need = Math.max(0, Math.ceil(E.fuel - (pd.fuel ?? E.fuel))), cost = need * PLANE.fuelPrice;
      if (!need) return 'render';
      if (g.state.money < cost) return fail('Not enough money');
      g.state.money -= cost; pd.fuel = E.fuel; ui.money(); g.audio.play('buy'); ui.toast(`⛽ Tank full · ${money(cost)}`); g.save(true); return 'render';
    }
    case 'planeEngine': {
      const pd = g.state.vehicles.plane, next = PLANE_ENGINES[pd.hp + 1];
      if (!next) return 'render';
      if (g.state.level < next.level) return fail(`Unlocks at level ${next.level}`);
      if (g.state.money < next.cost) return fail('Not enough money');
      g.state.money -= next.cost; pd.hp++; pd.fuel = next.fuel; ui.money(); g.audio.play('yay'); ui.toast(`🔧 ${next.name} fitted, tank filled`); g.save(true); return 'render';
    }
    case 'digKhaal': { const e = g.tubewells.digKhaal(); if (e) return fail(e); ui.toast('💧 The khaal is dug! Start the tube well motor to water your fields'); return 'render'; }
    case 'melaRace': { const e = g.extras.mela.startRace(); if (e) return fail(e); ui.close(); return 'done'; }
    case 'melaHarvest': { const e = g.extras.mela.startHarvest(); if (e) return fail(e); ui.close(); return 'done'; }
    case 'pet': { const had = g.state.pets.owned[d.k], e = g.extras.buyPet(d.k); if (e) return fail(e); if (!had) ui.toast(`${PETS[d.k].icon} ${PETS[d.k].name} is part of the family!`, 3); return 'render'; }
    case 'skyTour': { const e = g.airfield.startTour(); if (e) return fail(e); ui.close(); return 'done'; }
    case 'cargoRun': { const e = g.airfield.startCargo(+d.i); if (e) return fail(e); ui.close(); return 'done'; }
    case 'decorTheme': ui.decorTheme = d.t || ''; return 'render';
    case 'decorPlaceStored': { const err = g.decor.start(d.k, null, true); if (err) return fail(err); return 'done'; }
    case 'decorStore': { const D = DECOR[ui.decorItem.k]; g.decor.store(ui.decorItem); ui.toast(`📦 ${D.name} put in your store`); g.audio.play('click'); ui.close(); return 'done'; }
    case 'decorBuy': case 'maliBuy': { const err = g.decor.start(d.k); if (err) return fail(err); return 'done'; }
    case 'decorTurn': g.decor.turn(ui.decorItem); g.audio.play('click'); return 'done';
    case 'decorMove': { const err = g.decor.start(ui.decorItem.k, ui.decorItem); if (err) return fail(err); return 'done'; }
    case 'decorRemove': {
      const D = DECOR[ui.decorItem.k];
      if (!await ui.confirm(`<div class="big">${D.icon}</div><h2>Take down the ${esc(D.name)}?</h2><p>You get ${Math.round(DECOR_REFUND * 100)}% of its price back.</p>`, 'Take down')) return 'done';
      const back = g.decor.remove(ui.decorItem);
      ui.toast(`${D.icon} Taken down · +${D.tokens ? `${back} 🌹` : money(back)}`);
      ui.close();
      return 'done';
    }
    case 'pDetails': ui.pStep = 'details'; return 'render';
    case 'pStatus': ui.pStep = 'status'; return 'render';
    case 'pBack': ui.pStep = 'greet'; return 'render';
    case 'pCaught': ui.pStep = 'caught'; return 'render';
    case 'pDone': ui.close(); return 'done';
    case 'pSubmit': {
      const c = activeCase(g.state);
      if (!c || !g.police.report(c.id)) return fail('That case cannot be reported');
      ui.pStep = 'filed'; return 'render';
    }
    case 'pFight': { const c = activeCase(g.state); if (!c) return 'done'; g.police.startFight(c.id); return 'done'; }
    case 'pForgive': case 'pPolice': {
      const c = activeCase(g.state), option = act === 'pForgive' ? 'forgive' : 'police';
      if (!c) return 'done';
      const res = g.police.settle(c.id, option);
      if (!res.ok) return fail('That case is already settled');
      ui.pResult = { ...res, option }; ui.pStep = 'result'; return 'render';
    }
  }
  return null;
}
