// 游戏常量
const GRAVITY = 0.5;
const JUMP_FORCE = -15;
const MOVE_SPEED = 5;
const DOUBLE_JUMP_FORCE = -12;

// 背景移动速度
const MOUNTAINS_SPEED = 0.5;
const TREES_SPEED = 1;
const GROUND_SPEED = 2;

// 游戏状态
let gameLoop;
let player;
let platforms = [];
let enemies = [];
let coins = [];
let mountainsX = 0;
let treesX = 0;
let groundX = 0;
let score = 0;
let gameOver = false;
let gameStarted = false; // 游戏是否已开始
let currentLevel = 1; // 当前关卡
let levelCompleted = false; // 关卡是否完成

// 对象池
let enemyPool = [];
let coinPool = [];

// 关卡数据
const levels = [
    // 第一关
    {
        platforms: [
            { x: 200, y: 350, width: 100, height: 20 },
            { x: 400, y: 300, width: 100, height: 20 },
            { x: 600, y: 250, width: 100, height: 20 }
        ],
        enemies: [
            { x: 250, y: 300, type: 'goomba' },
            { x: 450, y: 250, type: 'goomba' },
            { x: 650, y: 200, type: 'goomba' }
        ],
        coins: [
            { x: 220, y: 320 },
            { x: 260, y: 320 },
            { x: 420, y: 270 },
            { x: 460, y: 270 },
            { x: 620, y: 220 },
            { x: 660, y: 220 }
        ],
        endX: 800 // 关卡结束位置
    },
    // 第二关
    {
        platforms: [
            { x: 200, y: 350, width: 100, height: 20 },
            { x: 400, y: 350, width: 100, height: 20 },
            { x: 600, y: 350, width: 100, height: 20 },
            { x: 300, y: 250, width: 100, height: 20 },
            { x: 500, y: 250, width: 100, height: 20 },
            { x: 700, y: 250, width: 100, height: 20 }
        ],
        enemies: [
            { x: 250, y: 300, type: 'goomba' },
            { x: 450, y: 300, type: 'goomba' },
            { x: 650, y: 300, type: 'goomba' },
            { x: 350, y: 200, type: 'goomba' },
            { x: 550, y: 200, type: 'goomba' },
            { x: 750, y: 200, type: 'goomba' }
        ],
        coins: [
            { x: 220, y: 320 },
            { x: 260, y: 320 },
            { x: 420, y: 320 },
            { x: 460, y: 320 },
            { x: 620, y: 320 },
            { x: 660, y: 320 },
            { x: 320, y: 220 },
            { x: 360, y: 220 },
            { x: 520, y: 220 },
            { x: 560, y: 220 },
            { x: 720, y: 220 },
            { x: 760, y: 220 }
        ],
        endX: 1000 // 关卡结束位置
    },
    // 第三关
    {
        platforms: [
            { x: 200, y: 350, width: 100, height: 20 },
            { x: 400, y: 300, width: 100, height: 20 },
            { x: 600, y: 250, width: 100, height: 20 },
            { x: 800, y: 200, width: 100, height: 20 },
            { x: 1000, y: 150, width: 100, height: 20 }
        ],
        enemies: [
            { x: 250, y: 300, type: 'goomba' },
            { x: 450, y: 250, type: 'goomba' },
            { x: 650, y: 200, type: 'goomba' },
            { x: 850, y: 150, type: 'goomba' },
            { x: 1050, y: 100, type: 'goomba' }
        ],
        coins: [
            { x: 220, y: 320 },
            { x: 260, y: 320 },
            { x: 420, y: 270 },
            { x: 460, y: 270 },
            { x: 620, y: 220 },
            { x: 660, y: 220 },
            { x: 820, y: 170 },
            { x: 860, y: 170 },
            { x: 1020, y: 120 },
            { x: 1060, y: 120 }
        ],
        endX: 1200 // 关卡结束位置
    }
];

// 音效系统
let audioContext;
let sounds = {};

// 初始化音效
function initAudio() {
    try {
        // 创建音频上下文
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // 创建音效
        createSound('jump', [0, 0.1, 0.2, 0.3, 0.4], 0.1, 'square');
        createSound('coin', [0, 0.1, 0.2], 0.05, 'sine');
        createSound('squash', [0.3, 0.2, 0.1, 0], 0.1, 'sawtooth');
        createSound('gameover', [0.2, 0.1, 0, 0.1, 0.2, 0.3], 0.3, 'sine');
    } catch (e) {
        console.log('Web Audio API is not supported in this browser');
    }
}

