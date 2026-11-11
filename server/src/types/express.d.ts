import type { AuthUser } from "./auth.types";

/** Authenticated identity attached to the request by `protect`. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      /** Correlation id, echoed in the `x-request-id` response header. */
      requestId?: string;
    }
  }
}

export {};
