# Lịch sử phiên bản

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
