# WORKLOG — Team 9

> Technical decisions, task assignments, brainstorming, important bugs.
> Update mỗi khi team đưa ra quyết định kỹ thuật hoặc thay đổi hướng đi.
> Nguyên tắc: ghi theo dòng thời gian, không sửa lịch sử như thể quyết định mới đã có từ đầu.

---

## [2026-06-22] — Vá migration learning content để tương thích bảng learning_paths cũ

**Context:** `npm run db:sync` bị dừng ở `20260612100000_learning_content_schema.sql` với lỗi `column "status" does not exist`. Nguyên nhân là migration `20260611120000_job_positions_learning_paths.sql` đã tạo `public.learning_paths` trước đó với schema cũ (`name`, chưa có `status/title/path_type/updated_at`), nên khi migration 20260612100000 chạy `create table if not exists` rồi tạo index `(organization_id, status)` thì index đụng cột chưa tồn tại.

**Options:**
1. Tạo migration timestamp mới để ALTER `learning_paths`.
2. Vá trực tiếp migration 20260612100000 để nó tự nâng cấp bảng cũ trước khi tạo index/policy.

**Decision:** Chọn phương án 2 vì remote DB mới đang fail ngay ở migration 20260612100000; thêm migration mới phía sau sẽ không bao giờ được chạy. Migration này nay `alter table ... add column if not exists`, backfill `title` từ `name`, set default/not-null cho `scope/path_type/status/updated_at`, và drop legacy policy `learning_paths_select/write` trước khi tạo policy mới.

**Owner:** Codex

**Status:** Active

**Tests:** `npm run db:validate` pass; `npm run db:sync` pass sau patch; `npm run db:status` xác nhận local = remote tới `20260620080312_learning_study_sessions.sql`.

## [2026-06-22] — Tương thích Supabase publishable key với setup SSR hiện tại

