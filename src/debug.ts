import Phaser from 'phaser';
import type { GameScene } from './scenes/GameScene';
import { SCENES } from './config/assets';
import * as Prog from './systems/progression';
import { debugGrant } from './systems/progression';

/**
 * API gỡ lỗi `window.__vls` — chỉ bật ở chế độ dev hoặc khi URL có `?debug`.
 * Dùng để kiểm thử tự động (bot tự chơi, chạy nhanh thời gian, nhảy tới boss...).
 */
export function installDebug(game: Phaser.Game): void {
  const scene = (): GameScene => game.scene.getScene(SCENES.GAME) as GameScene;
  const v = new Phaser.Math.Vector2();

  /** Bot đơn giản: tránh quái đông, đi vòng tròn, ưu tiên hướng ra xa cụm quái */
  const bot = (s: GameScene): Phaser.Math.Vector2 => {
    let fx = 0;
    let fy = 0;
    for (const e of s.enemies.list) {
      if (!e.active) continue;
      const dx = s.player.x - e.x;
      const dy = s.player.y - e.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > 280 * 280 || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const w = (e.isBoss ? 3 : 1) / d;
      fx += (dx / d) * w;
      fy += (dy / d) * w;
    }
    // Khi an toàn: đi nhặt hạt XP gần nhất
    const g = s.pickups.nearest(s.player.x, s.player.y, 350);
    if (g) {
      const dx = g.x - s.player.x;
      const dy = g.y - s.player.y;
      const d = Math.hypot(dx, dy) || 1;
      fx += (dx / d) * 0.012;
      fy += (dy / d) * 0.012;
    }
    // Thêm thành phần xoay tròn để không bị dồn vào góc
    const t = s.run.time * 0.6;
    fx += Math.cos(t) * 0.004;
    fy += Math.sin(t) * 0.004;
    v.set(fx, fy);
    if (v.lengthSq() < 1e-9) return v.set(0, 0);
    return v.normalize();
  };

  /** Chọn thẻ "khôn" cho bot: thức tỉnh > chủ động > vũ khí > bị động */
  const smartPick = (s: GameScene): number => {
    const rank: Record<string, number> = { awaken: 0, active: 1, weapon: 2, passive: 3, heal: 4, linh: 5 };
    let bi = 0;
    s.cards.forEach((c, i) => {
      if (rank[c.kind] < rank[s.cards[bi].kind]) bi = i;
    });
    return bi;
  };

  const api = {
    game,
    get scene() {
      return scene();
    },
    /** Bắt đầu một màn (chuyển scene) */
    start(stageId = 'w1s1') {
      if (game.scene.isActive(SCENES.GAME)) game.scene.stop(SCENES.GAME);
      game.scene.start(SCENES.GAME, { stageId });
    },
    /** Bật / tắt bot, tự chọn thẻ ngẫu nhiên khi lên cấp */
    autoplay(on = true) {
      const s = scene();
      s.botInput = on ? bot : null;
      game.events.off('levelup', api._pick);
      if (on) game.events.on('levelup', api._pick);
    },
    _pick() {
      const s = scene();
      // chọn trễ một nhịp để giống người chơi thật (và để UI kịp vẽ)
      setTimeout(() => s.pickCard(smartPick(s)), 0);
    },
    /** Chạy n bước mô phỏng, mỗi bước dt giây (mặc định 1/30). Tự chọn thẻ nếu bot bật. */
    step(n = 1, dt = 1 / 30) {
      const s = scene();
      for (let i = 0; i < n; i++) {
        if (s.status === 'levelup' && s.botInput) s.pickCard(smartPick(s));
        s.step(dt);
        if (s.status === 'ended') break;
      }
      return s.hudState();
    },
    god(on = true) {
      scene().player.god = on;
    },
    skipToBoss() {
      const s = scene();
      s.run.time = s.stage.duration - 0.1;
    },
    state() {
      const s = scene();
      return {
        ...s.hudState(),
        enemies: s.enemies.alive,
        bullets: s.proj.enemyBulletCount,
        px: s.player.x,
        py: s.player.y,
        pendingLevels: s.run.pendingLevels,
      };
    },
    grant: debugGrant,
    prog: Prog,
  };
  (window as unknown as { __vls: typeof api }).__vls = api;
}
