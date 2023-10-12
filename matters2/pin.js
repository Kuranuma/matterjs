"use strict";

/** matter.jsのオブジェクト */
const { Bodies, Body, Composite, Engine, Events, Render, Runner, Sleeping, Mouse, MouseConstraint } = Matter;

/** ゲームエリア幅 */
const GAME_WIDTH = 640;
/** ゲームエリア高さ */
const GAME_HEIGHT = 480;
/** 箱の壁幅 */
const WALL_WIDTH = 10;
/** 箱の壁高さ */
const WALL_HEIGHT = 440;
/** 箱の床幅 */
const FLOOR_WIDTH = GAME_WIDTH;
/** 箱の床高さ */
const FLOOR_HEIGHT = 10;
/** フルーツの最大ランク */
const FRUIT_MAX_RANK = 10;
/** フルーツの出現最大ランク */
const FRUIT_POP_MAX_RANK = 5;
/** フルーツのベースサイズ */
const FRUIT_BASE_SIZE = 10;
/** フルーツのランクサイズ */
const FRUIT_RANK_PAR_SIZE = 9;
/** フルーツのイメージサイズ */
const FRUIT_IMAGE_SIZE = 50;
/** フルーツの出現Y座標 */
const FRUIT_POP_Y = GAME_HEIGHT - WALL_HEIGHT - FRUIT_POP_MAX_RANK * FRUIT_RANK_PAR_SIZE - FRUIT_BASE_SIZE;
/** 次のフルーツの出現X座標 */
const FRUIT_NEXT_POP_X = 750;
/** フルーツ摩擦 */
const FRUIT_FRICTION = 0.01;
/** フルーツ重さ */
const FRUIT_MASS = 2;
/** フルーツ弾性 */
const FRUIT_RESTITUTION = 0.01;
/** 箱摩擦 */
const BOX_FRICTION = 0.1;
/** 箱重さ */
const BOX_MASS = 10;
/** 箱弾性 */
const BOX_RESTITUTION = 0.1;
/** 最高落下速度 */
const FRUIT_MAX_FALL_VELOCITY = 10;
/** 落下待ち時間 */
const PUT_WAIT = 400;
/** 開始ボタン */
const BUTTON_TEXT_START = "Start";
/** リセットボタン */
const BUTTON_TEXT_RESET = "Reset";
/** 待機テキスト */
const TEXT_READY = "フルーツを合体させろ";
/** 空テキスト */
const TEXT_WIN = "かち";
/** ゲームオーバーテキスト */
const TEXT_GAMEOVER = "まけ";

/** 箱の色 */
const BOX_COLOR = "#eee";

const PIN_COLOR = "#dc1";
/** フルーツ色 */
const FRUIT_COLORS = [
    "#e33",
    "#d66",
    "#c5e",
    "#da1",
    "#e91",
    "#e11",
    "#eea",
    "#ecc",
    "#cc3",
    "#aea",
    "#1e1",
];
/** フルーツスコアテーブル */
const FRUIT_SCORE = [
    1,
    3,
    6,
    10,
    15,
    21,
    28,
    36,
    45,
    55,
    66,
];
/** フルーツテスクチャ */
const FRUIT_TEXTURE = [
    "./img/0_cherry.png",
    "./img/1_strawberry.png",
    "./img/2_grape.png",
    "./img/3_decopon.png",
    "./img/4_persimmon.png",
    "./img/5_apple.png",
    "./img/6_pear.png",
    "./img/7_peach.png",
    "./img/8_pineapple.png",
    "./img/9_melon.png",
    "./img/10_watermelon.png",
];

/** @enum {String} ゲーム状態 */
const GameState = Object.freeze({
    Unready: "Unready",
    Ready: "Ready",
    Playable: "Playable",
    Gameover: "Gameover",
});

/** @enum {Number} 接触種別 */
const CollisionType = {
    Box: 0x0001,
    Fruit: 0x0002,
    ReadyFruit: 0x0004,
    Pin: 0x0008,
    Mouse: 0x0010,
    Gimmick: 0x0011,
};

class Game {
    /** @property {Matter.Engine} engine */
    engine;
    /** @property {Matter.Render} render */
    render;
    /** @property {Matter.Runner} runner */
    runner;
    /** @property {Matter.Body} 現在のフルーツ */
    currentFruit;
    /** @property {Matter.Body} 次のフルーツ */
    nextFruit;
    /** @property {GameState} 状態 */
    state;
    /** @property {Element} テキスト表示 */
    text;
    /** @property {Element} スコア表示 */
    scoreText;
    /** @property {HtmlButtonElement} ボタン */
    startButton;
    /** @property {Array<Matter.Body>} 落下中のフルーツ */
    fallingFruits;
    /** @property {Number} 最近のX */
    recentX;
    /** @property {Number} スコア */
    score;
    /** @property {Boolean} put待ち */
    isPutWait;

