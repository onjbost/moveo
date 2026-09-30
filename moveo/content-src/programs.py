# Source of content/programs/*.json — original programs written for Moveo.


def T(ex, sec, **kw):
    return {'exercise': ex, 'duration': sec, **kw}


def R(ex, reps, sets=None, rest=None, **kw):
    d = {'exercise': ex, 'reps': reps}
    if sets:
        d['sets'] = sets
    if rest is not None:
        d['rest'] = rest
    d.update(kw)
    return d


def B(title, items, rounds=None, rest_rounds=None):
    d = {'title': title, 'items': items}
    if rounds:
        d['rounds'] = rounds
    if rest_rounds:
        d['restBetweenRounds'] = rest_rounds
    return d


def S(id, title, focus, blocks, intro=None):
    d = {'id': id, 'title': title, 'focus': focus, 'blocks': blocks}
    if intro:
        d['intro'] = intro
    return d


def W(n, sessions, note=None, **adjust):
    d = {'week': n, 'sessions': sessions}
    if adjust:
        d['adjust'] = adjust
    if note:
        d['note'] = note
    return d


PROGRAMS = []

# =====================================================================
# 1. Pause da scrivania — raccolta usata dai promemoria durante il lavoro
# =====================================================================
PROGRAMS.append({
    'id': 'pause-scrivania',
    'title': 'Pause da scrivania',
    'category': 'desk',
    'kind': 'collection',
    'level': 'tutti',
    'summary': 'Routine da 3-5 minuti per collo, spalle, schiena e gambe, da fare in piedi o sulla sedia, senza cambiarti.',
    'description': 'Sono le routine che Moveo ti propone durante l\'orario di lavoro. Ognuna scioglie una zona che soffre la posizione seduta; ruotano da sole per coprire tutto il corpo nel corso della giornata. Si fanno in abiti da ufficio e senza tappetino.',
    'goals': ['Ridurre la rigidità di collo e spalle', 'Interrompere la sedentarietà ogni 1-2 ore', 'Riattivare circolazione e concentrazione'],
    'equipment': ['sedia', 'muro o stipite'],
    'sessions': [
        S('collo', 'Collo libero', 'Collo e trapezi', [
            B('Collo', [
                T('diaphragmatic-breathing', 30),
                R('chin-tuck', 10),
                T('neck-side-stretch', 25),
                T('levator-stretch', 25),
                T('neck-rotation', 15),
                R('shoulder-rolls', 10),
            ]),
        ], intro='Siediti sul bordo della sedia, piedi a terra, schiena lunga.'),
        S('schiena', 'Schiena da ufficio', 'Colonna e dorsale', [
            B('Colonna', [
                R('seated-cat-cow', 8),
                T('seated-twist', 25),
                R('standing-back-extension', 8),
                T('standing-side-bend', 20),
                R('chin-tuck', 8),
            ]),
        ]),
        S('anche', 'Anche e gambe', 'Flessori dell\'anca, glutei, femorali', [
            B('Gambe', [
                R('sit-to-stand', 10),
                T('standing-hip-flexor', 30),
                T('standing-hamstring', 25),
                T('seated-figure-four', 25),
                R('calf-raise', 15),
            ]),
        ], intro='Otto ore seduti accorciano i flessori dell\'anca: qui li allunghiamo.'),
        S('spalle', 'Spalle aperte', 'Petto, spalle e scapole', [
            B('Spalle', [
                R('shoulder-rolls', 10),
                R('scap-squeeze', 12),
                T('doorway-pec-stretch', 25),
                R('wall-angels', 8),
                T('cross-body-stretch', 20),
            ]),
        ]),
        S('energia', 'Ricarica', 'Circolazione ed energia', [
            B('Energia', [
                T('march-in-place', 40),
                T('arm-circles', 30),
                R('sit-to-stand', 10),
                R('incline-push-up', 8, note='Mani sul bordo della scrivania'),
                R('calf-raise', 15),
                T('standing-side-bend', 15),
            ]),
        ], intro='Per il calo di metà pomeriggio: due minuti per rimettere in moto il corpo.'),
        S('reset', 'Reset rapido', 'Respiro, polsi, collo, equilibrio', [
            B('Reset', [
                T('diaphragmatic-breathing', 45),
                T('wrist-stretch', 15),
                R('shoulder-rolls', 8),
                T('neck-side-stretch', 20),
                T('single-leg-balance', 20),
            ]),
        ]),
    ],
})

