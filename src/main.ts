
import * as PIXI from "pixi.js";
import { Application } from 'pixi.js';
import { gsap } from 'gsap';
import * as BE from './be.ts';
import { ColorMatrixFilter } from '@pixi/filter-color-matrix';
import { GlowFilter } from '@pixi/filter-glow';

// define the name of the type 'PIXI.Sprite[]'
type Sprites = PIXI.Sprite[]

(async () => {

  // Create and initialize a new application
  const app = new PIXI.Application();
  await app.init({ background: "#1099bb", resizeTo: window });
  document.getElementById("game-container")!.appendChild(app.canvas);

  // define gloable variables
  const VISIBLE_TOP = app.screen.height * 2 / 7;
  const VISIBLE_BOTTOM = app.screen.height * 5 / 7;
  const REEL_GAP = 100;
  const CENTER_X = app.screen.width / 2;
  const CENTER_Y = app.screen.height / 2;
  const SCALE = 0.4;
  const SPACE = 80;

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

  const ACTIONBUTTON_X = 0;
  const ACTIONBUTTON_Y = 0;
  const ACTIONBUTTON_SCALE = 2;

  const ADD_REEL_ROW_BUTTON_X = app.screen.width - 100;
  const ADD_REEL_ROW_BUTTON_Y = app.screen.height - 100;
  const ADD_REEL_ROW_BUTTON_SCALE = 1;

  const REDUCE_REEL_ROW_BUTTON_X = 0;
  const REDUCE_REEL_ROW_BUTTON_Y = app.screen.height - 100;
  const REDUCE_REEL_ROW_BUTTON_SCALE = 1;


  const REEL_SIZE = BE.GetReelSet()[0].length;
  const REEL_SET_X = CENTER_X - BE.GetReelNum() * REEL_GAP / 2;
  const REEL_SET_Y = CENTER_Y - REEL_SIZE * SPACE / 2;

  let REEL_NUM_INITIAL = BE.GetReelSet().length - 1;
  let ROW_NUM_INITIAL = REEL_SIZE - 1;

  let REEL_NUM_ADDED = addReelAndRow().reelNum;
  let ROW_NUM_ADDED = addReelAndRow().rowNum;
  let REEL_NUM_REDUCED = reduceReelAndRow().reelNum;
  let ROW_NUM_REDUCED = reduceReelAndRow().rowNum;

  // const GLOW_FILTER = new GlowFilter({
  //   distance: 15, // 发光的扩散距离
  //   outerStrength: 4,  // 外发光的强度
  //   innerStrength: 1,
  //   color: 0xFFD700,
  //   quality: 0.5  // 质量，值越高效果越好
  // });
  // GLOW_FILTER.padding = 10;
  // GLOW_FILTER.knockout = false;

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
    canShowWin: boolean;

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
      this.canShowWin = false;
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
  function createMask(maskX: number, maskY: number, maskWidth: number, maskHeight: number, maskColor: number, maskAlpha: number):  PIXI.Graphics  {
    const mask = new PIXI.Graphics();
    mask.rect(maskX, maskY, maskWidth, maskHeight);
    mask.fill({ color: maskColor, alpha: maskAlpha });
    app.stage.addChild(mask);
    return  mask;
  }

  // create sprites array
  function createReelsSprites(reelNum: number, reelSize: number, spriteMap: { [key: number]: PIXI.Texture }): Sprites[] {
    const spritesArray: Sprites[] = [];

    // loop of every reel
    for (let i = 0; i < reelNum; i++) {
      const sprites: Sprites = [];

      // loop of every sprites in one reel
      for (let j = 0; j < reelSize; j++) {
        let spriteIndex = BE.GetReelSet()[i][j]; // 获取当前 reel 中的 sprite 索引
        let texture = spriteMap[spriteIndex];  // 获取对应的纹理
        let sprite = new PIXI.Sprite(texture); // 创建新的 sprite
        sprite.label = '' + j;  // 给每个 sprite 设置一个 label（可以作为调试信息）
        sprites.push(sprite);
      }

      spritesArray.push(sprites);
    }

    return spritesArray;
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

  // create and show reels
  async function createAndShowReels(reelNum: number, reelSize: number): Promise<Application> {
    const app = new Application();
    await app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1099bb, // 背景色
    });

    // 添加到页面中（确保你有一个容器，比如 div#game-container）
    document.getElementById("game-container")?.appendChild(app.canvas);

    const spritesArray = createReelsSprites(reelNum, reelSize, SPRITE_MAP);
    const reels = createReels(spritesArray, SCALE, SPACE);
    const reelSet = createReelSet(reels, REEL_SET_X, REEL_SET_Y, REEL_GAP);
    app.stage.addChild(reelSet);

    const topMask=createMask(MASK_TOP_X, MASK_TOP_Y, MASK_TOP_WIDTH, MASK_TOP_HEIGHT, MASK_COLOR, MASK_ALPHA);
    const bottomMask =createMask(MASK_BOTTOM_X, MASK_BOTTOM_Y, MASK_BOTTOM_WIDTH, MASK_BOTTOM_HEIGHT, MASK_COLOR, MASK_ALPHA);
    app.stage.addChild(topMask, bottomMask);

    const actionButton = createAndRenderButton(setButtonActionMode(actionButtonSprite), ACTIONBUTTON_X, ACTIONBUTTON_Y, ACTIONBUTTON_SCALE);
    const stopButton = createAndRenderButton(setButtonActionMode(stopButtonSprite), ACTIONBUTTON_X + 100, ACTIONBUTTON_Y, ACTIONBUTTON_SCALE);
    const addReelAndRowButton = createAndRenderButton(setButtonActionMode(addReelAndRowSprite), ADD_REEL_ROW_BUTTON_X, ADD_REEL_ROW_BUTTON_Y, ADD_REEL_ROW_BUTTON_SCALE);
    const reduceReelAndRowButton = createAndRenderButton(setButtonActionMode(reduceReelAndRowSprite), REDUCE_REEL_ROW_BUTTON_X, REDUCE_REEL_ROW_BUTTON_Y, REDUCE_REEL_ROW_BUTTON_SCALE);

    app.stage.addChild(actionButton, stopButton, addReelAndRowButton, reduceReelAndRowButton)
    return app;
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
      // console.log(reelState.decRate);
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
      reelState.canShowWin = true;
      reelState.canStop = false;

      gsap.to(reelState.reel, {
        y: REEL_SET_Y + 10,       // 向上移动 10px
        duration: 0.03,     // 每次移动时长
        yoyo: true,     // 来回运动
        repeat: 2,     // 无限循环
        ease: "sine.inOut"  // 平滑缓动
      });
    }
  }

  // hightlight winning symbols
  function highlightWinningSymbols(winResults: BE.Win[]) {
    winResults.forEach(win => {
      win.positions.forEach(position => {
        const highlightSymbol = reelStates[position.x].reel.children[position.y];
        highlightSymbol.tint = 0x000000;
      }
      )
    }
    )
  }

  // tell if all reels are stopped
  function allReelsCanShowWin(): boolean {
    return reelStates.every(reelState => reelState.canShowWin);
  }

  // run: moveAndWrap, acceleration, deceleration, stopReelWithBounce, highlightWinningSymbols
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

    if (allReelsCanShowWin()) {
      console.log("sfaegagavs");

      highlightWinningSymbols(wins);
      reelState.canShowWin = false;
    }

  }

  // add Reel and row
  function addReelAndRow(): { reelNum: number, rowNum: number } {
    REEL_NUM_INITIAL += 1;
    ROW_NUM_INITIAL += 1;
    return { reelNum: REEL_NUM_INITIAL, rowNum: ROW_NUM_INITIAL };
  }

  // reduce Reel and row
  function reduceReelAndRow(): { reelNum: number, rowNum: number } {
    REEL_NUM_INITIAL -= 3;
    ROW_NUM_INITIAL -= 1;

    return { reelNum: REEL_NUM_INITIAL, rowNum: ROW_NUM_INITIAL };
  }

  // create reel states 
  function createReelStates(reels: PIXI.Container[]): ReelState[] {
    const reelStates: ReelState[] = [];

    for (let i = 0; i < reels.length; i++) {
      const direction = i % 2 === 0 ? SCROLL_DIRECTION_DOWN : SCROLL_DIRECTION_UP;
      const reelState = new ReelState(direction, reels[i]);
      reelStates.push(reelState);
    }

    return reelStates;
  }

  // create reelstates when starting 
  function resetReelStates(reelStates: ReelState[]) {
    reelStates.forEach(reel => {
      reel.canMove = true;
      reel.canStop = false;
      reel.canDeceleration = false;
      reel.velocity = 0;
      reel.canShowWin = false;
    });
  }

  // create and render the action button
  function createAndRenderButton(buttonSprite: PIXI.Sprite, buttonX: number, buttonY: number, scale_index: number): PIXI.Container {
    buttonSprite.x = buttonX;
    buttonSprite.y = buttonY;
    buttonSprite.scale.set(scale_index);
    app.stage.addChild(buttonSprite);
    return buttonSprite;
  }

  // create and set the action mode of the button
  function setButtonActionMode(buttonTexture: PIXI.Sprite): PIXI.Sprite {
    buttonTexture.eventMode = 'static';
    buttonTexture.cursor = 'pointer';
    return buttonTexture
  }

  // create amount text
  function createAmountText(winAmount: number) {
    const text = new PIXI.Text({
      text: `Total Amount: ${totalAmount}`,
      style: {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xff1010,
        align: 'center',
      }
    });

    text.x = 100;
    text.y = 50;

    app.stage.addChild(text);
  }


  //load the assets
  PIXI.Assets.addBundle("assets", {
    bunny: "/assets/bunny.png",
    gift: "/assets/gift.png",
    club: "/assets/club.png",
    diamond: "/assets/diamond.png",
    heart: "/assets/heart.png",
    spade: "/assets/spade.png",
    light1: 'https://pixijs.com/assets/light_rotate_1.png',
    symbol1: "/assets/1.png",
    symbol2: "/assets/2.png",
    symbol3: "/assets/3.png",
    symbol4: "/assets/4.png",
    symbol5: "/assets/5.png",
    symbol6: "/assets/6.png",
  });
  const textures = await PIXI.Assets.loadBundle("assets");

  // create sprites of buttons
  const actionButtonSprite = new PIXI.Sprite(textures.bunny);
  const stopButtonSprite = new PIXI.Sprite(textures.bunny);
  const addReelAndRowSprite = new PIXI.Sprite(textures.heart);
  const reduceReelAndRowSprite = new PIXI.Sprite(textures.club);

  const light1Sprite = new PIXI.Sprite(textures.light1)

  // create sprite map
  const SPRITE_MAP: { [key: number]: PIXI.Texture } = {
    0: PIXI.Assets.get("symbol1"),
    1: PIXI.Assets.get("symbol2"),
    2: PIXI.Assets.get("symbol3"),
    3: PIXI.Assets.get("symbol4"),
    4: PIXI.Assets.get("symbol5"),
    5: PIXI.Assets.get("symbol6")
  }

  // // temp usage of init sprites
  // const spritesArray: Sprites[] = []

  // // loop of every reel
  // for (let i = 0; i < BE.GetReelNum(); i++) {
  //   const sprites: Sprites = []
  //   //loop of every sprites in one reel
  //   for (let j = 0; j < REEL_SIZE; j++) {
  //     let spriteIndex = BE.GetReelSet()[i][j];
  //     let index = j;
  //     let texture = SPRITE_MAP[spriteIndex];
  //     let sprite = new PIXI.Sprite(texture);
  //     sprite.label = '' + index;
  //     sprites.push(sprite);
  //   }
  //   spritesArray.push(sprites)
  // }

  // create sprites array
  const spritesArray = createReelsSprites(BE.GetReelNum(), REEL_SIZE, SPRITE_MAP);
  const spritesArrayAdded = createReelsSprites(REEL_NUM_ADDED, ROW_NUM_ADDED, SPRITE_MAP);
  const spritesArrayReduced = createReelsSprites(REEL_NUM_REDUCED, ROW_NUM_REDUCED, SPRITE_MAP);

  const reels = createReels(spritesArray, SCALE, SPACE);
  const reelsAdded = createReels(spritesArrayAdded, SCALE, SPACE);
  const reelsReduced = createReels(spritesArrayReduced, SCALE, SPACE);

  const reelSet = createReelSet(reels, REEL_SET_X, REEL_SET_Y, REEL_GAP);
  // const reelSetAdded = createReelSet(reelsAdded, REEL_SET_X, REEL_SET_Y, REEL_GAP);
  // const reelSetReduced = createReelSet(reelsReduced, REEL_SET_X, REEL_SET_Y, REEL_GAP);

  app.stage.addChild(reelSet);
  // app.stage.addChild(createReelSet(createReels(spritesArray, SCALE, SPACE), REEL_SET_X, REEL_SET_Y, REEL_GAP))

  // create top and bottom masks
  createMask(MASK_TOP_X, MASK_TOP_Y, MASK_TOP_WIDTH, MASK_TOP_HEIGHT, MASK_COLOR, MASK_ALPHA)
  createMask(MASK_BOTTOM_X, MASK_BOTTOM_Y, MASK_BOTTOM_WIDTH, MASK_BOTTOM_HEIGHT, MASK_COLOR, MASK_ALPHA)

  // create and render button
  const actionButton = createAndRenderButton(setButtonActionMode(actionButtonSprite), ACTIONBUTTON_X, ACTIONBUTTON_Y, ACTIONBUTTON_SCALE);
  const stopButton = createAndRenderButton(setButtonActionMode(stopButtonSprite), ACTIONBUTTON_X + 100, ACTIONBUTTON_Y, ACTIONBUTTON_SCALE);
  const addReelAndRowButton = createAndRenderButton(setButtonActionMode(addReelAndRowSprite), ADD_REEL_ROW_BUTTON_X, ADD_REEL_ROW_BUTTON_Y, ADD_REEL_ROW_BUTTON_SCALE);
  const reduceReelAndRowButton = createAndRenderButton(setButtonActionMode(reduceReelAndRowSprite), REDUCE_REEL_ROW_BUTTON_X, REDUCE_REEL_ROW_BUTTON_Y, REDUCE_REEL_ROW_BUTTON_SCALE);

  // add states of all reels 
  // const reelStates: ReelState[] = [
  //   new ReelState(SCROLL_DIRECTION_DOWN, reels[0]),
  //   new ReelState(SCROLL_DIRECTION_UP, reels[1]),
  //   new ReelState(SCROLL_DIRECTION_DOWN, reels[2]),
  //   new ReelState(SCROLL_DIRECTION_UP, reels[3]),
  //   new ReelState(SCROLL_DIRECTION_DOWN, reels[4]),
  //   new ReelState(SCROLL_DIRECTION_UP, reels[5])
  // ] 

  const reelStates = createReelStates(reels);
  const reelStatesAdded = createReelStates(reelsAdded);
  const reelStatesReduced = createReelStates(reelsReduced);

  let wins: BE.Win[] = []  // win的类的数组(id,坐标和amount)


  let canAddReelAndRow = false;
  let canReduceReelAndRow = false;
  // set addReelAndRow button event
  addReelAndRowButton.on('pointerdown', async () => {
    console.log("Button clicked");
    // 清除旧画面
    const container = document.getElementById("game-container");
    if (container) container.innerHTML = "";

    await createAndShowReels(REEL_NUM_ADDED, ROW_NUM_ADDED);
    canAddReelAndRow = true;
  });

  // set addReelAndRow button event
  reduceReelAndRowButton.on('pointerdown', () => {
    createAndShowReels(REEL_NUM_REDUCED, ROW_NUM_REDUCED);
    canReduceReelAndRow = true;
  });

  // set action button event
  actionButton.on('pointerdown', () => {
    clearHighlights();

    // reelStates.forEach((reel) => {
    //   reel.canMove = true;
    //   reel.canStop = false;
    //   reel.canDeceleration = false;
    //   reel.velocity = 0;
    //   reel.canShowWin = false;
    // });
    if (canAddReelAndRow) {
      resetReelStates(reelStatesAdded)
    } else if (canReduceReelAndRow) {
      resetReelStates(reelStatesReduced)
    } else {
      resetReelStates(reelStates);
    }

  });

  // set stop button event
  stopButton.on('pointerdown', () => {
    // stop at assigned reelIndex
    const spinResult = BE.GetSpinResult();
    const stopIndex = spinResult.reelStopsFirst

    for (let reelIndex = 0; reelIndex < BE.GetReelNum(); reelIndex++) {
      const reelState = reelStates[reelIndex];
      reelState.canDeceleration = true;
      reelState.stopIndex = '' + stopIndex[reelIndex];
    }

    wins = spinResult.wins
    console.log(spinResult);
  });



  // ticker function
  app.ticker.add((time: PIXI.Ticker) => {

    // if canAddRealAndRow is true, the loop i should < reelStates.length-1
    if (canAddReelAndRow) {      
      for (let i = 0; i < reelStatesAdded.length; i++) {
        const reelState = reelStatesAdded[i];        
        run(reelState, time.deltaTime);
      }
    }

  });


  // highlight the win symbols
  let totalAmount = 0;

  // winResults.forEach(win => {
  //   totalAmount += win.amount;

  //   console.log(`Win for symbol ${win.symId}: Amount = ${win.amount}`);

  //   // 遍历 Win 对象中的 positions 数组，获取每个坐标并高亮
  //   win.positions.forEach(position => {
  //     console.log(`Reel: ${position.x}, Row: ${position.y}`);
  //     highightWinningSymbol(position.x, position.y, light1Sprite);
  //   });
  // });
  // createAmountText(totalAmount);









  // //高亮函数
  function highightWinningSymbol(reelIdx: number, rowIdx: number) {
    // const highlightSymbol = reelStates[reelIdx].reel.children[rowIdx]
    const highlightSymbol = reelStates[0].reel.children[0]
    highlightSymbol.tint = 0x000000;
  }

  // clear hightlight
  function clearHighlights() {
    spritesArray.forEach(reel => {
      reel.forEach(sprite => {
        sprite.tint = 0xFFFFFF; // 重置颜色为默认（无高亮）白色
      });
    });
  }


  // function highightWinningSymbol(reelNum: number, rowNum: number, sprite: PIXI.Sprite) {
  //   const highlightSymbol = spritesArray[reelNum][rowNum]
  //   const light1 = sprite;
  //   const container = new PIXI.Container();

  //   container.position.set(highlightSymbol.x, highlightSymbol.y);

  //   light1.anchor.set(0.5);        // 居中旋转
  //   light1.position.set(0, 0);     // 放在容器中心
  //   light1.scale.set(0.5);         // 根据需要调整大小

  //   container.addChild(light1);

  //   const glowFilter = new GlowFilter({
  //     distance: 1,
  //     outerStrength: 3,
  //     innerStrength: 1,
  //     color: 0xFFD700, // 金色
  //     quality: 1
  //   });

  //   container.filters = [glowFilter as unknown as PIXI.Filter];
  //   highlightSymbol.parent.addChild(container);

  //   app.ticker.add(() => {
  //     light1.rotation += 0.1;
  //   });
  // }






})();


