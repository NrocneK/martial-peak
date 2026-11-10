/**
 * Chế độ gỡ lỗi / TEST: bật khi
 *  - chạy `npm run dev`, hoặc
 *  - bản build có `VITE_TEST_MODE=1` (đặt trong `.env.production` — đổi thành 0 để tắt khi phát hành thật), hoặc
 *  - địa chỉ có `?debug` (kể cả bản build thật).
 * Khi bật: có API `window.__vls` trong console và nút "Chế độ TEST" trong Cài Đặt.
 */
export function isDebugMode(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_TEST_MODE === '1' || new URLSearchParams(location.search).has('debug');
}