// 创建简单的音效
function createSound(name, freqSteps, duration, type) {
    sounds[name] = { freqSteps, duration, type };
}

// 播放音效
function playSound(name) {
    if (!audioContext) return;

    try {
        const sound = sounds[name];
        if (!sound) return;

        // 创建振荡器
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = sound.type;
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // 设置音量包络
        const now = audioContext.currentTime;
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + sound.duration);

        // 播放频率步骤
        oscillator.start(now);

        sound.freqSteps.forEach((freq, i) => {
            oscillator.frequency.setValueAtTime(
                220 + freq * 220,
                now + (i * sound.duration / sound.freqSteps.length)
            );
        });

        oscillator.stop(now + sound.duration);
    } catch (e) {
        console.log('Error playing sound:', e);
    }
}

// 玩家类
class Player {
    constructor(x, y, canvas) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.canDoubleJump = false;
        this.canvas = canvas;
        this.distanceTraveled = 0; // 跟踪玩家移动的总距离

        // 动画相关属性
        this.sprites = {
            idle: new Image(),
            run: new Image(),
            jump: new Image()
        };
        this.sprites.idle.src = 'mario_idle.svg';
        this.sprites.run.src = 'mario_run.svg';
        this.sprites.jump.src = 'mario_jump.svg';

        this.currentSprite = this.sprites.idle;
        this.frameX = 0; // 当前动画帧的X坐标
        this.frameY = 0; // 当前动画帧的Y坐标
        this.frameWidth = 32; // 单个动画帧的宽度
        this.frameHeight = 32; // 单个动画帧的高度
        this.frameCount = 4; // 每个动画的帧数
        this.frameDelay = 5; // 帧延迟（控制动画速度）
        this.frameTimer = 0; // 帧计时器
        this.facingRight = true; // 玩家朝向（默认朝右）
        this.speed = MOVE_SPEED; // 移动速度
    }

    update() {
        // 应用重力
        this.velocityY += GRAVITY;

        // 限制下落速度
        if (this.velocityY > 15) {
            this.velocityY = 15;
        }

        // 更新位置前保存当前位置
        const prevX = this.x;
        const prevY = this.y;

        // 更新位置
        this.x += this.velocityX;
        this.y += this.velocityY;

        // 更新移动距离
        if (this.velocityX > 0) {
            this.distanceTraveled += this.velocityX;
        }

        // 边界检测
        if (this.x < 0) {
            this.x = 0;
        } else if (this.x + this.width > this.canvas.width) {
            this.x = this.canvas.width - this.width;
        }

        // 地面碰撞检测
        if (this.y + this.height > this.canvas.height - 50) {
            this.y = this.canvas.height - 50 - this.height;
            this.velocityY = 0;
            this.isJumping = false;
        }

        // 平台碰撞检测
        let onPlatform = false;
        platforms.forEach(platform => {
            if (this.checkCollision(platform)) {
                const collision = this.checkSideCollision(platform);

                // 顶部碰撞
                if (collision.top && this.velocityY > 0) {
                    this.y = platform.y - this.height;
                    this.velocityY = 0;
                    this.isJumping = false;
                    onPlatform = true;
                }
                // 底部碰撞
                else if (collision.bottom && this.velocityY < 0) {
                    this.y = platform.y + platform.height;
                    this.velocityY = 0;
                }
                // 左侧碰撞
                else if (collision.left && this.velocityX > 0) {
                    this.x = prevX;
                }
                // 右侧碰撞
                else if (collision.right && this.velocityX < 0) {
                    this.x = prevX;
                }
            }
        });

        // 如果不在平台上且不在地面上，则处于跳跃状态
        if (!onPlatform && this.y + this.height < this.canvas.height - 50) {
            this.isJumping = true;
        }

        // 更新动画状态
        this.updateAnimation();
    }

    // 更新动画状态
    updateAnimation() {
        // 更新朝向
        if (this.velocityX > 0) this.facingRight = true;
        else if (this.velocityX < 0) this.facingRight = false;

        // 更新当前使用的精灵图
        if (this.isJumping) {
            this.currentSprite = this.sprites.jump;
        } else if (this.velocityX !== 0) {
            this.currentSprite = this.sprites.run;
        } else {
            this.currentSprite = this.sprites.idle;
        }

        // 更新动画帧
        this.frameTimer++;
        if (this.frameTimer >= this.frameDelay) {
            this.frameTimer = 0;
            this.frameX = (this.frameX + 1) % this.frameCount;
        }
    }

    checkCollision(platform) {
        const adjustedPlatformX = platform.x + (groundX % 1000);
        return this.x < adjustedPlatformX + platform.width &&
            this.x + this.width > adjustedPlatformX &&
            this.y < platform.y + platform.height &&
            this.y + this.height > platform.y;
    }

    // 检查与平台的侧面碰撞
    checkSideCollision(platform) {
        const adjustedPlatformX = platform.x + (groundX % 1000);
        const wasLeft = this.x + this.width - this.velocityX <= adjustedPlatformX;
        const wasRight = this.x - this.velocityX >= adjustedPlatformX + platform.width;
        const wasTop = this.y + this.height - this.velocityY <= platform.y;
        const wasBottom = this.y - this.velocityY >= platform.y + platform.height;

        return {
            left: wasLeft && this.x + this.width > adjustedPlatformX && !wasTop && !wasBottom,
            right: wasRight && this.x < adjustedPlatformX + platform.width && !wasTop && !wasBottom,
            top: wasTop && this.y + this.height > platform.y && !wasLeft && !wasRight,
            bottom: wasBottom && this.y < platform.y + platform.height && !wasLeft && !wasRight
        };
    }

    draw(ctx) {
        // 保存当前上下文状态
        ctx.save();

        // 如果玩家朝左，翻转图像
        if (!this.facingRight) {
            ctx.translate(this.x + this.width, this.y);
            ctx.scale(-1, 1);
            ctx.drawImage(
                this.currentSprite,
                this.frameX * this.frameWidth,
                this.frameY * this.frameHeight,
                this.frameWidth,
                this.frameHeight,
                0,
                0,
                this.width,
                this.height
            );
        } else {
            ctx.drawImage(
                this.currentSprite,
                this.frameX * this.frameWidth,
                this.frameY * this.frameHeight,
                this.frameWidth,
                this.frameHeight,
                this.x,
                this.y,
                this.width,
                this.height
            );
        }

        // 恢复上下文状态
        ctx.restore();
    }

    jump() {
        if (!this.isJumping) {
            this.velocityY = JUMP_FORCE;
            this.isJumping = true;
            this.canDoubleJump = true;
            // 播放跳跃音效
            playSound('jump');
        } else if (this.canDoubleJump) {
            this.velocityY = DOUBLE_JUMP_FORCE;
            this.canDoubleJump = false;
            // 播放跳跃音效
            playSound('jump');
        }
    }
}