# =====================================================================
# 2. Ripartenza dolce — 2 settimane, perfetto con i muscoli indolenziti
# =====================================================================
COOL_FLOOR = B('Defaticamento', [T('child-pose', 45), T('supine-twist', 30), T('diaphragmatic-breathing', 45)])

PROGRAMS.append({
    'id': 'ripartenza-dolce',
    'title': 'Ripartenza dolce',
    'category': 'recovery',
    'level': 'principiante',
    'summary': 'Due settimane di mobilità e forza leggera per rimettere in moto il corpo dopo mesi di stop.',
    'description': 'Il punto di partenza consigliato. Sessioni da 10-15 minuti a bassa intensità: sciolgono le zone rigide, riattivano glutei e muscoli profondi e insegnano le posizioni di base che ritroverai negli altri programmi. Va bene anche con i muscoli ancora indolenziti (DOMS): il movimento leggero aiuta il recupero più del riposo assoluto.',
    'goals': ['Recuperare mobilità di anche, colonna e spalle', 'Creare l\'abitudine con sessioni brevi', 'Preparare il corpo a yoga, calisthenics e surf'],
    'equipment': ['tappetino'],
    'suggestedDays': [1, 3, 5],
    'sessions': [
        S('gambe', 'Sciogliere le gambe', 'Anche, femorali e polpacci', [
            B('Riscaldamento', [T('march-in-place', 60), R('cat-cow', 8)]),
            B('Mobilità', [
                T('low-lunge', 30), T('hip-90-90', 30), R('glute-bridge', 10), T('seated-forward-fold', 45), T('happy-baby', 40),
            ]),
            B('Recupero', [T('legs-up-wall', 90), T('diaphragmatic-breathing', 45)]),
        ], intro='Muoviti lento: se i muscoli sono indolenziti dopo il calcetto, questa è la sessione giusta.'),
        S('schiena', 'Schiena e spalle', 'Colonna toracica, scapole, collo', [
            B('Risveglio', [T('diaphragmatic-breathing', 45), R('cat-cow', 8)]),
            B('Mobilità', [
                T('thread-the-needle', 30), R('open-book', 6), T('sphinx', 40), R('prone-ytw', 5), R('wall-angels', 8),
            ]),
            COOL_FLOOR,
        ]),
        S('tutto', 'Tutto il corpo, piano', 'Forza leggera e coordinazione', [
            B('Riscaldamento', [T('march-in-place', 60), T('arm-circles', 30)]),
            B('Circuito leggero', [
                R('sit-to-stand', 10), R('wall-push-up', 10), R('bird-dog', 10, note='Alternando i lati'),
                R('glute-bridge', 10), R('clamshell', 10), R('dead-bug', 8, note='Alternando i lati'),
            ], rounds=2, rest_rounds=45),
            B('Defaticamento', [T('garland', 30), T('child-pose', 45), T('savasana', 60)]),
        ]),
    ],
    'schedule': [
        W(1, ['gambe', 'schiena', 'tutto'], note='Intensità bassa: devi finire con la sensazione di poterne fare ancora.'),
        W(2, ['gambe', 'schiena', 'tutto'], note='Stesse sessioni, qualche ripetizione e qualche secondo in più.', reps=2, duration=10),
    ],
})