**Context:** User đưa quickstart Supabase mới dùng `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, trong khi repo hiện tại đọc `NEXT_PUBLIC_SUPABASE_ANON_KEY` ở helper SSR/client, Next 16 proxy, auth callback, lead API, và nhiều smoke scripts. Nếu copy nguyên quickstart sẽ tạo thêm lớp helper trùng chỗ canonical và có nguy cơ auth chạy demo mode dù public key đã có.

**Options:**
1. Copy nguyên quickstart vào `utils/supabase/*` và thêm middleware riêng.
2. Giữ cấu trúc repo hiện tại, thêm một helper env dùng chung để runtime/script nhận cả publishable key lẫn anon key.

**Decision:** Chọn phương án 2. Tạo `src/frontend/lib/supabase/public-env.ts`, cho runtime ưu tiên `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` rồi fallback `NEXT_PUBLIC_SUPABASE_ANON_KEY`, cập nhật `client.ts`, `server.ts`, `is-configured.ts`, `proxy.ts`, `/auth/callback`, `/api/leads`, cùng các script smoke Supabase. `.env.local` chỉ được bổ sung publishable key cục bộ; chưa tự ý đổi toàn bộ URL/service-role pair vì repo còn nhiều API server-side dùng `SUPABASE_SERVICE_ROLE_KEY` và việc đổi nửa chừng có thể làm lệch project. Theo yêu cầu cài package, `npm install @supabase/supabase-js @supabase/ssr` cũng refresh `@supabase/supabase-js` từ `^2.108.0` lên `^2.108.2`.

**Owner:** Codex

**Status:** Active

**Tests:** `npm install @supabase/supabase-js @supabase/ssr` thành công; `npm run lint` pass với 5 warning cũ và 0 error; `npm run test` ngoài sandbox đi qua build thành công nhưng còn 3 API failures có sẵn (`POST /api/chat sensitive data warning`, `GET /api/chat/history without auth → 401`, `POST /api/chat manager without role_id streams` khi seed manager membership lỗi); `npx -y -p node@20 node node_modules/next/dist/bin/next build src/frontend` pass.

## [2026-06-21] — Xoá phòng, khoá phòng theo mã, và avatar DiceBear cho room team

**Context:** User yêu cầu bổ sung 3 capability cho flow team room đang chạy bằng memory store: host có thể xoá phòng bất kỳ lúc nào, phòng có thể bật trạng thái khoá để vẫn hiện ở danh sách nhưng chỉ vào bằng mã, và participant cần có avatar thay vì chỉ hiện initials.

**Options:**
1. Chỉ chặn bằng UI ở dashboard, không đổi state/API room.
2. Mở rộng room snapshot/store/Route Handlers để lock/delete/avatar là behavior thật, rồi nối UI vào cùng regression test.

**Decision:** Chọn phương án 2. Store nay materialize `avatarUrl` DiceBear `bottts-neutral` theo `participant.id`, thêm `isLocked` ở room/public room, và thêm `canManageRoom` để host thật hoặc người tạo system-hosted đều có thể bật/tắt khoá và xoá phòng qua `PATCH/DELETE /api/hoc-tap/rooms/[code]`. Dashboard hiển thị badge “Phòng khoá” và vô hiệu CTA vào trực tiếp; room page hiển thị banner khoá, control host khi đang ở room, và empty state “Phòng đã bị xoá” khi polling gặp 404 sau khi room từng tồn tại.

**Owner:** Codex

**Status:** Active

**Tests:** Targeted Node 20 Vitest cho room store + route handlers 25/25 pass; scoped ESLint pass; `npm run lint` pass với 5 warning cũ; Node 20 `next build src/frontend` pass; full `npm run test` vẫn fail 2 case API phase 1 có sẵn: `GET /api/chat/history without auth` và `POST /api/chat manager without role_id streams` (seed manager membership).

## [2026-06-21] — Avatar chọn được ở hồ sơ/Học tập và tách panel điểm-hạng thành 2 hàng

**Context:** User muốn avatar ở UI học tập hoặc thông tin cá nhân bấm được để chọn mẫu DiceBear thay vì chỉ random cố định, đồng thời panel “Điểm của bạn / Hạng của bạn” đang bị cắt số nên cần đổi layout dọc rõ hơn.

**Options:**
1. Chỉ đổi avatar ở dashboard bằng state cục bộ, không nối sang room.
2. Tạo preference local dùng lại cho dashboard + tài khoản, rồi đẩy `avatarSeed` qua create/join room để avatar đã chọn tiếp tục xuất hiện trong phòng.

**Decision:** Chọn phương án 2. Thêm local preference cho avatar DiceBear trên browser, render picker ở cả thẻ hồ sơ Học tập và tab “Thông tin cá nhân”, đồng thời truyền `avatarSeed` qua luồng tạo phòng/tham gia phòng để host/player giữ avatar đã chọn trong room team. Panel tóm tắt điểm/hạng chuyển sang 2 hàng dọc với typography lớn hơn để XP dài không còn bị `truncate`.

**Owner:** Codex

**Status:** Active

**Tests:** Sẽ chạy targeted Vitest room/store + lint scoped + Node 20 build sau khi hoàn tất patch.

## [2026-06-21] — Giữ đáp án ẩn cho tới khi cả phòng xong hoặc hết 60 giây

**Context:** User chốt lại kỳ vọng của flow room team: khi vào bằng vai người chơi, phòng phải đứng ở sảnh chờ cho tới khi người tạo bấm bắt đầu; trong lúc câu hỏi còn mở 60 giây thì người chơi chỉ được biết mình đã chốt đáp án, chưa được lộ đúng/sai hay đáp án đúng; chỉ khi cả phòng trả lời xong hoặc timeout mới reveal 5 giây rồi sang leaderboard.

**Options:**
1. Giữ store hiện tại và chỉ đổi copy/UI.
2. Sửa snapshot/store để tách “đã trả lời” khỏi “đã reveal”, rồi cập nhật UI/test theo invariant mới.

**Decision:** Chọn phương án 2. `viewerAnswer` nay có cờ `revealed`, nên trong pha `question` người chơi chỉ giữ được lựa chọn đã bấm để khóa nút và hiển thị trạng thái chờ, còn `correctIndex`, `isCorrect`, `points`, `explanation` chỉ lộ ra ở pha `reveal/leaderboard`. Đồng thời đổi copy trên dashboard/room để nhấn mạnh đây là sảnh chờ do người tạo bấm bắt đầu, không tự chạy, và vá thêm fallback `canStart` trong `services/quizApi.ts` để build TypeScript qua.

**Owner:** Codex

**Status:** Active

**Tests:** Targeted Node 20 Vitest `src/frontend/lib/hoc-tap-room-store.test.ts` 15/15 pass; `npm run lint` pass với 5 warning cũ; Node 20 `next build src/frontend` pass ngoài sandbox. Full `npm run test` chạy lại ngoài sandbox vẫn fail 2 case API phase 1 có sẵn: `GET /api/chat/history without auth` và `POST /api/chat manager without role_id streams` (seed manager membership).

## [2026-06-21] — Reveal đúng/sai trước leaderboard + role host/player cho AI project

**Context:** User yêu cầu hoàn thiện room quiz team ở 4 điểm đang lệch trải nghiệm: sau khi trả lời phải thấy màu đúng/sai trước khi nhảy sang leaderboard, AI project cũng phải có vai trò `Chủ phòng / Người chơi` cho cả `Host kiểm duyệt` và `AI bí mật`, nút quay lại trong phòng phải trở về “Chơi với team” thay vì tổng quan Học tập, và card “Tham gia phòng” không được bị kéo cao theo card “Tạo phòng mới”.

**Options:**
1. Chỉ vá UI để nhìn giống hơn nhưng giữ flow room cũ.
2. Sửa tận store phase + UI + regression test để hành vi và giao diện khớp nhau.

**Decision:** Chọn phương án 2. Store thêm pha `reveal` giữa `question` và `leaderboard` để hiện màu xanh lá/đỏ cùng đáp án đúng trước khi chuyển tiếp. `entryRole=player` nay áp dụng cho cả AI project và quiz có sẵn, nên người tạo có thể vào vai player trong cả `host-review` lẫn `ai-secret` và room sẽ dùng system host. Màn phòng đổi toàn bộ CTA quay lại sang `/choi-voi-team`, còn layout card tham gia phòng được tách khỏi grid stretch để không oversize theo card tạo phòng.

**Owner:** Codex

**Status:** Active

**Tests:** Targeted Node 20 Vitest 17/17 pass; full `eslint .` pass với 5 warning cũ; Node 20 `next build src/frontend` pass. Full `npm run test` vẫn fail 2 case API phase 1 có sẵn: `GET /api/chat/history without auth` và `POST /api/chat manager without role_id streams` (seed manager membership).

## [2026-06-20] — Hardening luồng tạo phòng AI project cho hai loại phòng

**Context:** User làm rõ `specs/ai_studio_codegame_project_room_types.html` chỉ là tham khảo luồng hoạt động, UI hiện tại đã đúng. Phần cần siết là backend/hành vi tạo phòng AI project với 2 loại: host kiểm duyệt và AI bí mật.

**Options:**
1. Chỉ ẩn preview bằng UI.
2. Chặn preview phòng bí mật ở server, giữ host-review được xem/sửa câu trước, và bổ sung regression tests.

**Decision:** Chọn phương án 2. `/api/hoc-tap/rooms/preview` nay từ chối `ai-secret`; store/test xác nhận host không tính là người chơi, cần player thật mới start, host không trả lời, host-review mới lộ đáp án/review questions, còn AI bí mật không cho xem/sửa bộ câu hỏi trước. Sửa thêm type fallback của `services/quizApi.ts` để build production không gãy khi dùng wrapper room cũ.

**Owner:** Codex

**Status:** Active

**Tests:** Targeted Vitest room/preview 11/11 pass; scoped ESLint các file vừa chạm pass; `npm run lint` pass với 5 warning cũ; `npm run build` pass; migration filename đã đổi sang `20260620080312_learning_study_sessions.sql` và `npm run db:validate` pass. `npm run test` chưa pass: Unit 302/302 pass, API phase 1 còn 28/30 do 2 lỗi chat/manager có sẵn (`/api/chat/history` unauth và manager seed membership).

## [2026-06-20] — Khóa regression cho flow host/player và auto-phase của phòng quiz team

**Context:** `specs/continual.md` mô tả pha tiếp theo của Team Quiz Room: tách hẳn vai trò host/player cho quiz có sẵn, room system-hosted tự bắt đầu, và flow chạy theo `waiting -> question -> leaderboard -> finished`. Logic nền đã có trong store/UI nhưng còn thiếu regression test và build production vẫn lộ type drift ở wrapper room cũ.

**Options:**
1. Chỉ dựa vào browser smoke cho flow mới.
2. Thêm regression test ở store/route cho flow mới, đồng thời sửa type drift để build phản ánh đúng shape snapshot hiện tại.

**Decision:** Chọn phương án 2. Bổ sung test cho room system-hosted khi vào quiz với vai trò player, auto-transition bằng timer, Top 5/Top 3 không tính host, và route invariant cho `entryRole=player`. Đồng thời sửa wrapper room cũ để `hostToken` optional, đồng bộ fallback snapshot với `hostMode/phase/questionEndsAt/phaseEndsAt/answeredPlayerCount/roundTopFive/finalTopThree`, và sửa `serializeRoom()` không remap nhầm `roundTopFive/finalTopThree` như `StoredParticipant`.

**Owner:** Codex

**Status:** Active

**Tests:** Targeted Node 20 Vitest 15/15 pass; scoped ESLint các file vừa chạm pass; full `eslint .` pass với 6 warning cũ; Node 20 `next build src/frontend` pass. Full `npm run test` vẫn fail 2 case API phase 1 có sẵn: `GET /api/chat/history without auth` và `POST /api/chat manager without role_id streams` (seed manager membership).

## [2026-06-19] — Tạo phòng quiz online kiểu Kahoot cho Học tập

**Context:** User yêu cầu code đầy đủ chức năng tạo phòng/tham gia online giống Kahoot cho màn “Chơi với team”. Trước đó UI team play mới có seed room và nút demo, đồng thời có một mảnh socket.io untracked nhưng thiếu dependency/runtime riêng nên có nguy cơ làm build gãy.

**Options:**
1. Dùng socket.io server riêng ở `src/quiz-server`.
2. Thêm Supabase Realtime/schema mới.
3. Dùng Next.js Route Handlers + in-memory room store + polling để có create/join/lobby/game ngay trong app hiện tại.

**Decision:** Chọn phương án 3 cho bước này. Tính năng có mã phòng 6 ký tự, host token lưu localStorage, join bằng tên, lobby, start game, trả lời câu hỏi, chuyển câu/kết thúc và bảng điểm. Đây là online demo chạy tốt trên một Next runtime/dev server; production đa instance hoặc Vercel serverless cần nâng cấp sang Supabase Realtime hoặc backend socket bền vững trước khi coi là dữ liệu thật.

**Owner:** Codex

**Status:** Active

**Tests:** Targeted Vitest Học tập/room 22/22 pass; scoped ESLint các file room/dashboard/API pass. Full lint/test/build sẽ chạy trước khi báo xong.

## [2026-06-19] — Giữ greeting chat và chặn init state cũ ghi đè khi conversation được resolve

**Context:** User báo `/tro-ly` bị mất tin nhắn chào đầu tiên sau khi chat và sau khi chat xong bị nháy 1 phát. Phân tích luồng hiện tại cho thấy hook chat đang có thêm một vòng init khi `activeConversationId` đổi từ session tạm sang session thật, làm state cũ có thể reset lại messages/loading dù conversation hiển thị vẫn là cùng một phiên.

**Options:**
1. Chỉ chỉnh UI render để luôn vẽ greeting riêng.
2. Chỉ giữ state hiện tại và bỏ rerun init theo `activeConversationId`.
3. Kết hợp: khóa init theo session key ổn định, bỏ refresh theo id vừa resolve, và kiểm tra lại bằng regression test.

**Decision:** Chọn phương án 3. `useAssistantChat` giờ build init key từ session load key ổn định, resolve history theo `sessionLoadKey` thay vì `activeConversationId`, và không để việc resolve conversation id sau khi gửi kích hoạt lại vòng init. Mục tiêu là giữ greeting bubble của phiên hiện tại và tránh flash loading không cần thiết sau khi stream xong.

**Owner:** Minh Hải

**Status:** Active

**Tests:** Chưa chạy trong lượt này; sẽ rerun targeted Vitest, full lint/test/build, rồi browser-smoke `/tro-ly` real Supabase mode với HR login.

## [2026-06-19] — Reset boundary cho chat mới để không kéo context chéo giữa các hội thoại

**Context:** User báo rằng mở một chat mới nhưng trợ lý vẫn trả lời theo context của chat khác, làm boundary giữa các thread bị lộn xộn. Kiểm tra luồng hiện tại cho thấy `force_new`/`conversation_id` đã tách session UI, nhưng prompt vẫn có thể mang memory cũ vào lượt đầu của hội thoại mới.

**Options:**
1. Chỉ sửa UI/session state.
2. Chỉ sửa prompt.
3. Chặn memory cũ trên lượt đầu của hội thoại mới, đồng thời gắn instruction rõ ràng cho fresh thread.

**Decision:** Chọn phương án 3. Khi người dùng bấm “Cuộc hội thoại mới”, lượt gửi đầu tiên sẽ tạo conversation mới nhưng không nạp `chat_memories` cũ vào prompt; prompt cũng nhận thêm instruction về fresh thread để không tự nối context từ chat khác. Draft history trả về `coreContext: null` để UI không vô tình gợi cảm giác đang nối tiếp hội thoại trước đó.

**Owner:** Minh Hải

**Status:** Active

**Tests:** `npm run lint` pass với 4 warning có sẵn; `npm run test` pass (58 Vitest files / 264 tests, 30 API, 12 manager/invite, 7 auth/OAuth, 84 pytest); `npm run build` pass; browser-smoke `/tro-ly` real Supabase session với `demo.hr@gmail.com` xác nhận fresh thread không lôi context marketing cũ sang.

## [2026-06-19] — Chặn lời chào lặp ở mọi lượt chat sau session mở đầu

**Context:** Browser smoke cho thấy assistant vẫn mở đầu bằng “Chào bạn!” ở một số canned/fallback response, dù session greeting bubble đã có sẵn. Người dùng chỉ muốn lời chào xuất hiện một lần khi mở session mới, không lặp ở từng câu trả lời.

**Options:**
1. Sửa từng canned response.
2. Chỉ thêm instruction vào system prompt.
3. Thêm output sanitizer dùng chung cho canned/cache/live OpenAI.

**Decision:** Chọn phương án 3 và bổ sung prompt reminder. `stripLeadingAssistantGreeting()` được áp vào canned/fallback/cache/OpenAI final text để cắt lời chào mở đầu nhưng vẫn giữ nguyên nội dung trả lời. Session greeting bubble vẫn giữ nguyên, nên mỗi thread mới vẫn có lời chào đầu tiên đúng chỗ.

**Owner:** Minh Hải

**Status:** Active

**Tests:** Chưa chạy xong trong lượt này; cần rerun Vitest chọn lọc, rồi full lint/test/build và browser-smoke `/tro-ly` với câu “co bai noi quy cong ty khong?” để xác nhận không còn “Chào bạn!” trong câu trả lời sau session mở đầu.

## [2026-06-19] — Đồng bộ backend native để không chào lặp và không lộ core context ở draft history

**Context:** Backend Python native vẫn có cache/fallback/chat stream riêng, nên nếu FE sạch mà BE chưa cập nhật thì hai đường trả lời sẽ lệch nhau. Draft chat history phía backend cũng vẫn đang trả `core_context` trong nhánh `draft`.

**Options:**
1. Chỉ xử lý ở FE.
2. Chỉ xử lý ở helper backend.
3. Chặn cả cache/fallback/live stream và draft history trên backend native.

**Decision:** Chọn phương án 3. Backend Python thêm `strip_leading_assistant_greeting()`, áp vào cache/fallback/live stream, bổ sung reminder trong prompt, và trả `coreContext: None` khi `draft=True` để state mới thật sự sạch.

**Owner:** Minh Hải

**Status:** Active

**Tests:** `pytest src/backend/tests/test_services/test_chat_service.py src/backend/tests/test_services/test_openai_helpers.py src/backend/tests/test_api/test_chat_routes.py -q` pass; full `npm run lint` pass với 4 warning cũ; full `npm run test` pass (58 Vitest files / 266 tests, 30 API, 12 manager/invite, 7 auth/OAuth, 88 pytest); `npm run build` pass.

## Format mỗi entry

```md
## [YYYY-MM-DD] — Tiêu đề quyết định
**Context:** Vì sao phải quyết định lúc này
**Options:** Các phương án đã cân nhắc
**Decision:** Chốt phương án nào và lý do
**Owner:** Ai chịu trách nhiệm
**Status:** Active / Reversed / Superseded
```

---

## [2026-06-18] — Lưu lịch sử kết quả khảo sát onboarding vào Supabase

**Context:** Khảo sát onboarding đang ghi kết quả hiện tại vào `profiles.assessment_result`, nhưng mỗi lần làm lại sẽ overwrite snapshot cũ. User yêu cầu tất cả user làm khảo sát đều phải được lưu kết quả bài vào database.

**Options:**
1. Chỉ giữ nguyên `profiles.assessment_result`.
2. Thêm bảng lịch sử riêng cho từng lần hoàn thành khảo sát, đồng thời vẫn giữ `profiles` làm snapshot hiện tại cho app đọc nhanh.

**Decision:** Chọn phương án 2. Thêm `onboarding_assessment_results` với RLS user-scoped để lưu raw answers, result JSON, total score, AI level, role, daily tasks/tools/industry/position cho từng attempt. `saveEmployeeProfile` vẫn upsert `profiles`, sau đó insert lịch sử khảo sát; nếu Supabase real mode không lưu được thì onboarding hiển thị lỗi thay vì giả vờ thành công.

**Owner:** Minh Hải

**Status:** Active

**Tests:** `npm run db:validate` pass; targeted Vitest 2 files / 4 tests pass; `npm run lint` pass với 4 warning cũ; `npm run test` pass (58 Vitest files / 263 tests, 30 API, 12 manager/invite, 7 auth/OAuth, 84 pytest); `npm run build` pass.

## [2026-06-18] — Clone backend/API sang FastAPI theo mô hình mirror trước

**Context:** User yêu cầu tạo nhánh mới và clone toàn bộ logic BE/API hiện có sang `src/backend/` bằng FastAPI, nhưng chưa thay thế runtime Next.js Route Handlers đang chạy production/dev.

**Options:**
1. Port native toàn bộ 29 route Next.js sang Python ngay trong một bước.
2. Chỉ copy source tham khảo vào `src/backend/` mà chưa có runtime dùng được.
3. Dựng FastAPI mirror/proxy cùng manifest route để clone đủ API surface và behavior hiện tại, rồi native hóa dần từng endpoint sau.

**Decision:** Chọn phương án 3. FastAPI giờ expose lại toàn bộ route `/api/...` và `/moi/{token}/accept`, forward sang Next.js runtime qua `NEXT_RUNTIME_BASE_URL`, đồng thời giữ `src/backend/` làm nơi chuẩn bị cho việc thay từng logic sang Python mà không phá flow hiện tại. Điều này là ngoại lệ có chủ đích theo task hiện tại, không thay đổi nguyên tắc Phase 2 vẫn chạy chính trên Next.js cho đến khi có quyết định mới.

**Owner:** Minh Hải

**Status:** Active

**Update 2026-06-18:** Tạo nhánh `feat/clone-fastapi-backend`; `pytest src/backend/tests -q` pass 12/12 sau khi cài requirements backend.

**Update 2026-06-18 PM:** Thêm `scripts/clone-next-backend-to-fastapi.mjs` để sync source backend hiện có từ `src/frontend/app/api/**`, `src/frontend/app/moi/[token]/accept/route.ts`, và toàn bộ `lib/**` phụ thuộc sang `src/backend/next_clone/frontend/`; lần sync đầu đã clone 94 file kèm `src/backend/next_clone/manifest.json`. Follow-up tiếp theo là chọn thứ tự native hóa từng endpoint nặng như `/api/chat`, `/api/manager/team`, `/api/practice-review`.

**Update 2026-06-18 PM2:** Sửa `scripts/run-all-tests.mjs` để production server test không chạy `db:sync` trong `prestart`; full verify pass với `npx -y -p node@22 -p npm npm run test` (246 Vitest, 30/30 Phase 1 API, 12/12 Phase 2 manager/invite, 7/7 auth/OAuth; pytest section bị skip mềm vì repo không có `tests/` root), `npx -y -p node@20 -p npm npm run lint`, `npx -y -p node@20 -p npm npm run build`, và `pytest src/backend/tests -q` 12/12.

**Update 2026-06-18 PM3:** Bắt đầu port native business logic sang FastAPI cho nhóm API dữ liệu nền tảng: `POST /api/events`, `GET/PUT /api/profile`, `GET/POST /api/progress`, `GET/POST /api/nhat-ky`, `GET/POST /api/leads`. Thêm `SupabaseGateway` và `NativeAppService` để backend Python tự nói chuyện với Supabase qua REST/Auth thay vì phụ thuộc Next.js runtime; `pytest src/backend/tests -q` hiện pass 16/16.

**Update 2026-06-18 PM4:** Port tiếp `GET /api/modules`, `GET /api/modules/{id}`, `GET/POST /api/quiz-results` sang FastAPI-native. Để backend Python độc lập với runtime TS nhưng vẫn giữ đúng dữ liệu lộ trình/quiz hiện có, thêm `scripts/export-backend-learning-data.ts` để xuất snapshot `src/backend/data/learning-data.json`; Python đọc snapshot này qua `learning_data.py`. `pytest src/backend/tests -q` hiện pass 18/18.

**Update 2026-06-18 PM5:** Port thêm company/manager foundation sang FastAPI-native: `POST /api/organizations`, `GET/PATCH /api/organizations/current`, `GET /api/organizations/{slug}/public`, `POST /api/member/sync-department`, `GET/POST /api/manager/team`. Backend Python giờ đã tự xử lý create/update org, sync phòng ban theo `role_id`, đọc danh sách team, và thêm employee/manager vào tổ chức với luật one-org-per-user + private org cho manager mới; `pytest src/backend/tests -q` hiện pass 24/24.

**Update 2026-06-18 PM6:** Hoàn tất migration BE API sang FastAPI-native: tách route theo domain (`user`, `learning`, `chat`, `org`, `manager`, `public`, `agent`), tách service theo domain (9+ services), native hóa 7 endpoint còn mirror (`/api/chat` streaming, `/api/practice-review`, `/api/agent/lo-trinh`, `/api/agents/grader`, `/api/agents/recommender`, `/api/aha`, `/moi/{token}/accept`), `MIRRORED_ROUTES` rỗng. `pytest src/backend/tests -q` pass 56/56; `npm run lint`, `npm run test`, `npm run build` pass.

**Update 2026-06-18 PM7:** Dọn legacy mirror: xóa `BACKEND_MODE`, `NEXT_RUNTIME_*`, `manifest.py`, `next_proxy.py`, mirror router và `GET /api/v1/mirror/routes`. Backend giờ chỉ native; `/health` và `/api/v1/status` trả `env` thay vì `mode=mirror`.

**Update 2026-06-18 PM8:** Tổ chức lại test API BE theo domain: `test_api/helpers.py` (`patch_service`, `patch_session`, `patch_manager`, `assert_api_error`), `test_api_inventory.py` assert 43 route đăng ký, tách `test_{user,learning,chat,org,manager,public,agent,routes}.py`, xóa `test_native_routes.py`. `pytest src/backend/tests -q` pass 79/79; full `npm run lint/test/build` pass.

**Update 2026-06-18 PM9:** Fix review BE (không đụng FE Next.js): import `VALID_ROLES` trong `chat_service`; gate `x-test-user-id` chỉ khi `APP_ENV=test`; helper `parse_json_body`; email leads dùng `EMAIL_REGEX`; reuse httpx client trong `SupabaseGateway`; metadata app + CORS trim. pytest 84 pass.

## [2026-06-17] — Coach thêm lớp mindset ra quyết định cho báo cáo và outline

**Context:** Review cho thấy luồng coach hiện tại vẫn đúng hướng nhưng còn generic; người dùng cần đầu ra dùng được để quyết định chứ không chỉ là khung slide đủ mục.

**Options:**
1. Chỉ chỉnh riêng case marketing.
2. Thêm mindset decision-driven cho toàn bộ coach, nhưng giữ nguyên khung clarify/prompt/bài học hiện có.

**Decision:** Chọn phương án 2. Thêm lớp tư duy “mục tiêu → benchmark → insight → hành động” vào system prompt và phần synthesize, đồng thời giữ nguyên cơ chế hỏi 3 card, prompt mẫu, và link bài học.

**Owner:** Minh Hải

**Status:** Active

**Update 2026-06-17 PM:** `npx vitest run src/frontend/lib/chat-clarify-parse.test.ts` pass; `npm run lint` pass với 5 warning có sẵn; `npm run test` pass (237 Vitest tests, API integration, manager/invite, auth/OAuth; pytest bị skip vì repo không có `tests/`); `npm run build` pass.

## [2026-06-17] — Làm rõ giờ reset cho thông báo hết lượt chat

**Context:** Thông báo cũ "Quay lại vào ngày mai nhé!" chưa nói rõ reset vào lúc nào, dễ làm người dùng phân vân khi nào mới dùng tiếp được.

**Options:**
1. Giữ nguyên wording cũ.
2. Nói rõ mốc giờ reset là `00:00 ngày mai`.

**Decision:** Chọn phương án 2. Đồng bộ copy rate-limit ở API và client fallback sang "Hết lượt hôm nay. Bạn có thể tiếp tục từ 00:00 ngày mai." để người dùng hiểu ngay mốc quay lại.

**Owner:** Minh Hải

**Status:** Active

**Update 2026-06-17 PM:** `npm run lint` pass với 5 warning có sẵn; Node 20 `next build src/frontend` pass; full `npm run test` dừng ở bước API integration vì production server không start kịp timeout của runner.

## [2026-06-16] — Tuancoolboy sửa lại AGENTS.md và UI manager

**Context:** Cần chỉnh màn quản lý nhân viên và cài đặt công cụ AI theo mẫu landing manager trong `specs/gemini-code-1781627827649.html`, đồng thời giữ nguyên workflow agent và không code trực tiếp trên `develop`.

**Options:**
1. Chỉ sửa riêng `/quan-ly/nhan-vien`.
2. Tạo shell manager dùng chung cho `/quan-ly/nhan-vien` và `/quan-ly/cai-dat`.
3. Rebuild toàn bộ manager dashboard.

**Decision:** Chọn phương án 2. Thêm shell manager có sidebar theo mẫu, KPI cards, filter/search/status cho danh sách nhân viên, cột liên hệ trong bảng, và đồng bộ visual cho trang Công cụ AI. Không đổi Supabase schema, API route, auth guard, hoặc `AGENTS.md`; việc “sửa lại AGENTS.md” được ghi nhận tại đây vì rule hiện tại đã đủ.

**Owner:** Tuancoolboy

**Status:** Active

**Note:** Nhánh `feat/tuanvh/fix-UI-manager`. Các thay đổi chat có sẵn bị conflict khi pull `develop`, đã được bảo toàn trong `stash@{0}` và không trộn vào task UI này.

**Update 2026-06-17:** `npm run lint` pass với 5 warning có sẵn; Node 20 Vitest pass 49 files / 230 tests; Node 20 `next build src/frontend` pass; `git diff --check` pass. Full `npm run test` chưa pass do Node 18 thiếu `node:util.styleText`; khi chạy API smoke bằng Node 20 còn 2 lỗi chat ngoài scope UI manager.

## [2026-06-17] — Tắt tạm GitHub Actions CI tự động

**Context:** PR check đang tiêu tốn GitHub Actions credit của account cá nhân trong khi hiện tại chưa cần auto-run cho mọi push/PR.

**Options:**
1. Chỉ tắt `pull_request`, vẫn giữ `push`.
2. Tắt toàn bộ auto trigger, chỉ giữ chạy tay.

**Decision:** Chọn phương án 2. Đổi `.github/workflows/ci.yml` sang `workflow_dispatch` only để CI không tự chạy ở cả push lẫn PR; khi cần có thể mở lại `push` + `pull_request`.

**Owner:** Minh Hải

**Status:** Active

**Update 2026-06-17 PM:** Chỉnh nền `ManagerWorkspaceShell` không còn phủ `bg-card/*`; chỉ card/table giữ nền trắng, vùng ngoài dùng lại background tổng thể của app để khớp Tổng quan/Xếp hạng.

**Update 2026-06-17 PM2:** Xoá hẳn sidebar trái trong `ManagerWorkspaceShell` theo feedback UI; các trang manager giờ chỉ render vùng nội dung chính dưới top navigation.

**Update 2026-06-17 PM3:** Nút `Chat` trong bảng nhân viên giờ mở modal nhắn tin trực tiếp với nhân viên, có lịch sử demo/localStorage và tin nhắn nhanh; bỏ luồng trợ lý AI khỏi cột Liên hệ, không gọi `/api/chat`.

**Update 2026-06-17 PM4:** Fix bug bảng Top nhân viên ở `/quan-ly`: nút `Chat` không còn fallback sang `/tro-ly`; tách `ManagerDirectChatModal` dùng chung cho Tổng quan và Danh sách nhân viên.

## [2026-06-16] — Vercel CLI 54.x: parser deploy JSON + script xem deployment

**Context:** `./scripts/deploy-vercel-prod.sh` fail sau upload vì Vercel CLI 54 trả `{ deployment: { url, id } }` lẫn banner/progress trên stdout; script cũ parse `data.url` top-level.

**Options:**
- Sửa inline trong bash script → dễ vỡ lại khi CLI đổi format.
- Parser Node tái dùng + fallback dòng `▲ Production` → ổn định hơn, có test regression.

**Decision:** Thêm `scripts/vercel-cli-json.mjs`, cập nhật `deploy-vercel-prod.sh`, thêm `check-vercel-deployments.sh` để phân biệt deploy từ Git vs CLI. Nhánh `fix/vercel-deploy-cli-json` (không commit trực tiếp trên `develop`).

**Owner:** Agent session

**Status:** Active

**Follow-up:** Merge qua PR; `./scripts/check-vercel-deployments.sh` để xem Vercel CD; GitHub Actions CI vẫn chạy trên GitHub (lint/test/build), không phải trên Vercel.

---

## [2026-06-16] — Dọn N+1 assignments và tối ưu tokenize câu hỏi

**Context:** Review mới chỉ ra 2 điểm lặp cùng pattern: loader recommender vẫn query `learning_assignments` theo kiểu one-row, và tokenization của curriculum tạo nhiều mảng trung gian khi query dài.

**Options:**
1. Giữ nguyên vì đã pass test.
2. Chỉ sửa một trong hai chỗ, để phần còn lại chờ.
3. Chuyển recommender sang lấy toàn bộ assignment active rồi chọn path mới nhất, và viết lại tokenization theo kiểu streaming.

**Decision:** Chọn phương án 3. Recommender không còn N+1/one-row assumption ở assignments; tokenization của curriculum chuyển sang pass streaming để giảm memory pressure và tránh tạo nhiều intermediate arrays.

**Owner:** AI agent session (Codex)

**Status:** Active

**Update 2026-06-16:** `npx vitest run src/frontend/lib/chat-knowledge-company.test.ts src/frontend/lib/chat-knowledge-curriculum.test.ts` pass; `npm run build` pass.

---

## [2026-06-16] — Cache curriculum search index và giữ company context fail-open

**Context:** Sau review, `scoreModuleForQuery` vẫn phải normalize khá nhiều lần giữa các chat turn, còn loader company cần policy rõ hơn để không mất toàn bộ context khi một phần query lỗi.

**Options:**
1. Giữ nguyên vì đã pass test.
2. Chỉ tối ưu trong một lần render, không cache qua nhiều turn.
3. Cache normalized module search index theo `module.id`, và để company loader tiếp tục trả partial context khi chỉ một phần query lỗi.

**Decision:** Chọn phương án 3. Search index của module được cache theo `module.id` để giảm chi phí cross-message, còn company loader vẫn fail-open trên lỗi partial data để trợ lý không mất hết ngữ cảnh hữu ích.

**Owner:** AI agent session (Codex)

**Status:** Active

**Update 2026-06-16:** `npx vitest run src/frontend/lib/chat-knowledge-curriculum.test.ts src/frontend/lib/chat-knowledge-company.test.ts` pass; `npm run build` pass; `npm run test` vẫn lặp các lỗi integration/auth fixture sẵn có ở suite Phase 1, không phải do thay đổi này.

---

## [2026-06-16] — Tutor fallback demo trả lời "học gì tiếp" bằng link module

**Context:** Khi local không có OpenAI key, trợ lý AI vẫn rơi vào canned response. Câu hỏi kiểu "học gì tiếp" trước đó bị trả lời quá chung và còn né phạm vi.

**Options:**
1. Giữ nguyên OFF_TOPIC cho mọi câu ngoài vài mẫu cứng.
2. Chỉ sửa UI chip gợi ý, không đụng fallback logic.
3. Thêm canned response theo role để trả lời "học gì tiếp" bằng module link của lộ trình.

**Decision:** Chọn phương án 3. Fallback demo giờ có câu trả lời riêng cho "học gì tiếp" và trỏ thẳng tới 3 module đầu bằng markdown link, nên local browser test vẫn thấy giá trị thật của tutor.

**Owner:** AI agent session (Codex)

**Status:** Active

**Update 2026-06-16:** Browser deep test xác nhận câu hỏi "Em nên học gì tiếp cho bán hàng?" trả về đúng 3 link module `/lo-trinh/kinh-doanh-m1..m3`; `npm run lint`, `npx vitest run src/frontend/lib/tro-ly-canned-responses.test.ts src/frontend/lib/chat-knowledge-company.test.ts src/frontend/lib/agent/path-agent-validate.test.ts src/frontend/lib/agent/path-agent-input.test.ts`, và `npm run test` pass trong môi trường sạch.

---

## [2026-06-16] — Ép lộ trình công ty phải đi qua validate và giữ cờ bắt buộc

**Context:** Commit trước đã cho tutor và path agent đọc ngữ cảnh công ty, nhưng lộ trình giao vẫn có thể bị model bỏ sót hoặc làm loãng khi validate. Ngoài ra, cờ `is_required` trong dữ liệu lộ trình công ty chưa được tận dụng.

**Options:**
1. Chỉ dựa vào prompt để model tự giữ lộ trình.
2. Chỉ thêm test, không sửa validate.
3. Đưa lộ trình công ty vào validate như một phần bắt buộc và giữ `is_required` trong hint dữ liệu.

**Decision:** Chọn phương án 3. `validateAgentOutput` giờ tự chèn lộ trình công ty vào nhóm đầu nếu có, còn helper company giữ cờ `is_required` để prompt/test phản ánh rõ module bắt buộc.

**Owner:** AI agent session (Codex)

**Status:** Active

**Update 2026-06-16:** `npm run lint` pass; `npm run test` pass (192 Vitest tests, 30/30 API smoke, 12/12 manager/invite, 7/7 auth/OAuth, Python suite skipped vì repo không có `tests/`); Node 20 `next build` pass.

---

## [2026-06-16] — Harden tutor/path agents sau review (graceful DB, is_required NGUỒN 1, sanitize)

**Context:** Sau commit `4cde0cc`, vẫn còn vài điểm: `isFoundation` bị gán nhầm từ `is_required`, thiếu graceful degradation khi thiếu bảng Phase 2, NGUỒN 1 chưa hiện cờ bắt buộc, cap validate có thể cắt module required, và user notes/Aha chưa được giới hạn rõ.

**Decision:** Tách `isFoundation` (từ kho nền tảng) khỏi `isRequired`; loader company fail-open khi thiếu bảng; curriculum + validate ưu tiên module bắt buộc; sanitize + delimiter cho text user; chat route chỉ gọi `loadOrganizationLearningContext` một lần.

**Owner:** AI agent session (Cursor)

**Status:** Active

**Update 2026-06-16:** Review follow-up — batch `learning_path_modules` query (no N+1 per assignment); simplify module search cache to id+fingerprint Map without LRU.

---

## [2026-06-16] — Cá nhân hóa sâu hơn cho agent tutor và agent sinh lộ trình

**Context:** Hai agent chính đang thiếu ngữ cảnh doanh nghiệp thật: agent tutor chưa tách riêng công ty/phòng ban/lộ trình giao, còn agent sinh lộ trình chưa ưu tiên lộ trình công ty khi user thuộc tổ chức.

**Options:**
1. Chỉ chỉnh prompt hiện tại để model tự suy luận từ history.
2. Chỉ thêm retrieval một nguồn mới cho công ty/lộ trình giao.
3. Kết hợp retrieval + prompt + fallback để cả tutor và path agent đều bám source-of-truth mới.

**Decision:** Chọn phương án 3. Tutor giờ có 4 nguồn rõ ràng: lộ trình, hồ sơ cá nhân, ngữ cảnh công ty, và Aha gần đây. Path agent nhận company context, lộ trình giao, và module path vào candidate pool/fallback để ưu tiên đúng thứ tự công ty giao.

**Owner:** AI agent session (Codex)

**Status:** Active

**Update 2026-06-16:** `npm run lint` pass; `npm run test` pass (Vitest + API smoke + Phase 2 manager/invite + auth/OAuth); Node 20 `next build` pass.

**Update 2026-06-16 (review fixes):** Path agent gate chuyển sang `organization_members` (không còn phụ thuộc `member_positions` để vào luồng công ty); `validateAgentOutput` giữ thứ tự `assignedPathModules`; curriculum NGUỒN 1 gộp module lộ trình giao + scoring không dấu; demo OpenAI inject curriculum theo vai trò.

---

## [2026-06-16] — Chat: tên module trong trợ lý AI thành link bài học

**Context:** User báo trên `/tro-ly`, AI trả lời tên bài bằng dấu « » (plain text) thay vì link có thể bấm sang `/lo-trinh/{moduleId}` tab mới.

**Options:**
1. Chỉ sửa system prompt — AI output markdown link (phụ thuộc model tuân thủ).
2. Chỉ parse UI — fallback «tên module» → link theo map từ `roles.ts`.
3. Kết hợp prompt + UI parse markdown + fallback guillemet.

**Decision:** Phương án 3 — prompt bắt buộc `[Tên](/lo-trinh/id)`; `module-lesson-links.ts` map title→href; `assistant-chat-messages.tsx` render `<a target="_blank">`. Context curriculum/personal cũng embed link trong NGUỒN 1/2.

**Owner:** AI agent session (Cursor)

**Status:** Active — branch `feat/chat-module-lesson-links`

**Note:** Session đầu code trực tiếp trên `develop` (vi phạm `.agents/rules/agent-workflow.md` §1). Đã chuyển change sang nhánh feature sau khi user nhắc.

**Update 2026-06-16:** Sửa 2 issue PR reviewer còn lại — (1) `matchBoldAt` bỏ cấm `*` đơn trong bold; (2) `appendBoldInner` + `coalesceAdjacentBold` xử lý bold lồng nhau thống nhất. Test + lint + build pass.

---

## [2026-06-16] — Rule task-completion-checklist từ bài học PR review

**Context:** PR `feat/chat-module-lesson-links` qua nhiều vòng review (git nhánh, XSS false positive, regex overlap bold+link). Cần rule always-on để agent sau không lặp lại.

**Decision:** Thêm `.agents/rules/task-completion-checklist.md` + mirror `.cursor/rules/task-completion-checklist.mdc` (`alwaysApply: true`). Wire vào `AGENTS.md`, `agent-workflow.md`, `CLAUDE.md`, `GEMINI.md`.

**Owner:** AI agent session (Cursor)

**Status:** Active

---

## [2026-06-16] — Tái cấu trúc thư mục repo (One Repo — One Source of Truth)

**Context:** Code Next.js (`app/`, `components/`, `lib/`) nằm rải ở root; `src/` còn chứa Python boilerplate cũ; specs nằm trong `docs/specs/`.

**Decision:** Gom code app vào `src/`; chuyển specs → `specs/`, ADR → `adrs/`, sprint plans → `planning/sprints/`; archive FastAPI boilerplate → `legacy/python-boilerplate/`. Giữ config Next.js (`next.config.ts`, `proxy.ts`, `vitest.config.ts`) ở root — đây là Next.js, không phải Vite app.

**Owner:** minhhai203 (AI agent session)

**Status:** Active — branch `refactor/project-folder-structure`

---

## [2026-06-16] — Chia `src/` thành `frontend/` + `backend/`

**Context:** User muốn LangGraph agent (Python) và Next.js tách rõ trong `src/`, theo hướng 2 (không archive legacy mà đưa backend vào src).

**Decision:** `src/frontend/` = Next.js (chạy `next dev src/frontend`); `src/backend/agents/` = LangGraph (`graph.py`, `nodes/`, `tools/`). Package Python đổi tên `src` → `backend`.

**Owner:** minhhai203 (AI agent session)

**Status:** Active

---

**Context:** Sau đợt move `src/` / `specs/` / `planning/` / `legacy/`, repo vẫn còn rủi ro bị các agent tạo file mới sai chỗ, nhất là giữa `docs/`, `planning/`, `specs/`, `tasks/`.

**Decision:** Tạo rule always-on `.agents/rules/project-structure.md` và mirror `.cursor/rules/project-structure.mdc`; chia `docs/` thành `ops/`, `product/`, `handoffs/`, `archive/`, `guide/`; chuyển `demo-plan` vào `planning/demo/`, `spec-review` vào `planning/reviews/`, decision memo vào `planning/decisions/`. Từ nay mọi agent phải đọc rule này trước khi tạo file/thư mục mới.

**Owner:** minhhai203 (AI agent session)

**Status:** Active

---

**Context:** Cần chọn 1 nhóm lĩnh vực trong 10 nhóm để khoanh vùng đề tài. 250 đề rải khắp các lĩnh vực, không thể đọc kỹ tất cả trong Sprint 0.

**Options:**
- Y tế (071-080): volume buyer lớn, social impact rõ, nhưng team thiếu domain knowledge y khoa và có rủi ro compliance.
- Bảo mật (091-100): chủ đề hot, nhưng cần background đặc thù.
- AI Literacy (081-091): đào tạo nhân sự dùng AI, match với kinh nghiệm team về tư vấn AI automation và đào tạo SME.
- Các nhóm còn lại: chưa có competitive advantage rõ ràng.

**Decision:** Chọn **AI Literacy** làm nhóm chính để phân tích sâu.

**Owner:** Cả team

**Status:** Active

---

## [2026-05-31] — Shortlist hướng ban đầu trong AI Literacy

**Context:** Sau khi chọn nhóm AI Literacy, team cần shortlist một số hướng có khả năng phát triển thành web app trong thời gian build phase.

**Tiêu chí filter ban đầu:**
1. Có tạo ra giá trị thực tế cho doanh nghiệp không?
2. Demo cuối kỳ có thuyết phục không?
3. Team có nội dung thật và kinh nghiệm liên quan không?
4. MVP có khả thi trong vài sprint không?

**Shortlist ban đầu:**
- AI20K-084 — Competency Assessment
- AI20K-086 — Use Case Discovery
- AI20K-089 — AI Automation Learning

**Decision:** Trong Sprint 0, team tạm ưu tiên phân tích AI20K-089 vì demo automation workflow có vẻ trực quan. Các hướng khác vẫn được giữ để cân nhắc.

**Owner:** Cả team

**Status:** Superseded bởi quyết định chốt AI20K-083 ngày 04/06/2026

---

## [2026-05-31] — Ưu tiên tạm thời AI20K-089, giữ 084/086 làm backup

**Context:** Sau shortlist ban đầu, team cần một hướng để đào sâu trong Sprint 0/Sprint 1. AI20K-089 có vẻ mạnh vì team có kinh nghiệm automation và có thể demo workflow chạy thật.

**Options:**
- AI20K-084: hợp với đào tạo năng lực AI, nhưng demo dễ thành bảng điểm và cần scoring tốt.
- AI20K-086: dễ build hơn, nhưng rủi ro bị xem như prompt/use-case generator.
- AI20K-089: demo trực quan nhất, nhưng có rủi ro sandbox automation và hạ tầng workflow.

**Decision:** Tạm ưu tiên **AI20K-089** để phân tích sâu, giữ AI20K-084 và AI20K-086 làm backup.

**Owner:** Cả team

**Status:** Superseded bởi quyết định chốt AI20K-083 ngày 04/06/2026

---

## [2026-05-31] — Setup hạ tầng: GitHub repo + AI logging hook

**Context:** Chương trình AI20K Cohort 2 yêu cầu mỗi team có repo official với pre-configured AI logging hooks. Hooks tự động log prompt từ AI tools để phục vụ đánh giá AI literacy.

**Options:**
- Setup ngay từ Sprint 0 để log cả phần research và planning.
- Chờ đến Sprint 2 khi bắt đầu code mới setup.

**Decision:** Setup ngay từ Sprint 0 để log đầy đủ cả strategic thinking, research, planning và build.

**Setup đã làm:**
1. Clone `AI20K-Build-Cohort-2/C2-App-009` về máy.
2. Chạy script setup hooks.
3. Tạo `.env` từ `.env.example`.
4. Verify pre-push hook tồn tại.

**Owner:** Lucas

**Status:** Active

---

## [2026-05-31] — Khởi tạo bộ document: README + JOURNAL + WORKLOG

**Context:** Repo cần bộ tài liệu cốt lõi để team mới đọc vào nắm được tiến độ, quyết định và learning log.

**Decision:** Tạo 3 file chính:
- `README.md`: project overview, scope, kế hoạch.
- `JOURNAL.md`: learning journal theo sprint/tuần.
- `WORKLOG.md`: decision log theo ngày.

**Quy ước update:**
- README cập nhật khi có major change về đề tài, MVP scope hoặc kế hoạch.
- JOURNAL cập nhật trước mỗi PR hoặc khi kết thúc sprint.
- WORKLOG cập nhật mỗi khi có quyết định mới.

**Owner:** Lucas khởi tạo, cả team duy trì

**Status:** Active

---

## [2026-06-04] — Chốt đề tài AI20K-083

**Context:** Sau Sprint 0, team cần chuyển từ shortlist sang đề tài chính thức để bắt đầu thiết kế MVP. Hướng AI20K-089 có điểm mạnh về demo automation nhưng kéo theo rủi ro sandbox, hạ tầng workflow và scope kỹ thuật lớn. Ngày 04/06, team review lại tài liệu đề bài và đưa AI20K-083 vào bàn cân vì đề này vẫn thuộc nhóm AI Literacy nhưng scope web app rõ và ít rủi ro hạ tầng hơn. Team muốn một đề tài vừa fit yêu cầu web app, vừa đủ rõ buyer, vừa khả thi hơn trong thời gian ngắn.

**Nguồn quyết định:** Tài liệu "Dự án 1 - AI Trợ Lý Phổ Cập Kiến Thức AI Nền Tảng Cho Nhân Viên".

**Options đã cân nhắc:**

| Tiêu chí | AI20K-083 | AI20K-084 | AI20K-086 | AI20K-089 |
|---|---|---|---|---|
| MVP feasibility | Cao: learning path + tutor + quiz + dashboard | Trung bình: cần rubric/scoring năng lực tốt | Cao: LLM/RAG gợi ý use case | Trung bình-thấp: cần sandbox/automation runtime |
| Buyer clarity | Doanh nghiệp 10-200 nhân viên | HR/L&D | Cá nhân/team muốn tìm use case | SME/freelancer automation |
| Demo strength | Flow học end-to-end + dashboard | Bảng năng lực | List use case | Workflow chạy thật |
| Technical risk | Thấp-trung bình | Trung bình | Thấp nhưng dễ mỏng | Cao nhất |
| Fit web app requirement | Rõ: auth, user, learning, admin dashboard | Rõ | Rõ nhưng cần tránh prompt wrapper | Rõ nhưng nặng infra |

**Decision:** Chốt **AI20K-083 — AI Trợ Lý Phổ Cập Kiến Thức AI Nền Tảng Cho Nhân Viên**. AI20K-089 bị thay thế vì rủi ro sandbox/automation vượt quá mức cần thiết cho MVP; có thể giữ làm hướng mở rộng sau khi core learning app chạy ổn.

**Lý do:**
- Nhắm đúng pain point doanh nghiệp 10-200 người: nhân viên muốn dùng AI nhưng không biết bắt đầu từ đâu.
- Giải pháp có thể demo tốt bằng learning path cá nhân hóa, AI tutor, bài kiểm tra tình huống và dashboard tiến bộ.
- Không yêu cầu sandbox automation phức tạp ở MVP.
- Có mô hình giá rõ: 300.000 VNĐ/user/tháng hoặc 2.000.000 VNĐ/tháng cho 10 users.

**Owner:** Cả team

**Status:** Active

---

## [2026-06-05] — Chốt kế hoạch làm việc sau khi chọn AI20K-083

**Context:** Sau khi chốt đề ngày 04/06, team cần thống nhất cách làm để bắt đầu build đúng scope, tránh vừa làm vừa đổi hướng.

**Decision:** Chia kế hoạch làm việc theo action table để có thể bước vào scaffold MVP.

| Task | Owner tạm thời | Deadline | Artifact | Acceptance criteria | Status |
|---|---|---|---|---|---|
| Persona + user journey | Lucas | 07/06 | `docs/product/user-journey.md` | Có learner persona, manager persona, end-to-end journey | Planned |
| Lesson/content outline | Tuancoolboy | 07/06 | `docs/content-outline.md` | Có outline AI nền tảng cho ít nhất 2 role mẫu | Planned |
| Wireframe notes | Tuancoolboy | 07/06 | `docs/wireframe-notes.md` | Có màn onboarding, lesson, tutor, assessment, dashboard | Planned |
| Data model + AI flow | minhhai203 | 07/06 | `docs/data-and-ai-flow.md` | Có entity user/role/lesson/quiz/progress và tutor context contract | Planned |
| Tech stack decision | minhhai203 | 07/06 | `docs/tech-stack.md` | Chốt frontend, backend, storage, LLM provider, deploy target | Planned |
| Demo plan | Cả team | 08/06 | `planning/demo/demo-plan.md` | Có seed data, demo account, demo script, public URL plan | Planned |

**MVP nguyên tắc:**
- Làm tốt luồng học AI nền tảng cho 1-2 vai trò trước.
- Tập trung vào trải nghiệm học, hỏi AI, làm bài tình huống và xem tiến bộ.
- Chỉ mở rộng role/content sau khi core flow chạy ổn.
- Ngày 05/06 chốt feature/MVP scope; tech stack là action item riêng cần chốt trước scaffold code.

**Owner:** Cả team

**Status:** Active

---

<!-- Decision tiếp theo thêm ở đây, mới nhất ở dưới cùng -->

---

## [2026-06-08] — Đồng bộ hóa cấu trúc dự án theo template ai20k-agent-template

**Context:** Dự án bước vào Sprint 1, cần thiết lập một cấu trúc thư mục chuẩn hóa và đầy đủ thành phần theo yêu cầu của BTC AI20K Build Phase (bao gồm FastAPI backend, LangGraph agent, Docker, CI/CD workflow, tài liệu hướng dẫn và bộ unit test).

**Options:**
- Tự dựng cấu trúc và các cấu hình Docker/CI/CD thủ công: Mất nhiều thời gian và có nguy cơ bỏ sót các deliverables bắt buộc của BTC.
- Sao chép cấu trúc và mã nguồn mẫu hữu ích từ template chính thức `ai20k-agent-template`: Nhanh chóng, chuẩn hóa, đầy đủ công cụ kiểm thử và tài liệu của chương trình.

**Decision:** Thực hiện clone và sao chép cấu trúc từ template chính thức.
- **Source & Tests:** Sao chép `src/` (FastAPI + LangGraph skeleton) và `tests/` (unit tests mẫu), sửa lỗi tương thích async fixture bằng cách cấu hình `pytest.ini`.
- **DevOps:** Sao chép `Dockerfile`, `docker-compose.yml`, `Makefile`, `.dockerignore`, `ruff.toml` và `.github/workflows/ci.yml`.
- **Tài liệu & Đánh giá:** Sao chép `ARCHITECTURE.md`, `README_boilerplate.md`, `eval/`, `presentation/` và `docs/guide/`.
- **Sáp nhập cấu hình:** Thực hiện merge nội dung `.env`, `.env.example`, và `.gitignore` từ template vào dự án hiện tại để đảm bảo giữ nguyên mã khóa AI logging được BTC cấu hình riêng trước đó.

**Owner:** Antigravity & minhhai203

**Status:** Active

---

## [2026-06-08] — Chốt tech stack: Next.js 16 + Tailwind v4 + Supabase + OpenAI

**Context:** Sprint 1 chốt MVP feature scope nhưng tech stack chưa thành artifact riêng. Bắt đầu Sprint 2 phải có stack rõ ràng trước khi scaffold.

**Options:**
- Next.js 14/15 (App Router): training data ổn, ít breaking changes.
- **Next.js 16 (App Router):** mới release, có breaking changes (`middleware` rename `proxy`, Turbopack default) nhưng đi cùng template `create-next-app` mới nhất, deploy Vercel tối ưu.
- React + Vite SPA: nhanh nhưng không có SSR cho landing SEO + không có Route Handler tiện cho /api/chat.
- Astro: nice cho landing nhưng phức tạp cho /quan-ly dashboard.

**Decision:** **Next.js 16.2.7** vì đi cùng latest Vercel template, hỗ trợ Tailwind v4 sẵn, và ta có thể đọc docs offline trong `node_modules/next/dist/docs/` để verify từng API mới.

**Owner:** Lucas (đã scaffold)

**Status:** Active

---

## [2026-06-08] — Storage: Supabase + RLS · LLM: OpenAI gpt-4o-mini

**Context:** Cần storage cho user data (profiles, progress, time logs, quiz results, chat usage) + LLM cho /tro-ly tutor.

**Options:**
- Storage: Supabase / Firebase / PlanetScale + tự code auth.
- LLM: OpenAI / Anthropic Claude / Google Gemini / self-host Llama.

**Decision:**
- **Supabase** vì có Postgres + Auth + RLS built-in, free tier đủ cho MVP, schema viết SQL chuẩn dễ migrate sau. Schema 6 bảng trong `supabase/migrations/0001_init.sql`, RLS strict (`auth.uid() = user_id`).
- **OpenAI gpt-4o-mini** vì giá ~22.000đ/người/tháng đáp ứng biên gộp ghế nền 100k/user. (CLAUDE.md §11 chốt rate-limit 30 lượt/ngày/user.)

**Owner:** Lucas (đã wire schema)

**Status:** Active

---

## [2026-06-09] — Demo mode (localStorage fallback) cho lúc chưa có Supabase + OpenAI

**Context:** Khi demo thầy hoặc test local, không phải lúc nào cũng có Supabase project setup sẵn. App phải dùng được luôn.

**Options:**
- Bắt thầy/teammate tự setup Supabase project trước khi xem demo (~15 phút).
- Mock toàn bộ backend bằng JSON file (nặng, mất ý nghĩa demo).
- **Detect env thiếu → tự fall back sang localStorage** (cho user-scoped data) + canned responses (cho /tro-ly).

**Decision:** Option 3. Logic:
- `lib/supabase/is-configured.ts` check `NEXT_PUBLIC_SUPABASE_URL` + `_ANON_KEY` có không.
- Thiếu → set cookie `ai_troly_demo_session` + dùng `lib/demo-storage.ts` (localStorage wrapper).
- `/tro-ly` thiếu OpenAI key → dùng `lib/tro-ly-canned-responses.ts` (canned answer theo regex match câu hỏi + role).
- Banner cam ở đầu `(app)/layout` báo user biết đang ở demo mode.

Khi env có sẵn → code tự nhận biết và dùng real backend, không cần thay code.

**Owner:** Lucas

**Status:** Active

**Risk note:** Tech debt khi launch real — phải đảm bảo demo paths không bị users tìm thấy ở production. Phương án: assert env trong CI/CD pipeline trước deploy production.

---

## [2026-06-09] — Tuancoolboy review code, push Vercel và hoàn thiện database employee

**Context:** Sau khi core UI chạy được, cần kiểm tra lại code, đưa bản demo lên
Vercel và bảo đảm phần database cho nhân viên đủ dữ liệu thật trước khi mở rộng
sang manager.

**Options:**
- Chỉ dùng localStorage demo: nhanh nhưng không chứng minh được persistence thật.
- Chạy Supabase cho employee trước, manager làm sau: đúng thứ tự vì employee là
  nguồn dữ liệu cho dashboard quản lý.

**Decision:** Tuancoolboy đã xem/review code, push demo lên Vercel và hoàn thiện
database employee theo migrations `0001_init.sql` và
`0003_employee_profile_assessment.sql`: `profiles`, `module_progress`,
`quiz_results`, `time_logs`, `chat_usage`, `leads`, RLS user-scoped và các field
onboarding assessment để lưu vai trò, daily tasks, AI level.

**Owner:** Tuancoolboy

**Status:** Active

---

## [2026-06-09] — Charts dùng recharts (cho dashboard manager)

**Context:** `/quan-ly` dashboard cần 3 biểu đồ (bar theo phòng ban, donut trạng thái, line trend 6 tuần).

**Options:**
- **recharts:** React-friendly, ~92KB gzip, declarative JSX.
- chart.js + react-chartjs-2: như prototype HTML, ~67KB gzip nhưng imperative API.
- nivo / visx: feature-rich nhưng nặng (>200KB).
- Custom SVG: 0 dep nhưng code phức tạp + maintain khó.

**Decision:** **recharts** vì idiomatic React, dễ maintain, performance OK với 12 nhân viên data.

**Owner:** Lucas

**Status:** Active

---

## [2026-06-09] — Role detection cho demo: email pattern matching

**Context:** Demo mode không có database để query `user_type`. Phải biết user là nhân viên hay quản lý ngay khi login.

**Options:**
- Hỏi user "Bạn là ai?" sau khi login (thêm 1 màn hình).
- Set `userType` cố định trong cookie test, dev tự đổi.
- **Detect qua email pattern** (`quanly@`, `manager@`, `hr@`, `admin@`, `truongphong`).

**Decision:** Option 3 — UX gọn nhất cho demo. Khi có Supabase thật → query `profiles.user_type` (TODO marker đã ghi trong `(app)/layout.tsx`).

**Owner:** Lucas

**Status:** Active

---

## [2026-06-09] — File middleware.ts rename sang proxy.ts (Next 16)

**Context:** Khi chạy `npm run dev` thấy warning:
> The "middleware" file convention is deprecated. Please use "proxy" instead.

**Decision:** Rename file + đổi function name. Đã đọc `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` xác nhận API signature giống hệt. Chỉ đổi tên file + tên function.

**Owner:** Lucas

**Status:** Active

**Bài học:** Tin docs offline trong `node_modules/next/dist/docs/` thay vì training data Claude khi gặp Next 16 API. AGENTS.md đầu repo đã nhắc.

---

## [2026-06-10] — Deploy production qua Vercel CLI (project `c2-app-009`)

**Context:** Cần demo UI công khai trên Vercel Hobby, không phụ thuộc import GitHub org private (Hobby không link được repo org).

**Options:**
- Import GitHub org repo vào Vercel (bị chặn trên Hobby).
- Deploy bằng `vercel --prod` từ máy local (CLI upload source).
- Mirror repo sang personal GitHub rồi import (đã ghi trong PROJECT-CONTINUATION, chưa dùng lần này).

**Decision:** Deploy CLI trực tiếp → project `c2-app-009`, sync env vars từ `.env.local` lên Vercel Production, production alias chính **`https://c2-app-009.vercel.app`**.

**Owner:** minhhai

**Status:** Active

---

## [2026-06-10] — Tắt Vercel Deployment Protection (SSO) cho demo công khai

**Context:** Bạn bè truy cập link production thấy màn **"Log in to Vercel"** thay vì landing app. Project đang bật `ssoProtection: all_except_custom_domains` — khóa mọi URL `*.vercel.app`.

**Options:**
- Approve từng user trong External Access (Hobby giới hạn ~1 external user, không scale).
- Tắt SSO protection: `vercel project protection disable c2-app-009 --sso`.
- Mua custom domain + Pro (không cần cho demo hiện tại).

**Decision:** Tắt SSO protection. Demo công khai dùng URL production; auth app vẫn qua Supabase `/login`.

**Owner:** minhhai

**Status:** Active

---

## [2026-06-10] — Tài khoản demo Supabase: admin + guest (SQL thủ công)

**Context:** Cần tài khoản sẵn cho demo hội đồng: quản lý xem `/quan-ly/leads`, guest trải nghiệm onboarding từ đầu.

**Options:**
- Supabase Dashboard → Add user (đơn giản, khuyến nghị cho admin).
- SQL script trong SQL Editor (tạo `auth.users` + `auth.identities` + `profiles`).

**Decision:**
- **Admin:** email prefix `admin@` / `quanly@` / `manager@` → app detect manager qua `detectUserTypeFromEmail()` (GĐ1, chưa có `profiles.user_type`).
- **Guest:** email thường (`guest@...`), `email_confirmed_at` set sẵn, **`role_id = NULL`** → login vào `/onboarding`, không force vai trò.
- Lưu ý PL/pgSQL: mỗi `%` trong `RAISE NOTICE` phải có tham số đi kèm.

**Owner:** minhhai

**Status:** Active

---

## [2026-06-10] — Landing headline: ngắt dòng có chủ đích

**Context:** Tiêu đề "Tại sao khóa đào tạo AI cũ không hiệu quả?" bị browser wrap xấu (`hiệu` / `quả?` tách dòng).

**Options:**
- `whitespace-nowrap` trên cụm "không hiệu quả?" (đã thử, vẫn chưa đúng ý copy).
- `<br />` cố định sau "AI cũ" — hai dòng: `...AI cũ` / `không hiệu quả?`.
- Rút ngắn copy.

**Decision:** Dùng `<br />` sau "Tại sao khóa đào tạo AI cũ". Commit `ae1845c` trên `develop`, deploy production.

**Owner:** minhhai

**Status:** Active

---

## [2026-06-10] — BE-12: Chatbot 2 quyền (nhân viên / quản lý) + trí nhớ dài hạn

**Context:** Trợ lý AI trước đây chỉ phục vụ nhân viên đã onboarding, gửi 1 tin/lần không nhớ hội thoại; quản lý không chat được vì API bắt buộc `role_id`. Product yêu cầu 2 chatbot riêng: nhân viên kèm cặp học theo tiến độ thật, quản lý phân tích team từ Supabase.

**Options:**
- Chỉ lưu core context (summary), không lưu messages → rẻ hơn nhưng không xem lại hội thoại.
- Lưu messages + AI tóm tắt core context sau mỗi phiên → đủ trí nhớ dài hạn + lịch sử UI.
- Manager chatbot dùng mock `team-data.ts` → giữ GĐ1 scope nhưng không đáp ứng yêu cầu phân tích thật.
- Manager chatbot đọc Supabase thật (service role) → lát cắt Phase 2 có chủ đích; dashboard `/quan-ly` vẫn mock.

**Decision:**
- Migration `0012_chat_memory.sql`: `chat_conversations`, `chat_messages`, `chat_memories` + RLS user-scoped.
- System prompt tách `buildEmployeeSystemPrompt` / `buildManagerSystemPrompt`; UI hiển thị **Trợ lý AI (trợ lý riêng của …)**.
- Employee: inject tiến độ (`module_progress`, `quiz_results`, `time_logs`) + core context; 6 tin gần nhất vào OpenAI.
- Manager: không cần `role_id`; `getTeamAnalysisSummary()` qua service role + `auth.admin.listUsers`, lọc email pattern nhân viên.
- Sau stream: lưu turn + `refreshCoreContext` async (throttle ≥5 phút hoặc ≥3 lượt).
- API mới: `GET /api/chat/history`; `POST /api/chat` trả header `X-Conversation-Id`.
- Spec: `specs/BE-12-role-chatbots-and-memory.md`.

**Owner:** minhhai (branch `feat/haidm/personal-chatbot`)

**Status:** Active

**Verification (2026-06-10):** Migration `0012_chat_memory.sql` đã chạy trên Supabase local. `npm test` pass: Vitest 51/51, API integration 30/30 (Supabase mode), pytest 5/5 — gồm manager chat không `role_id`, history persist, `X-Conversation-Id`.

**Follow-up:** Smoke test browser (nhân viên: "lần trước học đến đâu"; quản lý: "ai chậm tiến độ"); Phase 2 thêm `profiles.user_type` thay email pattern.

---

## [2026-06-11] — Quy trình bắt buộc cho mọi AI agent

**Context:** Team cần thống nhất cách làm việc giữa Cursor, Codex, Claude Code và các agent khác — tránh làm trên nhánh cũ, bỏ qua test, hoặc không cập nhật tài liệu.

**Options:**
- Chỉ ghi trong README → dễ bị bỏ qua bởi agent.
- Rule Cursor `alwaysApply: true` + cập nhật `AGENTS.md` → agent luôn thấy khi mở repo.

**Decision:** Thêm `.cursor/rules/agent-workflow.mdc` (always apply) và section **Feature Workflow** trong `AGENTS.md`:
1. Feature mới: `git checkout develop && git pull`, rồi nhánh `{type}/{noi-dung}` (vd. `feat/update-lession-ui`).
2. Sau feature: chạy `npm run lint`, `npm run test`, `npm run build` và review toàn bộ diff.
3. Trong lúc làm: cập nhật `WORKLOG.md`, `PROJECT-CONTINUATION.md`, và spec notes nếu có.

**Update 2026-06-11:** Mở rộng sang mọi AI tool — canonical rule `.agents/rules/agent-workflow.md` (`activation: always-on`), thêm `GEMINI.md`, cập nhật `CLAUDE.md` + bảng tool mapping trong `AGENTS.md`.

**Owner:** minhhai

**Status:** Active

---

## [2026-06-15] — Renumber Supabase migrations + rule timestamp bắt buộc

**Context:** Merge `develop` + nhánh mentor/SaaS tạo trùng số `0013`–`0022`; `supabase db push` fail. User yêu cầu renumber và rule cho lần sau.

**Decision:**
1. Rename 18 file sang `YYYYMMDDHHMMSS_<noi-dung>.sql` theo thứ tự dependency (Phase 2.0 develop → mentor → content/grading → agent paths). `0007b` → `20260608150000_image_paths_column.sql`.
2. Rule canonical `.agents/rules/supabase-migrations.md` + Cursor `.cursor/rules/supabase-migrations.mdc`; cấm numbered `0013+`.
3. `npm run db:validate` + hook trong `db:sync`; legacy giữ `0001`–`0012`.

**Kiểm tra:** `npm run db:validate` 30 files OK; vitest 154 pass; `next build` pass.

**Follow-up:** Remote đã apply tên cũ → `npm run db:repair:help` / `supabase migration repair` trước push production.

**Owner:** Claude Code

**Status:** Active

---

## [2026-06-13] — 5 tính năng theo góp ý mentor (Phase 2)

**Context:** Họp mentor 10/06 chốt 5 hạng mục cần hoàn thiện để demo + test phòng HR với khách trong 3 ngày. Nguồn: `docs/handoff-phase2-mentor-features.md`.

**Decision:** Build cả 5 mục theo thứ tự ưu tiên mục 6, làm bài bản (schema chuẩn + migration + RLS) song song demo fallback localStorage. Không phá Phase 1.

1. **Aha Moment** (mục 1) — thay Bước 4 trong `components/module-lesson-content.tsx` bằng flow 3 ô (điều vừa hiểu / nối kiến thức mới↔cũ / sẽ thử khi nào) + AI hỏi lại đúng 1 câu (`/api/aha`, token thấp, có câu mẫu khi chưa bật OpenAI) + chọn phạm vi chia sẻ (riêng tư/phòng/công ty) + nút bỏ qua. Ghi giờ tiết kiệm vào `time_logs`. Migration `0013_aha_reflections` + RLS. Demo: `lib/demo-aha.ts`.
2. **Nội dung HR** (mục 5) — mở rộng vai trò `van-hanh` → lộ trình Hành chính/HR (m7–m10: soạn quyết định, lọc CV, email nội bộ, chấm công/nghỉ phép). Thêm cờ `isFoundation` + `skills[]` trên module. Helper `composePathFromSkills`/`getFoundationModules`. Migration `0014_skills_module_skills` + seed kỹ năng chung + map module HR.
3. **Manager builder** (mục 3) — `app/(app)/quan-ly/lo-trinh` + `components/manager-path-builder.tsx`: chọn vị trí chính + tick kỹ năng → AI gợi ý lộ trình (Nền tảng + module theo kỹ năng, tự sắp cấp độ) → tick +/− → gán. Migration `0015_job_positions_learning_paths` (6 bảng) + RLS. Demo: `lib/demo-paths.ts`.
4. **Invite** (mục 2) — `/quan-ly/nhan-vien` modal thêm chọn phòng ban + vị trí khi mời. Nút "Đăng nhập với Google" (`components/auth-google-button.tsx`, bật ở real mode) + env config `.env.example`.
5. **Leaderboard + feed** (mục 4) — `app/(app)/bang-xep-hang` 3 tab (Phòng/Công ty/Cá nhân) + bảng tuần & tổng + opt-in ẩn tên ở bảng công ty. Feed widget (`components/dashboard-feed.tsx`) trên dashboard + trang xếp hạng. Migration `0016_leaderboard_points` (challenges/points_ledger/leaderboard_visibility) + RLS + seed challenge.

**Kiểm tra:** `npx eslint` sạch, `npx vitest run` 57/57 pass, `npx next build` exit 0 (TS pass, đủ route mới).

**Còn lại (backend song song, không chặn demo):** wiring API thật ghi `learning_paths`/`path_assignments`/`points_ledger`; Google OAuth callback thật; nguồn feed/leaderboard từ bảng `events`+`points_ledger` thay dữ liệu demo.

**Owner:** Claude Code

**Status:** Active

---

## [2026-06-13] — 3 thay đổi UX sau review (tool AI + rubric + paste text)

**Context:** Review sản phẩm chốt 3 thay đổi UX (`docs/handoff-3-ux-changes.md`), có các mục [SỬA THEO REVIEW]. Nhánh `feature/ux-3-changes` tách từ `feature/phase2-mentor-features` (Phase 2 chưa merge develop; mục 1 phụ thuộc màn bài học 5 bước + Aha của Phase 2).

**Decision:**
1. **Tool AI (mục 3) + prompt động (mục 2):** `lib/ai-tools-config.ts` (tool chính + tool chuyên dụng) + `lib/ai-tool-helper.ts` (`getOrgAiTool` — 1 nguồn sự thật theo 6.4). Trang `/quan-ly/cai-dat` cho quản lý chọn tool chính (chặn quyền ở route lẫn UI). `/api/org-settings` GET/PUT (PUT manager-only). Bài học hiển thị tool động: "Mở [tool] → paste prompt" + note "tối ưu cho [tool]"; bài cần ảnh/video hiện banner tool chuyên dụng + lý do (note trung tính, 6.5). Làm rõ app dạy dùng tool ngoài vs Trợ lý AI là gia sư. Migration `0017` thêm `organizations.ai_tool` + `learning_modules.tool` + RLS update cho manager. Icon SVG `public/images/tools/`.
2. **Chấm rubric + paste text (mục 1):** ô paste text trên upload ảnh (nộp text-only hoặc kèm ảnh). Mở rộng `/api/practice-review` nhận `answerText` (KHÔNG dùng `/api/chat`, tránh quota chat). Chấm theo `rubric` của module; thiếu rubric → chấm tự do (6.3). Text là căn cứ chính, ảnh bổ sung. JSON robust: strip ```json fences, try/catch không crash, clamp `points<=maxPoints`, total = sum đã clamp (6.1). Demo random 40–95 (6.2). Cắt text 6000 ký tự (6.6). Bảng điểm rubric từng tiêu chí. Dùng hằng `PRACTICE_PASS_SCORE` thay hardcode.

**Kiểm tra:** `npx eslint` (changed files) sạch; `npx vitest run` 59/59 pass (+2 test parseRubricReviewJson); `npx next build` exit 0 (route `/quan-ly/cai-dat`, `/api/org-settings`).

**Còn lại:** cột `rubric` chưa lưu DB (lấy từ data tĩnh theo id qua `mapRow`); hydrate `org_ai_tool` localStorage từ DB hiện làm ở settings + lesson load (chưa ở layout chung).

**Owner:** Claude Code

**Status:** Active

---

## [2026-06-13] — Hoàn thiện handoff-tong-hop (C) + nền SaaS §0.2 + push 5 PR stacked

**Context:** Bàn giao tổng hợp A→B→C. A (Phase 2) + B (3 UX) đã code; cần làm Phần C + nền phân quyền/RLS §0.2 và đẩy GitHub cho đồng đội (tự chủ, an toàn).

**Decision — 5 nhánh stacked, mỗi nhánh 1 PR base đúng nền (chưa merge):**
- A `feature/phase2-mentor-features` (base develop) → PR #22
- B `feature/ux-3-changes` (base A) → PR #23
- C1 `feature/saas-rbac-foundation` (base B) → PR #24: migration 0018 `platform_admins` + `is_platform_admin()` + `account_type` + policy SELECT platform_admin; `lib/rbac.ts` + `lib/audit-log.ts` (wire org-settings PUT). Chỉ đặt nền, chưa UI super-admin.
- C2 `feature/sample-files` (base C1) → PR #25: `attachedFile` + 7 file mẫu ẩn danh `public/files/` (có điểm bẫy) + migration 0019; hộp tải file ở Bước 1.
- C3 `feature/dept-tool-individual` (base C2) → PR #26: tool theo phòng ban (`getDeptAiTool`, migration 0020 `department_ai_tools`) + builder đảo cấp phòng/cá nhân + account-check + `videoGuide` + `suggestToolForIndividual` (pure+test).

**An toàn:** KHÔNG tự merge/xóa nhánh, không commit `.env`, commit chọn lọc, mọi migration có rollback.

**Kiểm tra:** eslint sạch · vitest 65/65 · next build exit 0 (mỗi cụm).

**Còn lại:** persistence DB cho dept-tool & user_tool_status; wiring gợi ý tool vào onboarding cá nhân; seed `platform_admins`. Chi tiết: `docs/handoffs/ket-qua-ban-giao.md`.

**Owner:** Claude Code

**Status:** Active

---

## [2026-06-13] — Hợp nhất Agent lộ trình lên nền admin/super-admin + demo gọi OpenAI thật

**Context:** Đưa Agent sinh lộ trình (2 luồng) lên nhánh `feature/admin-superadmin-ui` (đã có `/quan-tri` + Phần C gợi ý tool cá nhân). Nhánh kết quả `feat/admin-agent-demo-openai`.

**Decision:**
1. **Agent lộ trình** (`app/api/agent/lo-trinh`, `lib/agent/*`, `components/agent-path-panel.tsx`, migration `0022`): mang nguyên từ `feat/agent-lo-trinh`. Migration đổi `0018`→`0022` (nền đã dùng tới `0021`).
2. **Khử trùng `individual-tool-suggest.ts`:** GIỮ bản nền (Phần C, `suggestToolForIndividual(roleId)→{tool,reason}`); bỏ bản Agent tự tạo. `path-agent-input.ts` đổi import sang `suggestToolForIndividual(roleId).tool`.
3. **Chat demo gọi OpenAI thật** (`app/api/chat/route.ts`): chỉ canned khi KHÔNG có key. Demo + có key → đường tối giản `streamDemoOpenAI` (system prompt theo role, KHÔNG context/history Supabase, KHÔNG lưu, rate-limit in-memory `checkRateLimit`, cache câu phổ biến). Không crash khi thiếu Supabase.
4. **Agent route demo:** đã sẵn gọi OpenAI theo `isOpenAIConfigured()` (không gate theo mode) — chỉ cache mới gate supabase. Không cần sửa.
5. **Test động** (`learning-modules-data.test.ts`): giữ bản kiểm động ≥6/role + tổng = sum thực tế (theo yêu cầu user).

**Kiểm tra:** `npm run lint` sạch (1 warning pre-existing `scripts/`); `npx vitest run` 79/79 pass; `npm run build` exit 0 — đủ `/quan-tri`, `/api/chat`, `/api/agent/lo-trinh`.

**Còn lại:** chạy migration `0022` trên Supabase cho real mode; đặt `OPENAI_API_KEY` để demo gọi OpenAI thật (thiếu key → canned/fallback); rate-limit in-memory dùng chung key `demo-user` ở demo (best-effort).

**Owner:** Claude Code
## [2026-06-11] — Định nghĩa Phase 2: company learning platform + 4 AI capabilities

**Context:** Product cần gom định hướng công ty, lộ trình tùy biến, Aha Moment,
community/leaderboard và 4 agent thành một source of truth có thể triển khai.

**Options:**
- Xây 4 autonomous agents gọi lẫn nhau.
- Giữ 4 capability độc lập, deterministic-first, LLM chỉ dùng ở phần cần ngôn
  ngữ/đánh giá mở.
- Tách thêm LangGraph/FastAPI service ngay trong Phase 2.

**Decision:**
- Tạo `specs/PHASE2-SPEC.md`.
- Giữ Next.js 16 + Supabase + OpenAI SDK; không thêm backend/runtime mới.
- Thiết kế 4 capability: tutor, grader, recommender, manager analytics.
- Recommendation, leaderboard, MCQ và metrics dùng rules/SQL, không dùng token.
- Google OAuth là must-ship; phone OTP đặt sau feature flag vì phụ thuộc SMS
  provider và budget.
- Aha Moment private mặc định; sharing là opt-in.
- Chia roadmap thành Phase 2.0 đến 2.8, bắt đầu bằng hardening manager/invite
  hiện tại trước khi mở rộng.

**Owner:** minhhai

**Status:** Spec ready for review

---

## [2026-06-11] — Fix Phase 2 review issues (CRITICAL + HIGH + spec gaps)

**Context:** Hai review từ Senior Product Dev + Technical Architect chỉ ra các
vấn đề cần fix trước khi bắt đầu build Phase 2.

**Fixes thực hiện:**

### Code fixes (migration + routes)

- **CRITICAL — `auth.admin.listUsers` full scan:** migration 0013 thêm
  `profiles.email` (unique index, backfill từ `auth.users`, trigger sync khi
  register/email update). Route `app/api/manager/team/route.ts` thay thế 2 hàm
  pagination loop bằng: (a) `profiles.email` lookup → `getUserById` O(1) và
  (b) `Promise.all(getUserById)` song song, không scan toàn bộ.
- **HIGH — Invite link expiry:** migration 0013 thêm `expires_at`, `max_uses`,
  `used_count` vào `organization_invite_links`. RPC function
  `increment_invite_used_count` dùng atomic SQL update tránh race condition.
  `lib/company-invite-links.ts` cập nhật types + `findActiveInviteLinkByToken`
  kiểm tra expiry/exhaustion. `app/moi/[token]/accept/route.ts` gọi RPC thay
  vì update `last_used_at` thủ công.

### Spec fixes (PHASE2-SPEC.md)

- **Scope adjustment:** community feed + badges → optional behind feature flag;
  AI-assisted module draft → must-ship (trong authoring UX).
- **Leaderboard:** opt-in per employee (không phải opt-out).
- **Multi-org note (Section 13.1):** clarify `profiles.organization_id` là
  shortcut context, không dùng cho RLS; authorization luôn qua
  `organization_members`.
- **RLS helpers (Section 13.2):** standardize dùng security-definer functions
  thay inline subquery.
- **AI budget fallback_behavior enum (Section 13.3):** định nghĩa 3 giá trị
  `block`/`queue`/`degrade` + race condition mitigation.
- **Phase 2 KPIs (Section 17):** thêm 7 KPIs với ngưỡng + nguồn đo.
- **Assignment version upgrade (Section 16):** spec endpoint + progress
  transfer rule.
- **Definition of Done:** thêm bắt buộc rollback section trong mỗi migration.
- **Open decisions:** đánh priority HIGH cho 3 quyết định cần chốt sớm.
- **P2-BE-02:** đánh dấu completed trong Phase 2.0 checklist.

**Decision:**
- Giữ `profiles.organization_id` FK không đổi; Phase 2 không tạo thêm ràng buộc
  multi-org — để migration sau làm nullable khi cần.
- Dùng atomic SQL RPC cho used_count thay vì optimistic lock ở application layer.

**Owner:** minhhai

**Status:** Done — cần chạy migration 0013 trên Supabase

---

## [2026-06-12] — Auth: Nhập tên khi đăng ký account

**Context:** Manager cần nhìn được tên thật của nhân viên trong danh sách đội,
không chỉ email. Form đăng ký phải yêu cầu họ tên và Supabase phải đồng bộ tên
này vào `profiles.full_name`.

**Options:**
- Để manager tự nhập tên khi thêm nhân viên: dễ sai và trùng dữ liệu.
- Lưu tên từ lúc register qua Supabase Auth metadata rồi trigger ghi vào profile:
  đúng nguồn dữ liệu và dùng lại được ở manager dashboard.

**Decision:** Tuancoolboy thêm/sửa flow đăng ký account để nhập tên, gửi
`full_name` vào Supabase Auth metadata và dùng migration
`0009_profile_full_name_metadata.sql` để đồng bộ vào `profiles.full_name`.

**Owner:** Tuancoolboy

**Status:** Active

---

## [2026-06-13] — Màn "Thiết kế lộ trình" tab Phòng ban → phân cấp dọc (mặc định phòng + override member)

**Context:** `/quan-ly/lo-trinh` tab "Theo phòng ban" đổi từ wizard sang phân cấp dọc. Giữ tab "Theo cá nhân".

**Decision:**
1. Tách `ManagerPathBuilder` thành shell mỏng (tab) + 2 component: `manager-dept-path-designer.tsx` (UI dọc mới), `manager-member-path-wizard.tsx` (wizard cũ, cá nhân).
2. Dept designer: chọn phòng + vị trí → khối "Kỹ năng áp cho CẢ phòng" (mặc định) → danh sách thành viên dọc (avatar `initialsOf` + tên + chip kỹ năng hiệu lực + "Tùy chỉnh"). Click → bung panel chỉnh kỹ năng RIÊNG (override) → nhãn "đã chỉnh riêng" + "Bỏ chỉnh riêng". Hiệu lực = override ?? kỹ năng phòng.
3. "AI gợi ý lộ trình" = `composePathFromSkills(deptSkills)` (suggester rule-based hiện có); "Lưu & gán cho cả phòng" → `saveDemoDeptDesign` (mặc định phòng + override member) + `addDemoAssignment` từng thành viên theo kỹ năng hiệu lực.
4. Demo storage mới `lib/demo-paths.ts`: `DemoDeptDesign` + `getDemoDeptDesign`/`saveDemoDeptDesign` (map deptId→design, localStorage). Đổi phòng nạp lại thiết kế đã lưu. Tránh `useEffect` set-state (dùng handler onChange).

**Kiểm tra:** `npm run lint` sạch (1 warning pre-existing `scripts/`); `npx vitest run` 79/79; `npm run build` exit 0 (`/quan-ly/lo-trinh`).

**Còn lại:** real mode ghi override/default vào `member_positions`/`position_skills` (migration 0015) thay localStorage; nút "AI gợi ý" hiện dùng rule-based, có thể nối Agent `/api/agent/lo-trinh` nếu cần (Agent hiện session-scoped, cần contract nhận skill list).

**Owner:** Claude Code

**Status:** Active

---

## [2026-06-13] — Agent nhận skill list cho preview phòng ban (nút "AI gợi ý lộ trình")

**Decision:** Mở rộng `/api/agent/lo-trinh`: nhánh PREVIEW khi body có `skillSlugs` → `buildDeptPreviewInput` dựng input luồng công ty TRỰC TIẾP (skill list + roleId + level đại diện), KHÔNG đọc DB, KHÔNG ghi cache cá nhân (tránh đè lộ trình riêng của quản lý). `generatePath` gọi OpenAI khi có key, validate id từ kho; lỗi/không key → fallback `composePathFromSkills`. Dept designer gọi API này (cache client theo phòng+skills), render badge AI/Quy tắc; lỗi → fallback rule-based, không crash.

**Kiểm tra:** `npm run lint` sạch (1 warning pre-existing); `npx vitest run` 81/81 (+2 test `buildDeptPreviewInput`); `npm run build` exit 0.

**Owner:** Claude Code

**Status:** Active

---

## [2026-06-13] — Trợ lý AI quản lý (demo) có dữ liệu đội, không hỏi ngược

**Decision:** Demo mode dựng `buildDemoTeamSummary()` (lib/team-data.ts) từ `TEAM_MEMBERS` (tổng quan, theo phòng, ai cần kèm, ai làm tốt) thay `getTeamAnalysisSummary` (cần Supabase). Truyền vào `buildManagerSystemPrompt` trong `streamDemoOpenAI` (app/api/chat/route.ts) → Trợ lý quản lý phân tích đội ngay, không hỏi ngược điểm quiz/giờ học. Vẫn gọi OpenAI thật khi có key.

**Kiểm tra:** `npm run lint` sạch (1 warning pre-existing); `npx vitest run` 81/81; `npm run build` exit 0. Test live: chat manager demo → trả phân tích cụ thể từng nhân viên + phòng (X-Chat-Mode: demo-openai).

**Owner:** Claude Code

**Status:** Active
## [2026-06-12] — BE-08: Thêm nhân viên bằng email đã đăng ký

**Context:** Quản lý cần thêm nhân viên vào công ty nhưng không nên tự tạo hồ sơ
ảo hoặc nhập lại tên/phòng ban bằng tay. Email phải thuộc tài khoản Supabase Auth
đã đăng ký.

**Options:**
- Cho manager nhập đầy đủ tên, email, phòng ban: nhanh nhưng dễ lệch với hồ sơ thật.
- Chỉ nhập email, server tìm Auth user + profile rồi ghi `organization_members`:
  ít lỗi hơn và giữ một nguồn dữ liệu.

**Decision:** Tuancoolboy code flow thêm nhân viên ở `/quan-ly/nhan-vien`:
manager nhập email, API kiểm tra Auth user, lấy tên/số điện thoại/phòng ban từ
`profiles`, rồi thêm membership vào `organization_members`; nếu bật quyền quản
lý thì tạo công ty riêng cho email đó.

**Owner:** Tuancoolboy

**Status:** Active

---

## [2026-06-12] — BE-10: Link mời nhân viên token-only

**Context:** Manager cần gửi một link mời công ty cho nhân viên tự đăng ký hoặc
đăng nhập rồi được thêm vào đúng tổ chức, không lộ organization id trong URL.

**Options:**
- Link chứa email/tổ chức trực tiếp: dễ debug nhưng lộ thông tin.
- Token-only `/moi/[token]`: URL gọn, có thể rotate, server kiểm tra bằng service
  role.

**Decision:** Tuancoolboy thêm mục link mời trong trang nhân viên, API tạo/copy/
đổi token và migration `0011_company_invite_links.sql`. Flow accept link ghi
`organization_members` quyền `employee` cho đúng tổ chức và giữ redirect login/
register qua `next`.

**Owner:** Tuancoolboy

**Status:** Active

---

## [2026-06-12] — Fix seed bài học không phụ thuộc Supabase Realtime

**Context:** Khi chạy `npx -y -p node@20 node --env-file=.env.local ./node_modules/.bin/tsx scripts/seed-learning-modules.ts`, Supabase JS khởi tạo Realtime và lỗi vì Node 20 không có native WebSocket.

**Options:**
- Cài thêm package `ws` và truyền transport cho Supabase Realtime — thêm dependency chỉ để seed dữ liệu tĩnh.
- Chạy seed bằng Node 22 — giải quyết tạm thời nhưng dễ lặp lại lỗi trên máy dùng Node 20.
- Gọi Supabase PostgREST trực tiếp bằng `fetch` + service role — đúng nhu cầu upsert bảng `learning_modules`, không khởi tạo Realtime.

**Decision:** Đổi `scripts/seed-learning-modules.ts` sang PostgREST `POST /rest/v1/learning_modules?on_conflict=id` với `Prefer: resolution=merge-duplicates,return=minimal`.

**Owner:** Tuancoolboy

**Status:** Active

---

## [2026-06-12] — BE-08: Mỗi manager email có một công ty riêng

**Context:** Khi set `ronaldo36@gmail.com` lên manager bằng cách update
`organization_members.member_role`, tài khoản này rơi vào cùng `Tổ chức mặc định`
với `vuhaituan@gmail.com`. Root cause là migration `0008` backfill manager vào
default org, còn runtime lấy membership đầu tiên bằng `.limit(1)`, nên dữ liệu
đa công ty không được tách ổn định.

**Options:**
- Giữ default org và chỉ sửa SQL thủ công: nhanh nhưng dễ tái lỗi khi thêm manager mới.
- Tách theo domain email: hợp doanh nghiệp thật hơn, nhưng email cá nhân như Gmail sẽ vẫn lẫn.
- Tách mỗi manager email sang một private organization: phù hợp giai đoạn chưa có UI chọn nhiều tổ chức.

**Decision:** Chọn tách theo từng manager email. Thêm helper chọn membership ưu
tiên `owner`, organization riêng, rồi `updated_at`; thêm migration `0014` để
tách dữ liệu cũ; checkbox **Cấp quyền quản lý** tạo công ty riêng cho email được
cấp quyền. Thêm script reset dev DB xóa cả Auth users để test lại từ đầu.

**Owner:** Tuancoolboy

**Status:** Active

---

## [2026-06-12] — BE-08: Một email chỉ thuộc một công ty

**Context:** Sau khi tách manager theo công ty riêng, phát hiện case
`mixi@gmail.com` đã được thêm vào công ty A nhưng manager công ty B vẫn có thể
thêm cùng email hoặc user có thể accept link mời của công ty B.

**Options:**
- Chỉ chặn ở UI: dễ hiểu nhưng không bảo vệ API/link mời và race condition.
- Chỉ thêm unique DB constraint: bảo vệ dữ liệu nhưng lỗi trả về thô, khó hiểu.
- Kết hợp runtime guard + DB constraint: API/link mời trả lỗi rõ, DB vẫn là lớp
  khóa cuối.

**Decision:** Áp dụng rule một Supabase Auth user/email chỉ có một membership
công ty. Thêm migration `0015_single_organization_membership.sql`, helper
`lib/single-organization-membership.ts`, chặn cả `/api/manager/team` và
`/moi/[token]/accept`, đồng thời cập nhật helper promote manager.

**Owner:** Tuancoolboy

**Status:** Active

**Follow-up:** Sau mỗi `vercel --prod`, chạy `vercel alias set <deployment-url> c2-app-009.vercel.app` vì Vercel đôi khi chỉ auto-alias `ai-tro-ly.vercel.app` (tên project cũ).

---

## [2026-06-12] — Tổng hợp lộ trình triển khai Phase 1 → Phase 2 thành HTML

**Context:** Team cần một trang duy nhất để nhìn rõ những gì Phase 1 đã ship,
nền tảng Phase 2 đang có, chuỗi phụ thuộc và toàn bộ roadmap Phase 2.0–2.8.

**Decision:**
- Tạo `specs/PHASE2-ROADMAP.html` dạng self-contained, responsive, không
  thêm dependency.
- Đối chiếu trạng thái từ spec, plans, implementation notes, worklog, git
  history, migrations, routes và tests thay vì chỉ sao chép checklist.
- Hiển thị riêng hai khái niệm: nền tảng đã có sẵn và tiến độ checklist Phase 2
  chính thức.
- Đánh dấu `GET /moi/[token]/accept` là blocker Phase 2.0 vì spec yêu cầu
  state-changing action phải dùng `POST`.

**Owner:** Codex

**Status:** Done — docs-only, cần review HTML và diff

## 2026-06-13 — Phase 2.0 hardening (invite POST + dept sync)

**Goal:** Close Phase 2.0 blockers P2-BE-00 and P2-BE-01 before Phase 2.1.

**Decisions:**
- Extract invite accept logic to `lib/invite-acceptance.ts`; route handler exports GET (redirect only) + POST (mutate).
- Invite page uses HTML form POST; login/register `next` points to `/moi/[token]` not `/accept`.
- Department sync via `lib/member-department-sync.ts` + service role; called from profile PUT, sync API, and onboarding save.

**Tests:** `lib/invite-acceptance.test.ts`, `lib/member-department-sync.test.ts` — 76 Vitest total pass.

**Follow-up:** P2-QA-00 smoke (2 managers, 2 orgs); P2-TEST-00 API integration tests.

## 2026-06-13 — Phase 2.0 tests + Phase 2.1 company entry foundation

**Goal:** Complete P2-TEST-00 API script, start Phase 2.1 (slug, org APIs, entry pages).

**Shipped:**
- `scripts/test-phase2-manager-invite.mjs` — 2 managers, POST invite accept, cross-org team isolation, department sync.
- Migration `0016_organization_slug_settings.sql`, `lib/organizations.ts`, organization APIs.
- `/c/[organizationSlug]`, `/quan-ly/cong-ty`, `components/company-settings-content.tsx`.

**Tests:** Vitest 80 pass; Next build pass.

**Follow-up:** Run migration 0016 on Supabase; `npm run test:api:phase2` with dev server; P2-AUTH-01 Google OAuth.

## 2026-06-13 — Supabase CLI predev migration sync

**Goal:** Auto push migrations before `npm run dev` / `npm run start`.

**Shipped:** `supabase init` config, `scripts/supabase-db-sync.mjs`, `db:link`, `db:push`, `db:status`, `predev`/`prestart` hooks.

**Setup once:** `npx supabase login` → `npm run db:link` → add `SUPABASE_DB_PASSWORD` to `.env.local`.

## 2026-06-13 — P2-AUTH-01 Google OAuth

**Goal:** Phase 2.1 company login via Google; preserve invite/company `next` through OAuth.

**Shipped:** `AuthGoogleButton` on login/register, `lib/google-oauth.ts` (`buildOAuthCallbackUrl`), docs §5.3 in `supabase-setup.md`.

**Manual:** Enable Google provider on Supabase Dashboard + Google Cloud OAuth client; add redirect URLs.

**Next:** Manual Google OAuth smoke on Vercel; Phase 2.3 path assignment CRUD.

## 2026-06-13 — Agent 3 (path) + Agent 2 (grading) foundation

**Goal:** Focus Phase 2.4/2.5 — deterministic path recommender + structured grader.

**Shipped:**
- `lib/agents/recommender.ts` — weighted scoring, reason codes, Vitest fixtures
- `POST /api/agents/recommender` — ranked modules for logged-in user
- `lib/agents/grader.ts` — rubric breakdown, evidence, confidence, reviewStatus
- Migrations `0019_learning_content_schema.sql`, `0020_assessment_grading_schema.sql`

**Next:** Apply 0019–0020 on Supabase; manager review queue `/quan-ly/bai-lam`.

## 2026-06-13 — Agent 3 recommender hardening

**Goal:** Củng cố gợi ý lộ trình trước khi làm Agent 2 thêm.

**Shipped:**
- `lib/recommender-context.ts` — load profile/progress, manager priority từ `learning_assignments`, dedupe persist 1h
- API trả `summary` (template tiếng Việt), `topRecommendation`, `managerPriorityModuleIds`
- UI: nút «Bắt đầu học», «Làm mới», sắp xếp timeline theo gợi ý

**Tests:** lint pass; vitest 113; build pass.

## 2026-06-13 — Agent 2: MCQ grading + revision sync

**Goal:** MCQ → grading tables; employee thấy `needs-revision` + ghi chú quản lý.

**Shipped:**
- `lib/mcq-grader.ts` — chấm server-side từ `answers[]`
- `persistMcqGrading` + `POST /api/quiz-results` dual-write
- `lib/module-grading-load.ts` — merge `grading_results` vào practice-review GET
- `/kiem-tra` gửi answers qua API; banner revision hiện `managerReviewReason`
- Manager accept/adjust → `assessment_submissions.status = graded`

**Tests:** vitest mcq + merge; lint + build pass.

## 2026-06-13 — P2-AI-08 manager chat signals + P2-EVAL-01 scaffold

**Decision:** Ưu tiên mở rộng BE-12 (manager analytics) thay vì P2-AI-03 (cần budget gate) hoặc benchmark live OpenAI.

**Shipped:**
- `lib/manager-analytics-summary.ts` — org signals: manager-review queue, needs-revision, quiz &lt;70%
- `getTeamAnalysisSummary()` ghép block «TỔNG QUAN ĐÁNH GIÁ & QUIZ» trước chi tiết từng NV
- Manager prompt nhắc ưu tiên hàng đợi chấm bài
- P2-EVAL-01 scaffold: `lib/fixtures/grading-benchmark.vi.json` (5 cases) + `lib/grading-benchmark.ts`

**Tests:** vitest 118 pass; lint pass (warnings only).

## 2026-06-13 — BE-13 dual knowledge chat (2 nền kiến thức)

**Goal:** Tutor base theo lộ trình/bài học + hồ sơ cá nhân; onboarding Anh/Chị/Không tiết lộ.

**Shipped:** migration 0022, curriculum/personal builders, prompt 3 block, onboarding bước 2/5.

**Tests:** vitest 122 pass; lint pass; Node 20 build pass.

## 2026-06-13 — Skeleton loading toàn app

**Goal:** Thay pulse block/`Đang tải...` bằng skeleton nhất quán khi chuyển route và fetch client.

**Shipped:** `components/ui/skeleton.tsx`, `components/skeletons/page-skeletons.tsx`, 17 file `app/**/loading.tsx`, cập nhật employee/manager/auth client components.

**Tests:** `npm run lint` pass; `npm run test` pass (122 vitest + 49 API + 5 pytest); `npm run build` pass.

## 2026-06-13 — Agent health dashboard (manager)

**Goal:** Trang giám sát 4 agent + script smoke test CLI.

**Shipped:** `/quan-ly/agent-health`, `GET /api/manager/agent-health`, `npm run test:api:agents`.

**Tests:** vitest 129 pass; lint pass; build pass.

## 2026-06-16 — Chat sessions + widget reset + personalized tone

**Goal:** UX kiểu ChatGPT trên `/tro-ly` (sidebar session, cuộc hội thoại mới, xóa); widget góc phải reset UI khi reload; agent gọi user bằng tên/email thay "anh/chị".

**Decision:** Tái dùng `chat_conversations`/`chat_messages`; `force_new` trên POST tạo session mới; widget `noRestore` + `resetContextOnFirstSend`; core context vẫn refresh sau mỗi turn qua `refreshCoreContext`.

**Shipped:** API list/delete conversations; sidebar component; hooks `useChatSessions` + mở rộng `useAssistantChat`; migration RLS delete policy.

**Tests:** vitest 200 pass; lint pass (warnings cũ); build pass; db:validate pass.

## 2026-06-16 — `/tro-ly` page scroll feels natural again

**Goal:** Bỏ cảm giác cuộn bị mắc trong khung hội thoại khi câu trả lời dài trên trang `/tro-ly`.

**Decision:** Đổi từ nested scroll trong `ChatConversationBody` sang page scroll tự nhiên hơn; giữ auto-scroll xuống cuối bằng `bottomRef.scrollIntoView()` nhưng không nhốt người dùng trong `overflow-y-auto` của riêng khung chat.

**Shipped:** nới container `/tro-ly` để card chat được phép cao hơn viewport; bỏ `overflow-hidden` ở chat panel và `overflow-y-auto` ở thân hội thoại.

**Tests:** targeted ESLint pass (chỉ còn notice App Router từ rule `no-html-link-for-pages`); Node 20 `npm run build` pass.

## 2026-06-16 — Clarify step 1 now respects role; chat history sidebar cleaned up

**Goal:** Tránh việc user đổi role nhưng card câu hỏi 1/3 vẫn hiện cùng bộ option marketing; đồng thời làm sidebar lịch sử chat bớt cụt và bớt thô.

**Decision:** `chat-clarify-steps` ưu tiên template theo `roleId` khi yêu cầu là dạng báo cáo/tổng hợp, thay vì regex `báo cáo` => marketing; `chat-session-title` nhận thêm domain HR/hành chính; sidebar session đổi sang card gọn hơn, title 2 dòng, date pill, nút xóa rõ hơn khi active.

**Shipped:** role-specific step-1 clarify options cho `marketing`, `ke-toan`, `kinh-doanh`, `van-hanh`; title hiểu thêm "nhân sự / HR / hành chính"; session sidebar restyle.

**Tests:** `npx vitest run src/frontend/lib/chat-clarify-parse.test.ts src/frontend/lib/chat-session-title.test.ts` pass; Node 20 `npm run build` pass.

## 2026-06-16 — Stop aggressive auto-scroll on `/tro-ly`

**Goal:** Fix cảm giác scroll xuống bị giằng tay khi assistant đang thinking/streaming.

**Decision:** Chỉ auto-scroll khi user vẫn đang ở gần đáy cuộc hội thoại; nếu user đã cuộn lên đọc nội dung cũ thì stream mới không được kéo họ xuống nữa. Áp dụng cho cả page chat và widget, nhưng page `/tro-ly` là case ưu tiên.

**Shipped:** `useAssistantChat` theo dõi trạng thái “near bottom” bằng window scroll (page) hoặc container scroll (widget), chỉ `scrollIntoView` khi còn anchored; bỏ các lần kéo xuống cưỡng bức theo từng thinking/stream chunk.

**Tests:** Node 20 `npm run build` pass; targeted ESLint sạch ngoài notice quen thuộc `no-html-link-for-pages` của Next App Router.

## 2026-06-16 — Restore rich chat formatting for coach answers

**Goal:** Trả lại cảm giác response “đẹp” trong chat khi assistant trả markdown có heading, bullet, số thứ tự và prompt block.

**Decision:** `ChatRichContent` không còn render text block theo từng dòng thô nữa; thay vào đó nhận diện heading/list/blockquote/paragaph, còn fenced code vẫn đi qua `ChatPromptBlock` như cũ.

**Shipped:** markdown-lite renderer cho `###`, unordered list, ordered list, quote và paragraph grouping trong `components/chat-rich-content.tsx`.

