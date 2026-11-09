// =====================================================================
// LƯU GAME: cấu trúc dữ liệu lưu, đọc / ghi localStorage, nâng cấp save cũ, xuất / nhập file.
// `data` là trạng thái vĩnh viễn duy nhất; các module khác trong thư mục này đọc / sửa nó rồi gọi save().
// =====================================================================

import { MAX_ITEM_LEVEL, type ItemInst } from '../../config/items';
import { MAX_TIER, TIERS } from '../../config/realms';
import { SLOT_IDS, type MatId, type SlotId } from '../../config/types';

// Giữ nguyên tên khóa cũ: đổi tên sẽ làm người chơi mất save.
const SAVE_KEY = 'vo-luyen-survival-save';
const SAVE_VERSION = 3;
export const MAX_ITEMS = 120;
/** Hòm thưởng: nơi chứa đồ khi túi đầy, nhận lại khi có chỗ */
export const MAX_INBOX = 20;

export interface SaveData {
  v: number;
  linh: number;
  tuVi: number;
  tier: number;
  mats: Record<MatId, number>;
  items: ItemInst[];
  equipped: Record<SlotId, number | null>;
  loadout: string[];
  /** id màn → số lần đã vượt */
  cleared: Record<string, number>;
  /** số lần đã dùng đan tăng vĩnh viễn */
  pills: { hp: number; dmg: number; def: number };
  nextUid: number;
  /** Đồ chờ nhận (túi đầy lúc nhận thưởng) */
  inbox: ItemInst[];
  sound: boolean;
  stats: { runs: number; wins: number; kills: number };
}

export type Result = { ok: boolean; msg: string };
export const ok = (msg: string): Result => ({ ok: true, msg });
export const fail = (msg: string): Result => ({ ok: false, msg });

function defaultSave(): SaveData {
  const sword: ItemInst = { uid: 1, slot: 'weapon', rarity: 0, level: 0, grade: 1, weaponId: 'wp_sword' };
  return {
    v: SAVE_VERSION,
    linh: 0,
    tuVi: 0,
    tier: 0,
    mats: { herb: 0, core: 0, ore: 0, essence: 0 },
    items: [sword],
    equipped: { weapon: 1, clothes: null, shoes: null, accessory: null, bibao: null },
    loadout: ['ac_fire'],
    cleared: {},
    pills: { hp: 0, dmg: 0, def: 0 },
    nextUid: 2,
    inbox: [],
    sound: true,
    stats: { runs: 0, wins: 0, kills: 0 },
  };
}

/** Nâng cấp save cũ: v1 dùng 37 bậc; v2 dùng 51 bậc (Đạo Tổ chia 3 kỳ); v3 dùng 49 bậc (Đạo Tổ một bậc). */
function migrate(d: SaveData, from: number): void {
  if (from >= 3) return;
  if (from < 2) {
    d.tier = Math.round((Math.max(0, d.tier || 0) * 48) / 36);
    d.tuVi = TIERS[Math.min(MAX_TIER, d.tier)].cumTuVi;
  }
  d.tier = Math.max(0, Math.min(MAX_TIER, d.tier || 0));
  if (d.tier >= MAX_TIER) d.tuVi = TIERS[MAX_TIER].cumTuVi;
}

function isInt(n: unknown, lo: number, hi: number): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= lo && n <= hi;
}

/** Kiểm tra / vá dữ liệu lưu: bỏ item hỏng, sửa ô trang bị trỏ vào item không tồn tại, đảm bảo luôn có vũ khí. */
function sanitize(d: SaveData): SaveData {
  const okItem = (i: ItemInst): boolean =>
    !!i && isInt(i.uid, 1, 1e9) && SLOT_IDS.includes(i.slot) && isInt(i.rarity, 0, 4) && isInt(i.level, 0, MAX_ITEM_LEVEL) && isInt(i.grade, 1, 6);
  const seen = new Set<number>();
  const clean = (arr: ItemInst[]): ItemInst[] =>
    (Array.isArray(arr) ? arr : []).filter((i) => {
      if (!okItem(i) || seen.has(i.uid)) return false;
      seen.add(i.uid);
      return true;
    });
  d.items = clean(d.items);
  d.inbox = clean(d.inbox).slice(0, MAX_INBOX);
  for (const k of Object.keys(d.mats) as MatId[]) if (!Number.isFinite(d.mats[k]) || d.mats[k] < 0) d.mats[k] = 0;
  if (!Number.isFinite(d.linh) || d.linh < 0) d.linh = 0;
  d.nextUid = Math.max(d.nextUid || 1, ...[...seen].map((u) => u + 1), 2);
  for (const slot of SLOT_IDS) {
    const uid = d.equipped[slot];
    const it = uid == null ? null : d.items.find((i) => i.uid === uid);
    if (!it || it.slot !== slot) d.equipped[slot] = null;
  }
  if (d.equipped.weapon == null) {
    let w = d.items.find((i) => i.slot === 'weapon');
    if (!w) {
      w = { uid: d.nextUid++, slot: 'weapon', rarity: 0, level: 0, grade: 1, weaponId: 'wp_sword' };
      d.items.push(w);
    }
    d.equipped.weapon = w.uid;
  }
  return d;
}

/**
 * Biến dữ liệu thô (đọc từ localStorage hoặc file) thành save hợp lệ:
 * gộp với bản mặc định (để không lỗi khi phiên bản mới có thêm trường) → nâng cấp → làm sạch.
 */
function normalize(parsed: Partial<SaveData>): SaveData {
  const def = defaultSave();
  const d = { ...def, ...parsed } as SaveData;
  d.mats = { ...def.mats, ...(parsed.mats ?? {}) };
  d.equipped = { ...def.equipped, ...(parsed.equipped ?? {}) };
  d.pills = { ...def.pills, ...(parsed.pills ?? {}) };
  d.stats = { ...def.stats, ...(parsed.stats ?? {}) };
  migrate(d, parsed.v ?? 1);
  d.v = SAVE_VERSION;
  return sanitize(d);
}

function load(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? normalize(JSON.parse(raw) as Partial<SaveData>) : defaultSave();
  } catch {
    return defaultSave();
  }
}

/** Trạng thái vĩnh viễn hiện tại (live binding: module khác import vẫn thấy giá trị mới sau khi gán lại) */
export let data: SaveData = load();

export function save(): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* hết dung lượng / chế độ ẩn danh: bỏ qua, không làm sập game */
  }
}

export function getSave(): SaveData {
  return data;
}

export function resetAll(): void {
  data = defaultSave();
  save();
}

/** Xuất toàn bộ save thành chuỗi JSON (để sao lưu) */
export function exportSave(): string {
  return JSON.stringify(data);
}

/** Nhập save từ chuỗi JSON. Kiểm tra cấu trúc trước, hợp lệ mới ghi đè. */
export function importSave(text: string): Result {
  try {
    const parsed = JSON.parse(text) as Partial<SaveData>;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items) || typeof parsed.tier !== 'number') return fail('File không phải save hợp lệ.');
    data = normalize(parsed);
    save();
    return ok('Đã nhập save.');
  } catch {
    return fail('Không đọc được file save.');
  }
}

export function setSound(on: boolean): void {
  data.sound = on;
  save();
}
