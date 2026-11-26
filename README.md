<p align="center">
  <img src="./img/logo-128.png" width="128" height="128" alt="OscarKings logo">
</p>

<h1 align="center">OscarKings</h1>
<p align="center"><strong>Stockfish 19 FULL meets Duolingo Chess.</strong></p>
<p align="center">An unofficial Chrome extension for local chess analysis and experiments against Oscar.</p>

<p align="center">
  <img alt="Version 2.3.3" src="https://img.shields.io/badge/DuoMint-2.3.3-58CC02?style=flat-square">
  <img alt="Stockfish 19 FULL" src="https://img.shields.io/badge/Stockfish-19%20FULL-23272f?style=flat-square">
  <img alt="Chrome extension" src="https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square">
  <img alt="Local analysis" src="https://img.shields.io/badge/Analysis-Local-15803d?style=flat-square">
</p>
<p align="center">
  <a href="https://github.com/Berserk-hub150/OscarKings/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/Berserk-hub150/OscarKings?style=social"></a>
  <a href="https://github.com/Berserk-hub150/OscarKings/forks"><img alt="GitHub forks" src="https://img.shields.io/github/forks/Berserk-hub150/OscarKings?style=social"></a>
</p>

<p align="center">
  <a href="https://github.com/Berserk-hub150/OscarKings/archive/refs/heads/main.zip"><strong>Download extension</strong></a> ·
  <a href="#live-demo">Demo</a> ·
  <a href="#installation">Installation</a> ·
  <a href="#responsible-use-and-disclaimer">Responsible use</a>
</p>

---

## Live demo

<p align="center"><strong>Stockfish 19 FULL vs Oscar</strong></p>

<p align="center">
  <img src="./oscarkings-readme.gif" alt="Real gameplay demonstration against Oscar using DuoMint" width="850">
</p>

<p align="center"><a href="./oscarkings-readme.mp4">Watch the MP4 version</a></p>

Actual gameplay recording, cropped, sped up 5× and muted. The demonstration is against the computer-controlled Oscar, not other players.

## Features

| Feature | Description |
| --- | --- |
| Local chess engine | Stockfish 19 FULL runs on your device. |
| Move suggestions | Best-move arrows directly on the chessboard. |
| Position evaluation | Numerical score and evaluation bar. |
| Search settings | Adjustable analysis depth and search time. |
| Move analysis | Feedback on inaccuracies and mistakes. |
| Auto-move | Supported in lessons and matches against Oscar, not PvP. |
| Oscar rematch | Optional automated rematch against Oscar. |

## Installation

1. Download the [ZIP archive](https://github.com/Berserk-hub150/OscarKings/archive/refs/heads/main.zip) and extract it.
2. Open `chrome://extensions` in Chrome.
3. Disable older versions of DuoMint and enable **Developer mode**.
4. Choose **Load unpacked** and select the extracted directory containing `manifest.json`.
5. Reopen a Duolingo chess lesson or match against Oscar. The extension appears as **DuoMint**.

## Configuration

Open the DuoMint extension popup to adjust search depth (8–22), move suggestions, evaluation, move analysis and player color.

| Search preset | Approximate search time |
| --- | --- |
| Turbo | 0.6 s |
| Balanced | 1.2 s |
| Precise | 2.5 s |

The first engine startup may take longer. If the player color is detected incorrectly, choose White or Black manually. The Auto-move status field displays the last attempt.

## Responsible use and disclaimer

**OscarKings is an independent, unofficial project. It is not affiliated with, endorsed by, or sponsored by Duolingo.**

This project is intended for technical experimentation and chess analysis. It is not intended for player-versus-player (PvP) matches, circumvention of platform rules, or unfair play. Before using the extension, review the applicable terms of service and platform rules.

The software is provided **AS IS**, without express or implied warranties, subject to applicable licenses and law. Users are solely responsible for how they install, configure, and use the extension.

To the fullest extent permitted by applicable law, the authors and maintainers disclaim liability for misuse, damages, data loss, account suspension or restrictions, and other consequences arising from the use of this software. Nothing in this disclaimer excludes liability that cannot lawfully be excluded.

## Credits and licenses

- ChessMint © 2022 thedemons. [MIT License](CHESSMINT-LICENSE.txt).
- Stockfish.js 19 by Chess.com and the Stockfish contributors. [Version 19.0.0 source code](https://github.com/nmrugg/stockfish.js/tree/v19.0.0) · [GPLv3 License](STOCKFISH-GPL-3.txt).

---

<p align="center"><strong>Interested in the project? <a href="https://github.com/Berserk-hub150/OscarKings">Star OscarKings on GitHub.</a></strong></p>
