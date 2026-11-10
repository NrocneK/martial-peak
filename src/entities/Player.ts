import Phaser from 'phaser';
import { BASE_PLAYER_STATS, PLAYER_RADIUS, type PlayerStats } from '../config/game';
import { RUN } from '../config/balance';
import { PLAYER_DIRS, PLAYER_SHEET_COLS, PLAYER_WALK_FRAMES, TEX, playerWalkAnim, type PlayerDir } from '../config/assets';

/**
 * Nhân vật chính (Cố Trường Ca).
 * Di chuyển và va chạm được tính thủ công (không dùng Arcade Physics) để logic chạy ổn định
 * theo từng bước thời gian, dễ kiểm thử, và nhẹ khi có hàng trăm quái.
 */
export class Player extends Phaser.GameObjects.Sprite {
  stats: PlayerStats = { ...BASE_PLAYER_STATS };
  hp = this.stats.maxHp;
  /** Thời gian bất tử còn lại sau khi bị đánh (giây) */
  invuln = 0;
  dead = false;
  /** Chế độ bất tử khi gỡ lỗi */
  god = false;
  readonly r = PLAYER_RADIUS;
  /** Hướng đang nhìn / di chuyển (radian), dùng để chĩa vũ khí khi không có mục tiêu */
  heading = 0;
  /** Số lần bị đánh trong màn (thống kê) */
  hurtCount = 0;
  /** Lá chắn hấp thụ sát thương (bí bảo Hư Tịch Chi Tâm) và thời gian còn lại */
  shield = 0;
  shieldT = 0;
  /** Gọi mỗi khi thật sự nhận sát thương (cho bí bảo) */
  onHit: (() => void) | null = null;

  /** Hướng sprite đang quay (8 hướng) */
  private face: PlayerDir = 's';

  /** Hình vũ khí đang cầm (chỉ là ngoại hình, không ảnh hưởng chỉ số) */
  private weaponImg: Phaser.GameObjects.Image | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.PLAYER, PLAYER_WALK_FRAMES);
    scene.add.existing(this);
    // Sprite 52x68 vẽ 1:1 (chân ở hàng 64); gốc hơi thấp để thân (vùng va chạm) nằm giữa, chân chạm "đất"
    this.setDepth(10).setOrigin(0.5, 0.62);
  }

  /** Đặt ngoại hình vũ khí theo loại vũ khí và màu phẩm chất */
  setWeaponLook(weaponId: string, color: number): void {
    const key = TEX.WEAPON + weaponId;
    if (!this.scene.textures.exists(key)) return;
    if (!this.weaponImg) this.weaponImg = this.scene.add.image(this.x, this.y, key).setDepth(11);
    this.weaponImg.setTexture(key).setTint(color).setScale(0.8);
  }

  /** Cập nhật vị trí vũ khí: lơ lửng cạnh người, chĩa về phía `aim` (radian) */
  syncWeapon(aim: number): void {
    if (!this.weaponImg) return;
    this.weaponImg.setPosition(this.x + Math.cos(aim) * 22, this.y + Math.sin(aim) * 22).setRotation(aim);
    this.weaponImg.setAlpha(this.dead ? 0 : 1);
  }

  destroy(fromScene?: boolean): void {
    this.weaponImg?.destroy();
    this.weaponImg = null;
    super.destroy(fromScene);
  }

  /** Gán bộ chỉ số mới. Giữ nguyên tỉ lệ máu hiện tại (không hồi đầy / không mất máu khi nhặt thẻ). */
  applyStats(s: PlayerStats): void {
    const ratio = this.stats.maxHp > 0 ? this.hp / this.stats.maxHp : 1;
    this.stats = { ...s };
    this.hp = Math.min(s.maxHp, Math.max(1, ratio * s.maxHp));
  }

  /** Di chuyển theo hướng `dir` (độ dài 0..1) trong `dt` giây. */
  move(dir: Phaser.Math.Vector2, dt: number): void {
    const sp = this.stats.moveSpeed;
    this.x += dir.x * sp * dt;
    this.y += dir.y * sp * dt;
    // Đi: quay về 1 trong 8 hướng theo đường đi và chạy hoạt ảnh bước của hướng đó; đứng yên: khung đứng của hướng cuối
    if (dir.lengthSq() > 0.0001) {
      this.heading = Phaser.Math.Angle.RotateTo(this.heading, dir.angle(), 0.3);
      // góc màn hình: 0 = phải (E), tăng theo chiều kim đồng hồ (y hướng xuống)
      const sector = (Math.round(dir.angle() / (Math.PI / 4)) + 8) % 8;
      const face = (['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'] as const)[sector];
      if (face !== this.face || !this.anims.isPlaying) {
        this.face = face;
        this.play(playerWalkAnim(face), true);
      }
    } else if (this.anims.isPlaying) {
      this.stop();
      this.setFrame(PLAYER_DIRS.indexOf(this.face) * PLAYER_SHEET_COLS + PLAYER_WALK_FRAMES);
    }
  }

  tick(dt: number): void {
    if (this.dead) return;
    if (this.shieldT > 0 && (this.shieldT -= dt) <= 0) this.shield = 0;
    if (this.invuln > 0) {
      this.invuln -= dt;
      this.setAlpha(Math.floor(this.invuln * 20) % 2 === 0 ? 0.45 : 1);
      if (this.invuln <= 0) this.setAlpha(1);
    }
    if (this.stats.regen > 0 && this.hp < this.stats.maxHp) this.heal(this.stats.maxHp * this.stats.regen * dt);
  }

  /** Nhận sát thương. Trả về lượng máu thực sự bị trừ (0 nếu đang bất tử). */
  takeDamage(raw: number): number {
    if (this.dead || this.invuln > 0 || this.god) return 0;
    const a = this.stats.armor;
    let dmg = Math.max(1, raw * (1 - a / (a + 100)));
    if (this.shield > 0) {
      const absorb = Math.min(this.shield, dmg);
      this.shield -= absorb;
      dmg -= absorb;
    }
    this.hp -= dmg;
    this.invuln = RUN.hitInvuln;
    this.hurtCount++;
    this.setTint(0xff6060);
    this.scene.time.delayedCall(90, () => this.clearTint());
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
    this.onHit?.();
    return dmg;
  }

  heal(n: number): void {
    this.hp = Math.min(this.stats.maxHp, this.hp + n);
  }
}
