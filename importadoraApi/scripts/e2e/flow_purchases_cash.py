# flow_purchases_cash.py · proveedor → catálogo → orden de compra → recepción → pago desde la caja → cierre de caja → «Facturas» (gastos de las cajas)
import json, time
from e2e import call, check, d
import e2e
from e2e_flow_lib import tok, items_of, perm_ids


def main():
    sfx = str(int(time.time()))[-6:]
    sa = tok(call('POST', '/auth/login', body={'email': 'superadmin1@importadora.com', 'password': '123456', 'actorType': 'superadmin'}))
    cid = d(call('POST', '/companies', sa, {'name': 'Compania Compras E2E ' + sfx, 'city': 'Cali'}))['id']
    email = f'admc{sfx}@e2e.com'
    call('POST', '/admins', sa, {'companyId': cid, 'email': email, 'password': 'Admin12345', 'firstName': 'Carla', 'lastName': 'Compras'})
    ad = tok(call('POST', '/auth/login', body={'email': email, 'password': 'Admin12345', 'actorType': 'admin'}))
    wa = d(call('POST', '/warehouses', ad, {'code': 'CA' + sfx, 'name': 'Bodega A', 'city': 'Cali'}))['id']
    wb = d(call('POST', '/warehouses', ad, {'code': 'CB' + sfx, 'name': 'Bodega B', 'city': 'Cali'}))['id']
    for w in (wa, wb):
        call('POST', f'/warehouses/{w}/locations', ad, {'code': 'A-01'})
    cat = d(call('POST', '/categories', ad, {'name': 'General'}))['id']
    p1 = d(call('POST', '/products', ad, {'categoryId': cat, 'code': 'C1' + sfx, 'name': 'PASTILLA', 'unit': 'UND', 'iva': 19, 'prices': {'p1': 10000, 'p2': 9000, 'p3': 8000, 'p4': 7000}}))['id']
    p2 = d(call('POST', '/products', ad, {'categoryId': cat, 'code': 'C2' + sfx, 'name': 'CADENA', 'unit': 'UND', 'iva': 19, 'prices': {'p1': 10000, 'p2': 9000, 'p3': 8000, 'p4': 7000}}))['id']
    r = call('POST', '/externals', ad, {'kind': 'supplier', 'name': 'Proveedor ' + sfx, 'documentType': 'NIT', 'document': '900' + sfx})
    check('crear proveedor', r[0] in (200, 201), r)
    sup = d(r)['id']

    # empleados: la caja de A (con detalle de caja), la de B y uno sin detalle de caja
    rid = d(call('POST', '/roles', ad, {'code': 'CJ' + sfx, 'name': 'Cajero'}))['id']
    full = perm_ids(ad, {'purchases': None, 'cash': None, 'stock': ['view']})
    basic = perm_ids(ad, {'purchases': ['view'], 'cash': ['view', 'create', 'edit']})
    E = {}
    for key, wh, perms in (('A', wa, full), ('B', wb, full), ('N', wa, basic)):
        call('POST', '/employees', ad, {'roleId': rid, 'warehouseId': wh, 'email': f'{key.lower()}{sfx}@e2e.com', 'password': 'Emp12345678', 'firstName': 'Caja' + key, 'lastName': 'C', 'documentType': 'CC', 'document': str(ord(key)) + sfx, 'initialPermissions': perms})
        E[key] = tok(call('POST', '/auth/login', body={'email': f'{key.lower()}{sfx}@e2e.com', 'password': 'Emp12345678', 'actorType': 'employee'}))

    print('== Catálogo del proveedor y orden de compra')
    r = call('POST', '/purchases', E['A'], {'supplierId': sup, 'warehouseId': wa, 'items': [{'productId': p1, 'quantity': 10, 'unitCost': 5000, 'ivaPercent': 19}]})
    check('orden con un producto que el proveedor NO vende -> 400', r[0] == 400 and 'PRODUCT_NOT_OFFERED_BY_SUPPLIER' in json.dumps(r[1]), r)
    r = call('PUT', f'/purchases/suppliers/{sup}/products', E['A'], {'productId': p1, 'cost': 5000, 'supplierCode': 'PAST-01'})
    check('agregar el producto al catálogo del proveedor', r[0] == 200 and len(d(r)) == 1, r)
    check('el catálogo lista el producto', any(x['productId'] == p1 for x in items_of(call('GET', f'/purchases/suppliers/{sup}/products', E['A']))))
    check('un producto de otra compañía no entra al catálogo', call('PUT', f'/purchases/suppliers/{sup}/products', E['A'], {'productId': 1, 'cost': 1})[0] == 404)
    r = call('POST', '/purchases', E['A'], {'supplierId': sup, 'warehouseId': wa, 'items': [{'productId': p1, 'quantity': 10, 'unitCost': 5000, 'ivaPercent': 19}]})
    check('orden con un producto del catálogo', r[0] in (200, 201), r)
    po = d(r)
    pid = po['id']
    total = po['total']

    print('== Recepción y pago de la caja')
    r = call('POST', f'/purchases/{pid}/pay', E['A'], {'cashAmount': 1000})
    check('no se paga una orden que no se ha recibido', r[0] == 400 and 'PURCHASE_NOT_RECEIVED' in json.dumps(r[1]), r)
    item_id = items_of(call('GET', f'/purchases/{pid}', E['A'])) or None
    detail = d(call('GET', f'/purchases/{pid}', E['A']))
    item_id = detail['items'][0]['id']
    r = call('POST', f'/purchases/{pid}/receive', E['A'], {'supplierRef': 'FAC-' + sfx, 'items': [{'purchaseItemId': item_id, 'quantity': 10, 'location': 'A-01'}]})
    check('recibir la orden completa', r[0] in (200, 201), r)
    check('la orden queda recibida', (d(call('GET', f'/purchases/{pid}', E['A'])) or {}).get('status') == 'received')

    r = call('POST', f'/purchases/{pid}/pay', E['A'], {'cashAmount': 1000})
    check('sin turno de caja abierto no se paga', r[0] == 409 and 'NO_OPEN_CASH_SESSION' in json.dumps(r[1]), r)
    check('abrir el turno de caja de A', call('POST', '/cash/sessions/open', E['A'], {'warehouseId': wa, 'openingAmount': 1000000})[0] in (200, 201))
    check('la caja de otra bodega no paga la recepción', call('POST', f'/purchases/{pid}/pay', E['B'], {'cashAmount': 1000})[0] == 403)
    check('pagar más de lo pendiente -> 400', call('POST', f'/purchases/{pid}/pay', E['A'], {'cashAmount': total + 1000})[0] == 400)
    check('pago en cero -> 400', call('POST', f'/purchases/{pid}/pay', E['A'], {'cashAmount': 0})[0] == 400)
    r = call('POST', f'/purchases/{pid}/pay', E['A'], {'cashAmount': 20000, 'receiptNumber': 'RC-' + sfx})
    check('la caja de A paga un abono de la recepción', r[0] == 200 and d(r)['paidTotal'] == 20000, r)
    active = d(call('GET', f'/cash/sessions/active?warehouseId={wa}', E['A']))
    check('lo pagado sale de la gaveta (esperado = fondo - pagos)', active['expectedCash'] == 1000000 - 20000 and active['expensesCash'] == 20000, active)
    check('lo pendiente baja', (d(call('GET', f'/purchases/{pid}', E['A'])) or {}).get('paidTotal') == 20000)

    print('== Cierre de caja y Facturas')
    check('antes de cerrar no hay gastos en Facturas', items_of(call('GET', '/cash/expenses', ad)) == [])
    r = call('POST', '/cash/sessions/close', E['A'], {'warehouseId': wa, 'countedCash': 980000, 'countedTransfer': 0, 'expenses': [{'receiptNumber': 'G-1', 'concept': 'Domicilio', 'cashAmount': 5000}]})
    check('cerrar la caja', r[0] == 200, r)
    closed = d(r) or {}
    check('el cierre descuenta pagos de recepciones y gastos declarados (esperado 975.000, diferencia +5.000)', closed.get('expectedCash') == 975000 and closed.get('difference') == 5000 and closed.get('expensesCash') == 25000, closed)
    rows = items_of(call('GET', '/cash/expenses', ad))
    check('Facturas lista los dos gastos de la caja cerrada', len(rows) == 2, rows)
    rec = next((x for x in rows if x.get('purchaseId') == pid), None)
    check('el pago de la recepción muestra la orden, el proveedor y la bodega', bool(rec) and rec['supplierName'] == 'Proveedor ' + sfx and rec['warehouseName'] == 'Bodega A' and rec['cashAmount'] == 20000, rec)
    check('quien no tiene el detalle de caja no entra a Facturas', call('GET', '/cash/expenses', E['N'])[0] == 403)
    check('la caja de otra bodega no ve los gastos de A', items_of(call('GET', '/cash/expenses', E['B'])) == [])
    check('el filtro por bodega funciona', len(items_of(call('GET', f'/cash/expenses?warehouseId={wb}', ad))) == 0 and len(items_of(call('GET', f'/cash/expenses?warehouseId={wa}', ad))) == 2)
    check('la búsqueda encuentra por proveedor', len(items_of(call('GET', '/cash/expenses?q=Proveedor', ad))) == 1)

    print(f'RESULTADO compras y caja: {e2e.ok_count} ok, {e2e.fail_count} fallas (compania {cid})')


main()
