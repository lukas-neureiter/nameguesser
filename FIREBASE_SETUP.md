# Firebase-Setup für Nameguesser

## Verwendete Firebase-Dienste

Die App verwendet ausschließlich:

- Firebase Authentication mit Benutzername/Passwort über den
  Email/Password-Provider
- Cloud Firestore für Profile, persönliche Personen, Lernfortschritt und
  Teamfreigaben
- Firebase Hosting für die gebaute Vite-App

Firebase Storage, Cloud Functions und das Admin SDK werden nicht verwendet.
Die Web-Konfiguration liegt in `src/lib/firebase.ts`. Über `getApps()` und
`getApp()` wird eine doppelte Firebase-Initialisierung verhindert.

## Authentifizierung

In der Oberfläche gibt es nur Benutzername und Passwort. Intern wird der
Benutzername normalisiert und in eine technische Auth-Adresse umgewandelt:

```text
normalizeUsername(username) + "@nameguesser.invalid"
```

Die Normalisierung entfernt Leerzeichen am Anfang und Ende, wandelt den Namen
in Kleinbuchstaben um und erlaubt nur `a-z`, `0-9`, Punkt, Bindestrich und
Unterstrich. Die technische Adresse wird in der App nicht angezeigt.

Bei der Registrierung werden Benutzername, Passwort und Team-Code abgefragt.
Der Team-Code wird getrimmt und kleingeschrieben. Anschließend entsteht das
Profil `users/{uid}`:

```text
username: string
teamId: string
createdAt: timestamp
```

Die App beobachtet den Auth-Status mit `onAuthStateChanged`. Ohne aktive
Anmeldung wird nur die Anmelde-/Registrierungsansicht gerendert. Es gibt
bewusst keinen Passwort-Reset und keine E-Mail-Verifikation.

Das Profilmenü verwendet ausschließlich aus dem Benutzernamen gebildete
Initialen. Es wird kein Profilbild gespeichert oder geladen. Im Menü können
Benutzername, Passwort und Team geändert, der gesamte Lernfortschritt
zurückgesetzt, das Konto gelöscht und die Sitzung beendet werden.

Beim Ändern des Benutzernamens wird nach erneuter Passwortbestätigung auch die
interne Auth-Adresse aktualisiert. Beim Passwortwechsel wird das aktuelle
Passwort ebenfalls erneut geprüft. Ein Teamwechsel entfernt die eigenen
Freigaben aus dem bisherigen Team; die persönliche Personenliste bleibt
erhalten.

Beim Löschen des Profils bestätigt der Benutzer die Aktion mit seinem
aktuellen Passwort. Danach entfernt die App die persönlichen Personen, die
eigenen Freigaben im aktuellen Team, das Firestore-Profil und abschließend das
Firebase-Auth-Konto.

## Firestore-Datenstruktur

### Persönliche Personen

Jeder Benutzer besitzt seine vollständig unabhängige Liste unter:

```text
users/{uid}/people/{personId}
```

Ein Dokument enthält:

```text
firstName: string
lastName: string
imageData: string
correctCount: integer
wrongCount: integer
learningLevel: number (0 bis 100)
lastReviewed: timestamp | null
sourceShareId: string | null
createdAt: timestamp
```

Quizantworten aktualisieren nur `correctCount`, `wrongCount`,
`learningLevel` und `lastReviewed` per `updateDoc`. Die aggregierten
Statistiken werden ausschließlich aus diesen persönlichen Dokumenten
berechnet.

### Teamfreigaben

Teamfreigaben liegen unter:

```text
teams/{teamId}/sharedPeople/{shareId}
```

Die Freigabe-ID ist stabil:

```text
{uid}_{originalPersonId}
```

Dadurch kann dieselbe persönliche Person nicht mehrfach als unterschiedliche
Freigabe angelegt werden. Persönliche Kopien mit `sourceShareId` dürfen weder
in der Oberfläche noch durch die Security Rules erneut geteilt werden. Das
Dokument enthält:

```text
firstName: string
lastName: string
imageData: string
sharedByUid: string
sharedByName: string
originalPersonId: string
createdAt: timestamp
```