**Tests:** Node 20 `npm run build` pass; targeted ESLint sạch ngoài notice `no-html-link-for-pages`.

## 2026-06-16 — Pack clarified context before final coach answer

**Goal:** Update agent mindset so user is not asked twice for the same details after answering clarify cards.

**Decision:** System prompt and post-3-card runtime hint now follow a structured prompt frame: `<context>`, `<task>`, `<format>`, `<do_not_ask_again>`. The coach must synthesize all collected Q/A into the answer, state assumptions only for tiny gaps, and avoid re-triggering elicitation once the 3-card loop is complete.

**Shipped:** clarified-answer runtime hint, fallback synthesized answer wording, and regression coverage for XML-style context packaging + no-reask guard.

**Tests:** targeted Vitest pass; scoped ESLint pass (App Router notice only); Node 20 `npm run build` pass.

## 2026-06-16 — Tighten outline depth and harden chat markdown normalization

**Goal:** Stop low-value outline answers that only list empty section titles, and reduce formatting breakage when the model outputs headings or list markers inline.

**Decision:** Strengthen the coach/manager system prompt with explicit outline-writing rules: use `##` for major sections, one bullet per line, no boilerplate open/close, and every outline point must explain what to write, why it matters, and the formula/data source when relevant. In the UI pipeline, normalize inline `###`, `-`, and `1.` markers onto their own lines before rich rendering so the chat layout is less brittle.

