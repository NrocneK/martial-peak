# Game Design Document (GDD) — Võ Luyện Survival (tên tạm)

> Phiên bản: 0.2 (đã chốt các giả định, sẵn sàng làm Giai đoạn 1). Mọi con số trong tài liệu là **giá trị khởi điểm**, sẽ nằm trong file cấu hình để chỉnh sau.
> Các điểm từng là giả định đã được bạn xác nhận ở mục 14.

---

## 1. Ý tưởng cốt lõi

Roguelike survival chạy trên trình duyệt, phong cách **Vampire Survivors**: nhân vật tự động tấn công, người chơi chỉ lo **di chuyển và né**. Giết quái rơi XP, lên cấp thì chọn 1 trong 3 thẻ kỹ năng. Mỗi lượt chơi (run) ngẫu nhiên; chết thì làm lại.

Điểm khác biệt:
- Bối cảnh **võ hiệp / tiên hiệp** theo hành trình của **Dương Khai** qua 6 tầng thế giới (cảm hứng từ Võ Luyện Đỉnh Phong).
- Tiến trình vĩnh viễn kiểu tu tiên: **tu vi, cảnh giới, linh thạch, luyện đan, luyện khí, trang bị 5 ô**.
- Hệ thống kỹ năng 3 nhóm liên kết nhau, có **thức tỉnh** kỹ năng chủ động.

Tông game: dark fantasy u tối nhưng vẫn vui mắt. Góc nhìn: 2D top-down, map lặp vô hạn, camera theo nhân vật.

**Ba trụ cột thiết kế**
1. Mỗi lượt chơi phải tạo ra một "build" khác nhau (thẻ ngẫu nhiên + tỷ lệ ưu tiên theo kỹ năng đã chọn).
2. Càng chơi càng mạnh: tiến trình vĩnh viễn rõ ràng, thấy được mục tiêu đến end game.
3. Cốt truyện đi cùng gameplay: mỗi màn là một sự kiện đại chiến trong hành trình của Dương Khai.

---

## 2. Bối cảnh và cốt truyện

Nhân vật chính: **Dương Khai** (1 nhân vật duy nhất, không phân lớp). Cốt truyện đi theo cuộc đời anh ta, thể hiện bằng **hội thoại ngắn trước/sau màn** (dữ liệu hội thoại nằm trong file riêng, thêm truyện = thêm dữ liệu).

Động lực: tăng tiến sức mạnh, chống lại cái ác, bảo vệ mọi người.

### 6 tầng thế giới

| # | Thế giới | Cảnh giới của thế giới | Kẻ thù chính (dự kiến) |
|---|---|---|---|
| 1 | Trung Đô | Thối Thể, Khai Nguyên, Khí Động, Ly Hợp, Chân Nguyên, Thần Du | Yêu thú, tà tu, sơn tặc |
| 2 | Thông Huyền Đại Lục | Siêu Phàm, Nhập Thánh | Yêu tộc, ma tu |
| 3 | Hằng La Tinh Vực | Thánh Vương, Phản Hư, Hư Vương | Tu sĩ ngoại vực, thú tinh không |
| 4 | Tinh Giới | Đạo Nguyên, Đế Tôn | Sinh vật tinh giới, cường giả tà đạo |
| 5 | Tam Thiên Thế Giới | Khai Thiên (9 phẩm) | Đại năng các thế giới |
| 6 | Mặc Chiến Trường | Sáng Thế | Mặc tộc |

Mỗi **màn** trong một thế giới = một mốc **sự kiện đánh nhau lớn** của thế giới đó. Cần **vượt tất cả màn** và **đạt cảnh giới yêu cầu** mới sang thế giới kế tiếp.

---

## 3. Vòng lặp gameplay

