// A light word filter for chat and guestbook messages: rude words (English and the usual
// romanised Punjabi/Hindi ones) are masked, links and phone numbers are dropped, and runs of
// repeated letters are shortened. Players can also block and report. Pure module (tested).
const RUDE = [
  'fuck', 'shit', 'bitch', 'bastard', 'asshole', 'dick', 'cunt', 'slut', 'whore', 'idiot', 'stupid',
  'chutiya', 'chutia', 'chootiya', 'bhenchod', 'behenchod', 'bhanchod', 'madarchod', 'maderchod', 'mc', 'bc',
  'gandu', 'gaandu', 'kamina', 'kameena', 'harami', 'haramzada', 'kutta', 'kutti', 'saala', 'sala', 'lund', 'lun',
  'bhosdi', 'bhosdike', 'randi', 'teri maa', 'tatti', 'phuddu', 'fuddu', 'kanjar', 'kanjri', 'dalla', 'panchod',
];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RX = new RegExp(`(^|[^a-z])(${RUDE.map(esc).join('|')})(?=[^a-z]|$)`, 'gi');

export function clean(text, max = 160) {
  let t = String(text ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  t = t.replace(/https?:\/\/\S+|www\.\S+/gi, '🔗').replace(/\+?\d[\d\s-]{7,}\d/g, '📵');
  t = t.replace(/(.)\1{4,}/g, '$1$1$1');
  t = t.replace(RX, (m, pre, w) => pre + w[0] + '•'.repeat(Math.max(2, w.length - 1)));
  return t.slice(0, max);
}
export const isRude = (text) => { RX.lastIndex = 0; const r = RX.test(String(text ?? '')); RX.lastIndex = 0; return r; };
