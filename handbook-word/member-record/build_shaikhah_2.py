import json
U, E, N = "Used as written", "Used and edited", "Not used"
def r(item, status, where, note):
    return {"item": item, "status": status, "where": where if status != N else "—", "note": note}

NAME = "Shaikhah Alkhaledi"
blocks = []

# ---------------------------------------------------------------- 1
blocks.append({"source": "Terminology class notes: Terminology, Week 1 [%s]" % NAME, "rows": [
 r("Discussion questions: what “terminology” brings to mind; terminology versus semantics and lexicography; examples of specialised terminologies", N, "—", "Class discussion prompts, not teaching content."),
 r("Introduction: no agreement on what terminology is; it borrowed from semantics, lexicology and lexicography", N, "—", "Theory about the field itself; too advanced for beginners."),
 r("Beginnings of modern terminology: advances in science and technology (genetics, space exploration, information science, telecommunications); contact between language communities; divergent views (standardising, technical lexicography, word lists)", N, "—", "History and theory; too advanced for beginners."),
 r("Meanings of terminology: the technical terms of an art, science or subject, and later the study of those terms", N, "—", "Chapter 21 has its own short entries for “Terminology” in Words to remember, so the history of the word was not needed."),
 r("Definition of terminology as a discipline; the four work methods (term identification, contextual analysis, term creation, standardisation)", N, "—", "Too theoretical; Chapter 21 teaches the practical steps instead."),
 r("Term identification: simple terms, complex terms (two or more words for one concept) and phrases", E, "Chapter 21, Step 1", "Only the idea that a term can be several words is kept; simple terms and phrases were left out."),
 r("Contextual analysis: finding a term’s meaning by delimiting its context and pinpointing semantic features", N, "—", "Too technical; the handbook keeps only the simple point that the context decides (Chapter 21, Step 3)."),
 r("Term creation: gaps between languages; the terminologist identifies existing terms and coins one only after all sources have been searched", N, "—", "The handbook makes the same point in its own words in Chapter 17, Step 3 and Chapter 21, Step 3."),
 r("Standardisation: research and standardisation go together; less arbitrary decisions on usage", N, "—", "Too advanced for beginners."),
]})

# ---------------------------------------------------------------- 2
blocks.append({"source": "Terminology class notes: Terminology 2, Week 2 [%s]" % NAME, "rows": [
 r("Specialised terms: each field (arts, science, business, economics, law, medicine) has its own special language; a special language holds general words and terms; terminology studies terms, not general vocabulary", N, "—", "Chapter 21 opens with its own beginner explanation of terms, using contract and medical leaflet examples."),
 r("Definitions and contexts: terminologists check current usage; situational context versus written context; semantic features", N, "—", "Too technical; Chapter 7 teaches how context decides meaning in simpler terms."),
 r("Bilingual terminology: finding enough information on the source term in context to research the target equivalent (textual correspondence)", N, "—", "Too advanced for beginners."),
 r("The user’s need for means of expression: an advertiser’s needs differ from a scientist’s; users need to know what something is called", N, "—", "Background theory; not needed at beginner level."),
 r("Terminology records: manual records replaced by computerised databases", N, "—", "Record formats are too advanced for beginners."),
 r("Terminological media: databases (multiple access, fast retrieval); vocabularies (alphabetical; source entry, target equivalent, short definition, subfield); glossaries; teaching outlines and illustrations", N, "—", "Chapter 21, Step 4 shows a simple term list instead."),
 r("Exercises: find simple terms, complex terms and phrases in a short text and set them out as a vocabulary; general language versus special languages; vocabulary versus terminology", N, "—", "Class exercises; the handbook has its own Try it questions."),
]})

