# Lịch sử phiên bản

## v0.9.4 — Điện thoại: nội dung luôn trọn trong khung
- Chặn trình duyệt di động tự phóng chữ (`text-size-adjust: 100%`) — nguyên nhân chữ to hơn thiết kế ~35% trên một số máy.
- Hành Trang: nhân vật đổi cỡ theo màn hình ngay khi vẽ (trước đây thuộc tính trên thẻ đè CSS nên vẫn ×3, đẩy ô trang bị bên phải ra ngoài khung).
- Bố cục điện thoại gọn hơn: thanh trên, khung bảng, tiêu đề nhỏ lại; "Cắn linh thạch" dồn một hàng; 6 thế giới ở Lịch Luyện thành lưới 3×2 (không vuốt ngang).
- **Lưới bảo vệ cuối**: nếu nội dung vẫn cao hơn khung (cỡ chữ hệ thống rất lớn, màn hình rất thấp) thì tự thu nhỏ khối nội dung cho vừa — không bao giờ phải cuộn. Danh sách chia trang được đo ở cỡ thật trước, co sau.
- Đã thử ở 305×520 (tương đương máy phóng chữ 35%), 360×640, 375×560, 412×703, iPhone 13 và PC 1280×720: không tab nào tràn.

## v0.9.3 — Làm sạch sprite nhân vật
- **Đốm trắng ở rìa**: ảnh concept nhòe nên giữa viền đen và nền giấy có dải điểm xám / trắng mờ. `trace_hero.py` giờ bào dải này (3 lượt, chỉ điểm sáng ít màu nằm sát nền) và bỏ các điểm chỉ phủ một phần khi thu nhỏ.
- **Mảng trắng giữa tay phải và thân**: là giấy nền bị tay + thân bao kín nên loang từ mép không tới. Giờ xóa mọi mảng "giấy" (sáng, ngả ấm: đỏ − lam ≥ 11; áo trắng của nhân vật ngả lạnh) từ 40 điểm trở lên; tròng trắng mắt (~11–16 điểm) được giữ.
- Bỏ hẳn vệt bóng xám dưới đế ủng.
- Đặt lại các mốc hoạt ảnh theo lưới mới (đai lưng, dải đai, đuôi tóc).
- **Ngồi thiền** dựng lại: giữ nguyên thân trên, hai cánh tay và nắm tay từ concept (nắm tay đặt trên gối), chân xếp bằng phía sau, vạt áo trắng có bóng + nếp gấp + gấu hoa văn lam.

## v0.9.2 — Sửa lỗi Tu Luyện / Hành Trang vẫn hiện nhân vật cũ
- Nguyên nhân: `vercel.json` cho trình duyệt giữ ảnh `/ui/*` 1 giờ mà không hỏi lại máy chủ; ảnh nhân vật đổi nội dung nhưng giữ tên file nên trình duyệt dùng bản cũ.
- Sửa: ảnh `/ui/*` dùng `Cache-Control: public, max-age=0, must-revalidate` (luôn hỏi lại máy chủ, ảnh không đổi thì trả về rất nhanh); thêm `?v=0.9.2` vào đường dẫn ảnh nhân vật để trình duyệt bỏ ngay bản đã lưu.

## v0.9.1 — Nhân vật lấy trực tiếp từ ảnh concept
- Cố Trường Ca không còn vẽ tay bằng khối đa giác: script `tools/art/trace_hero.py` chuyển **chính ảnh concept** (`tools/art/ref/hero_concept.png`) thành lưới pixel (tách nền, bỏ bóng, thu nhỏ theo trung bình vùng, gom 40 màu, giữ màu vàng khóa đai, dọn viền) → `hero_trace.px.js`.
- `hero.px.js` dùng lưới đó làm khung gốc và thêm hoạt ảnh: dáng đứng 58x106 (thở, tóc + dải đai lay), sprite đi bộ trong trận 21x38 (nhún + nhấc chân), ngồi thiền 72x72 (thân trên từ concept + chân xếp bằng, tay kết ấn, bồ đoàn, hào quang).
- Avatar, Hành Trang, Tu Luyện, màn nạp, sprite trong trận đều dùng nhân vật mới.

