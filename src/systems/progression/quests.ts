// =====================================================================
// NHIỆM VỤ
//   - Hằng ngày: tự làm mới khi sang ngày mới (theo giờ máy người chơi). Hoàn thành hết có thưởng thêm.
//   - Chính tuyến: mốc một lần (vượt màn 5 / màn 10 mỗi thế giới, đạt đại cảnh giới mới).
// Thưởng là linh thạch + nguyên liệu, KHÔNG cho tu vi (giữ nguyên độ khó tu luyện ở realms.ts / CULTIVATION).
// Các hành động gọi track(...) để cộng tiến độ nhiệm vụ hằng ngày.
// =====================================================================

import { econScale } from '../../config/balance';
import { TIERS } from '../../config/realms';
import { type MatId } from '../../config/types';
import { WORLDS } from '../../config/worlds';
import { data, fail, ok, save, type DailyKey, type Result } from './save';
export type { DailyKey } from './save';
import { isCleared } from './worldProgress';


export interface QuestReward {
  linh?: number;
  mats?: Partial<Record<MatId, number>>;
}

export interface QuestView {
  id: string;
  name: string;
  desc: string;
  progress: number;
  goal: number;
  done: boolean;
  claimed: boolean;
  reward: QuestReward;
}

const DAILY: { id: string; key: DailyKey; name: string; desc: string; goal: number; reward: (lv: number) => QuestReward }[] = [
  { id: 'd_runs', key: 'runs', name: 'Lịch luyện', desc: 'Tham gia 3 trận lịch luyện (thắng hay thua đều tính).', goal: 3, reward: (lv) => ({ linh: Math.ceil(20 * lv), mats: { herb: 3 } }) },
  { id: 'd_wins', key: 'wins', name: 'Khải hoàn', desc: 'Chiến thắng 2 màn bất kỳ.', goal: 2, reward: (lv) => ({ linh: Math.ceil(25 * lv), mats: { ore: 3 } }) },
  { id: 'd_kills', key: 'kills', name: 'Trừ yêu diệt ma', desc: 'Hạ gục 500 quái.', goal: 500, reward: (lv) => ({ linh: Math.ceil(15 * lv), mats: { core: 2 } }) },
  { id: 'd_alchemy', key: 'alchemy', name: 'Khai lò luyện đan', desc: 'Luyện thành 1 viên đan dược.', goal: 1, reward: () => ({ mats: { herb: 4 } }) },
  { id: 'd_forge', key: 'forge', name: 'Rèn binh khí', desc: 'Luyện khí hoặc cường hóa trang bị 1 lần.', goal: 1, reward: () => ({ mats: { ore: 4 } }) },
  { id: 'd_cultivate', key: 'cultivate', name: 'Tĩnh tọa tu luyện', desc: 'Cắn linh thạch hoặc đột phá 1 lần.', goal: 1, reward: (lv) => ({ linh: Math.ceil(10 * lv) }) },
]
const DAILY_ALL = 'd_all'

/** Mốc chính tuyến dựng từ dữ liệu thế giới / cảnh giới */
interface MainQuest { id: string; name: string; desc: string; check: () => boolean; reward: QuestReward }
const MAIN: MainQuest[] = (() => {
  const list: MainQuest[] = []
  for (const w of WORLDS) {
    const lv = econScale(TIERS.findIndex((t) => t.world === w.id))
    const s5 = w.stages[4], s10 = w.stages[w.stages.length - 1]
    list.push({ id: `m_${s5.id}`, name: `${w.name}: ${s5.event}`, desc: `Vượt màn 5 của ${w.name}.`, check: () => isCleared(s5.id), reward: { linh: Math.ceil(60 * lv), mats: { herb: 6, ore: 6 } } })
    list.push({ id: `m_${s10.id}`, name: `${w.name}: ${s10.event}`, desc: `Đánh bại boss cuối ${w.name}.`, check: () => isCleared(s10.id), reward: { linh: Math.ceil(150 * lv), mats: { core: 6, ore: 8, essence: 1 } } })
  }
  // mỗi đại cảnh giới (bậc Sơ kỳ / Đạo Tổ) là một mốc
  TIERS.forEach((t, i) => {
    if (i === 0 || TIERS[i - 1].group === t.group) return
    const lv = econScale(i)
    list.push({ id: `m_realm_${i}`, name: `Đột phá ${t.group}`, desc: `Đạt cảnh giới ${t.name}.`, check: () => data.tier >= i, reward: { linh: Math.ceil(40 * lv), mats: { herb: 5, core: 3 } } })
  })
  return list
})()

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Sang ngày mới thì làm mới tiến độ hằng ngày */
function ensureDay(): void {
  const t = today()
  if (data.quests.day !== t) {
    data.quests.day = t
    data.quests.daily = {}
    data.quests.dailyClaimed = []
  }
}