// 平台类
class Platform {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    draw(ctx) {
        const adjustedX = this.x + (groundX % 1000);

        // 绘制平台
        ctx.fillStyle = '#8B4513'; // 棕色
        ctx.fillRect(adjustedX, this.y, this.width, this.height);

        // 绘制平台顶部草地
        ctx.fillStyle = '#228B22'; // 森林绿
        ctx.fillRect(adjustedX, this.y, this.width, 5);

        // 调试用：显示碰撞箱
        if (typeof showPerformance !== 'undefined' && showPerformance) {
            ctx.strokeStyle = 'blue';
            ctx.strokeRect(adjustedX, this.y, this.width, this.height);
        }
    }
}

// 金币类
class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.collected = false;
        this.animationTimer = 0;
        this.floatOffset = 0;
    }

    update() {
        if (this.collected) {
            return false; // 如果已收集，从数组中移除
        }

        // 简单的浮动动画
        this.animationTimer += 0.1;
        this.floatOffset = Math.sin(this.animationTimer) * 5;

        return true;
    }

    draw(ctx) {
        if (this.collected) return;

        const adjustedX = this.x + (groundX % 1000);
        const adjustedY = this.y + this.floatOffset;

        // 绘制金币
        ctx.fillStyle = '#FFD700'; // 金色
        ctx.beginPath();
        ctx.arc(adjustedX + this.width / 2, adjustedY + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // 绘制金币高光
        ctx.fillStyle = '#FFEC8B';
        ctx.beginPath();
        ctx.arc(adjustedX + this.width / 2 - 3, adjustedY + this.height / 2 - 3, this.width / 4, 0, Math.PI * 2);
        ctx.fill();
    }

    collect() {
        this.collected = true;
        return 50; // 收集金币得50分
    }
}

