import { AppState, Entry, Part, Vehicle } from '../types';
import { DEF_CID } from '../constants';

let tok: string | null = null;
let tokExp = 0;
let tc: any = null;
let pend: { cb: (r: any) => void; err: (e: any) => void } | null = null;
let fileId: string | null = null;
let isConnected = false;
let isBusy = false;
let again = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

export function getStoredClientId(): string {
  try {
    return localStorage.getItem('soxe_cid') || DEF_CID;
  } catch (e) {
    return DEF_CID;
  }
}

export function saveClientId(id: string) {
  try {
    localStorage.setItem('soxe_cid', id);
  } catch (e) {}
}

const tokenOk = () => !!tok && Date.now() < tokExp - 60000;

export function getToken(): Promise<string> {
  return new Promise((res, rej) => {
    if (tokenOk() && tok) return res(tok);
    if (!tc) return rej('nogsi');
    pend = {
      cb: (r: any) => {
        if (r && r.access_token) {
          tok = r.access_token;
          tokExp = Date.now() + (r.expires_in || 3600) * 1000;
          try {
            localStorage.setItem('soxe_gd', '1');
          } catch (e) {}
          res(tok!);
        } else {
          rej((r && r.error) || 'denied');
        }
      },
      err: (e: any) => rej((e && e.type) || 'popup'),
    };
    tc.requestAccessToken({ prompt: '' });
  });
}

/**
 * Retrieves the authentic name, email, and avatar of the logged in Google account
 */
export async function fetchGoogleUserProfile(accessToken?: string): Promise<{ name?: string; email?: string; avatar?: string } | null> {
  try {
    const token = accessToken || (await getToken());
    if (!token) return null;

    // 1. Google Drive About API (guaranteed to succeed with drive.appdata scope)
    try {
      const driveRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (driveRes.ok) {
        const d = await driveRes.json();
        if (d && d.user) {
          return {
            name: d.user.displayName || undefined,
            email: d.user.emailAddress || undefined,
            avatar: d.user.photoLink || undefined,
          };
        }
      }
    } catch {}

    // 2. Fallback to oauth2 userinfo
    try {
      const uRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (uRes.ok) {
        const u = await uRes.json();
        return {
          name: u.name || u.given_name,
          email: u.email,
          avatar: u.picture,
        };
      }
    } catch {}
  } catch {}
  return null;
}

async function gd(url: string, opt: RequestInit = {}): Promise<Response> {
  const t = await getToken();
  const r = await fetch(url, {
    ...opt,
    headers: {
      Authorization: 'Bearer ' + t,
      ...(opt.headers || {}),
    },
  });
  if (r.status === 401) {
    tok = null;
    throw new Error('auth');
  }
  if (!r.ok) throw new Error('http ' + r.status);
  return r;
}

export async function pullDrive(): Promise<any> {
  const q = encodeURIComponent("name='so-xe.json'");
  const j = await (
    await gd(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id)`)
  ).json();
  fileId = j.files && j.files[0] ? j.files[0].id : null;
  if (!fileId) return null;
  return (await gd(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`)).json();
}

export async function uploadDrive(state: AppState): Promise<void> {
  const body = JSON.stringify({
    app: 'so-xe',
    version: 1,
    vehicles: state.vehicles,
    entries: state.entries,
    parts: state.parts,
    tomb: state.tomb,
  });

  if (!fileId) {
    const b = 'soxe' + Date.now();
    const m = JSON.stringify({ name: 'so-xe.json', parents: ['appDataFolder'] });
    const r = await gd('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/related; boundary=' + b },
      body:
        '--' +
        b +
        '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
        m +
        '\r\n--' +
        b +
        '\r\nContent-Type: application/json\r\n\r\n' +
        body +
        '\r\n--' +
        b +
        '--',
    });
    fileId = (await r.json()).id;
  } else {
    await gd(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  }
}