### 3.1 Vòng lặp trong một màn (run, ~10-15 phút)
```
Vào màn (mang vũ khí + 3 kỹ năng chủ động) → di chuyển & né → kỹ năng tự động bắn
→ quái chết rơi XP và linh thạch → nhặt XP → lên cấp → chọn 1/3 thẻ
→ quái ngày càng đông và mạnh → hết giờ thì boss xuất hiện → giết boss = qua màn
(chết = mất phần lớn phần thưởng, quay về làng/động phủ)
```

### 3.2 Vòng lặp ngoài màn (meta)
```
Qua màn → nhận tu vi + linh thạch + vật liệu → tăng cảnh giới / mua tu vi / luyện đan / luyện khí
→ mạnh hơn → qua màn khó hơn → mở khóa thế giới mới
```

**Phần thưởng khi chết:** giữ lại **30%** linh thạch nhặt được trong màn và không nhận tu vi của màn. Con số để trong config.

---

## 4. Nhân vật

Chỉ số cơ bản (mỗi chỉ số có giá trị gốc, cộng thêm theo cảnh giới, trang bị, đan dược, thẻ bị động):

| Chỉ số | Ý nghĩa |
|---|---|
| HP | Máu tối đa |
| Tốc độ di chuyển | Pixel/giây |
| Sát thương | Hệ số nhân sát thương của mọi kỹ năng |
| Tốc độ đánh | Rút ngắn thời gian hồi của kỹ năng |
| Phạm vi nhặt XP | Bán kính hút hạt XP |
| Giáp | Giảm sát thương nhận vào (công thức: `giảm = giáp / (giáp + 100)`, chỉnh được) |

Chỉ số **XP trong màn độc lập với tu vi cảnh giới** (XP chỉ để lên cấp trong màn, tu vi dùng để tăng cảnh giới).

---

## 5. Hệ thống kỹ năng

### 5.1 Ba nhóm kỹ năng

| Nhóm | Đặc điểm |
|---|---|
| **Kỹ năng vũ khí** | Mỗi loại vũ khí có 1 kỹ năng riêng, là đòn đánh thường **tự động thi triển**. Vũ khí chiếm 1 trong 5 ô trang bị. |
| **Kỹ năng chủ động** | Mở khóa theo **cảnh giới**. Trước màn chọn **3 kỹ năng mang theo**. Trong màn, kỹ năng chỉ xuất hiện dưới dạng thẻ khi lên cấp, sau khi chọn thì **tự động thi triển**. |
| **Kỹ năng bị động** | Tăng chỉ số hoặc hiệu ứng. Mỗi kỹ năng vũ khí / chủ động **liên kết** với 1 bị động. |

### 5.2 Giới hạn trong màn
- Tổng số kỹ năng sở hữu trong một màn tối đa **6**, tính cả kỹ năng vũ khí, **không phân biệt chủ động hay bị động**.
- Kỹ năng vũ khí luôn chiếm 1 ô ngay từ đầu, còn tối đa **5 ô** cho chủ động + bị động. Ví dụ: 3 chủ động thì chỉ còn 2 bị động; hoặc 2 chủ động + 3 bị động. Đây là chỗ tạo ra sự lựa chọn build.
- Mỗi kỹ năng có **5 cấp**.

### 5.3 Thẻ khi lên cấp
Mỗi lần lên cấp: game tạm dừng, hiện **3 thẻ ngẫu nhiên** (không trùng).

Loại thẻ:
1. Thẻ **kỹ năng mới** (nếu còn ô trống)
2. Thẻ **nâng cấp** kỹ năng đang có (chưa tối đa cấp 5)
3. Thẻ **thức tỉnh** (khi đủ điều kiện, xem 5.4)
4. Thẻ **dự phòng** (hồi máu, thêm linh thạch) khi hết thẻ hợp lệ

**Tỷ lệ xuất hiện:**
- Nếu **chưa** chọn thẻ kỹ năng chủ động nào: mọi thẻ có tỷ lệ như nhau.
- Nếu **đã** chọn một kỹ năng chủ động: tỷ lệ xuất hiện của **kỹ năng đó và bị động liên kết với nó tăng lên** (trọng số khởi điểm ×3, chỉnh được trong config).

