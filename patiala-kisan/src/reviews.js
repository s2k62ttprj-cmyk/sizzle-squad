// How a customer's visit turns into a review. Reviews are fair: a bad one always has a real
// reason from the visit (a long queue, the shelf running out, leaving empty-handed or prices
// pushed well above normal), and even then most customers shrug it off. Without a reason
// the review is good or, now and then, a friendly three stars. Over a normal day about one
// review in twenty is a bad one. Pure module: no three.js, unit tested in tests/index.html.
import { REVIEWS } from './config.js';

export const REVIEW_WAIT = 25;            // seconds in the queue before waiting counts against you
export const REASONS = {
  gaveup: { icon: '🧺', text: 'left empty-handed' },
  empty: { icon: '📦', text: 'shelf ran out' },
  wait: { icon: '⏳', text: 'long queue' },
  price: { icon: '💸', text: 'high prices' },
};
// chance that a customer with this complaint actually leaves a bad review
const BAD_CHANCE = { gaveup: 0.55, empty: 0.3, wait: 0.3, price: 0.1 };

// visit: { waited (seconds queued), short (shelf ran out), gaveUp (left with nothing),
// priceUp (a price surge such as Gulab Jamun is on; blessings and perks never count) }
export function reviewReason(v) {
  if (v.gaveUp) return 'gaveup';
  if (v.short) return 'empty';
  if (v.waited > REVIEW_WAIT) return 'wait';
  if (v.priceUp) return 'price';
  return null;
}

const pick = (a, rnd) => a[Math.floor(rnd() * a.length)];

// visit also has: item (something they bought), happy (Kaju Barfi), blessed (Gurdwara)
// recent: stars of the latest reviews, newest first. Returns { s, t, item, why }
export function chooseReview(v, recent = [], rnd = Math.random) {
  const why = reviewReason(v);
  let bad = why ? BAD_CHANCE[why] : 0;
  if (v.happy) bad *= 0.4;
  if (v.blessed) bad *= 0.7;
  // one grumble is plenty: right after a bad review the next customers go easy
  if (recent.slice(0, 12).some((s) => s <= 2)) bad *= 0.05;
  const item = v.item || null;
  const about = (r) => !r.for || r.for === item;
  let pool;
  if (why && rnd() < bad) pool = REVIEWS.filter((r) => r.s <= 2 && r.when === why && about(r));
  else if (why && rnd() < 0.55) pool = REVIEWS.filter((r) => r.s === 3 && r.when === why && about(r));
  else {
    const neutral = rnd() < 0.12;
    const fit = (r) => (neutral ? r.s === 3 : r.s >= 4) && (!r.when || (r.when === 'blessed' && v.blessed));
    if (v.blessed && !neutral && rnd() < 0.3) pool = REVIEWS.filter((r) => r.when === 'blessed');
    if (!pool?.length && item && rnd() < 0.55) pool = REVIEWS.filter((r) => fit(r) && r.for === item);
    if (!pool?.length) pool = REVIEWS.filter((r) => fit(r) && !r.for && !r.when);
  }
  const r = pick(pool, rnd);
  return { s: r.s, t: r.t, item, why: r.s <= 3 && r.when && REASONS[r.when] ? r.when : null };
}