    mouse;

    /**
     * コンストラクタ
     * @param {Element} container メインコンテナ
     * @param {Element} startButton 開始ボタン
     * @param {Element} text テキスト
     * @param {Element} scoreText スコアテキスト
     */
    constructor(container, startButton, text, scoreText) {
        this.engine = Engine.create();
        this.render = Render.create({
            element: container,
            engine: this.engine,
            options: {
                width: GAME_WIDTH,
                height: GAME_HEIGHT,
                wireframes: false,
            },
        });
        this.runner = Runner.create();
        this.mouse = Mouse.create(this.render.canvas);
        this.state = GameState.Unready;
        this.startButton = startButton;
        this.text = text;
        this.scoreText = scoreText;
        this.fallingFruits = new Array();
        this.recentX = GAME_WIDTH / 2;
        this.isPutWait = false;

        this.startButton.addEventListener("click", this.pushButton.bind(this));

        Events.on(this.engine, "collisionStart", this.handleCollision.bind(this));

        Render.run(this.render);
    }

    init() {
        Composite.clear(this.engine.world);

        const leftX = GAME_WIDTH / 2 - FLOOR_WIDTH / 2 + WALL_WIDTH / 2;
        const rightX = GAME_WIDTH / 2 + FLOOR_WIDTH / 2 - WALL_WIDTH / 2;
        const WallY = GAME_HEIGHT - WALL_HEIGHT / 2;
        const floorX = GAME_WIDTH / 2;
        const floorY = GAME_HEIGHT - FLOOR_HEIGHT / 2;

        const leftWall = this.createBox(leftX, WallY, WALL_WIDTH, WALL_HEIGHT);
        const rightWall = this.createBox(rightX, WallY, WALL_WIDTH, WALL_HEIGHT);
        const floor = this.createBox(floorX, floorY, FLOOR_WIDTH, FLOOR_HEIGHT);

        const leftMagumaWall = this.createBox(265, 180, 10, 120);
        const rightMagumaWall = this.createBox(375, 180, 10, 120);
        const leftMagumaWall2 = this.createBox(264, 255, 10, 10);
        const rightMagumaWall2 = this.createBox(376, 255, 10, 10);
        const leftUnderWall = this.createBox(264, 400, 10, 60);
        const rightUnderWall = this.createBox(376, 400, 10, 60);
        const leftWaterPinGuard = this.createBox(110, 150, 10, 60);
        const rightWaterPinGuard = this.createBox(130, 150, 10, 60);
        const leftFruitPinGuard = this.createBox(510, 150, 10, 60);
        const rightFruitPinGuard = this.createBox(530, 150, 10, 60);
        const underFloor = this.createBox(320, 425, 300, 10);
        const underLeftGuard = this.createBox(180, 400, 10, 60);
        const waterSlope = this.createBox(125, 260, 10, 250, -Math.PI / 3);
        const fruitSlope = this.createBox(515, 260, 10, 250, Math.PI / 3);

        const maguma = this.createMagma(320, 180, 100, 50);
        const water = this.createWater(40, 150, 25);
        const pin = this.createPin(320, 245, 120, 10);
        const pin2 = this.createPin(120, 160, 10, 160);
        const pin3 = this.createPin(520, 160, 10, 160);

        const fruit1 = this.createFruit(580, 160, new Fruit(1));
        Sleeping.set(fruit1, false);
        fruit1.collisionFilter.category = CollisionType.Fruit;

        const fruit2 = this.createFruit(200, 395, new Fruit(1));
        Sleeping.set(fruit2, false);
        fruit2.collisionFilter.category = CollisionType.Fruit;

        Composite.add(this.engine.world, [
            leftWall,
            rightWall,
            floor,
            pin,
            pin2,
            pin3,
            maguma,
            water,
            leftMagumaWall,
            rightMagumaWall,
            leftMagumaWall2,
            rightMagumaWall2,
            leftUnderWall,
            rightUnderWall,
            leftWaterPinGuard,
            rightWaterPinGuard,
            leftFruitPinGuard,
            rightFruitPinGuard,
            underLeftGuard,
            underFloor,
            waterSlope,
            fruitSlope]);

        const mouseConstraint = MouseConstraint.create(this.engine, {
            mouse: this.mouse,
            constraint: {
                render: {
                    visible: false
                },
                collisionFilter: {
                    category: CollisionType.Mouse,
                    mask: CollisionType.Pin | CollisionType.Mouse,
                    group: 1,
                }
            }
        })
        Events.on(mouseConstraint, 'enddrag', e => {
            if (e.body && e.body.isPin) {
                Composite.remove(this.engine.world, [e.body]);
            }
        });

        Composite.add(this.engine.world, mouseConstraint)
        this.render.mouse = this.mouse

        Runner.run(this.runner, this.engine);

        this.state = GameState.Playable;
        this.setText(TEXT_READY);
        this.startButton.innerText = BUTTON_TEXT_RESET;
    }

