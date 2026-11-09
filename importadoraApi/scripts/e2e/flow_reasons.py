# flow_reasons.py · toda acción que inactiva, elimina, anula o cancela pide un motivo de 10 a 100 caracteres (sin motivo, o con uno corto, se rechaza; con uno válido se acepta)
import json
import time
from e2e import call, check, d
import e2e
from e2e_flow_lib import tok, items_of, perm_ids

SHORT = 'corto'
OK_REASON = 'Motivo valido para dejar constancia'


def rejected(r):
    return r[0] == 400


def main():
    sfx = str(int(time.time()))[-6:]
    sa = tok(call('POST', '/auth/login', body={'email': 'superadmin1@importadora.com', 'password': '123456', 'actorType': 'superadmin'}))
    cid = d(call('POST', '/companies', sa, {'name': 'Compania Motivos E2E ' + sfx, 'city': 'Cali'}))['id']
    email = f'admm{sfx}@e2e.com'
    call('POST', '/admins', sa, {'companyId': cid, 'email': email, 'password': 'Admin12345', 'firstName': 'Mora', 'lastName': 'Motivos'})
    ad = tok(call('POST', '/auth/login', body={'email': email, 'password': 'Admin12345', 'actorType': 'admin'}))

    def deactivate(label, path, body):
        check(f'{label}: inactivar sin motivo -> 400', rejected(call('PUT', path, ad, body)))
        check(f'{label}: inactivar con motivo corto -> 400', rejected(call('PUT', path, ad, {**body, 'reason': SHORT})))
        r = call('PUT', path, ad, {**body, 'reason': OK_REASON})
        check(f'{label}: inactivar con motivo valido -> 200', r[0] == 200, r)

    def delete(label, path):
        check(f'{label}: eliminar sin motivo -> 400', rejected(call('DELETE', path, ad, {})))
        check(f'{label}: eliminar con motivo corto -> 400', rejected(call('DELETE', path, ad, {'reason': SHORT})))
        r = call('DELETE', path, ad, {'reason': OK_REASON})
        check(f'{label}: eliminar con motivo valido -> 200', r[0] in (200, 204), r)

    print('== Catálogo')
    brand = d(call('POST', '/brands', ad, {'name': 'Marca ' + sfx}))['id']
    deactivate('marca', f'/brands/{brand}', {'isActive': False})
    brand2 = d(call('POST', '/brands', ad, {'name': 'Marca B ' + sfx}))['id']
    delete('marca', f'/brands/{brand2}')
    model = d(call('POST', '/models', ad, {'name': 'Modelo ' + sfx, 'brandId': brand2 if False else d(call('POST', '/brands', ad, {'name': 'Marca C ' + sfx}))['id']}))['id']
    deactivate('modelo', f'/models/{model}', {'isActive': False})
    cat = d(call('POST', '/categories', ad, {'name': 'Categoria ' + sfx}))['id']
    deactivate('categoria', f'/categories/{cat}', {'isActive': False})
    cat2 = d(call('POST', '/categories', ad, {'name': 'Categoria B ' + sfx}))['id']
    delete('categoria', f'/categories/{cat2}')

    print('== Terceros')
    sup = d(call('POST', '/externals', ad, {'kind': 'supplier', 'name': 'Proveedor ' + sfx, 'documentType': 'NIT', 'document': '900' + sfx}))['id']
    deactivate('proveedor', f'/externals/{sup}', {'isActive': False})
    car = d(call('POST', '/externals', ad, {'kind': 'carrier', 'name': 'Transportadora ' + sfx, 'documentType': 'NIT', 'document': '901' + sfx}))['id']
    delete('transportadora', f'/externals/{car}')
    cus = d(call('POST', '/customers', ad, {'documentType': 'CC', 'document': '7' + sfx, 'personType': 'natural', 'name': 'Cliente ' + sfx}))['id']
    deactivate('cliente', f'/customers/{cus}', {'status': 'inactive'})
    cus2 = d(call('POST', '/customers', ad, {'documentType': 'CC', 'document': '8' + sfx, 'personType': 'natural', 'name': 'Cliente B ' + sfx}))['id']
    delete('cliente', f'/customers/{cus2}')

    print('== Direcciones del cliente (quitar una pide motivo)')
    two = [{'address': 'Calle 1 # 1-1', 'city': 'Cali'}, {'address': 'Calle 2 # 2-2', 'city': 'Cali'}]
    check('agregar direcciones no pide motivo', call('PUT', f'/customers/{cus}', ad, {'addresses': two})[0] == 200)
    check('quitar una direccion sin motivo -> 400', rejected(call('PUT', f'/customers/{cus}', ad, {'addresses': two[:1]})))
    check('quitar una direccion con motivo valido -> 200', call('PUT', f'/customers/{cus}', ad, {'addresses': two[:1], 'reason': OK_REASON})[0] == 200)

    print('== Bodegas y empleados')
    wh = d(call('POST', '/warehouses', ad, {'code': 'MA' + sfx, 'name': 'Bodega A', 'city': 'Cali', 'address': 'Calle 1'}))['id']
    wh2 = d(call('POST', '/warehouses', ad, {'code': 'MB' + sfx, 'name': 'Bodega B', 'city': 'Cali', 'address': 'Calle 2'}))['id']
    deactivate('bodega', f'/warehouses/{wh2}', {'isActive': False})
    delete('bodega', f'/warehouses/{wh}')
    wh3 = d(call('POST', '/warehouses', ad, {'code': 'MC' + sfx, 'name': 'Bodega C', 'city': 'Cali', 'address': 'Calle 3'}))['id']
    call('POST', f'/warehouses/{wh3}/locations', ad, {'code': 'A-01'})
    rid = d(call('POST', '/roles', ad, {'code': 'MR' + sfx, 'name': 'Rol'}))['id']
    emp = d(call('POST', '/employees', ad, {'roleId': rid, 'warehouseId': wh3, 'email': f'e{sfx}@e2e.com', 'password': 'Emp12345678', 'firstName': 'Eva', 'lastName': 'M', 'documentType': 'CC', 'document': '5' + sfx}))['id']
    deactivate('empleado', f'/employees/{emp}', {'status': 'inactive'})
    emp2 = d(call('POST', '/employees', ad, {'roleId': rid, 'warehouseId': wh3, 'email': f'f{sfx}@e2e.com', 'password': 'Emp12345678', 'firstName': 'Fer', 'lastName': 'M', 'documentType': 'CC', 'document': '6' + sfx}))['id']
    delete('empleado', f'/employees/{emp2}')

    print('== Anular o cancelar')
    cat3 = d(call('POST', '/categories', ad, {'name': 'General ' + sfx}))['id']
    prod = d(call('POST', '/products', ad, {'categoryId': cat3, 'code': 'MP' + sfx, 'name': 'PRODUCTO', 'unit': 'UND', 'iva': 19, 'prices': {'p1': 1000, 'p2': 900, 'p3': 800, 'p4': 700},
                                            'initialStock': [{'warehouseId': wh3, 'location': 'A-01', 'quantity': 20}]}))['id']
    # orden de compra
    sp = d(call('POST', '/externals', ad, {'kind': 'supplier', 'name': 'Prov Compras ' + sfx, 'documentType': 'NIT', 'document': '902' + sfx}))['id']
    call('PUT', f'/purchases/suppliers/{sp}/products', ad, {'productId': prod, 'cost': 500, 'supplierCode': 'A'})
    r = call('POST', '/purchases', ad, {'supplierId': sp, 'warehouseId': wh3, 'items': [{'productId': prod, 'quantity': 2, 'unitCost': 500, 'ivaPercent': 19}]})
    check('crear la orden de compra', r[0] in (200, 201), r)
    po = d(r)['id']
    check('orden de compra: anular sin motivo -> 400', rejected(call('POST', f'/purchases/{po}/void', ad, {})))
    check('orden de compra: anular con motivo corto -> 400', rejected(call('POST', f'/purchases/{po}/void', ad, {'reason': SHORT})))
    check('orden de compra: anular con motivo valido -> 200', call('POST', f'/purchases/{po}/void', ad, {'reason': OK_REASON})[0] in (200, 204))
    # traslado
    stock = items_of(call('GET', f'/stock?productId={prod}&warehouseId={wh3}', ad))[0]
    wh4 = d(call('POST', '/warehouses', ad, {'code': 'MD' + sfx, 'name': 'Bodega D', 'city': 'Cali', 'address': 'Calle 4'}))['id']
    tr = d(call('POST', '/transfers', ad, {'originWarehouseId': wh3, 'destinationWarehouseId': wh4, 'items': [{'productId': prod, 'originStockId': stock['stockId'], 'quantity': 1}]}))['id']
    check('traslado: cancelar sin motivo -> 400', rejected(call('POST', f'/transfers/{tr}/cancel', ad, {})))
    check('traslado: cancelar con motivo corto -> 400', rejected(call('POST', f'/transfers/{tr}/cancel', ad, {'reason': SHORT})))
    check('traslado: cancelar con motivo valido -> 200', call('POST', f'/transfers/{tr}/cancel', ad, {'reason': OK_REASON})[0] in (200, 204))
    # pedido y su pago
    cust = d(call('POST', '/customers', ad, {'documentType': 'CC', 'document': '4' + sfx, 'personType': 'natural', 'name': 'Cliente Venta'}))['id']
    emp3 = d(call('POST', '/employees', ad, {'roleId': rid, 'warehouseId': wh3, 'email': f'g{sfx}@e2e.com', 'password': 'Emp12345678', 'firstName': 'Gus', 'lastName': 'V', 'documentType': 'CC', 'document': '3' + sfx, 'initialPermissions': perm_ids(ad, {'orders': None, 'payments': ['view', 'edit']})}))['id']
    st = items_of(call('GET', f'/stock?productId={prod}&warehouseId={wh3}', ad))[0]['stockId']
    sale = d(call('POST', '/sales', ad, {'salespersonEmployeeId': emp3, 'customerId': cust, 'warehouseId': wh3, 'paymentMethod': 'transfer', 'paymentReference': 'REF-M', 'items': [{'stockId': st, 'quantity': 1}]}))['id']
    pay = items_of(call('GET', f'/payments?saleId={sale}', ad))[0]['id']
    check('pago: anular sin motivo -> 400', rejected(call('POST', f'/payments/{pay}/void', ad, {})))
    check('pago: anular con motivo corto -> 400', rejected(call('POST', f'/payments/{pay}/void', ad, {'voidReason': SHORT})))
    check('pedido: cancelar sin motivo -> 400', rejected(call('POST', f'/sales/{sale}/cancel', ad, {})))
    check('pedido: cancelar con motivo corto -> 400', rejected(call('POST', f'/sales/{sale}/cancel', ad, {'reason': SHORT})))

    print('== Restaurar desde la papelera (solo superadmin)')
    cus3 = d(call('POST', '/customers', ad, {'documentType': 'CC', 'document': '9' + sfx, 'personType': 'natural', 'name': 'Cliente Papelera ' + sfx}))['id']
    call('DELETE', f'/customers/{cus3}', ad, {'reason': OK_REASON})
    bin_items = items_of(call('GET', '/recycle-bin?pageSize=50', sa, company=cid))
    item = next((x for x in bin_items if x.get('entityId') == cus3 or 'Papelera' in json.dumps(x)), None)
    check('el cliente eliminado esta en la papelera', bool(item), bin_items[:1])
    if item:
        check('restaurar sin motivo -> 400', rejected(call('POST', f"/recycle-bin/{item['id']}/restore", sa, {}, company=cid)))
        check('restaurar con motivo corto -> 400', rejected(call('POST', f"/recycle-bin/{item['id']}/restore", sa, {'reason': SHORT}, company=cid)))
        check('restaurar con motivo valido -> 200', call('POST', f"/recycle-bin/{item['id']}/restore", sa, {'reason': OK_REASON}, company=cid)[0] in (200, 204))

    print(f'RESULTADO motivos: {e2e.ok_count} ok, {e2e.fail_count} fallas (compania {cid})')


main()
