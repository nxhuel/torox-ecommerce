import { describe, expect, it } from 'vitest';
import { of } from 'rxjs';
import { EnviaProvider } from './providers/envia.provider';

/**
 * Respuesta REAL del sandbox de Envia (Correo Argentino, Lanús → CABA).
 * dropOff según Envia: 0 puerta→puerta · 1 sucursal→puerta · 2 puerta→sucursal · 3 sucursal→sucursal
 */
const SANDBOX_RATE = [
  { carrier: 'correoArgentino', carrierDescription: 'Correo Argentino', service: 'standard_dom', dropOff: 0, totalPrice: 635.69, currency: 'ARS' },
  { carrier: 'correoArgentino', carrierDescription: 'Correo Argentino', service: 'standard_suc', dropOff: 2, totalPrice: 349.19, currency: 'ARS' },
  { carrier: 'correoArgentino', carrierDescription: 'Correo Argentino', service: 'priority_dom', dropOff: 0, totalPrice: 784.25, currency: 'ARS' },
];

function makeProvider(env: Record<string, string> = {}) {
  const config = { get: (k: string) => ({ ENVIA_API_KEY: 'x', ENVIA_API_BASE: 'https://api-test.envia.com', ...env } as any)[k] };
  const http = {
    post: () => of({ data: { meta: 'rate', data: SANDBOX_RATE } }),
    get: () => of({ data: [] }),
  };
  return new EnviaProvider(config as any, http as any);
}

const address = { name: 'X', street: 'Calle', number: '1', city: 'Lanus', state: 'BA', country: 'AR', postalCode: '1824' } as any;
const quote = (p: EnviaProvider) =>
  p.quoteOptions({
    origins: { correoArgentino: address },
    destination: { ...address, city: 'CABA', state: 'DF', postalCode: '1043' },
    packages: [{ weightKg: 0.5, widthCm: 15, heightCm: 10, lengthCm: 15, declaredValue: 1 } as any],
    carriers: ['correoArgentino'],
  });

describe('Envia dropOff (modalidades)', () => {
  it('por defecto sólo ofrece envío a domicilio (dropOff 0), no "a sucursal"', async () => {
    const options = await quote(makeProvider());
    expect(options.map((o) => o.service)).toEqual(['standard_dom', 'priority_dom']);
    expect(options.every((o) => o.deliveryMode === 'HOME' && o.pickupMode === 'DOOR')).toBe(true);
  });

  it('con ENVIA_DELIVERY_MODES=HOME,BRANCH ofrece también retiro en sucursal', async () => {
    const options = await quote(makeProvider({ ENVIA_DELIVERY_MODES: 'HOME,BRANCH' }));
    const suc = options.find((o) => o.service === 'standard_suc');
    expect(suc?.deliveryMode).toBe('BRANCH');
    expect(options[0].service).toBe('standard_suc'); // más barato primero
  });
});
