import { RUN } from '../config/balance';
import { activeById } from '../config/activeSkills';
import { weaponById } from '../config/weapons';
import { PASSIVES, passiveById, passiveValueText } from '../config/passiveSkills';
import type { RunState } from './RunState';
import type { SkillDef } from '../config/types';
import type { PlayerStats } from '../config/game';
import { resolveSkill, type Resolved } from './SkillSystem';

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
  /** Số liệu thay đổi khi chọn thẻ, ví dụ "Sát thương 28 → 36" */
  stats: string[];
}

const fmtN = (v: number): string => (v >= 100 ? Math.round(v).toString() : v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, ''));
const fmtS = (v: number): string => v.toFixed(2).replace(/0$/, '').replace(/\.0$/, '') + ' giây';

/** Nhãn số lượng theo kiểu kỹ năng */
function countLabel(def: SkillDef): string {
  switch (def.kind) {
    case 'orbit': return 'Số kiếm';
    case 'strike': return 'Số điểm giáng';
    case 'chain': return 'Số lần nảy';
    case 'rain': return 'Số kiếm giáng';
    case 'tornado': return 'Số lốc xoáy';
    case 'slash': return 'Số nhát chém';
    case 'beam': return 'Số tia';
    default: return 'Số lượng';
  }
}

/**
 * Dòng số liệu cho thẻ: so sánh trước (a, null = chưa có) → sau (b).
 * Thẻ mới: liệt kê số liệu cấp 1. Thẻ nâng cấp / thức tỉnh: chỉ các dòng thay đổi (sát thương luôn hiện).
 */
function statLines(def: SkillDef, a: Resolved | null, b: Resolved): string[] {
  const rows: [string, number | undefined, number, (v: number) => string][] = [];
  const heal = def.kind === 'heal';
  const pct = (v: number) => `${fmtN(v * 100)}% máu`;
  rows.push([heal ? 'Hồi máu' : 'Sát thương', a?.damage, b.damage, heal ? pct : fmtN]);
  if (def.kind !== 'nova' && def.kind !== 'aura' && def.kind !== 'heal') rows.push([countLabel(def), a?.count, b.count, (v) => String(v)]);
  rows.push([def.kind === 'orbit' || def.kind === 'aura' ? 'Nhịp đánh' : 'Hồi chiêu', a?.cooldown, b.cooldown, fmtS]);
  if (b.area > 0 && def.kind !== 'heal' && def.kind !== 'projectile') rows.push([def.kind === 'beam' ? 'Chiều dài' : def.kind === 'tornado' || def.kind === 'boomerang' ? 'Tầm bay' : 'Phạm vi', a?.area, b.area, fmtN]);
  if (b.pierce > 0 && b.pierce < 99) rows.push(['Xuyên quái', a?.pierce, b.pierce, (v) => String(v)]);
  if (b.slow > 0) rows.push([b.slow >= 1 ? 'Khống chế' : 'Làm chậm', a?.slowTime, b.slowTime, (v) => `${fmtN(v)} giây`]);
  const out: string[] = [];
  for (const [label, x, y, f] of rows) {
    if (x === undefined) out.push(`${label}: ${f(y)}`);
    else if (f(x) !== f(y) || label === 'Sát thương' || label === 'Hồi máu') out.push(`${label}: ${f(x)} → ${f(y)}`);
  }
  return out;
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
 *  - Tối đa RUN.maxSkills (7) kỹ năng một màn (vũ khí tính 1). Hết chỗ thì chỉ ra thẻ nâng cấp kỹ năng đã có.
 *  - Nếu đã chọn một kỹ năng chủ động: nó và bị động liên kết có tỉ lệ ×3.
 *  - Kỹ năng chủ động đạt cấp 5 + đã có bị động liên kết (bất kỳ cấp) → lần ra thẻ kế tiếp CHẮC CHẮN có thẻ thức tỉnh.
 *  - Không đủ thẻ hợp lệ thì bù bằng thẻ hồi máu / linh thạch.
 */
export function generateCards(run: RunState): Card[] {
  const cards: Card[] = [];
  const st: PlayerStats = run.recompute();
  const rs = (def: SkillDef, lv: number, aw: boolean): Resolved => resolveSkill(def, lv, aw, st);

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
      stats: statLines(def, rs(def, s.level, false), rs(def, s.level, true)),
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
        card: {
          kind, id: def.id, name: def.name, desc: def.desc, level: own.level + 1, isNew: false, color: def.color, tag: kind === 'weapon' ? 'Vũ khí' : 'Chủ động',
          links: skillLinks(run, def), stats: statLines(def, rs(def, own.level, own.awakened), rs(def, own.level + 1, own.awakened)),
        },
      });
    } else if (run.hasFreeSlot) {
      cands.push({
        w: weightOf(def.id),
        card: {
          kind, id: def.id, name: def.name, desc: def.desc, level: 1, isNew: true, color: def.color, tag: kind === 'weapon' ? 'Vũ khí' : 'Chủ động',
          links: skillLinks(run, def), stats: statLines(def, null, rs(def, 1, false)),
        },
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
        card: {
          kind: 'passive', id: p.id, name: p.name, desc: p.desc, level: own.level + 1, isNew: false, color: p.color, tag: 'Bị động',
          links: passiveLinks(run, p.id), stats: [`${passiveValueText(p, own.level)} → ${passiveValueText(p, own.level + 1)}`],
        },
      });
    } else if (run.hasFreeSlot) {
      cands.push({
        w: weightOf(p.id),
        card: {
          kind: 'passive', id: p.id, name: p.name, desc: p.desc, level: 1, isNew: true, color: p.color, tag: 'Bị động',
          links: passiveLinks(run, p.id), stats: [passiveValueText(p, 1)],
        },
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
    { kind: 'heal', id: 'heal', name: 'Điều Tức', desc: 'Hồi 35% máu tối đa.', level: 0, isNew: false, color: 0xff7080, tag: 'Phụ', links: [], stats: [] },
    { kind: 'linh', id: 'linh', name: 'Thu Hoạch', desc: 'Nhận ngay một ít linh thạch.', level: 0, isNew: false, color: 0xffd860, tag: 'Phụ', links: [], stats: [] },
  ];
  let fi = 0;
  while (cards.length < RUN.cardChoices) cards.push(fillers[fi++ % fillers.length]);
  return cards;
}

