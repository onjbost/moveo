# Source of content/exercises.json — every description is original text written for Moveo.
# Run: python3 content-src/build.py
EX = []


def E(id, name, en, cats, targets, desc, cues, easier=None, harder=None, caution=None, perSide=False, equipment=None, position=None):
    EX.append({k: v for k, v in dict(
        id=id, name=name, searchTerm=en, categories=cats, targets=targets, position=position,
        perSide=perSide or None, equipment=equipment, description=desc, cues=cues,
        easier=easier, harder=harder, caution=caution,
    ).items() if v is not None})


# ---------------------------------------------------------------- scrivania / mobilità
E('chin-tuck', 'Retrazione del mento', 'chin tuck exercise', ['desk', 'mobility'], ['collo'],
  'Da seduto o in piedi, con lo sguardo dritto, porta il mento indietro come a farti un "doppio mento", poi rilascia. Contrasta la testa proiettata in avanti tipica di chi lavora al PC.',
  ['Il movimento è orizzontale: non abbassare né alzare lo sguardo', 'Tieni 2-3 secondi, poi rilascia lentamente', 'Immagina un filo che ti tira verso l\'alto dalla nuca'],
  easier='Fallo con la nuca appoggiata allo schienale o al muro, per sentire la direzione.',
  harder='Da supino, solleva leggermente la testa da terra mantenendo il mento retratto.', position='seduto')
E('neck-side-stretch', 'Allungamento laterale del collo', 'neck side stretch', ['desk', 'mobility', 'yoga'], ['collo', 'trapezio'],
  'Inclina l\'orecchio verso la spalla senza ruotare il viso. La spalla opposta resta bassa e pesante.',
  ['Respira lentamente e lascia cadere la spalla opposta', 'Per aumentare, la mano dello stesso lato appoggia sulla testa senza tirare', 'Torna al centro piano, senza scatti'],
  caution='Deve tirare, non fare male: niente formicolii nel braccio.', perSide=True, position='seduto')
E('neck-rotation', 'Rotazione del collo', 'neck rotation stretch', ['desk', 'mobility'], ['collo'],
  'Ruota lentamente la testa per guardare sopra la spalla, fermati dove senti tensione e respira. Poi l\'altro lato.',
  ['Mento parallelo al pavimento', 'Spalle ferme: si muove solo la testa', 'Ogni espirazione cerca un paio di gradi in più'], perSide=True, position='seduto')
E('levator-stretch', 'Allungamento dell\'elevatore della scapola', 'levator scapulae stretch', ['desk', 'mobility'], ['collo', 'scapole'],
  'Ruota il viso di 45° verso un lato e porta il naso verso l\'ascella. Con la mano dello stesso lato accompagna appena la testa. Senti l\'allungamento dietro, tra collo e scapola opposta.',
  ['La mano accompagna, non tira', 'Afferra il bordo della sedia con l\'altra mano per tenere giù la spalla', 'Respiro lento e lungo'],
  caution='Se senti dolore acuto o formicolio, riduci l\'ampiezza.', perSide=True, position='seduto')
E('shoulder-rolls', 'Circonduzioni delle spalle', 'shoulder rolls', ['desk', 'mobility'], ['spalle', 'trapezio'],
  'Disegna ampi cerchi con le spalle: su verso le orecchie, indietro, giù e avanti. Metà ripetizioni in un senso, metà nell\'altro.',
  ['Cerchi grandi e lenti', 'Le braccia restano morbide lungo i fianchi', 'Espira quando le spalle scendono'], position='in piedi')
E('doorway-pec-stretch', 'Allungamento del petto allo stipite', 'doorway pec stretch', ['desk', 'mobility'], ['petto', 'spalle'],
  'Appoggia avambraccio e gomito allo stipite di una porta, gomito all\'altezza della spalla. Fai un piccolo passo avanti finché senti aprirsi il petto.',
  ['Addome attivo: non inarcare la schiena', 'Il passo è piccolo, l\'allungamento è morbido', 'Prova il gomito un po\' più alto o più basso per cambiare zona'],
  easier='Mani dietro la testa da seduto, apri i gomiti indietro.', caution='Se la spalla è instabile o dolorante, tieni il gomito più basso della spalla.',
  perSide=True, equipment=['stipite della porta'], position='in piedi')
E('wall-angels', 'Angeli al muro', 'wall angels exercise', ['desk', 'mobility', 'surf'], ['scapole', 'dorsale', 'spalle'],
  'Schiena, glutei e testa contro il muro, braccia a "W" con dorso delle mani verso il muro. Scivola in alto verso una "Y" e ritorna, cercando di mantenere il contatto.',
  ['Costole giù: la zona lombare resta vicina al muro', 'Muoviti solo fin dove mantieni il contatto', 'Scapole che scendono verso le tasche posteriori'],
  easier='Fallo lontano dal muro, a terra da supino o solo con le braccia a metà corsa.', harder='Tieni 3 secondi in alto a ogni ripetizione.', position='in piedi')
E('scap-squeeze', 'Chiusure scapolari', 'scapular retraction squeeze', ['desk', 'mobility', 'surf'], ['scapole', 'dorsale'],
  'Braccia lungo i fianchi o a 90° davanti, avvicina le scapole tra loro e verso il basso, tieni un attimo e rilascia.',
  ['Non alzare le spalle verso le orecchie', 'Petto aperto, collo lungo', 'Tieni 2 secondi di stretta'], position='seduto')
E('cross-body-stretch', 'Allungamento spalla a braccio incrociato', 'cross body shoulder stretch', ['desk', 'mobility', 'surf'], ['spalle'],
  'Porta un braccio disteso davanti al petto e con l\'altra mano avvicinalo appena sopra il gomito. Senti la parte posteriore della spalla.',
  ['Spalla lontana dall\'orecchio', 'Non ruotare il busto per "barare"', 'Respira e lascia che il braccio si avvicini da solo'], perSide=True, position='in piedi')
E('seated-cat-cow', 'Gatto-mucca da seduto', 'seated cat cow', ['desk', 'mobility'], ['colonna'],
  'Seduto sul bordo della sedia, mani sulle ginocchia. Inspirando apri il petto e guarda leggermente in alto; espirando arrotonda la schiena e porta il mento verso lo sterno.',
  ['Il movimento parte dal bacino', 'Segui il ritmo del respiro', 'Movimento fluido, senza forzare gli estremi'], position='seduto')
