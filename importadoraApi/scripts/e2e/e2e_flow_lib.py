from e2e import d

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
