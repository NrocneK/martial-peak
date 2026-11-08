import Phaser from 'phaser';

interface FText {
  t: Phaser.GameObjects.Text;
  life: number;
  vy: number;
}

/** Số sát thương bay lên. Dùng pool cố định để không tạo đối tượng liên tục. */
export class FloatingText {
  private readonly pool: FText[] = [];
  enabled = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly max = 40,
  ) {}

  show(x: number, y: number, text: string, color = '#ffffff', size = 14): void {
    if (!this.enabled) return;
    let f = this.pool.find((p) => p.life <= 0);
    if (!f) {
      if (this.pool.length >= this.max) return; // hết chỗ thì bỏ qua, không sao
      const t = this.scene.add
        .text(0, 0, '', {
          fontFamily: '"Segoe UI", Roboto, Arial, sans-serif',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setDepth(50)
        .setOrigin(0.5);
      f = { t, life: 0, vy: 0 };
      this.pool.push(f);
    }
    f.t.setText(text).setColor(color).setFontSize(size).setPosition(x, y).setAlpha(1).setVisible(true);
    f.life = 0.6;
    f.vy = -50;
  }

  update(dt: number): void {
    for (const f of this.pool) {
      if (f.life <= 0) continue;
      f.life -= dt;
      f.t.y += f.vy * dt;
      f.t.setAlpha(Math.max(0, f.life / 0.6));
      if (f.life <= 0) f.t.setVisible(false);
    }
  }

  clear(): void {
    for (const f of this.pool) {
      f.life = 0;
      f.t.setVisible(false);
    }
  }
}