**Pool thẻ trong màn (đã chốt):** gồm kỹ năng vũ khí, **3 kỹ năng chủ động đã mang theo**, và toàn bộ bị động. Kỹ năng chủ động không mang theo sẽ không xuất hiện.

### 5.4 Thức tỉnh
Khi **kỹ năng chủ động đạt cấp 5** và người chơi **đã sở hữu bị động liên kết**, thì **lần chọn thẻ kế tiếp sẽ có thẻ thức tỉnh** của kỹ năng đó. Thức tỉnh thay thế kỹ năng bằng phiên bản mạnh hơn (hiệu ứng, phạm vi, sát thương lớn hơn).

**Đã chốt:** chỉ cần sở hữu bị động liên kết (bất kỳ cấp), không bắt buộc cấp 5. Chỉ kỹ năng chủ động mới thức tỉnh; kỹ năng vũ khí hiện chưa có thức tỉnh.

---

## 6. Cảnh giới và tu vi (tiến trình vĩnh viễn)

### 6.1 Nguồn tu vi
- **Lịch luyện:** hoàn thành màn chơi
- **Mua bằng linh thạch** (linh thạch là tiền tệ chính của game)
- **Đan dược** (chức năng luyện đan)

### 6.2 Bảng cảnh giới

| Thế giới | Cảnh giới | Tầng nhỏ |
|---|---|---|
| 1. Trung Đô | Thối Thể → Khai Nguyên → Khí Động → Ly Hợp → Chân Nguyên → Thần Du | **Không chia tầng nhỏ** (6 bậc) |
| 2. Thông Huyền | Siêu Phàm → Nhập Thánh | 3 tầng mỗi cảnh giới |
| 3. Hằng La | Thánh Vương → Phản Hư → Hư Vương | 3 tầng mỗi cảnh giới |
| 4. Tinh Giới | Đạo Nguyên → Đế Tôn | 3 tầng mỗi cảnh giới |
| 5. Tam Thiên | Khai Thiên: 1-3 phẩm Chân Quân, 4-6 phẩm Thiên Quân, 7-9 phẩm Thần Quân | 9 phẩm |
| 6. Mặc Chiến Trường | Sáng Thế (cảnh giới cuối) | không chia tầng |

### 6.3 Điều kiện sang thế giới kế tiếp
- Thế giới 1 → 2: đạt **Thần Du** (đỉnh cảnh giới của thế giới 1) + qua hết màn.
- Thế giới 2 → 3 và 3 → 4 và 4 → 5: đạt tầng cuối của cảnh giới cuối thế giới đó + qua hết màn.
- Thế giới 5 → 6: **không có giới hạn cảnh giới**, chỉ cần **giết boss cuối thế giới 5**.

### 6.4 Tác dụng của cảnh giới
Tăng chỉ số gốc và **mở khóa kỹ năng chủ động** mới. Chi phí tu vi mỗi bậc nằm trong bảng cấu hình để cân bằng nhịp.

---

## 7. Hệ thống phụ (ngoài màn)

| Hệ thống | Mô tả |
|---|---|
| **Linh thạch** | Tiền tệ chính: mua tu vi, nguyên liệu, nâng cấp |
| **Trang bị 5 ô** | Vũ khí, y phục, giày, trang sức, **bí bảo** |
| **Bí bảo** | Chỉ nhận được khi vượt các **màn chơi cố định** (màn đặc biệt) |
| **4 trang bị còn lại** | Nhận từ màn chơi và **luyện khí** |
| **Luyện đan** | Chế đan dược từ nguyên liệu để tăng tu vi / chỉ số tạm |
| **Luyện khí** | Chế tạo / nâng cấp trang bị |

Các hệ thống này làm ở **giai đoạn sau** (xem lộ trình mục 13), sau khi vòng chiến đấu đã vui.

---

## 8. Màn chơi

