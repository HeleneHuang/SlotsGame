// import { Application, Assets, Sprite } from "pixi.js";
import * as PIXI from "pixi.js";
import { gsap } from 'gsap';
import * as BE from './be.ts';

// define the name of the type 'PIXI.Sprite[]'
type Sprites = PIXI.Sprite[]

(async () => {

  // Create and initialize a new application
  const app = new PIXI.Application();
  await app.init({ background: "#1099bb", resizeTo: window });
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  // define gloable variables
  const VISIBLE_TOP = app.screen.height * 2 / 7;
  const VISIBLE_BOTTOM = app.screen.height * 5 / 7;
  const REEL_GAP = 100;
  const CENTER_X = app.screen.width / 2;
  const CENTER_Y = app.screen.height / 2;
  const SCALE = 0.8;

  const MASK_COLOR = 0x000000;
  const MASK_ALPHA = 0.5;

  const MASK_TOP_X = 0;
  const MASK_TOP_Y = 0;
  const MASK_TOP_WIDTH = app.screen.width;
  const MASK_TOP_HEIGHT = VISIBLE_TOP;

  const MASK_BOTTOM_X = MASK_TOP_X;
  const MASK_BOTTOM_Y = VISIBLE_BOTTOM;
  const MASK_BOTTOM_WIDTH = MASK_TOP_WIDTH;
  const MASK_BOTTOM_HEIGHT = MASK_TOP_HEIGHT;

  const SCROLL_DIRECTION_DOWN = 1;
  const SCROLL_DIRECTION_UP = -1;

  const MOVE_VELOCITY = 5;
  const MAX_VELOCITY = 50;
  const MIN_VELOCITY = 13;
  const VELOCITY_INCREASE_RATE = 0.9;
  const VELOCITY_DECREASE_RATE = 0.5;

  const AVTIONBUTTON_X = 0;
  const ACTIONBUTTON_Y = 0;
  const ACTIONBUTTON_SCALE = 2;

  const STOP_SPRITES_INDEX_1 = 2;

  const SPACE = 80;
  const REEL_SIZE = BE.GetReelSet()[0].length;
  const REEL_SET_X = CENTER_X - BE.GetReelNum() * REEL_GAP / 2;
  const REEL_SET_Y = CENTER_Y - REEL_SIZE * SPACE / 2;



  class ReelState {
    canMove: boolean;
    velocity: number;
    canDeceleration: boolean;
    canStop: boolean;
    canWrap: boolean;
    direction: number;
    stopIndex: string;
    reel: PIXI.Container;
    decRate: number

    constructor(direction: number, reel: PIXI.Container) {
      this.canMove = false;
      this.velocity = 0;
      this.canDeceleration = false;
      this.canStop = false;
      this.canWrap = false;
      this.direction = direction;
      this.stopIndex = '0';
      this.reel = reel;
      this.decRate = VELOCITY_DECREASE_RATE
    }

    get isStopped(): boolean {
      return this.velocity === 0;
    }

    get canAcc(): boolean {
      return this.canMove === true && this.velocity < MAX_VELOCITY && !this.canDeceleration
    }

    get isAtStartPosition(): boolean {
      return Math.abs(this.reel.y - REEL_SET_Y) < 2;
    }

  }

  // generate random sprits colors
  function generateRandomColor(): number {
    // 生成一个 0 到 16777215 之间的随机整数（即 0x000000 到 0xFFFFFF）
    const randomColor = Math.floor(Math.random() * 16777215);
    return randomColor;
  }

  // create a mask
  function createMask(maskX: number, maskY: number, maskWidth: number, maskHeight: number, maskColor: number, maskAlpha: number): { mask: PIXI.Graphics } {
    const mask = new PIXI.Graphics();
    mask.rect(maskX, maskY, maskWidth, maskHeight);
    mask.fill({ color: maskColor, alpha: maskAlpha });
    app.stage.addChild(mask);
    return { mask };
  }

  // create a container filled with Sprites
  function buildReel(sprites: Sprites): PIXI.Container {
    const reel = new PIXI.Container();
    for (let i = 0; i < sprites.length; i++) {
      reel.addChild(sprites[i])
    }
    return reel
  }

  // render reel
  function renderReel(reel: PIXI.Container, scale_index: number, space: number): void {
    for (let i = 0; i < reel.children.length; i++) {
      const sprite = reel.children[i];
      // todo: extract this line to a function called arrange
      sprite.y = i * space;
      sprite.scale.set(scale_index);
    }
  }

  // build and render a reel 
  function createReel(sprites: Sprites, scale_index: number, space: number): PIXI.Container {
    const reel = buildReel(sprites)
    renderReel(reel, scale_index, space)
    return reel
  }

  // create reel array containing a certain number of reels 
  function createReels(spritesArray: Sprites[], scale_index: number, space: number): PIXI.Container[] {
    /*create some reels by calling function createReel many times
     * put reels into an array
     * return this array */
    const reels: PIXI.Container[] = []
    for (let i = 0; i < spritesArray.length; i++) {
      const reel = createReel(spritesArray[i], scale_index, space);
      reels.push(reel);
    }
    return reels
  }

  // build a reel set containing reels
  function buildReelSet(reels: PIXI.Container[]): PIXI.Container {
    const reelSet = new PIXI.Container();
    for (let i = 0; i < reels.length; i++) {
      reelSet.addChild(reels[i])
    }
    return reelSet;
  }

  // render reel set
  function renderReelSet(reelSet: PIXI.Container, startX: number, startY: number, gap: number): void {
    for (let i = 0; i < reelSet.children.length; i++) {
      const reel = reelSet.children[i];
      reel.x = startX + i * gap;
      reel.y = startY;
    }
  }

  // create reel set
  function createReelSet(reels: PIXI.Container[], startX: number, startY: number, gap: number): PIXI.Container {
    const reelSet = buildReelSet(reels)
    renderReelSet(reelSet, startX, startY, gap)
    return reelSet
  }



  // Scroll the reel as assigned direction
  function move(reel: PIXI.Container, direction: number, deltaTime: number, velocity: number): void {
    if (Math.abs(REEL_SET_Y - (reel.y + velocity * deltaTime * direction)) < SPACE) {
      reel.y += velocity * deltaTime * direction;
    } else {
      reel.y = REEL_SET_Y + direction * SPACE;
    }
  }

  function wrap(reel: PIXI.Container, space: number, fromIndex: number, toIndex: number): void {
    const removedSprite = reel.children[fromIndex];
    reel.removeChild(removedSprite);
    reel.addChildAt(removedSprite, toIndex);
    arrange(reel, space);
  }

  // check wrap
  function checkWrap(reel: PIXI.Container, direction: number): boolean {
    if (direction === SCROLL_DIRECTION_DOWN && reel.y >= REEL_SET_Y + SPACE) {
      return true;
    } else if (direction === SCROLL_DIRECTION_UP && reel.y <= REEL_SET_Y - SPACE) {
      return true;
    }
    return false;
  }

  // reposition
  function reposition(reposition: number): number {
    return reposition
  }

  // move and wrap
  function moveAndWrap(reel: PIXI.Container, space: number, deltaTime: number, direction: number, velocity: number): void {
    move(reel, direction, deltaTime, velocity)

    if (checkWrap(reel, direction) && direction === SCROLL_DIRECTION_DOWN) {
      wrap(reel, space, REEL_SIZE - 1, 0);
      reel.y = reposition(REEL_SET_Y);
    }

    if (checkWrap(reel, direction) && direction === SCROLL_DIRECTION_UP) {
      wrap(reel, space, 0, REEL_SIZE - 1);
      reel.y = reposition(REEL_SET_Y);
    }
  }

  // reposition the elements in the reel
  function arrange(reel: PIXI.Container, space: number): void {
    for (let i = 0; i < reel.children.length; i++) {
      const element = reel.children[i];
      element.y = i * space;
    }
  }

  // acceleration
  function acceleration(reelState: ReelState, maxVelocity: number, increaseRate: number): void {
    if (reelState.velocity < maxVelocity) {
      reelState.velocity += increaseRate;
    }
  }

  // deceleration
  function deceleration(reelState: ReelState) {
    if (reelState.velocity > MIN_VELOCITY) {
      reelState.velocity -= reelState.decRate;

      if (reelState.decRate > 0.02) {
        reelState.decRate -= 0.0005;
      }
      console.log(reelState.decRate);
    }

    if (reelState.velocity < MIN_VELOCITY) {
      reelState.velocity = MIN_VELOCITY;
      reelState.canStop = true;
    }
  }

  // stop
  function stopReelWithBounce(reelState: ReelState) {
    const isLabelMatched = reelState.reel.children[0].label === reelState.stopIndex;

    if (reelState.isAtStartPosition && isLabelMatched) {
      reelState.canMove = false;
      reelState.decRate = VELOCITY_DECREASE_RATE;

      gsap.to(reelState.reel, {
        y: REEL_SET_Y + 10,       // 向上移动 10px
        duration: 0.03,     // 每次移动时长
        yoyo: true,     // 来回运动
        repeat: 2,     // 无限循环
        ease: "sine.inOut"  // 平滑缓动
      });
    }
  }

  // run
  function run(reelState: ReelState, deltaTime: number) {
    if (reelState.canMove) {
      moveAndWrap(reelState.reel, SPACE, deltaTime, reelState.direction, reelState.velocity);
    }

    if (reelState.canAcc) {
      acceleration(reelState, MAX_VELOCITY, VELOCITY_INCREASE_RATE);
    }

    if (reelState.canDeceleration) {
      deceleration(reelState);
    }

    if (reelState.canStop) {
      stopReelWithBounce(reelState);
    }

    
  }


  // create and set the action mode of the button
  function setButtonActionMode(buttonTexture: PIXI.Sprite): PIXI.Sprite {
    buttonTexture.eventMode = 'static';
    buttonTexture.cursor = 'pointer';
    return buttonTexture
  }


  // create and render the action button
  function createAndRenderButton(buttonSprite: PIXI.Sprite, buttonX: number, buttonY: number, scale_index: number): PIXI.Container {
    buttonSprite.x = buttonX;
    buttonSprite.y = buttonY;
    buttonSprite.scale.set(scale_index);
    app.stage.addChild(buttonSprite);
    return buttonSprite;
  }


  //load the assets
  PIXI.Assets.addBundle("assets", {
    bunny: "/assets/bunny.png",
    gift: "/assets/gift.png",
    club: "/assets/club.png",
    diamond: "/assets/diamond.png",
    heart: "/assets/heart.png",
    spade: "/assets/spade.png"
  });
  const textures = await PIXI.Assets.loadBundle("assets");

  const actionButtonSprite = new PIXI.Sprite(textures.bunny);
  const stopButtonSprite = new PIXI.Sprite(textures.bunny);

  // create sprite map
  const SPRITE_MAP: { [key: number]: PIXI.Texture } = {
    0: PIXI.Assets.get("club"),
    1: PIXI.Assets.get("gift"),
    2: PIXI.Assets.get("diamond"),
    3: PIXI.Assets.get("heart"),
    4: PIXI.Assets.get("spade"),
    5: PIXI.Assets.get("bunny")
  }


  // temp usage of init sprites
  const spritesArray: Sprites[] = []
  // loop of every reel
  
  for (let i = 0; i < BE.GetReelNum(); i++) {
    const sprites: Sprites = []
    //loop of every sprites in one reel
    for (let j = 0; j < REEL_SIZE; j++) {
      let spriteIndex = BE.GetReelSet()[i][j];
      let index = j;
      let texture = SPRITE_MAP[spriteIndex];
      let sprite = new PIXI.Sprite(texture);
      sprite.label = ''+index;
      sprites.push(sprite);
      console.log(sprite.label);
    }
    // console.log("lll");
    spritesArray.push(sprites)
  }

  

  const reels = createReels(spritesArray, SCALE, SPACE);
  const reelSet = createReelSet(reels, REEL_SET_X, REEL_SET_Y, REEL_GAP);
  app.stage.addChild(reelSet);
  // app.stage.addChild(createReelSet(createReels(spritesArray, SCALE, SPACE), REEL_SET_X, REEL_SET_Y, REEL_GAP))

  // create top and bottom masks
  createMask(MASK_TOP_X, MASK_TOP_Y, MASK_TOP_WIDTH, MASK_TOP_HEIGHT, MASK_COLOR, MASK_ALPHA)
  createMask(MASK_BOTTOM_X, MASK_BOTTOM_Y, MASK_BOTTOM_WIDTH, MASK_BOTTOM_HEIGHT, MASK_COLOR, MASK_ALPHA)

  // create and render button
  const actionButton = createAndRenderButton(setButtonActionMode(actionButtonSprite), AVTIONBUTTON_X, ACTIONBUTTON_Y, ACTIONBUTTON_SCALE);
  const stopButton = createAndRenderButton(setButtonActionMode(stopButtonSprite), AVTIONBUTTON_X + 100, ACTIONBUTTON_Y, ACTIONBUTTON_SCALE);


  // todo: add states of all reels here
  const reelStates: ReelState[] = [
    new ReelState(SCROLL_DIRECTION_DOWN, reels[0]),
    new ReelState(SCROLL_DIRECTION_UP, reels[1]),
    new ReelState(SCROLL_DIRECTION_DOWN, reels[2]),
    new ReelState(SCROLL_DIRECTION_UP, reels[3]),
    new ReelState(SCROLL_DIRECTION_DOWN, reels[4]),
    new ReelState(SCROLL_DIRECTION_UP, reels[5])
  ]

  actionButton.on('pointerdown', () => {
    // reel1State.canMove = true;
    // reel1State.canStop = false;
    // reel1State.canDeceleration = false;
    // reel1State.velocity = 0;
    reelStates.forEach((reel) => {
      reel.canMove = true;
      reel.canStop = false;
      reel.canDeceleration = false;
      reel.velocity = 0;
    });
  });

  stopButton.on('pointerdown', () => {
    // reel1State.canDeceleration = true;

    const spinResult = BE.GetSpinResult();
    const stopIndex = spinResult.reelStopsFirst

    for (let reelIndex = 0; reelIndex < BE.GetReelNum(); reelIndex++) {
      const reelState = reelStates[reelIndex];
      reelState.canDeceleration = true;
      reelState.stopIndex = ''+stopIndex[reelIndex];
    }

  });



  app.ticker.add((time: PIXI.Ticker) => {      

    for (let i = 0; i < reelStates.length; i++) {
      const reelState = reelStates[i];
      run(reelState, time.deltaTime);
    }
    

  });



})();


