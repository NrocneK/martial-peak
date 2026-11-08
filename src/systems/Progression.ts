// =====================================================================
// TIẾN TRÌNH VĨNH VIỄN: lưu game (localStorage), cảnh giới, tu vi, linh thạch, trang bị,
// luyện đan, luyện khí, mở khóa thế giới / màn chơi, thưởng sau màn.
//
// Tách hoàn toàn khỏi Phaser: UI gọi các hàm ở đây, GameScene chỉ đọc computeMeta().
// =====================================================================

import { ACTIVES } from '../config/activeSkills';
import { econScale, TIER_POWER } from '../config/balance';
import {
  MAX_ITEM_LEVEL,
  PILLS,
  rarityWeights,
  AFFIX_COUNT,
  rollAffix,
  type RolledAffix,
  type ItemInst,
  type PillId,
  itemStats,
} from '../config/items';
import { MAX_TIER, TIERS, nextStep, nextTierNeed } from '../config/realms';
import { SLOT_IDS, type ItemStats, type MatId, type SlotId } from '../config/types';
import { WEAPONS } from '../config/weapons';
import { ALL_STAGES, WORLDS, stageById, worldById, type StageDef } from '../config/worlds';

const SAVE_KEY = 'vo-luyen-survival-save';
const SAVE_VERSION = 1;
const MAX_ITEMS = 120;
/** Hòm thưởng: nơi chứa đồ khi túi đầy, nhận lại khi có chỗ */
const MAX_INBOX = 20;

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

let data: SaveData = load();

function load(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    // Gộp với bản mặc định để không lỗi khi phiên bản mới có thêm trường
    const d = { ...defaultSave(), ...parsed } as SaveData;
    d.mats = { ...defaultSave().mats, ...(parsed.mats ?? {}) };
    d.equipped = { ...defaultSave().equipped, ...(parsed.equipped ?? {}) };
    d.pills = { ...defaultSave().pills, ...(parsed.pills ?? {}) };
    d.stats = { ...defaultSave().stats, ...(parsed.stats ?? {}) };
    d.v = SAVE_VERSION;
    return sanitize(d);
  } catch {
    return defaultSave();
  }
}

const isInt = (n: unknown, lo: number, hi: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= lo && n <= hi;

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

/** Xuất toàn bộ save thành chuỗi JSON (để sao lưu) */
export function exportSave(): string {
  return JSON.stringify(data);
}

/** Nhập save từ chuỗi JSON. Kiểm tra cấu trúc trước, hợp lệ mới ghi đè. */
export function importSave(text: string): Result {
  try {
    const parsed = JSON.parse(text) as Partial<SaveData>;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items) || typeof parsed.tier !== 'number') return fail('File không phải save hợp lệ.');
    const def = defaultSave();
    const d = { ...def, ...parsed } as SaveData;
    d.mats = { ...def.mats, ...(parsed.mats ?? {}) };
    d.equipped = { ...def.equipped, ...(parsed.equipped ?? {}) };
    d.pills = { ...def.pills, ...(parsed.pills ?? {}) };
    d.stats = { ...def.stats, ...(parsed.stats ?? {}) };
    d.v = SAVE_VERSION;
    data = sanitize(d);
    save();
    return ok('Đã nhập save.');
  } catch {
    return fail('Không đọc được file save.');
  }
}

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

export type Result = { ok: boolean; msg: string };
const ok = (msg: string): Result => ({ ok: true, msg });
const fail = (msg: string): Result => ({ ok: false, msg });

// ---------------------------------------------------------------------
// Chỉ số tổng hợp (cảnh giới + trang bị + đan dược)
// ---------------------------------------------------------------------
export interface MetaStats {
  maxHp: number;
  damage: number;
  atkSpeed: number;
  moveSpeed: number;
  armor: number;
  pickup: number;
  regen: number;
  crit: number;
  area: number;
  xpGain: number;
  linhGain: number;
  weaponId: string;
}

