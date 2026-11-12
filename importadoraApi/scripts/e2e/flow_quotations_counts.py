# flow_quotations_counts · cotizaciones (crear, editar, cambiar estado, convertir en pedido) y conteos físicos (crear, contar, verificar, corroborar)
# uso: E2E_BASE=http://localhost:3091 python flow_quotations_counts.py (API en modo desarrollo: un evento mal grabado es un panic)
import json, time
from e2e import call, check, d
import e2e
from e2e_flow_lib import tok, items_of


def main():
    sfx = str(int(time.time()))[-6:]
    sa = tok(call('POST', '/auth/login', body={'email': 'superadmin1@importadora.com', 'password': '123456', 'actorType': 'superadmin'}))
    cid = d(call('POST', '/companies', sa, {'name': 'Compania Cotiza E2E ' + sfx, 'city': 'Cali'}))['id']
    email = f'adminq{sfx}@e2e.com'
    call('POST', '/admins', sa, {'companyId': cid, 'email': email, 'password': 'Admin12345', 'firstName': 'Quira', 'lastName': 'Cotiza'})
    ad = tok(call('POST', '/auth/login', body={'email': email, 'password': 'Admin12345', 'actorType': 'admin'}))
    check('admin de la compania entra', bool(ad))

    wid = d(call('POST', '/warehouses', ad, {'code': 'BQ' + sfx, 'name': 'Bodega Cotiza', 'city': 'Cali'}))['id']
    call('POST', f'/warehouses/{wid}/locations', ad, {'code': 'A-01'})
    cat = d(call('POST', '/categories', ad, {'name': 'General'}))['id']
    r = call('POST', '/products', ad, {'categoryId': cat, 'code': 'PQ' + sfx, 'name': 'CORREA', 'unit': 'UND', 'iva': 19,
                                       'prices': {'p1': 10000, 'p2': 9000, 'p3': 8000, 'p4': 7000},
                                       'initialStock': [{'warehouseId': wid, 'location': 'A-01', 'quantity': 20}]})
    check('producto con stock inicial', r[0] in (200, 201), r)
    pid = d(r)['id']
    cust = d(call('POST', '/customers', ad, {'documentType': 'CC', 'document': '8' + sfx, 'personType': 'natural', 'name': 'Cliente Cotiza'}))['id']
    its = items_of(call('GET', f'/stock?productId={pid}&warehouseId={wid}', ad))
    if not its:
        print('ABORTA: sin stock'); return
    stock_id = its[0].get('stockId')

    print('== Cotizaciones')
    r = call('POST', '/quotations', ad, {'customerId': cust, 'notes': 'Primera version', 'items': [{'productId': pid, 'quantity': 2, 'unitPrice': 10000}]})
    check('crear cotizacion', r[0] in (200, 201), r)
    qid = (d(r) or {}).get('id')
    if not qid:
        return
    r = call('PUT', f'/quotations/{qid}', ad, {'notes': 'Entrega el lunes'})
    check('editar notas', r[0] == 200 and (d(r) or {}).get('notes') == 'Entrega el lunes', r)
    r = call('PUT', f'/quotations/{qid}', ad, {'status': 'sent'})
    check('marcar enviada', r[0] == 200 and (d(r) or {}).get('status') == 'sent', r)
    r = call('GET', f'/quotations/{qid}', ad)
    check('queda enviada y con sus renglones', (d(r) or {}).get('status') == 'sent' and len((d(r) or {}).get('items') or []) == 1, r)

    print('== Conteos')
    r = call('POST', '/counts', ad, {'warehouseId': wid, 'notes': 'Conteo E2E'})
    check('iniciar conteo', r[0] in (200, 201), r)
    count = d(r) or {}
    count_id = count.get('id')
    check('precarga el stock de la bodega', len(count.get('items') or []) >= 1, r)
    if not count_id:
        return
    r = call('PUT', f'/counts/{count_id}/items', ad, {'items': [{'stockId': stock_id, 'countedQty': 18}]})
    check('registrar cantidad contada', r[0] in (200, 204), r)
    r = call('POST', f'/counts/{count_id}/verify', ad, {})
    check('verificar conteo', r[0] in (200, 204), r)
    r = call('POST', f'/counts/{count_id}/corroborate', ad, {})
    check('corroborar conteo', r[0] in (200, 204), r)
    r = call('GET', f'/counts/{count_id}', ad)
    check('queda corroborado', (d(r) or {}).get('status') == 'corroborated', r)
    its = items_of(call('GET', f'/stock?productId={pid}&warehouseId={wid}', ad))
    print('   stock tras el conteo:', json.dumps(its)[:200])
    check('el stock queda en lo contado (18)', bool(its) and (its[0].get('available') == 18 or its[0].get('quantity') == 18), its)
    r = call('PUT', f'/counts/{count_id}/items', ad, {'items': [{'stockId': stock_id, 'countedQty': 5}]})
    check('un conteo corroborado ya no se edita', r[0] == 400, r)

    print(f'\nRESULTADO cotizaciones y conteos: {e2e.ok_count} ok, {e2e.fail_count} fallas (compania {cid})')


main()