export function mergeCloud(state: AppState, d: any): { nextState: AppState; changed: boolean; back: number } {
  let ch = 0;
  let back = 0;
  const tomb = { ...state.tomb };
  const vehicles = [...state.vehicles];
  const entries = [...state.entries];
  const parts = [...state.parts];

  const cloudTomb = d.tomb || {};
  Object.keys(cloudTomb).forEach((id) => {
    if ((tomb[id] || 0) < cloudTomb[id]) {
      tomb[id] = cloudTomb[id];
      ch++;
    }
  });
  Object.keys(tomb).forEach((id) => {
    if ((cloudTomb[id] || 0) < tomb[id]) back++;
  });

  const dead = (it: { id: string; u?: number }) => (tomb[it.id] || 0) >= (it.u || 0);
  const seen = new Set<string>();

  const take = <T extends { id: string; u?: number }>(arr: T[], it: T) => {
    if (!it || !it.id) return;
    seen.add(it.id);
    if (dead(it)) return;
    const i = arr.findIndex((x) => x.id === it.id);
    const c = JSON.parse(JSON.stringify(it));
    if (i < 0) {
      arr.push(c);
      ch++;
    } else if ((it.u || 0) > (arr[i].u || 0)) {
      arr[i] = c;
      ch++;
    } else if ((it.u || 0) < (arr[i].u || 0)) {
      back++;
    }
  };

  (d.vehicles || []).forEach((v: Vehicle) => take(vehicles, v));
  (d.entries || []).forEach((e: Entry) => take(entries, e));
  (d.parts || []).forEach((p: Part) => take(parts, p));

  const nv = vehicles.filter((x) => !dead(x));
  const ne = entries.filter((x) => !dead(x));
  const np = parts.filter((x) => !dead(x));

  if (nv.length !== vehicles.length || ne.length !== entries.length || np.length !== parts.length) {
    ch++;
  }

  [...nv, ...ne, ...np].forEach((x) => {
    if (!seen.has(x.id)) back++;
  });

  let cur = state.cur;
  if (!cur && nv[0]) {
    cur = nv[0].id;
    ch++;
  }

  return {
    nextState: {
      vehicles: nv,
      entries: ne,
      parts: np,
      cur,
      tomb,
    },
    changed: ch > 0,
    back,
  };
}

export function initGoogleSync(
  onStatus: (status: string) => void,
  onRemoteUpdate: (updater: (prev: AppState) => AppState) => void,
  getState: () => AppState
) {
  const clientId = getStoredClientId();
  if (clientId.indexOf('DAN_') === 0) {
    onStatus('Cần Client ID để đồng bộ Google Drive');
    return;
  }

  let n = 0;
  const w = setInterval(() => {
    const win = window as any;
    if (win.google && win.google.accounts && win.google.accounts.oauth2) {
      clearInterval(w);
      tc = win.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.appdata',
        callback: (r: any) => pend && pend.cb(r),
        error_callback: (e: any) => pend && pend.err(e),
      });
      let m = false;
      try {
        m = localStorage.getItem('soxe_gd') === '1';
      } catch (e) {}
      if (m && tokenOk()) {
        isConnected = true;
        onStatus('Google Drive sẵn sàng');
      } else if (m) {
        onStatus('Sẵn sàng đồng bộ Google Drive');
      } else {
        onStatus('Chưa kết nối Google Drive');
      }
    } else if (++n > 50) {
      clearInterval(w);
      onStatus('Chưa tải được dịch vụ Google. Sẵn sàng hoạt động ngoại tuyến.');
    }
  }, 200);
}

export async function connectGoogleDrive(
  onStatus: (status: string) => void,
  onRemoteUpdate: (updater: (prev: AppState) => AppState) => void,
  getState: () => AppState
) {
  if (/Zalo|FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|TikTok|; wv\)/i.test(navigator.userAgent || '')) {
    onStatus(
      'Bạn đang mở trong trình duyệt của ứng dụng khác (Zalo, Facebook…). Google không cho đăng nhập ở đây. Hãy mở link bằng Chrome hoặc Safari.'
    );
    return;
  }

  try {
    await getToken();
    isConnected = true;
    await syncNow(onStatus, onRemoteUpdate, getState);
  } catch (e: any) {
    const t = String(e?.message || e || '');
    onStatus(
      t.indexOf('popup_failed') === 0
        ? 'Trình duyệt chặn cửa sổ đăng nhập. Hãy cho phép pop-up cho trang này rồi bấm lại.'
        : t === 'popup_closed'
        ? 'Bạn đã đóng cửa sổ đăng nhập. Bấm “Kết nối Google Drive” để thử lại.'
        : 'Chưa kết nối được. Bấm “Kết nối Google Drive” để thử lại.'
    );
  }
}

export async function syncNow(
  onStatus: (status: string) => void,
  onRemoteUpdate: (updater: (prev: AppState) => AppState) => void,
  getState: () => AppState
) {
  if (isBusy) {
    again = true;
    return;
  }
  isBusy = true;
  onStatus('Đang đồng bộ Google Drive…');

  try {
    const d = await pullDrive();
    let backCount = 1;

    if (d) {
      let shouldBack = 0;
      onRemoteUpdate((prev) => {
        const res = mergeCloud(prev, d);
        shouldBack = res.back;
        return res.nextState;
      });
      backCount = shouldBack;
    }

    if (!d || backCount > 0) {
      await uploadDrive(getState());
    }

    onStatus(
      'Đã đồng bộ Google Drive lúc ' +
        new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    );
  } catch (e) {
    onStatus('Chưa đồng bộ được. Bấm “Kết nối Google Drive” để thử lại');
  } finally {
    isBusy = false;
    if (again) {
      again = false;
      scheduleDrivePush(onStatus, onRemoteUpdate, getState);
    }
  }
}

export function scheduleDrivePush(
  onStatus: (status: string) => void,
  onRemoteUpdate: (updater: (prev: AppState) => AppState) => void,
  getState: () => AppState
) {
  if (!isConnected || !tokenOk()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => syncNow(onStatus, onRemoteUpdate, getState), 700);
}