export function equippedItem(slot: SlotId): ItemInst | null {
  const uid = data.equipped[slot];
  return uid == null ? null : (data.items.find((i) => i.uid === uid) ?? null);
}

export function computeMeta(): MetaStats {
  const t = data.tier;
  const sum: Required<ItemStats> = {
    damage: 0, atkSpeed: 0, maxHp: 0, armor: 0, moveSpeed: 0, pickup: 0, regen: 0, crit: 0, xpGain: 0, linhGain: 0, area: 0,
  };
  for (const slot of SLOT_IDS) {
    const it = equippedItem(slot);
    if (!it) continue;
    const s = itemStats(it);
    for (const k of Object.keys(s) as (keyof ItemStats)[]) sum[k] += s[k] ?? 0;
  }
  const weapon = equippedItem('weapon');
  return {
    maxHp: 100 * TIER_POWER.hp(t) * (1 + sum.maxHp) * (1 + 0.02 * data.pills.hp),
    damage: TIER_POWER.damage(t) * (1 + sum.damage) * (1 + 0.02 * data.pills.dmg),
    atkSpeed: 1 + sum.atkSpeed,
    moveSpeed: 220 * TIER_POWER.speed(t) * (1 + Math.min(0.5, sum.moveSpeed)),
    armor: TIER_POWER.armor(t) + sum.armor + 3 * data.pills.def,
    pickup: 80 + TIER_POWER.pickup(t) + sum.pickup,
    regen: sum.regen,
    crit: 0.05 + sum.crit,
    area: 1 + sum.area,
    xpGain: 1 + sum.xpGain,
    linhGain: 1 + sum.linhGain,
    weaponId: weapon?.weaponId ?? WEAPONS[0].id,
  };
}

// ---------------------------------------------------------------------
// Cảnh giới / tu vi
// ---------------------------------------------------------------------
export function tierNow(): number {
  return data.tier;
}

export function canBreakthrough(): boolean {
  const need = nextTierNeed(data.tier);
  return need !== null && data.tuVi >= need;
}

export function breakthrough(): Result {
  if (data.tier >= MAX_TIER) return fail('Đã đạt cảnh giới cao nhất.');
  if (!canBreakthrough()) return fail('Chưa đủ tu vi để đột phá.');
  data.tier++;
  // Đột phá có thể mở khóa kỹ năng chủ động mới
  const unlocked = ACTIVES.filter((a) => a.unlockTier === data.tier).map((a) => a.name);
  save();
  return ok(`Đột phá thành công: ${TIERS[data.tier].name}!` + (unlocked.length ? ` Mở khóa kỹ năng: ${unlocked.join(', ')}.` : ''));
}

/** Gói tu vi bán bằng linh thạch ("cắn đá") */
export function packInfo(): { cost: number; gain: number } {
  const step = nextStep(data.tier);
  return { cost: Math.max(1, Math.ceil(0.12 * step)), gain: Math.max(1, Math.ceil(0.1 * step)) };
}

export function buyPack(count: number): Result {
  const { cost, gain } = packInfo();
  const maxByLinh = Math.floor(data.linh / cost);
  const n = Math.min(count, maxByLinh);
  if (n <= 0) return fail('Không đủ linh thạch.');
  data.linh -= cost * n;
  data.tuVi += gain * n;
  save();
  return ok(`Hấp thụ ${n} gói linh thạch, nhận ${gain * n} tu vi.`);
}

// ---------------------------------------------------------------------
// Luyện đan
// ---------------------------------------------------------------------
export function pillLinhCost(id: PillId): number {
  const def = PILLS.find((p) => p.id === id)!;
  return Math.max(1, Math.ceil(def.linhFactor * nextStep(data.tier)));
}

export function pillCount(id: PillId): number {
  return id === 'tuvi' ? 0 : data.pills[id];
}

