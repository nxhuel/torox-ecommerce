# TOROX — System Design Document

## 1. Contexto del proyecto

**Torox** es un emprendimiento de seguridad que busca centralizar toda su operación en una única plataforma digital.

El sistema tendrá dos grandes partes:

1. **Tienda web pública (E-commerce)**
2. **Panel administrativo para gestionar el negocio**

La tienda estará especializada en productos y soluciones de seguridad, por ejemplo:

* Cámaras de seguridad
* Sistemas CCTV
* Alarmas
* Sensores
* Videoporteros
* Cerraduras inteligentes
* Controles de acceso
* Puertas y sistemas de seguridad
* Accesorios y equipos relacionados

La experiencia visual debe transmitir:

* Seguridad
* Confianza
* Tecnología
* Profesionalismo
* Modernidad

La referencia conceptual del e-commerce es una plataforma tipo **Mercado Libre**, adaptada al nicho de seguridad.

---

# 2. Objetivo de esta versión

## Versión: DEMO / MVP

Esta primera versión debe ser completamente funcional a nivel de interfaz y lógica interna.

Sin embargo, las siguientes integraciones serán **simuladas**:

* Mercado Pago
* Andreani
* Procesamiento bancario real
* APIs externas de logística

El objetivo es que el sistema parezca y funcione como una plataforma real, aunque los servicios externos sean simulados.

La arquitectura debe quedar preparada para reemplazar estas simulaciones por integraciones reales en futuras versiones.

---

# 3. Arquitectura general

```text
torox/
│
├── backend/
│
├── frontend/
│
├── docker-compose.yml
│
└── system_design.md
```

La aplicación debe estar dividida claramente entre frontend y backend.

---

# 4. Backend

## Stack tecnológico

* Node.js
* NestJS
* TypeScript
* PostgreSQL
* Docker
* Docker Compose

El proyecto completo debe poder levantarse utilizando:

```bash
docker-compose up --build -d
```

---

# 5. Arquitectura del Backend

Utilizar una arquitectura modular basada en NestJS.

Ejemplo:

```text
src/
│
├── auth/
├── users/
├── customers/
├── categories/
├── products/
├── favorites/
├── cart/
├── orders/
├── payments/
├── shipments/
├── notifications/
├── promotions/
├── finance/
├── dashboard/
│
├── common/
│   ├── exceptions/
│   ├── guards/
│   ├── decorators/
│   └── middleware/
│
├── database/
│
└── main.ts
```

Cada módulo debe tener una separación clara entre:

```text
controller
service
dto
entity/model
repository o acceso a datos
```

Utilizar DTOs para requests y responses.

Implementar:

* Validaciones
* Manejo global de errores
* Logging
* Autenticación
* Autorización por roles

---

# 6. Roles del sistema

El sistema tendrá inicialmente dos tipos principales de usuarios.

## ADMIN

Representa a **Torox**.

Puede administrar todo el sistema.

Permisos:

* Gestionar categorías
* Gestionar productos
* Gestionar stock
* Gestionar precios
* Crear ofertas
* Crear promociones
* Ver clientes
* Gestionar clientes
* Gestionar pedidos
* Aprobar o rechazar pagos
* Simular envíos
* Ver notificaciones
* Gestionar finanzas
* Ver dashboard con métricas

---

## CUSTOMER / CLIENTE

Representa a un comprador registrado.

Puede:

* Registrarse
* Iniciar sesión
* Editar su perfil
* Guardar favoritos
* Recibir notificaciones
* Ver sus compras
* Ver el estado de sus pedidos
* Realizar compras

---

# 7. Compras como invitado

El sistema debe permitir realizar compras sin iniciar sesión.

Un usuario invitado podrá:

* Navegar productos
* Buscar productos
* Agregar productos al carrito
* Realizar checkout
* Ingresar sus datos personales
* Ingresar dirección de envío
* Realizar pago simulado

No podrá:

* Guardar favoritos permanentemente
* Ver historial asociado a una cuenta
* Recibir notificaciones personalizadas

Durante el checkout se puede ofrecer:

