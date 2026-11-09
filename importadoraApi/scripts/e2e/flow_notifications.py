"""Notificaciones: solo las reciben empleados y administradores de su compañía; el superadmin no.

Recorre: el superadmin recibe 403; un registro borrado y restaurado por el superadmin notifica SOLO a los administradores de esa compañía
(no a sus empleados ni a otra compañía); cada persona ve y marca únicamente lo suyo.
"""
import time

import e2e
from e2e import call, check, d
from e2e_flow_lib import tok, items_of


def titles(r):
    return [n.get('title') for n in items_of(r)]


def main():
    sfx = str(int(time.time()))[-6:]
    sa = tok(call('POST', '/auth/login', body={'email': 'superadmin1@importadora.com', 'password': '123456', 'actorType': 'superadmin'}))

    print('== El superadmin no recibe notificaciones')
    r = call('GET', '/notifications', sa)
    check('superadmin NO lista notificaciones (403)', r[0] == 403, r)
    r = call('POST', '/notifications/1/read', sa, {})
    check('superadmin NO marca una como leída (403, no 500)', r[0] == 403, r)
    r = call('POST', '/notifications/read-all', sa, {})
    check('superadmin NO marca todas (403, no 500)', r[0] == 403, r)
    r = call('GET', '/notifications')
    check('sin sesión (401)', r[0] == 401, r)

    print('== Dos compañías, cada una con su admin y su empleado')
    people = {}
    for tag in ('A', 'B'):
        r = call('POST', '/companies', sa, {'name': f'Compania Notif {tag} {sfx}'})
        cid = d(r)['id']
        mail = f'admin{tag.lower()}{sfx}@e2e.com'
        call('POST', '/admins', sa, {'companyId': cid, 'email': mail, 'password': 'Admin12345', 'firstName': 'Admin' + tag})
        ad = tok(call('POST', '/auth/login', body={'email': mail, 'password': 'Admin12345', 'actorType': 'admin'}))
        wid = d(call('POST', '/warehouses', ad, {'code': f'N{tag}{sfx}', 'name': 'Bodega ' + tag}))['id']
        rid = d(call('POST', '/roles', ad, {'code': f'R{tag}{sfx}', 'name': 'Rol ' + tag}))['id']
        emp_mail = f'emp{tag.lower()}{sfx}@e2e.com'
        call('POST', '/employees', ad, {'roleId': rid, 'warehouseId': wid, 'email': emp_mail, 'password': 'Emp12345678', 'firstName': 'Emp' + tag, 'documentType': 'CC', 'document': ('1' if tag == 'A' else '2') + sfx})
        et = tok(call('POST', '/auth/login', body={'email': emp_mail, 'password': 'Emp12345678', 'actorType': 'employee'}))
        people[tag] = {'cid': cid, 'admin': ad, 'emp': et}
        check(f'compania {tag}: admin y empleado inician sesión', bool(ad and et))

    A, B = people['A'], people['B']
    for who, token in (('admin A', A['admin']), ('empleado A', A['emp'])):
        r = call('GET', '/notifications', token)
        check(f'{who} puede listar (200)', r[0] == 200, r)

    print('== El admin A borra un cliente y el superadmin lo restaura')
    r = call('POST', '/customers', A['admin'], {'documentType': 'CC', 'document': '6' + sfx, 'personType': 'natural', 'name': 'Cliente Notif ' + sfx})
    cust = d(r)['id']
    r = call('DELETE', f'/customers/{cust}', A['admin'], {'reason': 'Cliente duplicado en el sistema'})
    check('el admin A elimina el cliente con motivo', r[0] in (200, 204), r)
    r = call('GET', '/recycle-bin?table=customers&pageSize=50', sa, company=A['cid'])
    item = next((i for i in items_of(r) if i.get('entityId') == cust), None)
    check('el cliente aparece en la papelera', item is not None, r)
    r = call('POST', f"/recycle-bin/{item['id']}/restore", sa, {'reason': 'Se eliminó por error en la prueba'}, company=A['cid'])
    check('el superadmin restaura el registro', r[0] == 200, r)

    print('== Quién recibe el aviso de restauración')
    r = call('GET', '/notifications', A['admin'])
    mine = [n for n in items_of(r) if n.get('kind') == 'restore_record']
    check('el admin A recibe el aviso de restauración', len(mine) == 1 and not mine[0].get('readAt'), titles(r))
    r = call('GET', '/notifications', A['emp'])
    check('el empleado A NO recibe el aviso del admin', not [n for n in items_of(r) if n.get('kind') == 'restore_record'], titles(r))
    r = call('GET', '/notifications', B['admin'])
    check('el admin de OTRA compañía no recibe nada', not [n for n in items_of(r) if n.get('kind') == 'restore_record'], titles(r))

    print('== Cada quien marca solo lo suyo')
    nid = mine[0]['id']
    r = call('POST', f'/notifications/{nid}/read', A['emp'], {})
    check('el empleado A no puede marcar la del admin (sin efecto)', r[0] == 200, r)
    r = call('GET', '/notifications', A['admin'])
    check('sigue sin leer para el admin', not [n for n in items_of(r) if n['id'] == nid][0].get('readAt'), r)
    r = call('POST', f'/notifications/{nid}/read', B['admin'], {})
    r = call('GET', '/notifications', A['admin'])
    check('el admin B tampoco la marca', not [n for n in items_of(r) if n['id'] == nid][0].get('readAt'), r)
    r = call('POST', f'/notifications/{nid}/read', A['admin'], {})
    check('el admin A la marca como leída', r[0] == 200, r)
    r = call('GET', '/notifications?unread=true', A['admin'])
    check('ya no queda sin leer para el admin A', not [n for n in items_of(r) if n['id'] == nid], r)

    print(f'\nRESULTADO notificaciones: {e2e.ok_count} ok, {e2e.fail_count} fallas')


main()
