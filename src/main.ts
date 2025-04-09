// import { Application, Assets, Sprite } from "pixi.js";
import * as PIXI from "pixi.js";

function generateRandomColor(): number {
  // 生成一个 0 到 16777215 之间的随机整数（即 0x000000 到 0xFFFFFF）
  const randomColor = Math.floor(Math.random() * 16777215);
  return randomColor;
}
// create a colum of pics
function createPicContainer(picTexture: PIXI.Texture, scale_index: number): PIXI.Container {
  const reel = new PIXI.Container();

  for (let i = 0; i < 9; i++) {
    const pic = new PIXI.Sprite(picTexture);
    pic.scale.set(scale_index);
    pic.tint = generateRandomColor()
    const picContainer = new PIXI.Container();
    picContainer.y = i * 100;
    picContainer.addChild(pic);

    reel.addChild(picContainer);
  }

  return reel
}
// create reels
function createReels(texture: PIXI.Texture, count: number, app: PIXI.Application): PIXI.Container[] {
  const reels: PIXI.Container[] = [];

  for (let i = 0; i < count; i++) {
    const reel = createPicContainer(texture, 1);
    reels.push(reel);
    app.stage.addChild(reel);
  }

  return reels;
}


// reposition the elements in the reel
function render(reel:PIXI.Container): void {
  for (let i = 0; i < reel.children.length; i++) {
    const element = reel.children[i];
    element.y  = i * 100;
  }
}


(async () => {
  // Create and initialize a new application
  const app = new PIXI.Application();
  await app.init({ background: "#1099bb", resizeTo: window });
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  //load the assets
  PIXI.Assets.addBundle("assets", {
    bunny: "/assets/bunny.png",
    gift: "/assets/gift.png",
  });
  const textures = await PIXI.Assets.loadBundle("assets");

  // create centerLine
  const centerLine = new PIXI.Graphics();
  centerLine.moveTo(0, app.screen.height / 2);
  centerLine.lineTo(app.screen.width, app.screen.height / 2);
  centerLine.stroke({ width: 2, color: 0x000000, alpha: 1 });
  app.stage.addChild(centerLine);

  // create a mask
  function addMask(app: PIXI.Application, alpha_index: number): { topMask: PIXI.Graphics, bottomMask: PIXI.Graphics } {

      const topMask = new PIXI.Graphics();
      topMask.rect(0, 0, app.screen.width, VISIBLE_TOP);
      topMask.fill({ color: 0x000000, alpha: alpha_index });
  
      const bottomMask = new PIXI.Graphics();
      bottomMask.rect(0, VISIBLE_BOTTOM, app.screen.width, app.screen.height * 2 / 7);
      bottomMask.fill({ color: 0x000000, alpha: alpha_index });
  
      app.stage.addChild(topMask, bottomMask);
  
      return { topMask, bottomMask };
    }
  // create a reel set
  function createReelSet(reel1: PIXI.Container, reel2: PIXI.Container, reel3: PIXI.Container): PIXI.Container {
    const reelSet = new PIXI.Container();
    reelSet.addChild(reel1, reel2, reel3)
    app.stage.addChild(reelSet);
    return reelSet;
  }
  // set the position of the reels
  function positionReels(reels: PIXI.Container[], startX: number, startY: number, gap: number): void {
    for (let i = 0; i < reels.length; i++) {
      const reel = reels[i];
      reel.x = startX + i * gap;
      reel.y = startY;
    }
  }


  // define gloable variables
  const CENTER = app.screen.width / 2;
  const VISIBLE_TOP = app.screen.height * 2 / 7;
  const VISIBLE_BOTTOM = app.screen.height * 5 / 7;


  // Load the bunny texture
  const giftTexture = textures.gift;

  // create and show reels
  const [reel_1, reel_2, reel_3] = createReels(giftTexture, 3, app);

  // create and set position of reelSet
  const reelSet = createReelSet(reel_1, reel_2, reel_3);  
  reelSet.x = (app.screen.width - reelSet.width) / 2 - reelSet.width;

  // set position of reels
  positionReels([reel_1, reel_2, reel_3], 0, app.screen.height * 3 / 14, 100);

  // add mask
  addMask(app, 0.5);

  // ----------------------------------------------

  // create action button
  const buttonTexture = textures.bunny;
  const actionButton = new PIXI.Sprite(buttonTexture);
  actionButton.interactive = true;
  actionButton.cursor = "pointer";
  app.stage.addChild(actionButton);

  const targetIndex = [0, 1, 2];
  let isSpinning = false;
  let spinProgress = [0, 0, 0];
  let isStopped = [false, false, false];
  let total = reel_1.children.length * 20;
  
  
  actionButton.on("pointerdown", onButtonClick);
  
  function onButtonClick() {
    isSpinning = !isSpinning;

    let spinProgress = [0,0,0];
    let isStopped = [false, false, false];

  }

  app.ticker.add((time: PIXI.Ticker) => {
    if (!isSpinning) return;
    // scroll
    function move(reel: PIXI.Container, direction: number): void {
      reel.y += 2 * time.deltaTime * direction;
    }
    move(reel_1, 1);

    //wrap
    function wrap(reel: PIXI.Container, direction: number): void {
      if (direction === 1) {
        const line = VISIBLE_TOP - 40;
        const last = reel.children[reel.children.length - 1];
        if (reel.y > line) {
          reel.removeChild(last);
          reel.addChildAt(last, 0);
          render(reel);
          reel.y = reel.y - 100;
        }
      } else {
        const line = VISIBLE_BOTTOM + 40;
        const first = reel.children[0];
        if (reel.y < line) {
          reel.removeChild(first);
          reel.addChild(first);
          render(reel);
          reel.y = reel.y + 50;
        }
      }
    }
    wrap(reel_1, 1);

    // STOP
    // function stop(reel: PIXI.Container): void {
    //   const first = reel.children[0];
    //   if (reel.y < CENTER) {
    //     reel.removeChild(first);
    //     reel.addChild(first);
    //     render(reel);
    //     reel.y = reel.y + 50;
    //   }
    // }
    // stop(reel_1);

    


  });


})();

// app.ticker.add((delta: number) => 
