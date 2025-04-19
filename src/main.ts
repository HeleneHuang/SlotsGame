
import * as PIXI from "pixi.js";
import { gsap } from 'gsap';
import * as BE from './be.ts';
import { GlowFilter } from 'pixi-filters';
import { sound, Sound } from '@pixi/sound';

// define the name of the type 'PIXI.Sprite[]'
type Sprites = PIXI.Sprite[]

(async () => {

  // Create and initialize a new application
  const app = new PIXI.Application();
  await app.init({ resizeTo: window });
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  // define gloable variables
  const REEL_GAP = 140;
  const CENTER_X = app.screen.width / 2;
  const CENTER_Y = app.screen.height / 2;
  const SCALE = 0.6;

  const SCROLL_DIRECTION_DOWN = 1;
  const SCROLL_DIRECTION_UP = -1;

  const MAX_VELOCITY = 50;
  const MIN_VELOCITY = 13;
  const VELOCITY_INCREASE_RATE = 0.9;
  const VELOCITY_DECREASE_RATE = 0.5;

  const MUSICBUTTON_X = 20;
  const MUSICBUTTON_Y = 20;
  const MUSICBUTTON_SCALE = 0.3;

  const ACTIONBUTTON_X = app.screen.width - 300;
  const ACTIONBUTTON_Y = app.screen.height - 200;
  const ACTIONBUTTON_SCALE = 1;

  const ADD_REEL_ROW_BUTTON_X = ACTIONBUTTON_X - 100;
  const ADD_REEL_ROW_BUTTON_Y = ACTIONBUTTON_Y
  const ADD_REEL_ROW_BUTTON_SCALE = 0.5;

  const REDUCE_REEL_ROW_BUTTON_X = ACTIONBUTTON_X - 100;
  const REDUCE_REEL_ROW_BUTTON_Y = ACTIONBUTTON_Y + 100;
  const REDUCE_REEL_ROW_BUTTON_SCALE = 0.5;

  const SPACE = 130;
  const REEL_SIZE = BE.GetReelSet()[0].length;
  const REEL_SET_WIDTH = () => BE.GetReelNum() * REEL_GAP
  const REEL_SET_HIGHT = () => BE.GetRowNum() * SPACE
  const REEL_SET_X = () => CENTER_X - REEL_SET_WIDTH() / 2;
  const REEL_SET_Y = () => CENTER_Y - REEL_SET_HIGHT() / 2;

  // backgouund mp4
  const BG_X=app.screen.width / 2;
  const BG_Y=app.screen.height / 2;

  // set background music parameters
  const BGM_AUTOPLAY = false;
  const BGM_LOOP = true;
  const BGM_INITIAL_VOLUME = 0;
  const BGM_FADE_DURATION = 2000;
  const BGM_FADE_MAX_VOLUME = 0.3;

  // set click start button sound parameters
  const START_CLICK_SOUND = asset('bgmClickDuang.mp3');
  const START_CLICK_AUTOPLAY = false;
  const START_CLICK_LOOP = false;
  const START_CLICK_VOLUME = 0.4;

  // set click add/reduce button sound parameters
  const REEL_CLICK_SOUND = asset('bling.mp3');
  const REEL_CLICK_AUTOPLAY = false;
  const REEL_CLICK_LOOP = false;
  const REEL_CLICK_VOLUME = 0.4;

  // set reel roll sound parameters
  // const REEL_ROLL_SOUND = '/assets/reelStep1.5.mp3'
  const REEL_ROLL_SOUND = asset('hu.mp3');
  const REEL_ROLL_AUTOPLAY = false;
  const REEL_ROLL_LOOP = false;
  const REEL_ROLL_VOLUME = 1;

  // set reel stop sound parameters
  const REEL_STOP_SOUND = asset('reelStop1.mp3');
  const REEL_STOP_AUTOPLAY = false;
  const REEL_STOP_LOOP = false;
  const REEL_STOP_VOLUME = 1;

  // set play win sound parameters
  const PLAY_WIN_SOUND = asset('playWin.mp3');
  const PLAY_WIN_AUTOPLAY = false; 
  const PLAY_WIN_LOOP = false;
  const PLAY_WIN_VOLUME = 1;

  // define reel state
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
      return Math.abs(this.reel.y - REEL_SET_Y()) < 2;
    }
  }

  // set mp4 background

  await createVideoBackground(app, asset('bg4.mp4'), BG_X, BG_Y, 0);
  // await createVideoBackground(app, './assets/bgReel.mp4', BG_X, BG_Y, 1, 0.5);

  // set bgm
  const bgm = music(asset('bgMusic.mp4'), BGM_AUTOPLAY, BGM_LOOP, BGM_INITIAL_VOLUME);
  fadeInAudio(bgm, BGM_FADE_DURATION, BGM_FADE_MAX_VOLUME);

  // set sounds
  const bgmClickSound = music(START_CLICK_SOUND, START_CLICK_AUTOPLAY, START_CLICK_LOOP, START_CLICK_VOLUME);
  const reelClickSound = music(REEL_CLICK_SOUND, REEL_CLICK_AUTOPLAY, REEL_CLICK_LOOP, REEL_CLICK_VOLUME);
  const reelRollSound = music(REEL_ROLL_SOUND, REEL_ROLL_AUTOPLAY, REEL_ROLL_LOOP, REEL_ROLL_VOLUME);
  const reelStopSound = music(REEL_STOP_SOUND, REEL_STOP_AUTOPLAY, REEL_STOP_LOOP, REEL_STOP_VOLUME);
  const playWinSound = music(PLAY_WIN_SOUND, PLAY_WIN_AUTOPLAY, PLAY_WIN_LOOP, PLAY_WIN_VOLUME);

  // deploy path
  function asset(path:string) {
    return new URL(`./assets/${path}`, import.meta.url).href;
  }

  // set background mp4
  async function createVideoBackground(app: PIXI.Application, videoUrl: string, x:number,y:number, layer:number, scale?:number): Promise<PIXI.Sprite> {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
  
    try {
      await video.play();
    } catch (e) {
      console.warn('Autoplay blocked:', e);
    }
  
    const texture = PIXI.Texture.from(video);
    const bg = new PIXI.Sprite(texture);
  
    const finalScale = scale ?? Math.max(
      app.screen.width / bg.texture.width,
      app.screen.height / bg.texture.height
    );
    bg.scale.set(finalScale);
  
    bg.anchor.set(0.5);
    bg.x = x;
    bg.y = y;
  
    app.stage.addChildAt(bg, layer);
  
    return bg;
  }

  // set music
  function music(url: string, autoplay: boolean, loop: boolean, volume: number): Sound {
    const bgm = sound.add('bgm', {
      url: url,
      autoPlay: autoplay,
      loop: loop,
      volume: volume, 
    });
    return bgm;
  }

  // play click sound
  function playClickSound(soundName: Sound) {
    soundName.play();
  }

  // background music fade in 
  function fadeInAudio(audio: Sound, duration: number, maxVolume: number) {
    const start = performance.now();
    function step(time: number) {
      const progress = Math.min((time - start) / duration, 1);
      audio.volume = maxVolume * progress;  // set max volume
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    audio.play();
  }

  // background music fade out
  function fadeOutAudio(audio: Sound, duration: number, maxVolume: number) {
    const start = performance.now();

    const startVolume = Math.min(audio.volume, maxVolume);

    function step(time: number) {
      const progress = Math.min((time - start) / duration, 1);
      audio.volume = startVolume * (1 - progress); 
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        audio.stop(); 
      }
    }

    requestAnimationFrame(step);
  }

  // create sprites array for reel set 
  function createReelsSprites(reelNum: number, reelSize: number, spriteMap: { [key: number]: PIXI.Texture }): Sprites[] {
    const spritesArray: Sprites[] = [];

    // loop of every reel
    for (let i = 0; i < reelNum; i++) {
      const sprites: Sprites = [];

      // loop of every sprites in one reel
      for (let j = 0; j < reelSize; j++) {
        const spriteIndex = BE.GetReelSet()[i][j];
        const texture = spriteMap[spriteIndex];
        const sprite = new PIXI.Sprite(texture);
        sprite.label = '' + j;  // set label for each sprite
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

  // load all reels
  // reelNum: number of reels on play area
  function loadReels(reelNum: number) {
    const spritesArray = createReelsSprites(reelNum, REEL_SIZE, SPRITE_MAP);
    const reels = createReels(spritesArray, SCALE, SPACE);
    const reelSet = createReelSet(reels, REEL_SET_X(), REEL_SET_Y() + 10, REEL_GAP);
    reelSet.filterArea = new PIXI.Rectangle(REEL_SET_X(), REEL_SET_Y(), REEL_SET_WIDTH(), REEL_SET_HIGHT() + 15);
    reelSet.filters = [new PIXI.AlphaFilter()];
    reelSet.label = 'reelSet';
    app.stage.addChild(reelSet);
    reelStates = createReelStates(reels);
    wins = [];
    bounce(reelSet, 2);
  }

  // remove all the children from the container
  function removeReelSetByLabel() {
    const reelSetChild = app.stage.getChildByLabel('reelSet');
    if (reelSetChild) {
      app.stage.removeChild(reelSetChild);
    }
  }

  // Scroll the reel as assigned direction
  function move(reel: PIXI.Container, direction: number, deltaTime: number, velocity: number): void {
    if (Math.abs(REEL_SET_Y() - (reel.y + velocity * deltaTime * direction)) < SPACE) {
      reel.y += velocity * deltaTime * direction;
    } else {
      reel.y = REEL_SET_Y() + direction * SPACE;
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
    if (direction === SCROLL_DIRECTION_DOWN && reel.y >= REEL_SET_Y() + SPACE) {
      return true;
    } else if (direction === SCROLL_DIRECTION_UP && reel.y <= REEL_SET_Y() - SPACE) {
      return true;
    }
    return false;
  }

  // move and wrap
  function moveAndWrap(reel: PIXI.Container, space: number, deltaTime: number, direction: number, velocity: number): void {
    move(reel, direction, deltaTime, velocity)

    if (checkWrap(reel, direction) && direction === SCROLL_DIRECTION_DOWN) {
      wrap(reel, space, REEL_SIZE - 1, 0);
      reel.y = REEL_SET_Y();
    }

    if (checkWrap(reel, direction) && direction === SCROLL_DIRECTION_UP) {
      wrap(reel, space, 0, REEL_SIZE - 1);
      reel.y = REEL_SET_Y();
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
  function acceleration(reelState: ReelState, increaseRate: number): void {
    if (reelState.velocity < MAX_VELOCITY) {
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
    }

    if (reelState.velocity < MIN_VELOCITY) {
      reelState.velocity = MIN_VELOCITY;
      reelState.canStop = true;
    }
  }

  // the action logic of stop  
  function triggerStop() {
    const spinResult = BE.GetSpinResult();
    const stopIndex = spinResult.reelStopsFirst;

    for (let reelIndex = 0; reelIndex < reelStates.length; reelIndex++) {
      const reelState = reelStates[reelIndex];
      reelState.canDeceleration = true;
      reelState.stopIndex = '' + stopIndex[reelIndex];
    }

    wins = spinResult.wins;
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
        y: REEL_SET_Y() + 10,
        duration: 0.03,
        yoyo: true,
        repeat: 2,
        ease: "sine.inOut"
      });

      playClickSound(reelStopSound);
    }
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

  // bounce action
  function bounce(container: PIXI.Container, num: number) {
    gsap.to(container, {
      y: container.y + 10,
      duration: 0.2,
      yoyo: true,
      repeat: num,
      ease: "sine.inOut"
    });
  }

  // glow action
  function glowAnimation(sprite: PIXI.ContainerChild) {
    const glow = new GlowFilter({
      color: 0xFFFFFF,
      distance: 20,
      outerStrength: 0,
      innerStrength: 0,
      quality: 0.3
    });
    sprite.filters = [glow];
    gsap.to(glow, {
      duration: 1,
      outerStrength: 4,
      ease: "easeInOut",
      yoyo: true,
      repeat: 4
    });
  }

  // hightlight winning symbols
  function highlightWinningSymbols(winResults: BE.Win[]) {
    winResults.forEach(win => {
      win.positions.forEach(position => {
        const highlightSymbol = reelStates[position.x].reel.children[position.y];

        bounce(highlightSymbol, -1);
        glowAnimation(highlightSymbol);
      });
    });
  }

  // clear all symbols' highlights
  function clearAllHighlights() {
    reelStates.forEach(reelState => {
      reelState.reel.children.forEach(symbol => {
        symbol.tint = 0xFFFFFF;
        gsap.killTweensOf(symbol);
        symbol.y -= 10;
        symbol.filters = [];
      });
    });

  }

  // get total win amount
  function getTotalWinAmount(winResults: BE.Win[]): number {
    let totalAmount = 0;

    winResults.forEach(win => {
      totalAmount += win.amount;
      console.log(`Win for symbol ${win.symId}: Amount = ${win.amount}`);
    });

    return totalAmount;
  }

  // create amount text
  function createAmountText(showText: string) {
    const text = new PIXI.Text({
      text: showText,
      style: {
        fontFamily: 'Impact, Comic Sans MS',
        fontSize: 48,
        fill: 0xFFFFFF,
        align: 'center',
      }
    });
    text.label = "winAmount";
    text.x = (app.screen.width - text.width) / 2;
    text.y = REEL_SET_Y() - 100;
    app.stage.addChild(text);

  }

  // clear amount text
  function clearTextByLabel(label: string) {
    app.stage.children.forEach(child => {
      if (child.label === label) {
        app.stage.removeChild(child);
        child.destroy();
      }
    });
  }

  // is all reels can show win
  function allReelsCanShowWin(): boolean {
    return reelStates.every(reelState => reelState.canShowWin);
  }

  // run
  function run(reelState: ReelState, deltaTime: number) {
    if (reelState.canMove) {
      moveAndWrap(reelState.reel, SPACE, deltaTime, reelState.direction, reelState.velocity);
    }

    if (reelState.canAcc) {
      acceleration(reelState, VELOCITY_INCREASE_RATE);
    }

    if (reelState.canDeceleration) {
      deceleration(reelState);
    }

    if (reelState.canStop) {
      stopReelWithBounce(reelState);
    }

    if (allReelsCanShowWin()) {
      highlightWinningSymbols(wins);
      const totalWinAmount = getTotalWinAmount(wins);
      console.log(`Total Win Amount: ${totalWinAmount}`);
      createAmountText(`Total Win Amount: ${totalWinAmount}`)
      if(totalWinAmount>0){playClickSound(playWinSound)};
      reelState.canShowWin = false;
    }

  }

  // create and set the action mode of the button
  function setButtonActionMode(buttonTexture: PIXI.Sprite): PIXI.Sprite {
    buttonTexture.eventMode = 'static';
    buttonTexture.cursor = 'pointer';
    return buttonTexture
  }

  // create and render the action button
  function createAndRenderButton(buttonSprite: PIXI.Sprite, buttonX: number, buttonY: number, scale_index: number): PIXI.Sprite {
    buttonSprite.x = buttonX;
    buttonSprite.y = buttonY;
    buttonSprite.scale.set(scale_index);
    app.stage.addChild(buttonSprite);
    return buttonSprite;
  }

  //load the assets
  PIXI.Assets.addBundle("assets", {
    gift: asset("gift.png"),
    diamond: asset("diamond.png"),
    spade: asset("spade.png"),
    symbol1: asset("1.png"),
    symbol2: asset("2.png"),
    symbol3: asset("3.png"),
    symbol4: asset("4.png"),
    symbol5: asset("5.png"),
    symbol6: asset("6.png"),
    start: asset("spin.png"),
    reduceButton: asset("reduce.png"),
    addButton: asset("add.png"),
    bgMusicOn: asset("musicOn.png"),
    bgMusicOff: asset("musicOff.png"),
  });
  const textures = await PIXI.Assets.loadBundle("assets");

  const musicOn = new PIXI.Sprite(textures.bgMusicOn);
  const actionButtonSprite = new PIXI.Sprite(textures.start);
  const addReelAndRowSprite = new PIXI.Sprite(textures.addButton);
  const reduceReelAndRowSprite = new PIXI.Sprite(textures.reduceButton);

  // create sprite map
  const SPRITE_MAP: { [key: number]: PIXI.Texture } = {
    0: PIXI.Assets.get("symbol1"),
    1: PIXI.Assets.get("symbol2"),
    2: PIXI.Assets.get("symbol3"),
    3: PIXI.Assets.get("symbol4"),
    4: PIXI.Assets.get("symbol5"),
    5: PIXI.Assets.get("symbol6")
  }

  // create and render button
  const bgMusicButton = createAndRenderButton(setButtonActionMode(musicOn), MUSICBUTTON_X, MUSICBUTTON_Y, MUSICBUTTON_SCALE);
  const actionButton = createAndRenderButton(setButtonActionMode(actionButtonSprite), ACTIONBUTTON_X, ACTIONBUTTON_Y, ACTIONBUTTON_SCALE);
  const addReelAndRowButton = createAndRenderButton(setButtonActionMode(addReelAndRowSprite), ADD_REEL_ROW_BUTTON_X, ADD_REEL_ROW_BUTTON_Y, ADD_REEL_ROW_BUTTON_SCALE);
  const reduceReelAndRowButton = createAndRenderButton(setButtonActionMode(reduceReelAndRowSprite), REDUCE_REEL_ROW_BUTTON_X, REDUCE_REEL_ROW_BUTTON_Y, REDUCE_REEL_ROW_BUTTON_SCALE);

  // all states and wins
  let reelStates: ReelState[];
  let wins: BE.Win[] = []  // win的类的数组(id,坐标和amount)

  // initial all reels
  loadReels(BE.GetReelNum())

  // add background button
  let isPlaying = true;
  bgMusicButton.on('pointerdown', () => {
    if (isPlaying) {
      fadeOutAudio(bgm, BGM_FADE_DURATION, BGM_FADE_MAX_VOLUME);
      playClickSound(bgmClickSound);
      bgMusicButton.texture = textures.bgMusicOff; //  切换成关闭图标
    } else {
      fadeInAudio(bgm, BGM_FADE_DURATION, BGM_FADE_MAX_VOLUME);
      playClickSound(bgmClickSound);
      bgMusicButton.texture = textures.bgMusicOn; //  切换成播放图标
    }
    isPlaying = !isPlaying;
  });


  // add reel and row button
  addReelAndRowButton.on('pointerdown', () => {
    playClickSound(reelClickSound);
    removeReelSetByLabel();
    BE.SetReelNum(BE.GetReelNum() + 1)
    BE.SetRowNum(BE.GetRowNum() + 1)
    loadReels(BE.GetReelNum())
  });

  // reduce reel and row button
  reduceReelAndRowButton.on('pointerdown', () => {
    playClickSound(reelClickSound);
    removeReelSetByLabel()
    BE.SetReelNum(BE.GetReelNum() - 1)
    BE.SetRowNum(BE.GetRowNum() - 1)
    loadReels(BE.GetReelNum())
  });

  // start button
  actionButton.on('pointerdown', () => {
    playClickSound(reelRollSound);
    clearAllHighlights();
    clearTextByLabel("winAmount");
    reelStates.forEach((reel) => {
      reel.canMove = true;
      reel.canStop = false;
      reel.canDeceleration = false;
      reel.velocity = 0;
      reel.canShowWin = false;
    });

    setTimeout(() => {
      triggerStop();
    }, 800);
  });

  app.ticker.add((time: PIXI.Ticker) => {

    for (let i = 0; i < reelStates.length; i++) {
      const reelState = reelStates[i];
      run(reelState, time.deltaTime);
    }

  });

})();