export function craftPill(id: PillId): Result {
  const def = PILLS.find((p) => p.id === id)!;
  if (def.cap > 0 && pillCount(id) >= def.cap) return fail('Đã đạt giới hạn sử dụng loại đan này.');
  const linh = pillLinhCost(id);
  if (data.mats.herb < def.herb || data.mats.core < def.core) return fail('Không đủ nguyên liệu.');
  if (data.linh < linh) return fail('Không đủ linh thạch.');
  data.mats.herb -= def.herb;
  data.mats.core -= def.core;
  data.linh -= linh;
  if (id === 'tuvi') {
    const gain = Math.ceil(0.25 * nextStep(data.tier));
    data.tuVi += gain;
    save();
    return ok(`Luyện thành ${def.name}, nhận ${gain} tu vi.`);
  }
  data.pills[id]++;
  save();
  return ok(`Luyện thành ${def.name}. Hiệu quả tăng vĩnh viễn.`);
}

// ---------------------------------------------------------------------
// Trang bị / luyện khí
// ---------------------------------------------------------------------
export function highestWorld(): number {
  let h = 1;
  for (const w of WORLDS) if (isWorldUnlocked(w.id)) h = w.id;
  return h;
}

function rollRarity(grade: number): number {
  const w = rarityWeights(grade);
  const total = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < w.length; i++) {
    r -= w[i];
    if (r <= 0) return i;
  }
  return 0;
}

export function makeItem(slot: SlotId, grade: number, rarity = rollRarity(grade), weaponId?: string): ItemInst {
  const it: ItemInst = { uid: data.nextUid++, slot, rarity, level: 0, grade };
  if (slot === 'weapon') it.weaponId = weaponId ?? WEAPONS[Math.floor(Math.random() * WEAPONS.length)].id;
  const aff: RolledAffix[] = [];
  for (let i = 0; i < AFFIX_COUNT[rarity]; i++) {
    const a = rollAffix(slot, aff.map((x) => x.id));
    if (a) aff.push(a);
  }
  if (aff.length) it.affixes = aff;
  return it;
}

function addItem(it: ItemInst): boolean {
  if (data.items.length >= MAX_ITEMS) return false;
  data.items.push(it);
  return true;
}

export function forgeCost(): { ore: number; linh: number } {
  return { ore: 3, linh: Math.ceil(15 * econScale(data.tier)) };
}

export function forge(slot: SlotId, weaponId?: string): Result & { item?: ItemInst } {
  if (slot === 'bibao') return fail('Bí bảo chỉ nhận được khi vượt màn cố định.');
  const c = forgeCost();
  if (data.mats.ore < c.ore) return fail('Không đủ khoáng thạch.');
  if (data.linh < c.linh) return fail('Không đủ linh thạch.');
  if (data.items.length >= MAX_ITEMS) return fail('Túi đồ đã đầy, hãy bán bớt trang bị.');
  data.mats.ore -= c.ore;
  data.linh -= c.linh;
  const item = makeItem(slot, highestWorld(), undefined, slot === 'weapon' ? weaponId : undefined);
  addItem(item);
  save();
  return { ...ok('Luyện khí thành công!'), item };
}

export function upgradeCost(it: ItemInst): { ore: number; linh: number } {
  return { ore: 2 + it.level, linh: Math.ceil(10 * econScale(data.tier) * (it.level + 1)) };
}

export function upgradeItem(uid: number): Result {
  const it = data.items.find((i) => i.uid === uid);
  if (!it) return fail('Không tìm thấy trang bị.');
  if (it.level >= MAX_ITEM_LEVEL) return fail('Đã cường hóa tối đa.');
  const c = upgradeCost(it);
  if (data.mats.ore < c.ore) return fail('Không đủ khoáng thạch.');
  if (data.linh < c.linh) return fail('Không đủ linh thạch.');
  data.mats.ore -= c.ore;
  data.linh -= c.linh;
  it.level++;
  save();
  return ok(`Cường hóa thành công lên +${it.level}.`);
}

