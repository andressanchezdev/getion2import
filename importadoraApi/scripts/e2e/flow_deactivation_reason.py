import time
import e2e
from e2e import call, check, d
from e2e_flow_lib import tok, items_of




def main():
    sfx = str(int(time.time()))[-6:]
    sa = tok(call('POST', '/auth/login', body={'email': 'superadmin1@importadora.com', 'password': '123456', 'actorType': 'superadmin'}))
    r = call('POST', '/companies', sa, {'name': 'Compania PUT ' + sfx})
    cid = d(r)['id']
    em = f'adminput{sfx}@e2e.com'
    r = call('POST', '/admins', sa, {'companyId': cid, 'email': em, 'password': 'Admin12345', 'firstName': 'Pablo'})
    aid = d(r)['id']
    ad = tok(call('POST', '/auth/login', body={'email': em, 'password': 'Admin12345', 'actorType': 'admin'}))

    print('== Admin: desactivar por PUT exige motivo')
    r = call('PUT', f'/admins/{aid}', sa, {'isActive': False})
    check('PUT admin isActive=false sin motivo -> 400', r[0] == 400, r)
    r = call('PUT', f'/admins/{aid}', sa, {'isActive': False, 'reason': 'corto'})
    check('PUT admin con motivo corto -> 400', r[0] == 400, r)
    r = call('PUT', f'/admins/{aid}', sa, {'firstName': 'Pablo Editado'})
    check('PUT admin sin tocar estado no pide motivo', r[0] == 200, r)

    print('== Compania: desactivar por PUT exige motivo')
    r = call('PUT', f'/companies/{cid}', sa, {'isActive': False})
    check('PUT compania isActive=false sin motivo -> 400', r[0] == 400, r)
    r = call('PUT', f'/companies/{cid}', ad, {'isActive': False, 'reason': 'Intento del admin de suspenderse'})
    check('el admin no puede suspender su compania -> 403', r[0] == 403, r)

    print('== Catalogo / roles / ubicaciones / terceros')
    r = call('POST', '/categories', ad, {'name': 'Cat PUT'}); catid = d(r)['id']
    r = call('PUT', f'/categories/{catid}', ad, {'isActive': False})
    check('PUT categoria inactiva sin motivo -> 400', r[0] == 400, r)
    r = call('PUT', f'/categories/{catid}', ad, {'isActive': False, 'reason': 'Categoria ya no se usa en el catalogo'})
    check('PUT categoria inactiva con motivo -> 200', r[0] == 200, r)
    r = call('POST', '/roles', ad, {'code': 'RP' + sfx, 'name': 'Rol PUT'}); rid = d(r)['id']
    r = call('PUT', f'/roles/{rid}', ad, {'isActive': False})
    check('PUT rol inactivo sin motivo -> 400', r[0] == 400, r)
    r = call('PUT', f'/roles/{rid}', ad, {'isActive': False, 'reason': 'Rol reemplazado por uno nuevo'})
    check('PUT rol inactivo con motivo -> 200', r[0] == 200, r)
    r = call('POST', '/warehouses', ad, {'code': 'BP' + sfx, 'name': 'Bodega PUT'}); wid = d(r)['id']
    r = call('POST', f'/warehouses/{wid}/locations', ad, {'code': 'L-01'}); lid = d(r)['id']
    r = call('PUT', f'/warehouses/{wid}/locations/{lid}', ad, {'isActive': False})
    check('PUT ubicacion inactiva sin motivo -> 400', r[0] == 400, r)
    r = call('PUT', f'/warehouses/{wid}/locations/{lid}', ad, {'isActive': False, 'reason': 'Estante retirado de la bodega'})
    check('PUT ubicacion inactiva con motivo -> 200', r[0] == 200, r)
    r = call('PUT', f'/warehouses/{wid}/locations/{lid}', ad, {'isActive': True})
    check('reactivar ubicacion no pide motivo', r[0] == 200, r)

    print('== Productos: inactivar por PUT exige motivo')
    r = call('POST', '/categories', ad, {'name': 'Cat Prod ' + sfx}); pcat = d(r)['id']
    r = call('POST', '/products', ad, {'categoryId': pcat, 'code': 'PR' + sfx, 'name': 'PRODUCTO PUT', 'unit': 'UND', 'prices': {}}); pid = d(r)['id']
    r = call('PUT', f'/products/{pid}', ad, {'status': 'inactive'})
    check('PUT producto inactivo sin motivo -> 400', r[0] == 400, r)
    r = call('PUT', f'/products/{pid}', ad, {'name': 'PRODUCTO PUT EDITADO'})
    check('editar otros datos no pide motivo', r[0] == 200, r)
    r = call('PUT', f'/products/{pid}', ad, {'status': 'inactive', 'reason': 'Producto descontinuado por el proveedor'})
    check('PUT producto inactivo con motivo -> 200', r[0] == 200, r)
    r = call('PUT', f'/products/{pid}', ad, {'status': 'active'})
    check('reactivar producto no pide motivo', r[0] == 200, r)

    print('== Admin: con motivo se desactiva y pierde la sesion')
    r = call('PUT', f'/admins/{aid}', sa, {'isActive': False, 'reason': 'Salida del administrador de la empresa'})
    check('PUT admin inactivo con motivo -> 200', r[0] == 200, r)
    r = call('GET', '/warehouses', ad)
    check('sesion del admin desactivado queda revocada', r[0] == 401, r)
    r = call('POST', '/auth/login', body={'email': em, 'password': 'Admin12345', 'actorType': 'admin'})
    check('admin desactivado no puede entrar', r[0] in (401, 403), r)
    r = call('PUT', f'/admins/{aid}', sa, {'isActive': True})
    check('reactivar admin no pide motivo', r[0] == 200, r)
    r = call('POST', '/auth/login', body={'email': em, 'password': 'Admin12345', 'actorType': 'admin'})
    check('admin reactivado vuelve a entrar', r[0] == 200, r)

    r = call('PUT', f'/companies/{cid}', sa, {'isActive': False, 'reason': 'Suspension por falta de pago'})
    check('superadmin suspende compania con motivo', r[0] == 200, r)
    print(f'\nRESULTADO PUT: {e2e.ok_count} ok, {e2e.fail_count} fallas')


main()
