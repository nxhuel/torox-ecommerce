export interface SeedCategory {
  name: string;
  slug: string;
  description: string;
  imageUrl?: string;
  sortOrder: number;
  children?: { name: string; slug: string; description?: string }[];
}

export interface SeedProduct {
  name: string;
  slug: string;
  categorySlug: string;
  brand: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  cost: number;
  stock: number;
  isFeatured?: boolean;
  isOnSale?: boolean;
  shortDescription: string;
  description: string;
  specifications: Record<string, string>;
  images: string[];
}

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    name: 'Cámaras',
    slug: 'camaras',
    description: 'Cámaras de seguridad para hogar y negocio.',
    imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=800&q=80&auto=format&fit=crop',
    sortOrder: 1,
    children: [
      { name: 'Cámaras IP', slug: 'camaras-ip', description: 'Cámaras IP con conexión a red y visión remota.' },
      { name: 'Cámaras exteriores', slug: 'camaras-exteriores', description: 'Cámaras resistentes a la intemperie.' },
      { name: 'Cámaras inalámbricas', slug: 'camaras-inalambricas', description: 'Cámaras WiFi sin cables.' },
      { name: 'Cámaras interiores', slug: 'camaras-interiores', description: 'Cámaras para interior de hogar u oficina.' },
    ],
  },
  {
    name: 'Alarmas',
    slug: 'alarmas',
    description: 'Sistemas de alarma para proteger tu espacio.',
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80&auto=format&fit=crop',
    sortOrder: 2,
    children: [
      { name: 'Sistemas de alarma', slug: 'sistemas-de-alarma', description: 'Centrales y kits completos.' },
      { name: 'Sirenas', slug: 'sirenas', description: 'Sirenas de alta potencia.' },
    ],
  },
  {
    name: 'Videoporteros',
    slug: 'videoporteros',
    description: 'Videoporteros con cámara y audio.',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&auto=format&fit=crop',
    sortOrder: 3,
  },
  {
    name: 'Cerraduras inteligentes',
    slug: 'cerraduras-inteligentes',
    description: 'Cerraduras con huella, PIN y WiFi.',
    imageUrl: 'https://images.unsplash.com/photo-1584473457406-6240486418e9?w=800&q=80&auto=format&fit=crop',
    sortOrder: 4,
  },
  {
    name: 'Control de acceso',
    slug: 'control-de-acceso',
    description: 'Sistemas biométricos y lectores RFID.',
    imageUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80&auto=format&fit=crop',
    sortOrder: 5,
    children: [
      { name: 'Biométricos', slug: 'biometricos', description: 'Lectores de huella dactilar.' },
      { name: 'Lectores RFID', slug: 'lectores-rfid', description: 'Lectores de tarjetas y tags.' },
    ],
  },
  {
    name: 'Sensores',
    slug: 'sensores',
    description: 'Sensores de movimiento y apertura.',
    imageUrl: 'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=800&q=80&auto=format&fit=crop',
    sortOrder: 6,
    children: [
      { name: 'Movimiento', slug: 'sensores-movimiento', description: 'Detectores de movimiento PIR.' },
      { name: 'Apertura', slug: 'sensores-apertura', description: 'Sensores magnéticos de puertas y ventanas.' },
    ],
  },
  {
    name: 'Accesorios',
    slug: 'accesorios',
    description: 'Accesorios y equipamiento complementario.',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80&auto=format&fit=crop',
    sortOrder: 7,
  },
];

