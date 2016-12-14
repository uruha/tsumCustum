'use strict';
/*global
    icon,
    enchant,
    Core,
    Class,
    Sprite,
    Label,
    Scene,
    GameOverScene,
    PhyBoxSprite,
    PhyCircleSprite,
    PhysicsWorld
*/

/** @namespace {enchant} */
enchant();
enchant.ENV.USE_TOUCH_TO_START_SCENE = false;

/** util */
Array.prototype.last = function() { return this[this.length - 1]; };

function previewCenter(game) {
    const topPosition  = (window.innerHeight - (game.height * game.scale)) / 2;
    const leftPosition = (window.innerWidth - (game.width * game.scale)) / 2;

    const gameStageDOM = document.getElementById('enchant-stage');
    const styleOperations = {
        'position': 'absolute',
        'top': `${topPosition}px`,
        'left': `${leftPosition}px`
    };

    Object.keys(styleOperations).forEach((key) => {
        gameStageDOM.style[key] = styleOperations[key];
    });

    game._pageY = topPosition;
    game._pageX = leftPosition;
}

window.onload = () => {
    const WIDTH = 640;
    const HEIGHT = 640;
    const BALL_NUM = 90;
    const PLAYTIME = 30;
    const game = new Core(WIDTH, HEIGHT);
    /** not use */ // previewCenter(game);
    let selectedBalls = [];
    let highScore = 0;

    /** not use */ // const iconPath = 'https://cdn.rawgit.com/wise9/enchant.js/master/images/icon1.png';
    const iconPath = icon;
    function labelXPosition(label) { return (game.width - label._boundWidth) / 2; }

    const Cursor = Class.create(Sprite, {
        size: 60,
        initialize: function() {
            Sprite.call(this, this.size, this.size);
            this.x = this.y = -100;

            const _cursor = this;
            document.ontouchmove = function(event) {
                _cursor.x = event.touches[0].pageX / game.scale - _cursor.size / 2;
                _cursor.y = event.touches[0].pageY / game.scale - _cursor.size / 2;
            };
            document.onmousemove = function(event) {
                _cursor.x = event.x / game.scale - _cursor.size / 2;
                _cursor.y = event.y / game.scale - _cursor.size / 2;
            };
        }
    });

    const Score = Class.create(Label, {
        lastScore: 0,
        highScore: 0,
        initialize: function() {
            Label.call(this, this.count);
            this.font = '36px Play';
            this.updateText();
        },
        charge: function(ballNum) {
            this.lastScore += ballNum * ballNum;
            this.updateText();
        },
        isHighScore: function() {
            return this.lastScore === this.highScore ? true : false;
        },
        setHighScore: function() {
            this.highScore = Math.max(this.highScore, this.lastScore);
        },
        resetScore: function() {
            this.lastScore = 0;
            this.updateText();
        },
        updateText: function() {
            this.text = 'SCORE ' + this.lastScore;
        }
    });

    const Timer = Class.create(Label, {
        time: PLAYTIME,
        initialize: function() {
            Label.call(this, 0);
            this.x = WIDTH - 150;
            this.font = '36px Play';
            game.score.resetScore();
        },
        gameOver: function() {
            game.score.setHighScore();
            game.replaceScene(new GameOverScene());
        },
        onenterframe: function() {
            if (game.frame % game.fps === 0) {
                this.text = 'TIME ' + --this.time;
                if (this.time <= 0) this.gameOver();
            }
        }
    });

    const Ball = Class.create(PhyCircleSprite, {
        /**
         * PhyCircleSprite:
         * 円の物理シュミレーション用Sprite
         */
        size: 30,
        variation: 6,
        initialize: function(x, y) {
            PhyCircleSprite.call(this, this.size, enchant.box2d.DYNAMIC_SPRITE, 1.5, 1.0, 0.8, true);
            this.image = game.assets[iconPath];
            this.frame = Math.floor(Math.random() * this.variation);
            this.x = Math.random() * WIDTH - this.size;
            this.y = Math.random() * HEIGHT * -1;
        },
        select: function() {
            if (this.opacity === 0.5) return;

            this.opacity = 0.5;
            selectedBalls.push(this);
        },
        onenterframe: function() {
            if (
                selectedBalls.length !== 0 &&
                this.frame === selectedBalls.last().frame &&
                game.cursor.within(this) &&
                game.cursor.within(selectedBalls.last())
            ) {
                this.select();
            }
        },
        ontouchstart: function() {
            this.select();
        },
        ontouchmove: function(e) {
            let moveX = e.x - (this.width / 2);
            let moveY = e.y - (this.height / 2);
            this.moveTo(moveX, moveY);
        },
        ontouchend: function() {
            if (selectedBalls.length < 3) {
                selectedBalls.forEach(function(ball) {
                    ball.opacity = 1.0;
                });
            } else {
                game.score.charge(selectedBalls.length);
                /** this.parentNode === GameScene */
                this.parentNode.spawnBalls(selectedBalls.length);
                selectedBalls.forEach(function(ball) {
                    /** spriteを取り除く、removeChildだと生成したballをすべて取除く（はず */
                    ball.destroy();
                });
            }

            selectedBalls = [];
        }
    });

    const Wall = Class.create(PhyBoxSprite, {
        initialize: function(w, h, x, y) {
            PhyBoxSprite.call(this, w, h, enchant.box2d.STATIC_SPRITE, 0, 1.0, 0.3, false);
            this.position = {
                x,
                y
            };
        }
    });

    const TitleScene = Class.create(Scene, {
        initialize: function() {
            Scene.call(this);
            const startLabel = new Label('CLICK TO START');
            const scoreLabel = new Label('HIGH SCORE ' + game.score.highScore);

            startLabel.font = '36px Play';
            scoreLabel.font = '36px Play';

            startLabel.moveTo(labelXPosition(startLabel), HEIGHT / 2 - 10);
            scoreLabel.moveTo(labelXPosition(scoreLabel), HEIGHT - 36);
            this.addChild(startLabel);
            if (game.score.highScore > 0) this.addChild(scoreLabel);
        },
        ontouchstart: function() {
            game.replaceScene(new GameScene());
        }
    });

    const GameScene = Class.create(Scene, {
        initialize: function() {
            Scene.call(this);
            /**
             * @param {object} world
             * 物理シュミレーションを行う世界のクラス
             * y軸方方向への重力加速度9.8m/s^2
             */
            this.world = new PhysicsWorld(0, 9.8);
            this.addChild(new Wall(1000000, 1, 500000, HEIGHT)); // floor
            this.addChild(new Wall(1, 1000000, 0, 500000)); // left wall
            this.addChild(new Wall(1, 1000000, WIDTH - 1, 500000)); // right wall
            this.addChild(game.cursor);
            this.addChild(game.score);
            this.spawnBalls(BALL_NUM);
            this.addChild(new Timer());
        },
        spawnBalls: function(count) {
            for (let i = 0; i < count; i += 1) this.addChild(new Ball());
        },
        onenterframe: function() {
            this.world.step(game.fps);
        }
    });

    const GameOverScene = Class.create(Scene, {
        initialize: function() {
            Scene.call(this);

            const timeUpLabel = new Label('TIME UP');
            const scoreLabel = new Label('SCORE ' + game.score.lastScore);
            const highScoreLabel = new Label(game.score.isHighScore() ? 'HIGH SCORE!' : '');

            timeUpLabel.font = '36px Play';
            scoreLabel.font = '36px Play';
            highScoreLabel.font = '36px Play';

            timeUpLabel.moveTo(labelXPosition(timeUpLabel), HEIGHT * 1 / 4);
            scoreLabel.moveTo(labelXPosition(scoreLabel), HEIGHT * 2 / 4);
            highScoreLabel.moveTo(labelXPosition(highScoreLabel), HEIGHT * 2 / 4 + 36);

            highScoreLabel.color = 'red';
            this.addChild(timeUpLabel);
            this.addChild(scoreLabel);
            this.addChild(highScoreLabel);

            setTimeout(function() {
                game.replaceScene(new TitleScene());
            }, 4000);
        }
    });

    game.cursor = new Cursor();
    game.score = new Score();
    game.onload = function() {
        /** replaceScene => pupScene.then(pushScene()) */
        game.replaceScene(new TitleScene());
    };
    game.preload(iconPath);
    game.start();
};
