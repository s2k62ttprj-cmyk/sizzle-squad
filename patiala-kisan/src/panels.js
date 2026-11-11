// Menus for the decoration shop, a placed item, the Mali's stall, the police desk and the
// weather forecast. Plain functions that take the UI; ui.js calls them from render() and handle().
import { DECOR, DECOR_CATS, DECOR_MAX, DECOR_REFUND, GARDEN, POLICE, ITEMS } from './config.js';
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
  const g = ui.game, st = g.state;
  const cats = DECOR_CATS.filter(([c]) => c !== 'royal');
  const cat = ui.decorCat && ui.decorCat !== 'royal' ? ui.decorCat : 'tree';
  let h = `<p class="hint">Decorate your farm: tap <b>Preview &amp; place</b>, walk to a spot (green means it fits) and press Place. You can turn, move or take down anything afterwards. Placed: <b>${g.decor.list.length}/${DECOR_MAX}</b>. 👑 Baradari specials are bought with roses at the Mali's stall.</p>`;
  h += `<div class="chips">${cats.map(([c, n]) => `<button class="chip ${c === cat ? 'on' : ''}" data-act="decorCat" data-c="${c}">${n}</button>`).join('')}</div>`;
  for (const [k, d] of Object.entries(DECOR)) {
    if (d.cat !== cat) continue;
    const locked = st.level < d.level, n = g.decor.count(k);
    const extra = d.fruit ? ` · ${ITEMS[d.fruit.item].icon} ${d.fruit.n} ${ITEMS[d.fruit.item].name} every ${Math.round(d.fruit.every / 60)} min` : d.glow ? ' · glows at dusk' : d.spray ? ' · sprays water' : '';
    const b = locked ? `<span class="tag">🔒 L${d.level}</span>` : ui.btn(`👁️ Preview &amp; place · ${money(d.cost)}`, 'decorBuy', { k }, g.decor.list.length >= DECOR_MAX);
    h += ui.row(d.icon, `${d.name}${n ? ` <span class="tag">${n}</span>` : ''}`, `${d.desc}${extra}`, b, locked ? 'locked' : '');
  }
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
  h += `<div class="row2"><button class="btn ghost danger" data-act="decorRemove">🗑️ Take down · +${D.tokens ? `${back} 🌹` : money(back)}</button></div>`;
  h += `<p class="hint small">Taking something down gives back ${Math.round(DECOR_REFUND * 100)}% of what it cost.</p>`;
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

// ---------------------------------------------------------------- buttons
// returns 'done' (handled, nothing to redraw), 'render' (handled, redraw the menu) or null (not mine)
export async function handlePanels(ui, act, d) {
  const g = ui.game;
  const fail = (m) => { ui.toast(m); g.audio.play('error'); return 'done'; };
  switch (act) {
    case 'decorCat': ui.decorCat = d.c; return 'render';
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
