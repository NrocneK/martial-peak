import { RUN } from '../config/balance';
import { activeById } from '../config/activeSkills';
import { weaponById } from '../config/weapons';
import { PASSIVES, passiveById, passiveValueText } from '../config/passiveSkills';
import type { RunState } from './RunState';
import type { SkillDef } from '../config/types';

export type CardKind = 'weapon' | 'active' | 'passive' | 'awaken' | 'heal' | 'linh';

export interface Card {
  kind: CardKind;
  /** id kỹ năng (heal/linh: cố định) */
  id: string;
  name: string;
  desc: string;
  /** Cấp sau khi chọn (0 với thẻ phụ) */
  level: number;
  isNew: boolean;
  color: number;
  /** Nhãn nhỏ: "Vũ khí", "Chủ động", "Bị động", "Thức tỉnh" */
  tag: string;
  /** Các dòng chú thích liên kết kỹ năng ↔ bị động ↔ thức tỉnh (hiện dưới thẻ) */
  links: string[];
}

function skillDef(id: string): SkillDef {
  return id.startsWith('wp_') ? weaponById(id) : activeById(id);
}

/** Mô tả trạng thái sở hữu một kỹ năng trong lượt chơi: "đang có Cấp 3" / "chưa có" */
function ownText(run: RunState, id: string): string {
  const o = run.find(id);
  return o ? `đang có Cấp ${o.level}` : 'chưa có';
}

/** Chú thích cho thẻ kỹ năng vũ khí / chủ động: bị động liên kết + điều kiện thức tỉnh */
function skillLinks(run: RunState, def: SkillDef): string[] {
  const p = passiveById(def.linkedPassive);
  const own = run.find(def.id);
  const lines = [`🔗 Bị động liên kết: ${p.name} (${ownText(run, p.id)})`];
  if (def.awaken) {
    if (own?.awakened) lines.push(`⭐ Đã thức tỉnh: ${def.awaken.name}`);
    else {
      const lv = own?.level ?? 0;
      const need: string[] = [];
      if (lv < RUN.maxLevel) need.push(`kỹ năng Cấp ${RUN.maxLevel} (hiện ${lv || 'chưa có'})`);
      if (!run.find(p.id)) need.push(`có ${p.name}`);
      lines.push(`⭐ Thức tỉnh "${def.awaken.name}": ${need.length ? 'cần ' + need.join(' + ') : 'ĐÃ ĐỦ ĐIỀU KIỆN'}`);
    }
  }
  return lines;
}

/** Chú thích cho thẻ bị động: nó đang liên kết với kỹ năng nào (trong vũ khí + 3 chủ động mang theo) */
function passiveLinks(run: RunState, passiveId: string): string[] {
  const weapon = run.skills.find((s) => s.kind === 'weapon');
  const pool: SkillDef[] = [];
  if (weapon) pool.push(weaponById(weapon.id));
  for (const id of run.loadout) pool.push(activeById(id));
  const mine = pool.filter((d) => d.linkedPassive === passiveId);
  if (!mine.length) return ['🔗 Không liên kết kỹ năng nào đang mang (chỉ tăng chỉ số)'];
  return mine.map((d) => {
    const o = run.find(d.id);
    const state = o ? (o.awakened ? 'đã thức tỉnh' : `Cấp ${o.level}/${RUN.maxLevel}`) : 'chưa có';
    return `🔗 Liên kết: ${d.name} (${state}) → thức tỉnh "${d.awaken?.name ?? '—'}"`;
  });
}

/**
 * Sinh thẻ khi lên cấp theo quy tắc trong GDD:
 *  - Kho thẻ = kỹ năng vũ khí + 3 kỹ năng chủ động đã mang + mọi kỹ năng bị động.
 *  - Tối đa 6 kỹ năng một màn (vũ khí tính 1). Hết chỗ thì chỉ ra thẻ nâng cấp kỹ năng đã có.
 *  - Nếu đã chọn một kỹ năng chủ động: nó và bị động liên kết có tỉ lệ ×3.
 *  - Kỹ năng chủ động đạt cấp 5 + đã có bị động liên kết (bất kỳ cấp) → lần ra thẻ kế tiếp CHẮC CHẮN có thẻ thức tỉnh.
 *  - Không đủ thẻ hợp lệ thì bù bằng thẻ hồi máu / linh thạch.
 */
