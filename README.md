# OscarKings

OscarKings ospita **DuoMint 2.3.3**, un’estensione Chrome per analizzare le posizioni negli scacchi di Duolingo. Stockfish 19 FULL gira sul dispositivo e mostra sulla scacchiera la mossa suggerita e la valutazione della posizione.

## Demo — Stockfish 19 vs Oscar

<p align="center">
  <img src="./oscarkings-readme.gif" alt="OscarKings: real gameplay demonstration against Oscar with Stockfish 19" width="850">
</p>

<p align="center">
  <a href="./oscarkings-readme.mp4">Watch the MP4 demo</a>
</p>

Registrazione reale, ritagliata, accelerata 5× e senza audio. La demo riguarda una partita contro Oscar, non contro altri giocatori.

## Installazione

1. Da questa pagina scegli **Code → Download ZIP** ed estrai l’archivio.
2. Apri `chrome://extensions`, disattiva eventuali versioni precedenti di DuoMint e attiva la **Modalità sviluppatore**.
3. Scegli **Carica estensione non pacchettizzata** e seleziona la cartella che contiene `manifest.json`.
4. Riapri una lezione di scacchi o una partita contro Oscar. Nella barra delle estensioni la trovi con il nome **DuoMint**.

## Uso

Apri le opzioni di DuoMint per scegliere la velocità di ricerca, da **Turbo** (circa 0,6 secondi) a **Preciso** (circa 2,5 secondi). Il caricamento iniziale del motore richiede tempo aggiuntivo. Puoi attivare i suggerimenti, la mossa automatica nelle lezioni e contro Oscar, oppure la rivincita automatica contro Oscar. Se l’estensione muove per il colore sbagliato, imposta manualmente **Bianco** o **Nero**. Il campo **Stato Auto-move** mostra l’esito dell’ultimo tentativo.

## Avvertenza e limitazione di responsabilità

**OscarKings è un progetto indipendente, non ufficiale, senza affiliazione, approvazione o sponsorizzazione da parte di Duolingo.**

Il progetto è destinato alla sperimentazione tecnica e all'analisi scacchistica. Non è destinato a partite contro altri giocatori (PvP), ad aggirare le regole della piattaforma o a ottenere vantaggi sleali. Prima di utilizzarlo, verifica i termini di servizio e le regole applicabili.

Il software è fornito **così com'è**, senza garanzie espresse o implicite, nei limiti consentiti dalle licenze applicabili e dalla legge. L'utente è responsabile delle modalità di installazione, configurazione e utilizzo. Nei limiti consentiti dalla legge, gli autori e i manutentori declinano ogni responsabilità per uso improprio, danni, perdita di dati, sospensione o limitazione dell'account e altre conseguenze derivanti dall'uso del software. Nessuna clausola esclude responsabilità che non possano essere escluse per legge.

**English disclaimer:** OscarKings is an independent, unofficial project and is not affiliated with or endorsed by Duolingo. It is intended for technical experimentation and chess analysis, not PvP or unfair play. Users are responsible for complying with applicable platform rules and terms of service. The software is provided AS IS, without warranties, subject to applicable licenses and law. To the fullest extent permitted by law, authors and maintainers disclaim liability for misuse, damages, data loss, account restrictions or other consequences arising from use of the software. Nothing in this notice excludes liability that cannot lawfully be excluded.

## Crediti e licenze

- ChessMint © 2022 thedemons. [Licenza MIT](CHESSMINT-LICENSE.txt).
- Stockfish.js 19 di Chess.com e dei contributori di Stockfish. [Sorgenti della versione 19.0.0](https://github.com/nmrugg/stockfish.js/tree/v19.0.0) · [Licenza GPLv3](STOCKFISH-GPL-3.txt).