# =====================================================================
# 3. Yoga — Fondamenta
# =====================================================================
PROGRAMS.append({
    'id': 'yoga-fondamenta',
    'title': 'Yoga: fondamenta',
    'category': 'yoga',
    'level': 'principiante',
    'summary': 'Quattro settimane per imparare le posizioni base, ritrovare mobilità e respirare meglio.',
    'description': 'Tre pratiche che si alternano: una in piedi per forza ed equilibrio, una a terra per colonna e anche, una più dinamica basata sul saluto al sole. Settimana dopo settimana le tenute si allungano di qualche secondo. Le posizioni sono accessibili: dove serve, usa cuscini o una sedia come supporto.',
    'goals': ['Mobilità di anche, spalle e colonna', 'Equilibrio e consapevolezza del corpo', 'Respiro più lento e profondo'],
    'equipment': ['tappetino', 'cuscino'],
    'suggestedDays': [2, 4, 6],
    'sessions': [
        S('radici', 'Radici in piedi', 'Gambe, equilibrio, apertura', [
            B('Centratura', [T('mountain', 30), T('diaphragmatic-breathing', 30)]),
            B('Saluti', [T('sun-salutation', 180)]),
            B('Posizioni in piedi', [
                T('warrior-1', 30), T('warrior-2', 30), T('triangle', 30), T('chair-pose', 20), T('downward-dog', 30),
            ], rounds=2, rest_rounds=20),
            B('Equilibrio', [T('tree', 30), T('garland', 45), R('cat-cow', 6)]),
            B('Chiusura', [T('child-pose', 45), T('savasana', 90)]),
        ]),
        S('colonna-anche', 'Colonna e anche', 'Mobilità a terra', [
            B('Respiro', [T('diaphragmatic-breathing', 45), R('cat-cow', 8)]),
            B('Anche', [T('downward-dog', 30), T('low-lunge', 40), T('hip-90-90', 40), T('supported-pigeon', 60), T('garland', 40)]),
            B('Colonna', [T('sphinx', 40), R('cobra', 5), T('bridge-pose', 30, sets=2, rest=15)]),
            B('Chiusura', [T('supine-twist', 40), T('happy-baby', 40), T('savasana', 90)]),
        ]),
        S('flusso-sole', 'Flusso del sole', 'Forza e continuità', [
            B('Saluti', [T('sun-salutation', 240)]),
            B('Guerrieri', [T('warrior-1', 30), T('warrior-2', 30), T('triangle', 30), T('plank', 20), T('downward-dog', 30)], rounds=2, rest_rounds=20),
            B('Equilibrio e allungamento', [T('tree', 30), T('seated-forward-fold', 60), T('supine-twist', 30)]),
            B('Chiusura', [T('savasana', 120)]),
        ]),
    ],
    'schedule': [
        W(1, ['radici', 'colonna-anche', 'flusso-sole'], note='Impara le forme: meglio corte e comode che lunghe e forzate.'),
        W(2, ['radici', 'colonna-anche', 'flusso-sole'], duration=5),
        W(3, ['colonna-anche', 'flusso-sole', 'radici'], duration=10),
        W(4, ['flusso-sole', 'colonna-anche', 'radici'], note='Tenute più lunghe: cerca calma nelle posizioni difficili.', duration=15),
    ],
})

