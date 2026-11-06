// Compact, checksummed text codes for share links and farm backups: JSON, then a salted
// hash after a '~', deflated where the browser can, then URL-safe base64.
// 'z' + base64 = compressed, 'j' + base64 = plain (browsers without CompressionStream).
export function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}
export const toB64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
export const fromB64 = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };
const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

export async function pack(obj, salt) {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json + '~' + hash(salt + json));
  if (typeof CompressionStream !== 'undefined') return 'z' + toB64(await pipe(bytes, new CompressionStream('deflate-raw')));
  return 'j' + toB64(bytes);
}
// Returns the parsed object, or throws `damaged` if the code was cut short or edited
export async function unpack(code, salt, damaged = 'this code is damaged') {
  let text;
  try {
    let bytes = fromB64(code.slice(1));
    if (code[0] === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    text = new TextDecoder().decode(bytes);
  } catch { throw new Error(damaged); }
  const cut = text.lastIndexOf('~');
  const json = text.slice(0, cut);
  if (cut < 0 || hash(salt + json) !== text.slice(cut + 1)) throw new Error(damaged);
  return JSON.parse(json);
}