    createBox(x, y, width, height, angle = 0) {
        return Bodies.rectangle(
            x,
            y,
            width,
            height,
            {
                friction: BOX_FRICTION,
                mass: BOX_MASS,
                restitution: BOX_RESTITUTION,
                isStatic: true,
                render: {
                    fillStyle: BOX_COLOR,
                },
                angle: angle,
            }
        );
    }

    createPin(x, y, width, height) {
        return Bodies.rectangle(
            x,
            y,
            width,
            height,
            {
                friction: 0.1,
                mass: 1,
                restitution: 0,

                isStatic: false,
                render: {
                    fillStyle: PIN_COLOR,
                },
                collisionFilter: {
                    group: 0,
                    category: CollisionType.Pin,
                    mask: CollisionType.Pin | CollisionType.Fruit | CollisionType.Box,
                },
                isPin: true,
            }
        );
    }
    createMagma(x, y, width, height) {
        return Bodies.rectangle(
            x,
            y,
            width,
            height,
            {
                friction: 0.01,
                mass: BOX_MASS,
                restitution: 0,
                isStatic: false,
                render: {
                    fillStyle: PIN_COLOR,
                    sprite: {
                        texture: "./img/maguma.png"
                    },
                },
                collisionFilter: {
                    group: 0,
                    category: CollisionType.Gimmick,
                    mask: CollisionType.Gimmick | CollisionType.Pin | CollisionType.Fruit | CollisionType.Box,
                },
                isMagma: true,
            }
        );
    }
    createWater(x, y, radius) {
        return Bodies.circle(
            x,
            y,
            radius,
            {
                friction: FRUIT_FRICTION,
                mass: FRUIT_MASS,
                restitution: FRUIT_RESTITUTION,
                isStatic: false,
                render: {
                    fillStyle: PIN_COLOR,
                    sprite: {
                        texture: "./img/water.png"
                    },
                },
                collisionFilter: {
                    group: 0,
                    category: CollisionType.Gimmick,
                    mask: CollisionType.Gimmick | CollisionType.Pin | CollisionType.Box,
                },
                isWater: true,
            }
        );
    }

    createFruit(x, y, fruit) {
        const body = Bodies.circle(x, y, fruit.getRadius(), {
            isSleeping: true,
            friction: FRUIT_FRICTION,
            mass: FRUIT_MASS,
            restitution: FRUIT_RESTITUTION,
            collisionFilter: {
                group: 0,
                category: CollisionType.ReadyFruit,
                mask: CollisionType.Box | CollisionType.Fruit | CollisionType.Pin,
            },
            render: {
                fillStyle: FRUIT_COLORS[fruit.rank],
                lineWidth: 1,
            },
            fruit: fruit,
        });
        body.render.sprite.texture = FRUIT_TEXTURE[fruit.rank];
        const scale = fruit.getRadius() * 2 / FRUIT_IMAGE_SIZE;
        body.render.sprite.xScale = scale;
        body.render.sprite.yScale = scale;
        Composite.add(this.engine.world, [body]);
        return body;
    }

    pushButton(e) {
        e.preventDefault();
        e.stopPropagation();
        switch (this.state) {
            case GameState.Ready:
                this.startGame();
                break;
            case GameState.Playable:
                this.init();
                break;
            case GameState.Gameover:
                this.init();
                break;
        }
    }

    startGame() {
        this.currentFruit = this.createFruit(this.recentX, FRUIT_POP_Y, new Fruit());
        this.nextFruit = this.createFruit(FRUIT_NEXT_POP_X, FRUIT_POP_Y, new Fruit());
        this.startButton.innerText = BUTTON_TEXT_RESET;
        this.setText(TEXT_WIN);
        this.state = GameState.Playable;
    }

