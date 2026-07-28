# Namen lernen

Mobile-first Lernapp, mit der neue Mitarbeitende Gesichter und Namen in kurzen
Multiple-Choice-Runden lernen können.

## Enthalten

- Foto → Name und Name → Foto
- Vorname, Nachname oder vollständiger Name
- Runden mit 5, 10, 20 oder unbegrenzt vielen Fragen
- adaptive Auswahl mit schneller Wiederholung schwieriger Personen
- sofortiges Antwortfeedback und Rundenauswertung
- responsive Desktopansicht und kompakte mobile Bedienung
- dezente, barrierearme Übergangs- und Feedbackanimationen
- Statistik und filterbare Personenübersicht
- versionierte, fehlertolerante Speicherung im Browser
- zwölf vollständig fiktive Demo-Personen

## Entwicklung

```bash
npm install
npm run dev
```

Qualitätschecks:

```bash
npm run lint
npm run build
```

## Mitarbeitende und Fotos austauschen

Die Stammdaten liegen in `src/data/employees.ts`. Die Demo-Porträts sind als
lokaler Sprite in `public/employee-portraits.jpg` gebündelt und werden über
`src/components/Avatar.tsx` zugeschnitten. Beim späteren Anschluss echter
Firmendaten sollten Bildquelle und Stammdaten durch eine datenschutzkonforme,
zugriffsgeschützte Quelle ersetzt werden.

Der Lernstand liegt ausschließlich im Local Storage des jeweiligen Browsers.
Ohne Login gibt es bewusst keine Synchronisierung zwischen Geräten.
