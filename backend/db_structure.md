select * from users

id                                  |email          |password                                                    |first_name|last_name|phone|role |status|avatar_url|reset_code_hash|reset_code_expires_at|reset_code_attempts|created_at             |updated_at             |
------------------------------------+---------------+------------------------------------------------------------+----------+---------+-----+-----+------+----------+---------------+---------------------+-------------------+-----------------------+-----------------------+
854a8375-37ea-45a7-bb9c-5c375b1c3ffa|admin@torox.com|$2b$12$u7KZQ.5ClfF5bgCxdbClvuD0cke43x02fKC0c5CP58x.gXOwSsHdu|Admin     |TOROX    |     |ADMIN|ACTIVE|          |               |                     |                  0|2026-10-20 21:49:43.997|2026-10-20 21:49:43.997|

select * from shipments 
id|order_id|tracking_number|carrier|service|drop_off|branch_code|branch_address|origin_address|origin_branch_code|declared_value|package_info|envia_id|label_url|track_url|status|estimated_delivery|events|shipped_at|delivered_at|created_at|updated_at|
--+---------+----------------+--------+--------+----------+------------+---------------+----------------+--------------------+---------------+--------------+---------+---------+---------+-------+-------------------+-------+-----------+-------------|---------+----------+----------+
-- `drop_off`: 2 = sucursal a puerta (el admin deja el paquete en la sucursal de
--   origen y el carrier lo lleva a la casa del comprador). Es la única
--   modalidad que se ofrece.
-- `branch_code` / `branch_address`: se mantienen por los pedidos antiguos
--   (retiro en sucursal); con el flujo actual quedan vacíos.
-- `origin_address` / `origin_branch_code`: sucursal donde el admin deja el paquete
-- `package_info`: jsonb { weightKg, widthCm, heightCm, lengthCm }

select * from promotions
id|name|description|type|value|start_date|end_date|product_ids|category_ids|is_active|created_at|updated_at|
--+----+-----------+----+-----+----------+--------+-----------+------------+---------+----------+----------+

select * from products
id|name|slug|description|short_description|category_id|brand|sku|price|cost|stock|images|specifications|highlights|specGroups|is_featured|is_on_sale|discount_percentage|is_active|sales_count|weight_kg|width_cm|height_cm|length_cm|created_at|updated_at|
--+----+----+-----------+-----------------+-----------+-----+---+-----+----+-----+------+--------------+----------+----------+-----------+----------+-------------------+---------+-----------+---------+--------+---------+---------+----------+----------+

select * from payments
id|order_id|method|status|amount|provider|card_brand|last_four|reference|message|approved_at|created_at|updated_at|
--+--------+------+------+------+--------+----------+---------+---------+-------+-----------+----------+----------+

select * from orders
id|order_number|user_id|customer_name|customer_email|customer_phone|shipping_address|shipping_method|shipping_option|shipping_branch|shipping_origin|subtotal|discount|shipping_cost|total|status|notes|created_at|updated_at|
--+------------+-------+-------------+--------------+--------------+----------------+---------------+-----------------+-----------------+--------+--------+-------------+-----+------+-----+----------+----------+

select * from order_items 
id|order_id|product_id|name|sku|image|unit_price|quantity|subtotal|
--+--------+----------+----+---+-----+----------+--------+--------+

select * from notifications
id|user_id|type|title|message|is_read|link|created_at|
--+-------+----+-----+-------+-------+----+----------+

select * from finance_movements
id|type|category|description|amount|date|reference_id|created_at|updated_at|
--+----+--------+-----------+------+----+------------+----------+----------+

select * from favorites
id|user_id|product_id|created_at|
--+-------+----------+----------+

