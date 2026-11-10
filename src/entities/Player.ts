import Phaser from 'phaser';
import { BASE_PLAYER_STATS, PLAYER_RADIUS, type PlayerStats } from '../config/game';
import { RUN } from '../config/balance';
import { PLAYER_DIRS, PLAYER_FRAME, PLAYER_SHEET_COLS, PLAYER_WALK_FRAMES, TEX, playerWalkAnim, type PlayerDir } from '../config/assets';
import { BATTLE_ANCHOR_OVERRIDE, BATTLE_FRONT_OVERRIDE, BATTLE_SPLIT, BATTLE_WEAPON, NO_HAND_COVER, battleWeaponKey, fistKey } from '../config/heroBattle';
import { HERO_HANDS } from '../config/heroHands';

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

  /** Vũ khí cầm tay phải (chỉ là ngoại hình, không ảnh hưởng chỉ số) + găng quyền sáo hai tay */
  private weaponImg: Phaser.GameObjects.Image | null = null;
  /** nửa sau (phía đốc) của vũ khí dài — luôn vẽ sau thân */
  private weaponBack: Phaser.GameObjects.Image | null = null;
  private weaponId = '';
  /** Nắm tay phải cắt từ chính khung nhân vật, vẽ ĐÈ lên chuôi vũ khí → nhìn ra tay đang nắm */
  private handCover: Phaser.GameObjects.Image | null = null;
  private fists: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.PLAYER, PLAYER_WALK_FRAMES);
    scene.add.existing(this);
    // Sprite 52x68 vẽ 1:1 (chân ở hàng 64); gốc hơi thấp để thân (vùng va chạm) nằm giữa, chân chạm "đất"
    this.setDepth(10).setOrigin(0.5, 0.62);
  }

  /** Đặt ngoại hình vũ khí theo loại + cấp (quyền sáo: găng hai tay) */
  setWeaponLook(weaponId: string, tier: number): void {
    this.weaponId = weaponId;
    if (weaponId === 'wp_fist') {
      this.fists = (['near', 'far'] as const).map((hand) => this.scene.add.image(this.x, this.y, fistKey(hand, tier)));
      return;
    }
    if (!BATTLE_WEAPON[weaponId]) return;
    const key = battleWeaponKey(weaponId, tier);
    if (BATTLE_SPLIT.has(weaponId)) {
      if (!this.scene.textures.exists(key + '_f')) return;
      this.weaponImg = this.scene.add.image(this.x, this.y, key + '_f', 0);
      this.weaponBack = this.scene.add.image(this.x, this.y, key + '_k', 0);
    } else if (this.scene.textures.exists(key)) this.weaponImg = this.scene.add.image(this.x, this.y, key, 0);
    if (this.weaponImg) this.handCover = this.scene.add.image(this.x, this.y, TEX.PLAYER, PLAYER_WALK_FRAMES);
  }

  /** Đặt vũ khí / găng vào đúng bàn tay theo hướng và khung bước hiện tại (gọi mỗi khung hình) */
  syncWeapon(): void {
    const hands = HERO_HANDS[this.face];
    const col = this.anims.isPlaying ? Math.max(0, (this.anims.currentFrame?.index ?? 1) - 1) : PLAYER_WALK_FRAMES;
    const left = this.x - this.originX * PLAYER_FRAME.w;
    const top = this.y - this.originY * PLAYER_FRAME.h;
    const alpha = this.dead ? 0 : this.alpha;
    if (this.weaponImg) {
      // khung = hướng (cùng thứ tự PLAYER_DIRS); điểm cầm ở giữa khung → gốc 0.5, 0.5 đặt vào bàn tay
      const [hx, hy] = hands.R[col];
      const fi = PLAYER_DIRS.indexOf(this.face);
      // điểm đặt: bàn tay, hoặc điểm riêng (tay khuất) + độ lệch nhún / vung của tay ở khung này
      const anc = BATTLE_ANCHOR_OVERRIDE[this.weaponId]?.[this.face];
      const rest = hands.R[PLAYER_WALK_FRAMES];
      const ax = anc ? anc[0] + hx - rest[0] : hx, ay = anc ? anc[1] + hy - rest[1] : hy;
      const front = BATTLE_FRONT_OVERRIDE[this.weaponId]?.[this.face] ?? hands.front;
      this.weaponImg.setFrame(fi).setOrigin(0.5, 0.5)
        .setPosition(left + ax + 0.5, top + ay + 0.5).setDepth(this.depth + (front ? 1 : -1)).setAlpha(alpha);
      this.weaponBack?.setFrame(fi).setOrigin(0.5, 0.5).setPosition(left + ax + 0.5, top + ay + 0.5).setDepth(this.depth - 1).setAlpha(alpha);
      // nắm tay đè lên chuôi (chỉ khi vũ khí ở trước thân và đặt đúng bàn tay)
      if (this.handCover) {
        const show = front && !anc && !NO_HAND_COVER.has(this.weaponId);
        this.handCover.setVisible(show);
        if (show) {
          this.handCover.setFrame(this.frame.name).setOrigin(this.originX, this.originY).setPosition(this.x, this.y)
            .setCrop(hx - 3, hy - 3, 7, 7).setDepth(this.depth + 2).setAlpha(alpha);
        }
      }
    }
    if (this.fists.length) {
      // tay phải luôn đeo (khuất sau thân khi ở phía xa); tay trái ẩn khi khuất hẳn
      const [nr, fr] = this.fists;
      const [rx, ry] = hands.R[col];
      nr.setPosition(left + rx + 0.5, top + ry + 0.5).setDepth(this.depth + (hands.front ? 1 : -1)).setAlpha(alpha);
      if (hands.L) {
        const [lx, ly] = hands.L[col];
        fr.setVisible(true).setPosition(left + lx + 0.5, top + ly + 0.5).setDepth(this.depth + 1).setAlpha(alpha);
      } else fr.setVisible(false);
    }
  }

  destroy(fromScene?: boolean): void {
    this.weaponImg?.destroy();
    this.weaponImg = null;
    this.weaponBack?.destroy();
    this.weaponBack = null;
    this.handCover?.destroy();
    this.handCover = null;
    for (const f of this.fists) f.destroy();
    this.fists = [];
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