# ---------------------------------------------------------------- 3
blocks.append({"source": "Terminology class notes: Term and Concept, Week 5 [%s]" % NAME, "rows": [
 r("Term and concept: the signifier (the word) and the signified (the object), linked through concepts in the mind", N, "—", "Too theoretical for beginners."),
 r("What is a term: a word or expression that designates a concept of a subject field; simple, complex or phrase", N, "—", "Chapter 21 has its own one-line entry for “Term” in Words to remember."),
 r("Simple terms: coproduce, commentator, monochrome, and why their affixes do not make them complex", N, "—", "Too technical for beginners."),
 r("Complex terms: captive audience, laughmeter, director-producer, closeup, ultrawide-angle lens, to lip sync; one concept, and removing a word changes the concept", E, "Chapter 21, Step 1", "Only the idea is kept (several words, one idea, translate as one unit), with the example network security; the television examples were not used."),
 r("Phrasal terms: request for copyright clearance, to preempt a program, filmed on location, on the air", N, "—", "Too technical for beginners."),
 r("Concept and essential characteristics: the concept watch (face and hands, tells time, worn on a wristband)", N, "—", "Too theoretical for beginners."),
 r("Specificity to subject field: general words given new meanings (street furniture, information highway)", N, "—", "Not needed at beginner level."),
 r("One term in several fields: carrier in telecommunication, transportation, insurance and medicine; strictly, a term belongs to one field", E, "Chapter 19, Step 4", "Only the idea is used (one word is a different term in each field), shown with the depression example instead of carrier."),
 r("Objects: material and immaterial; classes (entities, properties, activities, dimensions)", N, "—", "Too theoretical for beginners."),
 r("The link between term and concept is arbitrary and based on convention", N, "—", "Too theoretical for beginners."),
 r("Motivation: films library, catwalk, soap opera; motivation is useful but not necessary (blackboard can be green); desirable in new terms", E, "Chapter 21, Step 3", "Only blackboard is kept, to show that a term’s parts can mislead and the context decides."),
 r("Classification of concepts: generic and partitive relations (sampling, bicycle); causal and opposite relations (biased sampling, systematic versus unsystematic)", N, "—", "Too theoretical for beginners."),
 r("Exercise: list five motivated terms in a subject and explain why they are motivated", N, "—", "Class exercise; the handbook has its own Try it questions."),
]})

# ---------------------------------------------------------------- 4
blocks.append({"source": "Terminology class notes: Definitions in Terminology, Week 10 [%s]" % NAME, "rows": [
 r("Purpose of a terminological definition: the essential characteristics only; different from dictionary and encyclopedia definitions", N, "—", "Too theoretical for beginners."),
 r("Rules of definition: not obscure; not too broad or too narrow; able to replace the term", N, "—", "Too advanced; the handbook gives one simple rule for definitions instead."),
 r("Rules of definition: not circular (herpetologist); not negative where a positive is possible (chair; exceptions undifferentiated, achromatic)", N, "—", "Too advanced for beginners."),
 r("Definition by genus and difference: name the larger class, then what sets the concept apart (man as a rational animal)", E, "Chapter 21, Step 4", "Kept as a plain rule (name the general group, then say what makes the term different); the example is the handbook’s own, thermometer."),
 r("Other methods: partition definition, definition by description (mirror), operational definition (product), synonymous definition (bellis perennis as daisy)", N, "—", "Too advanced; one method is enough for a beginner."),
 r("Choice of method: evening dress by partition; cake by genus, parts or recipe", N, "—", "Too advanced for beginners."),
 r("Choice of defining words: nouns (techno-casualty, audiodontics), verbs (airdash, auralize), adjectives (congenial, ageist, disinformative, proactive, back-of-the-book), adverbs (hyperacutely, utopianly)", N, "—", "Grammar detail that is too advanced for beginners."),
 r("Good practice: adequacy, brevity (no longer than one sentence or phrase) and clarity", E, "Chapter 21, Step 4", "Only brevity is kept: write the definition in one sentence."),
]})

# ---------------------------------------------------------------- 5
blocks.append({"source": "Terminology class notes: Term Formation and Standardization, Week 10 [%s]" % NAME, "rows": [
 r("Introduction: terms are rarely invented from nothing; they come from new meanings, changed form or word class, and borrowing", N, "—", "Chapter 17 teaches ways to make Arabic words instead."),
 r("Term formation in different fields: classical derivation in biology, borrowing in earth sciences, little borrowing in computer science", N, "—", "Not needed at beginner level."),
 r("Features of English term formation: productive; compounds and metaphor; borrowing from Latin, Greek, French and German", N, "—", "These are about English; the handbook’s concern is Arabic."),
 r("Reasons for creating terms: innovation, changing attitudes, social change (policewoman, chairwoman, businesswoman), effective communication (telephone network)", N, "—", "Chapter 17, Step 1 gives the beginner reason for new words instead (gaps in the target language)."),
 r("Four processes of English term formation: semantic change, morphological change, conversion, borrowing", N, "—", "Too technical; Chapter 17 gives five ways to make Arabic words."),
 r("General rules of term formation: concision, linguistic accuracy, motivation, monosemy, ability to produce derivatives", N, "—", "The handbook has its own one-sentence rule for a good term in Chapter 21, Step 3."),
 r("Who forms terms: inventors, and terminologists working with specialists", N, "—", "Not needed at beginner level."),
 r("Standardisation: consensus, expert committees, synonyms in different regions, and why it is triggered", N, "—", "Too advanced; Chapter 21, Step 2 says only that the Arabic language academies create and approve terms."),
]})

