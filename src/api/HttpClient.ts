import { attachJson, redact } from "../core/reporting.ts";

export type QueryParams = Record<string, string | number | boolean | undefined>;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
  }
}

export interface HttpResponse<T> {
  status: number;
  body: T;
}

interface RequestOptions {
  query?: QueryParams;
  json?: unknown;
  /** `application/x-www-form-urlencoded` body. Mailgun incoming mail answers plain text, not JSON. */
  form?: Record<string, string>;
  headers?: Record<string, string>;
  /** Statuses that count as success. Default: 2xx. */
  expectStatus?: number[];
  timeoutMs?: number;
}

const RETRYABLE_STATUS = new Set([502, 503, 504]);
const GET_ATTEMPTS = 3;

/**
 * Minimal JSON client for sell.do Rails endpoints. GETs are retried on
 * network errors and gateway failures; POSTs never are, so a create can't run twice.
 */
export class HttpClient {
  constructor(private readonly baseUrl: string) {}

  get<T>(path: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>("GET", path, options, GET_ATTEMPTS);
  }

  post<T>(path: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>("POST", path, options, 1);
  }

  patch<T>(path: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>("PATCH", path, options, 1);
  }

  private async request<T>(method: string, path: string, options: RequestOptions, attempts: number): Promise<HttpResponse<T>> {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const label = `${method} ${redact(url.pathname + url.search)}`;

    for (let attempt = 1; ; attempt++) {
      let response: Response;
      try {
        response = await fetch(url, {
          method,
          headers: {
            Accept: "application/json, text/plain",
            ...options.headers,
            ...(options.json ? { "Content-Type": "application/json" } : {}),
            ...(options.form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
          },
          body: options.json ? JSON.stringify(options.json) : options.form ? new URLSearchParams(options.form).toString() : undefined,
          signal: AbortSignal.timeout(options.timeoutMs ?? 60_000),
        });
      } catch (error) {
        if (attempt < attempts) {
          await sleep(1_000 * attempt);
          continue;
        }
        throw new ApiError(`${label} failed: ${(error as Error).message}`, 0, "");
      }

      const text = await response.text();
      if (RETRYABLE_STATUS.has(response.status) && attempt < attempts) {
        await sleep(1_000 * attempt);
        continue;
      }

      const ok = options.expectStatus ? options.expectStatus.includes(response.status) : response.ok;
      if (!ok) {
        throw new ApiError(`${label} -> ${response.status}: ${redact(text.slice(0, 500))}`, response.status, text);
      }
      let body: T;
      let attached: unknown;
      try {
        body = JSON.parse(text) as T;
        attached = JSON.parse(redact(text));
      } catch {
        if (!options.form) {
          throw new ApiError(`${label} -> ${response.status} returned non-JSON: ${text.slice(0, 200)}`, response.status, text);
        }
        body = text as T;
        attached = redact(text.slice(0, 500));
      }
      const request = options.form ?? options.json;
      attachJson(`API ${label} -> ${response.status}`, {
        request: request ? JSON.parse(redact(JSON.stringify(request))) : undefined,
        response: attached,
      });
      return { status: response.status, body };
    }
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
