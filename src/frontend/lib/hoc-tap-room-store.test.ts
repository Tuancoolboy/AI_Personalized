import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  advanceHocTapRoom,
  createHocTapRoom,
  deleteHocTapRoom,
  getHocTapRoomSnapshot,
  joinHocTapRoom,
  listHocTapPublicRooms,
  resetHocTapRoomStoreForTests,
  startHocTapRoom,
  submitHocTapRoomAnswer,
  updateHocTapRoomSettings,
  updateHocTapRoomQuestions,
} from "@/lib/hoc-tap-room-store";

describe("hoc-tap room store", () => {
  beforeEach(() => {
    resetHocTapRoomStoreForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a room with a host and public listing", () => {
    const result = createHocTapRoom({
      hostName: "Demo User",
      quizId: "ai-marketing",
      mode: "team-battle",
      maxPlayers: 12,
    });

    expect(result.room.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(result.room.status).toBe("waiting");
    expect(result.room.mode).toBe("team-battle");
    expect(result.room.participants).toHaveLength(1);
    expect(result.room.participants[0]).toMatchObject({
      name: "Demo User",
      isHost: true,
      score: 0,
    });
    expect(result.hostToken).toMatch(/^host_/);

    expect(listHocTapPublicRooms()).toEqual([
      expect.objectContaining({
        code: result.room.code,
        quizId: "ai-marketing",
        isLocked: false,
        participantCount: 0,
        hostAvatarUrl: expect.stringContaining("api.dicebear.com"),
      }),
    ]);
  });

  it("creates a locked room when requested", () => {
    const result = createHocTapRoom({
      hostName: "Demo User",
      quizId: "ai-marketing",
      avatarSeed: "demo-user::option-2",
      locked: true,
    });

    expect(result.room.isLocked).toBe(true);
    expect(result.room.participants[0]?.avatarUrl).toContain(
      "demo-user%3A%3Aoption-2",
    );
    expect(listHocTapPublicRooms()).toEqual([
      expect.objectContaining({
        code: result.room.code,
        isLocked: true,
      }),
    ]);
  });

  it("does not count the host as a player and requires a real player to start", () => {
    const host = createHocTapRoom({
      hostName: "Host One",
      quizId: "ai-marketing",
    });

    expect(host.room.participantCount).toBe(0);
    expect(() =>
      startHocTapRoom(host.room.code, { hostToken: host.hostToken }),
    ).toThrow(
      "Cần ít nhất 1 người chơi trước khi bắt đầu.",
    );

    const joined = joinHocTapRoom({
      code: host.room.code,
      playerName: "Player Two",
    });

    expect(joined.room.participantCount).toBe(1);
    expect(listHocTapPublicRooms()[0]).toMatchObject({
      code: host.room.code,
      participantCount: 1,
    });
  });

  it("lets players join by code and dedupes the same display name", () => {
    const host = createHocTapRoom({
      hostName: "Host One",
      quizId: "ai-ban-hang",
    });

    const joined = joinHocTapRoom({
      code: host.room.code.toLowerCase(),
      playerName: "Lan Anh",
      avatarSeed: "lan-anh::option-3",
    });
    const joinedAgain = joinHocTapRoom({
      code: host.room.code,
      playerName: "Lan Anh",
      avatarSeed: "lan-anh::option-4",
    });

    expect(joined.room.participants).toHaveLength(2);
    expect(joinedAgain.participantId).toBe(joined.participantId);
    expect(joinedAgain.room.participants).toHaveLength(2);
    expect(
      joinedAgain.room.participants.find(
        (participant) => participant.id === joined.participantId,
      )?.avatarUrl,
    ).toContain("lan-anh%3A%3Aoption-4");
  });

  it("creates a system-hosted room when quiz entry role is player", () => {
    const result = createHocTapRoom({
      hostName: "Lan Anh",
      quizId: "ai-marketing",
      entryRole: "player",
    });

    expect(result.hostToken).toBeUndefined();
    expect(result.room.hostMode).toBe("system");
    expect(result.room.hostName).toBe("AI Host");
    expect(result.room.participantCount).toBe(1);
    expect(result.room.isHost).toBe(false);
    expect(result.room.participants).toEqual([
      expect.objectContaining({
        name: "AI Host",
        isHost: true,
      }),
      expect.objectContaining({
        id: result.participantId,
        name: "Lan Anh",
        isHost: false,
      }),
    ]);
    expect(listHocTapPublicRooms()).toEqual([
      expect.objectContaining({
        code: result.room.code,
        hostMode: "system",
        participantCount: 1,
      }),
    ]);
  });

  it("creates a system-hosted ai-project room when entry role is player", () => {
    const result = createHocTapRoom({
      hostName: "Minh Chau",
      aiProject: {
        title: "Project AI Quiz",
        topic: "Ứng dụng AI cho nội bộ",
        context: "Kiểm tra quy trình phối hợp trong team.",
        questionCount: 3,
        difficulty: "Trung bình",
      },
      questions: [
        {
          question: "AI nên hỗ trợ bước nào đầu tiên?",
          options: ["Phân tích nhu cầu", "Đổi logo", "Tạo màu nền", "Tắt chat"],
          correctIndex: 0,
          explanation: "Luôn bắt đầu từ việc hiểu nhu cầu thật của team.",
        },
        {
          question: "Host hệ thống có vai trò gì?",
          options: [
            "Tự điều phối countdown và flow",
            "Trả lời thay người chơi",
            "Chấm tay từng câu",
            "Ẩn leaderboard vĩnh viễn",
          ],
          correctIndex: 0,
          explanation: "System host chỉ điều phối tiến trình phòng.",
        },
        {
          question: "Player nên thấy gì sau khi trả lời?",
          options: [
            "Màu đúng/sai trước leaderboard",
            "Trang chủ ngay lập tức",
            "Không có phản hồi",
            "Modal reload",
          ],
          correctIndex: 0,
          explanation: "Cần có pha hiện đáp án trước khi sang bảng xếp hạng.",
        },
      ],
      roomType: "host-review",
      entryRole: "player",
    });

    expect(result.hostToken).toBeUndefined();
    expect(result.room.hostMode).toBe("system");
    expect(result.room.hostName).toBe("AI Host");
    expect(result.room.participantCount).toBe(1);
    expect(result.room.reviewQuestions).toBeNull();
  });

  it("runs start, answer, next question and finish flow", () => {
    const host = createHocTapRoom({
      hostName: "Host One",
      quizId: "ai-van-phong",
    });
    const player = joinHocTapRoom({
      code: host.room.code,
      playerName: "Player Two",
    });

    const started = startHocTapRoom(host.room.code, {
      hostToken: host.hostToken,
    });
    expect(started.status).toBe("playing");
    expect(started.currentQuestion).toMatchObject({
      question: expect.any(String),
      options: expect.any(Array),
    });
    expect(started.currentQuestion?.correctIndex).toEqual(expect.any(Number));

    const answered = submitHocTapRoomAnswer({
      code: host.room.code,
      participantId: player.participantId,
      questionIndex: 0,
      answerIndex: 0,
    });
    expect(answered.phase).toBe("reveal");
    expect(answered.viewerAnswer).toMatchObject({
      questionIndex: 0,
      answerIndex: 0,
      revealed: true,
      points: 100,
      isCorrect: true,
    });
    expect(answered.leaderboard[0]?.name).toBe("Player Two");

    const next = advanceHocTapRoom(host.room.code, host.hostToken);
    expect(next.status).toBe("playing");
    expect(next.phase).toBe("leaderboard");
    expect(next.currentQuestionIndex).toBe(0);

    let finished = next;
    let guard = 0;
    while (finished.status !== "finished" && guard < 10) {
      finished = advanceHocTapRoom(host.room.code, host.hostToken);
      guard += 1;
    }

    expect(finished.status).toBe("finished");
    expect(listHocTapPublicRooms()).toEqual([]);
  });

  it("keeps player results hidden until the full room finishes the question", () => {
    const host = createHocTapRoom({
      hostName: "Host One",
      quizId: "ai-van-phong",
    });
    const playerOne = joinHocTapRoom({
      code: host.room.code,
      playerName: "Player One",
    });
    const playerTwo = joinHocTapRoom({
      code: host.room.code,
      playerName: "Player Two",
    });

    startHocTapRoom(host.room.code, {
      hostToken: host.hostToken,
    });

    const afterFirstAnswer = submitHocTapRoomAnswer({
      code: host.room.code,
      participantId: playerOne.participantId,
      questionIndex: 0,
      answerIndex: 0,
    });

    expect(afterFirstAnswer.phase).toBe("question");
    expect(afterFirstAnswer.answeredPlayerCount).toBe(1);
    expect(afterFirstAnswer.currentQuestion?.correctIndex).toBeUndefined();
    expect(afterFirstAnswer.viewerAnswer).toMatchObject({
      questionIndex: 0,
      answerIndex: 0,
      revealed: false,
    });
    expect(afterFirstAnswer.viewerAnswer?.isCorrect).toBeUndefined();
    expect(afterFirstAnswer.viewerAnswer?.points).toBeUndefined();

    const reveal = submitHocTapRoomAnswer({
      code: host.room.code,
      participantId: playerTwo.participantId,
      questionIndex: 0,
      answerIndex: 0,
    });

    expect(reveal.phase).toBe("reveal");
    expect(reveal.currentQuestion?.correctIndex).toEqual(expect.any(Number));

    const revealedForFirstPlayer = getHocTapRoomSnapshot(
      host.room.code,
      playerOne.participantId,
    );
    expect(revealedForFirstPlayer.viewerAnswer).toMatchObject({
      questionIndex: 0,
      answerIndex: 0,
      revealed: true,
      isCorrect: true,
      points: 100,
    });
  });

  it("requires manual start by the creator for system-hosted rooms and advances phases by timer", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T00:00:00.000Z"));

    const created = createHocTapRoom({
      hostName: "Lan Anh",
      quizId: "ai-ban-hang",
      entryRole: "player",
    });
    const joined = joinHocTapRoom({
      code: created.room.code,
      playerName: "Minh",
    });

    expect(
      getHocTapRoomSnapshot(created.room.code, created.participantId),
    ).toMatchObject({
      status: "waiting",
      phase: "waiting",
      hostMode: "system",
      canStart: true,
    });
    expect(
      getHocTapRoomSnapshot(created.room.code, joined.participantId),
    ).toMatchObject({
      status: "waiting",
      phase: "waiting",
      hostMode: "system",
      canStart: false,
    });

    vi.advanceTimersByTime(120_000);

    expect(
      getHocTapRoomSnapshot(created.room.code, created.participantId),
    ).toMatchObject({
      status: "waiting",
      phase: "waiting",
      hostMode: "system",
    });

    expect(() =>
      startHocTapRoom(created.room.code, {
        participantId: joined.participantId,
      }),
    ).toThrow("Chỉ người tạo phòng mới bắt đầu được phòng này.");

    let snapshot = startHocTapRoom(created.room.code, {
      participantId: created.participantId,
    });
    expect(snapshot).toMatchObject({
      status: "playing",
      phase: "question",
      currentQuestionIndex: 0,
      participantCount: 2,
    });
    expect(snapshot.questionEndsAt).not.toBeNull();
    expect(snapshot.phaseEndsAt).not.toBeNull();

    let guard = 0;
    while (snapshot.status !== "finished" && guard < 20) {
      vi.advanceTimersByTime(60_001);
      snapshot = getHocTapRoomSnapshot(created.room.code, created.participantId);

      if (snapshot.phase === "reveal") {
        expect(snapshot.currentQuestion?.correctIndex).toEqual(expect.any(Number));
        vi.advanceTimersByTime(5_001);
        snapshot = getHocTapRoomSnapshot(created.room.code, created.participantId);
      }

      if (snapshot.phase === "leaderboard") {
        expect(snapshot.roundTopFive).toHaveLength(2);
        expect(snapshot.roundTopFive.every((participant) => !participant.isHost)).toBe(
          true,
        );
        vi.advanceTimersByTime(4_001);
        snapshot = getHocTapRoomSnapshot(created.room.code, created.participantId);
      }

      guard += 1;
    }

    expect(snapshot.status).toBe("finished");
    expect(snapshot.phase).toBe("finished");
    expect(snapshot.finalTopThree).toEqual([
      expect.objectContaining({
        name: "Lan Anh",
        isHost: false,
      }),
      expect.objectContaining({
        name: "Minh",
        isHost: false,
      }),
    ]);
  });

  it("rejects host answers because the host only moderates the room", () => {
    const host = createHocTapRoom({
      hostName: "Host One",
      quizId: "ai-van-phong",
    });
    joinHocTapRoom({
      code: host.room.code,
      playerName: "Player Two",
    });
    startHocTapRoom(host.room.code, { hostToken: host.hostToken });

    expect(() =>
      submitHocTapRoomAnswer({
        code: host.room.code,
        participantId: host.participantId,
        questionIndex: 0,
        answerIndex: 0,
      }),
    ).toThrow("Host chỉ điều khiển phòng và không tham gia trả lời.");
  });

  it("rejects non-host start attempts", () => {
    const host = createHocTapRoom({
      hostName: "Host One",
      quizId: "ai-ke-toan",
    });

    expect(() =>
      startHocTapRoom(host.room.code, { hostToken: "bad-token" }),
    ).toThrow(
      "Chỉ host mới thực hiện được thao tác này.",
    );
  });

  it("lets the controller lock and unlock a room", () => {
    const host = createHocTapRoom({
      hostName: "Host One",
      quizId: "ai-ke-toan",
    });

    const locked = updateHocTapRoomSettings({
      code: host.room.code,
      locked: true,
      hostToken: host.hostToken,
    });
    expect(locked.isLocked).toBe(true);

    joinHocTapRoom({
      code: host.room.code,
      playerName: "Player Two",
    });

    const unlocked = updateHocTapRoomSettings({
      code: host.room.code,
      locked: false,
      hostToken: host.hostToken,
    });
    expect(unlocked.isLocked).toBe(false);
  });

  it("only the system room creator can lock or delete the room", () => {
    const created = createHocTapRoom({
      hostName: "Lan Anh",
      quizId: "ai-ban-hang",
      entryRole: "player",
    });
    const joined = joinHocTapRoom({
      code: created.room.code,
      playerName: "Minh",
    });

    expect(() =>
      updateHocTapRoomSettings({
        code: created.room.code,
        locked: true,
        participantId: joined.participantId,
      }),
    ).toThrow("Chỉ người tạo phòng mới thực hiện được thao tác này.");

    const locked = updateHocTapRoomSettings({
      code: created.room.code,
      locked: true,
      participantId: created.participantId,
    });
    expect(locked.isLocked).toBe(true);

    expect(() =>
      deleteHocTapRoom({
        code: created.room.code,
        participantId: joined.participantId,
      }),
    ).toThrow("Chỉ người tạo phòng mới thực hiện được thao tác này.");
  });

  it("deletes a room permanently", () => {
    const host = createHocTapRoom({
      hostName: "Host One",
      quizId: "ai-ke-toan",
    });

    expect(deleteHocTapRoom({
      code: host.room.code,
      hostToken: host.hostToken,
    })).toEqual({
      code: host.room.code,
    });

    expect(() => getHocTapRoomSnapshot(host.room.code, host.participantId)).toThrow(
      "Không tìm thấy phòng. Kiểm tra lại mã phòng hoặc tạo phòng mới.",
    );
  });

  it("caps round top five and final top three without counting the host", () => {
    const host = createHocTapRoom({
      hostName: "Host One",
      quizId: "ai-ke-toan",
    });
    const players = ["An", "Binh", "Chi", "Dung", "Giang", "Hanh"].map(
      (playerName) =>
        joinHocTapRoom({
          code: host.room.code,
          playerName,
        }),
    );

    let snapshot = startHocTapRoom(host.room.code, {
      hostToken: host.hostToken,
    });
    const hostViewId = host.participantId;

    while (snapshot.status === "playing" && snapshot.phase === "question") {
      const correctIndex = snapshot.currentQuestion?.correctIndex;
      expect(correctIndex).toEqual(expect.any(Number));

      players.forEach((player) => {
        submitHocTapRoomAnswer({
          code: host.room.code,
          participantId: player.participantId,
          questionIndex: snapshot.currentQuestionIndex,
          answerIndex: correctIndex as number,
        });
      });

      snapshot = getHocTapRoomSnapshot(host.room.code, hostViewId);
      expect(snapshot.phase).toBe("reveal");
      snapshot = advanceHocTapRoom(host.room.code, host.hostToken);
      expect(snapshot.phase).toBe("leaderboard");
      expect(snapshot.roundTopFive).toHaveLength(5);
      expect(snapshot.roundTopFive.every((participant) => !participant.isHost)).toBe(
        true,
      );
      expect(snapshot.roundTopFive.map((participant) => participant.name)).not.toContain(
        "Host One",
      );

      snapshot = advanceHocTapRoom(host.room.code, host.hostToken);
    }

    expect(snapshot.status).toBe("finished");
    expect(snapshot.finalTopThree).toHaveLength(3);
    expect(snapshot.finalTopThree.every((participant) => !participant.isHost)).toBe(
      true,
    );
    expect(snapshot.finalTopThree.map((participant) => participant.name)).toEqual([
      "An",
      "Binh",
      "Chi",
    ]);
  });

  it("requires a playable hoc-tap quiz", () => {
    expect(() =>
      createHocTapRoom({
        hostName: "Host One",
        quizId: "prompt-engineering",
      }),
    ).toThrow("Bộ quiz này chưa sẵn sàng để tạo phòng.");
  });

  it("exposes review answers only for host-review rooms", () => {
    const reviewHost = createHocTapRoom({
      hostName: "Review Host",
      quizId: "ai-marketing",
      roomType: "host-review",
    });
    const secretHost = createHocTapRoom({
      hostName: "Secret Host",
      quizId: "ai-ban-hang",
      roomType: "ai-secret",
    });

    expect(reviewHost.room.reviewQuestions?.[0]).toMatchObject({
      correctIndex: expect.any(Number),
      explanation: expect.any(String),
    });
    expect(secretHost.room.reviewQuestions).toBeNull();

    joinHocTapRoom({
      code: reviewHost.room.code,
      playerName: "Review Player",
    });
    joinHocTapRoom({
      code: secretHost.room.code,
      playerName: "Secret Player",
    });

    const startedReview = startHocTapRoom(reviewHost.room.code, {
      hostToken: reviewHost.hostToken,
    });
    const startedSecret = startHocTapRoom(secretHost.room.code, {
      hostToken: secretHost.hostToken,
    });

    expect(startedReview.currentQuestion?.correctIndex).toEqual(
      expect.any(Number),
    );
    expect(startedSecret.currentQuestion?.correctIndex).toBeUndefined();
    expect(startedSecret.currentQuestion?.explanation).toBeUndefined();
  });

  it("lets only host-review rooms update questions before start", () => {
    const replacementQuestions = [
      {
        question: "Host nên kiểm tra điều gì trước khi bắt đầu phòng?",
        options: ["Mục tiêu và đáp án", "Màu nền", "Tên file", "Emoji"],
        correctIndex: 0,
        explanation: "Host-review cho phép kiểm tra bộ câu hỏi trước khi chơi.",
      },
      {
        question: "Người chơi cần gì để tham gia phòng quiz?",
        options: ["Mã phòng", "Service role key", "Database URL", "Token OpenAI"],
        correctIndex: 0,
        explanation: "Người chơi chỉ cần mã phòng và tên hiển thị.",
      },
      {
        question: "Khi nào host có thể sửa câu hỏi?",
        options: [
          "Trước khi phòng bắt đầu",
          "Sau khi kết thúc",
          "Giữa trận",
          "Không bao giờ",
        ],
        correctIndex: 0,
        explanation: "Bộ câu hỏi chỉ nên đổi khi phòng còn trong sảnh chờ.",
      },
    ];
    const reviewHost = createHocTapRoom({
      hostName: "Review Host",
      quizId: "ai-marketing",
      roomType: "host-review",
    });
    const secretHost = createHocTapRoom({
      hostName: "Secret Host",
      quizId: "ai-ban-hang",
      roomType: "ai-secret",
    });

    const updated = updateHocTapRoomQuestions({
      code: reviewHost.room.code,
      hostToken: reviewHost.hostToken,
      questions: replacementQuestions,
    });
    expect(updated.reviewQuestions?.map((question) => question.question)).toEqual(
      replacementQuestions.map((question) => question.question),
    );

    expect(() =>
      updateHocTapRoomQuestions({
        code: secretHost.room.code,
        hostToken: secretHost.hostToken,
        questions: replacementQuestions,
      }),
    ).toThrow("Phòng bí mật không cho xem hoặc sửa bộ câu hỏi trước.");
  });

  it("returns viewer host state from participant id", () => {
    const host = createHocTapRoom({
      hostName: "Host One",
      quizId: "ai-hanh-chinh-hr",
    });
    const player = joinHocTapRoom({
      code: host.room.code,
      playerName: "Player Two",
    });

    expect(getHocTapRoomSnapshot(host.room.code, host.participantId).isHost).toBe(
      true,
    );
    expect(getHocTapRoomSnapshot(host.room.code, player.participantId).isHost).toBe(
      false,
    );
  });
});
