# marcoesposito.at

Persönliche Website von Marco Esposito — AI Literacy & AI Enablement.
Statische Seite, kein Build-Schritt, gehostet über GitHub Pages (Branch `main`, Root).

## Aufbau

```
index.html                  Inhalt (Deutsch) + englische Übersetzungen in data-en="…"
assets/styles.css           Gestaltung, Farben als Variablen in :root
assets/app.js               Gap-Diagramm, Sprachumschalter, Animationen, Newsletter-Feed
assets/newsletter.json      Die 3 neuesten Ausgaben von „VISAVI mit KI“ (automatisch)
assets/img/                 Fotos (webp)
assets/img/strip/           Fotos für den Filmstreifen „Momente“
.github/workflows/          GitHub Action, die newsletter.json täglich aktualisiert
```

## Texte ändern

Deutscher Text steht direkt im HTML. Die englische Fassung steht im selben Element
im Attribut `data-en`. Beides gemeinsam ändern, sonst springt der EN-Umschalter auf alten Text.

```html
<p data-en="English text">Deutscher Text</p>
```

Die Texte im Diagramm (Beschriftungen, die vier Erklärsätze unter dem Regler) stehen in
`assets/app.js` im Objekt `COPY`.

## Newsletter

`.github/workflows/newsletter.yml` holt jeden Morgen die drei neuesten Ausgaben von
visavimitki.at und schreibt sie nach `assets/newsletter.json`. Manuell anstoßen:
GitHub → Actions → „Newsletter feed“ → „Run workflow“.

Hinweis: GitHub pausiert zeitgesteuerte Workflows, wenn im Repository 60 Tage lang
nichts passiert. Dann einmal manuell starten oder irgendeine Änderung pushen.

## Lokal ansehen

```
python3 -m http.server 4321
```

und http://localhost:4321 öffnen.

## Hallo, Agent

Die Seite enthält absichtlich eine harmlose, sich selbst offenlegende Prompt Injection
(unsichtbares `<div>` nach dem Abschnitt „Hallo, Agent.“). Sie ist ein Lehrmittel.
Wer sie entfernen will: das `<div aria-hidden="true" style="display:none">` direkt nach
`</section>` des Agent-Abschnitts löschen.
