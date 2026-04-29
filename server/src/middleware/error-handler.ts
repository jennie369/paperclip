import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { HttpError } from "../errors.js";

// Postgres error codes we want to surface as 4xx instead of generic 500.
// Refs: https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_CODE_TO_HTTP: Record<string, { status: number; message: string }> = {
  "22P02": { status: 400, message: "Invalid identifier format" }, // invalid_text_representation (e.g. shortId passed where UUID expected)
  "22021": { status: 400, message: "Payload contains invalid UTF-8 byte (e.g. NUL 0x00)" }, // character_not_in_repertoire
  "23503": { status: 409, message: "Foreign key constraint violation" }, // foreign_key_violation
  "23505": { status: 409, message: "Duplicate value violates unique constraint" }, // unique_violation
  "23502": { status: 400, message: "Required field is missing" }, // not_null_violation
};

interface PgLikeError {
  code?: string;
  message?: string;
  detail?: string;
}

function isPgError(err: unknown): err is PgLikeError {
  if (!err || typeof err !== "object") return false;
  const code = (err as PgLikeError).code;
  return typeof code === "string" && /^[0-9A-Z]{5}$/.test(code);
}

export interface ErrorContext {
  error: { message: string; stack?: string; name?: string; details?: unknown; raw?: unknown };
  method: string;
  url: string;
  reqBody?: unknown;
  reqParams?: unknown;
  reqQuery?: unknown;
}

function attachErrorContext(
  req: Request,
  res: Response,
  payload: ErrorContext["error"],
  rawError?: Error,
) {
  (res as any).__errorContext = {
    error: payload,
    method: req.method,
    url: req.originalUrl,
    reqBody: req.body,
    reqParams: req.params,
    reqQuery: req.query,
  } satisfies ErrorContext;
  if (rawError) {
    (res as any).err = rawError;
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    if (err.status >= 500) {
      attachErrorContext(
        req,
        res,
        { message: err.message, stack: err.stack, name: err.name, details: err.details },
        err,
      );
    }
    res.status(err.status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation error", details: err.errors });
    return;
  }

  if (isPgError(err)) {
    const mapped = PG_CODE_TO_HTTP[err.code as string];
    if (mapped) {
      res.status(mapped.status).json({
        error: mapped.message,
        details: { pgCode: err.code, pgMessage: err.message, pgDetail: err.detail },
      });
      return;
    }
  }

  const rootError = err instanceof Error ? err : new Error(String(err));
  attachErrorContext(
    req,
    res,
    err instanceof Error
      ? { message: err.message, stack: err.stack, name: err.name }
      : { message: String(err), raw: err, stack: rootError.stack, name: rootError.name },
    rootError,
  );

  res.status(500).json({ error: "Internal server error" });
}
