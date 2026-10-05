import { NextResponse } from "next/server";
import { apiError } from "@rehearse/shared";

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(apiError(code, message), { status });
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
