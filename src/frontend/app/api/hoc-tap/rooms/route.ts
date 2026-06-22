import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import {
  generateHocTapAiRoomQuestions,
  normalizeHocTapAiRoomPreviewInput,
} from "@/lib/hoc-tap-ai-room-generator";
import {
  getBooleanField,
  getNumberField,
  getStringField,
  hocTapRoomRouteError,
  parseHocTapRoomEntryRole,
  parseHocTapRoomMode,
  parseHocTapRoomQuestions,
  parseHocTapRoomType,
  readHocTapRoomJson,
} from "@/lib/hoc-tap-room-api";
import {
  createHocTapRoomWithRuntime,
  listHocTapRoomsWithRuntime,
} from "@/lib/hoc-tap-room-runtime";
import {
  HocTapRoomError,
  type HocTapRoomCreateResult,
} from "@/lib/hoc-tap-room-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await resolveApiSession();
  if (!session) {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  return apiOk(await listHocTapRoomsWithRuntime(session));
}

export async function POST(request: Request) {
  const session = await resolveApiSession();
  if (!session) {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  try {
    const body = await readHocTapRoomJson(request);
    const roomType = parseHocTapRoomType(body.roomType);
    const aiProject = getObjectField(body, "aiProject");
    const aiResult = aiProject
      ? await createAiProjectRoom(session, body, aiProject, roomType)
      : null;
    const result =
      aiResult ??
      (await createHocTapRoomWithRuntime(session, {
        hostName: getStringField(body, "hostName"),
        avatarSeed: getStringField(body, "avatarSeed"),
        quizId: getStringField(body, "quizId"),
        mode: parseHocTapRoomMode(body.mode),
        roomType,
        maxPlayers: getNumberField(body, "maxPlayers"),
        entryRole: parseHocTapRoomEntryRole(body.entryRole),
        locked: getBooleanField(body, "locked"),
      }));
    const questionSource =
      aiResult?.questionSource ?? (aiProject ? "selected" : undefined);

    return apiOk({
      ...result,
      questionSource,
    });
  } catch (error) {
    return hocTapRoomRouteError(error);
  }
}

async function createAiProjectRoom(
  session: Awaited<ReturnType<typeof resolveApiSession>>,
  body: Record<string, unknown>,
  aiProject: Record<string, unknown>,
  roomType: ReturnType<typeof parseHocTapRoomType>,
): Promise<
  HocTapRoomCreateResult & {
    questionSource?: "openai" | "fallback";
  }
> {
  const normalizedRoomType = roomType ?? "host-review";
  const projectInput = normalizeHocTapAiRoomPreviewInput({
    ...aiProject,
    roomType: normalizedRoomType,
  });
  const generated =
    normalizedRoomType === "ai-secret"
      ? await generateHocTapAiRoomQuestions(projectInput)
      : null;
  const questions = generated
    ? generated.questions
    : parseHocTapRoomQuestions(body.questions);

  const result = await createHocTapRoomWithRuntime(session!, {
    hostName: getStringField(body, "hostName"),
    avatarSeed: getStringField(body, "avatarSeed"),
    aiProject: projectInput,
    questions,
    mode: parseHocTapRoomMode(body.mode),
    roomType: projectInput.roomType,
    maxPlayers: getNumberField(body, "maxPlayers"),
    entryRole: parseHocTapRoomEntryRole(body.entryRole),
    locked: getBooleanField(body, "locked"),
  });

  return {
    ...result,
    questionSource: generated?.source,
  };
}

function getObjectField(
  body: Record<string, unknown>,
  field: string,
): Record<string, unknown> | null {
  const value = body[field];
  if (!value) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new HocTapRoomError("INVALID_INPUT", `${field} không hợp lệ.`);
  }
  return value as Record<string, unknown>;
}
