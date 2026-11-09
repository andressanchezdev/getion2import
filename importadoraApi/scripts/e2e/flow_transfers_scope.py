# flow_transfers_scope.py · quién ve y quién puede mover un traslado: solo las bodegas de origen y destino (y el administrador)
import json, time
from e2e import call, check, d
import e2e
from e2e_flow_lib import tok, items_of, perm_ids

sfx = str(int(time.time()))[-6:]
sa = tok(call('POST', '/auth/login', body={'email': 'superadmin1@importadora.com', 'password': '123456', 'actorType': 'superadmin'}))
cid = d(call('POST', '/companies', sa, {'name': 'Compania Traslados ' + sfx, 'city': 'Cali'}))['id']
email = f'admt{sfx}@e2e.com'
call('POST', '/admins', sa, {'companyId': cid, 'email': email, 'password': 'Admin12345', 'firstName': 'Tomas', 'lastName': 'Traslados'})
ad = tok(call('POST', '/auth/login', body={'email': email, 'password': 'Admin12345', 'actorType': 'admin'}))
W = {}
for k in 'ABC':
    W[k] = d(call('POST', '/warehouses', ad, {'code': 'T' + k + sfx, 'name': 'Bodega ' + k, 'city': 'Cali'}))['id']
    call('POST', f'/warehouses/{W[k]}/locations', ad, {'code': 'A-01'})
cat = d(call('POST', '/categories', ad, {'name': 'General'}))['id']
pid = d(call('POST', '/products', ad, {'categoryId': cat, 'code': 'PT' + sfx, 'name': 'FILTRO', 'unit': 'UND', 'iva': 19, 'prices': {'p1': 1000, 'p2': 900, 'p3': 800, 'p4': 700},
                                         'initialStock': [{'warehouseId': W['A'], 'location': 'A-01', 'quantity': 20}, {'warehouseId': W['B'], 'location': 'A-01', 'quantity': 0}]}))['id']
rid = d(call('POST', '/roles', ad, {'code': 'TR' + sfx, 'name': 'Traslador'}))['id']
perms = perm_ids(ad, {'transfers': None, 'stock': ['view']})
E = {}
for k in 'ABC':
    call('POST', '/employees', ad, {'roleId': rid, 'warehouseId': W[k], 'email': f'{k.lower()}{sfx}@e2e.com', 'password': 'Emp12345678', 'firstName': 'Emp' + k, 'lastName': 'T', 'documentType': 'CC', 'document': str(ord(k)) + sfx, 'initialPermissions': perms})
    E[k] = tok(call('POST', '/auth/login', body={'email': f'{k.lower()}{sfx}@e2e.com', 'password': 'Emp12345678', 'actorType': 'employee'}))

stock_a = items_of(call('GET', f'/stock?productId={pid}&warehouseId={W["A"]}', ad))[0]
r = call('POST', '/transfers', E['B'], {'originWarehouseId': W['A'], 'destinationWarehouseId': W['B'], 'items': [{'productId': pid, 'originStockId': stock_a['stockId'], 'quantity': 5}]})
check('B pide a A', r[0] == 201, r)
tid = d(r)['id']
sa2 = items_of(call('GET', f'/stock?productId={pid}&warehouseId={W["A"]}', ad))[0]
check('la solicitud reserva en el origen', sa2['reserved'] == 5 and sa2['sellable'] == 15, sa2)


def ids(token, q=''):
    return [t['id'] for t in items_of(call('GET', '/transfers' + q, token))]


check('la bodega de origen lo ve', tid in ids(E['A']))
check('la bodega de destino lo ve', tid in ids(E['B']))
check('una tercera bodega NO lo ve (sin filtro)', tid not in ids(E['C']))
check('una tercera bodega NO lo ve aunque pida el filtro de otra', tid not in ids(E['C'], f'?warehouseId={W["A"]}'))
check('una tercera bodega no abre el detalle', call('GET', f'/transfers/{tid}', E['C'])[0] == 403)
check('el administrador lo ve', tid in ids(ad))
check('recibir antes de despachar se rechaza', call('POST', f'/transfers/{tid}/receive', E['B'], {'items': []})[0] == 400)
check('una tercera bodega no despacha', call('POST', f'/transfers/{tid}/dispatch', E['C'], {})[0] == 403)
check('el destino no despacha', call('POST', f'/transfers/{tid}/dispatch', E['B'], {})[0] == 403)
check('el origen despacha', call('POST', f'/transfers/{tid}/dispatch', E['A'], {})[0] in (200, 204))
sa3 = items_of(call('GET', f'/stock?productId={pid}&warehouseId={W["A"]}', ad))[0]
check('al despachar sale del origen', sa3['available'] == 15 and sa3['reserved'] == 0, sa3)
check('el origen no recibe', call('POST', f'/transfers/{tid}/receive', E['A'], {'items': []})[0] == 403)
check('una tercera bodega no recibe', call('POST', f'/transfers/{tid}/receive', E['C'], {'items': []})[0] == 403)
check('el destino recibe', call('POST', f'/transfers/{tid}/receive', E['B'], {'items': []})[0] in (200, 204))
sb = items_of(call('GET', f'/stock?productId={pid}&warehouseId={W["B"]}', ad))
check('al recibir entra al destino', sum(x['available'] for x in sb) == 5, sb)

# cancelar: lo pide B a A, una tercera bodega no puede cancelarlo
stock_a = items_of(call('GET', f'/stock?productId={pid}&warehouseId={W["A"]}', ad))[0]
t2 = d(call('POST', '/transfers', E['B'], {'originWarehouseId': W['A'], 'destinationWarehouseId': W['B'], 'items': [{'productId': pid, 'originStockId': stock_a['stockId'], 'quantity': 2}]}))['id']
check('una tercera bodega no cancela', call('POST', f'/transfers/{t2}/cancel', E['C'], {'reason': 'Intento desde una bodega ajena'})[0] == 403)
check('el destino cancela su solicitud', call('POST', f'/transfers/{t2}/cancel', E['B'], {'reason': 'Ya no se necesita el repuesto'})[0] in (200, 204))

print(f'RESULTADO alcance de traslados: {e2e.ok_count} ok, {e2e.fail_count} fallas (compania {cid})')
