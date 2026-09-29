"""Builds the item-by-item member sections of the Contributions Report from members/*.json.
Reads members/contrib_base.js (the report before item-by-item tables) and writes word/contributions_content.js."""
import json, os, re, sys
B = '/tmp/claude-0/-home-user-translators-guild/7d117e07-7e64-5e6c-8e91-83d6b6c25330/scratchpad/'
M = B + 'members/'
base = open(M + 'contrib_base.js').read()

AR = re.compile(r'[؀-ۿ][؀-ۿً-ْ\s،؛؟\-]*[؀-ۿً-ْ]|[؀-ۿ]')
def clean(t):
    t = str(t or '').strip()
    t = t.replace('{{', '').replace('}}', '')
    t = re.sub(r'\bAI and [Mm]achine [Tt]ranslation\b', 'machine translation', t)
    t = re.sub(r'\b[Mm]achine translation and AI\b', 'machine translation', t)
    t = re.sub(r'\bAI\b', 'digital tools', t)
    t = re.sub(r'\s*\(?(?:attributed to|and attributed to) Dr\.? Yusuf\)?', '', t)
    t = t.replace('Dr Yusuf', 'the author named in the plan')
    t = t.replace('the editor', 'the team').replace('The editor', 'The team')
    t = AR.sub(lambda m: '{{' + m.group(0).strip() + '}}', t)
    return t
STAT = ['Used as written', 'Used and edited', 'Not used']

def srcname(src, prefix=''):
    src = re.sub(r'\s*\((?:Shaikha Alkhaldi’s course slides)\)|\s*\[Shaikha Alkhaldi\]|\s*\(Samiuallah Mohammad\)', '', src)
    return prefix + src
def tables(sources, num_start, sec, prefix=''):
    """returns (js_text, next_number)"""
    out = []
    n = num_start
    for b in sources:
        rows = b['rows']
        out.append("['h2', %s]," % json.dumps('%d.%d %s' % (sec, n, clean(srcname(b['source'], prefix))), ensure_ascii=False)); n += 1
        data = [[clean(r['item']), r['status'], clean(r['where']) if r['where'] != '—' else '—', clean(r['note'])] for r in rows]
        out.append("['table', %s, %s, [36, 14, 17, 33]]," % (json.dumps(['Item', 'Status', 'Where in the handbook', 'Note'], ensure_ascii=False), json.dumps(data, ensure_ascii=False)))
    return '\n'.join(out) + '\n', n

def pfx(b):
    return b.get('_prefix', '')
def summary(sources, sec, n):
    data = []
    tot = [0, 0, 0, 0]
    for b in sources:
        c = [sum(1 for r in b['rows'] if r['status'] == s) for s in STAT]
        data.append([clean(srcname(b['source'], pfx(b))), str(sum(c))] + [str(x) for x in c])
        tot = [tot[0] + sum(c)] + [tot[i + 1] + c[i] for i in range(3)]
    data.append(['**Total**', '**%d**' % tot[0]] + ['**%d**' % x for x in tot[1:]])
    js = "['h2', %s],\n" % json.dumps('%d.%d In short' % (sec, n), ensure_ascii=False)
    js += "['p', 'Every part of the material is listed below with what happened to it in the handbook. “Used as written” means kept almost unchanged; “Used and edited” means kept but rewritten, shortened, merged or corrected; “Not used” means it is not in the handbook, with the reason.'],\n"
    js += "['table', %s, %s, [46, 12, 14, 14, 14]],\n" % (json.dumps(['Source', 'Items', 'Used as written', 'Used and edited', 'Not used'], ensure_ascii=False), json.dumps(data, ensure_ascii=False))
    return js, n + 1

def load(*names):
    out = []
    for nm in names:
        p = M + nm
        if os.path.exists(p):
            out += json.load(open(p))
        else:
            print('MISSING', nm, file=sys.stderr)
    return out

def cut(s, start, end):
    i = s.index(start); j = s.index(end, i) if end else len(s)
    return s[:i], s[i:j], s[j:]

