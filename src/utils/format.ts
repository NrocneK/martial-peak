/** Rút gọn số lớn cho dễ đọc: 1234 → 1.2K, 2500000 → 2.5M */
export function fmt(n: number): string {
  const v = Math.floor(n);
  if (v < 10_000) return v.toLocaleString('vi-VN');
  if (v < 1_000_000) return (v / 1000).toFixed(v < 100_000 ? 1 : 0).replace(/\.0$/, '') + 'K';
  if (v < 1_000_000_000) return (v / 1_000_000).toFixed(v < 100_000_000 ? 2 : 1).replace(/\.?0+$/, '') + 'M';
  return (v / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '') + 'B';
}

/** mm:ss */
export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Hash chuỗi → số nguyên dương (dùng để chọn ngẫu nhiên cố định theo id) */
export function hashStr(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Trộn hai màu 0xRRGGBB theo tỉ lệ t (0..1) */
export function mixColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255,
    ag = (a >> 8) & 255,
    ab = a & 255;
  const br = (b >> 16) & 255,
    bg = (b >> 8) & 255,
    bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

export function hex(c: number): string {
  return '#' + c.toString(16).padStart(6, '0');
}