## v0.9.0 — Nhân vật theo concept, giao diện không cuộn, thông báo mới
- **Cố Trường Ca vẽ lại theo ảnh concept**: tỉ lệ ~5 đầu (không còn chibi), đuôi ngựa cao buộc dây lam, áo ngoài lam + áo trong trắng cổ chéo, ống tay trắng + bao cổ tay sẫm, đai lam khóa tròn vàng, dải đai dài bay, quần lam sẫm ống rộng, ủng đen. Sprite đi bộ trong trận, hình ngồi thiền và avatar đổi theo cùng trang phục.
- **Không còn thanh cuộn dọc**: danh sách dài chia trang (◀ 1/3 ▶); số ô mỗi trang **đo theo chỗ trống thật** của màn hình (đổi cỡ cửa sổ / xoay máy tự tính lại). Chi tiết vật phẩm, kỹ năng, màn chơi mở trong bảng nổi.
  - Lịch Luyện: 10 ô màn (PC 5 cột, điện thoại 2 cột), bấm ô → bảng thông tin + Khiêu chiến.
  - Tu Luyện: Cảnh Giới / Kỹ Năng / Bị Động.
  - Hành Trang: Trang Bị (nhân vật + ô trang bị; điện thoại xem chỉ số qua ô "Chỉ số") / Kho Đồ (lưới ô theo phẩm chất, lọc + sắp xếp).
  - Nhiệm Vụ: Hằng Ngày / Chính Tuyến / **Thành Tựu** (gộp từ nút Thành Tích ở Sảnh).
- **Thông báo** đổi sang khung vàng sáng, hiện phía trên màn hình (trước đây nền đen, nằm đè thanh dưới nên khó đọc); thông báo mới thay thông báo cũ.

## v0.8.0 — Lobby theo ảnh tham khảo, Hành Trang, Nhiệm Vụ
- **Ảnh nền vẽ lại** với chi tiết dày hơn và **2 bản**: dọc 9:16 cho điện thoại (`sect_tall`), ngang 16:9 cho PC (`sect_wide`). Núi đá vôi, biển mây, vách đá lởm chởm có vân, tùng bonsai, anh đào xum xuê, chính điện 3 tầng + lầu hai bên, thác nước, cầu vòm, đảo nổi, trăng linh quang, Truyền Tống Trận lớn (khung vòm vàng, cờ lam, đèn đá, sàn trận pháp, lan can).
- **Khung viền vàng pixel art** (9 mảnh) cho thanh dưới, nút bên, bảng, hộp thoại.
- **Sảnh**: bỏ nhân vật và thẻ Lịch Luyện. **Bấm vào Truyền Tống Trận** (cổng xoáy giữa màn hình, có viền sáng nhịp thở + biển tên) để vào chọn màn. Thanh trên trong suốt để lộ bầu trời.
- **Thanh dưới mới**: Sảnh · Tu Luyện · Hành Trang · Chế Tạo · Nhiệm Vụ (Cài Đặt ở nút bánh răng góc trên).
  - **Tu Luyện**: tab *Cảnh Giới* (Cố Trường Ca ngồi thiền có hào quang chuyển động) và tab *Kỹ Năng* (danh sách + chọn kỹ năng mang vào trận).
  - **Hành Trang**: nhân vật ở giữa, 5 ô trang bị xung quanh (bấm ô để xem / thao tác món đang mặc), chỉ số, nguyên liệu, kho đồ.
  - **Chế Tạo**: Luyện Khí / Luyện Đan.
  - **Nhiệm Vụ** (mới): 6 nhiệm vụ hằng ngày + thưởng hoàn thành tất cả (làm mới theo ngày trên máy), nhiệm vụ chính tuyến (vượt màn 5 / màn 10 mỗi thế giới, đạt mỗi đại cảnh giới). Thưởng linh thạch + nguyên liệu, **không cho tu vi**. Số nhiệm vụ chờ nhận hiện trên nút.
- Menu chính bỏ nhân vật (giống ảnh tham khảo). Màn nạp dùng ảnh nền dọc / ngang theo màn hình.
- Save thêm trường `quests` (save cũ tự bổ sung, không mất dữ liệu).

## v0.7.0 — Giao diện mới: màn nạp, Menu, Lobby, nhân vật
Toàn bộ hình vẽ bằng công cụ pxl (pixel art viết bằng code, miễn phí), nguồn trong `tools/art/`.
- **Nhân vật Cố Trường Ca** (theo ảnh concept: tóc đen tím buộc đuôi ngựa cao, áo trắng viền lam, đai lam khóa vàng, ủng đen):
  dáng đứng lớn có hoạt ảnh thở + tóc / đai bay (`hero_full`), và sprite đi bộ 4 khung trong trận (`hero_walk`, quay trái / phải theo hướng đi) thay cho hình tròn tạm.
