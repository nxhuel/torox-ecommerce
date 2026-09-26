import { createHmac, timingSafeEqual } from 'node:crypto';

export const ENVIA_SIGNATURE_HEADER = 'x-webhook-signature';
export const ENVIA_TIMESTAMP_HEADER = 'x-webhook-timestamp';
export const ENVIA_EVENT_HEADER = 'x-webhook-event';
export const ENVIA_ID_HEADER = 'x-webhook-id';

/** Default replay window for `X-Webhook-Timestamp` (5 minutes, like most providers). */
export const DEFAULT_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

export interface EnviaSignatureInput {
  /** Shared secret (the webhook `auth_token`). When missing the check is skipped. */
  secret?: string | null;
  /** Raw request body exactly as received; required to reproduce the signature. */
  rawBody?: string | null;
  /** `X-Webhook-Signature` header, e.g. `v1=ab12...`. */
  signature?: string | null;
  /** `X-Webhook-Timestamp` header (unix milliseconds). */
  timestamp?: string | null;
  /** `X-Webhook-Event` header, e.g. `tracking.simple`. */
  event?: string | null;
  toleranceMs?: number;
  now?: number;
}

export type EnviaSignatureResult =
  | { status: 'valid' }
  | { status: 'skipped'; reason: string }
  | { status: 'invalid'; reason: string };

/** Rebuilds the signed payload: `timestamp + "." + event + "." + body_json`. */
export function buildSignedPayload(timestamp: string, event: string, rawBody: string): string {
  return `${timestamp}.${event}.${rawBody}`;
}

/** Computes the hex HMAC-SHA256 that Envia sends in `X-Webhook-Signature`. */
export function computeEnviaSignature(
  secret: string,
  timestamp: string,
  event: string,
  rawBody: string,
): string {
  return createHmac('sha256', secret)
    .update(buildSignedPayload(timestamp, event, rawBody))
    .digest('hex');
}

/**
 * Verifies the `X-Webhook-Signature` header (`v1=<hex>`) against the shared secret.
 *
 * Rules from https://docs.envia.com/docs/webhooks:
 *  - Only signed types (tracking.simple, ecommerceTracking, surcharge) send the headers,
 *    so a request without a signature is accepted but reported as `skipped` (legacy types
 *    and the test endpoint never sign).
 *  - The signature covers the timestamp + event headers and the exact JSON body.
 *  - A stale timestamp is rejected to block replayed deliveries.
 */
export function verifyEnviaSignature(input: EnviaSignatureInput): EnviaSignatureResult {
  const {
    secret,
    rawBody,
    timestamp,
    event,
    toleranceMs = DEFAULT_TIMESTAMP_TOLERANCE_MS,
    now = Date.now(),
  } = input;
  const signature = input.signature?.trim();

  if (!secret) return { status: 'skipped', reason: 'ENVIA_WEBHOOK_SECRET no configurado' };
  if (!signature) return { status: 'skipped', reason: 'la petición no trae X-Webhook-Signature' };
  if (!rawBody) return { status: 'invalid', reason: 'no se pudo leer el body crudo' };
  if (!timestamp) return { status: 'invalid', reason: 'falta X-Webhook-Timestamp' };
  if (!event) return { status: 'invalid', reason: 'falta X-Webhook-Event' };

  const candidates = signature
    .split(',')
    .map((value) => value.trim())
    .map((value) => /^v1=([0-9a-f]{64})$/i.exec(value)?.[1])
    .filter((value): value is string => Boolean(value));
  if (!candidates.length) return { status: 'invalid', reason: 'formato de firma inválido' };

  const timestampMs = Number(timestamp);
  if (!Number.isFinite(timestampMs)) return { status: 'invalid', reason: 'timestamp inválido' };
  if (Math.abs(now - timestampMs) > toleranceMs) {
    return { status: 'invalid', reason: 'timestamp fuera de la ventana permitida' };
  }

  const expected = Buffer.from(computeEnviaSignature(secret, timestamp, event, rawBody), 'hex');
  const matches = candidates.some((candidate) => {
    const received = Buffer.from(candidate, 'hex');
    return expected.length === received.length && timingSafeEqual(expected, received);
  });

  return matches ? { status: 'valid' } : { status: 'invalid', reason: 'la firma no coincide' };
}
