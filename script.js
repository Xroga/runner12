on
{
  "html": "<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Run & Follow — Real Human Runner</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            touch-action: none;
        }
        body {
            background: #1a1a2e;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            overflow: hidden;
        }
        .game-wrapper {
            background: #16213e;
            border-radius: 20px;
            padding: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        canvas {
            display: block;
            width: 100%;
            max-width: 400px;
            height: auto;
            aspect-ratio: 400 / 600;
            border-radius: 12px;
            background: #2d3436;
            cursor: pointer;
            touch-action: none;
        }
        .controls-info {
            color: #dfe6e9;
            text-align: center;
            margin-top: 12px;
            font-size: 14px;
            opacity: 0.8;
        }
        .controls-info span {
            display: inline-block;
            margin: 0 10px;
            padding: 4px 12px;
            background: #0f3460;
            border-radius: 20px;
            font-size: 13px;
        }
        @media (max-width: 420px) {
            .game-wrapper {
                padding: 8px;
                border-radius: 12px;
            }
            .controls-info {
                font-size: 12px;
            }
        }
    </style>
</head>
<body>
<div class="game-wrapper">
    <canvas id="gameCanvas" width="400" height="600"></canvas>
    <div class="controls-info">
        <span>⬅️ Swipe Left</span>
        <span>⬆️ Tap / Swipe Up</span>
        <span>➡️ Swipe Right</span>
    </div>
</div>
<script>
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const W = 400, H = 600;

    const LANE_COUNT = 3;
    const LANE_WIDTH = W / LANE_COUNT;
    const PLAYER_WIDTH = 40;
    const PLAYER_HEIGHT = 60;

    let player = {
        lane: 1,
        x: 0,
        y: H - 100,
        targetLane: 1,
        moving: false,
        moveProgress: 0,
        runFrame: 0,
        runTimer: 0
    };
    player.x = player.lane * LANE_WIDTH + (LANE_WIDTH - PLAYER_WIDTH) / 2;

    let obstacles = [];
    let score = 0;
    let gameOver = false;
    let gameStarted = false;
    let frameCount = 0;
    let spawnTimer = 0;
    let spawnInterval = 60;

    let touchStartX = 0;
    let touchStartY = 0;
    let isTouching = false;
    const SWIPE_THRESHOLD = 30;

    function drawHuman(x, y, w, h, runFrame) {
        const cx = x + w / 2;
        const headRadius = 10;
        const headY = y + 8;
        const torsoTop = y + 18;
        const torsoBottom = y + 40;
        const torsoWidth = 18;

        const skin = '#FFD5B8';
        const shirt = '#3366FF';
        const pants = '#333333';
        const shoe = '#222222';

        const legSwing = Math.sin(runFrame * 0.3) * 12;
        const leftLegAngle = legSwing;
        const rightLegAngle = -legSwing;

        ctx.save();

        ctx.strokeStyle = pants;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 5, torsoBottom);
        ctx.lineTo(cx - 5 + leftLegAngle * 0.5, y + 58);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx + 5, torsoBottom);
        ctx.lineTo(cx + 5 + rightLegAngle * 0.5, y + 58);
        ctx.stroke();

        ctx.fillStyle = shoe;
        ctx.beginPath();
        ctx.ellipse(cx - 5 + leftLegAngle * 0.5, y + 60, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 5 + rightLegAngle * 0.5, y + 60, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = shirt;
        ctx.beginPath();
        ctx.roundRect(cx - torsoWidth/2, torsoTop, torsoWidth, torsoBottom - torsoTop, 4);
        ctx.fill();

        const armSwing = Math.sin(runFrame * 0.3) * 15;
        ctx.strokeStyle = skin;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(cx - torsoWidth/2, torsoTop + 4);
        ctx.lineTo(cx - torsoWidth/2 - 8 - armSwing * 0.3, torsoTop + 20);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx + torsoWidth/2, torsoTop + 4);
        ctx.lineTo(cx + torsoWidth/2 + 8 + armSwing * 0.3, torsoTop + 20);
        ctx.stroke();

        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.arc(cx, headY, headRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4a3728';
        ctx.beginPath();
        ctx.arc(cx, headY - 3, headRadius - 1, Math.PI, 0);
        ctx.fill();

        ctx.fillStyle = '#2d3436';
        ctx.beginPath();
        ctx.arc(cx - 3, headY - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 3, headY - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, headY + 3, 3, 0.1, Math.PI - 0.1);
        ctx.stroke();

        ctx.restore();
    }

    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r);
        this.lineTo(x + w, y + h - r);
        this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.lineTo(x + r, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r);
        this.lineTo(x, y + r);
        this.quadraticCurveTo(x, y, x + r, y);
        return this;
    };

    function resetGame() {
        player.lane = 1;
        player.targetLane = 1;
        player.moving = false;
        player.moveProgress = 0;
        player.x = player.lane * LANE_WIDTH + (LANE_WIDTH - PLAYER_WIDTH) / 2;
        player.y = H - 100;
        obstacles = [];
        score = 0;
        gameOver = false;
        gameStarted = true;
        spawnTimer = 0;
        frameCount = 0;
        spawnInterval = 60;
    }

    function spawnObstacle() {
        const lane = Math.floor(Math.random() * LANE_COUNT);
        const obsWidth = 30;
        const obsHeight = 30;
        const x = lane * LANE_WIDTH + (LANE_WIDTH - obsWidth) / 2;
        obstacles.push({
            x: x,
            y: -obsHeight,
            width: obsWidth,
            height: obsHeight,
            lane: lane,
            speed: 3 + score * 0.02
        });
    }

    function movePlayerLeft() {
        if (gameOver) return;
        if (player.lane > 0 && !player.moving) {
            player.targetLane = player.lane - 1;
            player.moving = true;
            player.moveProgress = 0;
        }
    }

    function movePlayerRight() {
        if (gameOver) return;
        if (player.lane < LANE_COUNT - 1 && !player.moving) {
            player.targetLane = player.lane + 1;
            player.moving = true;
            player.moveProgress = 0;
        }
    }

    function update() {
        if (!gameStarted || gameOver) return;

        frameCount++;

        player.runTimer++;
        if (player.runTimer > 3) {
            player.runFrame++;
            player.runTimer = 0;
        }

        if (player.moving) {
            player.moveProgress += 0.08;
            if (player.moveProgress >= 1) {
                player.moveProgress = 1;
                player.moving = false;
                player.lane = player.targetLane;
            }
            const startX = player.lane * LANE_WIDTH + (LANE_WIDTH - PLAYER_WIDTH) / 2;
            const endX = player.targetLane * LANE_WIDTH + (LANE_WIDTH - PLAYER_WIDTH) / 2;
            player.x = startX + (endX - startX) * player.moveProgress;
        }

        spawnTimer++;
        if (spawnTimer >= spawnInterval) {
            spawnObstacle();
            spawnTimer = 0;
            if (spawnInterval > 25) spawnInterval -= 0.5;
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.y += obs.speed;
            if (obs.y > H) {
                obstacles.splice(i, 1);
                score++;
            }
        }

        const px = player.x;
        const py = player.y;
        const pw = PLAYER_WIDTH;
        const ph = PLAYER_HEIGHT;

        for (let obs of obstacles) {
            if (px < obs.x + obs.width &&
                px + pw > obs.x &&
                py < obs.y + obs.height &&
                py + ph > obs.y) {
                gameOver = true;
                break;
            }
        }
    }

    function drawBackground() {
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = '#636e72';
        ctx.lineWidth = 2;
        ctx.setLineDash([15, 20]);
        for (let i = 1; i < LANE_COUNT; i++) {
            const x = i * LANE_WIDTH;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        ctx.strokeStyle = '#b2bec3';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.lineTo(2, H);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(W - 2, 0);
        ctx.lineTo(W - 2, H);
        ctx.stroke();
    }

    function draw() {
        drawBackground();

        for (let obs of obstacles) {
            ctx.fillStyle = '#e74c3c';
            ctx.shadowColor = '#c0392b';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 6);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(obs.x + 4, obs.y + 4, obs.width - 8, 4);
            ctx.fillRect(obs.x + 4, obs.y + obs.height - 8, obs.width - 8, 4);
        }

        drawHuman(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT, player.runFrame);

        ctx.fillStyle = '#dfe6e9';
        ctx.font = 'bold 20px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('🏃 ' + Math.floor(score), 15, 35);

        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#ff7675';
            ctx.font = 'bold 36px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', W/2, H/2 - 20);
            ctx.fillStyle = '#dfe6e9';
            ctx.font = '18px "Segoe UI", sans-serif';
            ctx.fillText('Tap to restart', W/2, H/2 + 30);
        }

        if (!gameStarted) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 28px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🏃 Run & Follow', W/2, H/2 - 40);
            ctx.font = '18px "Segoe UI", sans-serif';
            ctx.fillText('Swipe left/right to change lanes', W/2, H/2 + 10);
            ctx.fillText('Tap to start', W/2, H/2 + 50);
        }
    }

    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a') {
            e.preventDefault();
            movePlayerLeft();
        }
        if (e.key === 'ArrowRight' || e.key === 'd') {
            e.preventDefault();
            movePlayerRight();
        }
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (!gameStarted) resetGame();
            else if (gameOver) resetGame();
        }
    });

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isTouching = true;

        if (!gameStarted) {
            resetGame();
            return;
        }
        if (gameOver) {
            resetGame();
            return;
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!isTouching || gameOver || !gameStarted) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;

        if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
            if (deltaX > 0) {
                movePlayerRight();
            } else {
                movePlayerLeft();
            }
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        isTouching = false;
    }, { passive: false });

    gameLoop();
</script>
</body>
</html>",
  "css": "",
  "js": ""
}