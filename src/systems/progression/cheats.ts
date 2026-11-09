// Công cụ gỡ lỗi / thử nghiệm: cấp tài nguyên, mở khóa tất cả.
// Chỉ được gọi từ debug API (`__vls`) và nút "Chế độ TEST" — cả hai chỉ hiện khi isDebugMode().

import { type ItemInst } from '../../config/items';
import { MAX_TIER, TIERS, tierCap } from '../../config/realms';
import { SLOT_IDS } from '../../config/types';
import { WEAPONS } from '../../config/weapons';
import { ALL_STAGES } from '../../config/worlds';
import { addItem, makeItem } from './inventory';
import { data, ok, save, type Result } from './save';

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
  data.tuVi = Math.max(data.tuVi, tierCap(MAX_TIER)); // Đạo Tổ
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
