# flow_payments_transfers.py · rechazar y reabrir abonos, regla de destino en traslados y endpoint de miniaturas
import json, time
from e2e import call, check, d
import e2e
from e2e_flow_lib import tok, items_of
from flow_sale_annul import perm_ids


def main():
    sfx = str(int(time.time()))[-6:]
    sa = tok(call('POST', '/auth/login', body={'email': 'superadmin1@importadora.com', 'password': '123456', 'actorType': 'superadmin'}))
    cid = d(call('POST', '/companies', sa, {'name': 'Compania Abonos E2E ' + sfx, 'city': 'Cali'}))['id']
    email = f'adminp{sfx}@e2e.com'
    call('POST', '/admins', sa, {'companyId': cid, 'email': email, 'password': 'Admin12345', 'firstName': 'Pilar', 'lastName': 'Pagos'})
    ad = tok(call('POST', '/auth/login', body={'email': email, 'password': 'Admin12345', 'actorType': 'admin'}))
    wa = d(call('POST', '/warehouses', ad, {'code': 'PA' + sfx, 'name': 'Bodega A', 'city': 'Cali'}))['id']
    wb = d(call('POST', '/warehouses', ad, {'code': 'PB' + sfx, 'name': 'Bodega B', 'city': 'Cali'}))['id']
    for w in (wa, wb):
        call('POST', f'/warehouses/{w}/locations', ad, {'code': 'A-01'})
    cat = d(call('POST', '/categories', ad, {'name': 'General'}))['id']
    r = call('POST', '/products', ad, {'categoryId': cat, 'code': 'PP' + sfx, 'name': 'BUJIA', 'unit': 'UND', 'iva': 19, 'prices': {'p1': 10000, 'p2': 9000, 'p3': 8000, 'p4': 7000},
                                       'initialStock': [{'warehouseId': wa, 'location': 'A-01', 'quantity': 20}]})
    pid = d(r)['id']
    cust = d(call('POST', '/customers', ad, {'documentType': 'CC', 'document': '7' + sfx, 'personType': 'natural', 'name': 'Cliente Abonos'}))['id']
    stock_id = items_of(call('GET', f'/stock?productId={pid}&warehouseId={wa}', ad))[0].get('stockId')
    rid = d(call('POST', '/roles', ad, {'code': 'VP' + sfx, 'name': 'Vendedor'}))['id']
    perms = perm_ids(ad, {'orders': None, 'payments': ['view', 'edit'], 'transfers': None})
    r = call('POST', '/employees', ad, {'roleId': rid, 'warehouseId': wb, 'email': f'p{sfx}@e2e.com', 'password': 'Emp12345678', 'firstName': 'Pedro', 'lastName': 'Vende', 'documentType': 'CC', 'document': '6' + sfx, 'initialPermissions': perms})
    emp = d(r)['id']
    et = tok(call('POST', '/auth/login', body={'email': f'p{sfx}@e2e.com', 'password': 'Emp12345678', 'actorType': 'employee'}))

    print('== Miniaturas')
    r = call('GET', f'/products/thumbnails?ids={pid}', ad)
    check('thumbnails responde 200', r[0] == 200, r)
    r = call('GET', '/products/thumbnails?ids=abc', ad)
    check('thumbnails con ids invalidos no revienta (200 o 400)', r[0] in (200, 400), r)
    r = call('GET', f'/products/thumbnails?ids={pid}')
    check('thumbnails sin sesion 401', r[0] == 401, r)

    print('== Rechazar y reabrir abonos')
    r = call('POST', '/sales', ad, {'salespersonEmployeeId': emp, 'customerId': cust, 'warehouseId': wa, 'paymentMethod': 'transfer', 'paymentReference': 'REF-P-1', 'items': [{'stockId': stock_id, 'quantity': 2}]})
    check('crear venta', r[0] in (200, 201), r)
    sid = d(r)['id']
    pay = items_of(call('GET', f'/payments?saleId={sid}', ad))[0]['id']
    r = call('POST', f'/payments/{pay}/reject', et, {'reason': 'corto'})
    check('rechazar con motivo corto -> 400', r[0] == 400, r)
    r = call('POST', f'/payments/{pay}/reject', et, {})
    check('rechazar sin motivo -> 400', r[0] == 400, r)
    r = call('POST', f'/payments/{pay}/reopen', et, {})
    check('reabrir un pago en revision -> 400', r[0] == 400, r)
    r = call('POST', f'/payments/{pay}/reject', et, {'reason': 'El comprobante no coincide con el valor'})
    check('rechazar en revision -> 200', r[0] == 200, r)
    st = (d(call('GET', f'/payments/{pay}', ad)) or {}).get('status')
    check('queda en issue (rechazado)', st == 'issue', st)
    r = call('POST', f'/payments/{pay}/reject', et, {'reason': 'Intento de rechazar dos veces'})
    check('rechazar uno ya rechazado -> 400', r[0] == 400, r)
    r = call('POST', f'/payments/{pay}/reopen', et, {})
    check('reabrir rechazado -> 200', r[0] == 200, r)
    st = (d(call('GET', f'/payments/{pay}', ad)) or {}).get('status')
    check('vuelve a review (en revision)', st == 'review', st)
    r = call('GET', '/audit-logs?entity=payments&pageSize=10', sa, company=cid)
    txt = json.dumps(r[1])
    check('auditoria con PAYMENT_REJECTED y PAYMENT_REOPENED', 'PAYMENT_REJECTED' in txt and 'PAYMENT_REOPENED' in txt, txt[:200])
    other = tok(call('POST', '/auth/login', body={'email': 'admin.online@importadora.com', 'password': '123456', 'actorType': 'admin'}))
    if other:
        r = call('POST', f'/payments/{pay}/reject', other, {'reason': 'Intento desde otra compania ajena'})
        check('otra compania no rechaza el pago', r[0] in (403, 404), r)

    print('== Regla de destino en traslados')
    body = lambda o, dst: {'originWarehouseId': o, 'destinationWarehouseId': dst, 'items': [{'productId': pid, 'originStockId': stock_id, 'quantity': 1}]}
    r = call('POST', '/transfers', et, body(wb, wa))
    check('empleado de B pide traslado con destino A (otra sede) -> 403', r[0] == 403 and 'FORBIDDEN_TRANSFER_DESTINATION' in json.dumps(r[1]), r)
    r = call('POST', '/transfers', et, body(wa, wb))
    check('empleado de B pide traslado hacia su sede -> creado', r[0] in (200, 201), r)
    r = call('POST', '/transfers', ad, body(wa, wb))
    check('administrador mueve entre dos bodegas cualquiera', r[0] in (200, 201), r)

    print(f'\nRESULTADO abonos/traslados: {e2e.ok_count} ok, {e2e.fail_count} fallas (compania {cid})')


if __name__ == '__main__':
    main()
