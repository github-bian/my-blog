export type ApiErrorPayload =
  | {
      error?: { code?: number; name?: string; message?: string };
      msg?: string;
      message?: string;
    }
  | string
  | null;

export class ApiError extends Error {
  status: number;
  code?: number;
  errorName?: string;
  raw?: unknown;

  constructor(args: {
    status: number;
    message: string;
    code?: number;
    errorName?: string;
    raw?: unknown;
  }) {
    super(args.message);
    this.name = "ApiError";
    this.status = args.status;
    this.code = args.code;
    this.errorName = args.errorName;
    this.raw = args.raw;
  }
}

export function formatApiError(
  error: unknown,
  fallback = "请求失败，请稍后重试",
): string {
  if (!(error instanceof ApiError)) return fallback;

  const tags: string[] = [];
  if (error.errorName) tags.push(error.errorName);
  if (error.code) tags.push(`HTTP ${error.code}`);
  else if (error.status) tags.push(`HTTP ${error.status}`);

  return tags.length ? `${error.message}（${tags.join(" · ")}）` : error.message;
}

function extractErrorMessage(status: number, data: any): string {
  const fromFlask = data?.error?.message;
  const fromJwt = data?.msg;
  const fromGeneric = data?.message;
  const fromString = typeof data === "string" ? data : null;

  return (
    fromFlask ||
    fromJwt ||
    fromGeneric ||
    fromString ||
    (status >= 500 ? "服务端错误，请稍后重试" : "请求失败，请检查输入")
  );
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit & { token?: string },
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body && !(init.body instanceof FormData)) {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  }

  const token = init?.token;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(path, { ...init, headers });
  const contentType = res.headers.get("content-type") ?? "";

  let data: unknown = null;
  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await res.text();
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message = extractErrorMessage(res.status, data);
    throw new ApiError({
      status: res.status,
      message,
      code: (data as any)?.error?.code,
      errorName: (data as any)?.error?.name,
      raw: data,
    });
  }

  return data as T;
}