/** Cộng tiến độ nhiệm vụ hằng ngày (gọi từ các hành động; save() do nơi gọi đảm nhiệm) */
export function track(key: DailyKey, n = 1): void {
  ensureDay()
  data.quests.daily[key] = (data.quests.daily[key] ?? 0) + n
}

const level = (): number => econScale(data.tier)

export function dailyQuests(): QuestView[] {
  ensureDay()
  const q = data.quests
  const views: QuestView[] = DAILY.map((d) => {
    const progress = Math.min(d.goal, q.daily[d.key] ?? 0)
    return { id: d.id, name: d.name, desc: d.desc, progress, goal: d.goal, done: progress >= d.goal, claimed: q.dailyClaimed.includes(d.id), reward: d.reward(level()) }
  })
  const n = views.filter((v) => v.done).length
  views.push({ id: DAILY_ALL, name: 'Chăm chỉ tu hành', desc: 'Hoàn thành tất cả nhiệm vụ hằng ngày.', progress: n, goal: DAILY.length, done: n >= DAILY.length, claimed: q.dailyClaimed.includes(DAILY_ALL), reward: { mats: { essence: 1, core: 2 } } })
  return views
}

/** Nhiệm vụ chính tuyến: hiện các mốc đã đạt chưa nhận + vài mốc kế tiếp chưa đạt */
export function mainQuests(limit = 4): QuestView[] {
  const claimed = data.quests.mainClaimed
  const views = MAIN.filter((m) => !claimed.includes(m.id)).map((m) => {
    const done = m.check()
    return { id: m.id, name: m.name, desc: m.desc, progress: done ? 1 : 0, goal: 1, done, claimed: false, reward: m.reward }
  })
  const ready = views.filter((v) => v.done)
  return [...ready, ...views.filter((v) => !v.done).slice(0, limit)]
}

export function mainQuestCount(): { claimed: number; total: number } {
  return { claimed: data.quests.mainClaimed.length, total: MAIN.length }
}

/** Số nhiệm vụ đã hoàn thành chờ nhận thưởng (hiện chấm đỏ ở thanh dưới) */
export function claimableQuests(): number {
  return dailyQuests().filter((v) => v.done && !v.claimed).length + mainQuests(0).filter((v) => v.done).length
}

export function rewardText(r: QuestReward): string {
  const names: Record<MatId, string> = { herb: 'thảo dược', core: 'yêu đan', ore: 'khoáng thạch', essence: 'tinh hoa' }
  const parts: string[] = []
  if (r.linh) parts.push(`${r.linh} linh thạch`)
  for (const [k, v] of Object.entries(r.mats ?? {})) if (v) parts.push(`${v} ${names[k as MatId]}`)
  return parts.join(', ')
}

export function claimQuest(id: string): Result {
  const v = [...dailyQuests(), ...mainQuests(MAIN.length)].find((x) => x.id === id)
  if (!v) return fail('Không tìm thấy nhiệm vụ.')
  if (v.claimed) return fail('Đã nhận thưởng nhiệm vụ này.')
  if (!v.done) return fail('Nhiệm vụ chưa hoàn thành.')
  if (id.startsWith('d_')) data.quests.dailyClaimed.push(id)
  else data.quests.mainClaimed.push(id)
  data.linh += v.reward.linh ?? 0
  for (const [k, n] of Object.entries(v.reward.mats ?? {})) data.mats[k as MatId] += n ?? 0
  save()
  return ok(`Nhận thưởng: ${rewardText(v.reward)}.`)
}
