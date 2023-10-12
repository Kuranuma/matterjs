"use strict";

/** matter.jsのオブジェクト */
const { Bodies, Body, Composite, Engine, Events, Render, Runner, Sleeping } = Matter;

/** @const {Number} ゲームエリア幅 */
const GAME_WIDTH = 960;
/** @const {Number} ゲームエリア高さ */
const GAME_HEIGHT = 540;
/** @const {Number} 箱の壁幅 */
const WALL_WIDTH = 10;
/** @const {Number} 箱の壁高さ */
const WALL_HEIGHT = 440;
/** @const {Number} 箱の床幅 */
const FLOOR_WIDTH = 360;
/** @const {Number} 箱の床高さ */
const FLOOR_HEIGHT = 10;
/** @const {Number} フルーツの最大ランク */
const FRUIT_MAX_RANK = 10;
/** @const {Number} フルーツの出現最大ランク */
const FRUIT_POP_MAX_RANK = 5;
/** @const {Number} フルーツのベースサイズ */
const FRUIT_BASE_SIZE = 10;
/** @const {Number} フルーツのランクサイズ */
const FRUIT_RANK_PAR_SIZE = 9;
/** @const {Number} フルーツのイメージサイズ */
const FRUIT_IMAGE_SIZE = 50;
/** @const {Number} フルーツの出現Y座標 */
const FRUIT_POP_Y = GAME_HEIGHT - WALL_HEIGHT - FRUIT_POP_MAX_RANK * FRUIT_RANK_PAR_SIZE - FRUIT_BASE_SIZE;
/** @const {Number} 次のフルーツの出現X座標 */
const FRUIT_NEXT_POP_X = 750;
/** @const {Number} フルーツ摩擦 */
const FRUIT_FRICTION = 0.01;
/** @const {Number} フルーツ重さ */
const FRUIT_MASS = 2;
/** @const {Number} フルーツ弾性 */
const FRUIT_RESTITUTION = 0.01;
/** @const {Number} 箱摩擦 */
const BOX_FRICTION = 0.5;
/** @const {Number} 箱重さ */
const BOX_MASS = 10;
/** @const {Number} 箱弾性 */
const BOX_RESTITUTION = 0.1;
/** @const {Number} 最高落下速度 */
const FRUIT_MAX_FALL_VELOCITY = 10;
/** @const {Number} 落下待ち時間 */
const PUT_WAIT = 400;
/** @const {String} 開始ボタン */
const BUTTON_TEXT_START = "Start";
/** @const {String} リセットボタン */
const BUTTON_TEXT_RESET = "Reset";
/** @const {String} 待機テキスト */
const TEXT_READY = "Please Start";
/** @const {String} 空テキスト */
const TEXT_EMPTY = "　";
/** @const {String} ゲームオーバーテキスト */
const TEXT_GAMEOVER = "Game over";

/** @const {String} 箱の色 */
const BOX_COLOR = "#eee";
/** @const {Array<String>} フルーツ色 */
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
/** @const {Array<Number>} フルーツスコアテーブル */
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
/** @const {Array<String>} フルーツテスクチャ */
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
};

