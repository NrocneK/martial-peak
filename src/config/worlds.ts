// =====================================================================
// 6 TẦNG THẾ GIỚI × 10 MÀN. Mỗi màn là một mốc sự kiện đánh nhau lớn trong thế giới đó.
// Danh sách màn được dựng tự động từ danh sách boss (bosses.ts): boss chính của bạn được rải đều
// trong 10 màn (boss cuối danh sách luôn ở màn 10), các màn còn lại là boss phụ.
// =====================================================================

import { stageDuration } from './balance';
import { FILLER_BOSSES, MAIN_BOSSES, makeBoss, type BossDef } from './bosses';
import { WORLD_COLORS } from './enemies';
import { CULTIVATION, TIERS, WORLD_FIRST_TIER, WORLD_LAST_TIER } from './realms';
import { econScale } from './balance';

export const STAGES_PER_WORLD = 10;
/** Tổng trọng số thưởng tu vi của 10 màn: Σ (1 + 0.06·i), i = 0..9 */
const STAGE_WEIGHT_SUM = Array.from({ length: STAGES_PER_WORLD }, (_, i) => 1 + 0.06 * i).reduce((a, b) => a + b, 0);

export interface StageDef {
  /** Ví dụ "w1s5" */
  id: string;
  world: number;
  /** 0..9 */
  index: number;
  /** Tên hiển thị, ví dụ "Màn 5" */
  name: string;
  /** Tên sự kiện */
  event: string;
  boss: BossDef;
  duration: number;
  /** Màn cố định (5 và 10): thưởng bí bảo lần đầu */
  fixed: boolean;
  bibaoId?: string;
  reward: { tuVi: number; linh: number; herb: number; core: number; ore: number };
}

export interface WorldDef {
  id: number;
  name: string;
  desc: string;
  color: number;
  /** Điều kiện vào: cảnh giới tối thiểu + phải qua hết màn của thế giới trước (hoặc chỉ boss cuối) */
  gate: { tier: number; needAll: boolean; needFinalOnly: boolean };
  stages: StageDef[];
}

const WORLD_INFO: { name: string; desc: string }[] = [
  { name: '', desc: '' },
  { name: 'Thanh Vân Đại Lục', desc: 'Nơi thiếu niên bình thường bước vào con đường tu luyện: tiểu tông môn, bí cảnh, truyền thừa, đại hội tông môn, chính ma đối đầu và yêu tộc quấy phá.' },
  { name: 'Thương Lan Giới', desc: 'Giới vực biển cả bao la, nơi các đại tông môn, ma đạo và hải tộc tranh giành tài nguyên. Nơi đầu tiên Trường Ca thấy dấu vết của một âm mưu lớn.' },
  { name: 'Thiên Huyền Tinh Vực', desc: 'Tinh vực giữa vô tận tinh không. Sứ giả tiên giới xuất hiện, hé lộ cuộc chiến ở hạ giới chỉ là một phần của ván cờ lớn.' },
  { name: 'Cửu Thiên Tiên Giới', desc: 'Tiên giới huy hoàng bên ngoài, mục ruỗng bên trong. Các thế lực tiên giới đang thu hoạch đạo quả của người phi thăng.' },
  { name: 'Thượng Cổ Tiên Vực', desc: 'Di tích của thời đại thượng cổ, nơi lưu giữ sự thật về nguồn gốc con đường tu luyện.' },
  { name: 'Hỗn Độn Thần Vực', desc: 'Nơi khởi nguyên của Đại Đạo, chiến trường cuối cùng giữa Trường Ca và kẻ đã dựng nên con đường tu luyện.' },
];

/** Điều kiện vào thế giới n (chỉ số 1..6). Thế giới 5 → 6 chỉ cần giết boss cuối thế giới 5. */
const GATES: { tier: number; needAll: boolean; needFinalOnly: boolean }[] = [
  { tier: 0, needAll: false, needFinalOnly: false },
  { tier: 0, needAll: false, needFinalOnly: false }, // 1
  { tier: 11, needAll: true, needFinalOnly: false }, // 2: Kim Đan Hậu kỳ + qua hết thế giới 1
  { tier: 20, needAll: true, needFinalOnly: false }, // 3: Luyện Hư Hậu kỳ
  { tier: 29, needAll: true, needFinalOnly: false }, // 4: Độ Kiếp Hậu kỳ
  { tier: 38, needAll: true, needFinalOnly: false }, // 5: Huyền Tiên Hậu kỳ
  { tier: 0, needAll: false, needFinalOnly: true }, // 6: không giới hạn cảnh giới
];

/** Tổng tu vi cần để leo hết các bậc của một thế giới: dùng để chia phần thưởng tu vi cho các màn */
function worldTuViSum(w: number): number {
  const a = Math.max(1, WORLD_FIRST_TIER[w]);
  const b = WORLD_LAST_TIER[w];
  return Math.max(1, TIERS[b].cumTuVi - TIERS[a - 1].cumTuVi);
}

function buildWorld(w: number): WorldDef {
  const mains = MAIN_BOSSES[w];
  const fillers = FILLER_BOSSES[w];
  // Vị trí (0..9) của từng boss chính: round((j+1) * 10 / n) - 1 → boss cuối ở màn 10
  const mainAt = new Map<number, string>();
  mains.forEach((name, j) => mainAt.set(Math.round(((j + 1) * STAGES_PER_WORLD) / mains.length) - 1, name));

  let fi = 0;
  const stages: StageDef[] = [];
  for (let i = 0; i < STAGES_PER_WORLD; i++) {
    const id = `w${w}s${i + 1}`;
    const mainName = mainAt.get(i);
    const final = i === STAGES_PER_WORLD - 1;
    const bossName = mainName ?? fillers[fi++ % fillers.length];
    const boss = makeBoss(w, bossName, `boss_${id}`, !!mainName, final);
    const fixed = i === 4 || final;
    const first = WORLD_FIRST_TIER[w];
    // Màn sau thưởng nhiều hơn màn trước; tổng 10 màn (lần đầu) = firstClearShare × tu vi cần cho cả thế giới
    const tuVi = Math.round((CULTIVATION.firstClearShare * worldTuViSum(w) * (1 + 0.06 * i)) / STAGE_WEIGHT_SUM);
    stages.push({
      id,
      world: w,
      index: i,
      name: `Màn ${i + 1}`,
      event: mainName ? `Đại chiến: ${bossName}` : `Truy quét: ${bossName}`,
      boss,
      duration: stageDuration(i),
      fixed,
      bibaoId: fixed ? `bb_w${w}_${i + 1}` : undefined,
      reward: {
        tuVi,
        linh: Math.round(econScale(first) * (10 + 2 * i)),
        herb: 4 + Math.floor(i / 2),
        core: 1 + (mainName ? 1 : 0) + (final ? 3 : 0),
        ore: 3 + Math.floor(i / 3),
      },
    });
  }
  return {
    id: w,
    name: WORLD_INFO[w].name,
    desc: WORLD_INFO[w].desc,
    color: WORLD_COLORS[w],
    gate: GATES[w],
    stages,
  };
}

export const WORLDS: WorldDef[] = [1, 2, 3, 4, 5, 6].map(buildWorld);
export const ALL_STAGES: StageDef[] = WORLDS.flatMap((w) => w.stages);

const STAGE_BY_ID = new Map(ALL_STAGES.map((s) => [s.id, s]));
export function stageById(id: string): StageDef {
  const s = STAGE_BY_ID.get(id);
  if (!s) throw new Error('Không có màn ' + id);
  return s;
}

export function worldById(id: number): WorldDef {
  return WORLDS[id - 1];
}