# ---- Loulwah (section 4): keep 4.2 Edited, drop 4.1 and 4.3, keep 4.4
L = load('loulwah.json')
pre, mid, post = cut(base, "['h2', '4.1 Taken into the handbook'],", "['h2', '4.2 Edited'],")
s = pre + '@@L_SUM@@\n' + post
pre, mid, post = cut(s, "['h2', '4.3 Not taken, and why'],", "['h2', '4.4 Added by Shaikha Alkhaldi to her chapters'],")
s = pre + '@@L_TAB@@\n' + post
# ---- Masooma (section 5)
Ma = load('masooma.json')
pre, mid, post = cut(s, "['h2', '5.1 Taken into the handbook'],", "['h2', '5.2 Edited'],")
s = pre + '@@M_SUM@@\n' + post
pre, mid, post = cut(s, "['h2', '5.3 Not taken, and why'],", "['h2', '5.4 Added by Shaikha Alkhaldi to her chapter'],")
s = pre + '@@M_TAB@@\n' + post
# ---- Samiuallah (section 6): keep 6.2, drop 6.1 and 6.3-6.5
Sa = load('samiuallah_1.json', 'samiuallah_2.json')
pre, mid, post = cut(s, "['h2', '6.1 The first draft: taken into the handbook'],", "['h2', '6.2 The first draft: edited'],")
s = pre + '@@S_SUM@@\n' + post
pre, mid, post = cut(s, "['h2', '6.3 The first draft: not taken, and why'],", "// ================= SHAIKHAH")
s = pre + '@@S_TAB@@\n' + post
# ---- Shaikha: append after 7.8
Sh1 = load('shaikhah_1.json'); Sh2 = load('shaikhah_2.json')
for b in Sh1: b['_prefix'] = 'Course slides: '
Sh = Sh1 + Sh2
pre, mid, post = cut(s, "// ================= WHOLE BOOK", None)
s = pre + '@@SH@@\n' + mid

def numbered(s, key, summ_js, tabs_js):
    return s.replace(key, summ_js + tabs_js)

# Loulwah: 4.1 In short; 4.2 Edited (kept, renumbered by text below); 4.3.. tables; 4.x Added
js, n = summary(L, 4, 1); tabs, n2 = tables(L, 3, 4)
s = s.replace('@@L_SUM@@\n', js).replace('@@L_TAB@@\n', tabs)
s = s.replace("['h2', '4.2 Edited'],", "['h2', '4.2 What was corrected'],")
s = s.replace("['h2', '4.4 Added by Shaikha Alkhaldi to her chapters'],", "['h2', '4.%d Added by Shaikha Alkhaldi to her chapters'],\n" % n2 if False else "['h2', '4.%d Added by Shaikha Alkhaldi to her chapters']," % n2)
# Masooma
js, n = summary(Ma, 5, 1); tabs, n2 = tables(Ma, 3, 5)
s = s.replace('@@M_SUM@@\n', js).replace('@@M_TAB@@\n', tabs)
s = s.replace("['h2', '5.2 Edited'],", "['h2', '5.2 What was corrected'],")
s = s.replace("['h2', '5.4 Added by Shaikha Alkhaldi to her chapter'],", "['h2', '5.%d Added by Shaikha Alkhaldi to her chapter']," % n2)
# Samiuallah
js, n = summary(Sa, 6, 2)
tabs, n2 = tables(Sa, n, 6)
s = s.replace("['h2', '6.2 The first draft: edited'],", "['h2', '6.1 Errors in the first draft that were corrected'],")
s = s.replace('@@S_SUM@@\n', '').replace('@@S_TAB@@\n', js + tabs)
# Shaikha
js, n = summary(Sh, 7, 9)
tabs = ''
n2 = n
for b in Sh:
    t, n2 = tables([b], n2, 7, pfx(b)); tabs += t
s = s.replace('@@SH@@\n', js.replace('7.9 In short', '7.9 Her course notes and terminology class notes: in short') + tabs)
# scrub any leftover forbidden words in the whole generated file
for bad in [r'\bAI\b', r'Claude', r'Anthropic', r'artificial intelligence']:
    if re.search(bad, s):
        print('LEFTOVER', bad, [m.start() for m in re.finditer(bad, s)][:3], file=sys.stderr)
s = s.replace('(Section 6.2)', '(Section 6.1)').replace('(Section 4.1)', '(Section 4.6)')
s = s.replace('39 references', '42 references').replace('(39 entries)', '(42 entries)')
open(B + 'word/contributions_content.js', 'w').write(s)
print('written', len(s))
