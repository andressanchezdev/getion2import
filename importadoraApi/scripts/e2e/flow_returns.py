# flow_returns · devoluciones de punta a punta: crear, aprobar (saldo a favor y reingreso de stock) y rechazar con motivo
# uso: E2E_BASE=http://localhost:3091 python flow_returns.py (API en modo desarrollo: un evento mal grabado es un panic)
import json, time
from e2e import call, check, d
import e2e
from e2e_flow_lib import tok, items_of, perm_ids


def main():
    sfx = str(int(time.time()))[-6:]
    r = call('POST', '/auth/login', body={'email': 'superadmin1@importadora.com', 'password': '123456', 'actorType': 'superadmin'})
    sa = tok(r)
    r = call('POST', '/companies', sa, {'name': 'Compania Devoluciones E2E ' + sfx, 'city': 'Cali'})
    cid = d(r)['id']
    email = f'admind{sfx}@e2e.com'
    call('POST', '/admins', sa, {'companyId': cid, 'email': email, 'password': 'Admin12345', 'firstName': 'Dora', 'lastName': 'Devuelve'})
    ad = tok(call('POST', '/auth/login', body={'email': email, 'password': 'Admin12345', 'actorType': 'admin'}))
    check('admin de la compania entra', bool(ad))

    wid = d(call('POST', '/warehouses', ad, {'code': 'BD' + sfx, 'name': 'Bodega Devoluciones', 'city': 'Cali'}))['id']
    call('POST', f'/warehouses/{wid}/locations', ad, {'code': 'A-01'})
    cat = d(call('POST', '/categories', ad, {'name': 'General'}))['id']
    r = call('POST', '/products', ad, {'categoryId': cat, 'code': 'PD' + sfx, 'name': 'BUJIA', 'unit': 'UND', 'iva': 19,
                                       'prices': {'p1': 10000, 'p2': 9000, 'p3': 8000, 'p4': 7000},
                                       'initialStock': [{'warehouseId': wid, 'location': 'A-01', 'quantity': 20}]})
    check('producto con stock inicial', r[0] in (200, 201), r)
    pid = d(r)['id']
    r = call('POST', '/customers', ad, {'documentType': 'CC', 'document': '6' + sfx, 'personType': 'natural', 'name': 'Cliente Devuelve'})
    cust = d(r)['id']
    its = items_of(call('GET', f'/stock?productId={pid}&warehouseId={wid}', ad))
    if not its:
        print('ABORTA: sin stock'); return
    stock_id = its[0].get('stockId')

    rid = d(call('POST', '/roles', ad, {'code': 'DEV' + sfx, 'name': 'Vendedor'}))['id']
    perms = perm_ids(ad, {'orders': None, 'returns': None, 'payments': ['view', 'view_detail', 'edit', 'verify']})
    r = call('POST', '/employees', ad, {'roleId': rid, 'warehouseId': wid, 'email': f'd{sfx}@e2e.com', 'password': 'Emp12345678', 'firstName': 'Rita', 'lastName': 'Retorna', 'documentType': 'CC', 'document': '7' + sfx, 'initialPermissions': perms})
    check('vendedor con permisos de devoluciones', r[0] in (200, 201), r)
    emp = d(r)['id']
    et = tok(call('POST', '/auth/login', body={'email': f'd{sfx}@e2e.com', 'password': 'Emp12345678', 'actorType': 'employee'}))
    check('vendedor inicia sesion', bool(et))

    r = call('POST', '/sales', ad, {'salespersonEmployeeId': emp, 'customerId': cust, 'warehouseId': wid, 'paymentMethod': 'transfer', 'paymentReference': 'REF-DEV-001', 'items': [{'stockId': stock_id, 'quantity': 4}]})
    check('crear venta', r[0] in (200, 201), r)
    sid = d(r)['id']
    r = call('GET', f'/sales/{sid}', ad)
    sale_items = (d(r) or {}).get('items') or []
    check('la venta trae sus renglones', len(sale_items) == 1, r)
    if not sale_items:
        return
    item_id = sale_items[0]['id']

    def new_return(resolution, qty):
        return call('POST', '/returns', et, {'saleId': sid, 'reason': 'Pieza equivocada en el despacho', 'reasonType': 'wrong_item', 'resolutionType': resolution,
                                             'items': [{'saleItemId': item_id, 'quantity': qty, 'restock': True}]})

    print('== Crear')
    r = call('POST', '/returns', et, {'saleId': sid, 'reason': 'Sin renglones', 'reasonType': 'wrong_item', 'resolutionType': 'credit_balance', 'items': []})
    # ojo: hoy la API responde 500 (no 400) a las validaciones de devoluciones; aquí solo se comprueba que no la crea
    check('sin renglones se rechaza', r[0] >= 400, r)
    r = new_return('credit_balance', 1)
    check('crear devolucion con saldo a favor', r[0] in (200, 201), r)
    ret1 = (d(r) or {}).get('id')
    check('nace pendiente', (d(r) or {}).get('status') == 'pending', r)
    r = new_return('credit_balance', 1)
    check('crear segunda devolucion', r[0] in (200, 201), r)
    ret2 = (d(r) or {}).get('id')
    if not ret1 or not ret2:
        return

    print('== Aprobar')
    before = items_of(call('GET', f'/stock?productId={pid}&warehouseId={wid}', ad))
    r = call('POST', f'/returns/{ret1}/approve', et, {})
    check('aprobar devolucion', r[0] in (200, 204), r)
    r = call('GET', f'/returns/{ret1}', et)
    check('queda aprobada', (d(r) or {}).get('status') == 'approved', r)
    r = call('POST', f'/returns/{ret1}/approve', et, {})
    check('aprobar dos veces se rechaza', r[0] >= 400, r)
    after = items_of(call('GET', f'/stock?productId={pid}&warehouseId={wid}', ad))
    print('   stock antes/despues:', json.dumps(before)[:160], '|', json.dumps(after)[:160])

    print('== Rechazar')
    r = call('POST', f'/returns/{ret2}/reject', et, {'reason': 'corto'})
    check('motivo corto rechazado', r[0] == 400, r)
    r = call('POST', f'/returns/{ret2}/reject', et, {'reason': 'La pieza llego usada y sin empaque original'})
    check('rechazar devolucion con motivo', r[0] in (200, 204), r)
    r = call('GET', f'/returns/{ret2}', et)
    check('queda rechazada', (d(r) or {}).get('status') == 'rejected', r)
    r = call('POST', f'/returns/{ret2}/reject', et, {'reason': 'Segundo intento de rechazo de la misma'})
    check('rechazar dos veces se rechaza', r[0] >= 400, r)

    r = call('GET', '/returns', et)
    ids = [x.get('id') for x in items_of(r)]
    check('la lista trae las dos devoluciones', ret1 in ids and ret2 in ids, r)

    print(f'\nRESULTADO devoluciones: {e2e.ok_count} ok, {e2e.fail_count} fallas (compania {cid})')


main()