export function sellValue(it: ItemInst): number {
  return Math.ceil(5 * econScale(data.tier) * (it.rarity + 1) * (1 + it.level * 0.5));
}

export function sellItem(uid: number): Result {
  const it = data.items.find((i) => i.uid === uid);
  if (!it) return fail('Không tìm thấy trang bị.');
  if (it.slot === 'bibao') return fail('Không thể bán bí bảo.');
  if (data.equipped[it.slot] === uid) return fail('Hãy tháo trang bị trước khi bán.');
  if (it.locked) return fail('Món đồ đang khóa.');
  const v = sellValue(it);
  data.items = data.items.filter((i) => i.uid !== uid);
  data.linh += v;
  save();
  return ok(`Đã bán, nhận ${v} linh thạch.`);
}

export function equip(uid: number): Result {
  const it = data.items.find((i) => i.uid === uid);
  if (!it) return fail('Không tìm thấy trang bị.');
  data.equipped[it.slot] = uid;
  save();
  return ok('Đã trang bị.');
}

export function unequip(slot: SlotId): void {
  if (slot === 'weapon') return; // luôn phải có vũ khí
  data.equipped[slot] = null;
  save();
}

export function toggleLock(uid: number): void {
  const it = data.items.find((i) => i.uid === uid);
  if (!it) return;
  it.locked = !it.locked;
  save();
}

/** Chênh lệch chỉ số tổng nếu thay món `uid` vào ô tương ứng (dùng đúng computeMeta, không tự cộng tay) */
export function compareItem(uid: number): Partial<Record<'maxHp' | 'damage' | 'atkSpeed' | 'armor' | 'moveSpeed' | 'crit' | 'area' | 'pickup' | 'xpGain' | 'linhGain', number>> {
  const it = data.items.find((i) => i.uid === uid);
  if (!it) return {};
  const old = data.equipped[it.slot];
  const a = computeMeta();
  data.equipped[it.slot] = uid;
  const b = computeMeta();
  data.equipped[it.slot] = old;
  const keys = ['maxHp', 'damage', 'atkSpeed', 'armor', 'moveSpeed', 'crit', 'area', 'pickup', 'xpGain', 'linhGain'] as const;
  const out: Partial<Record<(typeof keys)[number], number>> = {};
  for (const k of keys) if (Math.abs(b[k] - a[k]) > 1e-9) out[k] = b[k] - a[k];
  return out;
}

// ---------------------------------------------------------------------
// Phân giải & tái luyện
// ---------------------------------------------------------------------
export function dismantleValue(it: ItemInst): { ore: number; essence: number } {
  return { ore: 1 + it.rarity + Math.floor(it.grade / 2), essence: it.rarity >= 3 ? it.rarity - 2 : 0 };
}

export function dismantleItem(uid: number): Result {
  const it = data.items.find((i) => i.uid === uid);
  if (!it) return fail('Không tìm thấy trang bị.');
  if (it.slot === 'bibao') return fail('Không thể phân giải bí bảo.');
  if (data.equipped[it.slot] === uid) return fail('Hãy tháo trang bị trước.');
  if (it.locked) return fail('Món đồ đang khóa.');
  const v = dismantleValue(it);
  data.items = data.items.filter((i) => i.uid !== uid);
  data.mats.ore += v.ore;
  data.mats.essence += v.essence;
  save();
  return ok(`Phân giải: +${v.ore} khoáng thạch` + (v.essence ? `, +${v.essence} tinh hoa` : '') + '.');
}

export function reforgeCost(it: ItemInst): { ore: number; essence: number; linh: number } {
  return { ore: 3, essence: 1, linh: Math.ceil(10 * econScale(data.tier) * (1 + it.rarity)) };
}

export interface ReforgeOffer {
  uid: number;
  index: number;
  old: RolledAffix;
  next: RolledAffix;
}

