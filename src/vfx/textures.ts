// =====================================================================
// HỌA TIẾT VFX — vẽ bằng Canvas 2D lúc khởi động (không cần file ảnh).
// Đa số họa tiết màu TRẮNG / xám để nhuộm màu bằng setTint, hòa trộn cộng (ADD) cho cảm giác phát sáng.
// Một số họa tiết vật thể (lá bùa, phi kiếm, chuông, đế ấn...) có màu sẵn.
// =====================================================================
import Phaser from 'phaser';

export const VT = {
  SOFT: 'vx_soft', // quầng tròn mềm
  DOT: 'vx_dot', // chấm sáng nhỏ
  SPARK: 'vx_spark', // sao 4 cánh
  STREAK: 'vx_streak', // vệt dài (dọc trục x)
  RING: 'vx_ring', // vòng mảnh
  RING_THICK: 'vx_ring_thick', // vòng dày (sóng chấn)
  CRESCENT: 'vx_crescent', // vệt chém trăng khuyết (mở về +x)
  FLAME: 'vx_flame', // lưỡi lửa (đỉnh hướng lên)
  SHARD: 'vx_shard', // mảnh băng / kiếm khí nhọn
  PETAL: 'vx_petal', // cánh sen
  LEAF: 'vx_leaf', // lá cây
  ROCK: 'vx_rock', // mảnh đá
  SMOKE: 'vx_smoke', // khói / bụi
  TALISMAN: 'vx_talisman', // lá bùa đỏ
  TALISMAN_BLUE: 'vx_talisman_b', // lá bùa sét
  SWORD: 'vx_sword', // phi kiếm (mũi hướng +x)
  BLADE_WAVE: 'vx_bladewave', // đao khí (trăng khuyết dày)
  PALM: 'vx_palm', // bàn tay pháp tướng
  SEAL: 'vx_seal', // đế ấn vuông
  BELL: 'vx_bell', // chuông Huyền Hoàng
  SPIRIT: 'vx_spirit', // nguyên anh ngồi thiền
  RUNES: 'vx_runes', // vòng phù văn
  TAIJI: 'vx_taiji', // thái cực
  EYE: 'vx_eye', // con mắt thần thức
  CLAW: 'vx_claw', // vết vuốt hổ
  ARROW: 'vx_arrow', // mũi tên
  FAN_BLADE: 'vx_fanblade', // phong nhận (lưỡi gió)
  DRAGON: 'vx_dragon', // đầu rồng vàng
  ORB: 'vx_orb', // viên đan / linh cầu (có lõi sáng)
  CRACK: 'vx_crack', // vết nứt đất
  DUMMY: 'vx_dummy', // hình nhân gỗ (trang demo)
} as const;

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: Draw): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  const g = tex.getContext();
  draw(g, w, h);
  tex.refresh();
}

function radial(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, stops: [number, string][]): CanvasGradient {
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
  for (const [p, c] of stops) gr.addColorStop(p, c);
  return gr;
}

