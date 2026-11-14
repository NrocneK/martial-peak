# Thay đổi kỹ năng chờ tích hợp vào game

Mọi hiệu ứng mới đang nằm trong phòng thử (`src/vfx/skillFx.ts`, `src/vfxlab/main.ts`, trang `vfx-lab.html`).
Chỉ đưa vào game **một lượt** sau khi đã duyệt hết toàn bộ kỹ năng.

## Ghi chú thiết kế (cách hoạt động trong game)

### Bỏ kỹ năng
- Bỏ **Kim Đan Hộ Luân** và **Nguyên Anh Xuất Khiếu**.
- Bỏ **Bất Diệt Kim Thân** (đã có quá nhiều kỹ năng gây sát thương liên tục trong phạm vi).
  Khi tích hợp: gỡ khỏi `src/config/skills.ts`, khỏi danh sách thức tỉnh của bị động **Huyền Vũ Giáp** (`p_huyen_vu.awakens`), và hiệu ứng `kimThan`.
- Bỏ **Đế Ấn Trấn Thiên** (trùng với Thiên Địa Pháp Thân).
  Khi tích hợp: gỡ khỏi `src/config/skills.ts`, khỏi danh sách thức tỉnh của bị động **Pháp Thiên** (`p_phap_thien.awakens`), và hiệu ứng `deAn`.

### Thần Thức Trảm
- Phía trên nhân vật xuất hiện tay khí, lưỡi kiếm khí bọc bàn tay, chém vào kẻ địch gần đó.
- Tăng cấp: tăng sát thương, giảm thời gian hồi.
- Thức tỉnh: 6 cánh tay.

### Ngân Hà Hàn Lưu
**Thường**
- Chọn mục tiêu **xa nhất trong tầm bắn**; nếu có **boss** thì ưu tiên bắn boss.
- Bắn liên tục vào mục tiêu đó cho đến khi mục tiêu chết hoặc kỹ năng hết thời gian.
- Trong thời gian tồn tại, các mục tiêu khác bị tia băng quét trúng cũng nhận sát thương.
- Mục tiêu bị gây sát thương sẽ bị **làm chậm**; nhận **5 lần** sát thương từ kỹ năng thì bị **đóng băng**.
- Boss chỉ bị làm chậm trong thời gian ngắn, và chỉ bị làm chậm lại khi kỹ năng được thi triển lại (không bị đóng băng).
- Tăng cấp: tăng sát thương, khoảng cách (tầm bắn) và thời gian tồn tại.

**Thức tỉnh**
- Tăng mạnh kích thước và sát thương.
- Thêm **3 tia truy kích** bắn định kỳ trong thời gian tia chính tồn tại.

### Tiên Vương Lĩnh Vực
- **Duy trì vĩnh viễn** quanh nhân vật (không có thời gian tồn tại, không hồi chiêu).
- Thường: trận đồ **vàng** dưới chân. Thức tỉnh: trận đồ **đỏ** + vòng gai đỏ bao ngoài, 2 lớp xoay ngược chiều nhau.
- **Bỏ huyết kiếm** ở bản thức tỉnh (trùng với Vạn Kiếm Quy Tông) — sửa lại mô tả thức tỉnh "Sát Lục Đế Vực" trong `src/config/skills.ts`.
