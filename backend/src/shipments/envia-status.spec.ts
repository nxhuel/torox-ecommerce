import { describe, expect, it } from 'vitest';
import { EnviaProvider } from './providers/envia.provider';
import { ShipmentStatus } from './entities/shipment.entity';

// mapStatus no usa config ni http: alcanza con stubs vacíos.
const provider = new EnviaProvider(
  { get: () => undefined } as any,
  {} as any,
);

describe('EnviaProvider.mapStatus', () => {
  it('mapea los estados normales del flujo', () => {
    expect(provider.mapStatus('Created')).toBe(ShipmentStatus.PREPARING);
    expect(provider.mapStatus('Picked up')).toBe(ShipmentStatus.PICKED_UP);
    expect(provider.mapStatus('In transit')).toBe(ShipmentStatus.IN_TRANSIT);
    expect(provider.mapStatus('Out for delivery')).toBe(ShipmentStatus.OUT_FOR_DELIVERY);
    expect(provider.mapStatus('Delivered')).toBe(ShipmentStatus.DELIVERED);
  });

  it('no confunde "out for delivery" compuesto con entregado', () => {
    expect(provider.mapStatus('Out for delivery - Lanus')).toBe(ShipmentStatus.OUT_FOR_DELIVERY);
  });

  it('las incidencias no cambian el estado (null)', () => {
    expect(provider.mapStatus('Exception')).toBeNull();
    expect(provider.mapStatus('Delivery attempt failed')).toBeNull();
    expect(provider.mapStatus('Undelivered')).toBeNull();
    expect(provider.mapStatus('Returned to sender')).toBeNull();
    expect(provider.mapStatus('Canceled')).toBeNull();
  });

  it('un estado desconocido no vuelve el envío a PREPARING', () => {
    expect(provider.mapStatus('algo raro')).toBeNull();
    expect(provider.mapStatus(undefined)).toBeNull();
  });
});