// 敌人类
class Enemy {
    constructor(x, y, type = 'goomba') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 32;
        this.height = 32;
        this.velocityX = -1.5; // 默认向左移动
        this.velocityY = 0;
        this.isAlive = true;
        this.squashed = false;
        this.squashTimer = 0;
        this.sprite = new Image();
        this.sprite.src = 'enemy.svg'; // 需要创建敌人图像
    }

    update() {
        if (!this.isAlive) {
            // 如果敌人被踩扁，显示一段时间后消失
            if (this.squashed) {
                this.squashTimer++;
                if (this.squashTimer > 30) { // 大约0.5秒后消失
                    return false; // 返回false表示可以从数组中移除
                }
                return true; // 返回true表示保留在数组中
            }
            return false; // 如果不是被踩扁而是其他方式死亡，直接移除
        }

        // 应用重力
        this.velocityY += GRAVITY;

        // 限制下落速度
        if (this.velocityY > 10) {
            this.velocityY = 10;
        }

        // 更新位置
        this.x += this.velocityX;
        this.y += this.velocityY;

        // 地面碰撞检测
        if (this.y + this.height > 600 - 50) { // 假设画布高度为600
            this.y = 600 - 50 - this.height;
            this.velocityY = 0;
        }

        // 平台碰撞检测
        platforms.forEach(platform => {
            const adjustedPlatformX = platform.x + (groundX % 1000);
            // 简单的碰撞检测
            if (this.x < adjustedPlatformX + platform.width &&
                this.x + this.width > adjustedPlatformX &&
                this.y < platform.y + platform.height &&
                this.y + this.height > platform.y) {

                // 检查是否在平台顶部
                if (this.velocityY > 0 && this.y + this.height - this.velocityY <= platform.y) {
                    this.y = platform.y - this.height;
                    this.velocityY = 0;
                }
                // 检查是否碰到平台侧面，如果是则改变方向
                else if (this.x + this.width > adjustedPlatformX && this.x < adjustedPlatformX) {
                    this.velocityX = -Math.abs(this.velocityX); // 向左移动
                }
                else if (this.x < adjustedPlatformX + platform.width && this.x + this.width > adjustedPlatformX + platform.width) {
                    this.velocityX = Math.abs(this.velocityX); // 向右移动
                }
            }
        });

        // 检查是否到达屏幕边缘，如果是则改变方向
        const adjustedX = this.x - groundX;
        if (adjustedX < 0 || adjustedX > 800) { // 假设画布宽度为800
            this.velocityX = -this.velocityX;
        }

        return true; // 返回true表示保留在数组中
    }

    draw(ctx) {
        const adjustedX = this.x + (groundX % 1000);

        if (this.squashed) {
            // 绘制被踩扁的敌人
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(adjustedX, this.y + this.height - 10, this.width, 10);
        } else {
            // 绘制正常敌人
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(adjustedX, this.y, this.width, this.height);

            // 绘制眼睛
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(adjustedX + 10, this.y + 10, 5, 0, Math.PI * 2);
            ctx.arc(adjustedX + this.width - 10, this.y + 10, 5, 0, Math.PI * 2);
            ctx.fill();

            // 绘制瞳孔
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(adjustedX + 10, this.y + 10, 2, 0, Math.PI * 2);
            ctx.arc(adjustedX + this.width - 10, this.y + 10, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    squash() {
        this.isAlive = false;
        this.squashed = true;
        this.height = 10; // 降低高度，表示被踩扁
        return 100; // 返回得分
    }
}

// 显示游戏开始界面
function showStartScreen(ctx, canvas) {
    // 绘制背景
    ctx.fillStyle = 'rgba(0, 100, 150, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制标题
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('超级马里奥', canvas.width / 2, canvas.height / 2 - 50);

    // 绘制开始提示
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText('按空格键开始游戏', canvas.width / 2, canvas.height / 2 + 20);

    // 绘制控制说明
    ctx.font = '18px Arial';
    ctx.fillText('方向键移动，空格键跳跃', canvas.width / 2, canvas.height / 2 + 60);
    ctx.fillText('收集金币，踩踏敌人获得分数', canvas.width / 2, canvas.height / 2 + 90);
}

// 初始化游戏
function init(level) {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // 重置游戏状态
    score = 0;
    gameOver = false;
    gameStarted = false;
    levelCompleted = false;
    currentLevel = level;
    showGameOver.soundPlayed = false; // 重置游戏结束音效状态
    mountainsX = 0;
    treesX = 0;
    groundX = 0;

    // 初始化音效系统
    if (!audioContext) {
        initAudio();
    }

    // 创建玩家
    player = new Player(50, canvas.height - 100, canvas);
    player.distanceTraveled = 0; // 重置玩家移动距离

    // 清空对象池
    enemyPool = [];
    coinPool = [];

    // 加载当前关卡数据（索引从0开始，所以减1）
    const levelData = levels[currentLevel - 1];

    // 确保levelData存在且有效
    if (!levelData) {
        console.error(`关卡数据不存在: ${currentLevel}`);
        currentLevel = 1; // 回退到第一关
        return init(currentLevel);
    }

    // 创建平台
    platforms = [];
    if (levelData.platforms && Array.isArray(levelData.platforms)) {
        levelData.platforms.forEach(platform => {
            platforms.push(new Platform(platform.x, platform.y, platform.width, platform.height));
        });
    }

    // 创建敌人
    enemies = [];
    if (levelData.enemies && Array.isArray(levelData.enemies)) {
        levelData.enemies.forEach(enemy => {
            enemies.push(new Enemy(enemy.x, enemy.y, enemy.type));
        });
    }

    // 创建金币
    coins = [];
    if (levelData.coins && Array.isArray(levelData.coins)) {
        levelData.coins.forEach(coin => {
            coins.push(new Coin(coin.x, coin.y));
        });
    }

    // 键盘事件监听
    document.addEventListener('keydown', (e) => {
        // 游戏未开始状态
        if (!gameStarted) {
            // 按空格键开始游戏
            if (e.key === ' ' || e.key === 'Space') {
                gameStarted = true;
            }
            return;
        }

        // 游戏结束状态
        if (gameOver) {
            // 按空格键重新开始游戏
            if (e.key === ' ' || e.key === 'Space') {
                init(1); // 明确指定从第一关开始
                gameStarted = true; // 直接开始游戏
            }
            return;
        }

        // 关卡完成状态
        if (levelCompleted) {
            // 按空格键进入下一关
            if (e.key === ' ' || e.key === 'Space') {
                if (currentLevel < levels.length) {
                    // 进入下一关
                    init(currentLevel + 1);
                    gameStarted = true; // 直接开始游戏
                } else {
                    // 通关后重新开始第一关
                    init(1);
                    gameStarted = true;
                }
            }
            return;
        }

        // 游戏进行中状态
        switch (e.key) {
            case 'ArrowLeft':
                player.velocityX = -MOVE_SPEED;
                break;
            case 'ArrowRight':
                player.velocityX = MOVE_SPEED;
                break;
            case ' ':
            case 'Space':
            case 'ArrowUp':
                player.jump();
                break;
            case 'p':
            case 'P':
                // 切换性能显示
                showPerformance = !showPerformance;
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            player.velocityX = 0;
        }
    });

    // 添加触摸按钮
    function addTouchControls() {
        // 创建触摸控制容器
        const touchControls = document.createElement('div');
        touchControls.id = 'touchControls';
        touchControls.style.position = 'absolute';
        touchControls.style.bottom = '20px';
        touchControls.style.left = '0';
        touchControls.style.width = '100%';
        touchControls.style.display = 'flex';
        touchControls.style.justifyContent = 'space-between';
        touchControls.style.padding = '0 20px';
        touchControls.style.boxSizing = 'border-box';
        touchControls.style.pointerEvents = 'none'; // 防止干扰canvas事件

        // 移动按钮容器
        const moveButtons = document.createElement('div');
        moveButtons.style.display = 'flex';
        moveButtons.style.gap = '20px';

        // 左移按钮
        const leftButton = document.createElement('button');
        leftButton.id = 'leftButton';
        leftButton.innerHTML = '←';
        leftButton.style.width = '60px';
        leftButton.style.height = '60px';
        leftButton.style.fontSize = '24px';
        leftButton.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        leftButton.style.border = 'none';
        leftButton.style.borderRadius = '50%';
        leftButton.style.pointerEvents = 'auto';

        // 右移按钮
        const rightButton = document.createElement('button');
        rightButton.id = 'rightButton';
        rightButton.innerHTML = '→';
        rightButton.style.width = '60px';
        rightButton.style.height = '60px';
        rightButton.style.fontSize = '24px';
        rightButton.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        rightButton.style.border = 'none';
        rightButton.style.borderRadius = '50%';
        rightButton.style.pointerEvents = 'auto';

        // 跳跃按钮
        const jumpButton = document.createElement('button');
        jumpButton.id = 'jumpButton';
        jumpButton.innerHTML = '↑';
        jumpButton.style.width = '60px';
        jumpButton.style.height = '60px';
        jumpButton.style.fontSize = '24px';
        jumpButton.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        jumpButton.style.border = 'none';
        jumpButton.style.borderRadius = '50%';
        jumpButton.style.pointerEvents = 'auto';

        // 添加按钮到容器
        moveButtons.appendChild(leftButton);
        moveButtons.appendChild(rightButton);
        touchControls.appendChild(moveButtons);
        touchControls.appendChild(jumpButton);

        // 添加到页面
        document.body.appendChild(touchControls);

        // 只在移动设备上显示触摸控制
        if (!isMobileDevice()) {
            touchControls.style.display = 'none';
        }

        // 添加触摸事件
        leftButton.addEventListener('touchstart', function (e) {
            e.preventDefault();
            player.velocityX = -player.speed;
        });

        leftButton.addEventListener('touchend', function (e) {
            e.preventDefault();
            if (player.velocityX < 0) player.velocityX = 0;
        });

        rightButton.addEventListener('touchstart', function (e) {
            e.preventDefault();
            player.velocityX = player.speed;
        });

        rightButton.addEventListener('touchend', function (e) {
            e.preventDefault();
            if (player.velocityX > 0) player.velocityX = 0;
        });

        jumpButton.addEventListener('touchstart', function (e) {
            e.preventDefault();
            player.jump();
        });
    }

    // 检测是否为移动设备
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // 添加画布触摸事件（用于游戏状态控制）
    canvas.addEventListener('touchstart', function (e) {
        e.preventDefault(); // 防止默认行为（如滚动）

        // 获取触摸位置
        const touch = e.touches[0];
        const touchX = touch.clientX;
        const touchY = touch.clientY;

        if (gameOver) {
            // 游戏结束状态，点击任意位置重新开始
            init(1); // 明确指定从第一关开始
            gameStarted = true;
            return;
        }

        if (!gameStarted) {
            // 游戏未开始状态，点击任意位置开始游戏
            gameStarted = true;
            return;
        }

        if (levelCompleted) {
            // 关卡完成状态，点击任意位置进入下一关
            if (currentLevel < levels.length) {
                // 进入下一关
                init(currentLevel + 1);
                gameStarted = true;
            } else {
                // 通关后重新开始第一关
                init(1);
                gameStarted = true;
            }
            return;
        }
    });

    // 初始化触摸控制
    addTouchControls();

    // 开始游戏循环
    gameLoop = function (timestamp) {
        update(timestamp);
        requestAnimationFrame(gameLoop);
    };
    requestAnimationFrame(gameLoop);
}

// 性能监控变量
let lastTime = 0;
let fps = 0;
let frameCount = 0;
let lastFpsUpdate = 0;
let showPerformance = false; // 是否显示性能信息

// 更新游戏状态
function update(timestamp) {
    // 计算帧率
    if (!lastTime) {
        lastTime = timestamp;
    }
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // 更新FPS计数
    frameCount++;
    if (timestamp - lastFpsUpdate > 1000) { // 每秒更新一次
        fps = Math.round(frameCount * 1000 / (timestamp - lastFpsUpdate));
        frameCount = 0;
        lastFpsUpdate = timestamp;
    }

    // 限制最大帧率，避免过高的CPU使用率
    if (deltaTime < 16) { // 约60fps
        return;
    }

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // 如果游戏未开始，显示开始界面
    if (!gameStarted) {
        showStartScreen(ctx, canvas);
        return;
    }

    // 如果游戏结束，显示游戏结束界面
    if (gameOver) {
        showGameOver(ctx, canvas);
        return;
    }

    // 如果关卡完成，显示关卡完成界面
    if (levelCompleted) {
        showLevelComplete(ctx, canvas);
        return;
    }

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 更新背景位置
    if (player.velocityX > 0) {
        mountainsX -= MOUNTAINS_SPEED;
        treesX -= TREES_SPEED;
        groundX -= GROUND_SPEED;
    } else if (player.velocityX < 0) {
        mountainsX += MOUNTAINS_SPEED;
        treesX += TREES_SPEED;
        groundX += GROUND_SPEED;
    }

    // 绘制天空背景
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制远景山脉
    ctx.fillStyle = '#6B8E23';
    for (let i = 0; i < 5; i++) {
        let mountainX = ((mountainsX + i * 400) % 2000) - 400;
        ctx.beginPath();
        ctx.moveTo(mountainX, 300);
        ctx.lineTo(mountainX + 200, 100);
        ctx.lineTo(mountainX + 400, 300);
        ctx.fill();
    }

    // 绘制中景树木
    ctx.fillStyle = '#228B22';
    for (let i = 0; i < 6; i++) {
        let treeX = ((treesX + i * 300) % 1800) - 300;
        ctx.beginPath();
        ctx.moveTo(treeX, 400);
        ctx.lineTo(treeX + 50, 250);
        ctx.lineTo(treeX + 100, 400);
        ctx.fill();
    }

    // 绘制近景地面
    ctx.fillStyle = '#8B4513';
    for (let i = 0; i < 6; i++) {
        let groundStartX = ((groundX + i * 300) % 1800) - 300;
        ctx.fillRect(groundStartX, canvas.height - 50, 300, 50);
    }

    // 绘制背景云朵
    ctx.fillStyle = 'white';
    for (let i = 0; i < 5; i++) {
        let cloudX = ((mountainsX + i * 200) % 1000) - 100;
        ctx.beginPath();
        ctx.arc(cloudX, 100, 30, 0, Math.PI * 2);
        ctx.arc(cloudX - 25, 100, 25, 0, Math.PI * 2);
        ctx.arc(cloudX + 25, 100, 25, 0, Math.PI * 2);
        ctx.fill();
    }

    // 更新和绘制玩家
    player.update();
    player.draw(ctx);

    // 检查是否完成关卡
    const levelData = levels[currentLevel - 1];

    // 如果玩家到达关卡终点
    if (player.distanceTraveled >= levelData.endX && !levelCompleted) {
        levelCompleted = true;
        playSound('coin'); // 播放关卡完成音效
        return;
    }

    // 绘制平台（使用视口剔除优化）
    const viewportLeft = player.x - canvas.width / 2;
    const viewportRight = player.x + canvas.width / 2;

    for (let i = 0; i < platforms.length; i++) {
        const platform = platforms[i];
        // 根据地面位置调整平台的绘制位置
        const adjustedX = platform.x + (groundX % 1000);

        // 只绘制视口内的平台
        if (adjustedX > viewportLeft - platform.width && adjustedX < viewportRight) {
            ctx.fillStyle = 'green';
            ctx.fillRect(adjustedX, platform.y, platform.width, platform.height);
        }
    }

    // 更新和绘制敌人（使用视口剔除优化）
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        // 视口剔除：只更新视口附近的敌人
        if (enemy.x > viewportLeft - 200 && enemy.x < viewportRight + 200) {
            const keepEnemy = enemy.update();

            if (!keepEnemy) {
                enemies.splice(i, 1);
                continue;
            }

            // 只绘制视口内的敌人
            if (enemy.x > viewportLeft - enemy.width && enemy.x < viewportRight) {
                enemy.draw(ctx);
            }

            // 检查玩家与敌人的碰撞
            if (enemy.isAlive && checkCollision(player, enemy)) {
                // 检查是否是从上方踩踏
                if (player.velocityY > 0 && player.y + player.height - player.velocityY <= enemy.y) {
                    // 玩家踩踏敌人
                    score += enemy.squash();
                    player.velocityY = JUMP_FORCE / 2; // 踩踏后小跳一下
                    // 播放踩踏音效
                    playSound('squash');
                } else {
                    // 玩家被敌人伤害
                    gameOver = true;
                    // 播放游戏结束音效
                    playSound('gameover');
                }
            }
        } else if (enemy.x < viewportLeft - 500 || enemy.x > viewportRight + 500) {
            // 将视口外太远的敌人放入对象池（优化内存和性能）
            enemyPool.push(enemy);
            enemies.splice(i, 1);
        }
    }

    // 更新和绘制金币（使用视口剔除优化）
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];

        // 视口剔除：只更新视口附近的金币
        if (coin.x > viewportLeft - 100 && coin.x < viewportRight + 100) {
            const keepCoin = coin.update();

            if (!keepCoin) {
                coins.splice(i, 1);
                continue;
            }

            // 只绘制视口内的金币
            if (coin.x > viewportLeft - coin.width && coin.x < viewportRight) {
                coin.draw(ctx);
            }

            // 检查玩家与金币的碰撞
            if (!coin.collected && checkCollision(player, coin)) {
                // 收集金币
                score += coin.collect();

                // 播放收集音效
                playSound('coin');
            }
        } else if (coin.x < viewportLeft - 500 || coin.x > viewportRight + 500) {
            // 将视口外太远的金币放入对象池（优化内存和性能）
            coinPool.push(coin);
            coins.splice(i, 1);
        }
    }

    // 如果所有金币都被收集，随机生成新的金币（使用对象池优化）
    if (coins.length < 5 && Math.random() < 0.01 && platforms && platforms.length > 0) { // 每帧有1%的几率生成新金币，确保platforms存在且不为空
        const platformIndex = Math.floor(Math.random() * platforms.length);
        const platform = platforms[platformIndex];
        const coinX = platform.x + 20 + Math.random() * (platform.width - 40);
        const coinY = platform.y - 30 - Math.random() * 20;

        // 尝试从对象池中获取金币
        if (coinPool.length > 0) {
            const coin = coinPool.pop();
            coin.x = coinX;
            coin.y = coinY;
            coin.collected = false;
            coin.animationOffset = Math.random() * Math.PI * 2; // 随机动画偏移
            coins.push(coin);
        } else {
            // 对象池为空时创建新金币
            coins.push(new Coin(coinX, coinY));
        }
    }

    // 随机生成新敌人（使用对象池优化）
    if (Math.random() < 0.005 && enemies.length < 5 && platforms && platforms.length > 0) { // 每帧有0.5%的几率生成新敌人，最多5个，确保platforms存在且不为空
        const platformIndex = Math.floor(Math.random() * platforms.length);
        const platform = platforms[platformIndex];
        const enemyX = platform.x + Math.random() * (platform.width - 32);
        const enemyY = platform.y - 32;

        // 尝试从对象池中获取敌人
        if (enemyPool.length > 0) {
            const enemy = enemyPool.pop();
            enemy.x = enemyX;
            enemy.y = enemyY;
            enemy.isAlive = true;
            enemy.squashed = false;
            enemy.squashTimer = 0;
            enemy.height = 32;
            enemies.push(enemy);
        } else {
            // 对象池为空时创建新敌人
            enemies.push(new Enemy(enemyX, enemyY));
        }
    }

    // 显示得分
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`得分: ${score}`, 20, 30);
    ctx.fillText(`关卡: ${currentLevel}`, 20, 60);

    // 显示性能信息
    if (showPerformance) {
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.fillText(`FPS: ${fps}`, canvas.width - 70, 20);
        ctx.fillText(`Delta: ${Math.round(deltaTime)}ms`, canvas.width - 70, 40);
    }
}

