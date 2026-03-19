# Space Defender (Space Shooter)

A fast-paced browser arcade shooter built with HTML5 canvas, JavaScript, and CSS.

## Overview

- Design: Top-down space shooter with starfield background.
- Player controls a spaceship at the bottom of the screen.
- Shoot waves of enemies and collect coins.
- Earn score and discover progressively harder waves.
- In-game shop for weapon upgrades and speed boosts.
- Persistent coins stored in `localStorage` between sessions.

## Features

- Smooth animation using `requestAnimationFrame`.
- Player movement using keyboard controls.
- Weapon types:
  - BASIC (single shot, default)
  - DUAL (two bullets)
  - TRIPLE (spread shot)
  - LASER (high damage single beam)
- Upgrade system:
  - Speed Boost (increases ship speed)
- Game HUD: coins, score, wave, weapon type.
- Game over/score summary with accuracy, final wave, and coins.
- Visual effects: particle explosions and glow rendering.

## Controls

- Move left: `ArrowLeft` or `A`
- Move right: `ArrowRight` or `D`
- Shoot: `Space`
- Start game / Play again: on-screen `START GAME` / `PLAY AGAIN` button
- Open shop: `SHOP` button
- Close shop: `✕` button in shop menu

## How to run

1. Open `index.html` in a web browser (Chrome/Edge/Firefox).
2. Click `START GAME`.
3. Use left/right and shoot to clear each wave.
4. Earn coins to unlock weapons in the shop.

## Files

- `index.html` – game layout and UI.
- `index.css` – style for game HUD, shop, game over screen, and canvas.
- `index.js` – game logic, rendering, controls, weapon and enemy behaviors.

## Notes

- Coins are saved in browser `localStorage` under key `spaceDefenderCoins`.
- The game ends if an enemy reaches the bottom of the canvas.
- Wave difficulty increases each time all enemies are defeated.