E('seated-twist', 'Torsione da seduto', 'seated spinal twist chair', ['desk', 'mobility'], ['colonna', 'dorsale'],
  'Seduto con i piedi a terra, ruota il busto verso un lato aiutandoti con la mano sullo schienale. Cresci in altezza inspirando, ruota un po\' di più espirando.',
  ['Bacino fermo e ben appoggiato', 'Prima ti allunghi, poi ruoti', 'Lo sguardo segue per ultimo'], perSide=True, position='seduto')
E('standing-back-extension', 'Estensione in piedi', 'standing back extension', ['desk', 'mobility'], ['colonna', 'anche'],
  'In piedi, mani sui fianchi o sulla parte bassa della schiena, spingi leggermente il bacino avanti e apri il petto verso il soffitto. Un contrappeso alle ore da seduto.',
  ['Movimento piccolo e controllato', 'Glutei attivi', 'Tieni 2 secondi e torna dritto'], caution='Evita se dà dolore lombare: sostituisci con la retrazione del mento.', position='in piedi')
E('standing-side-bend', 'Allungamento laterale in piedi', 'standing side bend stretch', ['desk', 'mobility', 'yoga'], ['fianchi', 'dorsale'],
  'Piedi alla larghezza del bacino, porta un braccio sopra la testa e inclinati dal lato opposto come un arco.',
  ['Allungati verso l\'alto prima di piegarti', 'Il bacino resta centrato', 'Respira nel fianco che si allunga'], perSide=True, position='in piedi')
E('standing-hip-flexor', 'Allungamento dei flessori dell\'anca in piedi', 'standing hip flexor stretch', ['desk', 'mobility'], ['anche', 'flessori'],
  'In posizione di affondo corto, gamba dietro distesa. Stringi il gluteo della gamba dietro e porta il bacino leggermente avanti: senti l\'allungamento davanti all\'anca.',
  ['Bacino "in retroversione": coda verso il basso', 'Busto dritto, non inclinarti in avanti', 'Puoi appoggiarti alla scrivania'], perSide=True, position='in piedi')
E('standing-hamstring', 'Allungamento femorali in piedi', 'standing hamstring stretch', ['desk', 'mobility'], ['femorali'],
  'Tallone su un gradino o una sedia bassa, gamba quasi distesa. Piegati in avanti dalle anche, schiena lunga, finché senti tirare dietro la coscia.',
  ['Schiena lunga, non arrotondata', 'Punta del piede verso di te per aumentare', 'Ginocchio leggermente morbido'], perSide=True, position='in piedi')
E('seated-figure-four', 'Allungamento gluteo da seduto (figura 4)', 'seated figure four stretch', ['desk', 'mobility'], ['glutei', 'anche'],
  'Seduto, appoggia la caviglia sul ginocchio opposto. Schiena dritta, inclina il busto in avanti finché senti allungare il gluteo.',
  ['Piega dalle anche, non dalla schiena', 'Il ginocchio sopra può scendere dolcemente', 'Respira profondo'], caution='Se il ginocchio dà fastidio, appoggia la caviglia più in basso sullo stinco.', perSide=True, position='seduto')
E('calf-raise', 'Sollevamenti sulle punte', 'calf raises', ['desk', 'calisthenics', 'surf'], ['polpacci', 'caviglie'],
  'In piedi, sali sulle punte in modo controllato e scendi lentamente. Riattiva la circolazione dopo tanto tempo seduto.',
  ['Sali in 1 secondo, scendi in 2', 'Il peso sull\'alluce e sul secondo dito', 'Tieniti alla scrivania se serve'],
  harder='Su una gamba sola, o dal bordo di un gradino.', position='in piedi')
E('sit-to-stand', 'Alzate dalla sedia', 'sit to stand exercise', ['desk', 'calisthenics', 'recovery'], ['gambe', 'glutei'],
  'Dalla sedia, alzati senza usare le mani e torna a sederti lentamente, sfiorando la seduta.',
  ['Piedi alla larghezza delle anche', 'Busto leggermente in avanti, spingi dai talloni', 'Scendi in 3 secondi'], harder='Non sederti: sfiora la sedia e risali.', position='in piedi')
E('wrist-stretch', 'Allungamento polsi e avambracci', 'wrist flexor extensor stretch', ['desk', 'mobility', 'calisthenics'], ['polsi', 'avambracci'],
  'Braccio disteso davanti, palmo in su: con l\'altra mano porta le dita verso il basso. Poi palmo in giù e porta il dorso della mano verso di te.',
  ['Gomito disteso ma non bloccato', 'Allungamento dolce, 15 secondi per posizione', 'Alterna i due lati'], perSide=True, position='seduto')
E('arm-circles', 'Circonduzioni delle braccia', 'arm circles', ['desk', 'mobility', 'surf', 'calisthenics'], ['spalle'],
  'Braccia tese lateralmente, disegna cerchi da piccoli a grandi, prima in avanti poi indietro.',
  ['Parti piccolo e allarga poco a poco', 'Spalle basse', 'Respiro regolare'], position='in piedi')
E('march-in-place', 'Marcia sul posto', 'marching in place', ['desk', 'recovery', 'calisthenics'], ['cardio', 'anche'],
  'Marcia sul posto portando le ginocchia verso l\'alto e muovendo le braccia in modo coordinato. Riattiva il corpo.',
  ['Busto alto', 'Atterra morbido sull\'avampiede', 'Aumenta il ritmo negli ultimi secondi'], position='in piedi')
E('thread-the-needle', 'Infila l\'ago', 'thread the needle stretch', ['mobility', 'yoga', 'surf', 'recovery'], ['dorsale', 'spalle'],
  'In quadrupedia, fai scivolare un braccio sotto il petto verso il lato opposto, appoggiando spalla e tempia a terra. Torna su e apri lo stesso braccio verso il soffitto.',
  ['Il bacino resta sopra le ginocchia', 'Segui la mano con lo sguardo', 'Espira scendendo, inspira aprendo'], perSide=True, position='a terra')
E('open-book', 'Libro aperto', 'open book thoracic rotation', ['mobility', 'surf', 'recovery'], ['dorsale', 'petto'],
  'Sdraiato su un fianco, ginocchia piegate a 90° davanti a te, braccia distese insieme. Apri il braccio sopra come la pagina di un libro, ruotando il busto, e riportalo.',
  ['Le ginocchia restano unite e appoggiate', 'Lo sguardo segue la mano', 'Espira mentre apri'], perSide=True, position='a terra')