- **Map vô hạn lặp lại** (tile nền), mỗi thế giới có giao diện nền riêng.
- **Qua màn:** sống sót đến hết giờ, boss xuất hiện ở cuối, giết boss.
- **Thời lượng:** 10-15 phút mỗi màn (có thể ngắn hơn ở các màn đầu mỗi thế giới).
- **Số màn mỗi thế giới:** khoảng **10 màn** (cấu hình được). Bản MVP chỉ cần thế giới 1 với 3 màn.
- Mỗi màn có **hội thoại** trước và sau trận, liên quan đến sự kiện đại chiến.
- Có một số **màn cố định** (thưởng bí bảo).

### Độ khó (mức vừa phải, tăng dần)
- Tốc độ quái xuất hiện, số lượng và máu quái tăng theo thời gian trong màn (đường cong cấu hình).
- Hệ số độ khó tăng theo thế giới.
- Mốc thời gian có "đợt quái mạnh" và tinh anh xuất hiện.

---

## 9. Quái vật

### 9.1 Kiến trúc: kiểu hành vi + dữ liệu
Mỗi quái = **1 kiểu hành vi** (code viết một lần) + **bộ dữ liệu** (chỉ số, hình, thế giới). Nhờ vậy làm hàng trăm quái chỉ là thêm dữ liệu.

| # | Kiểu hành vi | Mô tả |
|---|---|---|
| 1 | Đuổi theo (grunt) | Chạy thẳng vào người chơi |
| 2 | Chạy nhanh | Ít máu, rất nhanh |
| 3 | Tank | Chậm, rất nhiều máu |
| 4 | Đánh xa | Giữ khoảng cách, bắn đạn |
| 5 | Bay xuyên | Xuyên vật cản / lướt |
| 6 | Tự bạo | Lao vào rồi nổ |
| 7 | Hỗ trợ | Hồi máu / tăng tốc cho quái khác |
| 8 | Triệu hồi | Sinh thêm quái nhỏ |
| 9 | Vây hãm | Xuất hiện thành vòng / hàng quanh người chơi |
| 10 | Tinh anh | Biến thể mạnh, có 1 kỹ năng riêng, rơi nhiều XP |

### 9.2 Ví dụ dữ liệu quái (sẽ là file cấu hình)
```ts
{
  id: "yeu_thu_soi",
  name: "Sói Yêu",
  world: 1,
  behavior: "chaser",
  stats: { hp: 20, speed: 90, damage: 5 },
  drops: { xp: 1, linhThach: 0.2 },
  sprite: "placeholder_wolf"
}
```

---

## 10. Boss

Danh sách boss do bạn cung cấp. Mỗi boss có **2-3 chiêu đặc trưng** (có dấu hiệu báo trước để người chơi né) và **chuyển giai đoạn ở 50% máu**. Tên và chiêu thức chỉ là dữ liệu cấu hình nên đổi bất cứ lúc nào.

| Thế giới | Boss (theo danh sách của bạn) |
|---|---|
| 1. Trung Đô | Đại Đương Gia Sơn Tặc, Truyền Thừa Thủ Vệ, Đại Sư Thủ Lĩnh Bát Đại Gia Tộc (1 boss), Tà Vương, Dương Bách |
| 2. Thông Huyền | Mị Yêu, Băng Tông, Ma Tướng, Yêu Vương, Ma Đế, Khoa La (cốt tộc) |
| 3. Hằng La | U ám Tinh Cường Giả, Tông Chủ Lôi Viêm Tông, Lạc Hải, Tinh Chủ Tử Tinh, Trùng Đế |
| 4. Tinh Giới | Tu Sĩ Ma Hóa, Tịch Mậu, Long Tộc Trưởng lão, Yêu Thánh, Mạc Thắng |
| 5. Tam Thiên | Thất Xảo thiên quân, Lang Gia Trưởng Lão, Âm Dương Trưởng Lão, Thần Quân Mặc Hóa, Mặc tộc vương chủ bị phong ấn |
| 6. Mặc Chiến Trường | Mặc Tộc Lĩnh Chủ, Mặc Tộc Vực Chủ, Mặc Tộc Vương Chủ, Mặc Sắc Cự Thần Linh, Mặc |