/** Trừ chi phí và roll thử một dòng mới. Người chơi chọn nhận mới hoặc giữ cũ (chi phí không hoàn lại). */
export function rollReforge(uid: number, index: number): (Result & { offer?: ReforgeOffer }) {
  const it = data.items.find((i) => i.uid === uid);
  if (!it || !it.affixes || !it.affixes[index]) return fail('Không có thuộc tính để tái luyện.');
  const c = reforgeCost(it);
  if (data.mats.ore < c.ore) return fail('Không đủ khoáng thạch.');
  if (data.mats.essence < c.essence) return fail('Không đủ tinh hoa (phân giải đồ Thánh / Thần để có).');
  if (data.linh < c.linh) return fail('Không đủ linh thạch.');
  const others = it.affixes.filter((_, i) => i !== index).map((a) => a.id);
  const next = rollAffix(it.slot, others);
  if (!next) return fail('Không có thuộc tính khác phù hợp.');
  data.mats.ore -= c.ore;
  data.mats.essence -= c.essence;
  data.linh -= c.linh;
  save();
  return { ...ok('Đã tái luyện.'), offer: { uid, index, old: it.affixes[index], next } };
}

export function acceptReforge(o: ReforgeOffer): Result {
  const it = data.items.find((i) => i.uid === o.uid);
  if (!it || !it.affixes || !it.affixes[o.index]) return fail('Không tìm thấy món đồ.');
  it.affixes[o.index] = o.next;
  save();
  return ok('Đã thay thuộc tính mới.');
}

// ---------------------------------------------------------------------
// Hòm thưởng (túi đầy)
// ---------------------------------------------------------------------
export function claimInbox(uid: number): Result {
  const it = data.inbox.find((i) => i.uid === uid);
  if (!it) return fail('Không tìm thấy vật phẩm.');
  if (data.items.length >= MAX_ITEMS) return fail('Túi đồ đã đầy, hãy bán hoặc phân giải bớt.');
  data.inbox = data.inbox.filter((i) => i.uid !== uid);
  data.items.push(it);
  if (it.slot === 'bibao' && !data.equipped.bibao) data.equipped.bibao = it.uid;
  save();
  return ok('Đã nhận vào túi.');
}

// ---------------------------------------------------------------------
// Kỹ năng mang theo
// ---------------------------------------------------------------------
export function unlockedActives() {
  return ACTIVES.filter((a) => a.unlockTier <= data.tier);
}

export function toggleLoadout(id: string): Result {
  const a = ACTIVES.find((x) => x.id === id);
  if (!a || a.unlockTier > data.tier) return fail('Kỹ năng chưa mở khóa.');
  const i = data.loadout.indexOf(id);
  if (i >= 0) {
    data.loadout.splice(i, 1);
  } else {
    if (data.loadout.length >= 3) return fail('Chỉ mang được tối đa 3 kỹ năng chủ động.');
    data.loadout.push(id);
  }
  save();
  return ok('Đã cập nhật kỹ năng mang theo.');
}

/** Loadout hợp lệ (loại bỏ kỹ năng chưa mở khóa) */
export function currentLoadout(): string[] {
  return data.loadout.filter((id) => ACTIVES.some((a) => a.id === id && a.unlockTier <= data.tier)).slice(0, 3);
}

// ---------------------------------------------------------------------
// Mở khóa thế giới / màn
// ---------------------------------------------------------------------
export function isCleared(stageId: string): boolean {
  return (data.cleared[stageId] ?? 0) > 0;
}

export function isWorldUnlocked(w: number): boolean {
  if (w <= 1) return true;
  const g = worldById(w).gate;
  if (data.tier < g.tier) return false;
  const prev = worldById(w - 1);
  if (g.needAll) return prev.stages.every((s) => isCleared(s.id));
  if (g.needFinalOnly) return isCleared(prev.stages[prev.stages.length - 1].id);
  return true;
}