E('hip-90-90', 'Mobilità 90/90 delle anche', '90 90 hip mobility', ['mobility', 'surf', 'recovery'], ['anche'],
  'Seduto a terra con una gamba davanti e una di lato, entrambe piegate a 90°. Busto alto, inclinati verso la gamba davanti, poi ruota le ginocchia dall\'altra parte.',
  ['Aiutati con le mani dietro se serve', 'Busto lungo', 'Transizioni lente tra un lato e l\'altro'],
  easier='Appoggia un cuscino sotto il gluteo.', perSide=True, position='a terra')
E('worlds-greatest-stretch', 'Affondo con torsione (miglior allungamento)', 'worlds greatest stretch', ['mobility', 'surf', 'calisthenics'], ['anche', 'dorsale', 'femorali'],
  'Affondo lungo, mano interna a terra accanto al piede davanti. Porta il gomito verso la caviglia, poi apri il braccio verso il cielo ruotando il busto.',
  ['Gamba dietro attiva e distesa', 'Il ginocchio dietro può appoggiare se serve', 'Ruota dal petto, non solo dal braccio'], perSide=True, position='a terra')
E('diaphragmatic-breathing', 'Respirazione diaframmatica', 'diaphragmatic breathing', ['desk', 'recovery', 'yoga', 'pilates'], ['respiro'],
  'Una mano sul petto e una sulla pancia. Inspira dal naso gonfiando la pancia e le costole di lato, espira lentamente dalla bocca. Il petto si muove poco.',
  ['Inspira in 4 secondi, espira in 6', 'Spalle rilassate', 'Lascia andare la tensione della mascella'], position='seduto')

# ---------------------------------------------------------------- yoga
E('child-pose', 'Posizione del bambino (Balasana)', 'child pose yoga', ['yoga', 'recovery', 'mobility'], ['schiena', 'anche'],
  'Ginocchia a terra e aperte, glutei verso i talloni, busto adagiato tra le cosce e fronte a terra. Braccia distese avanti o lungo il corpo.',
  ['Respira nella schiena', 'Fronte appoggiata, collo rilassato', 'Braccia avanti per allungare anche le spalle'],
  easier='Cuscino tra glutei e talloni o sotto la fronte.', position='a terra')
E('cat-cow', 'Gatto-mucca', 'cat cow yoga', ['yoga', 'pilates', 'mobility', 'recovery'], ['colonna'],
  'In quadrupedia, mani sotto le spalle e ginocchia sotto le anche. Inspirando lascia scendere la pancia e apri il petto; espirando arrotonda la schiena spingendo il pavimento.',
  ['Una vertebra alla volta', 'Movimento guidato dal respiro', 'Spingi bene il pavimento nella fase "gatto"'], position='a terra')
E('downward-dog', 'Cane a testa in giù', 'downward facing dog', ['yoga', 'surf'], ['femorali', 'polpacci', 'spalle'],
  'Da quadrupedia, solleva il bacino in alto e indietro formando una V rovesciata. Mani spinte a terra, schiena lunga; i talloni non devono per forza toccare terra.',
  ['Priorità alla schiena lunga: piega le ginocchia se serve', 'Allontana le spalle dalle orecchie', 'Pedala alternando i talloni per sciogliere i polpacci'],
  easier='Mani su una sedia o sul bordo di un divano.', caution='Evita con dolore ai polsi acuto: appoggia gli avambracci (delfino).', position='a terra')
E('low-lunge', 'Affondo basso (Anjaneyasana)', 'low lunge yoga', ['yoga', 'mobility', 'surf'], ['flessori', 'anche'],
  'Da affondo, appoggia il ginocchio dietro a terra. Porta il bacino avanti e in basso, busto alto, braccia in alto o mani sulla coscia.',
  ['Ginocchio davanti sopra la caviglia', 'Coda verso il basso per sentire i flessori', 'Cuscino sotto il ginocchio dietro'], perSide=True, position='a terra')
E('warrior-1', 'Guerriero I', 'warrior 1 pose', ['yoga'], ['gambe', 'anche', 'spalle'],
  'Piedi a un passo lungo, piede dietro ruotato di circa 45°. Piega il ginocchio davanti, bacino orientato in avanti, braccia in alto.',
  ['Tallone dietro ben piantato', 'Ginocchio davanti in linea con il secondo dito', 'Spalle rilassate anche con le braccia in alto'], perSide=True, position='in piedi')
E('warrior-2', 'Guerriero II', 'warrior 2 pose', ['yoga', 'surf'], ['gambe', 'anche'],
  'Gambe molto aperte, piede davanti verso avanti e piede dietro parallelo al lato corto del tappetino. Piega il ginocchio davanti e apri le braccia in linea, sguardo oltre la mano davanti. Ricorda la posizione sulla tavola.',
  ['Ginocchio davanti sopra la caviglia, rivolto verso il mignolo', 'Busto in verticale tra le gambe', 'Braccia attive fino alla punta delle dita'], perSide=True, position='in piedi')
E('triangle', 'Triangolo (Trikonasana)', 'triangle pose', ['yoga'], ['fianchi', 'femorali'],
  'Da gambe larghe come nel Guerriero II ma distese, allunga il busto verso il piede davanti e appoggia la mano su stinco, blocco o sedia. L\'altro braccio sale verso il cielo.',
  ['Allunga prima, poi scendi', 'Petto aperto verso il lato', 'Non bloccare il ginocchio davanti'], easier='Mano su un blocco o sulla coscia.', perSide=True, position='in piedi')
E('tree', 'Albero (Vrksasana)', 'tree pose', ['yoga', 'surf'], ['equilibrio', 'caviglie'],
  'In equilibrio su una gamba, appoggia la pianta dell\'altro piede sulla caviglia, sul polpaccio o sull\'interno coscia (mai sul ginocchio). Mani al petto o in alto.',
  ['Fissa un punto davanti a te', 'Spingi il piede nella gamba e la gamba nel piede', 'Bacino livellato'], easier='Punta del piede a terra, tallone sulla caviglia.', harder='Occhi chiusi per qualche secondo.', perSide=True, position='in piedi')
E('cobra', 'Cobra (Bhujangasana)', 'cobra pose', ['yoga', 'surf', 'recovery'], ['colonna', 'petto'],
  'Prono, mani sotto le spalle, gomiti vicini al corpo. Spingi leggermente per sollevare il petto, pube a terra, gomiti morbidi.',
  ['Solleva con la schiena, le mani aiutano', 'Spalle lontane dalle orecchie', 'Guarda avanti, non in alto'], caution='Fermati prima di qualsiasi fastidio lombare.', position='a terra')
