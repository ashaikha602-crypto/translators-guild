"""Item-by-item record as a separate appendix document (members/*.json -> word/member_record_content.js)."""
import json, re, os, sys
sys.argv = ['x']
B = '/tmp/claude-0/-home-user-translators-guild/7d117e07-7e64-5e6c-8e91-83d6b6c25330/scratchpad/'
M = B + 'members/'
src = open(M + 'build_members.py').read()
ns = {}
# reuse clean(), srcname(), STAT from the member builder without running its build steps
head = src.split("def tables(")[0]
head = head.replace("base = open(M + 'contrib_base.js').read()", "base = ''")
exec(head, ns)
clean, srcname, STAT = ns['clean'], ns['srcname'], ns['STAT']

def load(*names):
    out = []
    for n in names: out += json.load(open(M + n))
    return out

MEMBERS = [('A', 'Loulwah Bin Saeed', ['loulwah.json'], ''),
           ('B', 'Masooma Almesri', ['masooma.json'], ''),
           ('C', 'Samiuallah Mohammad', ['samiuallah_1.json', 'samiuallah_2.json'], ''),
           ('D', 'Shaikhah Alkhaledi: course slides, terminology class notes and framework proposals', ['shaikhah_1.json', 'shaikhah_2.json'], '')]
out = ["['h1', 'How to read this appendix'],",
       "['p', 'This appendix is the full record behind the Contributions Report. For each member, every source document is listed with its specific content, what happened to each item in the handbook, where it can be found, and why anything was left out. Use the contents page to go to a member or a document.'],",
       "['ul', ['**Used as written**: kept almost unchanged.', '**Used and edited**: kept but rewritten, shortened, merged or corrected.', '**Not used**: not in the handbook, with the reason.']],"]
for letter, name, files, _ in MEMBERS:
    blocks = load(*files)
    out.append("['h1', %s]," % json.dumps('%s. %s' % (letter, name), ensure_ascii=False))
    k = 1
    for b in blocks:
        title = clean(srcname(b['source'], 'Course slides: ' if files[0] == 'shaikhah_1.json' and b in load('shaikhah_1.json') else ''))
        out.append("['h2', %s]," % json.dumps('%s%d %s' % (letter, k, title), ensure_ascii=False)); k += 1
        c = [sum(1 for r in b['rows'] if r['status'] == s) for s in STAT]
        out.append("['p', %s]," % json.dumps('%d items: %d used as written, %d used and edited, %d not used.' % (len(b['rows']), *c), ensure_ascii=False))
        data = [[clean(r['item']), r['status'], clean(r['where']) if r['where'] != '—' else '—', clean(r['note'])] for r in b['rows']]
        out.append("['table', %s, %s, [36, 14, 17, 33]]," % (json.dumps(['Item', 'Status', 'Where in the handbook', 'Note'], ensure_ascii=False), json.dumps(data, ensure_ascii=False)))
s = "module.exports = [\n" + '\n'.join(out) + "\n];\n"
for bad in [r'\bAI\b', r'Claude', r'Anthropic', r'artificial', r'\beditor\b', r'Yusuf']:
    if re.search(bad, s): print('LEFTOVER', bad)
open(B + 'word/member_record_content.js', 'w').write(s)
print('written', len(s))
