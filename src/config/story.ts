// =====================================================================
// CỐT TRUYỆN / HỘI THOẠI. Mỗi màn có hội thoại TRƯỚC (pre) và SAU (post) trận.
// Phần lớn là NỘI DUNG MẪU sinh theo mẫu câu + tên boss; riêng màn đầu và màn cuối của mỗi thế giới
// có lời thoại viết riêng. Bạn có thể viết lại thoại bất kỳ màn nào bằng bảng OVERRIDES cuối file.
// =====================================================================

import type { DialogueLine } from './types';
import { stageById, worldById, type StageDef } from './worlds';

const KHAI = 'Cố Trường Ca';
const NARR = 'Dẫn truyện';

// Bối cảnh: Vạn giới từng được soi sáng bởi Quang Ấn. Khi Quang Ấn nứt vỡ, Hôi Khí rò rỉ,
// Vô Quang Tộc trỗi dậy. Cố Trường Ca, kẻ gác đèn cuối cùng của Thanh Hà, đi qua sáu giới để thắp lại ánh sáng.

const WORLD_INTRO: Record<number, DialogueLine[]> = {
  1: [
    { speaker: NARR, text: 'Thanh Hà Cổ Quốc. Quang Ấn nứt vỡ, Hôi Khí theo con sông cổ tràn vào đất liền.' },
    { speaker: KHAI, text: 'Ta là người gác đèn cuối cùng của Thanh Hà. Đèn không thể tắt, dù chỉ còn mình ta.' },
  ],
  2: [
    { speaker: NARR, text: 'Rời Thanh Hà, Trường Ca đặt chân lên Bích Lạc Đại Lục, nơi yêu tộc và ma đạo tranh đoạt các mảnh Quang Ấn.' },
    { speaker: KHAI, text: 'Mỗi mảnh Quang Ấn là một ngọn đèn. Ta sẽ thu đủ chúng về.' },
  ],
  3: [
    { speaker: NARR, text: 'Vượt khỏi đại lục, Trường Ca tiến vào Lưu Quang Tinh Vực, nơi những vì sao đang lần lượt tắt.' },
    { speaker: KHAI, text: 'Giữa tinh không tối dần, ánh sáng duy nhất ta có là ý chí của chính mình.' },
  ],
  4: [
    { speaker: NARR, text: 'Long Hoang Giới mở ra. Long tộc cổ xưa và những chiến sĩ sa đọa đang canh giữ mảnh Quang Ấn kế tiếp.' },
    { speaker: KHAI, text: 'Nơi này mạnh hơn mọi chốn ta từng qua. Nhưng ta cũng không còn là người gác đèn năm xưa.' },
  ],
  5: [
    { speaker: NARR, text: 'Cửu Tiêu Thiên Giới. Hôi Khí đã len tới tận chín tầng trời, ăn mòn cả các bậc tiên quân.' },
    { speaker: KHAI, text: 'Ngay cả người đứng trên cao cũng bị bóng tối nuốt chửng. Ta phải đi nhanh hơn.' },
  ],
  6: [
    { speaker: NARR, text: 'Vô Quang Chiến Địa. Trận chiến cuối cùng giữa vạn giới và Vô Quang Tộc sắp bắt đầu.' },
    { speaker: KHAI, text: 'Mọi ngọn đèn ta đã thắp, mọi người ta đã gặp... đều dẫn tới giờ phút này.' },
  ],
};

const WORLD_OUTRO: Record<number, DialogueLine[]> = {
  1: [
    { speaker: KHAI, text: 'Thanh Hà đã yên. Nhưng Hôi Khí còn thấm sâu hơn thế, phía trước còn cả một đại lục.' },
    { speaker: NARR, text: 'Trường Ca đạt tới Ngự Hư cảnh, mở cánh cổng tới Bích Lạc Đại Lục.' },
  ],
  2: [{ speaker: KHAI, text: 'Bích Lạc đã qua. Phía trước là tinh không bao la.' }],
  3: [{ speaker: KHAI, text: 'Lưu Quang Tinh Vực lại sáng lên. Long Hoang Giới, ta đến đây.' }],
  4: [{ speaker: KHAI, text: 'Long Hoang đã yên. Nhưng Hôi Khí đang bò lên chín tầng trời...' }],
  5: [
    { speaker: NARR, text: 'Vô Quang Vương bị phong ấn đã thức tỉnh. Cánh cổng tới Vô Quang Chiến Địa mở ra.' },
    { speaker: KHAI, text: 'Không cần chờ nữa. Ta sẽ kết thúc tất cả ở đó.' },
  ],
  6: [
    { speaker: NARR, text: 'Hư Tịch ngã xuống. Bóng tối tan đi, ánh sáng trở lại với vạn giới.' },
    { speaker: KHAI, text: 'Ngọn đèn đã được thắp lại. Hành trình gác đèn... đến đây mới thật sự bắt đầu. Thái Sơ đang chờ ta.' },
  ],
};

