import { getShowById } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const show = await getShowById(Number(params.id));
  
  if (!show) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.json(show);
}