/** Tạo mọi họa tiết VFX (gọi một lần trong create của scene) */
export function makeVfxTextures(scene: Phaser.Scene): void {
  make(scene, VT.SOFT, 128, 128, (g) => {
    g.fillStyle = radial(g, 64, 64, 64, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.65)'], [0.6, 'rgba(255,255,255,0.18)'], [1, 'rgba(255,255,255,0)']]);
    g.fillRect(0, 0, 128, 128);
  });
  make(scene, VT.DOT, 16, 16, (g) => {
    g.fillStyle = radial(g, 8, 8, 8, [[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]);
    g.fillRect(0, 0, 16, 16);
  });
  make(scene, VT.SPARK, 64, 64, (g) => {
    g.fillStyle = radial(g, 32, 32, 14, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#fff';
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      g.beginPath();
      g.moveTo(32 - dx * 31, 32 - dy * 31);
      g.lineTo(32 + dy * 3, 32 + dx * 3);
      g.lineTo(32 + dx * 31, 32 + dy * 31);
      g.lineTo(32 - dy * 3, 32 - dx * 3);
      g.closePath();
      g.fill();
    }
  });
  make(scene, VT.STREAK, 256, 32, (g) => {
    const lg = g.createLinearGradient(0, 0, 256, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.7, 'rgba(255,255,255,0.7)');
    lg.addColorStop(0.95, 'rgba(255,255,255,1)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lg;
    g.beginPath();
    g.moveTo(0, 16);
    g.quadraticCurveTo(200, 2, 256, 16);
    g.quadraticCurveTo(200, 30, 0, 16);
    g.fill();
  });
  const ring = (key: string, w: number) =>
    make(scene, key, 256, 256, (g) => {
      for (let i = 0; i < 4; i++) {
        g.strokeStyle = `rgba(255,255,255,${[0.12, 0.25, 0.55, 1][i]})`;
        g.lineWidth = w * [2.2, 1.6, 1.15, 0.6][i];
        g.beginPath();
        g.arc(128, 128, 126 - w * 1.2, 0, Math.PI * 2);
        g.stroke();
      }
    });
  ring(VT.RING, 4);
  ring(VT.RING_THICK, 14);
  make(scene, VT.CRESCENT, 256, 256, (g) => {
    // trăng khuyết mở về +x: dày ở giữa, mảnh ở hai đầu, sáng ở mép ngoài
    const img = g.createImageData(256, 256);
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const dx = x - 128, dy = y - 128;
        const d = Math.hypot(dx, dy) / 124;
        const ang = Math.atan2(dy, dx);
        if (Math.abs(ang) > 1.35) continue;
        const k = Math.cos((ang / 1.35) * (Math.PI / 2));
        const inner = 1 - 0.34 * k;
        if (d > 1 || d < inner) continue;
        const t = (d - inner) / (1 - inner);
        const a = Math.pow(t, 0.75) * Math.min(1, k * 1.8);
        const i = (y * 256 + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = Math.round(a * 255);
      }
    g.putImageData(img, 0, 0);
  });
  make(scene, VT.FLAME, 48, 72, (g) => {
    g.fillStyle = radial(g, 24, 50, 26, [[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,0.7)'], [1, 'rgba(255,255,255,0)']]);
    g.beginPath();
    g.moveTo(24, 2);
    g.bezierCurveTo(36, 26, 46, 40, 44, 54);
    g.bezierCurveTo(42, 68, 6, 68, 4, 54);
    g.bezierCurveTo(2, 40, 12, 26, 24, 2);
    g.fill();
  });
  make(scene, VT.SHARD, 16, 64, (g) => {
    const lg = g.createLinearGradient(0, 0, 16, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0.35)');
    lg.addColorStop(0.5, 'rgba(255,255,255,1)');
    lg.addColorStop(1, 'rgba(255,255,255,0.35)');
    g.fillStyle = lg;
    g.beginPath();
    g.moveTo(8, 0);
    g.lineTo(15, 40);
    g.lineTo(8, 64);
    g.lineTo(1, 40);
    g.closePath();
    g.fill();
  });
  make(scene, VT.PETAL, 32, 64, (g) => {
    const lg = g.createLinearGradient(0, 64, 0, 0);
    lg.addColorStop(0, '#ff7ab8');
    lg.addColorStop(0.6, '#ffc4e0');
    lg.addColorStop(1, '#fff4fa');
    g.fillStyle = lg;
    g.beginPath();
    g.moveTo(16, 64);
    g.bezierCurveTo(-2, 44, 2, 12, 16, 0);
    g.bezierCurveTo(30, 12, 34, 44, 16, 64);
    g.fill();
    g.strokeStyle = 'rgba(200,60,130,0.6)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(16, 60);
    g.lineTo(16, 10);
    g.stroke();
  });
  make(scene, VT.LEAF, 16, 28, (g) => {
    g.fillStyle = '#7ee08a';
    g.beginPath();
    g.moveTo(8, 0);
    g.quadraticCurveTo(18, 14, 8, 28);
    g.quadraticCurveTo(-2, 14, 8, 0);
    g.fill();
    g.strokeStyle = '#2f8a4a';
    g.beginPath();
    g.moveTo(8, 3);
    g.lineTo(8, 26);
    g.stroke();
  });
  make(scene, VT.ROCK, 16, 16, (g) => {
    g.fillStyle = '#8a7058';
    g.beginPath();
    g.moveTo(3, 5);
    g.lineTo(9, 1);
    g.lineTo(15, 6);
    g.lineTo(13, 14);
    g.lineTo(4, 15);
    g.closePath();
    g.fill();
    g.fillStyle = '#b89a7a';
    g.fillRect(6, 4, 4, 3);
  });
  make(scene, VT.SMOKE, 64, 64, (g) => {
    for (let i = 0; i < 7; i++) {
      const x = 20 + Math.cos(i * 1.7) * 12, y = 32 + Math.sin(i * 2.3) * 10, r = 14 + (i % 3) * 4;
      g.fillStyle = radial(g, x, y, r, [[0, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]);
      g.fillRect(0, 0, 64, 64);
    }
  });
  const talisman = (key: string, ink: string, paper: string) =>
    make(scene, key, 24, 44, (g) => {
      g.fillStyle = paper;
      g.fillRect(1, 1, 22, 42);
      g.strokeStyle = ink;
      g.lineWidth = 1.5;
      g.strokeRect(3, 3, 18, 38);
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(12, 7);
      g.lineTo(12, 36);
      g.moveTo(6, 12);
      g.lineTo(18, 12);
      g.moveTo(7, 20);
      g.lineTo(17, 20);
      g.moveTo(6, 28);
      g.quadraticCurveTo(12, 34, 18, 28);
      g.stroke();
      g.fillStyle = ink;
      g.beginPath();
      g.arc(12, 38, 2, 0, Math.PI * 2);
      g.fill();
    });
  talisman(VT.TALISMAN, '#c81e1a', '#f4dc9c');
  talisman(VT.TALISMAN_BLUE, '#2a4ad8', '#e8eefc');
  make(scene, VT.SWORD, 96, 24, (g) => {
    // phi kiếm mũi hướng +x
    const lg = g.createLinearGradient(0, 6, 0, 18);
    lg.addColorStop(0, '#ffffff');
    lg.addColorStop(0.5, '#c8d8f0');
    lg.addColorStop(1, '#6a7a98');
    g.fillStyle = lg;
    g.beginPath();
    g.moveTo(26, 8);
    g.lineTo(84, 8);
    g.lineTo(95, 12);
    g.lineTo(84, 16);
    g.lineTo(26, 16);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffffff';
    g.fillRect(28, 11, 54, 1);
    g.fillStyle = '#e0b040';
    g.fillRect(20, 2, 6, 20);
    g.fillStyle = '#7a1a24';
    g.fillRect(4, 9, 16, 6);
    g.fillStyle = '#e0b040';
    g.beginPath();
    g.arc(4, 12, 4, 0, Math.PI * 2);
    g.fill();
  });
  make(scene, VT.BLADE_WAVE, 128, 192, (g) => {
    const lg = g.createLinearGradient(0, 0, 128, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.7, 'rgba(255,255,255,0.75)');
    lg.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = lg;
    g.beginPath();
    g.moveTo(10, 2);
    g.quadraticCurveTo(150, 96, 10, 190);
    g.quadraticCurveTo(80, 96, 10, 2);
    g.fill();
  });
  make(scene, VT.PALM, 128, 160, (g) => {
    const lg = g.createLinearGradient(0, 0, 0, 160);
    lg.addColorStop(0, 'rgba(255,240,190,0.95)');
    lg.addColorStop(1, 'rgba(240,170,60,0.85)');
    g.fillStyle = lg;
    g.strokeStyle = 'rgba(140,80,20,0.9)';
    g.lineWidth = 3;
    g.beginPath();
    // lòng bàn tay + 4 ngón + ngón cái
    g.moveTo(26, 150);
    g.lineTo(22, 78);
    for (const [x, top] of [[30, 20], [52, 6], [74, 10], [96, 26]]) {
      g.lineTo(x - 8, top + 10);
      g.quadraticCurveTo(x, top - 6, x + 8, top + 10);
      g.lineTo(x + 8, 70);
    }
    g.lineTo(106, 74);
    g.quadraticCurveTo(126, 70, 118, 92);
    g.lineTo(102, 150);
    g.closePath();
    g.fill();
    g.stroke();
    g.strokeStyle = 'rgba(160,90,20,0.5)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(64, 112, 18, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = 'rgba(255,90,60,0.9)';
    g.beginPath();
    g.arc(64, 112, 6, 0, Math.PI * 2);
    g.fill();
  });
  make(scene, VT.SEAL, 128, 128, (g) => {
    const lg = g.createLinearGradient(0, 0, 128, 128);
    lg.addColorStop(0, '#ffe48a');
    lg.addColorStop(1, '#c8861c');
    g.fillStyle = lg;
    g.fillRect(6, 6, 116, 116);
    g.strokeStyle = '#7a4a10';
    g.lineWidth = 5;
    g.strokeRect(8, 8, 112, 112);
    g.strokeStyle = '#a8261c';
    g.lineWidth = 4;
    g.strokeRect(20, 20, 88, 88);
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(36, 40);
    g.lineTo(92, 40);
    g.moveTo(64, 30);
    g.lineTo(64, 98);
    g.moveTo(38, 68);
    g.lineTo(90, 68);
    g.moveTo(34, 96);
    g.lineTo(94, 96);
    g.stroke();
  });
  make(scene, VT.BELL, 96, 110, (g) => {
    const lg = g.createLinearGradient(0, 0, 96, 0);
    lg.addColorStop(0, '#8a5a14');
    lg.addColorStop(0.35, '#ffe08a');
    lg.addColorStop(0.6, '#e0a838');
    lg.addColorStop(1, '#7a4a10');
    g.fillStyle = lg;
    g.beginPath();
    g.moveTo(40, 12);
    g.lineTo(56, 12);
    g.quadraticCurveTo(78, 16, 80, 50);
    g.lineTo(86, 92);
    g.quadraticCurveTo(48, 104, 10, 92);
    g.lineTo(16, 50);
    g.quadraticCurveTo(18, 16, 40, 12);
    g.fill();
    g.fillStyle = '#c8861c';
    g.fillRect(42, 2, 12, 12);
    g.strokeStyle = 'rgba(90,50,10,0.7)';
    g.lineWidth = 2;
    for (const y of [40, 62, 84]) {
      g.beginPath();
      g.moveTo(16, y);
      g.quadraticCurveTo(48, y + 6, 80, y);
      g.stroke();
    }
  });
  make(scene, VT.SPIRIT, 48, 56, (g) => {
    g.fillStyle = radial(g, 24, 26, 26, [[0, 'rgba(200,255,240,0.6)'], [1, 'rgba(200,255,240,0)']]);
    g.fillRect(0, 0, 48, 56);
    g.fillStyle = '#e8fff8';
    g.beginPath();
    g.arc(24, 16, 7, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(24, 22);
    g.quadraticCurveTo(38, 26, 40, 46);
    g.quadraticCurveTo(24, 52, 8, 46);
    g.quadraticCurveTo(10, 26, 24, 22);
    g.fill();
    g.strokeStyle = '#7ae8d0';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(24, 15, 11, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
  });
  make(scene, VT.RUNES, 256, 256, (g) => {
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(128, 128, 120, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(128, 128, 104, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.95)';
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.save();
      g.translate(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112);
      g.rotate(a + Math.PI / 2);
      if (i % 3 === 0) g.fillRect(-4, -5, 8, 10);
      else if (i % 3 === 1) { g.fillRect(-1, -6, 2, 12); g.fillRect(-4, -1, 8, 2); }
      else { g.beginPath(); g.arc(0, 0, 3, 0, Math.PI * 2); g.fill(); }
      g.restore();
    }
  });
  make(scene, VT.TAIJI, 128, 128, (g) => {
    const W = '#f8f4ea', K = '#1c1830';
    g.fillStyle = W;
    g.beginPath();
    g.arc(64, 64, 60, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = K;
    g.beginPath();
    g.arc(64, 64, 60, -Math.PI / 2, Math.PI / 2);
    g.closePath();
    g.fill();
    g.fillStyle = W;
    g.beginPath();
    g.arc(64, 94, 30, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = K;
    g.beginPath();
    g.arc(64, 34, 30, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = K;
    g.beginPath();
    g.arc(64, 94, 9, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = W;
    g.beginPath();
    g.arc(64, 34, 9, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,230,160,0.9)';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(64, 64, 61, 0, Math.PI * 2);
    g.stroke();
  });
  make(scene, VT.EYE, 96, 48, (g) => {
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.beginPath();
    g.moveTo(2, 24);
    g.quadraticCurveTo(48, -10, 94, 24);
    g.quadraticCurveTo(48, 58, 2, 24);
    g.fill();
    g.fillStyle = '#9a5af0';
    g.beginPath();
    g.arc(48, 24, 13, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1a0a30';
    g.beginPath();
    g.ellipse(48, 24, 4, 11, 0, 0, Math.PI * 2);
    g.fill();
  });
  make(scene, VT.CLAW, 128, 128, (g) => {
    g.fillStyle = '#fff';
    for (const off of [-26, 0, 26]) {
      g.beginPath();
      g.moveTo(30 + off, 6);
      g.quadraticCurveTo(70 + off, 64, 34 + off, 122);
      g.quadraticCurveTo(58 + off, 64, 30 + off, 6);
      g.fill();
    }
  });
  make(scene, VT.ARROW, 64, 16, (g) => {
    g.fillStyle = '#c8905a';
    g.fillRect(8, 7, 44, 2);
    g.fillStyle = '#e8f0ff';
    g.beginPath();
    g.moveTo(52, 2);
    g.lineTo(64, 8);
    g.lineTo(52, 14);
    g.closePath();
    g.fill();
    g.fillStyle = '#b8ffd0';
    g.beginPath();
    g.moveTo(0, 2);
    g.lineTo(14, 7);
    g.lineTo(4, 7);
    g.moveTo(0, 14);
    g.lineTo(14, 9);
    g.lineTo(4, 9);
    g.fill();
  });
  make(scene, VT.FAN_BLADE, 48, 48, (g) => {
    g.fillStyle = radial(g, 24, 24, 24, [[0, 'rgba(255,255,255,1)'], [0.6, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
    g.beginPath();
    g.moveTo(6, 4);
    g.quadraticCurveTo(50, 24, 6, 44);
    g.quadraticCurveTo(28, 24, 6, 4);
    g.fill();
  });
  make(scene, VT.DRAGON, 48, 32, (g) => {
    // đầu rồng nhìn ngang (hướng +x)
    g.fillStyle = '#ffd040';
    g.beginPath();
    g.moveTo(2, 16);
    g.quadraticCurveTo(14, 2, 30, 6);
    g.lineTo(46, 12);
    g.lineTo(36, 16);
    g.lineTo(46, 22);
    g.lineTo(30, 26);
    g.quadraticCurveTo(14, 30, 2, 16);
    g.fill();
    g.strokeStyle = '#fff4b0';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(18, 6);
    g.lineTo(10, 0);
    g.moveTo(22, 6);
    g.lineTo(18, -2);
    g.stroke();
    g.fillStyle = '#c81e1a';
    g.beginPath();
    g.arc(28, 12, 2.4, 0, Math.PI * 2);
    g.fill();
  });
  make(scene, VT.ORB, 32, 32, (g) => {
    g.fillStyle = radial(g, 16, 16, 16, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.9)'], [0.55, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]);
    g.fillRect(0, 0, 32, 32);
  });
  make(scene, VT.CRACK, 128, 24, (g) => {
    g.strokeStyle = '#fff';
    g.lineCap = 'round';
    let y = 12;
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 12; x <= 128; x += 12) {
      y = 12 + (Math.sin(x * 1.7) * 6);
      g.lineTo(x, y);
      g.lineWidth = Math.max(1, 4 - x / 40);
    }
    g.stroke();
  });
  make(scene, VT.DUMMY, 32, 48, (g) => {
    g.fillStyle = '#5a3a24';
    g.fillRect(14, 30, 4, 18);
    g.fillStyle = '#b8864a';
    g.beginPath();
    g.ellipse(16, 22, 11, 13, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#d8a86a';
    g.beginPath();
    g.arc(16, 8, 7, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#7a1a24';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(16, 22, 6, 0, Math.PI * 2);
    g.stroke();
    g.fillRect(4, 18, 24, 3);
  });
}