// 检查两个对象之间的碰撞
function checkCollision(obj1, obj2) {
    // 调整敌人位置以考虑地面滚动
    const adjustedX = obj2.x + (groundX % 1000);

    return obj1.x < adjustedX + obj2.width &&
        obj1.x + obj1.width > adjustedX &&
        obj1.y < obj2.y + obj2.height &&
        obj1.y + obj1.height > obj2.y;
}

// 显示游戏结束界面
function showGameOver(ctx, canvas) {
    // 静态变量，确保音效只播放一次
    if (!showGameOver.soundPlayed) {
        playSound('gameover');
        showGameOver.soundPlayed = true;
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 50);

    ctx.font = '24px Arial';
    ctx.fillText(`最终得分: ${score}`, canvas.width / 2, canvas.height / 2);

    ctx.font = '18px Arial';
    ctx.fillText('按空格键重新开始', canvas.width / 2, canvas.height / 2 + 50);
}
// 初始化静态变量
showGameOver.soundPlayed = false;

// 显示关卡完成界面
function showLevelComplete(ctx, canvas) {
    ctx.fillStyle = 'rgba(0, 100, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`关卡 ${currentLevel} 完成！`, canvas.width / 2, canvas.height / 2 - 50);

    ctx.font = '24px Arial';
    ctx.fillText(`得分: ${score}`, canvas.width / 2, canvas.height / 2);

    if (currentLevel < levels.length) {
        ctx.font = '18px Arial';
        ctx.fillText('按空格键进入下一关', canvas.width / 2, canvas.height / 2 + 50);
    } else {
        ctx.font = '18px Arial';
        ctx.fillText('恭喜你通关了！按空格键重新开始', canvas.width / 2, canvas.height / 2 + 50);
    }
}

// 显示游戏通关界面
function showGameComplete(ctx, canvas) {
    ctx.fillStyle = 'rgba(100, 100, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('恭喜通关！', canvas.width / 2, canvas.height / 2 - 50);

    ctx.font = '24px Arial';
    ctx.fillText(`最终得分: ${score}`, canvas.width / 2, canvas.height / 2);

    ctx.font = '18px Arial';
    ctx.fillText('按空格键重新开始游戏', canvas.width / 2, canvas.height / 2 + 50);
}

// 当页面加载完成时初始化游戏
window.onload = init(1);