- **Ảnh nền Vân Hạc Tông** (`sect_bg`): chính điện ba tầng mái trên vách đá, cầu thang đá trắng, hai thác nước, lầu và đảo nổi, vầng trăng linh quang, anh đào, cổng truyền tống phát sáng. Dùng chung cho màn nạp, Menu và Lobby; bố cục an toàn khi cắt cho cả điện thoại dọc lẫn màn hình ngang.
- **Màn nạp**: nền tông môn làm tối, tiêu đề, Cố Trường Ca đi bộ tại chỗ, thanh tiến độ, mẹo chơi.
- **Menu chính** gọn lại: nút lớn **Bắt Đầu / Tiếp Tục** + **Cài Đặt**; âm thanh, xuất / nhập save, chế độ TEST, xóa tiến trình chuyển vào bảng Cài Đặt (dùng chung với Lobby, có thêm "Về menu chính").
- **Lobby (Sảnh)** kiểu game di động:
  - thanh trên: avatar, tên, cảnh giới, thanh tu vi, linh thạch + nguyên liệu, nút Cài Đặt;
  - cột trái: **Hòm Thư** (đồ chờ nhận khi túi đầy, có số đếm) và **Thành Tích** (cảnh giới, số màn, bí bảo, số trận, quái hạ gục);
  - giữa: nhân vật đứng trước cổng truyền tống + thẻ **Lịch Luyện** (khiêu chiến ngay màn kế tiếp hoặc mở bản đồ);
  - thanh dưới: **Sảnh · Tu Luyện · Nhân Vật · Chế Tạo · Kỹ Năng**. Nhân Vật = chân dung + chỉ số + trang bị; Chế Tạo = Luyện Đan / Luyện Khí.
- 5 icon mới (Sảnh, Nhân Vật, Hòm Thư, Thành Tích, Cài Đặt). Bỏ ảnh `menu_bg.png`, `lantern.png` và file nguồn cũ không còn dùng.

## v0.6.0 — Đạo Tổ là cái kết, tu luyện khó hơn
- **Đạo Tổ khóa theo cốt truyện:** Tiên Đế Viên mãn chưa đủ, phải đánh bại **Thái Hư Đạo Tổ** (màn 10 Hỗn Độn Thần Vực) mới đột phá được. Mục Tu Luyện hiện thông báo "ngưỡng Đạo Tổ còn bị phong ấn".
- **Đoạn kết mở** khi bước lên Đạo Tổ: Trường Ca nhận ra mình mới chỉ đặt bước chân đầu tiên lên Đại Đạo. Có nút "Xem lại đoạn kết" trong mục Tu Luyện. Thoại sau màn 10 Hỗn Độn Thần Vực nhắc người chơi về ngưỡng cửa này.
- **Bình cảnh:** bước sang đại cảnh giới mới tốn ×2,5 tu vi; bước lên Đạo Tổ tốn thêm ×2. Vượt lần đầu 10 màn của một thế giới chỉ cho ~60% tu vi cần (trước đây ~89%). Tổng tu vi cần mỗi thế giới tăng ~40%, riêng bước Đạo Tổ ×5. Chỉnh trong `CULTIVATION` (`src/config/realms.ts`).
- Đổi tên các nhân vật / vật phẩm mang chữ "Tiên Vương" (không còn là cảnh giới): boss **Đại La Huyết Kiếm**, **Đại La Hội Trưởng**, boss phụ **Hộ Vệ Đại La**, quái **Đại La Hộ Vệ**, bí bảo **Đại La Lệnh**.
- **Save phiên bản 4:** save cũ giữ nguyên cảnh giới, tu vi được quy đổi để thanh tu vi giữ đúng tỉ lệ % trong bậc hiện tại.

## v0.5.2 — Chốt hệ thống cảnh giới
- Đổi tên đại cảnh giới thứ hai của thế giới 5 từ **Tiên Vương** thành **Đại La Kim Tiên**. Thứ tự 17 đại cảnh giới: Luyện Thể → Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần → Luyện Hư → Hợp Thể → Đại Thừa → Độ Kiếp → Chân Tiên → Thiên Tiên → Huyền Tiên → Kim Tiên → Đại La Kim Tiên → Tiên Đế → Đạo Tổ.
- Save cũ không bị ảnh hưởng (tên cảnh giới tính từ số bậc, không lưu trong save).

