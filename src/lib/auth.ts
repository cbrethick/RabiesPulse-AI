// Local-only authentication for the prototype.
// Passwords are never stored: we keep a PBKDF2-SHA256 hash with a random salt.
// This protects against casual reading of localStorage, NOT against a
// determined attacker with device access — fine for a demo, not for production.

const USERS_KEY = 'rp_users';
const SESSION_KEY = 'rp_session';
const LOCK_KEY = 'rp_login_lock';
const ITERATIONS = 150_000;
const SESSION_DAYS = 30;

export interface UserRecord {
  salt: string;
  hash: string;
  iterations: number;
  createdAt: string;
  sessions: string[]; // SHA-256 of active session tokens
}

interface Session {
  mobile: string;
  token: string;
  expires: number;
}

export type AuthError =
  | 'mobileInvalid'
  | 'passwordWeak'
  | 'passwordMismatch'
  | 'alreadyRegistered'
  | 'wrongLogin'
  | 'locked'
  | 'codeWrong';

const enc = new TextEncoder();

const toHex = (buf: ArrayBuffer | Uint8Array) =>
  Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const fromHex = (hex: string) => new Uint8Array(hex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));

function randomHex(bytes: number) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return toHex(a);
}

export async function hashPassword(password: string, saltHex: string, iterations = ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations },
    key,
    256,
  );
  return toHex(bits);
}

async function sha256(text: string) {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

/** Normalise "+91 98765 43210" -> "9876543210". Returns null if not an Indian mobile number. */
export function normaliseMobile(input: string): string | null {
  let d = input.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

/** At least 8 characters with a letter and a number. */
export const passwordOk = (p: string) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

function readUsers(): Record<string, UserRecord> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeUsers(u: Record<string, UserRecord>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(u));
}

export function isRegistered(mobile: string) {
  return Boolean(readUsers()[mobile]);
}

/** Step 1 of registration: validate and return a demo verification code (no SMS is sent). */
export function startRegistration(mobileRaw: string, password: string, confirm: string): { mobile: string; code: string } | AuthError {
  const mobile = normaliseMobile(mobileRaw);
  if (!mobile) return 'mobileInvalid';
  if (isRegistered(mobile)) return 'alreadyRegistered';
  if (!passwordOk(password)) return 'passwordWeak';
  if (password !== confirm) return 'passwordMismatch';
  const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
  return { mobile, code };
}

/** Step 2: code matched — store the hashed account and sign in. */
export async function completeRegistration(mobile: string, password: string) {
  const users = readUsers();
  if (users[mobile]) return 'alreadyRegistered' as const;
  const salt = randomHex(16);
  users[mobile] = { salt, hash: await hashPassword(password, salt), iterations: ITERATIONS, createdAt: new Date().toISOString(), sessions: [] };
  writeUsers(users);
  return createSession(mobile);
}

async function createSession(mobile: string) {
  const token = randomHex(32);
  const users = readUsers();
  users[mobile].sessions = [...(users[mobile].sessions || []).slice(-4), await sha256(token)];
  writeUsers(users);
  const s: Session = { mobile, token, expires: Date.now() + SESSION_DAYS * 864e5 };
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  return mobile;
}

function lockState(): { fails: number; until: number } {
  try {
    return JSON.parse(localStorage.getItem(LOCK_KEY) || '{"fails":0,"until":0}');
  } catch {
    return { fails: 0, until: 0 };
  }
}

/** Seconds left on the lock after 5 wrong attempts (30 s). */
export const lockSecondsLeft = () => Math.max(0, Math.ceil((lockState().until - Date.now()) / 1000));

export async function login(mobileRaw: string, password: string): Promise<string | AuthError> {
  if (lockSecondsLeft() > 0) return 'locked';
  const mobile = normaliseMobile(mobileRaw);
  const user = mobile ? readUsers()[mobile] : undefined;
  // Same message for unknown number and wrong password (don't reveal which numbers exist)
  const ok = user && (await hashPassword(password, user.salt, user.iterations)) === user.hash;
  if (!ok || !mobile) {
    const l = lockState();
    const fails = l.fails + 1;
    localStorage.setItem(LOCK_KEY, JSON.stringify(fails >= 5 ? { fails: 0, until: Date.now() + 30_000 } : { fails, until: 0 }));
    return 'wrongLogin';
  }
  localStorage.removeItem(LOCK_KEY);
  return createSession(mobile);
}

/** Restore the session after a refresh. Returns the mobile number or null. */
export async function currentUser(): Promise<string | null> {
  try {
    const s: Session | null = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (!s || s.expires < Date.now()) return null;
    const user = readUsers()[s.mobile];
    if (!user || !user.sessions?.includes(await sha256(s.token))) return null;
    return s.mobile;
  } catch {
    return null;
  }
}

export async function logout() {
  try {
    const s: Session | null = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (s) {
      const users = readUsers();
      const h = await sha256(s.token);
      if (users[s.mobile]) users[s.mobile].sessions = users[s.mobile].sessions.filter((x) => x !== h);
      writeUsers(users);
    }
  } finally {
    localStorage.removeItem(SESSION_KEY);
  }
}

/** Remove the account and everything stored for it on this device. */
export function deleteAccount(mobile: string) {
  const users = readUsers();
  delete users[mobile];
  writeUsers(users);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(`rp_profile_${mobile}`);
}
