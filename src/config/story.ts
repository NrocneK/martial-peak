// =====================================================================
// CỐT TRUYỆN / HỘI THOẠI. Mỗi màn có hội thoại TRƯỚC (pre) và SAU (post) trận.
// Phần lớn là NỘI DUNG MẪU sinh theo mẫu câu + tên boss; riêng màn đầu và màn cuối của mỗi thế giới
// có lời thoại viết riêng. Bạn có thể viết lại thoại bất kỳ màn nào bằng bảng OVERRIDES cuối file.
// =====================================================================

import type { DialogueLine } from './types';
import { stageById, worldById, type StageDef } from './worlds';

const KHAI = 'Dương Khai';
const NARR = 'Dẫn truyện';

const WORLD_INTRO: Record<number, DialogueLine[]> = {
  1: [
    { speaker: NARR, text: 'Trung Đô, nơi tu sĩ tranh đấu, yêu tà hoành hành khắp chốn.' },
    { speaker: KHAI, text: 'Ta bước lên con đường này không phải vì danh lợi. Ta muốn đủ mạnh để bảo vệ những người mình yêu quý.' },
  ],
  2: [
    { speaker: NARR, text: 'Vượt qua Trung Đô, Dương Khai đặt chân lên Thông Huyền Đại Lục rộng lớn, nơi yêu tộc và ma đạo rình rập.' },
    { speaker: KHAI, text: 'Thế giới này lớn hơn ta tưởng. Nhưng càng lớn, càng nhiều người cần được bảo vệ.' },
  ],
  3: [
    { speaker: NARR, text: 'Phá vỡ giới hạn đại lục, Dương Khai vượt tinh không tiến vào Hằng La Tinh Vực.' },
    { speaker: KHAI, text: 'Giữa tinh không vô tận, sức mạnh là thứ duy nhất đảm bảo cho ta đi tiếp.' },
  ],
  4: [
    { speaker: NARR, text: 'Tinh Giới mở ra trước mắt. Long tộc, yêu thánh và những cường giả ma hóa đang chờ đợi.' },
    { speaker: KHAI, text: 'Nơi này mạnh mẽ hơn mọi nơi ta từng đi qua. Nhưng ta cũng không còn là ta của ngày xưa.' },
  ],
  5: [
    { speaker: NARR, text: 'Tam Thiên Thế Giới. Dấu vết của Mặc tộc đã len lỏi khắp nơi, ăn mòn những cường giả mạnh nhất.' },
    { speaker: KHAI, text: 'Mặc khí đang lan rộng. Nếu không ngăn lại, mọi thế giới sẽ chìm trong bóng tối.' },
  ],
  6: [
    { speaker: NARR, text: 'Mặc Chiến Trường. Trận chiến cuối cùng giữa nhân tộc và Mặc tộc sắp bắt đầu.' },
    { speaker: KHAI, text: 'Mọi con đường ta đã đi, mọi người ta đã gặp... đều dẫn tới giờ phút này.' },
  ],
};

const WORLD_OUTRO: Record<number, DialogueLine[]> = {
  1: [
    { speaker: KHAI, text: 'Trung Đô đã yên ổn. Nhưng ta cảm nhận được một thế giới rộng lớn hơn đang chờ phía trước.' },
    { speaker: NARR, text: 'Dương Khai đạt tới Thần Du cảnh đỉnh phong, mở ra cánh cửa tới Thông Huyền Đại Lục.' },
  ],
  2: [
    { speaker: KHAI, text: 'Thông Huyền Đại Lục đã qua. Phía trước là tinh không bao la.' },
  ],
  3: [
    { speaker: KHAI, text: 'Hằng La Tinh Vực đã bị bỏ lại phía sau. Tinh Giới, ta đến đây.' },
  ],
  4: [
    { speaker: KHAI, text: 'Tinh Giới không còn mối đe dọa. Nhưng Mặc khí đang lan khắp Tam Thiên Thế Giới...' },
  ],
  5: [
    { speaker: NARR, text: 'Mặc tộc Vương Chủ bị phong ấn đã tỉnh giấc. Cánh cổng tới Mặc Chiến Trường mở ra.' },
    { speaker: KHAI, text: 'Không cần chờ đợi thêm nữa. Ta sẽ chấm dứt tất cả ở đó.' },
  ],
  6: [
    { speaker: NARR, text: 'Mặc đã bị đánh bại. Bóng tối tan đi, ánh sáng trở lại với muôn ngàn thế giới.' },
    { speaker: KHAI, text: 'Ta đã bảo vệ được những người cần bảo vệ. Hành trình này... đã đi đến đích. Sáng Thế đang chờ ta.' },
  ],
};

/** Ghi đè hội thoại cho một màn cụ thể: { w1s3: { pre: [...], post: [...] } } */
const OVERRIDES: Record<string, { pre?: DialogueLine[]; post?: DialogueLine[] }> = {};

function preLines(stage: StageDef): DialogueLine[] {
  const boss = stage.boss.name;
  const v = (stage.world + stage.index) % 3;
  const lines: DialogueLine[] = [];
  if (stage.index === 0) lines.push(...WORLD_INTRO[stage.world]);
  if (v === 0) {
    lines.push(
      { speaker: NARR, text: `${stage.event}. Khí tức của ${boss} đã bao trùm cả vùng đất.` },
      { speaker: KHAI, text: 'Ta không có đường lui. Vì những người ta muốn bảo vệ, hôm nay phải đánh bại ngươi!' },
    );
  } else if (v === 1) {
    lines.push(
      { speaker: boss, text: 'Dương Khai! Ngươi dám xông vào đây, hôm nay đừng mong toàn mạng quay về!' },
      { speaker: KHAI, text: 'Cứ thử xem. Càng gặp kẻ mạnh, ta càng phải tiến lên.' },
    );
  } else {
    lines.push(
      { speaker: KHAI, text: 'Sức mạnh chỉ có ý nghĩa khi dùng để bảo vệ người khác. Chuẩn bị chiến đấu thôi.' },
      { speaker: boss, text: 'Một con sâu kiến như ngươi cũng đòi cản đường ta?' },
    );
  }
  return lines;
}

function postLines(stage: StageDef): DialogueLine[] {
  const boss = stage.boss.name;
  const lines: DialogueLine[] =
    stage.index % 2 === 0
      ? [{ speaker: KHAI, text: `${boss} đã gục ngã. Nhưng con đường tu luyện vẫn còn rất dài.` }]
      : [{ speaker: NARR, text: `Trận chiến với ${boss} kết thúc. Dương Khai thu lại khí tức, tiếp tục bước về phía trước.` }];
  if (stage.index === 9) lines.push(...WORLD_OUTRO[stage.world]);
  return lines;
}

export function getDialogue(stageId: string, when: 'pre' | 'post'): DialogueLine[] {
  const o = OVERRIDES[stageId]?.[when];
  if (o) return o;
  const stage = stageById(stageId);
  return when === 'pre' ? preLines(stage) : postLines(stage);
}

export function worldNameOf(stage: StageDef): string {
  return worldById(stage.world).name;
}