select * from carts
id                                  |user_id                             |session_id                          |created_at             |updated_at             |
------------------------------------+------------------------------------+------------------------------------+-----------------------+-----------------------+
2d7efc93-42f8-4c9b-9027-0a1f5dcbdecd|                                    |4cc276ee-ea86-45d2-a3e8-2035797c2424|2026-10-20 21:48:52.227|2026-10-20 21:48:52.227|
7fb5cf20-b758-4a49-bc94-0a6bddf9ad7a|854a8375-37ea-45a7-bb9c-5c375b1c3ffa|                                    |2026-10-20 21:51:40.513|2026-10-20 21:51:40.513|

select * from cart_items
id|cart_id|product_id|quantity|unit_price|product_snapshot|created_at|
--+-------+----------+--------+----------+----------------+----------+

-- ─────────────────────────────────────────────────────────────────────────
-- Envíos (Envia.com)
-- ─────────────────────────────────────────────────────────────────────────

select * from orders
id|order_number|user_id|customer_name|customer_email|customer_phone|shipping_address|shipping_method|shipping_option|shipping_branch|shipping_origin|subtotal|discount|shipping_cost|total|status|notes|created_at|updated_at|
--+------------+-------+--------------+----------------+-----------------+----------------+---------------+-----------------+-----------------+--------+---------+-------------+-----+------+-------+----------+----------+
-- `shipping_method`: HOME_DELIVERY (entrega a domicilio) | BRANCH_PICKUP (pedidos
--   antiguos, retiro en sucursal del carrier) | PICKUP (pedidos antiguos, retiro
--   en TOROX: el local físico ya no existe)
-- `shipping_option`: jsonb con la opción de Envia.com que eligió el comprador
--   { id, carrier, carrierName, service, serviceDescription, dropOff, dropOffDescription,
--     deliveryMode (HOME|BRANCH), pickupMode (DOOR|BRANCH), cost, currency,
--     deliveryEstimate, deliveryDate }
-- `shipping_branch`: jsonb con la sucursal de retiro elegida
--   { branchCode, branchId, carrier, carrierName, reference, type,
--     address { street, number, city, state, postalCode, latitude, longitude },
--     distanceKm, phone, hours }
-- `shipping_origin`: jsonb con el ORIGEN congelado con el que se cotizó
--   { carrier, branchCode, reference, address { name, company, email, phone, street,
--     number, city, state, country, postalCode } }
--   La etiqueta se genera siempre desde este origen, aunque después el admin
--   cambie la sucursal de origen configurada en el panel.

select * from shipments
id|order_id|tracking_number|carrier|service|drop_off|branch_code|branch_address|declared_value|package_info|envia_id|label_url|track_url|status|estimated_delivery|events|shipped_at|delivered_at|created_at|updated_at|
--+---------+----------------+--------+--------+----------+------------+---------------+---------------+--------------+---------+---------+---------+-------+-------------------+-------+-----------+-------------+---------+----------+----------+
-- `drop_off`: 2 = sucursal a puerta (el admin deja el paquete en la sucursal de
--   origen y el carrier lo lleva a la casa del comprador). Es la única
--   modalidad que se ofrece.
-- `branch_code` / `branch_address`: se mantienen por los pedidos antiguos
--   (retiro en sucursal); con el flujo actual quedan vacíos.
-- `origin_address` / `origin_branch_code`: sucursal donde el admin deja el paquete
-- `package_info`: jsonb { weightKg, widthCm, heightCm, lengthCm }

select * from settings
id|key|value|updated_at|
--+---+-----+----------+
-- Clave usada: `envia_origin_branches` → jsonb con la sucursal de origen de
-- Envia POR CARRIER: { oca: { branchCode, carrier, reference, address {...} },
-- andreani: {...} }. El código de sucursal de una paquetería no sirve para otra.
-- La clave vieja `envia_origin_branch` (una sola sucursal) se migra sola al
-- formato nuevo. Si no hay ninguna, el origen es la dirección del .env
-- (ENVIA_ORIGIN_*) y el comprador sólo puede retirar en sucursal.