export function worldGateText(w: number): string {
  const g = worldById(w).gate;
  const prev = worldById(w - 1);
  const parts: string[] = [];
  if (g.tier > 0) parts.push(`đạt cảnh giới ${TIERS[g.tier].name}`);
  if (g.needAll) parts.push(`vượt hết 10 màn ${prev.name}`);
  if (g.needFinalOnly) parts.push(`đánh bại boss cuối ${prev.name}`);
  return 'Cần ' + parts.join(' và ');
}

export function isStageUnlocked(stage: StageDef): boolean {
  if (!isWorldUnlocked(stage.world)) return false;
  if (stage.index === 0) return true;
  return isCleared(worldById(stage.world).stages[stage.index - 1].id);
}

/** Số màn đã vượt / tổng */
export function progressCount(): { cleared: number; total: number } {
  return { cleared: ALL_STAGES.filter((s) => isCleared(s.id)).length, total: ALL_STAGES.length };
}

export function gameCompleted(): boolean {
  return isCleared(ALL_STAGES[ALL_STAGES.length - 1].id);
}

// ---------------------------------------------------------------------
// Kết thúc màn: tính thưởng
// ---------------------------------------------------------------------
export interface StageResult {
  stageId: string;
  victory: boolean;
  kills: number;
  /** linh thạch nhặt được trong màn (đã nhân hệ số may mắn) */
  linh: number;
  level: number;
  time: number;
}

export interface RewardSummary {
  victory: boolean;
  firstClear: boolean;
  tuVi: number;
  linh: number;
  herb: number;
  core: number;
  ore: number;
  items: ItemInst[];
  /** Số món phải để trong hòm thưởng vì túi đầy */
  inboxed: number;
  kills: number;
  level: number;
  time: number;
}

export function finishStage(res: StageResult): RewardSummary {
  const stage = stageById(res.stageId);
  const first = !isCleared(stage.id);
  const summary: RewardSummary = {
    victory: res.victory,
    firstClear: res.victory && first,
    tuVi: 0,
    linh: 0,
    herb: 0,
    core: 0,
    ore: 0,
    items: [],
    inboxed: 0,
    kills: res.kills,
    level: res.level,
    time: res.time,
  };
  data.stats.runs++;
  data.stats.kills += res.kills;

  if (!res.victory) {
    // Thua: giữ 30% linh thạch nhặt được, không nhận tu vi
    summary.linh = Math.floor(res.linh * 0.3);
  } else {
    data.stats.wins++;
    const r = stage.reward;
    summary.tuVi = first ? r.tuVi : Math.round(r.tuVi * 0.5);
    summary.linh = res.linh + Math.round(r.linh * (first ? 1 : 0.6));
    const m = first ? 1 : 0.5;
    summary.herb = Math.round(r.herb * m);
    summary.core = Math.round(r.core * m);
    summary.ore = Math.round(r.ore * m);
    data.cleared[stage.id] = (data.cleared[stage.id] ?? 0) + 1;

    // Bí bảo: lần đầu vượt màn cố định
    if (first && stage.fixed && stage.bibaoId) {
      const bb: ItemInst = {
        uid: data.nextUid++,
        slot: 'bibao',
        rarity: stage.index === 9 ? 4 : 3,
        level: 0,
        grade: stage.world,
        bibaoId: stage.bibaoId,
      };
      summary.items.push(bb);
      if (addItem(bb)) {
        if (!data.equipped.bibao) data.equipped.bibao = bb.uid; // tự trang bị nếu ô đang trống
      } else {
        // Túi đầy: bí bảo (chỉ nhận một lần) KHÔNG được mất → vào hòm thưởng, vượt giới hạn nếu cần
        data.inbox.push(bb);
        summary.inboxed++;
      }
    }
    // Trang bị rơi ngẫu nhiên (boss chính cao hơn, boss chốt thế giới chắc chắn có)
    const chance = stage.boss.final ? 1 : stage.boss.main ? 0.6 : 0.35;
    if (Math.random() < chance) {
      const slots: SlotId[] = ['weapon', 'clothes', 'shoes', 'accessory'];
      const it = makeItem(slots[Math.floor(Math.random() * slots.length)], stage.world);
      summary.items.push(it);
      if (!addItem(it)) {
        if (data.inbox.length < MAX_INBOX) {
          data.inbox.push(it);
          summary.inboxed++;
        } else summary.linh += sellValue(it); // hòm cũng đầy: tự bán để không mất giá trị
      }
    }
  }

  data.tuVi += summary.tuVi;
  data.linh += summary.linh;
  data.mats.herb += summary.herb;
  data.mats.core += summary.core;
  data.mats.ore += summary.ore;
  save();
  return summary;
}

