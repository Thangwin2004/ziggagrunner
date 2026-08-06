# Lạc Bước Zigzag (Zigzag Runner)

Một tựa game chạy vô tận (Endless Runner) góc nhìn Isometric 3D, được phát triển bằng **Three.js** cho đồ họa 3D và **HTML/CSS DOM Overlay** cho giao diện UI.

## Tính Năng Nổi Bật
- **Lối chơi Zigzag:** Chạm hoặc click để đổi hướng nhân vật (chạy chéo theo trục X hoặc Z). Nếu chạy chệch khỏi đường băng sẽ rơi xuống và Game Over.
- **Tạo màn hình ngẫu nhiên (Procedural Generation):** Đường băng (Path) được sinh ra liên tục và ngẫu nhiên theo hình zigzag, kết hợp với các đồng tiền (Coins) để thu thập.
- **Hệ thống Audio Kịch Tính:** 
  - m thanh bước chân và nhún nhảy được đồng bộ.
  - Tốc độ phát của BGM và SFX (Playback Rate) tăng dần theo tốc độ game, tạo cảm giác gấp gáp và kích thích tột độ.
- **Hồi sinh (Revive):** Có cơ chế xem quảng cáo (AdManager giả lập) để hồi sinh, với hiệu ứng nhân vật rơi từ trên không xuống cực kỳ đẹp mắt sử dụng GSAP.
- **Giao diện HTML Overlay:** UI 2D (Bảng xếp hạng, Nút bấm, Điểm số) được render hoàn toàn bằng HTML/CSS đè lên trên Canvas 3D để đảm bảo chữ cực kỳ sắc nét trên Mobile và tiết kiệm hiệu năng.

## Kiến Trúc & Công Nghệ
- **Engine:** Three.js (WebGL)
- **Animation:** Mixamo (Skeletal Animation), GSAP 3 (cho UI và Tween)
- **Kiến trúc Dual-Scene:** Tách biệt `scene` 3D (gameplay) và UI HTML/CSS DOM overlays (hoặc Scene UI nếu cần thiết).
- **Phân tách Logic:** Game được chia thành các hệ thống rõ ràng: `GameManager`, `LevelBuilder`, `PhysicsSystem`, `Player`, `UIManager` và `AudioManager`.

## Cài Đặt & Chạy Game
1. Mở terminal tại thư mục này (`zigzag-runner`).
2. Cài đặt các gói phụ thuộc:
   ```bash
   pnpm install
   ```
3. Chạy server phát triển:
   ```bash
   pnpm run dev
   ```
4. Build bản production:
   ```bash
   pnpm run build
   ```