**Shipped:** richer formatting/depth instructions in `openai.ts`; `normalizeChatTextBlock()` in `chat-content-blocks.ts`; regression tests for inline heading/list normalization and prompt depth rules.

**Tests:** targeted Vitest pass; scoped ESLint pass (App Router notice only); Node 20 `npm run build` pending in this task.

## 2026-06-16 — Fix dark user text inside green chat bubble

**Goal:** Stop user messages on `/tro-ly` from rendering dark text inside the dark green bubble.

**Decision:** The outer user bubble already used `text-brand-foreground`, but `ChatRichContent` was overriding inner headings, paragraphs, and lists with assistant-colored `text-ink`. Make rich-content rendering tone-aware so user bubbles keep light foreground styles throughout.

**Shipped:** tone-aware text/marker/quote classes in `components/chat-rich-content.tsx` plus a render regression test.

**Tests:** targeted Vitest + scoped ESLint + Node 20 build pending in this task.

## 2026-06-16 — Preserve ordered-list numbering across blank lines

**Goal:** Stop chat answers from rendering `1, 1, 1, 1` when the model inserts blank lines between numbered steps.

**Decision:** `ChatRichContent` now keeps scanning forward through empty lines while collecting ordered-list items, so adjacent `1.` steps still render as one `<ol>` instead of multiple single-item lists.