E('sphinx', 'Sfinge', 'sphinx pose', ['yoga', 'recovery', 'surf'], ['colonna', 'petto'],
  'Prono, avambracci a terra con i gomiti sotto le spalle. Spingi gli avambracci per allungare la colonna e aprire il petto. È la posizione di remata "in pausa".',
  ['Pube e gambe pesanti a terra', 'Petto avanti, non solo in su', 'Respira lento'], position='a terra')
E('bridge-pose', 'Ponte (Setu Bandha)', 'bridge pose yoga', ['yoga', 'recovery'], ['glutei', 'colonna', 'petto'],
  'Supino, piedi a terra vicino ai glutei. Solleva il bacino e mantieni, mani intrecciate sotto la schiena o lungo il corpo.',
  ['Ginocchia parallele', 'Spingi dai talloni', 'Collo libero: non girare la testa'], position='a terra')
E('supported-pigeon', 'Piccione supportato', 'pigeon pose modified', ['yoga', 'mobility', 'recovery', 'surf'], ['glutei', 'anche'],
  'Da quadrupedia porta un ginocchio verso la mano dello stesso lato e lo stinco in diagonale, gamba dietro distesa. Cuscino sotto il gluteo davanti se non arriva a terra.',
  ['Bacino il più possibile dritto', 'Busto alto o appoggiato sugli avambracci', 'Nessun dolore al ginocchio: in caso, usa la figura 4 da supino'], perSide=True, position='a terra')
E('seated-forward-fold', 'Piegamento in avanti da seduto', 'seated forward fold', ['yoga', 'pilates', 'recovery'], ['femorali', 'schiena'],
  'Seduto a gambe distese, ginocchia anche piegate, allungati verso l\'alto e poi piegati in avanti dalle anche.',
  ['Schiena lunga prima di scendere', 'Ginocchia morbide se i femorali tirano', 'Rilascia il collo alla fine'], easier='Siediti su un cuscino.', position='a terra')
E('supine-twist', 'Torsione da supino', 'supine spinal twist', ['yoga', 'recovery', 'mobility', 'desk'], ['colonna', 'glutei'],
  'Supino, porta le ginocchia al petto e lasciale cadere da un lato, braccia aperte a T. Sguardo verso il lato opposto.',
  ['Le spalle restano a terra', 'Cuscino sotto le ginocchia se non arrivano', 'Rilassati a ogni espirazione'], perSide=True, position='a terra')
E('happy-baby', 'Bambino felice', 'happy baby pose', ['yoga', 'recovery'], ['anche', 'schiena'],
  'Supino, ginocchia verso le ascelle, afferra i piedi (o gli stinchi) con le piante verso il soffitto. Dondola leggermente.',
  ['Sacro verso terra', 'Collo rilassato', 'Dondola lateralmente per massaggiare la schiena'], position='a terra')
E('legs-up-wall', 'Gambe al muro', 'legs up the wall', ['yoga', 'recovery'], ['recupero'],
  'Sdraiato con i glutei vicini al muro e le gambe appoggiate in verticale. Braccia rilassate, respiro lento.',
  ['Cuscino sotto il bacino se piace', 'Occhi chiusi', 'Ottima a fine giornata'], position='a terra')
E('savasana', 'Rilassamento finale (Savasana)', 'savasana', ['yoga', 'pilates', 'recovery'], ['recupero'],
  'Supino, gambe e braccia rilassate, palmi in su. Lascia il corpo pesante e porta l\'attenzione al respiro.',
  ['Nessuno sforzo', 'Scansiona il corpo dalla testa ai piedi', 'Se arrivano pensieri, torna al respiro'], position='a terra')
E('mountain', 'Montagna (Tadasana)', 'mountain pose', ['yoga'], ['postura'],
  'In piedi, piedi uniti o alla larghezza del bacino, peso distribuito. Cresci in altezza con spalle rilassate e respiro calmo.',
  ['Peso su tallone, alluce e mignolo', 'Ginocchia sbloccate', 'Mento parallelo al pavimento'], position='in piedi')
E('chair-pose', 'Sedia (Utkatasana)', 'chair pose', ['yoga', 'surf'], ['gambe', 'glutei'],
  'Piedi uniti o larghi come il bacino, piega le ginocchia come per sederti su una sedia, braccia in alto o avanti.',
  ['Peso sui talloni', 'Ginocchia dietro le punte', 'Busto lungo in leggera inclinazione'], position='in piedi')
E('sun-salutation', 'Saluto al sole (versione semplice)', 'sun salutation A beginner', ['yoga', 'surf'], ['tutto il corpo'],
  'Sequenza a ritmo di respiro: montagna con braccia in alto, piegamento avanti, mezzo sollevamento, plank o ginocchia a terra, cobra, cane a testa in giù, ritorno in piedi. Ripeti la sequenza per il tempo indicato.',
  ['Un movimento per ogni inspirazione o espirazione', 'Ginocchia a terra nel passaggio a terra, senza fretta', 'Ogni giro un po\' più fluido'],
  easier='Resta 2 respiri in ogni posizione invece di scorrere.', position='in piedi')
E('garland', 'Accosciata (Malasana)', 'garland pose malasana', ['yoga', 'mobility', 'surf'], ['anche', 'caviglie'],
  'Accosciata profonda con i piedi un po\' più larghi del bacino, mani al petto e gomiti che spingono dolcemente le ginocchia verso l\'esterno.',
  ['Talloni a terra se possibile, altrimenti su un asciugamano arrotolato', 'Petto aperto', 'Respira nel bacino'], easier='Siediti su un blocco o un libro spesso.', position='in piedi')

# ---------------------------------------------------------------- pilates
E('pelvic-tilt', 'Basculamento del bacino', 'pelvic tilt exercise', ['pilates', 'recovery', 'desk'], ['addome', 'lombare'],
  'Supino a ginocchia piegate. Espirando porta la zona lombare verso il pavimento attivando l\'addome basso; inspirando torna in posizione neutra.',
  ['Movimento piccolo', 'Glutei rilassati: lavora l\'addome', 'Coordina con il respiro'], position='a terra')
E('hundred', 'I cento (modificato)', 'pilates hundred modified', ['pilates'], ['addome'],
  'Supino, gambe a "tavolino" (ginocchia sopra le anche, stinchi paralleli al pavimento). Solleva testa e spalle, braccia tese a lato del corpo che pompano su e giù: inspira per 5 pompate, espira per 5.',
  ['Sguardo verso le ginocchia, collo lungo', 'Lombare stabile', 'Se il collo si stanca, appoggia la testa'], easier='Piedi a terra e testa appoggiata.', harder='Gambe distese a 45°.', position='a terra')