```text
¿Ya tenés una cuenta? Ingresá

o

Creá una cuenta para guardar tus compras y recibir ofertas.
```

---

# 8. Categorías

El administrador debe poder realizar CRUD completo de categorías.

Cada categoría tendrá:

```text
id
name
slug
description
image
isActive
createdAt
updatedAt
```

Ejemplos:

* Cámaras
* Alarmas
* Videoporteros
* Cerraduras inteligentes
* Control de acceso
* Sensores
* Accesorios

Las categorías pueden tener opcionalmente subcategorías.

Ejemplo:

```text
Cámaras
├── Cámaras interiores
├── Cámaras exteriores
├── Cámaras IP
└── Cámaras inalámbricas
```

---

# 9. Productos

El administrador debe poder realizar CRUD completo de productos.

Un producto debe contener toda la información necesaria para un e-commerce profesional.

```text
id
name
slug
description
shortDescription

categoryId

brand

sku

price
originalPrice

cost

stock

images[]

specifications

isFeatured
isOnSale
discountPercentage

isActive

createdAt
updatedAt
```

---

## Estados especiales

### Producto destacado

Los productos destacados pueden aparecer:

* Home
* Sección destacados
* Carruseles
* Recomendaciones

---

### Producto en oferta

Un producto puede tener:

```text
originalPrice
discountPercentage
finalPrice
```

Ejemplo:

```text
Precio original: $100.000

Descuento: 20%

Precio final: $80.000
```

El frontend debe mostrar visualmente:

```text
$100.000 tachado

$80.000

20% OFF
```

---

# 10. Stock

Cada producto debe tener control de stock.

Reglas:

```text
stock > 0
```

Producto disponible.

```text
stock = 0
```

Producto agotado.

No se debe permitir comprar más unidades que las disponibles.

Al confirmarse una compra:

```text
stock = stock - cantidadComprada
```

---

# 11. Carrito de compras

El comprador podrá:

* Agregar productos
* Eliminar productos
* Modificar cantidades
* Vaciar carrito

El carrito debe calcular automáticamente:

```text
subtotal

descuentos

costoEnvio

total
```

Fórmula:

```text
total = subtotal - descuentos + costoEnvio
```

---

# 12. Favoritos

Los usuarios autenticados podrán guardar productos como favoritos.

Acciones:

```text
Agregar a favoritos

Eliminar de favoritos

Ver todos mis favoritos
```

El navbar tendrá un icono de corazón cuando el usuario esté autenticado.

---

# 13. Checkout

El checkout debe ser visualmente profesional y dividido en pasos.

## Paso 1 — Datos personales

Para invitados:

```text
Nombre

Apellido

Email

Teléfono
```

Para usuarios autenticados, cargar automáticamente la información disponible.

---

## Paso 2 — Dirección de envío

Campos:

```text
Provincia

Ciudad

Código postal

Dirección

Número

Departamento / Piso

Referencias
```

---

## Paso 3 — Método de envío

En esta versión será una simulación de Andreani.

Opciones posibles:

```text
Envío a domicilio

Retiro en sucursal
```

El sistema debe calcular un costo de envío simulado.

Ejemplo de lógica demo:

```text
Compra superior a determinado monto

→ envío gratis

Compra inferior

→ costo de envío calculado
```

El diseño debe indicar claramente:

```text
Envío simulado por Andreani
```

Pero visualmente debe parecer una integración real.

---

# 14. Pagos

En esta versión NO conectar Mercado Pago ni procesadores reales.

Se debe crear un sistema de pago simulado.

El usuario podrá seleccionar:

* Tarjeta de crédito
* Tarjeta de débito
* Transferencia bancaria simulada

---

## Tarjetas

El formulario debe detectar visualmente la red de la tarjeta utilizando el número ingresado.

Redes principales:

* Visa
* Mastercard
* American Express

También considerar:

* Cabal
* Maestro

La detección debe realizarse utilizando patrones/BIN simulados.

Ejemplos conceptuales:

```text
4...

→ Visa
```

```text
51-55...

→ Mastercard
```

```text
34 / 37...

→ American Express
```

No almacenar información real de tarjetas.

La información debe ser completamente simulada.

