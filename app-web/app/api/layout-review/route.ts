import { NextResponse } from "next/server";
import {
  LayoutReviewRequestSchema,
  reviewLayoutWithAgents,
} from "@/lib/agents/layout-review";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = LayoutReviewRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid layout review request.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const result = await reviewLayoutWithAgents(parsed.data);
  return NextResponse.json(result);
}
