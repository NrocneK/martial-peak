// =====================================================================
// CỐT TRUYỆN / HỘI THOẠI. Mỗi màn có hội thoại TRƯỚC (pre) và SAU (post) trận.
// Phần lớn là NỘI DUNG MẪU sinh theo mẫu câu + tên boss; riêng màn đầu và màn cuối của mỗi thế giới
// có lời thoại viết riêng. Bạn có thể viết lại thoại bất kỳ màn nào bằng bảng OVERRIDES cuối file.
// =====================================================================

import type { DialogueLine } from './types';
import { stageById, worldById, type StageDef } from './worlds';

const KHAI = 'Cố Trường Ca';
const NARR = 'Dẫn truyện';

// ---------------------------------------------------------------------
// BỐI CẢNH
//  - Khởi đầu: Cố Trường Ca, thiếu niên xuất thân bình thường, gia nhập tiểu tông môn Vân Hạc Tông.
//  - Phát triển: tranh đoạt tài nguyên, bí cảnh, truyền thừa, đại hội tông môn, chính - ma, yêu tộc, các thế lực cổ xưa.
//  - Trung kỳ: phi thăng lên thế giới cao hơn, phát hiện cuộc chiến ở hạ giới chỉ là một phần âm mưu của tiên giới:
//    con đường tu luyện là một "Đại Đạo Lô" nuôi dưỡng người tu để thu hoạch đạo quả.
//  - Cuối game: đối đầu các cường giả đỉnh cao, biết nguồn gốc con đường tu luyện, bước tới cảnh giới Đạo Tổ.
// ---------------------------------------------------------------------

const WORLD_INTRO: Record<number, DialogueLine[]> = {
  1: [
    { speaker: NARR, text: 'Thanh Vân Đại Lục. Một thiếu niên bình thường tên Cố Trường Ca được nhận vào Vân Hạc Tông, một tiểu tông môn ít ai biết tới.' },
    { speaker: KHAI, text: 'Không gia thế, không thiên phú. Nhưng ta sẽ đi đến cùng con đường này.' },
  ],
  2: [
    { speaker: NARR, text: 'Phi thăng khỏi Thanh Vân, Trường Ca đặt chân đến Thương Lan Giới, nơi biển cả và các đại tông môn tranh giành tài nguyên.' },
    { speaker: KHAI, text: 'Thế giới này lớn hơn ta tưởng. Cũng nguy hiểm hơn nhiều.' },
  ],
  3: [
    { speaker: NARR, text: 'Thiên Huyền Tinh Vực. Giữa tinh không, sứ giả tiên giới lần đầu lộ diện, và ánh mắt họ nhìn người tu hành không giống ánh mắt nhìn đồng đạo.' },
    { speaker: KHAI, text: 'Cuộc chiến ở hạ giới... hình như chỉ là một phần của thứ gì đó lớn hơn.' },
  ],
  4: [
    { speaker: NARR, text: 'Cửu Thiên Tiên Giới huy hoàng như truyền thuyết, nhưng dưới lớp mây vàng là những chấp pháp sứ lạnh lùng và những cánh cổng thu hoạch.' },
    { speaker: KHAI, text: 'Phi thăng không phải phần thưởng. Nó là một cái lồng.' },
  ],
  5: [
    { speaker: NARR, text: 'Thượng Cổ Tiên Vực, di tích của thời đại đầu tiên. Những tấm bia đá còn nguyên lời ghi chép về người đã dựng nên con đường tu luyện.' },
    { speaker: KHAI, text: 'Sự thật nằm ở đây. Ta phải đọc cho hết.' },
  ],
  6: [
    { speaker: NARR, text: 'Hỗn Độn Thần Vực, nơi khởi nguyên của Đại Đạo. Chỉ còn lại Trường Ca và kẻ đã dựng nên Đại Đạo Lô.' },
    { speaker: KHAI, text: 'Ta đi một mạch từ một tiểu tông môn tới đây. Hôm nay ta sẽ tự quyết con đường của mình.' },
  ],
};

