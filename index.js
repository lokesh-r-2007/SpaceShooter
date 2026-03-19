// SPACE DEFENDER - Advanced Game Engine with Coins, Weapons & Shop

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startBtn = document.getElementById('startBtn');
const shopBtn = document.getElementById('shopBtn');
const scoreEl = document.getElementById('score');
const coinsEl = document.getElementById('coins');
const waveEl = document.getElementById('wave');
const weaponTypeEl = document.getElementById('weaponType');
const shopMenu = document.getElementById('shopMenu');
const closeShop = document.getElementById('closeShop');
const gameOverScreen = document.getElementById('gameOverScreen');
const restartBtn = document.getElementById('restartBtn');

// Audio Context
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Game State
let gameRunning = false;
let score = 0;
let coins = localStorage.getItem('spaceDefenderCoins') ? parseInt(localStorage.getItem('spaceDefenderCoins')) : 0;
let wave = 1;
let keys = {};
let particles = [];
let accuracy = 100;
let totalShots = 0;
let hitShots = 0;

// Starfield
const stars = [];
for (let i = 0; i < 150; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.5
    });
}

// Player with spaceship visual
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 80,
    width: 50,
    height: 60,
    speed: 7,
    bullets: []
};

// Weapons system
const weapons = {
    basic: { name: 'BASIC', owned: true, cost: 0, fireRate: 150, pattern: 'single', damage: 1 },
    dual: { name: 'DUAL', owned: false, cost: 500, fireRate: 130, pattern: 'dual', damage: 1 },
    triple: { name: 'TRIPLE', owned: false, cost: 1500, fireRate: 140, pattern: 'triple', damage: 1 },
    laser: { name: 'LASER', owned: false, cost: 3000, fireRate: 200, pattern: 'single', damage: 3 }
};

let currentWeapon = 'basic';
let upgrades = {
    speed: { level: 0, cost: 500, name: 'Speed Boost' }
};

let enemies = [];
let waveEnemiesKilled = 0;
let waveEnemiesSpawned = 0;
let enemyTimer = 0;
let waveTimer = 0;

// Event Listeners
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

startBtn.addEventListener('click', startGame);
shopBtn.addEventListener('click', () => shopMenu.classList.remove('hidden'));
closeShop.addEventListener('click', () => shopMenu.classList.add('hidden'));
restartBtn.addEventListener('click', startGame);

// Shop weapon buying
document.querySelectorAll('.weapon-card.buyable').forEach(card => {
    card.querySelector('.buy-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const weaponKey = card.dataset.weapon;
        buyWeapon(weaponKey);
    });
});

// Upgrade buttons
document.getElementById('upgradeSpeed').addEventListener('click', () => buyUpgrade('speed'));

function buyWeapon(weaponKey) {
    const weapon = weapons[weaponKey];
    if (coins >= weapon.cost) {
        coins -= weapon.cost;
        weapon.owned = true;
        currentWeapon = weaponKey;
        weaponTypeEl.textContent = weapon.name;
        coinsEl.textContent = coins;
        localStorage.setItem('spaceDefenderCoins', coins);
        updateShopUI();
        playSound('purchase');
    } else {
        playSound('error');
    }
}

function buyUpgrade(upgradeKey) {
    const upgrade = upgrades[upgradeKey];
    if (coins >= upgrade.cost) {
        coins -= upgrade.cost;
        upgrade.level++;
        upgrade.cost = Math.floor(upgrade.cost * 1.5);
        coinsEl.textContent = coins;
        localStorage.setItem('spaceDefenderCoins', coins);
        
        if (upgradeKey === 'speed') {
            player.speed = 7 + upgrade.level * 1.5;
        }
        updateShopUI();
        playSound('purchase');
    } else {
        playSound('error');
    }
}

function updateShopUI() {
    document.querySelectorAll('.weapon-card').forEach(card => {
        if (card.classList.contains('buyable')) {
            const weaponKey = card.dataset.weapon;
            if (weapons[weaponKey].owned) {
                card.classList.remove('buyable');
                card.querySelector('.weapon-cost').textContent = 'OWNED';
                card.querySelector('.buy-btn').style.display = 'none';
            }
        }
    });
    
    document.getElementById('upgradeSpeed').textContent = `+${upgrades.speed.cost}`;
    document.getElementById('upgradeShield').textContent = `+${upgrades.shield.cost}`;
}

function startGame() {
    if (gameRunning) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    gameRunning = true;
    score = 0;
    wave = 1;
    waveEnemiesKilled = 0;
    waveEnemiesSpawned = 0;
    totalShots = 0;
    hitShots = 0;
    accuracy = 100;
    player.x = canvas.width / 2 - 25;
    player.y = canvas.height - 80;
    player.bullets = [];
    enemies = [];
    particles = [];
    enemyTimer = 0;
    waveTimer = 0;
    
    startBtn.style.display = 'none';
    shopBtn.style.display = 'none';
    gameOverScreen.classList.add('hidden');
    shopMenu.classList.add('hidden');
    
    updateUI();
    playSound('gameStart');
    gameLoop();
}