const img = (id: string) =>
  `https://images.unsplash.com/${id}?w=900&q=80&auto=format&fit=crop`;

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    name: 'Cámara IP WiFi 2K Hikvision',
    slug: 'camara-ip-wifi-2k-hikvision',
    categorySlug: 'camaras-ip',
    brand: 'Hikvision',
    price: 89999,
    originalPrice: 109999,
    discountPercentage: 18,
    cost: 52000,
    stock: 25,
    isFeatured: true,
    isOnSale: true,
    shortDescription: 'Cámara IP WiFi 2K con visión nocturna y audio bidireccional.',
    description:
      'Cámara IP WiFi con resolución 2K (4MP), visión nocturna en color hasta 30m, detección de movimiento inteligente con notificaciones al celular, audio bidireccional y almacenamiento en microSD o NVR. Ideal para hogares y pequeños comercios. Configuración sencilla desde la app en menos de 5 minutos.',
    specifications: {
      Resolución: '4MP (2560x1440)',
      'Visión nocturna': '30m en color',
      Conectividad: 'WiFi 2.4GHz / RJ45',
      'Ángulo de visión': '110°',
      Audio: 'Bidireccional',
      Almacenamiento: 'MicroSD hasta 256GB',
      Protección: 'IP67',
    },
    images: [img('photo-1558002038-1055907df827'), img('photo-1558001530-95af405fc1cb'), img('photo-1558001530-95af405fc1cb')],
  },
  {
    name: 'Kit CCTV 4 Cámaras 1080p Dahua',
    slug: 'kit-cctv-4-camaras-1080p-dahua',
    categorySlug: 'camaras-exteriores',
    brand: 'Dahua',
    price: 249999,
    originalPrice: 289999,
    discountPercentage: 14,
    cost: 145000,
    stock: 10,
    isFeatured: true,
    isOnSale: true,
    shortDescription: 'Kit completo de 4 cámaras 1080p con DVR de 4 canales.',
    description:
      'Kit CCTV profesional con 4 cámaras exteriores Full HD 1080p, DVR con grabación continua y por detección, disco de 1TB incluido, cables y fuentes. Visualización remota desde el celular. Perfecto para negocios, oficinas y casas grandes.',
    specifications: {
      Resolución: 'Full HD 1080p',
      Canales: '4 (ampliable a 8)',
      Almacenamiento: 'HDD 1TB incluido',
      'Visión nocturna': '20m',
      Protección: 'IP66',
      'Grabación': 'Continua / Por movimiento',
    },
    images: [img('photo-1516035069371-29a1b244cc32'), img('photo-1526170375885-4d8ecf77b99f')],
  },
  {
    name: 'Cámara Exterior PTZ 4MP Dahua',
    slug: 'camara-exterior-ptz-4mp-dahua',
    categorySlug: 'camaras-exteriores',
    brand: 'Dahua',
    price: 189999,
    cost: 98000,
    stock: 3,
    isFeatured: true,
    shortDescription: 'Cámara PTZ 4MP con zoom óptico y seguimiento automático.',
    description:
      'Cámara PTZ (Pan-Tilt-Zoom) 4MP con zoom óptico 4x, giro horizontal 355°, inclinación 90°, seguimiento automático de movimiento y visión nocturna de 80m. Control desde app o joystick. Ideal para estacionamientos y perímetros amplios.',
    specifications: {
      Resolución: '4MP',
      'Zoom óptico': '4x',
      'Visión nocturna': '80m',
      Rotación: '355° / 90°',
      'Protección': 'IP66',
      'Seguimiento': 'Automático',
    },
    images: [img('photo-1495707902641-75cac588d2e9'), img('photo-1502920917128-1aa500764cbd')],
  },
  {
    name: 'Cámara Interior Full HD TP-Link',
    slug: 'camara-interior-full-hd-tp-link',
    categorySlug: 'camaras-interiores',
    brand: 'TP-Link',
    price: 59999,
    originalPrice: 69999,
    discountPercentage: 15,
    cost: 34000,
    stock: 40,
    isOnSale: true,
    shortDescription: 'Cámara interior Full HD con rotación y visión nocturna.',
    description:
      'Cámara interior Full HD con rotación motorizada de 360°, visión nocturna, detección de movimiento y de personas, sirenas personalizables y privacidad con obturador físico. Compatible con Alexa y Google Home.',
    specifications: {
      Resolución: 'Full HD 1080p',
      Rotación: '360°',
      'Visión nocturna': '10m',
      'Protección de privacidad': 'Obturador físico',
      Compatibilidad: 'Alexa / Google Home',
      Almacenamiento: 'MicroSD / Nube',
    },
    images: [img('photo-1526170375885-4d8ecf77b99f'), img('photo-1516035069371-29a1b244cc32')],
  },
  {
    name: 'Cámara Inalámbrica con Batería EZVIZ',
    slug: 'camara-inalambrica-bateria-ezviz',
    categorySlug: 'camaras-inalambricas',
    brand: 'EZVIZ',
    price: 79999,
    cost: 45000,
    stock: 8,
    shortDescription: 'Cámara a batería, 100% inalámbrica, para exterior e interior.',
    description:
      'Cámara inalámbrica con batería recargable de larga duración, sin cables de por medio. Resolución 2K, visión nocturna, sirena integrada y alertas inteligentes. Instalación en minutos con soporte magnético o adhesivo.',
    specifications: {
      Resolución: '2K',
      Batería: 'Recargable (3 meses)',
      'Visión nocturna': '10m',
      'Protección': 'IP65',
      Instalación: 'Magnética / Adhesiva',
      Audio: 'Bidireccional',
    },
    images: [img('photo-1502920917128-1aa500764cbd'), img('photo-1558002038-1055907df827')],
  },
  {
    name: 'Sistema de Alarma Inalámbrico Ajax',
    slug: 'sistema-alarma-inalambrico-ajax',
    categorySlug: 'sistemas-de-alarma',
    brand: 'Ajax',
    price: 139999,
    cost: 80000,
    stock: 15,
    isFeatured: true,
    shortDescription: 'Central de alarma inalámbrica con app y sirenas.',
    description:
      'Central de alarma Ajax con comunicación por radio cifrada, control total desde la app, integración con sensores de movimiento y apertura, sirenas y notificaciones instantáneas. Sistema profesional con instalación simplificada.',
    specifications: {
      Comunicación: 'Radio Jeweller cifrada',
      'Batería de respaldo': '16h',
      'Zonas inalámbricas': 'Hasta 100',
      App: 'iOS / Android',
      'Autoinstalación': 'Sí',
    },
    images: [img('photo-1550751827-4bd374c3f58b'), img('photo-1526374965328-7f61d4dc18c5')],
  },
  {
    name: 'Alarma GSM Hogar Smanos',
    slug: 'alarma-gsm-hogar-smanos',
    categorySlug: 'sistemas-de-alarma',
    brand: 'Smanos',
    price: 54999,
    originalPrice: 68999,
    discountPercentage: 20,
    cost: 31000,
    stock: 30,
    isOnSale: true,
    shortDescription: 'Kit de alarma GSM con sensores y control remoto.',
    description:
      'Kit de alarma GSM completo con central, sensor de movimiento, sensores de apertura y controles remotos. Avisos por llamada y SMS, sirena de 110dB y fácil instalación sin cables.',
    specifications: {
      Comunicación: 'GSM / SIM',
      Sirena: '110dB',
      Incluye: 'Central + sensor PIR + 2 apertura + 2 controles',
      'Alimentación': '220V con batería de respaldo',
    },
    images: [img('photo-1563013544-824ae1b704d3'), img('photo-1550751827-4bd374c3f58b')],
  },
  {
    name: 'Sirena Exterior 110dB Ajax',
    slug: 'sirena-exterior-110db-ajax',
    categorySlug: 'sirenas',
    brand: 'Ajax',
    price: 24999,
    cost: 14000,
    stock: 20,
    shortDescription: 'Sirena exterior de alta potencia con luz estroboscópica.',
    description:
      'Sirena exterior Ajax con 110dB de potencia, luz estroboscópica, protección antidesmontaje y batería de respaldo. Se integra con la central Ajax por radio cifrada.',
    specifications: {
      Potencia: '110dB',
      'Luz': 'Estroboscópica',
      'Protección': 'IP54',
      'Antisabotaje': 'Sí',
      'Batería': 'Respaldo incluido',
    },
    images: [img('photo-1558001530-95af405fc1cb'), img('photo-1518709268805-4e9042af9f23')],
  },
  {
    name: 'Videoportero IP Táctil Dahua',
    slug: 'videoportero-ip-tactil-dahua',
    categorySlug: 'videoporteros',
    brand: 'Dahua',
    price: 119999,
    cost: 68000,
    stock: 14,
    isFeatured: true,
    shortDescription: 'Videoportero IP con pantalla táctil y apertura remota.',
    description:
      'Videoportero IP con pantalla táctil de 7", cámara gran angular, visión nocturna, apertura de cerradura desde el monitor o el celular y grabación en microSD. Conexión por red para edificios y casas.',
    specifications: {
      Pantalla: '7" táctil',
      Cámara: '2MP gran angular',
      'Visión nocturna': 'Sí',
      'Apertura remota': 'Desde app',
      'Almacenamiento': 'MicroSD',
      'Conexión': 'PoE / WiFi',
    },
    images: [img('photo-1558618666-fcd25c85cd64'), img('photo-1563203369-26f2e1a5ccf9')],
  },
  {
    name: 'Videoportero WiFi Hikvision',
    slug: 'videoportero-wifi-hikvision',
    categorySlug: 'videoporteros',
    brand: 'Hikvision',
    price: 84999,
    originalPrice: 94999,
    discountPercentage: 10,
    cost: 47000,
    stock: 18,
    isOnSale: true,
    shortDescription: 'Videoportero WiFi con cámara y app para el celular.',
    description:
      'Videoportero WiFi con cámara HD, audio bidireccional y control desde la app Hik-Connect. Recibí la visita en el celular estés donde estés y abrí la puerta con un toque.',
    specifications: {
      Cámara: 'HD 1080p',
      Conectividad: 'WiFi',
      Audio: 'Bidireccional',
      App: 'Hik-Connect',
      Alimentación: '220V',
    },
    images: [img('photo-1563203369-26f2e1a5ccf9'), img('photo-1558618666-fcd25c85cd64')],
  },
  {
    name: 'Cerradura Inteligente con Huella Yale',
    slug: 'cerradura-inteligente-huella-yale',
    categorySlug: 'cerraduras-inteligentes',
    brand: 'Yale',
    price: 169999,
    cost: 96000,
    stock: 2,
    isFeatured: true,
    shortDescription: 'Cerradura inteligente con huella, PIN y llave de emergencia.',
    description:
      'Cerradura inteligente Yale con lector de huella, teclado PIN, llave tradicional de emergencia y control desde el celular. Historial de accesos, alertas de intrusión y batería de larga duración con aviso de bajo nivel.',
    specifications: {
      'Desbloqueo': 'Huella / PIN / Llave / App',
      'Capacidad de huellas': 'Hasta 100',
      Batería: '4x AA (6 meses)',
      'Grado de seguridad': 'Grado 2',
      'Alerta': 'Intrusión y batería baja',
    },
    images: [img('photo-1584473457406-6240486418e9'), img('photo-1517420704952-d9f39e95b43e')],
  },
  {
    name: 'Cerradura Smart WiFi Xiaomi',
    slug: 'cerradura-smart-wifi-xiaomi',
    categorySlug: 'cerraduras-inteligentes',
    brand: 'Xiaomi',
    price: 129999,
    originalPrice: 147999,
    discountPercentage: 12,
    cost: 73000,
    stock: 22,
    isOnSale: true,
    shortDescription: 'Cerradura smart con WiFi, huella y contraseña temporal.',
    description:
      'Cerradura inteligente Xiaomi con conexión WiFi, desbloqueo por huella, contraseña, NFC y llave mecánica. Generá contraseñas temporales para visitas y recibí notificaciones de cada apertura.',
    specifications: {
      'Desbloqueo': 'Huella / PIN / NFC / Llave',
      Conectividad: 'WiFi 2.4GHz',
      'Contraseñas temporales': 'Sí',
      Batería: 'Recargable',
      'Grado de seguridad': 'Grado 2',
    },
    images: [img('photo-1517420704952-d9f39e95b43e'), img('photo-1584473457406-6240486418e9')],
  },
  {
    name: 'Control de Acceso Biométrico ZKTeco',
    slug: 'control-acceso-biometrico-zkteco',
    categorySlug: 'biometricos',
    brand: 'ZKTeco',
    price: 99999,
    cost: 56000,
    stock: 16,
    isFeatured: true,
    shortDescription: 'Reloj biométrico con huella y control de acceso.',
    description:
      'Control de acceso biométrico ZKTeco con lector de huella y tarjeta, pantalla táctil, gestión de usuarios por software y salida para cerradura eléctrica. Ideal para oficinas y comercios.',
    specifications: {
      'Capacidad de huellas': '3000',
      'Capacidad de usuarios': '5000',
      Pantalla: 'Táctil 2.8"',
      'Tarjetas': 'RFID / MIFARE',
      'Salida': 'Cerradura eléctrica',
      'Software': 'Incluido',
    },
    images: [img('photo-1563013544-824ae1b704d3'), img('photo-1526374965328-7f61d4dc18c5')],
  },
  {
    name: 'Lector RFID de Tarjetas ZKTeco',
    slug: 'lector-rfid-tarjetas-zkteco',
    categorySlug: 'lectores-rfid',
    brand: 'ZKTeco',
    price: 44999,
    cost: 24000,
    stock: 35,
    shortDescription: 'Lector RFID para control de acceso de puertas.',
    description:
      'Lector RFID de tarjetas y llaveros para control de acceso, con salida Wiegand, alcance de lectura de 5cm y carcasa resistente para interior o exterior techado.',
    specifications: {
      Tecnología: 'RFID 125kHz',
      'Alcance': '5cm',
      'Salida': 'Wiegand 26',
      'Protección': 'IP65',
      'Alimentación': '12V DC',
    },
    images: [img('photo-1526374965328-7f61d4dc18c5'), img('photo-1563013544-824ae1b704d3')],
  },
  {
    name: 'Sensor de Movimiento PIR Ajax',
    slug: 'sensor-movimiento-pir-ajax',
    categorySlug: 'sensores-movimiento',
    brand: 'Ajax',
    price: 19999,
    cost: 11000,
    stock: 50,
    isFeatured: true,
    shortDescription: 'Detector de movimiento PIR con anti-mascotas.',
    description:
      'Sensor de movimiento PIR con inmunidad a mascotas hasta 25kg, alcance de 12m y ángulo de 90°. Comunicación por radio cifrada con la central Ajax y batería de 5 años.',
    specifications: {
      Alcance: '12m / 90°',
      'Anti-mascotas': 'Hasta 25kg',
      'Batería': '5 años',
      'Comunicación': 'Radio Jeweller',
    },
    images: [img('photo-1563013544-824ae1b704d3'), img('photo-1550751827-4bd374c3f58b')],
  },
  {
    name: 'Sensor de Apertura Ajax',
    slug: 'sensor-apertura-ajax',
    categorySlug: 'sensores-apertura',
    brand: 'Ajax',
    price: 14999,
    originalPrice: 19999,
    discountPercentage: 25,
    cost: 8000,
    stock: 5,
    isOnSale: true,
    shortDescription: 'Sensor magnético de puertas y ventanas.',
    description:
      'Sensor magnético de apertura para puertas y ventanas, con detección de sabotaje, batería de larga duración y comunicación cifrada con la central Ajax.',
    specifications: {
      'Tipo': 'Magnético',
      'Distancia de detección': '2cm',
      Batería: '5 años',
      'Anti-sabotaje': 'Sí',
    },
    images: [img('photo-1517420704952-d9f39e95b43e'), img('photo-1550751827-4bd374c3f58b')],
  },
  {
    name: 'Pack 2 Sensores de Movimiento Smanos',
    slug: 'pack-2-sensores-movimiento-smanos',
    categorySlug: 'sensores-movimiento',
    brand: 'Smanos',
    price: 34999,
    cost: 19000,
    stock: 28,
    shortDescription: 'Dos sensores PIR inalámbricos para alarma.',
    description:
      'Pack de 2 sensores de movimiento PIR inalámbricos compatibles con centrales Smanos y sistemas de alarma 433MHz. Instalación sin cables con soporte incluido.',
    specifications: {
      'Cantidad': '2 sensores',
      Alcance: '8m / 100°',
      Frecuencia: '433MHz',
      'Alimentación': '2x AA cada uno',
    },
    images: [img('photo-1550751827-4bd374c3f58b'), img('photo-1563013544-824ae1b704d3')],
  },
  {
    name: 'Fuente de Alimentación CCTV 12V',
    slug: 'fuente-alimentacion-cctv-12v',
    categorySlug: 'accesorios',
    brand: 'Inter',
    price: 12999,
    cost: 7000,
    stock: 45,
    shortDescription: 'Fuente conmutada 12V 5A para cámaras y DVR.',
    description:
      'Fuente conmutada de 12V y 5A para alimentar cámaras de seguridad y DVR. Protección contra cortocircuitos y sobrecarga, con 4 salidas.',
    specifications: {
      'Salida': '12V DC 5A',
      Salidas: '4',
      'Protecciones': 'Cortocircuito / Sobrecarga',
      'Alimentación': '220V AC',
    },
    images: [img('photo-1541888946425-d81bb19240f5'), img('photo-1558002038-1055907df827')],
  },
  {
    name: 'Cable UTP Cat6 305m',
    slug: 'cable-utp-cat6-305m',
    categorySlug: 'accesorios',
    brand: 'Inter',
    price: 29999,
    originalPrice: 35999,
    discountPercentage: 16,
    cost: 16500,
    stock: 32,
    isOnSale: true,
    shortDescription: 'Cable de red Cat6 para cámaras IP, rollo de 305m.',
    description:
      'Rollo de cable UTP Cat6 de 305 metros, ideal para tendidos de cámaras IP y redes. Conductor de cobre puro, velocidad hasta 1Gbps.',
    specifications: {
      Categoría: 'Cat6',
      'Largo': '305m',
      'Velocidad': 'Hasta 1Gbps',
      'Conductor': 'Cobre',
    },
    images: [img('photo-1526374965328-7f61d4dc18c5'), img('photo-1541888946425-d81bb19240f5')],
  },
  {
    name: 'Soporte de Pared para Cámara',
    slug: 'soporte-pared-camara',
    categorySlug: 'accesorios',
    brand: 'Velleman',
    price: 8999,
    cost: 4500,
    stock: 80,
    shortDescription: 'Soporte metálico para cámara de seguridad.',
    description:
      'Soporte metálico de pared para cámaras bala y domo, con brazo ajustable y fijaciones incluidas. Pintura anti-corrosiva para exterior.',
    specifications: {
      Material: 'Metal',
      'Ajuste': 'Brazo orientable',
      'Uso': 'Interior / Exterior',
      Incluye: 'Tornillería',
    },
    images: [img('photo-1558002038-1055907df827'), img('photo-1541888946425-d81bb19240f5')],
  },
];