---

## Resultado del pago

Al finalizar:

```text
Pago aprobado
```

o

```text
Pago pendiente
```

El administrador podrá posteriormente:

```text
Aprobar pago

Rechazar pago
```

Para la demo, se pueden generar distintos resultados simulados.

---

# 15. Pedidos

Cada compra genera un pedido.

Estados posibles:

```text
PENDING_PAYMENT

PAYMENT_APPROVED

PROCESSING

SHIPPED

DELIVERED

CANCELLED
```

Flujo:

```text
Checkout
↓
PENDING_PAYMENT
↓
ADMIN APRUEBA
↓
PAYMENT_APPROVED
↓
PROCESSING
↓
ENVÍO SIMULADO
↓
SHIPPED
↓
DELIVERED
```

---

# 16. Envíos — Simulación Andreani

No conectar API real.

Crear un módulo:

```text
ShipmentService
```

que simule la creación de un envío.

Al aprobarse el pago:

```text
crearShipment()
```

Generar:

```text
trackingNumber

shipmentStatus

estimatedDelivery
```

Ejemplo:

```text
TORX-AND-849201
```

Estados:

```text
PREPARING

PICKED_UP

IN_TRANSIT

OUT_FOR_DELIVERY

DELIVERED
```

El administrador debe poder avanzar manualmente los estados durante la demo.

El cliente podrá visualizar un timeline de seguimiento.

---

# 17. Clientes

El administrador podrá visualizar todos los clientes.

Información:

```text
Nombre

Apellido

Email

Teléfono

Fecha de registro

Cantidad de compras

Total gastado

Estado
```

Vista de detalle:

```text
Información personal

Pedidos

Productos comprados

Total gastado

Favoritos
```

---

# 18. Notificaciones

Los usuarios registrados podrán recibir notificaciones.

Tipos:

```text
PROMOTION

OFFER

ORDER_STATUS

SHIPMENT_STATUS

SYSTEM
```

Ejemplos:

```text
¡Hay una nueva oferta disponible!

Tu pago fue aprobado.

Tu pedido fue enviado.

Tu producto está en camino.
```

El navbar debe incluir una campana para usuarios autenticados.

La campana debe mostrar:

```text
cantidad de notificaciones no leídas
```

---

# 19. Promociones y ofertas

El administrador podrá crear promociones.

Tipos:

```text
Descuento porcentual

Descuento fijo

Envío gratis

Oferta especial
```

Cada promoción puede tener:

```text
Nombre

Descripción

Tipo

Valor

Fecha inicio

Fecha fin

Productos aplicables

Categorías aplicables

Estado
```

---

# 20. Finanzas

Crear un módulo de finanzas para que Torox pueda visualizar la situación económica del negocio.

Debe existir un concepto de:

## Libro contable simplificado

Movimientos:

```text
INCOME

EXPENSE
```

Ejemplos de ingresos:

```text
Venta de producto
```

Ejemplos de gastos:

```text
Compra de mercadería

Logística

Publicidad

Otros gastos
```

Cada movimiento:

```text
id

type

category

description

amount

date

referenceId
```

---

## Dashboard financiero

Mostrar:

```text
Ingresos totales

Gastos totales

Ganancia

Ventas del mes

Cantidad de pedidos

Ticket promedio
```

---

# 21. Dashboard administrativo

El panel admin debe tener un dashboard moderno.

Mostrar:

### Métricas principales

```text
Ventas totales

Ventas del mes

Pedidos

Clientes

Productos con poco stock
```

### Gráficos

* Ventas por mes
* Pedidos por estado
* Productos más vendidos

### Alertas

```text
Productos con stock bajo

Pedidos pendientes

Pagos pendientes
```

---

# 22. Frontend

## Stack

* Vue
* Nuxt
* TypeScript
* TailwindCSS

Utilizar componentes reutilizables.

Estructura sugerida:

```text
components/

layouts/

pages/

composables/

stores/

services/

types/
```

---

# 23. Diseño general

El diseño debe transmitir:

* Seguridad
* Tecnología
* Confianza
* Profesionalismo

Evitar:

