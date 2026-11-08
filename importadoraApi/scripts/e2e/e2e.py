import json, sys, urllib.request, urllib.error, time

import os
BASE = os.environ.get('E2E_BASE', 'http://localhost:3001')
ok_count = fail_count = 0


def call(method, path, token=None, body=None, company=None):
    h = {'Content-Type': 'application/json'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    if company:
        h['X-Company-Id'] = str(company)
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {'raw': raw}


def check(name, cond, extra=''):
    global ok_count, fail_count
    if cond:
        ok_count += 1
        print('  OK   ', name)
    else:
        fail_count += 1
        print('  FALLA', name, extra)


def d(resp):
    return (resp[1] or {}).get('data')


if __name__ == '__main__':
    st, r = call('POST', '/auth/login', body={'email': 'superadmin1@importadora.com', 'password': '123456', 'actorType': 'superadmin'})
    print(st, json.dumps(r)[:600])