export const SEED_CUSTOMERS = [
  { firstName: 'Lucía', lastName: 'Fernández', email: 'lucia.fernandez@example.com', phone: '+54 11 5555-1021' },
  { firstName: 'Martín', lastName: 'Gómez', email: 'martin.gomez@example.com', phone: '+54 11 5555-2034' },
  { firstName: 'Sofía', lastName: 'Rodríguez', email: 'sofia.rodriguez@example.com', phone: '+54 351 555-7812' },
  { firstName: 'Juan', lastName: 'Pérez', email: 'juan.perez@example.com', phone: '+54 341 555-4420' },
  { firstName: 'Carla', lastName: 'Díaz', email: 'carla.diaz@example.com', phone: '+54 11 5555-6678' },
  { firstName: 'Diego', lastName: 'López', email: 'diego.lopez@example.com', phone: '+54 261 555-3345' },
  { firstName: 'Valentina', lastName: 'Martínez', email: 'valentina.martinez@example.com', phone: '+54 11 5555-8890' },
  { firstName: 'Nicolás', lastName: 'Sosa', email: 'nicolas.sosa@example.com', phone: '+54 221 555-9987' },
];

export const CUSTOMER_PASSWORD = 'Cliente123!';
export const ADMIN_EMAIL = 'admin@torox.com';
export const ADMIN_PASSWORD = 'Admin123!';

export const PROVINCES = ['Buenos Aires', 'Córdoba', 'Santa Fe', 'Mendoza', 'Tucumán', 'Entre Ríos'];

export interface SeedOrderSpec {
  customerIndex: number;
  items: { slug: string; qty: number }[];
  status: string;
  createdAt: Date;
  paymentMethod: string;
  paymentStatus: string;
  shippingMethod?: string;
  hasShipment?: boolean;
  shipmentStatus?: string;
  shipmentCreatedAt?: Date;
}