Beim Übernehmen einer Teamfreigabe wird eine neue persönliche Kopie mit
zurückgesetztem Lernstand erstellt. Ihre Dokument-ID lautet
`shared_{shareId}` und `sourceShareId` enthält die Freigabe-ID. Diese stabile
ID verhindert ein mehrfaches Übernehmen derselben Freigabe.

Eine persönliche Kopie und die Teamfreigabe bleiben unabhängig. Das Löschen
der persönlichen Person löscht weder die Teamfreigabe noch Kopien anderer
Benutzer. Es gibt keine automatische Synchronisierung.

Eigene Teamfreigaben können im Bereich „Vom Team geteilt“ wieder entfernt
werden. Andere Teammitglieder können eine fremde Freigabe nicht löschen.

Um unnötige Firestore-Reads zu vermeiden, wird die Collection
`sharedPeople` erst beim Öffnen des Personenbereichs beobachtet. Seltene
Profilaktionen laden die dafür notwendigen Freigaben nur einmalig und
gezielt. Persönliche Personen bleiben geladen, weil Startseite, Quiz und
Statistik diese Daten unmittelbar benötigen.

## Bildverarbeitung

Ausgewählte Bilder werden vollständig im Browser verarbeitet:

1. Der Browser-Dekoder berücksichtigt die Bildausrichtung, soweit unterstützt.
2. In einem lokalen Dialog wählt der Benutzer per Verschieben und Zoom einen
   quadratischen Ausschnitt. Der Standard ist ein mittig zentrierter Ausschnitt.
3. Erst nach der Bestätigung wird der gewählte Ausschnitt verarbeitet; bis
   dahin kommt das Bild nicht mit Firebase in Berührung.
4. Die Ausgabe ist maximal 320 × 320 Pixel groß.
5. Zuerst wird WebP mit Qualität `0.7` versucht.
6. Die Qualität wird schrittweise bis `0.2` reduziert, bis ungefähr 80 KB
   erreicht sind.
7. Unterstützt der Browser kein WebP, wird JPEG verwendet.
8. Ist das Ergebnis weiterhin größer als 120 KB, wird es nicht gespeichert und
   eine verständliche Fehlermeldung angezeigt.

Das Ergebnis wird als Data URL im Feld `imageData` gespeichert. Während der
Verarbeitung und beim Speichern sind die betreffenden Aktionen gesperrt, damit
kein doppeltes Speichern durch Mehrfachklicks entsteht.

## Security Rules und Indexierung

`firestore.rules` setzt unter anderem durch:

- kein Zugriff ohne Anmeldung
- Benutzerprofile nur für die jeweilige UID
- Profiländerungen und Profil löschen nur für die jeweilige UID
- `createdAt` des Profils bleibt bei Änderungen unverändert
- persönliche Personen ausschließlich für ihren Besitzer
- Teamfreigaben nur für Benutzer mit passender `teamId`
- Erstellen einer Freigabe nur mit der eigenen UID als `sharedByUid`
- übernommene Personen mit `sourceShareId` dürfen nicht erneut geteilt werden
- Ändern oder Löschen einer Freigabe nur durch `sharedByUid`
- feste Feldlisten, sinnvolle Datentypen, Zähler größer oder gleich null,
  `learningLevel` zwischen 0 und 100 und begrenzte Bildgröße
- stabile Dokument-IDs für Teamfreigaben und übernommene Kopien

`firestore.indexes.json` schließt `imageData` in den Collection Groups
`people` und `sharedPeople` von Single-Field-Indexes aus.

## Einmalige manuelle Schritte

1. In der Firebase Console unter **Authentication → Sign-in method** den
   Provider **Email/Password** aktivieren.
2. Regeln und Indexkonfiguration veröffentlichen:

   ```powershell
   firebase deploy --only firestore:rules,firestore:indexes
   ```

3. Die App bauen:

   ```powershell
   npm run build
   ```

4. Firebase Hosting veröffentlichen:

   ```powershell
   firebase deploy --only hosting
   ```

Alternativ können Firestore-Konfiguration und Hosting gemeinsam veröffentlicht
werden:

```powershell
firebase deploy --only firestore:rules,firestore:indexes,hosting
```

Team-Codes sind beim MVP lediglich übereinstimmende, kleingeschriebene Codes.
Ein Teamwechsel ist im Profil möglich; es gibt weiterhin keine Einladungen,
Rollen oder Teamverwaltung.
