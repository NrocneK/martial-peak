// =====================================================================
// LƯU GAME: cấu trúc dữ liệu lưu, đọc / ghi localStorage, nâng cấp save cũ, xuất / nhập file.
// `data` là trạng thái vĩnh viễn duy nhất; các module khác trong thư mục này đọc / sửa nó rồi gọi save().
// =====================================================================

import { BIBAOS, DAO_TIER, GEAR_TIERS, MAX_ITEM_LEVEL, type ItemInst } from '../../config/items';
import { REALM_SKILLS } from '../../config/skills';
import { MAX_TIER, TIERS, legacyCumTuVi } from '../../config/realms';
import { SLOT_IDS, type MatId, type SlotId } from '../../config/types';

export type DailyKey = 'runs' | 'wins' | 'kills' | 'alchemy' | 'forge' | 'cultivate';
/** Tiến độ nhiệm vụ (logic nằm ở quests.ts) */
export interface QuestState {
  /** Ngày (YYYY-MM-DD, giờ máy) của bộ tiến độ hằng ngày hiện tại */
  day: string;
  daily: Partial<Record<DailyKey, number>>;
  /** id nhiệm vụ hằng ngày đã nhận thưởng trong ngày */
  dailyClaimed: string[];
  /** id nhiệm vụ chính tuyến đã nhận thưởng */
  mainClaimed: string[];
}
const defaultQuests = (): QuestState => ({ day: '', daily: {}, dailyClaimed: [], mainClaimed: [] });

// Giữ nguyên tên khóa cũ: đổi tên sẽ làm người chơi mất save. Đổi cấu trúc thì tăng SAVE_VERSION và thêm bước trong migrate().
const SAVE_KEY = 'vo-luyen-survival-save';
const SAVE_VERSION = 5;
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
  /** Tiến độ nhiệm vụ (hằng ngày + chính tuyến) */
  quests: QuestState;
}

export type Result = { ok: boolean; msg: string };
export const ok = (msg: string): Result => ({ ok: true, msg });
export const fail = (msg: string): Result => ({ ok: false, msg });

function defaultSave(): SaveData {
  const sword: ItemInst = { uid: 1, slot: 'weapon', tier: 0, quality: 0, level: 0, weaponId: 'wp_sword' };
  return {
    v: SAVE_VERSION,
    linh: 0,
    tuVi: 0,
    tier: 0,
    mats: { herb: 0, core: 0, ore: 0, essence: 0 },
    items: [sword],
    equipped: { weapon: 1, clothes: null, shoes: null, accessory: null, bibao: null },
    loadout: ['ho_khieu'],
    cleared: {},
    pills: { hp: 0, dmg: 0, def: 0 },
    nextUid: 2,
    inbox: [],
    sound: true,
    stats: { runs: 0, wins: 0, kills: 0 },
    quests: defaultQuests(),
  };
}

/**
 * Save < v5 dùng hệ phẩm chất cũ: xóa toàn bộ trang bị, phát lại thanh kiếm khởi đầu (Phàm cấp Hạ phẩm).
 * Bí bảo của các màn cố định ĐÃ vượt được trả lại (chỉ nhận một lần, xóa đi thì không bao giờ lấy lại được).
 */
function resetGear(d: SaveData): void {
  d.items = [{ uid: 1, slot: 'weapon', tier: 0, quality: 0, level: 0, weaponId: 'wp_sword' }];
  d.inbox = [];
  d.equipped = { weapon: 1, clothes: null, shoes: null, accessory: null, bibao: null };
  d.nextUid = 2;
  for (const b of BIBAOS) {
    if ((d.cleared?.[`w${b.world}s${b.stageNo}`] ?? 0) > 0) {
      d.items.push({ uid: d.nextUid++, slot: 'bibao', tier: b.world - 1, quality: 0, level: 0, bibaoId: b.id });
      if (d.equipped.bibao == null) d.equipped.bibao = d.nextUid - 1;
    }
  }
}

/**
 * Nâng cấp save cũ:
 *  v1: 37 bậc → quy đổi sang 49 bậc.  v2: Đạo Tổ chia 3 kỳ (51 bậc) → kẹp về 49 bậc.
 *  v3: chưa có bình cảnh → giữ nguyên bậc, quy đổi tu vi để thanh tu vi trong bậc hiện tại giữ đúng tỉ lệ %.
 */
function migrate(d: SaveData, from: number): void {
  if (from < 5) resetGear(d);
  if (from >= 4) return;
  if (from < 2) {
    d.tier = Math.round((Math.max(0, d.tier || 0) * 48) / 36);
    d.tuVi = TIERS[Math.min(MAX_TIER, d.tier)].cumTuVi;
  }
  d.tier = Math.max(0, Math.min(MAX_TIER, d.tier || 0));
  if (d.tier >= MAX_TIER) {
    d.tuVi = TIERS[MAX_TIER].cumTuVi;
    return;
  }
  if (from === 3) {
    const t = d.tier;
    const o0 = legacyCumTuVi(t);
    const o1 = legacyCumTuVi(t + 1);
    const frac = Math.max(0, Math.min(1, ((d.tuVi || 0) - o0) / (o1 - o0)));
    d.tuVi = Math.round(TIERS[t].cumTuVi + frac * (TIERS[t + 1].cumTuVi - TIERS[t].cumTuVi));
  } else {
    d.tuVi = Math.max(d.tuVi || 0, TIERS[d.tier].cumTuVi);
  }
}

function isInt(n: unknown, lo: number, hi: number): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= lo && n <= hi;
}

/** Kiểm tra / vá dữ liệu lưu: bỏ item hỏng, sửa ô trang bị trỏ vào item không tồn tại, đảm bảo luôn có vũ khí. */
function sanitize(d: SaveData): SaveData {
  const okItem = (i: ItemInst): boolean =>
    !!i && isInt(i.uid, 1, 1e9) && SLOT_IDS.includes(i.slot) && isInt(i.tier, 0, DAO_TIER) && isInt(i.level, 0, MAX_ITEM_LEVEL) &&
    isInt(i.quality, 0, Math.max(0, GEAR_TIERS[i.tier].grades - 1));
  const seen = new Set<number>();
  const clean = (arr: ItemInst[]): ItemInst[] =>
    (Array.isArray(arr) ? arr : []).filter((i) => {
      if (!okItem(i) || seen.has(i.uid)) return false;
      seen.add(i.uid);
      return true;
    });
  d.items = clean(d.items);
  // Hệ kỹ năng mới (v0.15): kỹ năng mang theo cũ (ac_*) không còn → thay bằng các kỹ năng cảnh giới đã mở
  if (!Array.isArray(d.loadout)) d.loadout = [];
  d.loadout = d.loadout.filter((id) => REALM_SKILLS.some((s) => s.id === id));
  if (!d.loadout.length) d.loadout = REALM_SKILLS.filter((s) => s.unlockTier <= (d.tier || 0)).slice(-3).map((s) => s.id);
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
      w = { uid: d.nextUid++, slot: 'weapon', tier: 0, quality: 0, level: 0, weaponId: 'wp_sword' };
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
  d.quests = { ...def.quests, ...(parsed.quests ?? {}) };
  if (!Array.isArray(d.quests.dailyClaimed)) d.quests.dailyClaimed = [];
  if (!Array.isArray(d.quests.mainClaimed)) d.quests.mainClaimed = [];
  if (!d.quests.daily || typeof d.quests.daily !== 'object') d.quests.daily = {};
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
