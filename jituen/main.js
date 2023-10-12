"use strict";

/** matter.jsのオブジェクト */
const { Bodies, Body, Composite, Engine, Events, Render, Runner } = Matter;

/** @const {Number} 幅 */
const WIDTH = 640;
/** @const {Number} 高さ */
const HEIGHT = 480;

/**
 * ウィンドウ作成時の初期処理
 */
window.onload = () => {
    const container = document.querySelector(".container");
    const text = document.querySelector(".text");
    const game = new Game(container, text);

    //game.setCollisionEvent();

    //game.setUpdateEvent();

    //game.makeBox();

    //game.makeStaticBox();

    //game.makeSmallBox();

    //game.makeTexturedBall();

    //game.runPhysics();
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
    /** @property {Element} テキスト表示 */
    text;

    /**
     * コンストラクタ
     * @param {Element} container 
     * @param {Element} text 
     */
    constructor(container, text) {
        this.engine = Engine.create();
        this.render = Render.create({
            element: container,
            engine: this.engine,
            options: {
                width: WIDTH,
                height: HEIGHT,
                wireframes: false,
            },
        });
        this.runner = Runner.create();
        this.text = text;

        Render.run(this.render);
    }

    makeBox() {
        const box = this.createRect(320, 50, 100, 50, "box", false);

        Composite.add(this.engine.world, [box]);
    }

    makeStaticBox() {
        const box = this.createRect(320, 450, 600, 10, "staticBox", true);

        Composite.add(this.engine.world, [box]);
    }

    makeSmallBox() {
        this.smallBox = this.createRect(120, 0, 5, 5, "smallBox", false);

        Composite.add(this.engine.world, [this.smallBox]);
    }

    makeTexturedBall() {
        Composite.add(this.engine.world, [
            this.createTexturedCircle(160, 50, 25, "./img/0_cherry.png", 1.0),
            this.createTexturedCircle(450, 75, 75, "./img/1_strawberry.png", 1.0),
            this.createTexturedCircle(540, 50, 50, "./img/10_watermelon.png", 2.0),
        ]);
    }

    setCollisionEvent() {
        Events.on(this.engine, "collisionStart", this.handleCollision.bind(this));
    }

    setUpdateEvent() {
        Events.on(this.engine, 'beforeUpdate', this.controllFallSpeed.bind(this));
    }

    runPhysics() {
        Runner.run(this.runner, this.engine);
    }

    /**
     * 箱用の矩形作成
     * @param {Number} x 
     * @param {Number} y 
     * @param {Number} width 
     * @param {Number} height 
     * @param {String} label
     * @param {Boolean} isStatic
     * @returns {Matter.Bodies} 矩形のBodies
     */
    createRect(x, y, width, height, label, isStatic) {
        return Bodies.rectangle(
            x,
            y,
            width,
            height,
            {
                friction: 0.1,
                mass: 1,
                restitution: 0.1,
                isStatic: isStatic,
                render: {
                    fillStyle: isStatic ? "#eee" : "#dd3",
                },
                label: label
            }
        );
    }

    createTexturedCircle(x, y, radius, texture, scale) {

        return Bodies.circle(x, y, radius, {
            friction: 0.1,
            mass: 1,
            restitution: 0.1,
            render: {
                fillStyle: "#e11",
                lineWidth: 1,
                sprite: {
                    texture: texture,
                    xScale: scale,
                    yScale: scale,
                },
            },
        });
    }

    /**
     * 衝突時の処理
     * @param {*} param0 
     */
    handleCollision({ pairs }) {
        for (const pair of pairs) {
            const { bodyA, bodyB } = pair;
            this.setText(`A:${bodyA.label}とB:${bodyB.label}が衝突しました`);
        }
    }

    /**
     * 落下速度制御
     */
    controllFallSpeed() {
        // 落下中のフルーツについて落下速度を制御
        // 速すぎると底をすり抜けるため
        if (!this.smallBox) {
            return;
        }
        Matter.Body.setVelocity(this.smallBox, {
            x: this.smallBox.velocity.x,
            y: Math.min(this.smallBox.velocity.y, 2)
        });
    }

    /**
     * テキスト設定・表示
     * @param {String} text 
     */
    setText(text) {
        this.text.replaceChildren(text);
    }
}