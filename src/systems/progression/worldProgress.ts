// Mở khóa thế giới / màn chơi và đếm tiến độ.

import { TIERS } from '../../config/realms';
import { ALL_STAGES, WORLDS, worldById, type StageDef } from '../../config/worlds';
import { data } from './save';

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

/** Thế giới cao nhất đã mở (quyết định phẩm cấp đồ luyện khí) */
export function highestWorld(): number {
  let h = 1;
  for (const w of WORLDS) if (isWorldUnlocked(w.id)) h = w.id;
  return h;
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