**Shipped:** ordered-list grouping fix in `components/chat-rich-content.tsx` and a render regression test for blank-line-separated numbered items.

**Tests:** targeted Vitest + scoped ESLint + Node 20 build pending in this task.

## 2026-06-18 — FastAPI native manager invite/recommendation/agent-health routes

**Goal:** Tiếp tục biến `/src/backend` thành backend đứng độc lập thay cho Next.js API, không chỉ mirror/proxy.

**Decision:** Giữ snapshot clone + mirror để tham chiếu, nhưng nối thêm cụm route FastAPI-native cho `manager/invite-links`, `manager/recommendations`, và `manager/agent-health` dựa trên business logic Python thật. Phần `invite-links` và `recommendations` dùng trực tiếp service native đã port, còn `agent-health` có cả demo report và live aggregate cơ bản từ Supabase để backend mới tự trả dữ liệu mà không cần runtime Next.js.

**Shipped:** thêm route native manager-side, thêm demo/live aggregation helpers trong `native_app.py`, và mở rộng test API backend để cover nhóm route mới.

**Tests:** `pytest src/backend/tests/test_api/test_native_routes.py -q` pass (17 tests); `pytest src/backend/tests -q` pass (29 tests). Full repo verify tiếp tục chạy trong task này.

## 2026-06-18 — Fix chat flicker after asking assistant

