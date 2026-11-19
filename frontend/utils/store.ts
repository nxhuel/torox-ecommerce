/**
 * Datos de contacto y políticas de la tienda, en un solo lugar.
 * Si cambia el teléfono, la garantía o las redes, se edita sólo acá.
 *
 * Todo lo que se muestra como "promesa" en la tienda (garantía, envíos,
 * medios de pago) sale de este archivo: no agregues afirmaciones que el
 * negocio no pueda cumplir.
 */
export const STORE = {
  name: 'TOROX',
  whatsapp: '5491171383512',
  whatsappDisplay: '11 7138-3512',
  phoneDisplay: '+54 9 11 7138-3512',
  email: 'toroxseguridad@gmail.com',
  /** Zona que se muestra públicamente (no la dirección exacta del depósito). */
  area: 'Lanús, Buenos Aires',
  warrantyDays: 30,
  social: {
    instagram: 'https://www.instagram.com/torox.arg/',
    instagramHandle: '@torox.arg',
    facebook: 'https://www.facebook.com/profile.php?id=61593927764597',
    tiktok: 'https://www.tiktok.com/@torox.arg',
  },
} as const

export function whatsappLink(message = 'Hola! Quisiera saber más sobre sus productos.') {
  return `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(message)}`
}