    click() {
        if (this.state !== GameState.Playable) {
            return;
        }
        if (this.isPutWait) {
            return;
        }
        Sleeping.set(this.currentFruit, false);
        this.currentFruit.collisionFilter.category = CollisionType.Fruit;
        this.fallingFruits.push(this.currentFruit);
        this.currentFruit = null;
        this.isPutWait = true;
        this.currentFruit = this.nextFruit;
        this.moveCurrentFruit(this.recentX);
        this.nextFruit = this.createFruit(FRUIT_NEXT_POP_X, FRUIT_POP_Y, new Fruit());
        setTimeout(() => {
            this.isPutWait = false;
        }, PUT_WAIT);
    }

    mousemove(e) {
        if (this.state !== GameState.Playable) {
            return;
        }
        const { offsetX } = e;
        this.recentX = this.moveCurrentFruit(offsetX);
    }

    moveCurrentFruit(baseX) {
        if (!this.currentFruit) {
            return;
        }
        const leftLimit = GAME_WIDTH / 2 - FLOOR_WIDTH / 2 + WALL_WIDTH + this.currentFruit.circleRadius;
        const rightLimit = GAME_WIDTH / 2 + FLOOR_WIDTH / 2 - WALL_WIDTH - this.currentFruit.circleRadius;
        const actualX = Math.max(Math.min(baseX, rightLimit), leftLimit);
        Body.setPosition(this.currentFruit, {
            x: actualX,
            y: this.currentFruit.position.y,
        });
        return actualX;
    }

    handleCollision({ pairs }) {
        for (const pair of pairs) {
            const { bodyA, bodyB } = pair;
            if (
                !Composite.get(this.engine.world, bodyA.id, "body") ||
                !Composite.get(this.engine.world, bodyB.id, "body")
            ) {
                continue;
            }

            if ((bodyA.isMagma || bodyB.isMagma)) {
                if (bodyA.isWater) {
                    Composite.remove(this.engine.world, [bodyA]);
                }
                if (bodyB.isWater) {
                    Composite.remove(this.engine.world, [bodyB]);
                }
                if (bodyA.fruit) {
                    Composite.remove(this.engine.world, [bodyA]);
                    this.lose();
                }
                if (bodyB.fruit) {
                    Composite.remove(this.engine.world, [bodyB]);
                    this.lose();
                }
                continue;
            }

            if (!bodyA.fruit || !bodyB.fruit) {
                continue;
            }

            if (bodyA.fruit.rank != bodyB.fruit.rank) {
                continue;
            }

            const currentRank = bodyA.fruit.rank;
            Composite.remove(this.engine.world, [bodyA, bodyB]);
            if (currentRank == FRUIT_MAX_RANK) {
                continue;
            }
            const newX = (bodyA.position.x + bodyB.position.x) / 2;
            const newY = (bodyA.position.y + bodyB.position.y) / 2;
            const newFruit = this.createFruit(newX, newY, new Fruit(currentRank + 1));
            this.fallingFruits.push(newFruit);
            Sleeping.set(newFruit, false);
            newFruit.collisionFilter.category = CollisionType.Fruit;
            this.win();
        }
    }

    lose() {
        Runner.stop(this.runner);
        this.setText(TEXT_GAMEOVER);
        this.state = GameState.Gameover;
    }

    win() {
        Runner.stop(this.runner);
        this.setText(TEXT_WIN);
        this.state = GameState.Gameover;
    }

    setScore(score) {
        this.score = score;
        this.scoreText.replaceChildren(`Score: ${score}`);
    }

    setText(text) {
        this.text.replaceChildren(text);
    }
}

class Fruit {
    /** @property {Number} 大きさ */
    rank;

    /**
     * コンストラクタ
     * @param {Number} rank ランク 未指定ならランダム
     */
    constructor(rank) {
        if (rank) {
            this.rank = rank;
        } else {
            this.rank = Math.floor(Math.random() * FRUIT_POP_MAX_RANK);
        }
    }

    getRadius() {
        return this.rank * FRUIT_RANK_PAR_SIZE + FRUIT_BASE_SIZE;
    }
};

window.onload = () => {
    const container = document.querySelector(".container");
    const startButton = document.querySelector(".startbutton");
    const text = document.querySelector(".text");
    const scoreText = document.querySelector(".scoretext");
    const game = new Game(container, startButton, text, scoreText);
    game.init();
};