"""Respaldos manuales: crear, listar, descargar y restaurar la base completa.

OJO: restaurar REEMPLAZA la base a la que apunta la API. Correr solo contra una copia desechable (E2E_BASE apuntando a una API cuya
DB_DATABASE sea una copia de pruebas, con PG_DUMP_PATH y PG_RESTORE_PATH si pg_dump no esta en el PATH).
"""
import json
import time
import urllib.request

import e2e
from e2e import call, check, d
from e2e_flow_lib import tok, items_of


def download(path, token):
    req = urllib.request.Request(e2e.BASE + path, headers={'Authorization': 'Bearer ' + token})
    with urllib.request.urlopen(req) as r:
        return r.status, r.read()


def main():
    sfx = str(int(time.time()))[-6:]
    sa = tok(call('POST', '/auth/login', body={'email': 'superadmin1@importadora.com', 'password': '123456', 'actorType': 'superadmin'}))
    check('login superadmin', bool(sa))

    print('== Solo superadmin')
    ad = tok(call('POST', '/auth/login', body={'email': 'admin.online@importadora.com', 'password': '123456', 'actorType': 'admin'}))
    r = call('GET', '/backups', ad)
    check('un admin NO ve los respaldos (403)', r[0] == 403, r)
    r = call('POST', '/backups', ad, {})
    check('un admin NO crea respaldos (403)', r[0] == 403, r)
    r = call('GET', '/backups')
    check('sin sesion (401)', r[0] == 401, r)

    print('== Crear respaldo manual')
    r = call('POST', '/backups', sa, {'note': 'Antes de la prueba ' + sfx})
    check('crear respaldo', r[0] == 201, r)
    b1 = d(r) or {}
    check('el respaldo trae id, tamano y tipo manual', b1.get('id') and b1.get('sizeBytes', 0) > 1000 and b1.get('kind') == 'manual', b1)
    r = call('POST', '/backups', sa, {'note': 'x' * 201})
    check('nota de mas de 200 caracteres se rechaza', r[0] == 400, r)

    print('== Listar')
    r = call('GET', '/backups', sa)
    its = items_of(r)
    check('la lista incluye el respaldo creado', any(i['id'] == b1.get('id') for i in its), r)
    check('el ultimo manual esta marcado', [i['id'] for i in its if i['isLatest']] == [its[0]['id']] if its else False, its[:2])

    print('== Descargar')
    st, raw = download(f"/backups/{b1['id']}/download", sa)
    check('descarga un archivo de PostgreSQL (PGDMP)', st == 200 and raw[:5] == b'PGDMP', raw[:8])
    r = call('GET', '/backups/..%2f..%2fsecreto/download', sa)
    check('un id raro no sale de la carpeta (404)', r[0] == 404, r)
    r = call('GET', '/backups/20200101-000000-manual/download', sa)
    check('id inexistente (404)', r[0] == 404, r)

    print('== Restaurar')
    r = call('POST', '/companies', sa, {'name': 'Compania Posterior ' + sfx})
    cid = (d(r) or {}).get('id')
    check('se crea una compania DESPUES del respaldo', bool(cid), r)
    r = call('POST', f"/backups/{b1['id']}/restore", sa, {})
    check('restaurar sin motivo se rechaza (400)', r[0] == 400, r)
    r = call('POST', f"/backups/{b1['id']}/restore", sa, {'reason': 'corto'})
    check('restaurar con motivo corto se rechaza (400)', r[0] == 400, r)
    r = call('POST', '/backups/20200101-000000-manual/restore', sa, {'reason': 'Volver al estado anterior de prueba'})
    check('restaurar un id inexistente (404)', r[0] == 404, r)
    r = call('POST', f"/backups/{b1['id']}/restore", sa, {'reason': 'Volver al estado anterior de prueba'})
    check('restaurar con motivo valido', r[0] == 200, r)
    res = d(r) or {}
    check('devuelve el respaldo de seguridad previo', bool(res.get('safetyBackupId')), res)

    sa = tok(call('POST', '/auth/login', body={'email': 'superadmin1@importadora.com', 'password': '123456', 'actorType': 'superadmin'}))
    check('el superadmin puede volver a entrar tras restaurar', bool(sa))
    r = call('GET', f'/companies/{cid}', sa)
    check('la compania creada despues del respaldo YA NO existe', r[0] == 404, r)
    r = call('GET', '/backups', sa)
    its = items_of(r)
    kinds = [i['kind'] for i in its]
    check('quedan el manual y el de seguridad (pre_restore)', 'manual' in kinds and 'pre_restore' in kinds, kinds)

    print('== Deshacer con el respaldo de seguridad')
    r = call('POST', f"/backups/{res['safetyBackupId']}/restore", sa, {'reason': 'Deshacer la restauracion de prueba'})
    check('restaurar el respaldo de seguridad', r[0] == 200, r)
    sa = tok(call('POST', '/auth/login', body={'email': 'superadmin1@importadora.com', 'password': '123456', 'actorType': 'superadmin'}))
    r = call('GET', f'/companies/{cid}', sa)
    check('la compania vuelve a existir (se deshizo)', r[0] == 200, r)

    print('== Auditoria')
    r = call('GET', '/audit-logs?entity=backups&pageSize=10', sa)
    txt = json.dumps(r[1])
    check('quedan BACKUP_CREATED y BACKUP_RESTORED', 'BACKUP_CREATED' in txt and 'BACKUP_RESTORED' in txt, r[0])

    print(f'\nRESULTADO respaldos: {e2e.ok_count} ok, {e2e.fail_count} fallas')


main()
