on
{
  "html": "<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Run & Follow — XROGA</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: #0b0e1a;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: 'Segoe UI', system-ui, sans-serif;
            overflow: hidden;
        }
        canvas {
            display: block;
            background: #1a1f2e;
            border: 2px solid #2e3a5e;
            border-radius: 12px;
            box-shadow: 0 0 40px rgba(0, 200, 255, 0.15);
            image-rendering: pixelated;
        }
        #ui-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        #start-screen, #gameover-screen {
            pointer-events: auto;
            background: rgba(11, 14, 26, 0.88);
            backdrop-filter: blur(6px);
            padding: 2rem 3rem;
            border-radius: 24px;
            border: 1px solid #3e4e7a;
            text-align: center;
            color: #e0e8ff;
            box-shadow: 0 0 60px rgba(0, 180, 255, 0.2);
            display: none;
        }
        #start-screen.active, #gameover-screen.active { display: block; }
        #start-screen h1 {
            font-size: 2.8rem;
            font-weight: 700;
            letter-spacing: 2px;
            background: linear-gradient(135deg, #6ee7ff, #3b82f6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }
        #start-screen p { font-size: 1.1rem; opacity: 0.8; margin-bottom: 1.5rem; }
        #start-screen .key-hint {
            display: inline-block;
            background: #2a3450;
            padding: 0.4rem 1.2rem;
            border-radius: 40px;
            font-size: 1rem;
            border: 1px solid #4a5a8a;
            margin: 0.3rem;
        }
        .btn {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            border: none;
            color: white;
            font-size: 1.3rem;
            font-weight: 600;
            padding: 0.8rem 2.4rem;
            border-radius: 60px;
            cursor: pointer;
            pointer-events: auto;
            transition: all 0.2s;
            box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
            margin-top: 1rem;
        }
        .btn:hover { transform: scale(1.04); box-shadow: 0 6px 30px rgba(59, 130, 246, 0.6); }
        #gameover-screen h2 { font-size: 2.2rem; color: #f87171; margin-bottom: 0.3rem; }
        #gameover-screen .final-score { font-size: 2rem; font-weight: 700; color: #fbbf24; margin: 0.5rem 0; }
        #gameover-screen p { opacity: 0.7; margin-bottom: 0.5rem; }
        #score-display {
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            color: #c8d6ff;
            font-size: 1.6rem;
            font-weight: 700;
            text-shadow: 0 0 20px rgba(0, 150, 255, 0.3);
            background: rgba(11, 14, 26, 0.6);
            padding: 0.3rem 1.5rem;
            border-radius: 40px;
            border: 1px solid #3a4a7a;
            backdrop-filter: blur(4px);
            pointer-events: none;
            z-index: 10;
        }
        #score-display span { color: #fbbf24; }
    </style>
</head>
<body>

<canvas id="gameCanvas" width="480" height="720"></canvas>

<div id="ui-overlay">
    <div id="start-screen" class="active">
        <h1>🏃 RUN & FOLLOW</h1>
        <p>Follow the green arrow. Dodge the red.</p>
        <div style="margin: 1rem 0;">
            <span class="key-hint">← Left</span>
            <span class="key-hint">→ Right</span>
        </div>
        <p style="font-size:0.9rem; opacity:0.6;">Coins in red = risk & reward</p>
        <button class="btn" id="startBtn">▶  START</button>
    </div>

    <div id="gameover-screen">
        <h2>💥 TRIPPED!</h2>
        <div class="final-score" id="finalScore">0</div>
        <p>steps survived</p>
        <button class="btn" id="restartBtn">🔄  RUN AGAIN</button>
    </div>

    <div id="score-display">🏆 <span id="scoreValue">0</span></div>
</div>

