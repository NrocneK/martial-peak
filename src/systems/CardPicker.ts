import { RUN } from '../config/balance';
import { PASSIVES, passiveById, skillById, type SkillDef } from '../config/skills';
import type { RunState } from './RunState';

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
  /** Nhãn nhỏ: "Vũ khí", "Cảnh giới", "Bị động", "Thức tỉnh" */
  tag: string;
  /** Các dòng chú thích liên kết kỹ năng ↔ bị động ↔ thức tỉnh (hiện dưới thẻ) */
  links: string[];
  /** Số liệu khi chọn thẻ: sát thương / hồi chiêu / hiệu ứng mới của cấp đó */
  stats: string[];
  /** Dùng icon bản thức tỉnh */
  awakenIcon?: boolean;
}

/** Mô tả trạng thái sở hữu một kỹ năng trong lượt chơi */
function ownText(run: RunState, id: string): string {
  const o = run.find(id);
  return o ? `đang có Cấp ${o.level}` : 'chưa có';
}

/** Chú thích cho thẻ kỹ năng: bị động liên kết + điều kiện thức tỉnh */
function skillLinks(run: RunState, def: SkillDef): string[] {
  const p = passiveById(def.passive);
  const own = run.find(def.id);
  const lines = [`🔗 Bị động liên kết: ${p.name} (${ownText(run, p.id)})`];
  if (own?.awakened) lines.push(`⭐ Đã thức tỉnh: ${def.awaken.name}`);
  else {
    const lv = own?.level ?? 0;
    const need: string[] = [];
    if (lv < RUN.maxLevel) need.push(`kỹ năng Cấp ${RUN.maxLevel} (hiện ${lv || 'chưa có'})`);
    if (!run.find(p.id)) need.push(`có ${p.name}`);
    lines.push(`⭐ Thức tỉnh "${def.awaken.name}": ${need.length ? 'cần ' + need.join(' + ') : 'ĐÃ ĐỦ ĐIỀU KIỆN'}`);
  }
  return lines;
}

/** Dòng số liệu của một cấp: "Sát thương 140% · Hồi chiêu 1,1s" + hiệu ứng mới */
function levelLines(def: SkillDef, lv: number): string[] {
  const L = def.levels[lv - 1];
  return [`Sát thương ${L.damage} · Hồi chiêu ${L.cooldown}`, (lv === 1 ? '' : '✦ ') + L.effect];
}

/** Chú thích cho thẻ bị động: nó mở thức tỉnh cho kỹ năng nào (đang mang hay không) */
function passiveLinks(run: RunState, passiveId: string): string[] {
  const p = passiveById(passiveId);
  const carried = new Set([...run.skills.filter((s) => s.kind === 'weapon').map((s) => s.id), ...run.loadout]);
  return p.awakens.map((id) => {
    const d = skillById(id);
    const o = run.find(id);
    const state = !carried.has(id) ? 'không mang' : o ? (o.awakened ? 'đã thức tỉnh' : `Cấp ${o.level}/${RUN.maxLevel}`) : 'chưa có';
    return `🔗 Mở thức tỉnh: ${d.name} (${state}) → "${d.awaken.name}"`;
  });
}

/**
 * Sinh thẻ khi lên cấp:
 *  - Kho thẻ = kỹ năng vũ khí + 3 kỹ năng cảnh giới mang theo + mọi bị động.
 *  - Tối đa RUN.maxSkills kỹ năng một màn (vũ khí tính 1). Hết chỗ thì chỉ ra thẻ nâng cấp kỹ năng đã có.
 *  - Đã chọn một kỹ năng cảnh giới: nó và bị động liên kết có tỉ lệ ×3.
 *  - Kỹ năng đạt cấp 5 + có bị động liên kết → lần ra thẻ kế tiếp CHẮC CHẮN có thẻ thức tỉnh.
 *  - Không đủ thẻ hợp lệ thì bù bằng thẻ hồi máu / linh thạch.
 */
export function generateCards(run: RunState): Card[] {
  const cards: Card[] = [];

  // 1. Thẻ thức tỉnh (chắc chắn xuất hiện)
  for (const s of run.skills) {
    if (s.kind === 'passive' || s.awakened || s.level < RUN.maxLevel) continue;
    const def = skillById(s.id);
    if (!run.find(def.passive)) continue;
    cards.push({
      kind: 'awaken', id: s.id, name: def.awaken.name, desc: def.awaken.effect, level: s.level, isNew: false, color: 0xffd700, tag: 'Thức tỉnh',
      links: [`🔗 Điều kiện đã đủ: ${def.name} Cấp ${RUN.maxLevel} + ${passiveById(def.passive).name}`],
      stats: [`Sát thương ${def.awaken.damage}`], awakenIcon: true,
    });
    break; // mỗi lần chỉ một thẻ thức tỉnh
  }

  // 2. Kho ứng viên có trọng số
  interface Cand { card: Card; w: number }
  const cands: Cand[] = [];
  const focusActive = run.lastActive;
  const focusPassive = focusActive ? skillById(focusActive).passive : null;
  const weightOf = (id: string): number => (id === focusActive || id === focusPassive ? RUN.focusWeight : 1);

  const addSkill = (def: SkillDef, kind: 'weapon' | 'active'): void => {
    const own = run.find(def.id);
    const tag = kind === 'weapon' ? 'Vũ khí' : 'Cảnh giới';
    if (own) {
      if (own.level >= RUN.maxLevel) return;
      cands.push({ w: weightOf(def.id), card: { kind, id: def.id, name: def.name, desc: def.type, level: own.level + 1, isNew: false, color: def.color, tag, links: skillLinks(run, def), stats: levelLines(def, own.level + 1), awakenIcon: own.awakened } });
    } else if (run.hasFreeSlot) {
      cands.push({ w: weightOf(def.id), card: { kind, id: def.id, name: def.name, desc: def.desc, level: 1, isNew: true, color: def.color, tag, links: skillLinks(run, def), stats: levelLines(def, 1) } });
    }
  };
  const weapon = run.skills.find((s) => s.kind === 'weapon');
  if (weapon) addSkill(skillById(weapon.id), 'weapon');
  for (const id of run.loadout) addSkill(skillById(id), 'active');
  for (const p of PASSIVES) {
    const own = run.find(p.id);
    if (own) {
      if (own.level >= RUN.maxLevel) continue;
      cands.push({ w: weightOf(p.id), card: { kind: 'passive', id: p.id, name: p.name, desc: p.stat, level: own.level + 1, isNew: false, color: p.color, tag: 'Bị động', links: passiveLinks(run, p.id), stats: [`${p.levels[own.level - 1]} → ${p.levels[own.level]}`] } });
    } else if (run.hasFreeSlot) {
      cands.push({ w: weightOf(p.id), card: { kind: 'passive', id: p.id, name: p.name, desc: p.stat, level: 1, isNew: true, color: p.color, tag: 'Bị động', links: passiveLinks(run, p.id), stats: [p.levels[0]] } });
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
    { kind: 'heal', id: 'heal', name: 'Điều Tức', desc: 'Hồi 35% máu tối đa.', level: 0, isNew: false, color: 0xff7080, tag: 'Phụ', links: [], stats: [] },
    { kind: 'linh', id: 'linh', name: 'Thu Hoạch', desc: 'Nhận ngay một ít linh thạch.', level: 0, isNew: false, color: 0xffd860, tag: 'Phụ', links: [], stats: [] },
  ];
  let fi = 0;
  while (cards.length < RUN.cardChoices) cards.push(fillers[fi++ % fillers.length]);
  return cards;
}
