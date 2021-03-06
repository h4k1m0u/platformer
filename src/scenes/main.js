import { Scene, Input } from 'phaser';
import Player from '../characters/player';
import Bullets from '../characters/bullets';
import Enemy from '../characters/enemy';

// import images
/*
import pathImageStar from '../sprites/star.png';
*/
import pathTileset from '../tilemap/tileset.png';
import pathTilemap from '../tilemap/map.json';

// player images
import pathPlayer from '../sprites/player.png';
import pathPlayerRun from '../sprites/player_run.png';
import pathPlayerJump from '../sprites/player_jump.png';
import pathBullet from '../sprites/bullet.png';

// enemy images
import pathEnemyRun from '../sprites/enemy_run.png';

// background images
import pathClouds from '../sprites/clouds.png';
import pathJungleBackground from '../sprites/jungle-background.png';
import pathJungleForeground from '../sprites/jungle-foreground.png';

// props images
import pathTree1 from '../sprites/tree1.png';
import pathTree2 from '../sprites/tree2.png';
import pathPlant from '../sprites/plant.png';
import pathSkullpanel from '../sprites/skullpanel.png';
import pathBarrel from '../sprites/barrel.png';
import pathShelter from '../sprites/shelter.png';
import pathCrate from '../sprites/crate.png';

class MainScene extends Scene {
  constructor() {
    super({ key: 'scene-main' });

    // initialize score
    this.score = 0;
  }

  preload() {
    // tilemap
    this.load.image('tileset', pathTileset);
    this.load.tilemapTiledJSON('tilemap', pathTilemap);

    // background
    this.load.image('clouds', pathClouds);
    this.load.image('jungle-background', pathJungleBackground);
    this.load.image('jungle-foreground', pathJungleForeground);

    // props sprites
    this.load.image('tree1', pathTree1);
    this.load.image('tree2', pathTree2);
    this.load.image('plant', pathPlant);
    this.load.image('skullpanel', pathSkullpanel);
    this.load.image('barrel', pathBarrel);
    this.load.image('crate', pathCrate);
    this.load.image('shelter', pathShelter);

    /*
    // load images & sprites sheet
    this.load.image('star', pathImageStar);
    */

    // player texture & sprite sheets
    this.load.image('player', pathPlayer);
    this.load.spritesheet('player-run', pathPlayerRun, { spacing: 2, frameWidth: 22, frameHeight: 22 });
    this.load.spritesheet('player-jump', pathPlayerJump, { spacing: 2, frameWidth: 22, frameHeight: 22 });

    // bullet sprite sheet
    this.load.spritesheet('bullet', pathBullet, { spacing: 2, frameWidth: 8, frameHeight: 8 });

    // enemy texture & sprite sheets
    this.load.spritesheet('enemy-run', pathEnemyRun, { spacing: 2, frameWidth: 22, frameHeight: 22 });
  }

  addPropsFromTilemap(tilemap) {
    // parallax background
    this.clouds = this.add.tileSprite(0, 0, this.width, this.height, 'clouds').setOrigin(0, 0);
    this.jungleBackground = this.add.tileSprite(0, 0, this.width, this.height, 'jungle-background').setOrigin(0, 0);
    this.jungleForeground = this.add.tileSprite(0, 0, this.width, this.height, 'jungle-foreground').setOrigin(0, 0);

    // platform
    const tileset = tilemap.addTilesetImage('tileset', 'tileset');
    this.platform = tilemap.createStaticLayer('platform', tileset, 0, 0);

    // props
    tilemap.createFromObjects('props', 'skullpanel', { key: 'skullpanel' });
    tilemap.createFromObjects('props', 'plant', { key: 'plant' });
    tilemap.createFromObjects('props', 'tree1', { key: 'tree1' });
    tilemap.createFromObjects('props', 'tree2', { key: 'tree2' });
    tilemap.createFromObjects('props', 'barrel', { key: 'barrel' });
    tilemap.createFromObjects('props', 'shelter', { key: 'shelter' });
  }

  addCharactersFromTilemap(tilemap) {
    // collectable crates
    const cratesArr = tilemap.createFromObjects('characters', 'crate', { key: 'crate' });
    this.crates = this.physics.add.staticGroup(cratesArr);

    // main player
    const spawnPoint = tilemap.findObject('characters', (object) => object.name === 'player');
    this.player = new Player(this, spawnPoint.x, spawnPoint.y, {
      static: 'player',
      run: 'player-run',
      jump: 'player-jump',
    });

    // enemy walks line in tilemap
    const lines = tilemap.filterObjects('paths', (object) => object.name === 'line');
    const enemiesArr = [];
    lines.forEach((line) => {
      const enemy = new Enemy(this, line, 0, 0, 'enemy-run').setOrigin(0, 1);
      enemiesArr.push(enemy);
    });
    this.enemies = this.add.group(enemiesArr);
  }

  detectCollisions() {
    // player/enemies & platform
    this.platform.setCollisionByProperty({ collides: true });
    this.physics.add.collider(this.player, this.platform);
    this.physics.add.collider(this.enemies, this.platform);

    // enemies & bullets
    this.bullets = new Bullets(this);
    this.physics.add.collider(this.enemies, this.bullets, (enemy, bullet) => {
      enemy.destroy();
      bullet.destroy();
      this.score += 10;
      this.events.emit('onScoreChanged', this.score);
    });

    // player & crates
    this.physics.add.collider(this.player, this.crates, (player, crate) => {
      crate.destroy();
      this.score += 5;
      this.events.emit('onScoreChanged', this.score);
    });

    // player & enemies
    this.physics.add.collider(this.enemies, this.player, (enemy, player) => {
      this.physics.pause();
      player.kill();
      enemy.stop();

      this.time.delayedCall(1000, () => {
        this.scene.restart();
        this.score = 0;
        this.events.emit('onScoreChanged', this.score);
      });
    });
  }

  create() {
    // tilemap
    const tilemap = this.make.tilemap({ key: 'tilemap' });
    this.width = tilemap.width * tilemap.tileWidth;
    this.height = tilemap.height * tilemap.tileHeight;

    // tilemap sprites for props & characters
    this.addPropsFromTilemap(tilemap);
    this.addCharactersFromTilemap(tilemap);

    // camera tracks player till scene borders
    this.cameras.main.setBounds(0, 0, this.width, this.height);
    this.cameras.main.startFollow(this.player, true);

    // collisions detection between all characters
    this.detectCollisions();
  }

  update() {
    if (this.player.isDead) {
      return;
    }

    // keyboard interactions inside game loop
    const cursors = this.input.keyboard.createCursorKeys();

    // possibility to jump while moving left/right
    this.player.setVelocityX(0);

    if (cursors.up.isDown && this.player.body.blocked.down) {
      this.player.jump();
    }

    if (cursors.left.isDown) {
      this.player.moveLeft();
    } else if (cursors.right.isDown) {
      this.player.moveRight();
    } else {
      this.player.stop();
    }

    // player shooting bullets to the left/right
    const spacebar = this.input.keyboard.addKey(Input.Keyboard.KeyCodes.SPACE);
    if (Input.Keyboard.JustDown(spacebar)) {
      const x = this.player.x + ((!this.player.flipX) ? 10 : -10);
      this.bullets.fire(x, this.player.y + 5, !this.player.flipX);
    }

    // scroll parallax accord. to camera position
    this.clouds.setTilePosition(this.cameras.main.scrollX * 0.1);
    this.jungleBackground.setTilePosition(this.cameras.main.scrollX * 0.2);
    this.jungleForeground.setTilePosition(this.cameras.main.scrollX * 0.3);
  }
}

export default MainScene;