**Goal:** Tìm và giảm hiện tượng `/tro-ly` nhấp nháy sau khi user gửi câu hỏi.

**Decision:** Runtime check cho thấy flicker nằm ở UI state/animation, không phải API fail: container hội thoại đang giữ animation cấp session trong lúc message/thinking cập nhật, thinking phrase đổi liên tục làm bubble “Đang suy nghĩ…” nhấp nháy, và dev log còn báo duplicate React key ở message list sau khi gửi. Giữ skeleton loading animation, nhưng bỏ animation toàn bộ conversation khi đã load; thinking indicator dùng một câu ổn định cho mỗi lượt gửi; message render key thêm index để history/optimistic state trùng id không làm React reconciliation lẫn lộn.

**Shipped:** cập nhật `ChatConversationBody`, `AssistantChatMessageList`, `useAssistantChat`, và thêm regression tests cho loaded conversation animation + duplicate message ids.

**Tests:** targeted Vitest 3 files / 6 tests pass; `npm run lint` pass với 5 warning cũ; Node 22 `npm run test` pass (57 Vitest files / 261 tests, 30 API, 12 manager/invite, 7 auth/OAuth, 84 pytest); Node 20 `npm run build` pass.

## 2026-06-18 — FastAPI native chat persistence + org settings

**Goal:** Tiếp tục native hóa các API có state quan trọng để frontend không còn phụ thuộc Next.js route handlers cho lịch sử chat và cài đặt tool tổ chức.

