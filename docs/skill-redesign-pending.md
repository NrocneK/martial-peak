# Thay đổi kỹ năng chờ tích hợp vào game

Mọi hiệu ứng mới đang nằm trong phòng thử (`src/vfx/skillFx.ts`, `src/vfxlab/main.ts`, trang `vfx-lab.html`).
Chỉ đưa vào game **một lượt** sau khi đã duyệt hết toàn bộ kỹ năng.

## Ghi chú thiết kế (cách hoạt động trong game)

### Bỏ kỹ năng
- Bỏ **Kim Đan Hộ Luân** và **Nguyên Anh Xuất Khiếu**.

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
