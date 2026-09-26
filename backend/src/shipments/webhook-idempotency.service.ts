import { Injectable, Logger } from '@nestjs/common';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // remember deliveries for 24h
const SWEEP_INTERVAL_MS = 60 * 60 * 1000; // prune expired ids at most once per hour

/**
 * Deduplicates webhook deliveries by their `X-Webhook-Id`.
 *
 * Envia may retry a delivery (or send the same event twice), so the same id must only be
 * processed once. Ids are remembered in-process for `DEFAULT_TTL_MS`; this covers a single
 * backend instance, which matches the current deployment. If the API is ever scaled
 * horizontally, back this with a shared store (Redis) so all replicas share the same set.
 */
@Injectable()
export class WebhookIdempotencyService {
  private readonly logger = new Logger(WebhookIdempotencyService.name);
  private readonly seen = new Map<string, number>();
  private lastSweep = Date.now();

  /**
   * Reserves a delivery id for processing.
   *
   * @returns `true` when the id is new (caller should process it), `false` when it is a duplicate.
   */
  claim(id?: string | null): boolean {
    if (!id) {
      // Without an id we cannot deduplicate; let the event through.
      return true;
    }

    this.sweep();

    const expiresAt = this.seen.get(id);
    if (expiresAt && expiresAt > Date.now()) return false;

    this.seen.set(id, Date.now() + DEFAULT_TTL_MS);
    return true;
  }

  /** Forgets a claimed id so a retry can be processed again (e.g. after a failure). */
  release(id?: string | null): void {
    if (!id) return;
    this.seen.delete(id);
  }

  private sweep(): void {
    const now = Date.now();
    if (now - this.lastSweep < SWEEP_INTERVAL_MS) return;
    this.lastSweep = now;

    for (const [id, expiresAt] of this.seen) {
      if (expiresAt <= now) this.seen.delete(id);
    }
    this.logger.debug(`Limpieza de ids de webhook: ${this.seen.size} en memoria`);
  }
}