# =====================================================================
# 4. Pilates — Core di base
# =====================================================================
PROGRAMS.append({
    'id': 'pilates-core',
    'title': 'Pilates: core di base',
    'category': 'pilates',
    'level': 'principiante',
    'summary': 'Quattro settimane a corpo libero per addome profondo, glutei e controllo della postura.',
    'description': 'Esercizi di matwork in versione accessibile. Il focus è la qualità: respiro coordinato, zona lombare stabile, movimenti lenti. Un core più forte aiuta la schiena da scrivania e la stabilità sulla tavola da surf.',
    'goals': ['Addome profondo e stabilità lombare', 'Glutei e fianchi più attivi', 'Controllo del movimento e postura'],
    'equipment': ['tappetino'],
    'suggestedDays': [1, 3, 5],
    'sessions': [
        S('centro', 'Respiro e centro', 'Attivazione del core', [
            B('Respiro', [T('diaphragmatic-breathing', 60), R('pelvic-tilt', 10)]),
            B('Core', [R('toe-taps', 10, note='Alternando le gambe'), R('dead-bug', 8, note='Alternando i lati'), R('glute-bridge', 10), T('plank', 20)], rounds=2, rest_rounds=30),
            B('Fianchi e schiena', [R('clamshell', 12), R('bird-dog', 10, note='Alternando i lati'), T('side-plank', 15)], rounds=2, rest_rounds=30),
            B('Allungamento', [R('spine-stretch', 6), T('supine-twist', 30)]),
            B('Chiusura', [T('child-pose', 45)]),
        ]),
        S('controllo', 'Controllo', 'Classici del matwork', [
            B('Riscaldamento', [R('pelvic-tilt', 8), R('cat-cow', 6)]),
            B('Serie addominale', [T('hundred', 40), R('roll-down', 6), R('single-leg-stretch', 10, note='Alternando le gambe'), R('leg-circles', 5, note='5 per senso')]),
            B('Fianchi e schiena', [R('side-leg-lift', 10), R('clamshell', 10), R('swan-prep', 6), T('pilates-swimming', 30)], rounds=2, rest_rounds=30),
            B('Stabilità', [R('dead-bug', 10, note='Alternando i lati'), T('plank', 25), R('glute-bridge', 12)]),
            B('Chiusura', [T('child-pose', 45)]),
        ]),
        S('flusso', 'Flusso', 'Tutto il corpo in sequenza', [
            B('Serie addominale', [T('hundred', 50), R('roll-down', 8), R('single-leg-stretch', 12, note='Alternando le gambe'), R('toe-taps', 12, note='Alternando le gambe')]),
            B('Rotazione e fianchi', [R('saw', 5), R('side-kick-kneeling', 10), R('clamshell', 12)], rounds=2, rest_rounds=30),
            B('Tenute', [T('plank', 30), T('side-plank', 20), R('bird-dog', 10, note='Alternando i lati'), T('pilates-swimming', 30)]),
            B('Estensione', [R('swan-prep', 6), R('spine-stretch', 6)]),
            B('Chiusura', [T('savasana', 60)]),
        ]),
    ],
    'schedule': [
        W(1, ['centro', 'controllo', 'centro'], note='Impara a tenere la lombare stabile: è la base di tutto.'),
        W(2, ['controllo', 'centro', 'flusso'], reps=1),
        W(3, ['controllo', 'flusso', 'centro'], reps=2, duration=5),
        W(4, ['flusso', 'controllo', 'flusso'], reps=2, duration=10),
    ],
})

# =====================================================================
# 5. Calisthenics — Da zero
# =====================================================================
WARM_CAL = B('Riscaldamento', [
    T('march-in-place', 45), T('arm-circles', 30), R('cat-cow', 6), R('squat', 8), T('worlds-greatest-stretch', 20),
])
COOL_CAL = B('Defaticamento', [T('child-pose', 40), T('supine-twist', 30), T('standing-hip-flexor', 25)])

