# Vạn Giới Tầm Quang — hướng dẫn cho Claude

Game roguelike Phaser 3 + TypeScript + Vite, giao diện tiếng Việt.
Người dùng là lập trình viên mới bắt đầu → **trả lời bằng tiếng Việt**, giải thích ngắn gọn, dễ hiểu.

## Quy tắc làm việc (bắt buộc)

1. **Hỏi trước khi làm nếu yêu cầu có thể hiểu nhiều cách.** Hỏi 1 câu ngắn, không tự đoán.
   (Bài học: "vòng sáng" ≠ "quầng sáng" — tự đoán đã tốn nhiều lần sửa.)
2. **Chỉ làm đúng phần được yêu cầu.** Không tự thêm chi tiết, hiệu ứng, tính năng mới.
3. **Không báo "xong / khớp / sạch" khi chưa có bằng chứng.** Phải kiểm tra bằng ảnh phóng to
   hoặc kết quả chạy thật, và nói thẳng nếu còn lỗi.
4. **Chỉnh hình / chi tiết nhỏ:** gửi ảnh preview (phóng to) cho người dùng duyệt **trước** khi deploy.
5. **Tính năng mới / thay đổi lớn:** Hỏi ý → Kế hoạch (người dùng duyệt) → Code → chạy game bằng
   Playwright, chụp màn hình kiểm tra → Soát lại → mới deploy.
6. Mỗi thay đổi: commit + push lên nhánh đang làm. Không để file chưa commit.

## Lệnh

- Chạy dev: `npm run dev`
- Build + kiểm tra kiểu: `npm run build` (chạy trước mỗi lần deploy)
- Deploy (Vercel, môi trường cloud có proxy tự chèn token):
  `npx --yes vercel deploy --prod --yes --token proxyinjected0000000000000`
- Web: https://martial-peak.vercel.app — sau deploy nhắc người dùng nhấn **Ctrl+F5**.

## Hình trang bị (gear icons)

- Script chính: `tools/art/gear_from_ai.py` (Python: rembg, OpenCV, scipy, Pillow).
  Ảnh gốc / mask trong `tools/art/ref/`, preview ra `tools/art/out/` (đã gitignore).
- Kết quả: `public/gear/{loại}_{bậc-1}.png`, 66×66, cạnh dài 64.
- 6 bậc: Phàm, Linh, Tiên, Thần, Thánh, Đạo.
- Vũ khí (kiếm, đao, thương, cung) đồng bộ nghiêng 45°, mũi hướng phải-trên; cung cùng một phía;
  găng tay là cặp đứng thẳng.
- **Mỗi lần đổi hình trang bị phải tăng `GEAR_ART_V` trong `src/config/items.ts`** (để trình duyệt tải ảnh mới).
- Icon bí bảo: tools/art/bibao_from_ai.py (ảnh tools/art/ref/bibao_{1,2}_ai.png). Áo 4 bậc dựng đứng: ROBES trong gear_from_ai.py.
