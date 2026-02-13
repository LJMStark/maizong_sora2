import { db } from "@/db";
import { user } from "@/db/schema/auth/user";
import { account } from "@/db/schema/auth/account";
import { session } from "@/db/schema/auth/session";
import { verification } from "@/db/schema/auth/verification";
import { eq, and, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, username } = body;

    if (!email && !username) {
      return NextResponse.json(
        { error: "email or username required" },
        { status: 400 }
      );
    }

    const conditions = [];
    if (email) conditions.push(eq(user.email, email));
    if (username) conditions.push(eq(user.username, username));

    const unverifiedUsers = await db
      .select({ id: user.id })
      .from(user)
      .where(and(or(...conditions), eq(user.emailVerified, false)));

    for (const u of unverifiedUsers) {
      await db.delete(session).where(eq(session.userId, u.id));
      await db.delete(account).where(eq(account.userId, u.id));
      await db.delete(verification).where(eq(verification.identifier, email));
      await db.delete(user).where(eq(user.id, u.id));
    }

    return NextResponse.json({ deleted: unverifiedUsers.length });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