function gameLoop() {
    if (!gameRunning) return;
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    updateStars();
    
    // Player movement
    if (keys['arrowleft'] || keys['a']) player.x -= player.speed;
    if (keys['arrowright'] || keys['d']) player.x += player.speed;
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    
    if (keys[' '] || keys['space']) fireBullet();
    
    // Update bullets
    player.bullets = player.bullets.filter(b => {
        b.y -= b.speed;
        b.hit = false;
        return b.y > -b.height;
    });
    
    // Spawn enemies
    waveTimer++;
    const spawnRate = Math.max(25, 75 - wave * 3);
    if (waveTimer > spawnRate && waveEnemiesSpawned < 5 + wave * 3) {
        waveTimer = 0;
        spawnEnemy();
    }
    
    // Update enemies
    enemies.forEach((enemy, ei) => {
        enemy.y += enemy.speed;
        
        let hitByBullet = false;
        player.bullets.forEach((b, bi) => {
            if (collision(b, enemy)) {
                hitByBullet = true;
                b.hit = true;
                enemy.health -= weapons[currentWeapon].damage;
                
                if (enemy.health <= 0) {
                    createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                    playSound('explosion');
                    const coinReward = 10 + wave * 5;
                    coins += coinReward;
                    score += 10 * wave;
                    waveEnemiesKilled++;
                    hitShots++;
                    enemies.splice(ei, 1);
                }
            }
        });
        
        if (enemy.y > canvas.height) {
            playSound('fail');
            endGame();
        }
    });
    
    player.bullets = player.bullets.filter(b => !b.hit);
    
    // Wave completion
    if (waveEnemiesSpawned >= 5 + wave * 3 && enemies.length === 0) {
        nextWave();
    }
    
    // Update particles
    particles = particles.filter(p => {
        p.y += p.vy;
        p.x += p.vx;
        p.life--;
        return p.life > 0;
    });
    
    if (totalShots > 0) accuracy = (hitShots / totalShots) * 100;
    updateUI();
}

function draw() {
    // Background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0a0a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Starfield
    drawStars();
    
    // Draw player spaceship
    drawPlayer();
    
    // Draw bullets
    ctx.fillStyle = '#00ff00';
    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = 15;
    player.bullets.forEach(b => {
        ctx.fillRect(b.x, b.y, b.width, b.height);
    });
    ctx.shadowBlur = 0;
    
    // Draw enemies
    enemies.forEach(e => drawEnemy(e));
    
    // Draw particles
    particles.forEach(p => {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1;
    });
    
    // Wave info
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 14px Courier New';
    ctx.fillText(`Remaining: ${5 + wave * 3 - waveEnemiesSpawned}`, 20, canvas.height - 20);
}

function drawPlayer() {
    // Main fuselage
    ctx.fillStyle = '#ff8800';
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x + player.width, player.y + player.height * 0.7);
    ctx.lineTo(player.x + player.width - 5, player.y + player.height);
    ctx.lineTo(player.x + player.width / 2, player.y + player.height * 0.85);
    ctx.lineTo(player.x + 5, player.y + player.height);
    ctx.lineTo(player.x, player.y + player.height * 0.7);
    ctx.closePath();
    ctx.fill();
    
    // Glow
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y - 5);
    ctx.lineTo(player.x + player.width + 5, player.y + player.height * 0.7);
    ctx.lineTo(player.x + player.width - 5, player.y + player.height + 5);
    ctx.lineTo(player.x + player.width / 2, player.y + player.height * 0.85 + 5);
    ctx.lineTo(player.x + 5, player.y + player.height + 5);
    ctx.lineTo(player.x - 5, player.y + player.height * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Thrusters
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;
    const thrustOffset = Math.sin(Date.now() / 50) * 3;
    ctx.fillRect(player.x + 8, player.y + player.height - 5, 8, 10 + thrustOffset);
    ctx.fillRect(player.x + player.width - 16, player.y + player.height - 5, 8, 10 + thrustOffset);
    ctx.shadowBlur = 0;
}

function drawEnemy(enemy) {
    // Enemy ship (cyan)
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(enemy.x + enemy.width / 2, enemy.y);
    ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height * 0.6);
    ctx.lineTo(enemy.x + enemy.width - 3, enemy.y + enemy.height);
    ctx.lineTo(enemy.x + enemy.width / 2, enemy.y + enemy.height * 0.8);
    ctx.lineTo(enemy.x + 3, enemy.y + enemy.height);
    ctx.lineTo(enemy.x, enemy.y + enemy.height * 0.6);
    ctx.closePath();
    ctx.fill();
    
    // Health bar
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(enemy.x, enemy.y - 8, enemy.width, 3);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(enemy.x, enemy.y - 8, (enemy.health / 100) * enemy.width, 3);
}

