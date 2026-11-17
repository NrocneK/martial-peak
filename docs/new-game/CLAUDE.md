# [Tên game] — hướng dẫn cho Claude

Game hành động **cuộn cảnh ngang (side-scrolling)**, bối cảnh tu tiên cổ trang, giao diện tiếng Việt.
Người dùng là lập trình viên mới bắt đầu (biết HTML/CSS/JS, React, Next.js, Node, TypeScript, MySQL)
→ **trả lời bằng tiếng Việt**, giải thích ngắn gọn, dễ hiểu.

## Quy tắc làm việc (bắt buộc)

1. **Hỏi trước khi làm nếu yêu cầu có thể hiểu nhiều cách.** Hỏi 1 câu ngắn, không tự đoán.
2. **Chỉ làm đúng phần được yêu cầu.** Không tự thêm chi tiết, hiệu ứng, tính năng mới.
3. **Không báo "xong / khớp / sạch" khi chưa có bằng chứng** (ảnh phóng to, kết quả chạy thật). Nói thẳng nếu còn lỗi.
4. **Chỉnh hình / chi tiết nhỏ:** gửi ảnh xem trước (phóng to) cho người dùng duyệt **trước** khi deploy.
5. **Tính năng mới / thay đổi lớn:** Hỏi ý → Kế hoạch (người dùng duyệt) → Code → chạy bằng Playwright,
   chụp màn hình kiểm tra → Soát lại → mới deploy.
6. Mỗi thay đổi: commit + push lên nhánh đang làm. Không để file chưa commit.
7. Giữ file này **ngắn gọn**; chi tiết dài (prompt, bảng số liệu) để ở `docs/`.

## Công nghệ (đề xuất — chốt ở buổi đầu)

- Phaser 3 + TypeScript + Vite (giống dự án cũ, người dùng đã quen), deploy Vercel.

## Hình ảnh — ĐỒNG BỘ NGAY TỪ ĐẦU (bài học từ dự án cũ)

Dự án cũ ghép ảnh từ nhiều nguồn nên các phần không ăn khớp. Lần này:

- **Một phong cách duy nhất:** pixel art nét, viền tối, tô bóng đơn giản. Có **bộ ảnh mẫu phong cách**
  (`art/style/`) — mọi prompt AI đều đính kèm bộ mẫu này; ảnh không khớp thì không đưa vào game.
- **Cỡ cố định:** nhân vật cao ~64 điểm ảnh, mỗi khung hoạt ảnh **96×96**, chân đặt cùng một đường nền.
  Nhân vật vẽ **quay sang phải**, đi trái thì lật bằng code.
- **Nhân vật nhiều lớp (paper-doll):** lớp gốc = thân người chỉ mặc quần cọc, chân trần. Trang phục, giày,
  mũ… là các lớp riêng, **vẽ khớp từng khung** của lớp gốc (cùng cỡ khung, cùng vị trí).
- **Mọi ảnh đều qua script xử lý** (`tools/art/`): tách nền, căn chân, ép về cùng bảng màu và cùng độ to
  điểm ảnh, ghép sheet. Không chép ảnh AI thẳng vào game.
- Trước khi làm một nhóm ảnh mới (tile, quái, icon…): làm thử 2–3 cái, so với ảnh mẫu, người dùng duyệt rồi mới làm hết.
- Prompt nhân vật + 9 bộ chuyển động: xem `docs/art-prompts.md`.

## Hoạt ảnh nhân vật (số khung)

idle 6 · walk 8 · run 8 · jump 6 · air jump 6 · attack (điều khiển phi kiếm, không vẽ kiếm) 8 · dash 4 · hit 3 · die 6.
Phi kiếm bay đi tấn công: code riêng.
