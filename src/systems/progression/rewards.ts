// Kết thúc màn: tính thưởng (tu vi, linh thạch, nguyên liệu, trang bị, bí bảo) và ghi vào save.

import { type ItemInst } from '../../config/items';
import { type SlotId } from '../../config/types';
import { stageById } from '../../config/worlds';
import { addItem, makeItem, sellValue } from './inventory';
import { data, MAX_INBOX, save } from './save';
import { isCleared } from './worldProgress';
import { track } from './quests';

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
  track('runs');
  track('kills', res.kills);
  if (res.victory) track('wins');

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