**Decision:** Port trước cụm chat persistence ít phụ thuộc OpenAI stream hơn gồm `chat/history`, `chat/conversations`, `chat/conversations/{id}`, đồng thời kéo `org-settings` sang Python-native vì logic gọn và có giá trị business rõ. Giữ `POST /api/chat` cho bước sau vì còn dính stream, memory refresh, rate limit và prompt orchestration.

**Shipped:** thêm helper Supabase delete, load chat history/list/delete conversation, resume lesson cho chat history, và read/write `organizations.ai_tool` kèm audit event kiểu `audit:org.ai_tool.update`.

**Tests:** `pytest src/backend/tests/test_api/test_native_routes.py -q` pass (26 tests); `pytest src/backend/tests -q` pass (38 tests).

## 2026-06-18 — FastAPI native manager grading queue + review

**Goal:** Tiếp tục tách luồng quản lý duyệt bài chấm khỏi Next.js API để manager surfaces chạy được qua backend Python mới.

**Decision:** Port `GET /api/manager/grading` và `PATCH /api/manager/grading/{resultId}/review` sang native trước vì đây là luồng Supabase thuần, không phụ thuộc stream/chat. Giữ demo fallback giống Next.js route hiện tại, còn real mode thì Python tự đọc `grading_results`, `grading_reviews`, `assessment_submissions` và áp dụng quyết định duyệt ngay trên backend mới.

