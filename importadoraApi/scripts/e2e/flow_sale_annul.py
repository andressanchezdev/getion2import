import json, time
from e2e import call, check, d
import e2e
from e2e_flow_lib import tok, items_of, perm_ids


def main():
    sfx = str(int(time.time()))[-6:]
    r = call('POST', '/auth/login', body={'email': 'superadmin1@importadora.com', 'password': '123456', 'actorType': 'superadmin'})
    sa = tok(r)
    r = call('POST', '/companies', sa, {'name': 'Compania Ventas E2E ' + sfx, 'city': 'Cali'})
    cid = d(r)['id']
    email = f'adminv{sfx}@e2e.com'
    call('POST', '/admins', sa, {'companyId': cid, 'email': email, 'password': 'Admin12345', 'firstName': 'Vera', 'lastName': 'Ventas'})
    r = call('POST', '/auth/login', body={'email': email, 'password': 'Admin12345', 'actorType': 'admin'})
    ad = tok(r)
    check('admin de la compania de ventas entra', bool(ad), r)

    r = call('POST', '/warehouses', ad, {'code': 'BV' + sfx, 'name': 'Bodega Ventas', 'city': 'Cali'})
    wid = d(r)['id']
    r = call('POST', f'/warehouses/{wid}/locations', ad, {'code': 'A-01'})
    check('crear ubicacion', r[0] in (200, 201), r)
    r = call('POST', '/categories', ad, {'name': 'General'})
    cat = d(r)['id']
    r = call('POST', '/products', ad, {'categoryId': cat, 'code': 'PV' + sfx, 'name': 'FILTRO ACEITE', 'unit': 'UND', 'iva': 19,
                                       'prices': {'p1': 10000, 'p2': 9000, 'p3': 8000, 'p4': 7000},
                                       'initialStock': [{'warehouseId': wid, 'location': 'A-01', 'quantity': 20}]})
    check('producto con stock inicial', r[0] in (200, 201), r)
    pid = d(r)['id']
    r = call('POST', '/customers', ad, {'documentType': 'CC', 'document': '5' + sfx, 'personType': 'natural', 'name': 'Cliente Ventas'})
    check('cliente', r[0] in (200, 201), r)
    cust = d(r)['id']

    r = call('GET', f'/stock?productId={pid}&warehouseId={wid}', ad)
    its = items_of(r)
    print('   stock:', r[0], json.dumps(its)[:250])
    if not its:
        print('ABORTA: sin stock'); return
    stock_id = its[0].get('stockId')

    r = call('POST', '/roles', ad, {'code': 'VEN' + sfx, 'name': 'Vendedor'})
    rid = d(r)['id']
    r = call('POST', '/employees', ad, {'roleId': rid, 'warehouseId': wid, 'email': f'v{sfx}@e2e.com', 'password': 'Emp12345678', 'firstName': 'Pedro', 'lastName': 'Vende', 'documentType': 'CC', 'document': '4' + sfx, 'initialPermissions': perm_ids(ad, {'orders': None, 'payments': ['view', 'edit']})})
    check('vendedor', r[0] in (200, 201), r)
    emp = d(r)['id']
    r = call('POST', '/sales', ad, {'salespersonEmployeeId': emp, 'customerId': cust, 'warehouseId': wid, 'paymentMethod': 'transfer', 'paymentReference': 'REF-E2E-001', 'items': [{'stockId': stock_id, 'quantity': 3}]})
    check('crear venta', r[0] in (200, 201), r)
    sale = d(r)
    sid = sale['id']
    print('   venta', sid, 'estado', sale.get('stage') or sale.get('status'))
    qty_after_sale = None
    r = call('POST', '/auth/login', body={'email': f'v{sfx}@e2e.com', 'password': 'Emp12345678', 'actorType': 'employee'})
    et = tok(r)
    check('vendedor inicia sesion', bool(et), r)
    for step in ['verify', 'pick', 'pack', 'invoice']:
        if step == 'pick':
            r = call('GET', f'/payments?saleId={sid}', ad)
            pays = items_of(r)
            print('   pagos:', r[0], json.dumps(pays)[:260])
            if pays:
                r = call('POST', f"/payments/{pays[0]['id']}/verify", ad, {})
                check('admin sin empleado ligado NO verifica pagos (400 claro)', r[0] == 400 and 'ACTOR_WITHOUT_EMPLOYEE' in json.dumps(r[1]), r)
                r = call('POST', f"/payments/{pays[0]['id']}/verify", et, {})
                check('el vendedor confirma el pago', r[0] in (200, 204), r)
        r = call('POST', f'/sales/{sid}/{step}', et, {})
        check(f'avanzar {step}', r[0] in (200, 201), r)
        if r[0] not in (200, 201):
            break
    r = call('GET', f'/sales/{sid}', ad)
    sale = d(r) or {}
    inv_id = sale.get('invoiceId') or (sale.get('invoice') or {}).get('id')
    print('   factura:', inv_id, json.dumps(sale)[:200])
    if not inv_id:
        r = call('GET', '/invoices?pageSize=5', ad)
        its = items_of(r)
        inv_id = its[0]['id'] if its else None
    check('la factura quedo emitida', bool(inv_id))
    if not inv_id:
        return

    r = call('GET', f'/invoices/{inv_id}', ad)
    inv = d(r) or {}
    print('   estado factura antes:', inv.get('status'), 'numero', inv.get('number') or inv.get('invoiceNumber'))

    print('== Anulacion real')
    r = call('POST', f'/invoices/{inv_id}/annul', ad, {'reason': 'corto'})
    check('motivo corto rechazado', r[0] == 400, r)
    r = call('POST', f'/invoices/{inv_id}/annul', ad, {})
    check('sin motivo rechazado', r[0] == 400, r)
    r = call('POST', f'/invoices/{inv_id}/annul', ad, {'reason': 'Error en el valor facturado al cliente'})
    check('anular factura emitida', r[0] in (200, 204), r)
    r = call('GET', f'/invoices/{inv_id}', ad)
    check('estado queda annulled', (d(r) or {}).get('status') == 'annulled', r)
    r = call('POST', f'/invoices/{inv_id}/annul', ad, {'reason': 'Intento de anular por segunda vez'})
    check('segunda anulacion rechazada', r[0] == 409, r)
    r = call('GET', f'/audit-logs?entity=invoices&pageSize=5', sa, company=cid)
    print('   auditoria:', r[0], json.dumps(items_of(r)[:1])[:300])
    check('auditoria registra INVOICE_ANNULLED', 'INVOICE_ANNULLED' in json.dumps(r[1]), r)

    # otro admin de otra compania no puede tocarla
    r = call('POST', '/auth/login', body={'email': 'admin.online@importadora.com', 'password': '123456', 'actorType': 'admin'})
    other = tok(r)
    if other:
        r = call('GET', f'/invoices/{inv_id}', other)
        check('admin de la compania 1 no ve la factura de esta', r[0] in (403, 404), r)
        r = call('POST', f'/invoices/{inv_id}/annul', other, {'reason': 'Intento desde otra compania ajena'})
        check('admin de la compania 1 no anula la factura', r[0] in (403, 404), r)
    else:
        print('   (no se pudo iniciar sesion con admin1 de la compania 1)', r[0])

    print(f'\nRESULTADO ventas: {e2e.ok_count} ok, {e2e.fail_count} fallas (compania {cid})')


main()