### Kế hoạch 10 màn mỗi thế giới
- Boss trong danh sách của bạn là **boss cuối của các màn chính**, xếp theo thứ tự mạnh dần. **Boss cuối danh sách** là boss chốt thế giới (màn 10).
- Các màn còn lại để đủ 10 là **màn đệm**: boss phụ / tinh anh mạnh cùng phe, **tên tạm do mình đặt**, bạn duyệt và thay tên sau.
- Một vài màn là **màn cố định** (thưởng bí bảo).

---

## 11. Điều khiển, đồ họa, âm thanh

### Điều khiển
- **Máy tính:** WASD hoặc phím mũi tên để di chuyển; chuột để chọn thẻ và bấm menu.
- **Điện thoại (làm ngay từ đầu):** joystick ảo bên trái, chạm để chọn thẻ.
- Dùng **lớp trừu tượng input** (`InputManager`) để game chỉ biết "hướng di chuyển", không phụ thuộc thiết bị.
- Giao diện co giãn theo kích thước màn hình (responsive).

### Đồ họa
- Dùng **bộ sprite miễn phí (CC0)** làm placeholder cho nhân vật, quái, boss, vật phẩm.
- Mọi hình ảnh gọi qua **key trong cấu hình**, đổi sprite sau chỉ cần đổi file, không sửa code.

### Âm thanh
- Chưa làm ở bản khung xương. Dựng sẵn `AudioManager` rỗng để gắn nhạc / hiệu ứng ở giai đoạn cuối.

---

## 12. Kỹ thuật

### 12.1 Công nghệ
- **TypeScript + Vite + Phaser 3.** Phaser lo vòng lặp game, camera, va chạm, nhóm đối tượng; TypeScript giúp an toàn khi dữ liệu phức tạp.
- Giao diện ngoài màn (cảnh giới, luyện đan, luyện khí, trang bị) có thể làm bằng **HTML/CSS hoặc React**, hoặc ngay trong Phaser (quyết định ở giai đoạn 6).
- **Lưu dữ liệu: `localStorage`** (có số phiên bản dữ liệu để nâng cấp về sau). Khi game ổn định có thể thêm lưu đám mây bằng Node.js + MySQL.

### 12.2 Cấu trúc thư mục dự kiến
```
vo-luyen-survival/
├── README.md                 # Hướng dẫn cài đặt, chạy game (tiếng Việt)
├── package.json
├── vite.config.ts
├── index.html
├── public/assets/            # sprite, âm thanh (placeholder)
└── src/
    ├── main.ts               # Khởi tạo Phaser
    ├── config/               # TOÀN BỘ dữ liệu cân bằng, dễ chỉnh
    │   ├── enemies.ts        # Danh sách quái
    │   ├── bosses.ts         # Danh sách boss
    │   ├── weapons.ts        # Vũ khí + kỹ năng vũ khí
    │   ├── activeSkills.ts   # Kỹ năng chủ động + thức tỉnh
    │   ├── passiveSkills.ts  # Kỹ năng bị động
    │   ├── realms.ts         # Cảnh giới, tầng, chi phí tu vi
    │   ├── worlds.ts         # 6 thế giới, danh sách màn
    │   ├── stages.ts         # Mốc spawn quái theo thời gian
    │   ├── items.ts          # Trang bị, đan dược, nguyên liệu
    │   └── story.ts          # Hội thoại cốt truyện
    ├── scenes/               # Boot, Menu, Hub, StageSelect, Game, LevelUp, Dialogue, Result
    ├── entities/             # Player, Enemy, Boss, Projectile, XpGem
    ├── systems/              # Spawner, CardPicker, SkillSystem, Combat, Progression, Save
    ├── input/                # InputManager (bàn phím + joystick ảo)
    ├── ui/                   # HUD, màn chọn thẻ, menu
    └── utils/                # pool đối tượng, toán học, random có seed
```