<script>
    (function() {
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const W = 480, H = 720;
        canvas.width = W; canvas.height = H;

        const startScreen = document.getElementById('start-screen');
        const gameoverScreen = document.getElementById('gameover-screen');
        const scoreSpan = document.getElementById('scoreValue');
        const finalScoreSpan = document.getElementById('finalScore');
        const startBtn = document.getElementById('startBtn');
        const restartBtn = document.getElementById('restartBtn');

        let gameRunning = false;
        let gameOverFlag = false;
        let score = 0;
        let frameCount = 0;
        let speed = 1.0;
        let baseObstacleSpeed = 2.8;
        let laneWidth = 120;
        let laneOffset = 60;

        let player = {
            lane: 1,
            x: 0,
            y: 580,
            bobPhase: 0,
            width: 36,
            height: 52
        };

        let obstacles = [];
        let coins = [];
        let safeLane = 1;
        let dangerLane = 0;
        let arrowTimer = 0;
        let arrowInterval = 90;

        function getLaneCenterX(laneIndex) {
            return laneOffset + laneIndex * laneWidth + laneWidth / 2;
        }

        function initGame() {
            gameRunning = true;
            gameOverFlag = false;
            score = 0;
            frameCount = 0;
            speed = 1.0;
            arrowInterval = 90;
            obstacles = [];
            coins = [];
            player.lane = 1;
            player.x = getLaneCenterX(1);
            player.y = 580;
            player.bobPhase = 0;

            safeLane = Math.floor(Math.random() * 3);
            do {
                dangerLane = Math.floor(Math.random() * 3);
            } while (dangerLane === safeLane);
            arrowTimer = 0;

            startScreen.classList.remove('active');
            gameoverScreen.classList.remove('active');
            scoreSpan.textContent = '0';
        }

        function spawnObstacle() {
            const lane = dangerLane;
            const x = getLaneCenterX(lane) - 20;
            const y = -60;
            const w = 40;
            const h = 40;
            obstacles.push({ x, y, w, h, lane: lane, active: true });
        }

        function spawnCoin() {
            const lane = dangerLane;
            const x = getLaneCenterX(lane) - 12;
            const y = -40;
            const r = 14;
            coins.push({ x, y, r, lane: lane, collected: false });
        }

        function updateGame() {
            if (!gameRunning || gameOverFlag) return;

            frameCount++;

            if (frameCount % 30 === 0) {
                score++;
                scoreSpan.textContent = score;
            }

            if (frameCount % 120 === 0 && speed < 3.2) {
                speed += 0.12;
                if (arrowInterval > 30) {
                    arrowInterval = Math.max(30, arrowInterval - 4);
                }
            }

            arrowTimer++;
            if (arrowTimer >= arrowInterval) {
                arrowTimer = 0;
                let newSafe = safeLane;
                while (newSafe === safeLane) {
                    newSafe = Math.floor(Math.random() * 3);
                }
                safeLane = newSafe;
                for (let i = 0; i < 3; i++) {
                    if (i !== safeLane) {
                        dangerLane = i;
                        break;
                    }
                }
                spawnObstacle();
                if (Math.random() < 0.45) {
                    spawnCoin();
                }
            }

            for (let i = obstacles.length - 1; i >= 0; i--) {
                const obs = obstacles[i];
                obs.y += baseObstacleSpeed * speed;
                if (obs.y > H + 80) {
                    obstacles.splice(i, 1);
                }
            }

            for (let i = coins.length - 1; i >= 0; i--) {
                const coin = coins[i];
                coin.y += baseObstacleSpeed * speed * 0.9;
                if (coin.y > H + 60) {
                    coins.splice(i, 1);
                }
            }

            player.bobPhase += 0.12 * speed;
            player.x = getLaneCenterX(player.lane);

            for (let i = 0; i < obstacles.length; i++) {
                const obs = obstacles[i];
                if (!obs.active) continue;
                if (obs.lane === player.lane) {
                    const px = player.x - player.width/2;
                    const py = player.y - player.height/2;
                    const pw = player.width;
                    const ph = player.height;
                    if (px < obs.x + obs.w && px + pw > obs.x &&
                        py < obs.y + obs.h && py + ph > obs.y) {
                        triggerGameOver();
                        return;
                    }
                }
            }

            for (let i = coins.length - 1; i >= 0; i--) {
                const coin = coins[i];
                if (coin.collected) continue;
                if (coin.lane === player.lane) {
                    const dx = player.x - coin.x;
                    const dy = player.y - coin.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 32) {
                        coin.collected = true;
                        score += 5;
                        scoreSpan.textContent = score;
                        coins.splice(i, 1);
                    }
                }
            }
        }

        function triggerGameOver() {
            gameOverFlag = true;
            gameRunning = false;
            finalScoreSpan.textContent = score;
            gameoverScreen.classList.add('active');
        }

        function renderGame() {
            ctx.clearRect(0, 0, W, H);

            ctx.fillStyle = '#1a1f2e';
            ctx.fillRect(0, 0, W, H);

            ctx.strokeStyle = '#3a4a6a';
            ctx.lineWidth = 2;
            ctx.setLineDash([12, 16]);
            for (let i = 1; i < 3; i++) {
                const x = laneOffset + i * laneWidth;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, H);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            for (let i = 0; i < 3; i++) {
                const cx = getLaneCenterX(i);
                const color = (i === safeLane) ? 'rgba(34, 197, 94, 0.08)' : 
                              (i === dangerLane) ? 'rgba(239, 68, 68, 0.08)' : 'transparent';
                ctx.fillStyle = color;
                ctx.fillRect(laneOffset + i * laneWidth, 0, laneWidth, H);
            }

            ctx.strokeStyle = 'rgba(200, 220, 255, 0.06)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 20; i++) {
                const y = (frameCount * speed * 2 + i * 40) % H;
                ctx.beginPath();
                ctx.moveTo(40, y);
                ctx.lineTo(W - 40, y);
                ctx.stroke();
            }

            for (let i = 0; i < 3; i++) {
                const cx = getLaneCenterX(i);
                if (i === safeLane) {
                    ctx.fillStyle = '#22c55e';
                    ctx.shadowColor = '#22c55e';
                    ctx.shadowBlur = 20;
                    ctx.beginPath();
                    ctx.moveTo(cx, 30);
                    ctx.lineTo(cx - 20, 70);
                    ctx.lineTo(cx + 20, 70);
                    ctx.closePath();
                    ctx.fill();
                    ctx.shadowBlur = 0;
                } else if (i === dangerLane) {
                    ctx.fillStyle = '#ef4444';
                    ctx.shadowColor = '#ef4444';
                    ctx.shadowBlur = 20;
                    ctx.beginPath();
                    ctx.moveTo(cx, 70);
                    ctx.lineTo(cx - 20, 30);
                    ctx.lineTo(cx + 20, 30);
                    ctx.closePath();
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }

            for (let i = 0; i < obstacles.length; i++) {
                const obs = obstacles[i];
                ctx.fillStyle = '#64748b';
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 12;
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#475569';
                ctx.fillRect(obs.x + 4, obs.y + 4, obs.w - 8, obs.h - 8);
            }

            for (let i = 0; i < coins.length; i++) {
                const coin = coins[i];
                ctx.fillStyle = '#fbbf24';
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 16;
                ctx.beginPath();
                ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(coin.x, coin.y, coin.r - 4, 0, Math.PI * 2);
                ctx.fill();
            }

            const px = player.x;
            const py = player.y + Math.sin(player.bobPhase) * 3;
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(px - 12, py - 30, 24, 30);
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(px, py - 36, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(px - 14, py + 2, 6, 16);
            ctx.fillRect(px + 8, py + 2, 6, 16);
        }

        function gameLoop() {
            updateGame();
            renderGame();
            requestAnimationFrame(gameLoop);
        }

        document.addEventListener('keydown', (e) => {
            if (!gameRunning || gameOverFlag) return;
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (player.lane > 0) player.lane--;
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (player.lane < 2) player.lane++;
            }
        });

        startBtn.addEventListener('click', initGame);
        restartBtn.addEventListener('click', initGame);

        gameLoop();
    })();
</script>
</body>
</html>",
  "css": "",
  "js": ""
}