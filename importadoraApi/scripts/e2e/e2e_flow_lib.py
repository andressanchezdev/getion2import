from e2e import call, d

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


def perm_ids(token, wanted):
    # ids de los permisos pedidos: modulo -> lista de acciones (None = todas las del modulo)
    ids = []
    for p in items_of(call('GET', '/permissions', token)):
        acts = wanted.get(p.get('module'), False)
        if acts is False:
            continue
        if acts is None or p.get('action') in acts:
            ids.append(p['id'])
    return ids