# ---------------------------------------------------------------- 6
blocks.append({"source": "Terminology class notes: Subject Field Research, Week 5 [%s]" % NAME, "rows": [
 r("Introduction: subject-field research is exhaustive and slow; six preliminary stages before scanning for terms", N, "—", "Research on a whole field is too advanced; the handbook works term by term."),
 r("Stage 1, determining objectives with the client: purpose, target audience, scope (a few hundred or a few thousand concepts)", N, "—", "Chapter 2 asks three questions (client, purpose, audience) for a single translation instead."),
 r("Stage 2, estimating resources: staff, money, and documents, glossaries, bibliographic databases and term banks", N, "—", "Project planning is too advanced for beginners."),
 r("Documentary resources: original documents in the source and target languages, not translations", E, "Chapter 21, Step 3", "Kept as advice to confirm the equivalent in a text written in Arabic by specialists, not in a translation."),
 r("Stage 3, becoming familiar with the field: read a short work for beginners; introductory textbooks and encyclopedia entries", E, "Chapter 21, Step 3", "Kept as: if the field is new, read a short introduction first, such as an encyclopedia entry."),
 r("Stage 4, selecting documentation: quality over quantity; three or four works plus a specialised dictionary; six to eight in the target language", N, "—", "Too advanced for beginners."),
 r("Stage 5, locating documentation: textbooks, handbooks, national standards (CSA, ASTM), librarians and specialists", N, "—", "Too advanced for beginners."),
 r("Stage 6, evaluating documentation: table of contents, index, quality of writing, author’s credibility", N, "—", "Too advanced; Chapter 3, Step 2 asks readers to check a dictionary’s publisher instead."),
 r("Breakdown of the subject field into subfields and related fields", N, "—", "Too advanced for beginners."),
 r("Scanning for terms: each term must fit the breakdown; better to include too many at first", N, "—", "Chapter 2 asks readers to list the key terms of a text instead."),
]})

# ---------------------------------------------------------------- 7
blocks.append({"source": "Terminology class notes: Terminology, Semantics and Lexicography, Week 3 [%s]" % NAME, "rows": [
 r("Introduction: terminology is often confused with other disciplines; it is independent", N, "—", "Theory about the field itself; too advanced for beginners."),
 r("Semantics: sign and referent; the historical approach (fish from Old English fisc; later meanings flesh, a mast piece, a cold person) and the descriptive approach (polysemy, semantic range)", N, "—", "Too theoretical; Chapter 7 teaches polysemy with its own examples."),
 r("Terminology begins with context, not etymology (fish in biology)", N, "—", "Too theoretical for beginners."),
 r("How terminology relates to semantics, and how semantic change (analogy, metonymy) forms terms", N, "—", "Too theoretical for beginners."),
 r("Terminology and lexicography: the whole lexicon versus a specialised stock; concept to sign versus sign to concept; encoding versus decoding", N, "—", "Too theoretical for beginners."),
 r("Work methods compared: nomenclature, term identification, analysis, definition", N, "—", "Too advanced for beginners."),
 r("Key information media: dictionary entry versus terminology record (one concept, tied to its context, an encoding tool)", N, "—", "Record formats are too advanced for beginners."),
 r("End products: the dictionary versus a growing file of terminology records", N, "—", "Too advanced for beginners."),
 r("Exercises: study bank, charge, mouse, virus, tank and cell as lexicographer and as terminologist; compare the two methods", N, "—", "Class exercises; Chapter 7 uses other examples of words with several meanings."),
]})