E('dead-bug', 'Dead bug', 'dead bug exercise', ['pilates', 'calisthenics', 'surf'], ['addome', 'stabilità'],
  'Supino, braccia verso il soffitto e gambe a tavolino. Allunga braccio e gamba opposti verso il pavimento mantenendo la schiena ferma, poi torna e cambia.',
  ['Lombare incollata al tappetino', 'Espira mentre allunghi', 'Lento: 3 secondi per andare, 2 per tornare'], easier='Muovi solo le gambe, tallone che sfiora terra.', position='a terra')
E('single-leg-stretch', 'Allungamento a una gamba', 'pilates single leg stretch', ['pilates'], ['addome', 'coordinazione'],
  'Supino con testa e spalle sollevate, porta un ginocchio al petto e allunga l\'altra gamba in diagonale. Alterna le gambe con ritmo.',
  ['Busto fermo, si muovono le gambe', 'Gamba tesa più alta per facilitare', 'Espira ogni due cambi'], position='a terra')
E('roll-down', 'Arrotolamento assistito (roll down)', 'pilates roll down', ['pilates', 'recovery'], ['addome', 'colonna'],
  'Seduto con ginocchia piegate, mani dietro le cosce. Espirando arrotola il bacino e scendi indietro vertebra per vertebra fin dove controlli, poi risali.',
  ['Mento verso lo sterno', 'Aiutati con le mani', 'Scendi solo fin dove mantieni la curva'], harder='Scendi fino a terra e risali senza mani (roll up).', position='a terra')
E('bird-dog', 'Bird dog (quadrupedia alternata)', 'bird dog exercise', ['pilates', 'calisthenics', 'surf', 'recovery'], ['stabilità', 'glutei', 'schiena'],
  'In quadrupedia, allunga un braccio in avanti e la gamba opposta indietro, formando una linea. Torna e cambia lato.',
  ['Bacino fermo come se avessi un bicchiere sulla schiena', 'Allunga, non alzare troppo', 'Tieni 2 secondi in allungo'], position='a terra')
E('side-leg-lift', 'Slanci laterali da sdraiato', 'side lying leg lift', ['pilates'], ['glutei', 'fianchi'],
  'Sdraiato su un fianco in linea, solleva la gamba sopra tesa di un palmo e riabbassala lentamente.',
  ['Punta del piede in avanti, non verso il soffitto', 'Bacino fermo', 'Controlla la discesa'], perSide=True, position='a terra')
E('clamshell', 'Conchiglia (clamshell)', 'clamshell exercise', ['pilates', 'recovery', 'surf'], ['glutei', 'anche'],
  'Sdraiato su un fianco con le ginocchia piegate, piedi uniti. Apri il ginocchio sopra come una conchiglia senza ruotare il bacino.',
  ['Bacino fermo, leggermente in avanti', 'Movimento dal gluteo', 'Chiudi lentamente'], perSide=True, position='a terra')
E('pilates-swimming', 'Nuoto (swimming)', 'pilates swimming', ['pilates', 'surf'], ['schiena', 'glutei', 'spalle'],
  'Prono, braccia avanti. Solleva leggermente braccia, petto e gambe e alterna piccoli battiti di braccio e gamba opposti, come nuotando.',
  ['Collo lungo, sguardo al pavimento', 'Addome attivo per proteggere la zona lombare', 'Battiti piccoli e rapidi'], easier='Solleva un braccio e la gamba opposta alla volta, lentamente.', position='a terra')
E('swan-prep', 'Preparazione al cigno', 'pilates swan prep', ['pilates', 'surf'], ['schiena', 'petto'],
  'Prono con le mani vicino alle spalle. Allunga la colonna e solleva il petto guidando con lo sterno, poi scendi allungandoti in avanti.',
  ['Pube a terra', 'Scapole verso il basso', 'Muovi una vertebra alla volta'], position='a terra')
E('spine-stretch', 'Allungamento della colonna in avanti', 'pilates spine stretch forward', ['pilates', 'recovery'], ['colonna', 'femorali'],
  'Seduto a gambe divaricate, busto alto. Espirando arrotola la colonna in avanti come per superare un pallone, inspirando risali impilando le vertebre.',
  ['Bacino verticale, siediti su un cuscino se serve', 'L\'addome si svuota scendendo', 'Risali lentamente'], position='a terra')
E('leg-circles', 'Cerchi con la gamba', 'pilates single leg circles', ['pilates', 'mobility'], ['anche', 'addome'],
  'Supino, una gamba verso il soffitto e l\'altra distesa o piegata a terra. Disegna piccoli cerchi con la gamba sollevata mantenendo il bacino fermo.',
  ['Cerchi piccoli e precisi', '5 in un senso, 5 nell\'altro', 'Gamba sollevata anche piegata va bene'], perSide=True, position='a terra')
E('saw', 'Sega (saw)', 'pilates saw exercise', ['pilates', 'surf'], ['colonna', 'femorali', 'rotazione'],
  'Seduto a gambe divaricate, braccia aperte. Ruota il busto e allunga la mano verso il piede opposto come a "segarne" il mignolo, poi torna al centro.',
  ['Ruota prima, poi piegati', 'Bacino fermo e ben seduto', 'Espira mentre ti allunghi'], perSide=True, position='a terra')
E('toe-taps', 'Tocchi del tallone', 'pilates toe taps', ['pilates', 'recovery'], ['addome basso'],
  'Supino con le gambe a tavolino, abbassa un piede alla volta a sfiorare il pavimento e riportalo su, senza muovere la schiena.',
  ['Lombare stabile', 'Movimento dall\'anca', 'Espira mentre scendi'], position='a terra')
E('side-kick-kneeling', 'Calci laterali in ginocchio', 'pilates kneeling side kick', ['pilates'], ['fianchi', 'glutei', 'equilibrio'],
  'In ginocchio, appoggia una mano a terra di lato e distendi la gamba opposta. Portala avanti e indietro controllando il busto.',
  ['Busto lungo e stabile', 'Movimento dalla anca', 'Braccio a terra attivo'], perSide=True, position='a terra')

# ---------------------------------------------------------------- calisthenics
E('wall-push-up', 'Piegamenti al muro', 'wall push up', ['calisthenics', 'recovery'], ['petto', 'tricipiti', 'spalle'],
  'Mani al muro all\'altezza delle spalle, corpo inclinato in linea. Piega i gomiti avvicinando il petto al muro e spingi via.',
  ['Corpo rigido dalla testa ai talloni', 'Gomiti a circa 45° dal busto', 'Più ti allontani dal muro, più è difficile'], position='in piedi')