* Diseño infantil
* Colores excesivamente llamativos
* Demasiados gradientes
* Interfaces recargadas

Utilizar:

* Mucho espacio en blanco
* Tipografía moderna
* Iconos minimalistas
* Sombras sutiles
* Bordes suaves
* Buen contraste

La experiencia debe sentirse como:

```text
Mercado Libre
+
E-commerce tecnológico
+
Empresa profesional de seguridad
```

---

# 24. Navbar

El navbar debe tener dos filas.

---

## Primera fila

### Izquierda

Logo de **TOROX**.

Debe ocupar una zona visual similar a la del logo de Mercado Libre.

---

### Centro

Barra de búsqueda grande y prominente.

Placeholder:

```text
Buscar productos, marcas y más...
```

Debe incluir:

```text
Input

Botón o icono de lupa
```

---

### Derecha — Usuario NO autenticado

Mostrar:

```text
Creá tu cuenta

Ingresá

Mis compras

Icono carrito
```

Ocultar:

```text
Favoritos

Notificaciones

Cerrar sesión
```

---

### Derecha — Usuario autenticado

Ocultar:

```text
Creá tu cuenta

Ingresá
```

Mostrar:

```text
Hola, [Nombre]

Icono favoritos

Icono campana

Mis compras

Mi cuenta

Cerrar sesión

Carrito
```

La transición entre ambos estados debe mantener exactamente la misma estructura visual general.

---

# 25. Segunda fila del Navbar

### Izquierda

Selector de ubicación.

Ejemplo:

```text
📍 Enviar a

Buenos Aires
```

---

### Centro / derecha

Links:

```text
Categorías

Productos / Tienda

Ofertas

Ayuda
```

Opcionalmente:

```text
Destacados
```

---

# 26. Home

La página principal debe tener las siguientes secciones.

```text
Navbar

Hero

Categorías

Productos destacados

Ofertas

Banner promocional

Productos recomendados

Beneficios

Footer
```

---

# 27. Hero

El hero debe ser visualmente impactante pero elegante.

Debe utilizar como fondo el siguiente video:

https://pixabay.com/es/videos/download/video-339863_medium.mp4

El video debe:

* Ocupar todo el fondo del hero
* Reproducirse automáticamente
* Estar en loop
* No tener sonido
* Tener una capa oscura encima para mejorar la legibilidad

---

## Contenido del Hero

Título:

```text
PROTECCIÓN INTELIGENTE PARA LO QUE MÁS IMPORTA
```

Subtítulo:

```text
Soluciones avanzadas de seguridad para hogares y empresas. Cámaras, alarmas y tecnología diseñada para proteger tus espacios las 24 horas.
```

Botón principal:

```text
Protegete →
```

El botón debe llevar a:

```text
/productos
```

---

# 28. Categorías Home

Mostrar tarjetas visuales para categorías.

Ejemplo:

```text
Cámaras de seguridad

Alarmas

Control de acceso

Videoporteros

Cerraduras inteligentes
```

Cada tarjeta debe incluir:

* Imagen
* Nombre
* Hover moderno
* Link a productos filtrados

---

# 29. Productos destacados

Mostrar productos donde:

```text
isFeatured = true
```

Cada card debe incluir:

```text
Imagen

Nombre

Precio

Descuento si aplica

Stock

Botón agregar al carrito

Botón favoritos
```

---

# 30. Página de productos

Debe permitir:

### Búsqueda

Por:

```text
Nombre

Marca

Categoría
```

### Filtros

```text
Categoría

Marca

Precio

Disponibilidad

Oferta
```

### Ordenamiento

```text
Mayor relevancia

Menor precio

Mayor precio

Más vendidos
```

---

# 31. Detalle de producto

La página debe incluir:

```text
Galería de imágenes

Nombre

Precio

Precio anterior

Descuento

Descripción

Especificaciones

Stock disponible

Selector de cantidad

Agregar al carrito

Agregar a favoritos

Información de envío

Productos relacionados
```

---

# 32. Carrito

Mostrar:

```text
Productos

Cantidad

Precio individual

Subtotal

Descuentos

Costo de envío

Total
```

