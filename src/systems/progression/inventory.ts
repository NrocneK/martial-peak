// Trang bị: tạo đồ, luyện khí, cường hóa, bán, mặc / tháo, khóa, so sánh, phân giải, tái luyện, hòm thưởng.

import { econScale } from '../../config/balance';
import { AFFIX_COUNT, MAX_ITEM_LEVEL, rarityWeights, rollAffix, type ItemInst, type RolledAffix } from '../../config/items';
import { type SlotId } from '../../config/types';
import { WEAPONS } from '../../config/weapons';
import { data, fail, MAX_ITEMS, ok, save, type Result } from './save';
import { computeMeta } from './stats';
import { highestWorld } from './worldProgress';
import { track } from './quests';

function findItem(uid: number): ItemInst | undefined {
  return data.items.find((i) => i.uid === uid);
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

/** Thêm vào túi; trả về false nếu túi đầy (người gọi tự quyết định đưa vào hòm thưởng hay bán) */
export function addItem(it: ItemInst): boolean {
  if (data.items.length >= MAX_ITEMS) return false;
  data.items.push(it);
  return true;
}

// ---------------------------------------------------------------------
// Luyện khí / cường hóa / bán
// ---------------------------------------------------------------------
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
  track('forge');
  save();
  return { ...ok('Luyện khí thành công!'), item };
}

export function upgradeCost(it: ItemInst): { ore: number; linh: number } {
  return { ore: 2 + it.level, linh: Math.ceil(10 * econScale(data.tier) * (it.level + 1)) };
}

export function upgradeItem(uid: number): Result {
  const it = findItem(uid);
  if (!it) return fail('Không tìm thấy trang bị.');
  if (it.level >= MAX_ITEM_LEVEL) return fail('Đã cường hóa tối đa.');
  const c = upgradeCost(it);
  if (data.mats.ore < c.ore) return fail('Không đủ khoáng thạch.');
  if (data.linh < c.linh) return fail('Không đủ linh thạch.');
  data.mats.ore -= c.ore;
  data.linh -= c.linh;
  it.level++;
  track('forge');
  save();
  return ok(`Cường hóa thành công lên +${it.level}.`);
}

export function sellValue(it: ItemInst): number {
  return Math.ceil(5 * econScale(data.tier) * (it.rarity + 1) * (1 + it.level * 0.5));
}

export function sellItem(uid: number): Result {
  const it = findItem(uid);
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

// ---------------------------------------------------------------------
// Mặc / tháo / khóa / so sánh
// ---------------------------------------------------------------------
export function equip(uid: number): Result {
  const it = findItem(uid);
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
  const it = findItem(uid);
  if (!it) return;
  it.locked = !it.locked;
  save();
}

const COMPARE_KEYS = ['maxHp', 'damage', 'atkSpeed', 'armor', 'moveSpeed', 'crit', 'area', 'pickup', 'xpGain', 'linhGain'] as const;
type CompareKey = (typeof COMPARE_KEYS)[number];

/** Chênh lệch chỉ số tổng nếu thay món `uid` vào ô tương ứng (dùng đúng computeMeta, không tự cộng tay) */
export function compareItem(uid: number): Partial<Record<CompareKey, number>> {
  const it = findItem(uid);
  if (!it) return {};
  const old = data.equipped[it.slot];
  const a = computeMeta();
  data.equipped[it.slot] = uid;
  const b = computeMeta();
  data.equipped[it.slot] = old;
  const out: Partial<Record<CompareKey, number>> = {};
  for (const k of COMPARE_KEYS) if (Math.abs(b[k] - a[k]) > 1e-9) out[k] = b[k] - a[k];
  return out;
}

// ---------------------------------------------------------------------
// Phân giải & tái luyện
// ---------------------------------------------------------------------
export function dismantleValue(it: ItemInst): { ore: number; essence: number } {
  return { ore: 1 + it.rarity + Math.floor(it.grade / 2), essence: it.rarity >= 3 ? it.rarity - 2 : 0 };
}

export function dismantleItem(uid: number): Result {
  const it = findItem(uid);
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

function reforgeCost(it: ItemInst): { ore: number; essence: number; linh: number } {
  return { ore: 3, essence: 1, linh: Math.ceil(10 * econScale(data.tier) * (1 + it.rarity)) };
}

export interface ReforgeOffer {
  uid: number;
  index: number;
  old: RolledAffix;
  next: RolledAffix;
}

/** Trừ chi phí và roll thử một dòng mới. Người chơi chọn nhận mới hoặc giữ cũ (chi phí không hoàn lại). */
export function rollReforge(uid: number, index: number): Result & { offer?: ReforgeOffer } {
  const it = findItem(uid);
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
  const it = findItem(o.uid);
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
