# Vạn Giới Tầm Quang

Game roguelike survival chạy trên trình duyệt (phong cách Vampire Survivors), bối cảnh tiên hiệp, nhân vật **Cố Trường Ca** (cốt truyện nguyên bản).
Thiết kế đầy đủ nằm trong `GDD.md`.

**Trạng thái: bản hoàn chỉnh khung game đến end game.** 6 thế giới × 10 màn, 66 loại quái, 60 boss, 13 kỹ năng chủ động, 11 kỹ năng bị động, 6 kỹ năng vũ khí, 17 đại cảnh giới (Đạo Tổ không chia kỳ, 49 bậc, có Viên mãn), trang bị 5 ô, luyện đan, luyện khí, lưu tiến trình.
Giao diện (màn nạp, menu, Lobby), nhân vật chính và ảnh nền tông môn là **pixel art thật** vẽ bằng code với công cụ pxl (miễn phí). Quái, đạn, nền trận và âm thanh vẫn là **đồ tạm** (hình vẽ bằng code, tiếng tổng hợp bằng WebAudio). Con số cân bằng là **ước lượng**, cần bạn chơi thử rồi chỉnh.

## Yêu cầu

- [Node.js](https://nodejs.org) 18 trở lên (`node -v`)

## Chạy game

```bash
npm install        # chỉ cần một lần
npm run dev        # mở địa chỉ hiện ra (thường http://localhost:5173)
```

Thử trên điện thoại (cùng mạng Wi-Fi): `npm run dev -- --host`, mở địa chỉ `http://192.168.x.x:5173` trên điện thoại.

```bash
npm run build      # kiểm tra TypeScript + đóng gói bản chạy thật vào dist/
npm run preview    # chạy thử bản đã đóng gói
```

## Cách chơi

| | |
|---|---|
| Di chuyển | `WASD` / phím mũi tên / chạm kéo (điện thoại) |
| Tạm dừng | `Esc` hoặc `P` hoặc nút "Tạm dừng" |
| Chọn thẻ khi lên cấp | Bấm vào thẻ, hoặc phím `1` `2` `3` |
| Hội thoại | Bấm / `Space` / `Enter`, nút "Bỏ qua" |

**Vòng lặp:** Hub (chọn màn, tu luyện, luyện đan, luyện khí, trang bị, kỹ năng) → hội thoại → trận đấu (hết giờ thì boss xuất hiện, hạ boss là thắng) → thưởng tu vi, linh thạch, nguyên liệu, trang bị → quay về Hub.
Thua: giữ 30% linh thạch nhặt được, không nhận tu vi. Tiến trình tự lưu vào `localStorage` của trình duyệt (nút xóa nằm ở menu chính).

Quy tắc trong màn: tối đa **6 kỹ năng** (tính cả kỹ năng vũ khí). Kỹ năng chủ động đạt cấp 5 + đã có bị động liên kết → lần chọn thẻ kế tiếp chắc chắn có thẻ **thức tỉnh**.

## Chỉnh nội dung (không cần đụng logic)

| Muốn chỉnh | Sửa file |
|---|---|
| Độ khó, tốc độ sinh quái, XP, hệ số thế giới | `src/config/balance.ts` |
| Chỉ số gốc từng kiểu quái, thêm / đổi tên quái | `src/config/enemies.ts` |
| Tên boss, chiêu thức boss, chỉ số boss | `src/config/bosses.ts` |
| Kỹ năng vũ khí / chủ động / bị động | `src/config/weapons.ts`, `activeSkills.ts`, `passiveSkills.ts` |
| Cảnh giới, tu vi cần thiết, độ khó tu luyện (`CULTIVATION`: bình cảnh, % tu vi từ màn) | `src/config/realms.ts` |
| Trang bị, độ hiếm, đan dược, bí bảo | `src/config/items.ts` |
| Số màn, thưởng, điều kiện mở thế giới | `src/config/worlds.ts` |
| **Lời thoại cốt truyện** | `src/config/story.ts` (bảng `OVERRIDES` theo id màn như `w1s1`) |
| Giao diện (màu, bố cục) | `src/ui/styles.css` |
| Pixel art (nhân vật, ảnh nền, icon) | `tools/art/*.px.js` → xem mục **Vẽ lại pixel art** |

Thêm kỹ năng mới = thêm một khối dữ liệu, chọn `kind` có sẵn (projectile, slash, beam, nova, orbit, aura, strike, boomerang, heal).
Thêm kiểu hành vi quái mới = thêm một `case` trong `EnemyManager.think()`.

## Gỡ lỗi / kiểm thử

Bản dev (hoặc thêm `?debug` vào địa chỉ) có đối tượng `__vls` trong console và nút **Chế độ TEST** (mở khóa tất cả) ở menu chính:

```js
__vls.grant({ tier: 12, linh: 1e6, mats: 99, clearAll: true }) // cấp tài nguyên / mở khóa
__vls.start('w3s5')       // vào thẳng một màn
__vls.autoplay(true)      // bot tự chơi + tự chọn thẻ
__vls.god(true)           // bất tử
__vls.skipToBoss()        // nhảy tới lúc boss xuất hiện
__vls.step(900, 1/30)     // chạy nhanh 900 bước mô phỏng (30 giây)
__vls.state()             // xem trạng thái hiện tại
```

## Cấu trúc thư mục

```
src/
├── main.ts                # Khởi tạo Phaser + GameFlow
├── debug.ts               # API gỡ lỗi __vls (bot, step...)
├── config/                # TOÀN BỘ dữ liệu game (xem bảng trên)
├── flow/GameFlow.ts       # Điều phối: menu → hub → hội thoại → trận → kết quả
├── scenes/
│   ├── BootScene.ts       # Tự vẽ hình tạm thành texture
│   └── GameScene.ts       # Một lượt chơi; hàm step(dt) chạy theo thứ tự cố định
├── entities/              # Player, Enemy (dữ liệu quái dùng object pool)
├── systems/
│   ├── EnemyManager.ts    # Sinh, di chuyển, nhận sát thương, rơi đồ (10 kiểu hành vi)
│   ├── BossAI.ts          # 6 chiêu boss + báo trước + giai đoạn 2
│   ├── Spawner.ts         # Nhịp sinh quái, tinh anh, vây hãm, boss
│   ├── SkillSystem.ts     # Tự thi triển kỹ năng theo từng `kind`
│   ├── CardPicker.ts      # Quy tắc thẻ lên cấp + thức tỉnh
│   ├── RunState.ts        # Cấp, XP, kỹ năng đang có, tính lại chỉ số
│   ├── Projectiles.ts / Pickups.ts / Fx.ts / FloatingText.ts / SpatialGrid.ts
│   ├── progression/       # Tiến trình vĩnh viễn (không phụ thuộc Phaser); quests.ts = nhiệm vụ
│   │   ├── save.ts        #   Cấu trúc save, localStorage, nâng cấp save cũ, xuất / nhập
│   │   ├── stats.ts       #   Chỉ số tổng hợp (cảnh giới + trang bị + đan)
│   │   ├── cultivation.ts #   Cảnh giới, đột phá, luyện đan, kỹ năng mang theo
│   │   ├── inventory.ts   #   Trang bị, luyện khí, cường hóa, phân giải, tái luyện
│   │   ├── worldProgress.ts # Mở khóa thế giới / màn
│   │   ├── rewards.ts     #   Thưởng sau màn
│   │   └── cheats.ts      #   Công cụ gỡ lỗi (grant, mở khóa tất cả)
│   └── Audio.ts           # Âm thanh tạm (WebAudio)
├── input/                 # Bàn phím + joystick
├── ui/                    # Giao diện HTML: styles.css, dom.ts (h, modal, sprite nhân vật)
│   └── screens/           #   MainMenu, Hub (Lobby), Settings, Dialogue, GameHud, Result
└── utils/                 # format.ts (định dạng số), env.ts (isDebugMode)
```

## Các quyết định kỹ thuật chính

- **TypeScript + Vite + Phaser 3.** Phaser lo vòng lặp, camera, vẽ; TypeScript bắt lỗi sớm khi dữ liệu phình to.
- **Dữ liệu tách khỏi logic.** Quái = kiểu hành vi + bảng số liệu; kỹ năng = `kind` + số liệu; boss = danh sách chiêu. Thêm nội dung chủ yếu là thêm dữ liệu.
- **Giao diện bằng HTML/CSS đè lên canvas** (không dùng UI của Phaser): chữ tiếng Việt rõ nét, dễ chỉnh CSS, hợp với kiến thức web của bạn, cuộn / bấm tốt trên điện thoại.
- **Không dùng vật lý Arcade cho quái.** Di chuyển và va chạm tính thủ công + lưới không gian (`SpatialGrid`) + object pool → chạy đủ 260 quái cùng lúc mà mỗi bước mô phỏng chỉ tốn ~0,1 ms trong test.
- **Toàn bộ mô phỏng nằm trong `GameScene.step(dt)`** nên chạy nhanh / kiểm thử tự động được (bot test chơi trọn 60 màn).
- **Tốc độ không phụ thuộc FPS:** tắt `fps.smoothStep`, `fps.min = 20`, và giới hạn bước thời gian tối đa 50 ms.
- **Lưu bằng `localStorage`** (khóa `vo-luyen-survival-save`, có số phiên bản để sau này nâng cấp cấu trúc lưu).
- **Hình ảnh gọi qua khóa trong `config/assets.ts`.** Nhân vật chính đã là spritesheet thật (`public/ui/hero_walk.png`, nạp trong `BootScene.preload`); hình tạm còn lại thay bằng cách nạp ảnh cùng khóa.

## Những gì cần bạn xem lại

- **Cân bằng:** bot chỉ kiểm tra game *chạy được*, không thay thế người chơi. Hãy chơi thử và chỉnh `balance.ts` (máu / sát thương theo thế giới, tốc độ sinh quái, XP).
- **Cốt truyện:** lời thoại hiện là văn bản mẫu tự sinh theo màn.
- **Tên boss phụ và tên quái** là tên tạm (boss chính theo danh sách của bạn).
- **Hình ảnh / âm thanh:** quái, đạn, nền trận, âm thanh vẫn là đồ tạm.

## Vẽ lại pixel art

Mọi hình pixel art nằm dưới dạng **code** trong `tools/art/` (công cụ pxl, chạy bằng Node 22, miễn phí, không cần phần mềm vẽ):

| File | Vẽ gì | Xuất ra (chép vào `public/ui/`) |
|---|---|---|
| `hero.px.js` | Cố Trường Ca: dáng đứng (thở), đi bộ trong trận, ngồi thiền (Tu Luyện). Khung gốc lấy từ ảnh concept qua `trace_hero.py` → `hero_trace.px.js` | `out/anims/hero_full.png`, `hero_walk.png`, `hero_meditate.png` |
| `sect_bg.px.js` | Ảnh nền Vân Hạc Tông: bản dọc 9:16 (điện thoại) + bản ngang 16:9 (PC) | `out/scenes/sect_tall.png`, `sect_wide.png` |
| `icons.px.js` | Icon, con dấu, khung viền vàng 9 mảnh (`frame_panel`, `frame_on`) | `out/sprites/*.png` |
| `gear.px.js` | 66 hình ô đồ (6 vũ khí 66x66; y phục, giày, trang sức 50x50 × 6 cấp; 12 bí bảo 50x50) + hình cầm tay `wp_*_held_*` (dải 8 khung có hoạt ảnh) và găng quyền sáo `wp_fist_near/far_*` | `out/sprites/*.png` + `out/anims/*.png` → `public/gear/` (tăng `GEAR_ART_V` trong `src/config/items.ts` khi vẽ lại; điểm cầm ở `WEAPON_HOLD`) |

Đổi ảnh concept nhân vật: thay `tools/art/ref/hero_concept.png` rồi chạy `python3 -I tools/art/trace_hero.py` (cần Python + Pillow + numpy) trước khi build.

```bash
node <thư-mục-pxl>/bin/pxl.js build tools/art/hero.px.js   # ảnh xem trước phóng to nằm ở tools/art/out/_preview/
```

Truyền Tống Trận (cổng xoáy) trên ảnh nền là nút vào chọn màn: tọa độ tâm cổng nằm ở `TALL.portal` / `WIDE.portal` trong `sect_bg.px.js` **và** `SECT` trong `src/ui/screens/Hub.ts`. Đổi bố cục ảnh thì sửa cả hai.

## Lịch sử phiên bản

Xem [`CHANGELOG.md`](CHANGELOG.md).