const WORLD_OUTRO: Record<number, DialogueLine[]> = {
  1: [
    { speaker: KHAI, text: 'Huyết Ma Lão Tổ đã bị diệt. Thanh Vân tạm yên, nhưng sư phụ nói ta đã đến giới hạn của vùng đất này.' },
    { speaker: NARR, text: 'Trường Ca đạt Kim Đan Viên mãn, bước vào kiếp nạn phi thăng đầu tiên.' },
  ],
  2: [{ speaker: KHAI, text: 'Hải Hoàng nói trước khi chết: kẻ phi thăng đều bị theo dõi. Ta phải tìm hiểu xem ai đang theo dõi.' }],
  3: [{ speaker: KHAI, text: 'Tinh Chủ để lại một mảnh hạch tinh chứa ký ức: tiên giới đang thu hoạch đạo quả của người phi thăng.' }],
  4: [{ speaker: KHAI, text: 'Cửu Thiên Điện chủ cũng chỉ là một con tốt. Kẻ đứng sau còn nằm ở thời đại xa hơn nữa.' }],
  5: [
    { speaker: NARR, text: 'Tiên Đế Vĩnh Dạ gục ngã, để lại bia đá cuối cùng chỉ về Hỗn Độn Thần Vực, nơi Đại Đạo bắt đầu.' },
    { speaker: KHAI, text: 'Đã đến lúc biết rõ ai đã dựng nên con đường này.' },
  ],
  6: [
    { speaker: NARR, text: 'Thái Hư Đạo Tổ tan biến. Đại Đạo Lô ngừng quay, vòng thu hoạch kéo dài vô số kỷ nguyên cuối cùng cũng chấm dứt.' },
    { speaker: KHAI, text: 'Ta không thay hắn ngồi lên ngai. Con đường tu luyện từ nay thuộc về chính những người bước đi trên nó.' },
  ],
};

