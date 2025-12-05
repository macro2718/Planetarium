from astroquery.simbad import Simbad

# 返す列を最小化（RA, DEC はデフォルトで含まれる）
Simbad.reset_votable_fields()
Simbad.add_votable_fields('flux(V)')  # 視等級 V

def get_star_info(name):
    result = Simbad.query_object(name)
    if result is None:
        return None
    ra = result['ra'][0]
    dec = result['dec'][0]
    vmag = result['V'][0]
    return ra, dec, vmag

# 例：Wezen（delta CMa）
info = get_star_info("Eta Leonis")
print(info)