## v0.5.1 — Dọn dẹp dự án
Không đổi gameplay, save cũ vẫn dùng được (giữ nguyên khóa `vo-luyen-survival-save` và phiên bản save 3).
- Tách `src/systems/Progression.ts` (741 dòng) thành thư mục `src/systems/progression/` gồm 7 module nhỏ theo chức năng; gom logic đọc save dùng chung cho cả `load()` lẫn `importSave()`.
- Xóa code không dùng: `src/ui/Hud.ts` (HUD tạm của giai đoạn 1), `enemyById`, `worldNameOf`, `unlockedActives`, `tierNow`, tham số `onQuit` của `GameHud`, lệnh re-export `ACTIVES` trong `CardPicker`.
- Bật `noUnusedLocals` / `noUnusedParameters` trong `tsconfig.json` để code thừa không quay lại.
- Nút "Chế độ TEST" ở menu chính chỉ hiện ở chế độ gỡ lỗi (`npm run dev` hoặc `?debug`). Thêm `src/utils/env.ts` với hàm `isDebugMode()`.
- Gỡ khỏi repo submodule hỏng `.claude/skills/pxl-pixel-art` (thiếu `.gitmodules`) và file `pxl-pixel-art.zip` 6 MB. Thêm `.claude/skills/` và `tools/art/out*/` vào `.gitignore`.
- Đồng bộ phiên bản `package.json` với game (0.5.x); gom lịch sử phiên bản đang nằm rải rác trong README / GDD về file này.

## v0.5 — Hệ thống thế giới / cảnh giới mới, cốt truyện thiết kế lại
- **17 đại cảnh giới** (16 cảnh giới đầu × 3 kỳ Sơ / Trung / Hậu; Đạo Tổ một bậc, không hiện tu vi), Hậu kỳ + tu vi tối đa = **Viên mãn**. Thang bậc 0..50; chỉ số và kinh tế quy đổi qua `powerIdx` nên không mạnh hơn so với cân bằng cũ.
- **6 thế giới mới**: Thanh Vân Đại Lục, Thương Lan Giới, Thiên Huyền Tinh Vực, Cửu Thiên Tiên Giới, Thượng Cổ Tiên Vực, Hỗn Độn Thần Vực. Tên boss, quái, bí bảo, kỹ năng thức tỉnh viết lại theo thế giới.
- **Cốt truyện**: Khởi đầu (Cố Trường Ca ở Vân Hạc Tông) → Phát triển (bí cảnh, truyền thừa, đại hội tông môn, chính ma, yêu tộc) → Trung kỳ (phi thăng, phát hiện tiên giới thu hoạch đạo quả qua "Đại Đạo Lô") → Cuối game (đối đầu Thái Hư Đạo Tổ, trở thành Đạo Tổ mới).
- Hội thoại màn 5 và 10 của mỗi thế giới nằm ở `OVERRIDES` trong `src/config/story.ts`.
- Giao diện: màn nạp có đèn lồng, menu chính có ảnh nền pixel art, bộ biểu tượng mới (`public/ui/`).

## v0.4 — Trang bị nâng cao, bí bảo, cốt truyện mới
- **Cốt truyện nguyên bản**: Quang Ấn của vạn giới nứt vỡ, Hôi Khí rò rỉ, Vô Quang Tộc trỗi dậy; Cố Trường Ca đi qua 6 giới để thắp lại ánh sáng. Toàn bộ tên thế giới/cảnh giới/boss/quái/bí bảo/thoại đã viết mới.
- **Trang bị**: 6 loại vũ khí (kiếm, đao, thương, quyền, cung, quạt); tiền tố phụ (affix) 11 loại, số dòng theo phẩm chất; khóa; phân giải ra Tinh hoa (Thánh/Thần); tái luyện (3 quặng + 1 tinh hoa + linh, chọn giữ cũ/nhận mới); so sánh chỉ số với đồ đang mang; lọc/sắp xếp túi; chọn loại vũ khí khi luyện.
- **Hòm thưởng**: bí bảo không bao giờ mất khi túi đầy (tối đa 20 món chờ nhận).
- **Bí bảo**: 12 bí bảo, mỗi cái một hiệu ứng trong trận.
- **Ngoại hình**: chỉ vũ khí cầm tay đổi theo loại + màu phẩm chất; trang phục cố định.
- **Save**: xuất / nhập file save; dữ liệu lỗi được làm sạch khi tải.
- **Tốc độ**: nút x1/x2/x4 (phím X).
- Công thức chỉ số giữ nguyên; cân bằng vẫn là ước lượng, cần người chơi thử thật.

## v0.3 — Chơi được từ đầu đến cuối
Toàn bộ 6 thế giới × 10 màn đã chơi được từ đầu đến cuối với **hình ảnh và âm thanh tạm**. Con số cân bằng là ước lượng, cần chơi thử để chỉnh. Nội dung hội thoại là văn bản mẫu (`src/config/story.ts`). Tên boss phụ và quái là tên tạm.