# ---------------------------------------------------------------- 8
blocks.append({"source": "Terminology class notes: The Situation in Terminology, Week 3 [%s]" % NAME, "rows": [
 r("Terminology has a social function; one concept has different labels in different situations (total impacts / gross audience)", N, "—", "The advertising example was not needed; the aerial and antenna example was used instead (next item)."),
 r("One concept, two labels by place: aerial in England, antenna in the United States", E, "Chapter 21, Step 5", "Kept as an example of a concept with two accepted names; the handbook added the Arabic {{هوائي}} and a second pair, {{حاسوب}} and {{كمبيوتر}}."),
 r("The situational context comes first; the Palmer quotation on living languages; terminology cannot be built outside context", N, "—", "Too theoretical for beginners."),
 r("Situation and view of reality: each language sees the world differently, which affects equivalence", N, "—", "Too theoretical for beginners."),
 r("Comparative terminology: terms are not literal translations (whistleblower, goalkeeper, {{مجلات علمية}}); living terminology is idiomatic", N, "—", "Chapter 11 already shows that word-for-word translation often fails."),
 r("Problems of living terminology: synonyms, several meanings, obscure wording; describing usage versus choosing it", N, "—", "Too advanced for beginners."),
 r("The role of users: they help researchers; terminologists provide tools, not protection of terms", N, "—", "Too advanced for beginners."),
 r("Work methods: a real need, target audience, level of language, data gathering, signs and labels, selecting terms", N, "—", "Chapter 2 asks about client, purpose and audience for a translation instead."),
 r("Situation and standardisation: describing usage versus prescribing it; the two are complementary", N, "—", "Too advanced for beginners."),
]})

# ---------------------------------------------------------------- 9
blocks.append({"source": "Terminology class notes: Term Research, Week 5 [%s]" % NAME, "rows": [
 r("Introduction and advantages: term research answers questions on single terms; it trains novices; clients need answers in 4 to 48 hours", N, "—", "Describes the terminologist’s job, which is too advanced for beginners."),
 r("The six steps of term research (discuss with the client, check the concept, consult a specialist, research the solution, check the solution, present it)", N, "—", "Chapter 21, Step 3 has its own five-part routine for a student translator."),
 r("Discussion with the client: concept, field, situation, source term, what has been tried; be tactful", E, "Chapter 21, Step 3", "Reduced to “ask the client” when the meaning is unclear; the list of questions and the advice on tact were left out."),
 r("Checking the concept in source-language dictionaries", N, "—", "Chapter 3 teaches dictionary checks."),
 r("Consulting a specialist: confirms the concept, suggests sources, clears up discrepancies", E, "Chapter 21, Step 3", "Kept as “ask a specialist”; the specialist’s roles were not listed."),
 r("Researching the solution: analyse the concept’s characteristics; the lighthouse rotating light (beacon); bilingual term banks and glossaries; “Can you find the Arabic?”", N, "—", "Too detailed; the handbook lists its own Arabic sources in Chapter 21, Step 3."),
 r("Checking the solution in monolingual works before giving it to the client", E, "Chapter 21, Step 3", "Kept as advice to confirm the equivalent in a text written in Arabic; Chapter 3, Step 1 gives a similar check for dictionaries."),
 r("Presenting the solution: justify it, name the source and the specialist, or suggest by analogy", N, "—", "Client reporting is too advanced; the source column in the term list (Chapter 21, Step 4) lets readers record where they checked."),
 r("Why consult general works before specialised ones: quicker, an overview, but less technical detail", N, "—", "The reasons were left out; Chapter 21, Step 3 keeps only the advice to start with a short introduction."),
 r("Exercise slides (headings only in the notes)", N, "—", "No content to use; the handbook has its own Try it questions."),
]})

# ---------------------------------------------------------------- 10
blocks.append({"source": "Terminology class notes: Comparative Terminology, Week 6 [%s]" % NAME, "rows": [
 r("Introduction: bilingual research must compare source and target terms to see whether they are equivalent", N, "—", "Too advanced for beginners."),
 r("Full equivalence: same meaning and use in a field (black out and {{انقطاع الكهرباء}})", N, "—", "Chapter 10 teaches equivalence in a simpler way (formal, functional and ideational)."),
 r("Partial equivalence: differences in meaning (general versus specific; shifts) and in use (register, region, age, frequency)", N, "—", "Too advanced for beginners."),
 r("Limits of partial equivalence: coffee table; a language community’s right to its own terms", N, "—", "Too advanced for beginners."),
 r("Textual match: matching contexts and illustrations on a bilingual record prove that two terms are equivalent", N, "—", "Record formats and proof of equivalence are too advanced for beginners."),
 r("Exercise: two Apple Watch support pages, one English and one Arabic", N, "—", "Class exercise based on web pages; not suited to print."),
]})