function fireBullet() {
    const now = Date.now();
    const fireRate = weapons[currentWeapon].fireRate;
    
    if (!player.lastShot || now - player.lastShot > fireRate) {
        const weapon = weapons[currentWeapon];
        
        if (weapon.pattern === 'single') {
            player.bullets.push({
                x: player.x + player.width / 2 - 2,
                y: player.y - 10,
                width: 4,
                height: 10,
                speed: 9
            });
        } else if (weapon.pattern === 'dual') {
            player.bullets.push({
                x: player.x + 5,
                y: player.y - 10,
                width: 4,
                height: 10,
                speed: 9
            });
            player.bullets.push({
                x: player.x + player.width - 9,
                y: player.y - 10,
                width: 4,
                height: 10,
                speed: 9
            });
        } else if (weapon.pattern === 'triple') {
            player.bullets.push({
                x: player.x + player.width / 2 - 2,
                y: player.y - 10,
                width: 4,
                height: 10,
                speed: 9
            });
            player.bullets.push({
                x: player.x + 5,
                y: player.y - 10,
                width: 4,
                height: 10,
                speed: 9,
                vx: -2
            });
            player.bullets.push({
                x: player.x + player.width - 9,
                y: player.y - 10,
                width: 4,
                height: 10,
                speed: 9,
                vx: 2
            });
        }
        
        totalShots++;
        player.lastShot = now;
        playSound('shoot');
    }
}

function spawnEnemy() {
    const size = Math.max(25, 40 - wave);
    const x = Math.random() * (canvas.width - size);
    const speed = Math.min(4, 1.5 + wave * 0.4);
    enemies.push({
        x,
        y: -size,
        width: size,
        height: size,
        speed,
        health: 100
    });
    waveEnemiesSpawned++;
}

function nextWave() {
    wave++;
    waveEnemiesKilled = 0;
    waveEnemiesSpawned = 0;
    waveTimer = 0;
    playSound('waveComplete');
}

function endGame() {
    gameRunning = false;
    startBtn.style.display = '';
    shopBtn.style.display = '';
    startBtn.textContent = 'PLAY AGAIN';
    localStorage.setItem('spaceDefenderCoins', coins);
    showGameOver();
}

function showGameOver() {
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalWave').textContent = wave;
    document.getElementById('finalCoins').textContent = coins;
    document.getElementById('finalAccuracy').textContent = accuracy.toFixed(1);
    gameOverScreen.classList.remove('hidden');
}

function createExplosion(x, y) {
    for (let i = 0; i < 15; i++) {
        const angle = (Math.PI * 2 * i) / 15;
        const speed = 3 + Math.random() * 3;
        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 3 + Math.random() * 4,
            color: ['#ffff00', '#ff8800', '#ff00ff'][Math.floor(Math.random() * 3)],
            life: 35,
            maxLife: 35
        });
    }
}

function collision(r1, r2) {
    return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height && r1.y + r1.height > r2.y;
}

function updateUI() {
    scoreEl.textContent = score;
    coinsEl.textContent = coins;
    waveEl.textContent = wave;
    weaponTypeEl.textContent = weapons[currentWeapon].name;
}

function updateStars() {
    stars.forEach(s => {
        s.y += 0.5;
        if (s.y > canvas.height) {
            s.y = 0;
            s.x = Math.random() * canvas.width;
        }
    });
}

function drawStars() {
    stars.forEach(s => {
        ctx.globalAlpha = s.opacity;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(s.x, s.y, s.size, s.size);
        ctx.globalAlpha = 1;
    });
}

// Advanced Sound System
function playSound(type) {
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        switch(type) {
            case 'shoot':
                osc.frequency.value = 800;
                gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.05);
                break;
            case 'explosion':
                osc.frequency.setValueAtTime(200, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.2);
                gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.2);
                break;
            case 'waveComplete':
                osc.frequency.value = 1200;
                gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.4);
                break;
            case 'fail':
                osc.frequency.setValueAtTime(500, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.4);
                gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.4);
                break;
            case 'purchase':
                osc.frequency.setValueAtTime(600, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.1);
                break;
            case 'error':
                osc.frequency.value = 200;
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.15);
                break;
            case 'gameStart':
                osc.frequency.setValueAtTime(400, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.3);
                gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.3);
                break;
        }
    } catch (e) {
        console.log('Audio error:', e);
    }
}

// Initialize UI
updateUI();
updateShopUI();
coinsEl.textContent = coins;
