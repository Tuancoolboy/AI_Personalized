# Học Tập Team Room — Map Đua Vịt Sau Khi Kết Thúc Quiz

## Summary

- Thêm option chọn `Bản đồ` khi tạo phòng team: `Classic` hoặc `Đua vịt`.
- `Classic` giữ nguyên toàn bộ flow hiện tại.
- `Đua vịt` áp dụng cho mọi loại phòng đang có trong màn tạo phòng: quiz có sẵn và AI project room.
- Trong suốt lúc chơi quiz, flow vẫn giữ nguyên như hiện tại: `waiting -> question -> reveal -> leaderboard`.
- Chỉ sau khi kết thúc toàn bộ session, nếu phòng dùng `Đua vịt` thì thay panel kết thúc hiện tại bằng:
  1. cảnh đua vịt tổng kết theo điểm tích lũy của cả session
  2. leaderboard chung cuộc ngay bên dưới
- Leaderboard XP tổng của `/hoc-tap` và các luồng quiz cá nhân hiện có không đổi.

## Key Changes

### 1. Room contract và persistence

- Thêm field `mapTheme: "classic" | "duck-race"` vào room contract.
- Giữ `mode` hiện có cho semantics gameplay tương lai; không đổi meaning của `team-battle`.
- Cập nhật các type và payload:
  - `HocTapRoomCreateInput`
  - `HocTapRoomSnapshot`
  - `HocTapPublicRoom`
  - client API create/fetch room
  - route parser/serializer
  - memory store
  - Supabase room service
- Bổ sung migration thêm cột `map_theme` vào `public.hoc_tap_rooms`, default `classic`, not null, check constraint cho `classic` hoặc `duck-race`.
- Cập nhật preview payload để trả về `map_theme` đồng nhất với runtime memory.

### 2. Màn tạo phòng

- Trong `Chơi với team`, thêm segmented control `Bản đồ` với 2 lựa chọn:
  - `Classic`
  - `Đua vịt`
- Default luôn là `Classic` để không phá flow cũ.
- Option này xuất hiện cho cả:
  - tạo phòng từ bộ đề có sẵn
  - tạo AI project room
- Card phòng live và panel thông tin phòng hiển thị label map để người dùng biết phòng đang dùng `Classic` hay `Đua vịt`.

### 3. Game loop và cách tính đua vịt

- Không chèn cảnh vịt vào giữa quiz.
- Mỗi câu đúng vẫn cộng điểm như hiện tại; duck progress chỉ là cách biểu diễn trực quan của tổng điểm session.
- Quy đổi quãng đường vịt từ `participant.score / maxPossibleScore`.
- Nếu nhiều người bằng điểm:
  - vịt đứng cùng vị trí đích
  - leaderboard dùng shared rank theo điểm
  - thứ tự render nội bộ vẫn ổn định bằng joined time
- Host người thật tham gia quiz và đua như một người chơi; chỉ AI Host bị loại.
- Round leaderboard giữa các câu vẫn giữ nguyên.

### 4. UI kết thúc phòng `Đua vịt`

- Với `mapTheme = "duck-race"` và `status = "finished"`, thay `FinishedPanel` hiện tại bằng `DuckRaceFinishPanel`.
- `DuckRaceFinishPanel` gồm:
  - scene canvas client-side
  - mỗi người chơi là 1 lane với duck sprite riêng
  - animation chạy từ vị trí đầu tới vị trí cuối dựa trên điểm tổng
  - tên người chơi + điểm hiển thị cạnh lane
  - callout người thắng hoặc nhóm đồng hạng nhất
  - leaderboard tổng kết ngay bên dưới
  - nút `Quay lại Chơi với team`
- Chỉ reuse duck sprite từ `duck-race-master`; không port Vite app shell, router, socket backend, betting hay audio loop.

### 5. Cấu trúc tích hợp với code hiện tại

- Flow tạo phòng truyền `mapTheme` từ `hoc-tap-dashboard` xuống create API.
- Room runtime/store/service serialize `mapTheme` cùng room snapshot/public room.
- Room detail page:
  - `QuestionPanel`, `RoundLeaderboardPanel`, `LobbyPanel` giữ nguyên
  - `FinishedPanel` branch theo `room.mapTheme`
  - `Classic` dùng panel cũ
  - `Đua vịt` dùng panel mới
- Thêm helper UI riêng để tính:
  - `maxPossibleScore`
  - `distancePercent`
  - `sharedRank`
  - `duckSkinIndex` từ `participant.id`

## Test Plan

- Room create trong memory mode lưu và trả về `mapTheme` đúng cho cả `Classic` và `Đua vịt`.
- Room create trong Supabase mode persist `map_theme` đúng và load lại đúng qua list/detail/join.
- Room không gửi `mapTheme` thì fallback `classic`.
- `Classic` không đổi behavior của lobby, question, reveal, round leaderboard và finished panel.
- `Đua vịt` không hiển thị race scene ở `waiting`, `question`, `reveal`, `leaderboard`; chỉ hiện ở `finished`.
- Duck progress bằng 0 khi điểm 0, và chạm đích khi đạt điểm cao nhất trong session.
- Người bằng điểm có cùng `distancePercent` và cùng shared rank.
- Human host xuất hiện trong duck race standings; AI Host không xuất hiện.
- Public room card và room summary hiển thị đúng label map.
- Migration contract test xác nhận `hoc_tap_rooms.map_theme` tồn tại với default/check constraint mong muốn.

## Assumptions And Defaults

- `Đua vịt` áp dụng cho mọi loại phòng.
- Sau khi kết thúc session sẽ hiện cảnh đua vịt rồi leaderboard tổng kết.
- `Classic` là default để giảm regression.
- Không hiển thị đua vịt theo từng câu; chỉ reveal ở cuối session.
- XP/level overview toàn hệ thống không đổi.
- `duck-race-master` chỉ là nguồn asset + reference animation, không phải source để nhúng nguyên app.