/**
 * ゲームクラス
 */
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

    /**
     * コンストラクタ
     * @param {Element} container メインコンテナ
     * @param {Element} startButton 開始ボタン
     * @param {Element} text テキスト
     * @param {Element} scoreText スコアテキスト
     */
    constructor(container, startButton, text, scoreText) {
        // matter.jsの準備
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
        this.state = GameState.Unready;
        this.startButton = startButton;
        this.text = text;
        this.scoreText = scoreText;
        this.fallingFruits = new Array();
        this.recentX = GAME_WIDTH / 2;
        this.isPutWait = false;

        // イベントの作成
        this.startButton.addEventListener("click", this.pushButton.bind(this));

        Events.on(this.engine, "collisionStart", this.handleCollision.bind(this));
        Events.on(this.engine, "afterUpdate", this.checkGameOver.bind(this));
        Events.on(this.engine, 'beforeUpdate', this.controllFallSpeed.bind(this));

        Render.run(this.render);
        container.addEventListener("click", this.click.bind(this));
        container.addEventListener("mousemove", this.mousemove.bind(this));
    }

    /**
     * 初期化
     */
    init() {
        // オブジェクト全消し
        Composite.clear(this.engine.world);

        // 箱の作成
        const leftX = GAME_WIDTH / 2 - FLOOR_WIDTH / 2 + WALL_WIDTH / 2;
        const rightX = GAME_WIDTH / 2 + FLOOR_WIDTH / 2 - WALL_WIDTH / 2;
        const WallY = GAME_HEIGHT - WALL_HEIGHT / 2;
        const floorX = GAME_WIDTH / 2;
        const floorY = GAME_HEIGHT - FLOOR_HEIGHT / 2;

        const leftWall = this.createBox(leftX, WallY, WALL_WIDTH, WALL_HEIGHT);
        const rightWall = this.createBox(rightX, WallY, WALL_WIDTH, WALL_HEIGHT);
        const floor = this.createBox(floorX, floorY, FLOOR_WIDTH, FLOOR_HEIGHT);

        Composite.add(this.engine.world, [leftWall, rightWall, floor]);
        Runner.run(this.runner, this.engine);

        this.startButton.innerText = BUTTON_TEXT_START;
        this.setScore(0);
        this.setText(TEXT_READY);
        this.state = GameState.Ready;
    }

    /**
     * 箱用の矩形作成
     * @param {Number} x 
     * @param {Number} y 
     * @param {Number} width 
     * @param {Number} height 
     * @returns {Matter.Bodies} 矩形のBodies
     */
    createBox(x, y, width, height) {
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
            }
        );
    }

    /**
     * フルーツ作成
     * @param {Number} x 
     * @param {Number} y 
     * @param {Fruit} fruit 
     * @returns {Matter.Bodies} フルーツのBodies
     */
    createFruit(x, y, fruit) {
        const scale = fruit.getRadius() * 2 / FRUIT_IMAGE_SIZE;
        const body = Bodies.circle(x, y, fruit.getRadius(), {
            isSleeping: true,
            friction: FRUIT_FRICTION,
            mass: FRUIT_MASS,
            restitution: FRUIT_RESTITUTION,
            collisionFilter: {
                group: 0,
                category: CollisionType.ReadyFruit,
                mask: CollisionType.Box | CollisionType.Fruit,
            },
            render: {
                fillStyle: FRUIT_COLORS[fruit.rank],
                lineWidth: 1,
                sprite: {
                    texture: FRUIT_TEXTURE[fruit.rank],
                    xScale: scale,
                    yScale: scale,
                },
            },
            fruit: fruit,
        });
        Composite.add(this.engine.world, [body]);
        return body;
    }

    /**
     * ボタン押下時の処理
     * @param {Event} e 
     */
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

    /**
     * ゲーム開始
     */
    startGame() {
        this.currentFruit = this.createFruit(this.recentX, FRUIT_POP_Y, new Fruit());
        this.nextFruit = this.createFruit(FRUIT_NEXT_POP_X, FRUIT_POP_Y, new Fruit());
        this.startButton.innerText = BUTTON_TEXT_RESET;
        this.setText(TEXT_EMPTY);
        this.state = GameState.Playable;
    }

    /**
     * マウスクリック時の処理
     * フルーツを投下する
     */
    click() {
        if (this.state !== GameState.Playable) {
            return;
        }
        if (this.isPutWait) {
            return;
        }

        // フルーツのスリープ状態を解除
        Sleeping.set(this.currentFruit, false);
        // 接触判定を設定
        this.currentFruit.collisionFilter.category = CollisionType.Fruit;

        this.fallingFruits.push(this.currentFruit);
        this.currentFruit = null;
        this.currentFruit = this.nextFruit;
        this.moveCurrentFruit(this.recentX);
        this.nextFruit = this.createFruit(FRUIT_NEXT_POP_X, FRUIT_POP_Y, new Fruit());

        // 連続投下防止
        this.isPutWait = true;
        setTimeout(() => {
            this.isPutWait = false;
        }, PUT_WAIT);
    }

    /**
     * マウス移動時の処理
     * 持っているフルーツを動かす
     * @param {Event} e 
     */
    mousemove(e) {
        if (this.state !== GameState.Playable) {
            return;
        }
        const { offsetX } = e;
        this.recentX = this.moveCurrentFruit(offsetX);
    }

    /**
     * 持っているフルーツの移動
     * @param {Number} baseX 
     * @returns 新座標
     */
    moveCurrentFruit(baseX) {
        if (!this.currentFruit) {
            return;
        }
        // 箱より外に出ないようにする
        const leftLimit = GAME_WIDTH / 2 - FLOOR_WIDTH / 2 + WALL_WIDTH + this.currentFruit.circleRadius;
        const rightLimit = GAME_WIDTH / 2 + FLOOR_WIDTH / 2 - WALL_WIDTH - this.currentFruit.circleRadius;
        const actualX = Math.max(Math.min(baseX, rightLimit), leftLimit);
        Body.setPosition(this.currentFruit, {
            x: actualX,
            y: this.currentFruit.position.y,
        });
        return actualX;
    }

    /**
     * 衝突時の処理
     * @param {*} param0 
     */
    handleCollision({ pairs }) {
        for (const pair of pairs) {
            const { bodyA, bodyB } = pair;

            // 転落中のフルーツなら転落中一覧から削除
            const indexA = this.fallingFruits.indexOf(bodyA);
            if (indexA >= 0) {
                this.fallingFruits.splice(indexA, 1);
            }
            const indexB = this.fallingFruits.indexOf(bodyB);
            if (indexB >= 0) {
                this.fallingFruits.splice(indexB, 1);
            }

            // 同ランクのフルーツ同士の接触時のみ処理する
            if (!bodyA.fruit || !bodyB.fruit) {
                continue;
            }
            if (bodyA.fruit.rank != bodyB.fruit.rank) {
                continue;
            }

            // 既に衝突済みで削除されたフルーツならスキップ
            if (
                !Composite.get(this.engine.world, bodyA.id, "body") ||
                !Composite.get(this.engine.world, bodyB.id, "body")
            ) {
                continue;
            }

            const currentRank = bodyA.fruit.rank;
            this.setScore(this.score + FRUIT_SCORE[currentRank]);
            Composite.remove(this.engine.world, [bodyA, bodyB]);
            // 最大ランクならば以降の新フルーツ生成処理を行わない
            if (currentRank == FRUIT_MAX_RANK) {
                continue;
            }
            // 新フルーツの座標は元フルーツの中点
            const newX = (bodyA.position.x + bodyB.position.x) / 2;
            const newY = (bodyA.position.y + bodyB.position.y) / 2;
            const newFruit = this.createFruit(newX, newY, new Fruit(currentRank + 1));
            this.fallingFruits.push(newFruit);
            Sleeping.set(newFruit, false);
            newFruit.collisionFilter.category = CollisionType.Fruit;
        }
    }

    /**
     * ゲームオーバー判定
     */
    checkGameOver() {
        // 全てのフルーツのうち
        const fruits = Composite.allBodies(this.engine.world).filter((body) => body.fruit);
        const over = fruits
            // 転落中でなく
            .filter(f => !this.fallingFruits.includes(f))
            // 持っているフルーツでなく
            .filter(f => this.currentFruit != f)
            // 次のフルーツでなく
            .filter(f => this.nextFruit != f)
            // フルーツのどこかしらが箱の外に出ている
            .filter(f => f.position.y - f.circleRadius < GAME_HEIGHT - WALL_HEIGHT)
            .length;
        if (over > 0) {
            Runner.stop(this.runner);
            this.setText(TEXT_GAMEOVER);
            this.state = GameState.Gameover;
        }
    }

    /**
     * 落下速度制御
     */
    controllFallSpeed() {
        // 落下中のフルーツについて落下速度を制御
        // 速すぎると底をすり抜けるため
        this.fallingFruits.forEach(f => {
            Matter.Body.setVelocity(f, {
                x: f.velocity.x,
                y: Math.max(Math.min(f.velocity.y, FRUIT_MAX_FALL_VELOCITY), -FRUIT_MAX_FALL_VELOCITY)
            });
        });
    }

    /**
     * スコア設定・表示
     * @param {Number} score 
     */
    setScore(score) {
        this.score = score;
        this.scoreText.replaceChildren(`Score: ${score}`);
    }

    /**
     * テキスト設定・表示
     * @param {String} text 
     */
    setText(text) {
        this.text.replaceChildren(text);
    }
}

/**
 * フルーツ
 */
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

    /**
     * 半径を取得
     * @returns {Number} 半径
     */
    getRadius() {
        return this.rank * FRUIT_RANK_PAR_SIZE + FRUIT_BASE_SIZE;
    }
};

/**
 * ウィンドウ作成時の初期処理
 */
window.onload = () => {
    const container = document.querySelector(".container");
    const startButton = document.querySelector(".startbutton");
    const text = document.querySelector(".text");
    const scoreText = document.querySelector(".scoretext");
    const game = new Game(container, startButton, text, scoreText);
    game.init();
};