PROGRAMS.append({
    'id': 'calisthenics-da-zero',
    'title': 'Calisthenics da zero',
    'category': 'calisthenics',
    'level': 'principiante → intermedio',
    'summary': 'Otto settimane a corpo libero: dai piegamenti al muro ai piegamenti completi, con spinta, tirata, gambe e core.',
    'description': 'Tre livelli progressivi da circa 30 minuti, ciascuno con due allenamenti (A e B) alternati. Ogni livello dura tre settimane (l\'ultimo due): prima si aumentano ripetizioni e secondi, poi si passa alla variante più difficile. Per la tirata serve un tavolo molto robusto o una sbarra bassa; in alternativa sostituisci il rematore inverso con Y-T-W a terra.',
    'goals': ['Arrivare a 3 serie di piegamenti completi', 'Forza di schiena e gambe per una postura migliore', 'Core solido'],
    'equipment': ['tappetino', 'tavolo robusto o sbarra bassa (facoltativo)', 'sedia'],
    'suggestedDays': [1, 3, 5],
    'sessions': [
        S('l1-a', 'Livello 1 · A', 'Spinta, gambe, core', [
            WARM_CAL,
            B('Forza', [
                R('wall-push-up', 10, sets=3, rest=45, restAfter=30),
                R('squat', 10, sets=3, rest=45, restAfter=30),
                R('prone-ytw', 6, sets=3, rest=30, restAfter=30),
                R('glute-bridge', 12, sets=3, rest=30, restAfter=30),
                T('plank', 20, sets=2, rest=30),
            ]),
            COOL_CAL,
        ]),
        S('l1-b', 'Livello 1 · B', 'Spinta inclinata, affondi, schiena', [
            WARM_CAL,
            B('Forza', [
                R('incline-push-up', 8, sets=3, rest=45, restAfter=30),
                R('reverse-lunge', 6, sets=3, rest=45, restAfter=30),
                T('superman', 15, sets=3, rest=30, restAfter=30),
                R('dead-bug', 8, sets=2, rest=30, restAfter=30, note='Alternando i lati'),
                T('side-plank', 15, sets=2, rest=20),
            ]),
            COOL_CAL,
        ]),
        S('l2-a', 'Livello 2 · A', 'Piegamenti sulle ginocchia e rematore', [
            WARM_CAL,
            B('Forza', [
                R('knee-push-up', 8, sets=3, rest=60, restAfter=30),
                R('split-squat', 8, sets=3, rest=45, restAfter=30),
                R('inverted-row', 6, sets=3, rest=60, restAfter=30),
                R('single-leg-bridge', 8, sets=3, rest=30, restAfter=30),
                T('hollow-hold', 20, sets=3, rest=30, restAfter=30),
                R('shoulder-taps', 12, sets=2, rest=30),
            ]),
            COOL_CAL,
        ]),
        S('l2-b', 'Livello 2 · B', 'Spalle, gradino, condizionamento', [
            WARM_CAL,
            B('Forza', [
                R('pike-push-up', 6, sets=3, rest=60, restAfter=30),
                R('step-up', 8, sets=3, rest=45, restAfter=30),
                R('prone-ytw', 8, sets=3, rest=30, restAfter=30),
                T('wall-sit', 30, sets=2, rest=45, restAfter=30),
            ]),
            B('Finale', [T('bear-crawl', 20), T('mountain-climber', 20)], rounds=3, rest_rounds=40),
            COOL_CAL,
        ]),
        S('l3-a', 'Livello 3 · A', 'Piegamenti completi e tirata', [
            WARM_CAL,
            B('Forza', [
                R('push-up', 6, sets=4, rest=75, restAfter=30),
                R('split-squat', 10, sets=3, rest=60, restAfter=30, note='Piede dietro su una sedia se ti senti sicuro'),
                R('inverted-row', 8, sets=4, rest=60, restAfter=30),
                T('hollow-hold', 30, sets=3, rest=30, restAfter=30),
                T('side-plank', 30, sets=2, rest=20),
            ]),
            COOL_CAL,
        ]),
        S('l3-b', 'Livello 3 · B', 'Spinta verticale, dip, potenza', [
            WARM_CAL,
            B('Forza', [
                R('pike-push-up', 8, sets=3, rest=60, restAfter=30),
                R('squat', 15, sets=3, rest=45, restAfter=30, note='Scendi in 3 secondi'),
                R('chair-dip', 8, sets=3, rest=60, restAfter=30),
                R('single-leg-bridge', 10, sets=3, rest=30, restAfter=30),
            ]),
            B('Finale', [T('sprawl', 20), T('shoulder-taps', 20)], rounds=3, rest_rounds=45),
            COOL_CAL,
        ]),
    ],
    'schedule': [
        W(1, ['l1-a', 'l1-b', 'l1-a'], note='Livello 1. Lascia sempre 1-2 ripetizioni "in tasca".'),
        W(2, ['l1-b', 'l1-a', 'l1-b'], reps=1),
        W(3, ['l1-a', 'l1-b', 'l1-a'], reps=2, duration=5),
        W(4, ['l2-a', 'l2-b', 'l2-a'], note='Livello 2: nuove varianti, si riparte con ripetizioni basse.'),
        W(5, ['l2-b', 'l2-a', 'l2-b'], reps=1),
        W(6, ['l2-a', 'l2-b', 'l2-a'], reps=2, duration=5),
        W(7, ['l3-a', 'l3-b', 'l3-a'], note='Livello 3: piegamenti completi. Se non ci sei ancora, fai l\'ultima serie sulle ginocchia.'),
        W(8, ['l3-b', 'l3-a', 'l3-b'], reps=1, duration=5),
    ],
})

