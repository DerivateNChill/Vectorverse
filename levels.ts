import { LevelConfig } from './types';

/**
 * HINWEIS FÜR LEHRKRÄFTE:
 * Hier können Sie die Levels anpassen.
 * - Koordinaten sind im Raster (z.B. x: 5, y: -3).
 * - Das Spielfeld geht von ca. -10 bis +10.
 */

export const LEVELS: LevelConfig[] = [
  {
    id: 0,
    title: "Freies Spiel: Sandbox",
    description: "Experimentiere frei mit Vektoren! Klicke auf das Spielfeld, um eigene Ziele zu setzen.",
    hint: "Klicke irgendwo hin, um eine Ziel-Münze zu platzieren.",
    mechanics: {
      allowAdd: true,
      allowSubtract: true,
      allowScalar: true,
      isOrtsvektorOnly: false,
      hasMonster: false
    },
    isSandbox: true,
    startPos: { x: 0, y: 0 },
    objects: [],
    eduContent: {
      concept: "Freies Experimentieren",
      explanation: "Hier gibt es keine Regeln. Du kannst beliebige Vektoren addieren, subtrahieren und skalieren.\n\nKlicke auf das Spielfeld, um dir selbst Ziele zu setzen und versuche, sie zu erreichen.",
      diagramType: 'linear-comb'
    }
  },
  {
    id: 1,
    title: "Level 1: Ortsvektoren",
    description: "Willkommen im VectorVerse! Sammle die Münzen ein.",
    hint: "Ortsvektoren starten immer im Ursprung (0,0). Gib die Koordinaten des Ziels ein.",
    mechanics: {
      allowAdd: true,
      allowSubtract: false,
      allowScalar: false,
      isOrtsvektorOnly: true, // Reset to 0,0 after every move
      hasMonster: false
    },
    startPos: { x: 0, y: 0 },
    objects: [
      { id: 'l1_c1', x: 4, y: 3, type: 'coin' },
      { id: 'l1_c2', x: -5, y: 2, type: 'coin' },
      { id: 'l1_c3', x: 2, y: -6, type: 'coin' }
    ],
    eduContent: {
        concept: "Punkt vs. Vektor",
        explanation: "Mathematisch unterscheiden wir oft nicht streng zwischen dem Punkt P(x|y) und seinem Ortsvektor.\n\nDidaktisch hilft aber folgende Vorstellung:\n• Ein Punkt ist eine 'Adresse' (Wo ist das Ziel?).\n• Ein Vektor ist eine 'Wegbeschreibung' (Wie komme ich vom Ursprung dorthin?).\n\nDer Ortsvektor zeigt immer vom Ursprung (0|0) direkt auf den Punkt.",
        formula: "\\vec{v} = \\vec{OP} = \\begin{pmatrix} x \\\\ y \\end{pmatrix}",
        example: "Um zum Punkt P(4|3) zu kommen, gehen wir 4 Schritte nach rechts und 3 nach oben.",
        diagramType: 'position-vector'
    }
  },
  {
    id: 2,
    title: "Level 2: Vektoraddition",
    description: "Jetzt bilden wir eine Kette aus Vektoren.",
    hint: "Dein neuer Vektor startet dort, wo der letzte aufgehört hat (Spitze an Fuß).",
    mechanics: {
      allowAdd: true,
      allowSubtract: false,
      allowScalar: false,
      isOrtsvektorOnly: false,
      hasMonster: false
    },
    startPos: { x: 0, y: 0 },
    objects: [
      { id: 'l2_c1', x: 3, y: 0, type: 'coin' }, // Easy start
      { id: 'l2_c2', x: 6, y: 4, type: 'coin' }, // Requires adding
      { id: 'l2_c3', x: 2, y: 4, type: 'coin' }  // Go back a bit? Or calculate direct.
    ],
    eduContent: {
        concept: "Vektoraddition (Kettenregel)",
        explanation: "Vektoren werden 'Spitze an Fuß' aneinandergereiht. Das bedeutet: Du startest den zweiten Pfeil dort, wo der erste aufgehört hat.\n\nDas Ergebnis der Addition (Summenvektor) ist die direkte 'Abkürzung' vom allerersten Startpunkt zur allerletzten Spitze.\n\nMan rechnet einfach komponentenweise: 'Oben plus Oben' und 'Unten plus Unten'.",
        formula: "\\vec{a} + \\vec{b} = \\begin{pmatrix} a_x \\\\ a_y \\end{pmatrix} + \\begin{pmatrix} b_x \\\\ b_y \\end{pmatrix} = \\begin{pmatrix} a_x + b_x \\\\ a_y + b_y \\end{pmatrix}",
        example: "Vektor (3, 0) + Vektor (3, 4) ergibt den neuen Gesamtvektor (6, 4).",
        diagramType: 'vector-addition'
    }
  },
  {
    id: 3,
    title: "Level 3: Addition & Subtraktion",
    description: "Die Eingabe negativer Zahlen ist hier gesperrt!",
    hint: "Du kannst keine negativen Zahlen eingeben. Um 'zurück' zu gehen, musst du den Modus auf 'Subtrahieren' ändern.",
    mechanics: {
      allowAdd: true,
      allowSubtract: true,
      allowScalar: false,
      isOrtsvektorOnly: false,
      hasMonster: false
    },
    constraints: {
      allowNegativeInput: false // FORCE usage of Subtraction button
    },
    startPos: { x: 0, y: 0 },
    objects: [
      { id: 'l3_c1', x: 5, y: 3, type: 'coin' }, // Add (5,3)
      { id: 'l3_c2', x: 2, y: 1, type: 'coin' }  // From (5,3) to (2,1) needs (-3, -2). User MUST use Subtract (3,2).
    ],
    eduContent: {
        concept: "Subtraktion & Gegenvektor",
        explanation: "Mathematisch ist 'a minus b' eigentlich 'a plus (Gegenvektor von b)'.\n\nDer Gegenvektor -b hat die gleiche Länge wie b, zeigt aber in die genau entgegengesetzte Richtung. Wenn du im Spiel 'Subtrahieren' wählst, drehen wir den Pfeil für dich um.\n\nDies ist wichtig für Verbindungsvektoren: Um von A nach B zu kommen, rechnet man immer 'Ziel minus Start' (B - A).",
        formula: "\\vec{a} - \\vec{b} = \\vec{a} + (-\\vec{b}) = \\begin{pmatrix} a_x - b_x \\\\ a_y - b_y \\end{pmatrix}",
        example: "Statt (-3, -2) einzugeben, wähle 'Subtrahieren' und gib (3, 2) ein.",
        diagramType: 'vector-subtraction'
    }
  },
  {
    id: 4,
    title: "Level 4: Skalare Vielfache",
    description: "Die Vektoreingabe ist auf kleine Zahlen begrenzt (Max 3).",
    hint: "Die Ziele sind zu weit weg für kleine Vektoren. Nutze den Skalar-Faktor (λ), um den Vektor zu verlängern!",
    mechanics: {
      allowAdd: true,
      allowSubtract: true,
      allowScalar: true,
      isOrtsvektorOnly: false,
      hasMonster: false
    },
    constraints: {
      maxInputValue: 3 // FORCE usage of Scalar to reach distant points
    },
    startPos: { x: 0, y: 0 },
    objects: [
      { id: 'l4_c1', x: 9, y: 6, type: 'coin' }, // Need (3,2) * 3
      { id: 'l4_c2', x: -4, y: 0, type: 'coin' } // Need (2,0) * -2 or Subtract (2,0)*2
    ],
    eduContent: {
        concept: "Skalarmultiplikation",
        explanation: "Wenn man einen Vektor mit einer normalen Zahl (einem 'Skalar' λ) malnimmt, ändert man seine Länge, aber nicht seine Richtung (außer bei negativen Zahlen).\n\n• |λ| > 1: Der Vektor wird gestreckt (länger).\n• |λ| < 1: Der Vektor wird gestaucht (kürzer).\n• λ < 0: Die Richtung kehrt sich um (Gegenrichtung).",
        formula: "\\lambda \\cdot \\vec{a} = \\lambda \\cdot \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} \\lambda x \\\\ \\lambda y \\end{pmatrix}",
        example: "3 · (3, 2) = (9, 6). Der Pfeil wird dreimal so lang.",
        diagramType: 'scalar-mult'
    }
  },
  {
    id: 5,
    title: "Level 5: Meisterprüfung",
    description: "Nutze alle Werkzeuge, um den Parcours zu lösen.",
    hint: "Kombiniere Addition, Subtraktion und Skalare geschickt.",
    mechanics: {
      allowAdd: true,
      allowSubtract: true,
      allowScalar: true,
      isOrtsvektorOnly: false,
      hasMonster: false
    },
    constraints: {
        maxInputValue: 4 // Mild constraint to encourage scalars still
    },
    startPos: { x: 0, y: 0 },
    objects: [
      { id: 'l5_c1', x: 0, y: 8, type: 'coin' },
      { id: 'l5_c2', x: 5, y: 0, type: 'coin' },
      { id: 'l5_c3', x: 0, y: -5, type: 'coin' },
      { id: 'l5_c4', x: -5, y: 0, type: 'coin' }
    ],
    eduContent: {
        concept: "Linearkombination",
        explanation: "Jeder Vektor im Raum kann aus anderen Vektoren zusammengesetzt werden. Das nennt man Linearkombination.\n\nDas ist wie ein Rezept: 'Nimm 2 mal Vektor a und ziehe 3 mal Vektor b ab'. Damit kann man jeden Punkt erreichen, solange die Vektoren nicht parallel sind.",
        formula: "\\vec{v} = r \\cdot \\vec{a} + s \\cdot \\vec{b}",
        example: "Der Weg zu P(2|3) kann zusammengesetzt sein aus 2·(1|0) + 3·(0|1).",
        diagramType: 'linear-comb'
    }
  },
  {
    id: 6,
    title: "BOSS: Der Vektor-Verschlinger",
    description: "Besiege das Monster! Sammle Energie (blau) für Munition.",
    hint: "Sammle blaue Blitze für Munition. Wähle dann 'SCHIESSEN' und ziele mit einem Vektor auf das Monster.",
    mechanics: {
      allowAdd: true,
      allowSubtract: true,
      allowScalar: true,
      isOrtsvektorOnly: false,
      hasMonster: true
    },
    startPos: { x: -8, y: -8 },
    objects: [
       { id: 'boss', x: 5, y: 5, type: 'monster', hp: 3, maxHp: 3 },
       { id: 'ammo1', x: 0, y: 0, type: 'ammo' },
       { id: 'ammo2', x: -5, y: 5, type: 'ammo' },
       { id: 'ammo3', x: 5, y: -5, type: 'ammo' }
    ],
    eduContent: {
        concept: "Der Verbindungsvektor",
        explanation: "Das Wichtigste im Spiel (und in der Physik): Wie komme ich von A nach B?\n\nDer Vektor, der zwei Punkte verbindet, ist immer die Differenz 'Ziel minus Start'. Merke dir: 'Spitze minus Fuß'.\n\nWenn du auf das Monster schießt, ist dein Vektor also: Monster-Position minus Deine-Position.",
        formula: "\\vec{AB} = \\vec{B} - \\vec{A} = \\begin{pmatrix} b_x - a_x \\\\ b_y - a_y \\end{pmatrix}",
        example: "Ich bin bei (2|2), Monster bei (5|5). Schuss = (5-2, 5-2) = (3, 3).",
        diagramType: 'velocity'
    }
  },
  // --- ADVANCED MATH LEVELS ---
  {
    id: 7,
    title: "Level 7: Einheitsvektoren",
    description: "Bestimme den Einheitsvektor (Länge 1) in Richtung des angezeigten Vektors.",
    hint: "Teile den Vektor durch seine Länge: v₀ = v / |v|.",
    mechanics: { allowAdd: true, allowSubtract: true, allowScalar: true, isOrtsvektorOnly: true, hasMonster: false },
    startPos: { x: 0, y: 0 },
    objects: [
       { id: 'l7_c1', x: 0.8, y: 0.6, type: 'coin' } // Unit vector of (4,3)
    ],
    staticVisuals: [
        { type: 'vector', x: 0, y: 0, dx: 4, dy: 3, color: 'rgba(255,255,255,0.3)', label: 'v' }
    ],
    tutorial: {
        title: "Einheitsvektoren",
        text: "Ein Einheitsvektor v₀ hat immer die Länge 1. Er zeigt nur die Richtung an.",
        variables: ["v₀ = v / |v|", "|v₀| = 1"],
        diagramType: "unit-vector"
    },
    eduContent: {
        concept: "Normierung (Einheitsvektor)",
        explanation: "Oft interessiert uns nur die Richtung, nicht die Entfernung. Dafür konstruieren wir einen Vektor der Länge 1, der in dieselbe Richtung zeigt.\n\nDas nennt man 'Normieren'. Man teilt den Vektor einfach durch seine eigene Länge (seinen Betrag).",
        formula: "\\vec{v}_0 = \\frac{1}{|\\vec{v}|} \\cdot \\vec{v} = \\begin{pmatrix} v_x / |\\vec{v}| \\\\ v_y / |\\vec{v}| \\end{pmatrix}",
        example: "Vektor (4, 3) hat Länge 5. Teile alles durch 5: (0.8, 0.6). Probe: 0.8² + 0.6² = 1.",
        diagramType: 'unit-vector'
    }
  },
  {
    id: 8,
    title: "Level 8: Normalvektoren",
    description: "Gib einen Vektor ein, der senkrecht (orthogonal) zur Geraden steht.",
    hint: "Das Skalarprodukt muss 0 sein: n · v = 0. Tausche Koordinaten und ändere ein Vorzeichen: (x, y) -> (-y, x).",
    mechanics: { allowAdd: true, allowSubtract: true, allowScalar: true, isOrtsvektorOnly: true, hasMonster: false },
    startPos: { x: 0, y: 0 },
    objects: [
       { id: 'l8_c1', x: -2, y: 4, type: 'coin' } // Normal to (4, 2) is (-2, 4) or (2, -4)
    ],
    staticVisuals: [
        { type: 'line', x: 0, y: 0, dx: 4, dy: 2, color: 'rgba(100, 200, 255, 0.4)', label: 'g' },
        { type: 'vector', x: 0, y: 0, dx: 4, dy: 2, color: 'rgba(255, 255, 255, 0.3)', label: 'v' }
    ],
    tutorial: {
        title: "Normalvektoren",
        text: "Ein Normalvektor n steht senkrecht auf einem Vektor v. Der Winkel beträgt 90°.",
        variables: ["n · v = 0", "v=(x, y) → n=(-y, x)"],
        diagramType: "normal-vector"
    },
    eduContent: {
        concept: "Orthogonalität & Der 2D-Trick",
        explanation: "Zwei Vektoren stehen senkrecht (orthogonal) aufeinander, wenn ihr Skalarprodukt Null ergibt.\n\nIm 2D-Raum gibt es einen einfachen Trick, um sofort einen Normalvektor zu finden: Vertausche x und y und ändere bei EINEM von beiden das Vorzeichen.\n\nWarum? Weil a·(-b) + b·(a) immer -ab + ab = 0 ist.",
        formula: "\\vec{v}=\\begin{pmatrix}x\\\\y\\end{pmatrix} \\Rightarrow \\vec{n}=\\begin{pmatrix}-y\\\\x\\end{pmatrix}",
        example: "Vektor (4, 2). Tausche → (2, 4). Vorzeichen → (-2, 4). Probe: 4·(-2) + 2·4 = -8+8 = 0.",
        diagramType: 'normal-vector'
    }
  },
  {
    id: 9,
    title: "Level 9: Skalarprodukt & Winkel",
    description: "Finde einen Vektor u, der mit v einen 90° Winkel bildet.",
    hint: "Auch hier hilft das Skalarprodukt. u · v = 0 bedeutet 90 Grad.",
    mechanics: { allowAdd: true, allowSubtract: true, allowScalar: true, isOrtsvektorOnly: true, hasMonster: false },
    startPos: { x: 0, y: 0 },
    objects: [
       { id: 'l9_c1', x: 3, y: 3, type: 'coin' } // Given v=(3, -3), u=(3,3) -> dot=9-9=0.
    ],
    staticVisuals: [
        { type: 'vector', x: 0, y: 0, dx: 3, dy: -3, color: 'rgba(255,255,255,0.3)', label: 'v' }
    ],
    tutorial: {
        title: "Winkel & Skalarprodukt",
        text: "Das Skalarprodukt verrät den Winkel. Ist es 0, stehen die Vektoren senkrecht.",
        variables: ["u · v = |u|·|v|·cos(α)", "u · v = 0 → α = 90°"],
        diagramType: "dot-product"
    },
    eduContent: {
        concept: "Skalarprodukt = Geometrie",
        explanation: "Das Skalarprodukt verbindet Vektoren mit Winkeln. Die Formel lautet: a · b = |a| · |b| · cos(α).\n\nBesonders wichtig sind die Vorzeichen:\n• Produkt > 0: Spitzer Winkel (< 90°)\n• Produkt = 0: Rechter Winkel (90°)\n• Produkt < 0: Stumpfer Winkel (> 90°)",
        formula: "\\cos(\\alpha) = \\frac{\\vec{a} \\cdot \\vec{b}}{|\\vec{a}| \\cdot |\\vec{b}|}",
        example: "Test auf Orthogonalität ist am einfachsten: Einfach prüfen, ob das Skalarprodukt Null ist.",
        diagramType: 'dot-product'
    }
  },
  {
    id: 10,
    title: "Level 10: Geradenschnittpunkt",
    description: "Bewege dich zum Schnittpunkt der angezeigten Geraden g1 und deiner Bewegung.",
    hint: "Die angezeigte Gerade ist g(t) = (0, 5) + t*(1, -1). Wo triffst du sie?",
    mechanics: { allowAdd: true, allowSubtract: true, allowScalar: true, isOrtsvektorOnly: false, hasMonster: false },
    startPos: { x: -4, y: -1 }, // Start position
    objects: [
       { id: 'l10_c1', x: 2, y: 3, type: 'coin' } // Intersection of g1 and player path from (-4, -1) -> Target (2,3) fits g(2).
    ],
    staticVisuals: [
        { type: 'line', x: 0, y: 5, dx: 1, dy: -1, color: 'rgba(255, 100, 100, 0.5)', label: 'g₁' }
    ],
    tutorial: {
        title: "Geraden & Schnittpunkte",
        text: "Eine Gerade wird durch Stützvektor p und Richtungsvektor u definiert: g: x = p + t·u.",
        variables: ["g: x = p + t·u", "g₁ = g₂ → Schnittpunkt"],
        diagramType: "lines"
    },
    eduContent: {
        concept: "Geraden in Parameterform",
        explanation: "Eine Gerade im Vektorraum ist wie ein Weg, den man unendlich lang laufen kann.\n• Stützvektor p: Der Startpunkt.\n• Richtungsvektor u: Die Schrittrichtung.\n• Parameter t: Wie viele Schritte man macht.\n\nEin Schnittpunkt existiert dort, wo zwei Geraden denselben Punkt erreichen.",
        formula: "\\vec{x} = \\vec{p} + t \\cdot \\vec{u} = \\begin{pmatrix} p_x \\\\ p_y \\end{pmatrix} + t \\cdot \\begin{pmatrix} u_x \\\\ u_y \\end{pmatrix}",
        example: "g: (0, 5) + t·(1, -1). Für t=2 landet man bei (0+2, 5-2) = (2, 3).",
        diagramType: 'lines'
    }
  },
  {
    id: 11,
    title: "Level 11: Abstand Punkt-Gerade",
    description: "Bestimme den kürzesten Abstand (Lot) von P zur Geraden g.",
    hint: "Der kürzeste Weg ist immer senkrecht zur Geraden (Lotvektor).",
    mechanics: { allowAdd: true, allowSubtract: true, allowScalar: true, isOrtsvektorOnly: false, hasMonster: false },
    startPos: { x: 3, y: 5 }, // Point P
    objects: [
       { id: 'l11_c1', x: 5, y: 3, type: 'coin' } // Lotfußpunkt on line g: x=(2,0) + r(1,1). g passes (5,3). Connection (3,5)->(5,3) is (2,-2). Dir (1,1). Dot (2,-2)*(1,1) = 0.
    ],
    staticVisuals: [
        { type: 'line', x: 2, y: 0, dx: 1, dy: 1, color: 'rgba(100, 255, 100, 0.4)', label: 'g' },
        { type: 'point', x: 3, y: 5, color: '#fff', label: 'P' }
    ],
    tutorial: {
        title: "Abstände & Lot",
        text: "Der Abstand eines Punktes zu einer Geraden ist die Länge des Lotvektors (senkrecht zur Geraden).",
        variables: ["d = |PF|", "PF ⊥ u"],
        diagramType: "distance"
    },
    eduContent: {
        concept: "Lotfußpunktverfahren",
        explanation: "Der kürzeste Abstand zu einer Geraden ist immer der direkte Weg im 90°-Winkel (das Lot).\n\nWir suchen einen Punkt F auf der Geraden, sodass der Verbindungsvektor PF senkrecht zur Geraden steht. Das bedeutet: Das Skalarprodukt von PF und dem Richtungsvektor der Geraden muss 0 sein.",
        formula: "(\\vec{F} - \\vec{P}) \\cdot \\vec{u}_{Gerade} = 0",
        example: "Man stellt eine Gleichung auf mit dem laufenden Punkt F_t auf der Geraden und löst nach t auf.",
        diagramType: 'distance'
    }
  }
];