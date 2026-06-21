import { describe, expect, it } from "vitest";
import {
  findCannedResponse,
  getSuggestedQuestions,
} from "./tro-ly-canned-responses";

describe("tro-ly-canned-responses", () => {
  it("answers AI là gì with role context", () => {
    const { answer } = findCannedResponse("AI là gì?", "kinh-doanh");
    expect(answer.length).toBeGreaterThan(50);
  });

  it("returns safety warning for sensitive data", () => {
    const { safety } = findCannedResponse(
      "STK 9876543210 của khách",
      "ke-toan",
    );
    expect(safety).toContain("nhạy cảm");
  });

  it("returns off-topic message for unrelated questions", () => {
    const { answer } = findCannedResponse(
      "thời tiết hôm nay thế nào",
      "marketing",
    );
    expect(answer).toContain("ngoài phạm vi");
    expect(answer).not.toMatch(/^Chào/i);
  });

  it("does not reopen with a greeting on a fresh off-topic question", () => {
    const { answer } = findCannedResponse(
      "co bai noi quy cong ty khong?",
      "van-hanh",
    );

    expect(answer).toContain("ngoài phạm vi");
    expect(answer).not.toMatch(/^Chào/i);
  });

  it("answers next learning question with module links", () => {
    const { answer } = findCannedResponse(
      "Em nên học gì tiếp cho bán hàng?",
      "kinh-doanh",
    );
    expect(answer).toContain("học gì tiếp");
    expect(answer).toContain("](/lo-trinh/");
    expect(answer).toContain("Nếu bạn hỏi");
  });

  it("routes learning questions with 'không rõ' to next-module guidance", () => {
    const { answer } = findCannedResponse(
      "Em không rõ nên học gì tiếp",
      "kinh-doanh",
    );

    expect(answer).toContain("](/lo-trinh/");
    expect(answer).not.toContain("hơi chung");
  });

  it("asks for the main mismatch when the user says the answer is not good enough", () => {
    const { answer } = findCannedResponse(
      "Câu trả lời chưa sát, sửa lại giúp em",
      "marketing",
    );

    expect(answer).toContain("phạm vi");
    expect(answer).toContain("dữ liệu đầu vào");
    expect(answer).toContain("viết lại bản tốt hơn");
    expect(answer).not.toContain("?");
  });

  it("responds to overly generic feedback with one concrete mismatch", () => {
    const { answer } = findCannedResponse(
      "Câu này quá chung chung",
      "ke-toan",
    );

    expect(answer).toContain("hơi chung");
    expect(answer).toContain("phạm vi");
    expect(answer).toContain("output cuối");
  });

  it("responds to length and style edits without drifting away", () => {
    const shorter = findCannedResponse("rút gọn lại giúp em", "van-hanh");
    const richer = findCannedResponse("thêm ví dụ và đổi giọng văn", "van-hanh");
    const justFix = findCannedResponse("chỉ cần bản sửa thôi", "van-hanh");
    const finalVersion = findCannedResponse("cho em bản cuối", "van-hanh");
    const dualVersion = findCannedResponse("cho em bản ngắn và bản dài", "van-hanh");

    expect(shorter.answer).toContain("rút gọn");
    expect(shorter.answer).toContain("giữ ví dụ");
    expect(richer.answer).toContain("thêm ví dụ");
    expect(richer.answer).toContain("đổi giọng văn");
    expect(justFix.answer).toContain("đi thẳng vào bản sửa");
    expect(justFix.answer).toContain("không vòng vo");
    expect(finalVersion.answer).toContain("bản cuối");
    expect(finalVersion.answer).toContain("dùng ngay");
    expect(dualVersion.answer).toContain("2 phiên bản");
    expect(dualVersion.answer).toContain("bản ngắn");
  });

  it("responds to checklist, board, and executive summary feedback", () => {
    const checklist = findCannedResponse("đổi sang checklist cho em", "van-hanh");
    const priority = findCannedResponse("ưu tiên việc làm ngay trước", "marketing");
    const oneSentence = findCannedResponse("rút thành 1 câu thôi", "ke-toan");
    const compare = findCannedResponse("so sánh 2 phương án giúp em", "kinh-doanh");
    const example = findCannedResponse("thêm ví dụ theo nghề giúp em", "kinh-doanh");
    const prompt = findCannedResponse("prompt copy-paste cho em", "ke-toan");
    const choices = findCannedResponse("cho em 3 lựa chọn", "van-hanh");
    const natural = findCannedResponse("làm giọng người thật hơn", "marketing");
    const prosCons = findCannedResponse("cho em ưu nhược điểm", "kinh-doanh");
    const boss = findCannedResponse("bản gửi sếp ngắn thôi", "ke-toan");
    const takeaways = findCannedResponse("chốt lại key takeaways", "kinh-doanh");

    expect(checklist.answer).toContain("checklist");
    expect(checklist.answer).toContain("bảng");
    expect(priority.answer).toContain("ưu tiên");
    expect(priority.answer).toContain("việc làm ngay");
    expect(oneSentence.answer).toContain("1 câu");
    expect(oneSentence.answer).toContain("cực ngắn");
    expect(compare.answer).toContain("so sánh");
    expect(compare.answer).toContain("bảng 2 cột");
    expect(example.answer).toContain("ví dụ bám đúng nghề");
    expect(prompt.answer).toContain("copy-paste");
    expect(prompt.answer).toContain("[ ]");
    expect(choices.answer).toContain("3 lựa chọn");
    expect(choices.answer).toContain("phương án");
    expect(natural.answer).toContain("tự nhiên");
    expect(natural.answer).toContain("bớt kiểu máy móc");
    expect(prosCons.answer).toContain("ưu, nhược");
    expect(prosCons.answer).toContain("rủi ro");
    expect(boss.answer).toContain("gửi sếp");
    expect(boss.answer).toContain("rất ngắn gọn");
    expect(takeaways.answer).toContain("key takeaways");
    expect(takeaways.answer).toContain("điều cần nhớ");
  });

  it("responds to deeper, role-specific, and benchmark feedback", () => {
    const deep = findCannedResponse("đúng nhưng chưa đủ sâu", "marketing");
    const role = findCannedResponse("câu này lệch role", "kinh-doanh");
    const benchmark = findCannedResponse(
      "thêm so sánh với benchmark",
      "ke-toan",
    );

    expect(deep.answer).toContain("đào sâu");
    expect(role.answer).toContain("lệch nghề");
    expect(role.answer).toContain("role");
    expect(benchmark.answer).toContain("benchmark");
    expect(benchmark.answer).toContain("kỳ trước");
  });

  it("getSuggestedQuestions returns chips per role", () => {
    expect(getSuggestedQuestions("khac").length).toBeGreaterThanOrEqual(4);
    expect(getSuggestedQuestions("van-hanh")[0]).toBeTruthy();
  });
});