E('incline-push-up', 'Piegamenti inclinati', 'incline push up', ['calisthenics', 'surf'], ['petto', 'tricipiti', 'spalle'],
  'Mani su un tavolo, un bancone o il bordo del divano, corpo in linea. Scendi con il petto verso il bordo e risali.',
  ['Addome e glutei attivi', 'Scendi in 2 secondi', 'Più basso il piano, più è difficile'], equipment=['tavolo o bancone'], position='in piedi')
E('knee-push-up', 'Piegamenti sulle ginocchia', 'knee push up', ['calisthenics'], ['petto', 'tricipiti'],
  'A terra con ginocchia appoggiate, linea dritta ginocchia-spalle. Scendi con il petto tra le mani e spingi.',
  ['Anche in linea, non piegate', 'Petto che arriva quasi a terra', 'Gomiti che puntano indietro in diagonale'], position='a terra')
E('push-up', 'Piegamenti', 'push up proper form', ['calisthenics', 'surf'], ['petto', 'tricipiti', 'addome'],
  'In plank sulle mani, corpo in linea. Scendi finché il petto è vicino a terra e spingi via il pavimento.',
  ['Glutei stretti, addome attivo', 'Gomiti a 45°', 'Ultima ripetizione pulita come la prima'], easier='Piegamenti sulle ginocchia o inclinati.', harder='Piedi rialzati o discesa in 4 secondi.', position='a terra')
E('inverted-row', 'Rematore inverso', 'inverted row table', ['calisthenics', 'surf'], ['dorsali', 'bicipiti', 'scapole'],
  'Sotto un tavolo molto robusto o una sbarra bassa, afferra il bordo e tira il petto verso di esso mantenendo il corpo dritto.',
  ['Scapole che si chiudono per prime', 'Corpo rigido', 'Ginocchia piegate per facilitare'],
  easier='Busto più verticale (piedi più vicini) o asciugamano attorno a un palo robusto.', caution='Verifica che il tavolo regga il tuo peso e non si ribalti. Se non sei sicuro, usa Y-T-W a terra.',
  equipment=['tavolo robusto o sbarra bassa'], position='a terra')
E('dead-hang', 'Sospensione alla sbarra', 'dead hang', ['calisthenics', 'surf'], ['presa', 'spalle'],
  'Appeso alla sbarra con braccia distese. Mantieni le spalle "attive", lontane dalle orecchie.',
  ['Presa salda con tutta la mano', 'Addome attivo, gambe ferme', 'Piedi a terra per alleggerire se serve'], equipment=['sbarra'], position='sbarra')
E('scapular-pull', 'Trazioni scapolari', 'scapular pull up', ['calisthenics', 'surf'], ['scapole', 'dorsali'],
  'Appeso alla sbarra a braccia tese, abbassa le scapole sollevando il corpo di pochi centimetri senza piegare i gomiti, poi rilascia.',
  ['Gomiti distesi', 'Movimento piccolo', 'Controlla la discesa'], equipment=['sbarra'], position='sbarra')
E('negative-pull-up', 'Trazioni negative', 'negative pull up', ['calisthenics', 'surf'], ['dorsali', 'bicipiti'],
  'Parti in alto con il mento sopra la sbarra (salta o usa una sedia) e scendi il più lentamente possibile fino a braccia tese.',
  ['Discesa in 4-5 secondi', 'Petto verso la sbarra', 'Rimetti i piedi sulla sedia per risalire'], caution='Usa un appoggio stabile per salire.', equipment=['sbarra'], position='sbarra')
E('squat', 'Squat', 'bodyweight squat', ['calisthenics', 'surf'], ['gambe', 'glutei'],
  'Piedi poco più larghi delle anche, scendi come per sederti tra i talloni mantenendo il petto alto, poi risali spingendo il pavimento.',
  ['Ginocchia in linea con le punte', 'Talloni a terra', 'Scendi fin dove la schiena resta neutra'], easier='Alzate dalla sedia.', harder='Discesa in 4 secondi o pausa di 2 secondi in basso.', position='in piedi')
E('split-squat', 'Squat a gambe divise', 'split squat', ['calisthenics', 'surf'], ['quadricipiti', 'glutei'],
  'Un passo lungo, piede dietro sulle punte. Scendi in verticale finché il ginocchio dietro sfiora terra e risali. Tutte le ripetizioni da un lato, poi dall\'altro.',
  ['Busto alto', 'Peso sul piede davanti', 'Tieniti al muro per l\'equilibrio all\'inizio'], harder='Piede dietro su una sedia (bulgaro).', perSide=True, position='in piedi')
E('reverse-lunge', 'Affondo indietro', 'reverse lunge', ['calisthenics', 'surf'], ['gambe', 'glutei', 'equilibrio'],
  'Dalla posizione in piedi fai un passo indietro e scendi in affondo, poi torna spingendo con il piede davanti.',
  ['Passo abbastanza lungo', 'Ginocchio davanti stabile', 'Rialzati con controllo'], perSide=True, position='in piedi')
E('glute-bridge', 'Ponte glutei', 'glute bridge', ['calisthenics', 'pilates', 'recovery', 'surf'], ['glutei', 'femorali'],
  'Supino a ginocchia piegate, spingi i talloni e solleva il bacino fino a formare una linea spalle-ginocchia. Stringi i glutei in alto.',
  ['Costole giù, non inarcare', 'Pausa di 1-2 secondi in alto', 'Scendi lentamente'], harder='Su una gamba sola.', position='a terra')
E('single-leg-bridge', 'Ponte glutei su una gamba', 'single leg glute bridge', ['calisthenics', 'surf'], ['glutei', 'femorali'],
  'Come il ponte glutei, ma con una gamba distesa in alto. Solleva il bacino spingendo con il tallone a terra.',
  ['Bacino livellato', 'Spinta dal tallone', 'Controlla la discesa'], perSide=True, position='a terra')
E('plank', 'Plank', 'plank proper form', ['calisthenics', 'pilates', 'yoga', 'surf'], ['addome', 'spalle'],
  'Sugli avambracci e sulle punte dei piedi, corpo in linea dalla testa ai talloni. Respira mantenendo la posizione.',
  ['Glutei e addome attivi', 'Spingi il pavimento con gli avambracci', 'Collo in linea'], easier='Ginocchia a terra.', harder='Solleva alternativamente un piede.', position='a terra')