### 12.3 Quyết định kỹ thuật chính (giải thích ngắn)
- **Data-driven:** quái, kỹ năng, màn, cảnh giới đều là dữ liệu. Thêm nội dung không cần sửa logic.
- **Object pooling:** tái sử dụng đạn, quái, hạt XP thay vì tạo / xóa liên tục, giữ game mượt khi có hàng trăm quái.
- **Giới hạn số quái cùng lúc** và tối ưu va chạm (lưới không gian) để chạy ổn trên điện thoại.
- **Tách "trạng thái lượt chơi" và "trạng thái vĩnh viễn":** run state mất khi hết màn; save state ghi vào `localStorage`.

---

## 13. Lộ trình theo giai đoạn

Mỗi giai đoạn đều **chạy thử được**; sau mỗi giai đoạn mình hướng dẫn cách chạy và hỏi bạn có muốn chỉnh gì.

| GĐ | Nội dung | Kết quả kiểm tra được |
|---|---|---|
| 1 | Khung dự án, nhân vật di chuyển (PC + joystick ảo), camera, map lặp | Chạy `npm run dev`, nhân vật đi được trên map vô hạn |
| 2 | Quái xuất hiện, kỹ năng vũ khí tự động tấn công, sát thương, máu, hạt XP | Chiến đấu cơ bản, thua khi hết máu |
| 3 | Lên cấp, màn chọn thẻ, giới hạn 6 kỹ năng, cấp 1-5, tỷ lệ thẻ | Build khác nhau mỗi lượt |
| 4 | Kỹ năng chủ động + bị động liên kết + **thức tỉnh**, nhiều kiểu quái, boss | Vòng chơi đầy đủ trong 1 màn |
| 5 | Thế giới, nhiều màn, chuyển màn, menu / thắng / thua, hội thoại | Chơi hết thế giới 1 |
| 6 | Lưu tiến trình, linh thạch, tu vi, cảnh giới, trang bị 5 ô, cửa hàng | Tiến trình vĩnh viễn |
| 7 | Luyện đan, luyện khí, bí bảo / màn cố định | Hệ thống chế tạo |
| 8 | Nội dung thế giới 2-6, cân bằng, âm thanh, tối ưu, thay sprite thật | Chạy đến end game |

---

## 14. Các điểm đã xác nhận

1. Thức tỉnh: chỉ cần **sở hữu** bị động liên kết (bất kỳ cấp).
2. Pool thẻ trong màn: kỹ năng vũ khí + 3 chủ động mang theo + mọi bị động.
3. Khoảng **10 màn mỗi thế giới**, dựa trên danh sách boss của bạn, mình bổ sung màn đệm.
4. Điều kiện sang thế giới 3, 4, 5: đạt tầng cuối của cảnh giới cuối thế giới trước.
5. Thế giới 5 và 6: không có điều kiện cảnh giới để vào (5 → 6 chỉ cần giết boss cuối).
6. Khi chết: giữ **30%** linh thạch, không nhận tu vi.
7. Hội thoại cốt truyện hiện trước và sau mỗi màn.

8. Thế giới 1: "Đại sư" và "Thủ Lĩnh Bát Đại Gia Tộc" là **một** boss. Quái thú bảo vệ truyền thừa ghi là **Truyền Thừa Thủ Vệ**. Boss cuối thế giới 6 chỉ là **Mặc**.

### Trạng thái triển khai (v0.3)
Toàn bộ 6 thế giới × 10 màn đã chơi được từ đầu đến cuối với **hình ảnh và âm thanh tạm**. Con số cân bằng là ước lượng, cần chơi thử để chỉnh. Nội dung hội thoại là văn bản mẫu để bạn viết lại (`src/config/story.ts`). Tên boss phụ và quái là tên tạm.