// ---------------------------------------------------------------------
// Tiện ích cho gỡ lỗi
// ---------------------------------------------------------------------
export function debugGrant(opts: { tuVi?: number; linh?: number; tier?: number; mats?: number; clearAll?: boolean }): void {
  if (opts.tuVi) data.tuVi += opts.tuVi;
  if (opts.linh) data.linh += opts.linh;
  if (opts.mats) {
    data.mats.herb += opts.mats;
    data.mats.core += opts.mats;
    data.mats.ore += opts.mats;
  }
  if (opts.tier !== undefined) {
    data.tier = Math.max(0, Math.min(MAX_TIER, opts.tier));
    data.tuVi = Math.max(data.tuVi, TIERS[data.tier].cumTuVi);
  }
  if (opts.clearAll) for (const s of ALL_STAGES) data.cleared[s.id] = data.cleared[s.id] ?? 1;
  save();
}

/**
 * CHẾ ĐỘ TEST (mở khóa tất cả): cảnh giới tối đa, vượt hết 60 màn, nhiều tài nguyên,
 * đủ 6 loại vũ khí + mỗi ô một món phẩm chất cao nhất, và đủ 12 bí bảo.
 * Cộng thêm vào save hiện tại (không xóa đồ cũ) — nên xuất save trước nếu muốn giữ bản gốc.
 */
export function unlockAll(): Result {
  data.tier = MAX_TIER;
  data.tuVi = Math.max(data.tuVi, TIERS[MAX_TIER].cumTuVi);
  for (const st of ALL_STAGES) data.cleared[st.id] = data.cleared[st.id] ?? 1;
  data.linh = Math.max(data.linh, 1_000_000);
  data.mats.herb = Math.max(data.mats.herb, 999);
  data.mats.core = Math.max(data.mats.core, 999);
  data.mats.ore = Math.max(data.mats.ore, 999);
  data.mats.essence = Math.max(data.mats.essence, 999);
  const top = 4; // phẩm chất cao nhất
  const grade = 6;
  let added = 0;
  const give = (it: ItemInst): void => {
    if (addItem(it)) added++;
    else data.inbox.push(it);
  };
  for (const w of WEAPONS) give(makeItem('weapon', grade, top, w.id));
  for (const slot of SLOT_IDS) if (slot !== 'weapon' && slot !== 'bibao') give(makeItem(slot, grade, top));
  const owned = new Set([...data.items, ...data.inbox].filter((i) => i.slot === 'bibao').map((i) => i.bibaoId));
  for (const st of ALL_STAGES) {
    if (!st.fixed || !st.bibaoId || owned.has(st.bibaoId)) continue;
    give({ uid: data.nextUid++, slot: 'bibao', rarity: st.index === 9 ? 4 : 3, level: 0, grade: st.world, bibaoId: st.bibaoId });
  }
  save();
  return ok(`Đã mở khóa tất cả: cảnh giới tối đa, 60 màn, tài nguyên, ${added} món trang bị + bí bảo.`);
}

export function setSound(on: boolean): void {
  data.sound = on;
  save();
}
