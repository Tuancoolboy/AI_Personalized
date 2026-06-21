Team Quiz Room: Tách Join UI, Role Host/Player cho Quiz Có Sẵn, Auto Top 5/Top 3
Summary
Giữ kiến trúc room hiện tại trong Next Route Handlers + in-memory store; không chuyển sang src/quiz-server ở pha này.
Sửa card Tham gia phòng để hoàn toàn độc lập với card Tạo phòng: state error, loading, input, validation, và submit không dùng chung nữa.
Ở Quiz có sẵn, thêm lựa chọn vai trò Chủ phòng / Người chơi.
Nếu chọn Chủ phòng: flow như hiện tại, nhưng host chỉ start và quan sát; sau đó game tự chạy theo timer.
Nếu chọn Người chơi: hệ thống tạo room mới với host hệ thống, người bấm vào room dưới vai player, room tự bắt đầu sau countdown ngắn.
Sau mỗi câu: hiện màn Top 5 trong 4 giây kiểu Kahoot. Sau câu cuối: hiện Top 3 xuất sắc nhất của toàn bài.
Key Changes
Tách state trong TeamActionCards:createError / joinError
isCreating / isJoining
form create và form join không còn ghi đè trạng thái của nhau

Mở rộng form Quiz có sẵn:thêm segmented control Vai trò: Chủ phòng | Người chơi
nếu Chủ phòng: giữ create room bình thường
nếu Người chơi: bấm action sẽ tạo room system-hosted và trả user vào room như player

Mở rộng room model/API:thêm entryRole: "host" | "player" vào payload tạo room
thêm hostMode: "human" | "system" vào snapshot
thêm phase: "waiting" | "question" | "leaderboard" | "finished" vào snapshot
thêm questionEndsAt, phaseEndsAt
thêm answeredPlayerCount
thêm roundTopFive: HocTapRoomParticipant[]
thêm finalTopThree: HocTapRoomParticipant[]

Cập nhật room store:room system-hosted tạo một host ảo, không nằm trong leaderboard
room human-hosted vẫn có host thật và host token
question kết thúc khi đủ người trả lời hoặc hết giờ
chuyển question -> leaderboard tự động
leaderboard interstitial giữ đúng 4 giây
sau leaderboard:còn câu tiếp: tự sang câu sau
hết câu: chuyển finished và materialize finalTopThree


Thời gian mặc định:countdown auto-start cho system host: 5 giây
thời gian mỗi câu: 20 giây
leaderboard mỗi câu: 4 giây

Cập nhật room page:host không còn nút Câu tiếp theo trong flow chính
host thấy trạng thái quan sát: số người đã trả lời, top 5 sau câu, top 3 cuối bài
player thấy câu hỏi khi phase=question, thấy top 5 khi phase=leaderboard, thấy podium top 3 khi phase=finished
sidebar leaderboard tổng vẫn giữ, nhưng block chính đổi theo phase

Giữ route advance như fallback nội bộ nếu muốn, nhưng UI chính không dùng nữa
Test Plan
Store tests:tạo room quiz có sẵn + host trả host token, không system host
tạo room quiz có sẵn + player tạo system host và trả participant là player
host ảo không xuất hiện trong leaderboard, roundTopFive, finalTopThree
auto-close câu khi đủ người trả lời
auto-close câu khi hết 20 giây
leaderboard chỉ lấy top 5, final chỉ lấy top 3

UI tests:lỗi/join loading không làm bẩn card create
lỗi/create loading không làm bẩn card join
đổi vai trò trong Quiz có sẵn đổi đúng CTA và submit path
host không có action trả lời; player không có action host

API/route tests:POST /api/hoc-tap/rooms nhận entryRole
snapshot trả đủ phase, hostMode, roundTopFive, finalTopThree
system-hosted room tự transition đúng qua polling/read snapshot

Assumptions
Chỉ áp dụng role Chủ phòng | Người chơi cho nhánh Quiz có sẵn; nhánh AI project vẫn là flow tạo room của host.
Người chơi trong Quiz có sẵn vẫn tạo room mới, nhưng room do host hệ thống điều khiển.
Top 5 sau mỗi câu và top 3 cuối bài đều tính theo điểm quiz, không tính host thật hoặc host hệ thống.
Không đưa socket server riêng vào phạm vi này; tiếp tục dùng polling trên room snapshot hiện có.