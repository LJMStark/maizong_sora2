import { db } from "@/db";
import { studioSession, StudioSessionType } from "@/db/schema";
import { and, desc, eq, ilike } from "drizzle-orm";

export type StudioSessionKind = "image" | "video";

export class StudioSessionAccessError extends Error {
  constructor() {
    super("会话不存在或无权访问");
    this.name = "StudioSessionAccessError";
  }
}

function buildTitle(input: string | undefined, fallback: string): string {
  const title = input?.trim().replace(/\s+/g, " ").slice(0, 40);
  return title || fallback;
}

export const studioSessionService = {
  async createSession(params: {
    userId: string;
    type: StudioSessionKind;
    title?: string;
  }): Promise<StudioSessionType> {
    const [session] = await db
      .insert(studioSession)
      .values({
        id: crypto.randomUUID(),
        userId: params.userId,
        type: params.type,
        title: buildTitle(
          params.title,
          params.type === "image" ? "未命名图像" : "未命名视频"
        ),
      })
      .returning();

    return session;
  },

  async getOrCreateSession(params: {
    userId: string;
    type: StudioSessionKind;
    title?: string;
    sessionId?: string;
  }): Promise<StudioSessionType> {
    if (!params.sessionId) {
      return this.createSession(params);
    }

    const [session] = await db
      .update(studioSession)
      .set({ updatedAt: new Date() })
      .where(
        and(
          eq(studioSession.id, params.sessionId),
          eq(studioSession.userId, params.userId),
          eq(studioSession.type, params.type)
        )
      )
      .returning();

    if (!session) {
      throw new StudioSessionAccessError();
    }

    return session;
  },

  async getUserSessions(params: {
    userId: string;
    type: StudioSessionKind;
    search?: string;
    limit?: number;
  }): Promise<StudioSessionType[]> {
    const baseCondition = and(
      eq(studioSession.userId, params.userId),
      eq(studioSession.type, params.type)
    );
    const search = params.search?.trim();
    const condition = search
      ? and(baseCondition, ilike(studioSession.title, `%${search}%`))
      : baseCondition;

    return db
      .select()
      .from(studioSession)
      .where(condition)
      .orderBy(desc(studioSession.updatedAt))
      .limit(params.limit ?? 50);
  },

  async getSessionById(params: {
    userId: string;
    sessionId: string;
    type?: StudioSessionKind;
  }): Promise<StudioSessionType | null> {
    const typeCondition = params.type
      ? eq(studioSession.type, params.type)
      : undefined;
    const condition = typeCondition
      ? and(
          eq(studioSession.id, params.sessionId),
          eq(studioSession.userId, params.userId),
          typeCondition
        )
      : and(
          eq(studioSession.id, params.sessionId),
          eq(studioSession.userId, params.userId)
        );

    const [session] = await db
      .select()
      .from(studioSession)
      .where(condition)
      .limit(1);

    return session || null;
  },
};
