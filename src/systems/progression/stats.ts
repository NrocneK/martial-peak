// Chỉ số tổng hợp của nhân vật = cảnh giới + trang bị + đan dược. GameScene đọc computeMeta() khi vào màn.

import { TIER_POWER } from '../../config/balance';
import { itemStats, type ItemInst } from '../../config/items';
import { SLOT_IDS, type ItemStats, type SlotId } from '../../config/types';
import { WEAPONS } from '../../config/weapons';
import { data } from './save';

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