E('side-plank', 'Plank laterale', 'side plank', ['calisthenics', 'pilates', 'surf'], ['obliqui', 'fianchi', 'spalle'],
  'Su un avambraccio, gomito sotto la spalla, corpo di lato in linea. Solleva il bacino e mantieni.',
  ['Bacino alto', 'Spalla lontana dall\'orecchio', 'Petto aperto'], easier='Ginocchia piegate a terra.', perSide=True, position='a terra')
E('hollow-hold', 'Hollow hold', 'hollow body hold', ['calisthenics', 'surf'], ['addome'],
  'Supino, zona lombare a terra. Solleva spalle e gambe formando una "banana" e mantieni.',
  ['Lombare incollata: è la regola numero uno', 'Più braccia e gambe sono lontane, più è difficile', 'Respira corto ma regolare'], easier='Ginocchia piegate e braccia lungo i fianchi.', position='a terra')
E('superman', 'Superman', 'superman exercise', ['calisthenics', 'surf', 'pilates'], ['schiena', 'glutei'],
  'Prono con braccia avanti, solleva contemporaneamente braccia, petto e gambe di pochi centimetri e mantieni.',
  ['Sguardo a terra', 'Allungati più che sollevarti', 'Glutei attivi'], easier='Alterna braccio e gamba opposti.', position='a terra')
E('pike-push-up', 'Piegamenti a V (pike)', 'pike push up', ['calisthenics', 'surf'], ['spalle', 'tricipiti'],
  'Dalla posizione a V rovesciata (come il cane a testa in giù) piega i gomiti portando la testa verso terra davanti alle mani, poi spingi.',
  ['Bacino alto', 'La testa scende davanti alle mani, formando un triangolo', 'Gomiti non troppo aperti'], easier='Mani su un rialzo.', position='a terra')
E('chair-dip', 'Dip alla sedia', 'chair dips', ['calisthenics'], ['tricipiti', 'spalle'],
  'Mani sul bordo di una sedia stabile dietro di te, gambe piegate. Scendi piegando i gomiti e risali.',
  ['Spalle lontane dalle orecchie', 'Scendi solo fino a 90° di gomito', 'Sedia contro il muro'], caution='Evita se senti dolore davanti alla spalla.', equipment=['sedia stabile'], position='a terra')
E('wall-sit', 'Sedia al muro', 'wall sit', ['calisthenics', 'surf'], ['quadricipiti'],
  'Schiena contro il muro, scendi finché le cosce sono quasi parallele al pavimento e mantieni.',
  ['Ginocchia sopra le caviglie', 'Schiena appoggiata', 'Respira'], easier='Scendi meno.', position='in piedi')
E('step-up', 'Salite sul gradino', 'step up exercise', ['calisthenics', 'surf'], ['gambe', 'glutei'],
  'Sali su un gradino o una panca stabile spingendo con la gamba sopra, poi scendi controllando.',
  ['Spinta dalla gamba sopra, non dalla gamba sotto', 'Ginocchio in linea', 'Scendi lentamente'], perSide=True, equipment=['gradino o panca stabile'], position='in piedi')
E('mountain-climber', 'Scalatore', 'mountain climbers', ['calisthenics', 'surf'], ['addome', 'cardio'],
  'In plank sulle mani, porta alternativamente le ginocchia verso il petto a ritmo sostenuto.',
  ['Spalle sopra i polsi', 'Bacino basso', 'Inizia lento, poi accelera'], easier='Mani su un rialzo e ritmo lento.', position='a terra')
E('jumping-jack', 'Jumping jack', 'jumping jacks', ['calisthenics'], ['cardio'],
  'Salta aprendo gambe e braccia, poi chiudi. Atterra morbido.',
  ['Atterraggio sulle punte', 'Ritmo costante', 'Versione senza salto: un passo di lato alla volta'], easier='Passo laterale senza salto.', position='in piedi')
E('shoulder-taps', 'Tocchi di spalla in plank', 'plank shoulder taps', ['calisthenics', 'surf'], ['addome', 'spalle', 'stabilità'],
  'In plank sulle mani, tocca con una mano la spalla opposta senza far oscillare il bacino, poi cambia.',
  ['Piedi più larghi per più stabilità', 'Bacino fermo', 'Lento e controllato'], easier='Ginocchia a terra.', position='a terra')
E('bear-crawl', 'Camminata dell\'orso', 'bear crawl', ['calisthenics', 'surf'], ['spalle', 'addome', 'coordinazione'],
  'In quadrupedia con le ginocchia sollevate di pochi centimetri, cammina avanti e indietro muovendo mano e piede opposti.',
  ['Schiena piatta', 'Ginocchia basse', 'Passi piccoli'], easier='Tieni solo la posizione con le ginocchia sollevate (bear hold).', position='a terra')

# ---------------------------------------------------------------- surf specifici
E('prone-ytw', 'Y-T-W a terra', 'prone Y T W raises', ['surf', 'desk', 'calisthenics'], ['scapole', 'cuffia dei rotatori', 'dorsale'],
  'Prono, fronte appoggiata su un asciugamano. Solleva le braccia formando una Y, poi una T, poi una W (gomiti piegati), tenendo ogni lettera 2 secondi.',
  ['Pollici verso il soffitto nella Y e nella T', 'Scapole verso il basso e verso la colonna', 'Collo rilassato: non sollevare la testa'], harder='Tieni 5 secondi per lettera.', position='a terra')
E('prone-paddle', 'Remata a secco', 'surf paddle training dry land', ['surf'], ['dorsali', 'spalle', 'schiena'],
  'Prono con il petto sollevato come sulla tavola, gambe unite e rilassate. Alterna le braccia simulando la bracciata: entra lungo davanti, spingi fino al fianco, esci e riparti.',
  ['Petto leggermente sollevato, sguardo avanti', 'Bracciata lunga fino al fianco', 'Ritmo regolare, respira'], easier='Petto appoggiato su un cuscino.', harder='Asciugamano sotto le mani su pavimento liscio, o elastico se lo hai.', position='a terra')
E('prone-swimmer', 'Nuotatore a terra', 'prone swimmers', ['surf', 'calisthenics'], ['scapole', 'spalle', 'dorsale'],
  'Prono con braccia avanti sollevate da terra, porta le mani dietro la schiena disegnando un arco largo e torna avanti, senza toccare terra.',
  ['Braccia sollevate per tutto il movimento', 'Mobilità dalla spalla, non forzare', 'Fronte appoggiata o appena sollevata'], position='a terra')
E('external-rotation-iso', 'Rotazione esterna isometrica al muro', 'isometric shoulder external rotation wall', ['surf', 'desk'], ['cuffia dei rotatori'],
  'Di lato al muro, gomito piegato a 90° vicino al fianco e dorso della mano contro il muro (asciugamano tra gomito e fianco). Spingi la mano contro il muro al 50% della forza e mantieni.',
  ['Gomito incollato al fianco', 'Spinta costante, non massimale', 'Spalla bassa'], perSide=True, position='in piedi')