/** Ghi đè hội thoại cho một màn cụ thể: { w1s3: { pre: [...], post: [...] } } */
const OVERRIDES: Record<string, { pre?: DialogueLine[]; post?: DialogueLine[] }> = {
  w1s5: {
    pre: [
      { speaker: NARR, text: 'Bí cảnh Thanh Vân mở ra. Các tông môn lớn nhỏ đổ về tranh đoạt truyền thừa, tiểu tông môn như Vân Hạc Tông chỉ dám đứng ngoài cùng.' },
      { speaker: KHAI, text: 'Cơ hội của kẻ yếu đến rất hiếm. Ta không định bỏ lỡ.' },
    ],
    post: [{ speaker: KHAI, text: 'La bàn trong bí cảnh... có lẽ nó sẽ dẫn ta tới nơi cần đến.' }],
  },
  w1s10: {
    pre: [
      { speaker: NARR, text: 'Tại đại hội tông môn, Huyết Ma Lão Tổ lộ mặt, bao trùm cả đấu trường bằng ma khí.' },
      { speaker: KHAI, text: 'Chính ma đối đầu, nhưng hôm nay ta không còn đứng ngoài cùng nữa.' },
    ],
    post: [...WORLD_OUTRO[1]],
  },
  w2s5: {
    pre: [
      { speaker: NARR, text: 'Dưới đáy Thương Lan có một bí cảnh cổ. Ma Tôn Cửu U cũng đang truy tìm thứ nằm bên trong.' },
      { speaker: KHAI, text: 'Nếu hắn lấy được trước, cả giới này sẽ gặp họa.' },
    ],
    post: [{ speaker: KHAI, text: 'Viên châu lạnh buốt này... mang theo ký ức của người từng bị đem ra làm vật tế.' }],
  },
  w2s10: {
    pre: [
      { speaker: NARR, text: 'Thương Lan Hải Hoàng chặn cửa ải cuối cùng. Trên người hắn có dấu ấn lạ không phải của hải tộc.' },
      { speaker: KHAI, text: 'Ai đã gieo dấu ấn đó lên người ngươi?' },
    ],
    post: [...WORLD_OUTRO[2]],
  },
  w3s5: {
    pre: [
      { speaker: NARR, text: 'Giữa tinh không, một tinh lôi vạn năm gầm thét. Các tông môn Thiên Huyền đều đang chạy đua giành lấy lõi sấm sét.' },
      { speaker: KHAI, text: 'Giành bảo vật thì ta chịu. Nhưng nếu ai đó muốn lấy mạng ta thì họ phải trả giá.' },
    ],
    post: [{ speaker: KHAI, text: 'Sức mạnh này không phải của ta, ta chỉ mượn nó để tiến tiếp.' }],
  },
  w3s10: {
    pre: [
      { speaker: NARR, text: 'Tinh Chủ Thiên Huyền là kẻ phản bội cả tinh vực để làm tay sai cho tiên giới.' },
      { speaker: KHAI, text: 'Nói cho ta biết, tiên giới thật sự muốn gì ở người phi thăng?' },
    ],
    post: [...WORLD_OUTRO[3]],
  },
  w4s5: {
    pre: [
      { speaker: NARR, text: 'Kho giáp của thiên binh Cửu Thiên bị bỏ ngỏ trong một cuộc nội chiến giữa các điện chủ.' },
      { speaker: KHAI, text: 'Tiên giới cũng chia bè phái. Có lẽ ta tận dụng được điều đó.' },
    ],
    post: [{ speaker: KHAI, text: 'Giáp tiên binh rất nhẹ, như thể được tạo ra để vứt bỏ.' }],
  },
  w4s10: {
    pre: [
      { speaker: NARR, text: 'Cửu Thiên Điện Chủ ngồi trên ngai ngọc, tay nắm dây của hàng nghìn người đang bị thu hoạch.' },
      { speaker: KHAI, text: 'Thả họ ra. Hoặc ta sẽ phá nát cánh cổng đó cùng ngươi.' },
    ],
    post: [...WORLD_OUTRO[4]],
  },
  w5s5: {
    pre: [
      { speaker: NARR, text: 'Trong tàn tích thượng cổ, một vị Tiên Vương cuối cùng còn tỉnh táo đang chờ Trường Ca.' },
      { speaker: KHAI, text: 'Ngài biết mọi thứ. Ngài có chịu nói không?' },
    ],
    post: [{ speaker: KHAI, text: 'Lệnh bài này là chứng cứ. Mọi người cần biết sự thật.' }],
  },
  w5s10: {
    pre: [
      { speaker: NARR, text: 'Tiên Đế Vĩnh Dạ trấn giữ cổng dẫn tới Hỗn Độn Thần Vực, hắn là người cuối cùng còn biết toàn bộ bí mật.' },
      { speaker: KHAI, text: 'Ngươi cũng chỉ là một mắt xích. Nhưng hôm nay ta sẽ phá vỡ nó.' },
    ],
    post: [...WORLD_OUTRO[5]],
  },
  w6s5: {
    pre: [
      { speaker: NARR, text: 'Đại Đạo Lô hiện ra: một lò khổng lồ nuốt vô số đạo quả. Chấp hành giả canh giữ nó từ thuở khai thiên.' },
      { speaker: KHAI, text: 'Đây là nơi tất cả đều dẫn tới. Cả con đường của ta cũng vậy.' },
    ],
    post: [{ speaker: KHAI, text: 'Lõi lò đã vỡ. Giờ chỉ còn kẻ đã dựng nên nó.' }],
  },
  w6s10: {
    pre: [
      { speaker: NARR, text: 'Thái Hư Đạo Tổ xuất hiện: kẻ đã tự biến mình thành Đạo Tổ bằng cách nuốt đạo quả của vô số người.' },
      { speaker: KHAI, text: 'Ngươi nói con đường này là ban phước. Hãy để ta xem nó ban cho ngươi những gì.' },
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