# ---------------------------------------------------------------- 11
blocks.append({"source": "Terminology class notes: Terminological Records, Week 8 [%s]" % NAME, "rows": [
 r("Why records: published glossaries are fixed, but a record is easy to change and update", N, "—", "Record keeping is too advanced for beginners."),
 r("What a terminology record is; sequential and condensed formats; manual and computerised records", N, "—", "Record formats are too advanced for beginners."),
 r("The 11 fields of a monolingual record", N, "—", "Too detailed; Chapter 21, Step 4 names only the term, definition, field, source and date of a termbase entry."),
 r("Entry field rules: lower case, singular nouns, infinitive verbs, synonyms after a semicolon", N, "—", "Too detailed for beginners."),
 r("Source field: a code, with the full reference on a separate record", E, "Chapter 21, Step 4", "Reduced to one column for the source of each term in the term list; codes and separate source records were left out."),
 r("Date of publication; volume, issue and page number", N, "—", "Too detailed for beginners."),
 r("Grammatical labels (cross over; ratings), usage and semantic labels, context, fields, author and date, access keys", N, "—", "Too detailed for beginners."),
 r("Bilingual records: 18 fields, the target fields repeating the source fields", N, "—", "Too detailed for beginners."),
 r("Key points: synonyms on separate cross-referenced records; shortening contexts with an ellipsis; source codes; label abbreviations", N, "—", "Too detailed for beginners."),
]})

# ---------------------------------------------------------------- 12
blocks.append({"source": "Terminology class notes: Terminological Analysis, Week 6 [%s]" % NAME, "rows": [
 r("Introduction: analysis identifies terms and studies their contexts; five factors for identifying terms", N, "—", "Too advanced for beginners."),
 r("Determinant and determinatum: desktop publishing, subliminal advertising, film editing; charitable institution versus charitable man; inessential (intricate technology product, initial verification technique) and essential (bait-and-switch advertising, advocacy advertising) determinants", N, "—", "Too technical for beginners."),
 r("Degree of lexicalisation: security of networks, network security and security as forms of one term", E, "Chapter 21, Step 1", "Only network security is kept, as an example of a several-word term translated as one unit; lexicalisation is not explained."),
 r("Classification of concepts: unsystematic, systematic, cluster, area and stratified sampling", N, "—", "Too technical for beginners."),
 r("Collocations as terms: acknowledge receipt of a message, clear a buffer, formulate a query", N, "—", "Chapter 8 teaches collocation on its own."),
 r("Typographic clues to terms: bold, italics, quotation marks, underlining", N, "—", "Too detailed for beginners."),
 r("Contextual analysis: semantic features, choosing a context, and defining, explanatory and associative contexts", N, "—", "Too technical for beginners."),
 r("Exercise: find five terminology units in a text on nuclear weapons, choose contexts, and find Arabic equivalents", N, "—", "Class exercise based on a separate text."),
]})