export function generateCards(run: RunState): Card[] {
  const cards: Card[] = [];

  // 1. Thẻ thức tỉnh (chắc chắn xuất hiện)
  for (const s of run.skills) {
    if (s.kind === 'passive' || s.awakened || s.level < RUN.maxLevel) continue;
    const def = skillDef(s.id);
    if (!def.awaken || !run.find(def.linkedPassive)) continue;
    cards.push({
      kind: 'awaken',
      id: s.id,
      name: def.awaken.name,
      desc: def.awaken.desc,
      level: s.level,
      isNew: false,
      color: 0xffd700,
      tag: 'Thức tỉnh',
      links: [`🔗 Điều kiện đã đủ: ${def.name} Cấp ${RUN.maxLevel} + ${passiveById(def.linkedPassive).name}`],
    });
    break; // mỗi lần chỉ một thẻ thức tỉnh
  }

  // 2. Kho ứng viên có trọng số
  interface Cand {
    card: Card;
    w: number;
  }
  const cands: Cand[] = [];
  const focusActive = run.lastActive;
  const focusPassive = focusActive ? activeById(focusActive).linkedPassive : null;
  const weightOf = (id: string): number => (id === focusActive || id === focusPassive ? RUN.focusWeight : 1);

  const addSkill = (def: SkillDef, kind: 'weapon' | 'active'): void => {
    const own = run.find(def.id);
    if (own) {
      if (own.level >= RUN.maxLevel) return;
      cands.push({
        w: weightOf(def.id),
        card: { kind, id: def.id, name: def.name, desc: def.desc, level: own.level + 1, isNew: false, color: def.color, tag: kind === 'weapon' ? 'Vũ khí' : 'Chủ động', links: skillLinks(run, def) },
      });
    } else if (run.hasFreeSlot) {
      cands.push({
        w: weightOf(def.id),
        card: { kind, id: def.id, name: def.name, desc: def.desc, level: 1, isNew: true, color: def.color, tag: kind === 'weapon' ? 'Vũ khí' : 'Chủ động', links: skillLinks(run, def) },
      });
    }
  };
  const weapon = run.skills.find((s) => s.kind === 'weapon');
  if (weapon) addSkill(weaponById(weapon.id), 'weapon');
  for (const id of run.loadout) addSkill(activeById(id), 'active');
  for (const p of PASSIVES) {
    const own = run.find(p.id);
    if (own) {
      if (own.level >= RUN.maxLevel) continue;
      cands.push({
        w: weightOf(p.id),
        card: { kind: 'passive', id: p.id, name: p.name, desc: `${p.desc} (${passiveValueText(p, own.level + 1)})`, level: own.level + 1, isNew: false, color: p.color, tag: 'Bị động', links: passiveLinks(run, p.id) },
      });
    } else if (run.hasFreeSlot) {
      cands.push({
        w: weightOf(p.id),
        card: { kind: 'passive', id: p.id, name: p.name, desc: `${p.desc} (${passiveValueText(p, 1)})`, level: 1, isNew: true, color: p.color, tag: 'Bị động', links: passiveLinks(run, p.id) },
      });
    }
  }

  // 3. Bốc ngẫu nhiên có trọng số, không trùng
  while (cards.length < RUN.cardChoices && cands.length > 0) {
    const total = cands.reduce((a, c) => a + c.w, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < cands.length; idx++) {
      r -= cands[idx].w;
      if (r <= 0) break;
    }
    idx = Math.min(idx, cands.length - 1);
    cards.push(cands[idx].card);
    cands.splice(idx, 1);
  }

  // 4. Bù thẻ phụ
  const fillers: Card[] = [
    { kind: 'heal', id: 'heal', name: 'Điều Tức', desc: 'Hồi 35% máu tối đa.', level: 0, isNew: false, color: 0xff7080, tag: 'Phụ', links: [] },
    { kind: 'linh', id: 'linh', name: 'Thu Hoạch', desc: 'Nhận ngay một ít linh thạch.', level: 0, isNew: false, color: 0xffd860, tag: 'Phụ', links: [] },
  ];
  let fi = 0;
  while (cards.length < RUN.cardChoices) cards.push(fillers[fi++ % fillers.length]);
  return cards;
}

