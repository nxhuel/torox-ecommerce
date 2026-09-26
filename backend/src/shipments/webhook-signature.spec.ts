import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TIMESTAMP_TOLERANCE_MS,
  computeEnviaSignature,
  verifyEnviaSignature,
} from './webhook-signature.js';

const SECRET = 'super-secret-token';
const EVENT = 'tracking.simple';
const NOW = 1_760_000_000_000;
const TIMESTAMP = String(NOW);
const RAW_BODY = JSON.stringify({
  type: EVENT,
  data: { tracking_number: '1Z999', status: 'delivered' },
});

const sign = (rawBody = RAW_BODY) =>
  `v1=${computeEnviaSignature(SECRET, TIMESTAMP, EVENT, rawBody)}`;

const validInput = () => ({
  secret: SECRET,
  rawBody: RAW_BODY,
  signature: sign(),
  timestamp: TIMESTAMP,
  event: EVENT,
  now: NOW,
});

describe('verifyEnviaSignature', () => {
  it('acepta una firma correcta', () => {
    expect(verifyEnviaSignature(validInput())).toEqual({ status: 'valid' });
  });

  it('rechaza una firma calculada con otro secret', () => {
    const input = validInput();
    input.secret = 'otro-secret';
    expect(verifyEnviaSignature(input)).toMatchObject({
      status: 'invalid',
    });
  });

  it('rechaza el body si fue modificado', () => {
    const input = validInput();
    input.rawBody = RAW_BODY.replace('delivered', 'in_transit');
    expect(verifyEnviaSignature(input)).toMatchObject({ status: 'invalid' });
  });

  it('rechaza un timestamp fuera de la ventana permitida (replay)', () => {
    const input = validInput();
    input.now = NOW + DEFAULT_TIMESTAMP_TOLERANCE_MS + 1;
    expect(verifyEnviaSignature(input)).toMatchObject({
      status: 'invalid',
      reason: 'timestamp fuera de la ventana permitida',
    });
  });

  it('acepta un timestamp dentro de la ventana permitida', () => {
    const input = validInput();
    input.now = NOW + DEFAULT_TIMESTAMP_TOLERANCE_MS - 1;
    expect(verifyEnviaSignature(input)).toEqual({ status: 'valid' });
  });

  it('rechaza un formato de firma invalido', () => {
    const input = validInput();
    input.signature = 'no-es-una-firma';
    expect(verifyEnviaSignature(input)).toMatchObject({
      status: 'invalid',
      reason: 'formato de firma inválido',
    });
  });

  it('exige los headers timestamp y event cuando hay firma', () => {
    expect(
      verifyEnviaSignature({ ...validInput(), timestamp: undefined }),
    ).toMatchObject({ status: 'invalid' });
    expect(verifyEnviaSignature({ ...validInput(), event: undefined })).toMatchObject({
      status: 'invalid',
    });
  });

  it('omite la verificacion cuando no hay firma (tipos legacy / endpoint de test)', () => {
    expect(verifyEnviaSignature({ ...validInput(), signature: undefined })).toEqual({
      status: 'skipped',
      reason: 'la petición no trae X-Webhook-Signature',
    });
  });

  it('omite la verificacion cuando no hay secret configurado', () => {
    expect(verifyEnviaSignature({ ...validInput(), secret: undefined })).toEqual({
      status: 'skipped',
      reason: 'ENVIA_WEBHOOK_SECRET no configurado',
    });
  });
});