**Shipped:** thêm demo queue, mapping queue item, quyết định review (`accept` / `adjust` / `needs-revision`), và native routes manager grading.

**Tests:** `pytest src/backend/tests/test_api/test_native_routes.py -q` pass (30 tests); `pytest src/backend/tests -q` pass (42 tests).

## 2026-06-17 — Make opening greeting sound human again

**Goal:** Remove robotic repetition in the first assistant bubble when opening a chat session.

**Decision:** The title bar already says “Trợ lý AI”, so the greeting bubble should not re-introduce itself or repeat the user’s name/context mechanically. `useAssistantChat` now opens with a shorter “mình tiếp tục…” line, and any carried-over memory is cleaned to remove old greetings, self-intro boilerplate, and generic “hỏi em về…” filler.

**Shipped:** rewritten greeting copy plus memory-preview sanitization in `hooks/use-assistant-chat.ts`, with a regression test for duplicate intro/greeting removal.

**Tests:** targeted Vitest + scoped ESLint + Node 20 build pending in this task.

## 2026-06-17 — Tuancoolboy account dropdown + tài khoản

**Goal:** Sửa góc phải header thành avatar + tên + role + dropdown cho employee/manager.

**Decision:** Thêm `/tai-khoan` với form hồ sơ, mật khẩu, email thật ở Supabase real mode; demo mode chỉ hiển thị/cảnh báo.

**Owner:** Tuancoolboy

**Status:** Active

**Tests:** `npm run lint` pass với 5 warning cũ; targeted Node 20 Vitest 3 files / 8 tests pass; Node 20 full Vitest 54 files / 245 tests pass; Node 20 `next build src/frontend` pass; `git diff --check` pass. Full `npm run test` bị Node 18 chặn, Node 20 runner còn 2 lỗi chat API smoke có sẵn trên server `:3000`.

## 2026-06-17 — Account settings follow-up fixes

**Goal:** Chốt các lỗi hành vi còn lại sau khi thêm account dropdown và trang `/tai-khoan`.

**Decision:** `/tai-khoan` phải ưu tiên hiển thị đúng nghề thật từ `profiles.role_id` thay vì generic `Nhân viên`, còn các form đổi mật khẩu/email phải fail-safe giống form hồ sơ khi Supabase client throw thay vì chỉ bắt `error` trả về.

**Shipped:** dùng lại `getRole(...).shortLabel` qua helper `resolveAccountRoleLabel()` để render role trên account page, và thêm `catch` cho hai luồng `supabase.auth.updateUser()` trong `account-settings-content.tsx`.

**Tests:** targeted Node 20 Vitest cho account settings/menu pending trong task này; browser retest `/tai-khoan` real mode pending trong task này.

## 2026-06-18 — Chat security hardening (code review round 2)

**Goal:** Address bot findings on service-role cross-tenant risk, prompt-injection delimiters, and serverless race on `memoryRefreshInflight`.

**Decision:** Harden untrusted prompt blocks with `stripPromptBlockSpoofHeaders` + `wrapUntrustedPromptBlock`; replace serverless-only in-memory lock with optimistic DB claim on `chat_memories.updated_at` (delete placeholder row on OpenAI failure); hybrid auth for `getTeamAnalysisSummary` — RLS user client for manager membership, service role only for cross-user aggregates until manager RLS migration (BE-08).

**Shipped:** `chat-prompt-safety.ts`, updates to `openai.ts` + `chat-context.ts`, synced `next_clone/`.

**Tests:** `npm run lint` pass (5 warnings cũ); `npm run test` pass (84 pytest + Vitest); `npm run build` pass.

## 2026-06-22 — Harden hoc-tap room create/list/join runtime

**Goal:** Làm nhánh room Supabase bám đúng contract UI để có thể chạy thật phần tạo phòng mà không lệch so với memory runtime.

**Decision:** Phòng `locked` vẫn phải xuất hiện trong live list ở real mode giống nhánh memory, chỉ disable CTA vào trực tiếp; join bằng mã vẫn hợp lệ. Đồng thời dọn các contract room cũ còn sót ở wrapper/runtime (`participantId` null trong memory wrapper, fallback snapshot cũ thiếu `viewerParticipantId`, helper runtime đặt tên `use*` bị ESLint hiểu nhầm là hook) để build production không gãy vì mismatch type.

**Shipped:** bỏ filter ẩn locked room trong `hoc-tap-room-service.ts`, thêm `hoc-tap-room-service.test.ts` với fake Supabase client cho flow create/list/join thật, và vá `hoc-tap-room-runtime.ts` + `services/quizApi.ts` cho shape `HocTapRoomSnapshot` mới.

**Tests:** targeted Node 20 Vitest 4 files / 27 tests pass; `npm run lint` pass với 7 warning cũ ngoài phạm vi; Node 20 `npm run build` pass.

## 2026-06-22 — Fix avatar snapshot infinite loop on Hoc Tap

**Goal:** Chặn lỗi React `getSnapshot should be cached` và `Maximum update depth exceeded` khi vào `/hoc-tap`.

**Decision:** `useSyncExternalStore` trong `use-preferred-avatar` không được trả object avatar mới mỗi render. Đổi snapshot sang string seed ổn định từ local preference / remote fallback, rồi mới `parseAvatarChoice()` lại bằng `useMemo` để giữ contract React và tránh loop vô hạn.

**Shipped:** cập nhật `src/frontend/hooks/use-preferred-avatar.ts` để snapshot là serialized avatar choice thay vì object trực tiếp.

**Tests:** scoped ESLint cho avatar/hoc-tap files pass với 2 warning cũ ở `hoc-tap-team-room.tsx`; Node 20 `npm run build` pass.

## 2026-06-22 — Simplify Hoc Tap quiz UI and broaden avatar choices

**Goal:** Bỏ luồng “tạo quiz mới” khỏi tab Quiz, đổi bộ lọc sang mental model phòng ban + tìm bộ đề, đồng bộ avatar giữa Học tập và header/tài khoản, đồng thời thêm avatar đa dạng + upload ảnh.

**Decision:** Giữ Phase 2 quiz library ở mức practice catalog sẵn có thay vì nửa vời “quiz tự tạo”; CTA card đổi theo lịch sử làm bài để user quay lại xem kiểm tra. Avatar vẫn lưu local preference trong task này để sync ngay trên toàn bộ client surfaces mà không đụng schema/profile API, nhưng mở rộng từ 1 kiểu DiceBear sang nhiều style chính thức và thêm `upload` data URL đã resize để dùng được ngay.

**Shipped:** xóa panel “Tạo quiz mới” và chỉ giữ thư viện bộ đề trong `hoc-tap-dashboard.tsx`; đổi filter quiz thành `Phòng ban` + `Tìm bộ đề`; bỏ dòng `Quiz tự tạo +153 XP`; đổi copy quiz sang “bộ đề thực hành / AI Trợ Lý”; thêm upload avatar + nhiều style DiceBear trong `app-avatar.ts`, `dicebear-avatar-picker.tsx`, `dicebear.ts`; đồng bộ avatar Học tập sang `account-menu.tsx`.

**Tests:** verification trong task này sẽ chạy lại bằng scoped ESLint, targeted Vitest catalog, và Node 20 `npm run build`.

## 2026-06-22 — Simplify team-room filters on Hoc Tap

**Goal:** Làm phần “Chơi với team” gọn và logic hơn theo feedback UI: bỏ filter trùng chức năng và giữ đúng mental model tìm phòng theo phòng ban/chủ đề.

**Decision:** Bỏ select `Chế độ` và 2 icon đổi view vì chưa có hành vi thật; đưa `Phòng ban` lên hàng trên thay chỗ `Chế độ`, chuyển ô `Tìm phòng hoặc chủ đề` xuống thay hàng `Phòng ban` cũ, và chỉ giữ chip trạng thái còn hữu ích (`Tất cả phòng`, `Đang chờ`, `Đang chơi`) thay vì lẫn cả trạng thái lẫn mode.

**Shipped:** cập nhật layout/filter của tab team trong `src/frontend/components/hoc-tap-dashboard.tsx`; bỏ chip `Sắp bắt đầu`, `Classic`, `Team Battle`; bỏ 2 nút icon view.

**Tests:** verification trong task này sẽ chạy lại bằng scoped ESLint và Node 20 `npm run build`.

## 2026-06-22 — Deployment follow-up for avatar module sync

**Goal:** Vá lỗi build Vercel sau deploy commit `1ff20a1` khi source trên GitHub thiếu một phần dependency avatar đang có ở local.

**Decision:** Giữ nguyên logic avatar mới đã shipped, chỉ bổ sung các file bị sót khỏi commit trước: helper `avatar-preferences.ts` bản mới có `setPreferredAvatarChoice` và component dùng chung `user-avatar.tsx`.

**Shipped:** thêm `src/frontend/lib/avatar-preferences.ts` vào commit follow-up cùng `src/frontend/components/user-avatar.tsx` để build cloud khớp với local.

**Tests:** sẽ chạy lại Node 20 `npm run build` trước khi push fix.

## 2026-06-22 — Deployment follow-up for useAppProfile avatar return

**Goal:** Vá tiếp lỗi build Vercel còn lại sau commit `18284c4`, khi `account-menu.tsx` destructure `avatar` nhưng source GitHub của `useAppProfile()` chưa trả field này.

**Decision:** Giữ contract mới của avatar sync; chỉ bổ sung đúng hook `src/frontend/hooks/use-app-profile.ts` đang có ở local để cloud/source thống nhất với code đã dùng ở `account-menu`, `hoc-tap-dashboard`, và `hoc-tap-team-room`.

**Shipped:** đưa `avatar` return và hydrate logic liên quan từ `useAppProfile()` lên GitHub qua commit follow-up.

**Tests:** sẽ chạy lại Node 20 `npm run build` trước khi push fix.

## 2026-06-22 — Deployment follow-up to sync full avatar profile flow

**Goal:** Ngăn chuỗi fail lặp lại trên Vercel bằng cách đưa toàn bộ flow avatar/profile đang chạy ở local lên GitHub cùng lúc.

**Decision:** Thay vì chờ từng lỗi build mới lộ ra, đồng bộ trọn cụm file avatar liên quan đến account page, app layout/nav, profile API, client API, learning profile parser, account settings và team room.

**Shipped:** bổ sung các thay đổi còn thiếu ở `app/(app)/layout.tsx`, `app/(app)/tai-khoan/page.tsx`, `app/api/profile/route.ts`, `components/account-settings-content.tsx`, `components/app-nav.tsx`, `components/hoc-tap-team-room.tsx`, `lib/client-api.ts`, `lib/learning-profile.ts`.

**Tests:** sẽ chạy lại Node 20 `npm run build` trước khi push fix.

## 2026-06-22 — Fix avatar preference resetting to default after navigation

**Goal:** Chặn bug đổi avatar xong thoát ra vào lại thì về avatar mặc định.

**Decision:** Vấn đề đến từ việc key local preference của avatar đang phụ thuộc vào tên hiển thị, trong khi tên/email/fullName có thể đổi giữa server render và client hydrate. Đổi sang identity ổn định hơn, ưu tiên email khi có, và cho hook avatar đọc/migrate được cả các alias key cũ để không mất avatar đã lưu trước đó.

**Shipped:** cập nhật `avatar-preferences.ts`, `use-preferred-avatar.ts`, `use-app-profile.ts` và các caller ở account/hoc-tap/team-room/account-settings để dùng identity canonical + alias fallback.

**Tests:** scoped ESLint pass với 2 warning cũ ở `hoc-tap-team-room.tsx`; Node 20 `npm run build` pass.