/** Ghi đè hội thoại cho một màn cụ thể: { w1s3: { pre: [...], post: [...] } } */
const OVERRIDES: Record<string, { pre?: DialogueLine[]; post?: DialogueLine[] }> = {
  w1s5: {
    pre: [
      { speaker: NARR, text: 'Giữa trận, Trường Ca nhặt được một mảnh bản đồ cổ, trên đó đánh dấu các mạch linh khí của Thanh Hà.' },
      { speaker: KHAI, text: 'Có người từng lập trận giữ đèn ở đây. Ta đi đúng đường rồi.' },
    ],
    post: [{ speaker: KHAI, text: 'Mảnh bản đồ này sẽ dẫn ta tới ngọn đèn tiếp theo.' }],
  },
  w1s10: {
    pre: [
      { speaker: NARR, text: 'Trước cổng thành, Tuần Giang Sứ chặn đường, trên người đã nhuốm Hôi Khí.' },
      { speaker: KHAI, text: 'Ông từng giữ sông cho dân Thanh Hà. Tỉnh lại đi!' },
    ],
    post: [{ speaker: KHAI, text: 'Xin lỗi... ta chỉ còn cách này để cứu ông khỏi bóng tối.' }, ...WORLD_OUTRO[1]],
  },
  w2s5: {
    pre: [
      { speaker: NARR, text: 'Hàn Sương Châu lóe lên giữa trận, lạnh buốt tới tận xương.' },
      { speaker: KHAI, text: 'Một mảnh Quang Ấn bị đóng băng... ta phải lấy nó ra.' },
    ],
    post: [{ speaker: KHAI, text: 'Băng tan rồi. Ánh sáng bên trong vẫn còn ấm.' }],
  },
  w2s10: {
    pre: [
      { speaker: NARR, text: 'Cửu U Ma Hoàng ngồi trên ngai xương, tay nắm một mảnh Quang Ấn đã đen đi.' },
      { speaker: KHAI, text: 'Trả mảnh đèn đó lại. Nó không thuộc về ngươi.' },
    ],
    post: [{ speaker: KHAI, text: 'Ma Hoàng đã gục. Bích Lạc đã có thể thở trở lại.' }, ...WORLD_OUTRO[2]],
  },
  w3s5: {
    pre: [
      { speaker: NARR, text: 'Sấm sét nổ vang giữa tinh không, một trái tim lôi đình đập từng nhịp.' },
      { speaker: KHAI, text: 'Sức mạnh này... nếu rơi vào tay Vô Quang Tộc thì không ai cản nổi.' },
    ],
    post: [{ speaker: KHAI, text: 'Trái tim sấm sét đã thuộc về ta.' }],
  },
  w3s10: {
    pre: [
      { speaker: NARR, text: 'Tinh Chủ Huyền Diệu đứng giữa những vì sao đã tắt.' },
      { speaker: KHAI, text: 'Ngươi là người giữ sao, sao lại để chúng tắt hết?' },
    ],
    post: [{ speaker: KHAI, text: 'Các vì sao lại sáng rồi. Cảm ơn ngươi... vì đã tỉnh ở khoảnh khắc cuối.' }, ...WORLD_OUTRO[3]],
  },
  w4s5: {
    pre: [
      { speaker: NARR, text: 'Một cột xương rồng khổng lồ dựng giữa hoang địa, tỏa khí tức thời hoang cổ.' },
      { speaker: KHAI, text: 'Long tộc từng bảo vệ vạn giới. Ta sẽ không để họ bị lãng quên.' },
    ],
    post: [{ speaker: KHAI, text: 'Cột xương này sẽ bảo vệ ta, như đã bảo vệ họ ngày xưa.' }],
  },
  w4s10: {
    pre: [
      { speaker: NARR, text: 'Yêu Thánh Xích Diễm bừng lửa đỏ, ánh mắt đã mất hết lý trí.' },
      { speaker: KHAI, text: 'Ngọn lửa của ngươi từng sưởi ấm cả giới này. Hôm nay ta sẽ dập nó đi.' },
    ],
    post: [{ speaker: KHAI, text: 'Lửa đã tắt. Mong ngươi được an nghỉ.' }, ...WORLD_OUTRO[4]],
  },
  w5s5: {
    pre: [
      { speaker: NARR, text: 'Thất Tinh Tiên Quân bước ra, lệnh bài trên tay vẫn sáng nhưng đôi mắt đã xám đục.' },
      { speaker: KHAI, text: 'Tiên quân, ngài còn nhớ mình từng thề giữ ánh sáng không?' },
    ],
    post: [{ speaker: KHAI, text: 'Lệnh bài này, ta sẽ mang theo thay ngài.' }],
  },
  w5s10: {
    pre: [
      { speaker: NARR, text: 'Kim Tiên Hôi Hóa giữ cổng cuối cùng của Cửu Tiêu, sau lưng là phong ấn Vô Quang Vương.' },
      { speaker: KHAI, text: 'Qua được ngươi là tới chiến địa cuối. Không còn đường lui nữa.' },
    ],
    post: [{ speaker: KHAI, text: 'Phong ấn đang rung chuyển. Hắn sắp tỉnh rồi.' }, ...WORLD_OUTRO[5]],
  },
  w6s5: {
    pre: [
      { speaker: NARR, text: 'Giữa chiến địa tối đen, lõi sức mạnh của Vô Quang Tộc đập như một trái tim.' },
      { speaker: KHAI, text: 'Hủy được nó, Vô Quang Tộc sẽ yếu đi nhiều. Tiến lên!' },
    ],
    post: [{ speaker: KHAI, text: 'Chỉ còn lại kẻ cuối cùng.' }],
  },
  w6s10: {
    pre: [
      { speaker: NARR, text: 'Hư Tịch hiện ra, bóng tối nuốt trọn ánh sáng ở bất cứ nơi nào hắn đi qua.' },
      { speaker: KHAI, text: 'Ngọn đèn cuối cùng. Ta sẽ không để nó tắt!' },
    ],
    post: [...WORLD_OUTRO[6]],
  },
};

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
      { speaker: boss, text: 'Cố Trường Ca! Ngươi dám xông vào đây, hôm nay đừng mong toàn mạng quay về!' },
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
      ? [{ speaker: KHAI, text: `${boss} đã gục ngã. Nhưng con đường phía trước vẫn còn rất dài.` }]
      : [{ speaker: NARR, text: `Trận chiến với ${boss} kết thúc. Trường Ca thu lại khí tức, tiếp tục bước về phía trước.` }];
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