# =====================================================================
# 6. Surf — Pronto per la tavola
# =====================================================================
WARM_SURF = B('Riscaldamento', [
    T('arm-circles', 30), R('cat-cow', 6), T('worlds-greatest-stretch', 20), R('prone-ytw', 5), T('march-in-place', 30),
])
MOB_SURF = B('Mobilità', [T('hip-90-90', 30), R('open-book', 5), T('child-pose', 40)])

PROGRAMS.append({
    'id': 'surf-pronto',
    'title': 'Surf: pronto per la tavola',
    'category': 'surf',
    'level': 'principiante → intermedio',
    'summary': 'Sei settimane per remare più a lungo, alzarti in piedi più velocemente e restare in equilibrio.',
    'description': 'Costruito sulle qualità che la ricerca associa alla performance nel surf: forza della parte superiore (trazione e spinta) per la remata, potenza delle gambe e velocità nel pop-up, equilibrio, rotazione del tronco e salute delle spalle (scapole e cuffia dei rotatori). Fase 1 (settimane 1-3): basi di forza e tecnica del pop-up. Fase 2 (settimane 4-6): intervalli di remata, pop-up esplosivo e pliometria leggera. Allenarsi fuori dall\'acqua non sostituisce le ore in mare, ma ti fa arrivare in acqua con più resistenza e meno rischio di sovraccaricare le spalle.',
    'goals': ['Resistenza e potenza di remata', 'Pop-up rapido e stabile', 'Equilibrio e controllo in rotazione', 'Spalle forti e sane'],
    'equipment': ['tappetino', 'asciugamano', 'tavolo robusto o sbarra (facoltativo)'],
    'suggestedDays': [1, 3, 6],
    'sources': [
        {'title': 'Donaldson et al. 2021, Training Methods in the Sport of Surfing: A Scoping Review', 'url': 'https://www.csusm.edu/surfresearch/documents/donaldson-2021.pdf'},
        {'title': 'Parsonage et al., Upper-Body Strength Measures and Pop-Up Performance of Stronger and Weaker Surfers', 'url': 'https://www.semanticscholar.org/paper/Upper-Body-Strength-Measures-and-Pop-Up-Performance-Parsonage-Secomb/4d6a30cd7739f5c3264c68ccf271d0bb4aa5fa6e'},
    ],
    'sessions': [
        S('remata', 'Remata e spalle', 'Resistenza di remata, trazione, cuffia dei rotatori', [
            WARM_SURF,
            B('Resistenza di remata', [T('prone-paddle', 40), T('sphinx', 15), T('superman', 20)], rounds=3, rest_rounds=60),
            B('Forza', [
                R('push-up-to-cobra', 6, sets=3, rest=45, restAfter=30),
                R('inverted-row', 8, sets=3, rest=60, restAfter=30),
                T('external-rotation-iso', 20, sets=2, rest=15, restAfter=20),
                R('prone-swimmer', 8, sets=2, rest=30),
            ]),
            MOB_SURF,
        ], intro='Petto sollevato come sulla tavola, bracciate lunghe. Le spalle devono lavorare, non fare male.'),
        S('popup-gambe', 'Pop-up e gambe', 'Tecnica del pop-up, forza delle gambe, stabilità', [
            WARM_SURF,
            B('Tecnica del pop-up', [R('pop-up-slow', 5, sets=2, rest=30, restAfter=30)]),
            B('Forza gambe', [
                R('squat', 12, sets=3, rest=45, restAfter=30),
                R('reverse-lunge', 8, sets=3, rest=45, restAfter=30),
                R('glute-bridge', 12, sets=2, rest=30, restAfter=30),
            ]),
            B('Stabilità', [R('surf-stance-squat', 8, sets=2, rest=20), T('single-leg-balance', 30)]),
            B('Defaticamento', [T('low-lunge', 30), T('garland', 40)]),
        ], intro='Scegli il tuo piede avanti (regular o goofy) e usa sempre quello.'),
        S('equilibrio', 'Equilibrio e rotazione', 'Core in rotazione, equilibrio, mobilità di anche e torace', [
            B('Attivazione', [R('cat-cow', 6), T('arm-circles', 30)]),
            B('Circuito', [
                R('rotational-lunge', 6), T('side-plank', 20), R('bird-dog', 10, note='Alternando i lati'),
                R('dead-bug', 8, note='Alternando i lati'), T('tree', 30),
            ], rounds=2, rest_rounds=60),
            B('Mobilità', [
                T('hip-90-90', 40), R('open-book', 6), R('cossack-squat', 6, note='Alternando i lati'),
                T('deep-squat-hold', 40), T('supine-twist', 30),
            ]),
        ]),
        S('remata-intervalli', 'Remata a intervalli', 'Sprint e resistenza di remata, forza di trazione', [
            WARM_SURF,
            B('Sprint di remata', [T('prone-paddle', 20, note='A tutta, come per prendere un\'onda', fixed=True)], rounds=6, rest_rounds=40),
            B('Remata continua', [T('prone-paddle', 60, note='Ritmo costante, respira')], rounds=2, rest_rounds=60),
            B('Forza', [
                R('push-up', 8, sets=3, rest=60, restAfter=30),
                R('inverted-row', 10, sets=3, rest=60, restAfter=30),
                R('pike-push-up', 6, sets=2, rest=45, restAfter=30),
                T('external-rotation-iso', 25, sets=2, rest=15, restAfter=20),
                R('prone-ytw', 8),
            ]),
            MOB_SURF,
        ], intro='Gli sprint sono brevi e intensi: recupera completamente tra uno e l\'altro.'),
        S('popup-esplosivo', 'Pop-up esplosivo', 'Potenza, pliometria leggera, atterraggi stabili', [
            WARM_SURF,
            B('Pop-up', [R('pop-up', 6, sets=3, rest=45, restAfter=30), T('sprawl', 20, sets=3, rest=40, restAfter=45)]),
            B('Potenza gambe', [
                R('squat-jump', 6, sets=3, rest=60, restAfter=30),
                R('skater-hop', 8, sets=3, rest=45, restAfter=30, note='Alternando i lati'),
                R('split-squat', 8, sets=2, rest=45, restAfter=30),
            ]),
            B('Equilibrio', [T('single-leg-balance', 30, note='Prova qualche secondo a occhi chiusi')]),
            B('Defaticamento', [T('low-lunge', 30), T('deep-squat-hold', 40)]),
        ], intro='Qualità prima di tutto: ogni pop-up deve atterrare stabile e silenzioso.'),
        S('core-rotazione', 'Core in rotazione', 'Anti-rotazione, controllo, dorsali', [
            B('Attivazione', [R('cat-cow', 6), R('prone-ytw', 5), T('worlds-greatest-stretch', 20)]),
            B('Core', [
                T('hollow-hold', 25, sets=3, rest=30, restAfter=30),
                R('shoulder-taps', 16, sets=3, rest=30, restAfter=30),
                T('bear-crawl', 25, sets=3, rest=40, restAfter=30),
                R('rotational-lunge', 8, sets=2, rest=30, restAfter=30),
                R('saw', 5),
                R('towel-pullover', 8, sets=3, rest=30),
            ]),
            B('Mobilità', [T('hip-90-90', 40), T('thread-the-needle', 30), T('supported-pigeon', 45), T('savasana', 60)]),
        ]),
    ],
    'schedule': [
        W(1, ['remata', 'popup-gambe', 'equilibrio'], note='Fase 1: impara i movimenti. Pop-up lento e pulito.'),
        W(2, ['remata', 'popup-gambe', 'equilibrio'], reps=1, duration=5),
        W(3, ['remata', 'popup-gambe', 'equilibrio'], reps=2, duration=10, rounds=1),
        W(4, ['remata-intervalli', 'popup-esplosivo', 'core-rotazione'], note='Fase 2: più intensità. Se una sessione ti lascia dolori articolari, torna alla fase 1.'),
        W(5, ['remata-intervalli', 'popup-esplosivo', 'core-rotazione'], reps=1, duration=5),
        W(6, ['remata-intervalli', 'popup-esplosivo', 'core-rotazione'], reps=2, duration=10, rounds=1),
    ],
})