Botones:

```text
Seguir comprando

Continuar compra
```

---

# 33. Área del cliente

El usuario autenticado debe tener:

```text
Mi perfil

Mis compras

Mis favoritos

Notificaciones

Direcciones
```

---

# 34. Panel administrativo

Ruta sugerida:

```text
/admin
```

Debe ser completamente diferente visualmente de la tienda.

Layout:

```text
Sidebar

Header

Contenido
```

---

## Sidebar

Opciones:

```text
Dashboard

Productos

Categorías

Pedidos

Clientes

Ofertas

Promociones

Finanzas

Notificaciones

Configuración
```

---

# 35. Autenticación

Implementar:

```text
Registro

Login

Logout
```

Utilizar autenticación segura basada en JWT.

Roles:

```text
ADMIN

CUSTOMER
```

Las rutas administrativas deben estar protegidas.

Solo:

```text
ADMIN
```

puede acceder a:

```text
/admin
```

---

# 36. API

Utilizar una API REST.

Ejemplo:

```text
/api/auth

/api/users

/api/categories

/api/products

/api/cart

/api/favorites

/api/orders

/api/payments

/api/shipments

/api/notifications

/api/promotions

/api/finance
```

---

# 37. Datos demo

El sistema debe incluir datos iniciales.

Crear seeders con:

* 1 usuario ADMIN
* Varios clientes
* Categorías
* Subcategorías
* Al menos 15 productos
* Productos destacados
* Productos en oferta
* Pedidos en diferentes estados
* Notificaciones
* Movimientos financieros

Los productos deben pertenecer al nicho de seguridad.

Ejemplos:

```text
Cámara IP WiFi

Kit de cámaras CCTV

Videoportero inteligente

Cerradura inteligente

Sensor de movimiento

Sistema de alarma

Control de acceso biométrico
```

---

# 38. Estados visuales importantes

Implementar correctamente:

```text
Loading

Empty state

Error state

Success state
```

Ejemplos:

```text
No hay productos disponibles.

No tenés favoritos todavía.

Tu carrito está vacío.

No tenés notificaciones.
```

---

# 39. Responsive Design

El sistema debe ser completamente responsive.

Prioridades:

```text
Desktop

Tablet

Mobile
```

En mobile:

* Navbar adaptado
* Menú hamburguesa
* Carrito accesible
* Búsqueda visible
* Cards adaptables
* Admin responsive

---

# 40. Simulaciones

Esta versión debe simular:

## Mercado Pago

```text
Pago aprobado

Pago pendiente

Pago rechazado
```

---

## Andreani

```text
Creación de envío

Tracking

Estados del envío
```

---

# 41. Preparación para futuras integraciones

La arquitectura debe permitir reemplazar fácilmente las simulaciones.

Ejemplo:

```text
PaymentProvider
```

Implementación actual:

```text
MockPaymentProvider
```

Futuro:

```text
MercadoPagoProvider
```

Para envíos:

```text
ShipmentProvider
```

Actual:

```text
MockShipmentProvider
```

Futuro:

```text
AndreaniProvider
```

No acoplar directamente la lógica del negocio a APIs externas.

---

# 42. Requisitos de calidad

El proyecto debe tener:

* Código limpio
* Componentes reutilizables
* Arquitectura modular
* DTOs
* Validaciones
* Manejo global de errores
* Logging
* Variables de entorno
* Docker
* Seeders
* API REST consistente
* Responsive Design
* UI/UX profesional

---

# 43. Prioridad principal

La prioridad de esta versión es crear una experiencia DEMO completamente funcional.

Debe sentirse como un producto real.

Aunque:

```text
Pagos

Envíos

Notificaciones
```

sean simulados internamente.

El usuario debe poder recorrer todo el flujo:

```text
HOME

↓

BUSCAR PRODUCTO

↓

VER PRODUCTO

↓

AGREGAR AL CARRITO

↓

CHECKOUT

↓

PAGO SIMULADO

↓

PEDIDO CREADO

↓

ADMIN APRUEBA

↓

ENVÍO SIMULADO

↓

TRACKING

↓

ENTREGADO
```