E('pop-up-slow', 'Pop-up in tre tempi', 'surf pop up step by step', ['surf'], ['tutto il corpo', 'tecnica'],
  'Prono con le mani accanto al petto. 1) Spingi il busto in su come un cobra. 2) Porta il piede dietro sotto il corpo. 3) Porta il piede davanti tra le mani e alzati in posizione di surf, ginocchia piegate e braccia aperte.',
  ['Mani sotto il petto, non sotto le spalle', 'Piede davanti al centro, tra le mani', 'Arriva basso e stabile, sguardo avanti'],
  caution='Scegli il tuo piede avanti (regular: sinistro, goofy: destro) e resta coerente.', position='a terra')
E('pop-up', 'Pop-up', 'surf pop up drill', ['surf'], ['tutto il corpo', 'esplosività'],
  'Da prono con le mani accanto al petto, spingi forte e porta entrambi i piedi sotto di te in un unico movimento, atterrando in posizione di surf.',
  ['Spinta esplosiva delle braccia', 'Atterraggio silenzioso', 'Controlla la posizione: piedi sulla linea centrale, ginocchia piegate, sguardo avanti'],
  easier='Pop-up in tre tempi.', harder='Chiudi gli occhi all\'arrivo per 2 secondi.', position='a terra')
E('push-up-to-cobra', 'Piegamento + cobra', 'push up to cobra surf', ['surf', 'yoga'], ['petto', 'tricipiti', 'colonna'],
  'Scendi a terra con un piegamento controllato (anche sulle ginocchia), poi dalla posizione prona apri il petto in un cobra e torna in plank. È il primo tempo del pop-up.',
  ['Discesa controllata', 'Cobra breve, poi spingi', 'Ginocchia a terra se serve'], position='a terra')
E('surf-stance-squat', 'Squat in posizione di surf', 'surf stance squat', ['surf'], ['gambe', 'equilibrio'],
  'Piedi in posizione di surf (uno avanti, uno dietro, di lato), un po\' più larghi delle spalle. Scendi e risali mantenendo il peso centrato e le braccia pronte.',
  ['Ginocchia verso l\'interno della "tavola"', 'Busto sopra i piedi', 'Sguardo nella direzione di marcia'], perSide=True, position='in piedi')
E('rotational-lunge', 'Affondo con rotazione', 'lunge with rotation', ['surf', 'calisthenics'], ['gambe', 'rotazione', 'addome'],
  'Fai un affondo in avanti e ruota il busto verso la gamba davanti, braccia tese. Torna al centro e rialzati.',
  ['Ginocchio stabile mentre il busto ruota', 'Ruota dal petto', 'Espira nella rotazione'], perSide=True, position='in piedi')
E('squat-jump', 'Squat con salto', 'squat jump', ['surf', 'calisthenics'], ['gambe', 'esplosività'],
  'Da mezzo squat salta verso l\'alto e atterra morbido tornando in squat.',
  ['Atterraggio silenzioso, ginocchia allineate', 'Braccia che aiutano la spinta', 'Recupera bene: qualità prima di quantità'],
  easier='Squat veloce sulle punte senza staccare.', caution='Solo senza dolori a ginocchia o caviglie e con muscoli già riscaldati.', position='in piedi')
E('skater-hop', 'Saltelli laterali (pattinatore)', 'skater hops', ['surf', 'calisthenics'], ['gambe', 'equilibrio', 'esplosività'],
  'Salta di lato da un piede all\'altro, atterra su una gamba e stabilizza un istante prima di ripartire.',
  ['Atterraggio morbido e controllato', 'Ginocchio in linea', 'Più distanza solo quando l\'atterraggio è stabile'], easier='Passo laterale senza salto.', position='in piedi')
E('single-leg-balance', 'Equilibrio su una gamba', 'single leg balance', ['surf', 'yoga', 'desk', 'recovery'], ['equilibrio', 'caviglie'],
  'In piedi su una gamba con il ginocchio morbido. Mantieni la stabilità; se è facile, muovi le braccia o gira la testa.',
  ['Piede "a treppiede": tallone, alluce, mignolo', 'Bacino livellato', 'Vicino a un muro per sicurezza'], harder='Occhi chiusi o su un cuscino.', perSide=True, position='in piedi')
E('cossack-squat', 'Squat cosacco', 'cossack squat', ['surf', 'mobility'], ['anche', 'adduttori', 'gambe'],
  'Gambe molto larghe, scendi su un lato piegando il ginocchio mentre l\'altra gamba resta tesa con la punta verso l\'alto. Poi passa all\'altro lato.',
  ['Tallone della gamba piegata a terra', 'Petto alto', 'Scendi solo quanto riesci'], easier='Tieniti a un appoggio davanti.', position='in piedi')
E('deep-squat-hold', 'Tenuta in squat profondo', 'deep squat hold', ['surf', 'mobility', 'recovery'], ['anche', 'caviglie'],
  'Scendi in uno squat profondo e resta, aiutandoti tenendo un appoggio davanti se serve. Muoviti dolcemente da un lato all\'altro.',
  ['Talloni a terra se possibile', 'Petto aperto', 'Respira e rilassati nella posizione'], position='in piedi')
E('sprawl', 'Sprawl', 'sprawl exercise', ['surf', 'calisthenics'], ['tutto il corpo', 'cardio'],
  'In piedi, appoggia le mani a terra e porta indietro i piedi fino al plank, poi riporta i piedi tra le mani e rialzati. Simula il ritorno veloce sulla tavola.',
  ['Schiena neutra', 'Atterra morbido con i piedi', 'Ritmo sostenuto ma pulito'], easier='Porta indietro un piede alla volta.', position='in piedi')
E('towel-pullover', 'Pullover a terra con asciugamano', 'floor towel pullover', ['surf'], ['dorsali', 'addome'],
  'Supino a ginocchia piegate, tieni un asciugamano teso tra le mani sopra il petto. Porta le braccia dietro la testa fin dove mantieni la schiena a terra, poi tira indietro l\'asciugamano verso il petto.',
  ['Asciugamano sempre teso: tira verso l\'esterno', 'Costole giù', 'Lento in entrambe le direzioni'], equipment=['asciugamano'], position='a terra')

import json, sys
if __name__ == '__main__':
    json.dump(EX, sys.stdout, ensure_ascii=False, indent=1)
