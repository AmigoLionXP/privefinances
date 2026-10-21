import sqlite3, pathlib, zipfile, io, subprocess, base64, xml.etree.ElementTree as ET
root=pathlib.Path(__file__).resolve().parents[1]
c=sqlite3.connect(':memory:')
for migration in sorted((root/'migrations').glob('*.sql')):c.executescript(migration.read_text())
assert c.execute('pragma foreign_keys').fetchone()[0]==1
assert c.execute('select count(*) from rulesets').fetchone()[0]==2
assert c.execute("select count(*) from rulesets where status='approved'").fetchone()[0]==0
script="import {workbook} from './public/xlsx.mjs'; const b=workbook([['Supplier','CHF'],['=HYPERLINK(\"evil\")',12.50],['A & <B>',0]]); console.log(Buffer.from(await b.arrayBuffer()).toString('base64'));"
r=subprocess.run(['node','--input-type=module','-e',script],cwd=root,text=True,capture_output=True,check=True)
with zipfile.ZipFile(io.BytesIO(base64.b64decode(r.stdout))) as z:
    assert z.testzip() is None
    for n in z.namelist(): ET.fromstring(z.read(n))
    s=z.read('xl/worksheets/sheet1.xml').decode()
    assert '<f>' not in s and 'inlineStr' in s and '&amp;' in s
print('SQLite migrations, relational constraints and XLSX archive/XML: OK')

if (root/'drizzle').exists():
    production=sqlite3.connect(':memory:')
    production.execute('PRAGMA foreign_keys=ON')
    for migration in sorted((root/'drizzle').glob('*.sql')):production.executescript(migration.read_text())
    for (name,) in c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"):
        test_columns={r[1]:r[2].upper() for r in c.execute(f'PRAGMA table_info({name})')}
        prod_columns={r[1]:r[2].upper() for r in production.execute(f'PRAGMA table_info({name})')}
        assert test_columns==prod_columns,(name,test_columns,prod_columns)
    print('Production Drizzle schema and core fixture columns match')
