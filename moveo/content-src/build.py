"""Generates ../server/content/{exercises.json, programs/*.json} from the Python sources."""
import json
import pathlib

from exercises import EX
from programs import PROGRAMS

out = pathlib.Path(__file__).resolve().parent.parent / 'server' / 'content'
(out / 'programs').mkdir(parents=True, exist_ok=True)
for old in (out / 'programs').glob('*.json'):
    old.unlink()

ids = {e['id'] for e in EX}
assert len(ids) == len(EX), 'id esercizio duplicato'
used = set()
for p in PROGRAMS:
    for s in p['sessions']:
        for b in s['blocks']:
            for it in b['items']:
                assert it['exercise'] in ids, f"{p['id']}/{s['id']}: {it['exercise']} sconosciuto"
                used.add(it['exercise'])

(out / 'exercises.json').write_text(json.dumps(EX, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
for i, p in enumerate(PROGRAMS, 1):
    (out / 'programs' / f"{i:02d}-{p['id']}.json").write_text(json.dumps(p, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(f'{len(EX)} esercizi ({len(ids - used)} non usati nei programmi: {sorted(ids - used)}), {len(PROGRAMS)} programmi')
