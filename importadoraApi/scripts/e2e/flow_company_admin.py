import json, time
from e2e import call, check, d
import e2e


def tok(r):
    return (d(r) or {}).get('access_token')


def items_of(r):
    x = d(r)
    if isinstance(x, list):
        return x
    if isinstance(x, dict):
        for k in ('items', 'data', 'rows'):
            if isinstance(x.get(k), list):
                return x[k]
    return []


def main():
    sfx = str(int(time.time()))[-6:]
    print('== 1. Superadmin inicia sesion')
    r = call('POST', '/auth/login', body={'email': 'superadmin1@importadora.com', 'password': '123456', 'actorType': 'superadmin'})
    sa = tok(r)
    check('login superadmin', r[0] == 200 and sa)

    print('== 2. Superadmin crea la compania')
    r = call('POST', '/companies', sa, {'name': 'Compania E2E ' + sfx, 'email': f'e2e{sfx}@test.com', 'phone': '3000000000', 'address': 'Calle 1', 'city': 'Bogota'})
    check('crear compania', r[0] in (200, 201), r)
    cid = (d(r) or {}).get('id')
    print('   company id', cid)
    if not cid:
        print('ABORTA: sin compania'); return

    print('== 3. Superadmin crea el admin de esa compania')
    email = f'admin{sfx}@e2e.com'
    r = call('POST', '/admins', sa, {'companyId': cid, 'email': email, 'password': 'Admin12345', 'firstName': 'Ana', 'lastName': 'E2E', 'documentType': 'CC', 'document': '9' + sfx})
    check('crear admin', r[0] in (200, 201), r)
    r = call('POST', '/admins', sa, {'companyId': cid, 'email': email, 'password': 'Admin12345', 'firstName': 'Dup'})
    check('admin con correo repetido se rechaza', r[0] == 409, r)
    r = call('POST', '/admins', sa, {'companyId': cid, 'email': 'x' + email, 'password': 'corta', 'firstName': 'X'})
    check('admin con clave corta se rechaza', r[0] == 400, r)

    print('== 4. El admin inicia sesion y gestiona su compania')
    r = call('POST', '/auth/login', body={'email': email, 'password': 'Admin12345', 'actorType': 'admin'})
    ad = tok(r)
    check('login admin', r[0] == 200 and ad, r)
    r = call('GET', '/auth/me', ad)
    check('me del admin', r[0] == 200, r)
    print('   me:', json.dumps(d(r))[:300])
    r = call('GET', '/companies', ad)
    ids = [c.get('id') for c in items_of(r)]
    print('   companias visibles al admin:', ids)
    check('admin solo ve su compania', r[0] == 200 and set(ids) <= {cid}, r)
    r = call('PUT', f'/companies/{cid}', ad, {'phone': '3111111111', 'city': 'Medellin'})
    check('admin edita su compania', r[0] == 200, r)
    r = call('PUT', '/companies/1', ad, {'phone': '3222222222'})
    check('admin NO edita otra compania', r[0] in (403, 404), r)
    r = call('POST', '/companies', ad, {'name': 'Intento'})
    check('admin NO crea companias', r[0] == 403, r)
    r = call('POST', '/admins', ad, {'companyId': cid, 'email': 'z' + email, 'password': 'Admin12345', 'firstName': 'Z'})
    check('admin NO crea otros admins', r[0] == 403, r)

    print('== 5. El admin monta su operacion')
    r = call('POST', '/warehouses', ad, {'code': 'B' + sfx, 'name': 'Bodega E2E', 'city': 'Bogota'})
    check('crear bodega', r[0] in (200, 201), r)
    wid = (d(r) or {}).get('id')
    r = call('POST', '/roles', ad, {'code': 'VEND' + sfx, 'name': 'Vendedor E2E'})
    check('crear rol', r[0] in (200, 201), r)
    rid = (d(r) or {}).get('id')
    r = call('POST', '/employees', ad, {'roleId': rid, 'warehouseId': wid, 'email': f'emp{sfx}@e2e.com', 'password': 'Emp12345678', 'firstName': 'Luis', 'lastName': 'Vendedor', 'documentType': 'CC', 'document': '8' + sfx})
    check('crear empleado', r[0] in (200, 201), r)
    eid = (d(r) or {}).get('id')
    r = call('POST', '/categories', ad, {'name': 'Aceites E2E'})
    check('crear categoria', r[0] in (200, 201), r)
    catid = (d(r) or {}).get('id')
    r = call('POST', '/brands', ad, {'name': 'MarcaE2E'})
    check('crear marca', r[0] in (200, 201), r)
    bid = (d(r) or {}).get('id')
    r = call('POST', '/products', ad, {'categoryId': catid, 'brandId': bid, 'code': 'P' + sfx, 'name': 'ACEITE MOTOR E2E', 'unit': 'UND', 'prices': {}})
    check('crear producto', r[0] in (200, 201), r)
    pid = (d(r) or {}).get('id')
    r = call('POST', '/customers', ad, {'documentType': 'CC', 'document': '7' + sfx, 'personType': 'natural', 'name': 'Motosur E2E'})
    check('crear cliente', r[0] in (200, 201), r)

    print('== 6. Busquedas del admin (exacta y con error de ortografia)')
    for path, q in [('/products', 'aceite'), ('/products', 'acite'), ('/customers', 'motosur'), ('/customers', 'motosor'), ('/employees', 'luis')]:
        r = call('GET', f'{path}?search={q}', ad)
        n = len(items_of(r)) if r[0] == 200 else -1
        check(f'buscar {path} "{q}" encuentra', n >= 1, (r[0], n))

    print('== 7. Aislamiento: el admin no ve datos de la compania 1')
    for path in ['/products', '/customers', '/employees', '/warehouses', '/roles']:
        r = call('GET', path + '?pageSize=200', ad)
        its = items_of(r)
        foreign = [i for i in its if i.get('companyId') not in (None, cid)]
        check(f'{path} sin datos ajenos ({len(its)} propios)', r[0] == 200 and not foreign, (r[0], len(foreign)))
    r = call('GET', '/sales/1', ad)
    check('admin NO ve venta 1 de otra compania', r[0] in (403, 404), r)
    r = call('GET', '/invoices/1', ad)
    check('admin NO ve factura 1 de otra compania', r[0] in (403, 404), r)
    r = call('POST', '/invoices/1/annul', ad, {'reason': 'intento de anular ajena ok'})
    check('admin NO anula factura de otra compania', r[0] in (403, 404), r)

    print('== 8. Motivo 10-100 al desactivar')
    r = call('DELETE', f'/warehouses/{wid}', ad)
    check('desactivar bodega sin motivo se rechaza', r[0] == 400, r)
    r = call('DELETE', f'/warehouses/{wid}', ad, {'reason': 'corto'})
    check('motivo corto se rechaza', r[0] == 400, r)
    r = call('DELETE', f'/employees/{eid}', ad, {'reason': 'Salida de la empresa por renuncia'})
    check('desactivar empleado con motivo', r[0] in (200, 204), r)
    r = call('DELETE', f'/products/{pid}', ad, {'reason': 'Producto descontinuado por el proveedor'})
    print('   (producto delete)', r[0])
    r = call('DELETE', f'/warehouses/{wid}', ad, {'reason': 'Cierre temporal de la bodega'})
    check('desactivar bodega con motivo', r[0] in (200, 204), r)

    print('== 9. Superadmin: solo lectura en carritos y vista de la compania')
    r = call('POST', '/carts', sa, {})
    check('superadmin NO escribe en carritos', r[0] == 403, r)
    r = call('GET', '/products?search=aceite', sa, company=cid)
    check('superadmin ve la compania elegida', r[0] == 200, r)

    print('== 10. Papelera')
    r = call('GET', '/recycle-bin', ad)
    check('admin ve su papelera', r[0] == 200, r)
    its = items_of(r)
    foreign = [i for i in its if i.get('companyId') not in (None, cid)]
    check('papelera sin elementos ajenos', not foreign, len(foreign))
    if its:
        r = call('POST', f"/recycle-bin/{its[0].get('id')}/restore", ad)
        check('admin NO restaura (solo superadmin)', r[0] == 403, r)

    print('== 11. Compania inactiva bloquea al admin')
    r = call('DELETE', f'/companies/{cid}', sa, {'reason': 'Prueba E2E de suspension'})
    check('superadmin desactiva la compania', r[0] in (200, 204), r)
    r = call('GET', '/warehouses', ad)
    print('   admin tras suspender compania ->', r[0], json.dumps(r[1])[:200])
    r = call('POST', '/auth/login', body={'email': email, 'password': 'Admin12345', 'actorType': 'admin'})
    print('   login admin tras suspender ->', r[0], json.dumps(r[1])[:200])

    print(f'\nRESULTADO: {e2e.ok_count} ok, {e2e.fail_count} fallas  (compania {cid}, admin {email})')


main()
