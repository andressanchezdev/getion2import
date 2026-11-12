# flow_realtime_pilot.py · prueba e2e del piloto E8: stock, traslados con respuesta completa, carrito directo y activo/inactivo
import json, time
from e2e import call, check, d
import e2e
from e2e_flow_lib import tok, items_of, perm_ids

sfx = str(int(time.time()))[-6:]
sa = tok(call('POST', '/auth/login', body={'email': 'superadmin1@importadora.com', 'password': '123456', 'actorType': 'superadmin'}))
cid = d(call('POST', '/companies', sa, {'name': 'Compania Piloto ' + sfx, 'city': 'Medellin'}))['id']
email = f'admp{sfx}@e2e.com'
call('POST', '/admins', sa, {'companyId': cid, 'email': email, 'password': 'Admin12345', 'firstName': 'Pedro', 'lastName': 'Piloto'})
ad = tok(call('POST', '/auth/login', body={'email': email, 'password': 'Admin12345', 'actorType': 'admin'}))

# 1. Crear bodegas A y B con ubicaciones
wA = d(call('POST', '/warehouses', ad, {'code': 'PA' + sfx, 'name': 'Bodega A ' + sfx, 'city': 'Medellin'}))['id']
call('POST', f'/warehouses/{wA}/locations', ad, {'code': 'EST-A1'})
wB = d(call('POST', '/warehouses', ad, {'code': 'PB' + sfx, 'name': 'Bodega B ' + sfx, 'city': 'Medellin'}))['id']
call('POST', f'/warehouses/{wB}/locations', ad, {'code': 'EST-B1'})

# 2. Crear categoría y producto con stock inicial en A
cat = d(call('POST', '/categories', ad, {'name': 'Frenos ' + sfx}))['id']
p_res = call('POST', '/products', ad, {
    'categoryId': cat, 'code': 'PRD' + sfx, 'name': 'Pastilla Frenos', 'unit': 'UND', 'iva': 19,
    'prices': {'p1': 1200, 'p2': 1100, 'p3': 1000, 'p4': 900},
    'initialStock': [{'warehouseId': wA, 'location': 'EST-A1', 'quantity': 30}]
})
check('crear producto con stock inicial', p_res[0] == 201, p_res)
pid = d(p_res)['id']

# 3. Rol y empleados
rid = d(call('POST', '/roles', ad, {'code': 'PL' + sfx, 'name': 'Piloto Rol'}))['id']
perms = perm_ids(ad, {'transfers': None, 'stock': ['view'], 'catalog': ['view'], 'orders': ['view', 'create']})

call('POST', '/employees', ad, {'roleId': rid, 'warehouseId': wA, 'email': f'empa{sfx}@e2e.com', 'password': 'Emp12345678', 'firstName': 'EmpA', 'lastName': 'P', 'documentType': 'CC', 'document': '1' + sfx, 'initialPermissions': perms})
eA = tok(call('POST', '/auth/login', body={'email': f'empa{sfx}@e2e.com', 'password': 'Emp12345678', 'actorType': 'employee'}))

call('POST', '/employees', ad, {'roleId': rid, 'warehouseId': wB, 'email': f'empb{sfx}@e2e.com', 'password': 'Emp12345678', 'firstName': 'EmpB', 'lastName': 'P', 'documentType': 'CC', 'document': '2' + sfx, 'initialPermissions': perms})
eB = tok(call('POST', '/auth/login', body={'email': f'empb{sfx}@e2e.com', 'password': 'Emp12345678', 'actorType': 'employee'}))

# 4. Carrito directo: POST /carts/:id/items aceptando productId + warehouseId y respondiendo CartDto completo
cart_act = d(call('GET', '/carts/active', eA))
cart_id = cart_act['id']
add_res = call('POST', f'/carts/{cart_id}/items', eA, {
    'productId': pid,
    'warehouseId': wA,
    'quantity': 2,
    'unitPrice': 1200
})
check('agregar al carrito con productId + warehouseId responde 200/201 con CartDto', add_res[0] in (200, 201), add_res)
c_data = d(add_res)
check('el carrito contiene el item agregado', any(item.get('productId') == pid for item in c_data.get('items', [])), c_data)

# 5. Traslado: B solicita a A
stock_a = items_of(call('GET', f'/stock?productId={pid}&warehouseId={wA}', ad))[0]
tr_res = call('POST', '/transfers', eB, {
    'originWarehouseId': wA,
    'destinationWarehouseId': wB,
    'items': [{'productId': pid, 'originStockId': stock_a['stockId'], 'quantity': 6, 'destinationLocation': 'EST-B1'}]
})
check('crear solicitud de traslado TR-0000XX', tr_res[0] == 201, tr_res)
transfer = d(tr_res)
tid = transfer['id']
check('estado inicial es pending', transfer['status'] == 'pending', transfer)

# Despachar traslado (A): responde TransferResponse completo con status in_transit y updatedAt
disp_res = call('POST', f'/transfers/{tid}/dispatch', eA, {})
check('despachar traslado responde 200 con TransferResponse', disp_res[0] == 200, disp_res)
disp_data = d(disp_res)
check('estado despachado es in_transit', disp_data.get('status') == 'in_transit', disp_data)
check('despacho incluye updatedAt', bool(disp_data.get('updatedAt')), disp_data)

# Recibir traslado con novedad (B): responde TransferResponse completo con status with_novelty y noveltyNotes
rec_res = call('POST', f'/transfers/{tid}/receive', eB, {
    'hasNovelty': True,
    'noveltyNotes': 'Llegaron 4 unidades en buen estado y 2 dañadas',
    'items': [{'itemId': disp_data['items'][0]['id'], 'receivedQty': 4, 'destinationLocation': 'EST-B1'}]
})
check('recibir traslado responde 200 con TransferResponse', rec_res[0] == 200, rec_res)
rec_data = d(rec_res)
check('estado recibido es with_novelty', rec_data.get('status') == 'with_novelty', rec_data)
check('contiene notas de novedad', rec_data.get('noveltyNotes') == 'Llegaron 4 unidades en buen estado y 2 dañadas', rec_data)

# 6. Activo ⇄ Inactivo de Producto y Bodega
prod_up = call('PUT', f'/products/{pid}', ad, {'status': 'inactive', 'reason': 'Producto descontinuado temporalmente'})
check('desactivar producto responde 200 con datos actualizados', prod_up[0] == 200, prod_up)
prod_data = d(prod_up)
check('producto tiene estado inactive', prod_data.get('status') == 'inactive', prod_data)

wh_up = call('PUT', f'/warehouses/{wB}', ad, {'isActive': False, 'reason': 'Mantenimiento de sede'})
check('desactivar bodega responde 200 con datos actualizados', wh_up[0] == 200, wh_up)
wh_data = d(wh_up)
check('bodega tiene isActive False', wh_data.get('isActive') is False, wh_data)

print(f'RESULTADO piloto E8: {e2e.ok_count} ok, {e2e.fail_count} fallas (compania {cid})')