# ---------------------------------------------------------------- Framework
F = "Chapter 2"
blocks.append({"source": "Framework instructions (her proposals) [%s]" % NAME, "rows": [
 r("Opening aim: a handbook that is practical, engaging and useful for undergraduates, lasting rather than academic or dry; the sections below offered as ideas to discuss, not a fixed framework", E, "Preface; Start here", "Kept as the aim of a plain, practical guide for beginners; the aim of lasting relevance is not stated in the book."),
 r("Breaking the Literal Trap: real legal, technical and news examples of moving beyond word-for-word translation", E, "Start here; Chapter 1, Step 1; Chapter 11, Steps 1 to 4; Chapter 19, Steps 2 and 3", "Not a separate section; the news, legal and technical examples sit in the chapters they illustrate."),
 r("The Terminology Guide: established Arabic equivalents, Arabization ({{تعريب}}) and transliteration ({{نقحرة}})", E, "Chapter 21, Step 3; Chapter 17, Step 2; Chapter 16, Steps 1 and 2", "Covered as a chapter on terms; the book uses “Arabicisation” ({{التعريب}}) and {{النقل الصوتي}}, not {{نقحرة}}."),
 r("Quick-Reference Genre Checklists: step-by-step checklists for each text type", E, "Chapter 19, Step 2; Chapter 18, Step 4; Translation quality checklist (end of Part 8)", "Merged into one checklist for any text, one short list of rules for each genre, and one final checklist."),
 r("The Common Pitfalls Clinic: common grammar, word and style mistakes with better versions", E, "Chapter 23, Steps 2 and 3", "Shown as weak version then better version, for both directions, inside the revision chapter rather than as a separate clinic."),
 r("The Translation Brief (Skopos) Blueprint: before writing, ask who the client is, what the communicative purpose (Skopos) is, and who the target audience is", E, "Chapter 2 (Before you start: ask three questions); Chapter 26, Step 3", "Kept as three questions that make the translation brief; the word Skopos appears only in Chapter 26."),
 r("The Interlingual Risk Assessment Matrix: judging a text by the consequences of a mistake, lower-risk general prose versus higher-risk legal and technical texts", E, "Chapter 24; Chapter 22, Step 2", "Written as a table of risk areas with what to do; the text-type contrast is shown through the medicine leaflet and contract examples."),
 r("The Intertextual Mapping Protocol: before translating, find real target-language parallel texts (for example a Kuwaiti or Gulf decree) for terms, phrasing, style and register", E, "Chapter 3, Step 1; Chapter 21, Step 3; When in doubt page; Your journey continues", "Only the habit of checking real texts in the target language is kept; the step-by-step protocol needs texts and practice."),
 r("Corpora and Digital Tool Literacy: use parallel corpora and reliable institutional glossaries (UNTERM, legislative portals) instead of relying only on dictionaries or raw machine translation", E, "Chapter 3, Step 3; Chapter 21, Step 3; Chapter 22, Step 5", "UNTERM and Arabterm are recommended and machine output must be checked against reliable sources; corpora and legislative portals are not mentioned."),
 r("Dynamic Syntactic Restructuring (De-Anglicizing Syntax): avoid heavy nominalisation, long chains of prepositional phrases and needless passives; rebuild English sentences as natural Arabic verbal sentences", E, "Chapter 4, Step 1; Chapter 5, Step 2; Chapter 23, Step 2", "Partly covered, not as a module: verb-first sentences, noun to verb, and copying the English passive; prepositional chains are not covered."),
 r("The Pragmatic Shift and Cultural Implicature Clinic: when a literal rendering fails, for English idioms and polite expressions, and keeping the interpersonal function", E, "Chapter 6, Step 2; Chapter 9; Chapter 15, Steps 1 and 4", "Partly covered through speaker meaning, idioms and set polite phrases; there is no separate clinic and the word implicature is not used."),
 r("The “Invisible Translator” Ethical Audit: a reflective checklist on cultural assumptions, source-text bias, institutional expectations and neutrality", N, "—", "Needs reflection and practice, and suits the website or a later edition; Chapter 20 and Chapter 22, Step 6 touch on point of view and responsibility."),
 r("Companion website, the reasoning: the printed book carries what lasts and the website what moves; a lean first edition; corrections and growth without a new print run; future team members contribute; the website to be the final step, still a proposal", N, "—", "This is the case for the website, not reader content; the book carries only the code and address."),
 r("Companion website, Access: a QR code at the end of the handbook, one scan into the current version", E, "Back cover (Midnight and Light editions); last page of the book; Your journey continues", "Kept as a QR code and the address translators-guild.vercel.app, with an invitation to visit the team’s website."),
 r("Companion website, The Library: current and earlier editions, corrections, a bank of practice texts across genres with model translations and commentary, a growing glossary, links to corpora and institutional glossaries", N, "—", "Belongs on the website; the book has its own glossary and one practice text, Put it all together."),
 r("Companion website, The Practice Arena: the handbook becomes something students do", N, "—", "Belongs on the website; the book has Try it questions at the end of each chapter."),
 r("Practice Arena: Text of the Week, a weekly passage; students submit a version and compare it with others and the commentary", N, "—", "Needs weekly release and online submission, so it belongs on the website."),
 r("Practice Arena: Spot the Literal Trap, several renderings of one sentence and a choice of the natural one", N, "—", "Website activity; Chapter 11, Step 2 compares three versions of one sentence as a worked example."),
 r("Practice Arena: Idiom Arena, timed rounds matching English idioms to Arabic equivalents", N, "—", "Needs a timed online game; Chapter 9 lists idioms with their equivalents."),
 r("Practice Arena: De-Anglicize It, a nominalised passive English sentence rebuilt as a natural Arabic verbal sentence", N, "—", "Website activity; Chapter 4 and Chapter 23 have Try it questions on rewriting sentences."),
 r("Practice Arena: Before and After, student translations beside polished versions, annotated", N, "—", "Needs student work collected over time, so it belongs on the website."),
 r("Practice Arena: streaks, badges and a team leaderboard", N, "—", "Needs an online system, so it belongs on the website."),
 r("Practice Arena: the Workshop Companion, a mode for Guild Season workshops", N, "—", "Needs the website and live workshops."),
]})

out = "/tmp/claude-0/-home-user-translators-guild/7d117e07-7e64-5e6c-8e91-83d6b6c25330/scratchpad/members/shaikhah_2.json"
json.dump(blocks, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
