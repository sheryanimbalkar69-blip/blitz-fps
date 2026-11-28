import * as THREE from 'three';
import { NUKETOWN_HARDPOINT_ZONES } from '../../../shared/packets';
import { TextureGenerator } from './Textures';

export interface CollidableBox {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export interface WalkableRamp {
  minX: number;
  maxX: number;
  startZ: number;
  endZ: number;
  startY: number;
  endY: number;
}

export class NuketownMap {
  public scene: THREE.Scene;
  public colliders: CollidableBox[] = [];
  public ramps: WalkableRamp[] = [];
  public hardpointMeshes: THREE.Mesh[] = [];
  public activeZoneBeacon: THREE.Group | null = null;

  // Shared PBR Textures
  private grassTex: THREE.CanvasTexture;
  private roadTex: THREE.CanvasTexture;
  private sidewalkTex: THREE.CanvasTexture;
  private tealTex: THREE.CanvasTexture;
  private yellowTex: THREE.CanvasTexture;
  private woodTex: THREE.CanvasTexture;
  private roofTex: THREE.CanvasTexture;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.grassTex = TextureGenerator.createGrassTexture();
    this.roadTex = TextureGenerator.createRoadTexture();
    this.sidewalkTex = TextureGenerator.createSidewalkTexture();
    this.tealTex = TextureGenerator.createTealSidingTexture();
    this.yellowTex = TextureGenerator.createYellowSidingTexture();
    this.woodTex = TextureGenerator.createWoodDeckTexture();
    this.roofTex = TextureGenerator.createRoofShinglesTexture();

    this.buildTerrain();
    this.buildRoads();
    this.buildHouseAlphaHollow(); // Fully walkable North House
    this.buildHouseBravoHollow(); // Fully walkable South House
    this.buildWalkableBus();      // Walkable interior school bus
    this.buildWalkableTruck();    // Walkable trailer with ramp
    this.buildParkedVehicles();
    this.buildDetailedProps();
    this.buildDoomsdayTower();
    this.buildNuketownSignAndRainbow();
    this.buildHardpointVisuals();
  }

  public addCollider(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number) {
    this.colliders.push({
      min: new THREE.Vector3(minX, minY, minZ),
      max: new THREE.Vector3(maxX, maxY, maxZ)
    });
  }

  public addRamp(minX: number, maxX: number, startZ: number, endZ: number, startY: number, endY: number) {
    this.ramps.push({ minX, maxX, startZ, endZ, startY, endY });
  }

  private buildTerrain() {
    const terrainGeo = new THREE.PlaneGeometry(120, 160);
    const terrainMat = new THREE.MeshStandardMaterial({
      map: this.grassTex,
      roughness: 0.85,
      metalness: 0.05
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    this.scene.add(terrain);

    // Desert Mountains surrounding perimeter
    const mountainGeo = new THREE.ConeGeometry(32, 40, 7);
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x8a6c4b,
      roughness: 0.9
    });
    const mountainPositions = [
      [-65, 18, -90], [0, 20, -105], [65, 18, -90],
      [-75, 18, 90], [0, 20, 105], [75, 18, 90],
      [-85, 20, 0], [85, 20, 0]
    ];
    mountainPositions.forEach(([x, y, z]) => {
      const m = new THREE.Mesh(mountainGeo, mountainMat);
      m.position.set(x, y, z);
      this.scene.add(m);
    });
  }

  private buildRoads() {
    // Asphalt Street with painted lane markings
    const roadGeo = new THREE.PlaneGeometry(24, 80);
    const roadMat = new THREE.MeshStandardMaterial({
      map: this.roadTex,
      roughness: 0.8,
      metalness: 0.1
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, 0);
    road.receiveShadow = true;
    this.scene.add(road);

    // Center Roundabout Cul-de-Sac Circle
    const circleGeo = new THREE.CircleGeometry(13, 32);
    const circleMat = new THREE.MeshStandardMaterial({
      color: 0x27292e,
      roughness: 0.75
    });
    const circle = new THREE.Mesh(circleGeo, circleMat);
    circle.rotation.x = -Math.PI / 2;
    circle.position.set(0, 0.025, 0);
    circle.receiveShadow = true;
    this.scene.add(circle);

    // Concrete Sidewalks with curbs
    const sidewalkMat = new THREE.MeshStandardMaterial({
      map: this.sidewalkTex,
      roughness: 0.7
    });
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 });

    // West Sidewalk
    const swLeft = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.2, 80), sidewalkMat);
    swLeft.position.set(-13.5, 0.1, 0);
    swLeft.receiveShadow = true;
    this.scene.add(swLeft);

    const curbLeft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 80), curbMat);
    curbLeft.position.set(-12.0, 0.12, 0);
    this.scene.add(curbLeft);

    // East Sidewalk
    const swRight = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.2, 80), sidewalkMat);
    swRight.position.set(13.5, 0.1, 0);
    swRight.receiveShadow = true;
    this.scene.add(swRight);

    const curbRight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 80), curbMat);
    curbRight.position.set(12.0, 0.12, 0);
    this.scene.add(curbRight);
  }

  // Fully Walkable House Alpha (Mint Teal - North)
  private buildHouseAlphaHollow() {
    const group = new THREE.Group();
    const tealMat = new THREE.MeshStandardMaterial({ map: this.tealTex, roughness: 0.65 });
    const whiteTrimMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xc4a47c, roughness: 0.4 });
    const roofMat = new THREE.MeshStandardMaterial({ map: this.roofTex, roughness: 0.8 });
    const deckMat = new THREE.MeshStandardMaterial({ map: this.woodTex, roughness: 0.7 });

    // 1. Ground Floor Parquet Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.2, 16), floorMat);
    floor.position.set(0, 0.1, -24);
    group.add(floor);

    // 2. Front Wall (z = -16) with 2.2m OPEN DOORWAY in center (x: -1.1 to 1.1)
    // Left segment
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(5.9, 3.8, 0.25), tealMat);
    frontWallLeft.position.set(-4.05, 2.0, -16);
    group.add(frontWallLeft);
    this.addCollider(-7.0, 0, -16.2, -1.1, 3.8, -15.8);

    // Right segment
    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(5.9, 3.8, 0.25), tealMat);
    frontWallRight.position.set(4.05, 2.0, -16);
    group.add(frontWallRight);
    this.addCollider(1.1, 0, -16.2, 7.0, 3.8, -15.8);

    // Doorway Lintel above front door
    const frontDoorLintel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.25), whiteTrimMat);
    frontDoorLintel.position.set(0, 3.3, -16);
    group.add(frontDoorLintel);

    // 3. Back Wall (z = -32) with 2.2m OPEN BACK DOOR to patio deck
    const backWallLeft = new THREE.Mesh(new THREE.BoxGeometry(5.9, 3.8, 0.25), tealMat);
    backWallLeft.position.set(-4.05, 2.0, -32);
    group.add(backWallLeft);
    this.addCollider(-7.0, 0, -32.2, -1.1, 3.8, -31.8);

    const backWallRight = new THREE.Mesh(new THREE.BoxGeometry(5.9, 3.8, 0.25), tealMat);
    backWallRight.position.set(4.05, 2.0, -32);
    group.add(backWallRight);
    this.addCollider(1.1, 0, -32.2, 7.0, 3.8, -31.8);

    const backDoorLintel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.25), whiteTrimMat);
    backDoorLintel.position.set(0, 3.3, -32);
    group.add(backDoorLintel);

    // 4. West Outer Wall (x = -7.0)
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.8, 16), tealMat);
    westWall.position.set(-7.0, 2.0, -24);
    group.add(westWall);
    this.addCollider(-7.2, 0, -32, -6.8, 3.8, -16);

    // 5. East Garage Wall (x = 7.0) with OPEN GARAGE ENTRANCE (z: -21 to -17)
    const eastWallBack = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.8, 11), tealMat);
    eastWallBack.position.set(7.0, 2.0, -26.5);
    group.add(eastWallBack);
    this.addCollider(6.8, 0, -32, 7.2, 3.8, -21);

    // Garage Roll-up Door Lintel (leaves 4m opening underneath!)
    const garageLintel = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.2, 4.0), whiteTrimMat);
    garageLintel.position.set(7.0, 3.3, -19);
    group.add(garageLintel);

    // 6. Interior Partition Wall (Separates Living Room and Kitchen with doorway)
    const intWall = new THREE.Mesh(new THREE.BoxGeometry(5.0, 3.8, 0.2), whiteTrimMat);
    intWall.position.set(-3.5, 2.0, -24);
    group.add(intWall);
    this.addCollider(-6.0, 0, -24.1, -1.0, 3.8, -23.9);

    // 7. Second Floor Ceiling/Floor (y = 3.9) with sniper overlook
    const secondFloor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, 14), floorMat);
    secondFloor.position.set(0, 3.9, -24);
    group.add(secondFloor);

    // Second Floor Front Wall with OPEN SNIPER WINDOW (Overlooks Bus & Street)
    const upperFrontLeft = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.0, 0.25), tealMat);
    upperFrontLeft.position.set(-4.5, 5.5, -17);
    group.add(upperFrontLeft);
    this.addCollider(-7.0, 3.9, -17.2, -2.2, 7.0, -16.8);

    const upperFrontRight = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.0, 0.25), tealMat);
    upperFrontRight.position.set(4.5, 5.5, -17);
    group.add(upperFrontRight);
    this.addCollider(2.2, 3.9, -17.2, 7.0, 7.0, -16.8);

    // Window Lintel & Sill
    const windowSill = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 0.3), whiteTrimMat);
    windowSill.position.set(0, 4.4, -17);
    group.add(windowSill);

    const windowLintel = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 0.3), whiteTrimMat);
    windowLintel.position.set(0, 6.6, -17);
    group.add(windowLintel);

    // Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(12, 3.2, 4), roofMat);
    roof.position.set(0, 8.5, -24);
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

    // 8. Backyard Patio Deck (Walkable, HP 4 Zone)
    const patio = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, 8), deckMat);
    patio.position.set(0, 0.2, -36);
    group.add(patio);

    // Pergola beams overhead
    for (let x = -5; x <= 5; x += 2.5) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 8), deckMat);
      beam.position.set(x, 3.2, -36);
      group.add(beam);
    }

    // 9. Exterior Walkable Wooden Stairs from Patio up to 2nd Floor Balcony
    const stairWidth = 1.8;
    for (let i = 0; i < 12; i++) {
      const stepY = 0.3 + i * 0.3;
      const stepZ = -33.5 + i * 0.65;
      const step = new THREE.Mesh(new THREE.BoxGeometry(stairWidth, 0.25, 0.7), deckMat);
      step.position.set(5.5, stepY, stepZ);
      group.add(step);
    }
    // Walkable Stair Ramp Collider (connects ground patio to 2nd floor balcony)
    this.addRamp(4.5, 6.5, -34.0, -25.5, 0.2, 3.9);

    // Front Porch with Pillars (Image 3)
    const porch = new THREE.Mesh(new THREE.BoxGeometry(8, 0.25, 3), deckMat);
    porch.position.set(0, 0.15, -14.5);
    group.add(porch);

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.5, 0.3), pillarMat);
    p1.position.set(-3.5, 1.8, -13.2);
    group.add(p1);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.5, 0.3), pillarMat);
    p2.position.set(3.5, 1.8, -13.2);
    group.add(p2);

    this.scene.add(group);
  }

  // Fully Walkable House Bravo (Yellow/Wood - South)
  private buildHouseBravoHollow() {
    const group = new THREE.Group();
    const yellowMat = new THREE.MeshStandardMaterial({ map: this.yellowTex, roughness: 0.65 });
    const whiteTrimMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xba8c59, roughness: 0.4 });
    const roofMat = new THREE.MeshStandardMaterial({ map: this.roofTex, roughness: 0.8 });
    const deckMat = new THREE.MeshStandardMaterial({ map: this.woodTex, roughness: 0.7 });

    // 1. Ground Floor Floorboards
    const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.2, 16), floorMat);
    floor.position.set(0, 0.1, 24);
    group.add(floor);

    // 2. Front Wall (z = 16) with 2.2m OPEN DOORWAY in center
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(5.9, 3.8, 0.25), yellowMat);
    frontWallLeft.position.set(-4.05, 2.0, 16);
    group.add(frontWallLeft);
    this.addCollider(-7.0, 0, 15.8, -1.1, 3.8, 16.2);

    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(5.9, 3.8, 0.25), yellowMat);
    frontWallRight.position.set(4.05, 2.0, 16);
    group.add(frontWallRight);
    this.addCollider(1.1, 0, 15.8, 7.0, 3.8, 16.2);

    const frontDoorLintel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.25), whiteTrimMat);
    frontDoorLintel.position.set(0, 3.3, 16);
    group.add(frontDoorLintel);

    // 3. Back Wall (z = 32) with 2.2m OPEN DOORWAY to Patio (HP 3)
    const backWallLeft = new THREE.Mesh(new THREE.BoxGeometry(5.9, 3.8, 0.25), yellowMat);
    backWallLeft.position.set(-4.05, 2.0, 32);
    group.add(backWallLeft);
    this.addCollider(-7.0, 0, 31.8, -1.1, 3.8, 32.2);

    const backWallRight = new THREE.Mesh(new THREE.BoxGeometry(5.9, 3.8, 0.25), yellowMat);
    backWallRight.position.set(4.05, 2.0, 32);
    group.add(backWallRight);
    this.addCollider(1.1, 0, 31.8, 7.0, 3.8, 32.2);

    const backDoorLintel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.25), whiteTrimMat);
    backDoorLintel.position.set(0, 3.3, 32);
    group.add(backDoorLintel);

    // 4. East Outer Wall (x = 7.0)
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.8, 16), yellowMat);
    eastWall.position.set(7.0, 2.0, 24);
    group.add(eastWall);
    this.addCollider(6.8, 0, 16, 7.2, 3.8, 32);

    // 5. West Garage Wall with OPENING (x = -7.0, z: 17 to 21)
    const westWallBack = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.8, 11), yellowMat);
    westWallBack.position.set(-7.0, 2.0, 26.5);
    group.add(westWallBack);
    this.addCollider(-7.2, 0, 21, -6.8, 3.8, 32);

    const garageLintel = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.2, 4.0), whiteTrimMat);
    garageLintel.position.set(-7.0, 3.3, 19);
    group.add(garageLintel);

    // 6. Interior Partition Wall
    const intWall = new THREE.Mesh(new THREE.BoxGeometry(5.0, 3.8, 0.2), whiteTrimMat);
    intWall.position.set(3.5, 2.0, 24);
    group.add(intWall);
    this.addCollider(1.0, 0, 23.9, 6.0, 3.8, 24.1);

    // 7. Second Floor with sniper overlook
    const secondFloor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, 14), floorMat);
    secondFloor.position.set(0, 3.9, 24);
    group.add(secondFloor);

    // Second Floor Front Wall with OPEN SNIPER WINDOW
    const upperFrontLeft = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.0, 0.25), yellowMat);
    upperFrontLeft.position.set(-4.5, 5.5, 17);
    group.add(upperFrontLeft);
    this.addCollider(-7.0, 3.9, 16.8, -2.2, 7.0, 17.2);

    const upperFrontRight = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.0, 0.25), yellowMat);
    upperFrontRight.position.set(4.5, 5.5, 17);
    group.add(upperFrontRight);
    this.addCollider(2.2, 3.9, 16.8, 7.0, 7.0, 17.2);

    const windowSill = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 0.3), whiteTrimMat);
    windowSill.position.set(0, 4.4, 17);
    group.add(windowSill);

    const windowLintel = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 0.3), whiteTrimMat);
    windowLintel.position.set(0, 6.6, 17);
    group.add(windowLintel);

    // Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(12, 3.2, 4), roofMat);
    roof.position.set(0, 8.5, 24);
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

    // 8. Backyard Wooden Patio Deck (HP 3 Zone - Image 5)
    const patio = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, 8), deckMat);
    patio.position.set(0, 0.2, 36);
    group.add(patio);

    // 9. Exterior Walkable Stairs up to 2nd Floor
    for (let i = 0; i < 12; i++) {
      const stepY = 0.3 + i * 0.3;
      const stepZ = 33.5 - i * 0.65;
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 0.7), deckMat);
      step.position.set(-5.5, stepY, stepZ);
      group.add(step);
    }
    this.addRamp(-6.5, -4.5, 34.0, 25.5, 0.2, 3.9);

    // Front Porch
    const porch = new THREE.Mesh(new THREE.BoxGeometry(8, 0.25, 3), deckMat);
    porch.position.set(0, 0.15, 14.5);
    group.add(porch);

    this.scene.add(group);
  }

  // Walkable School Bus (Hollow Aisle & Walkable Roof / Sides - Image 3)
  private buildWalkableBus() {
    const busGroup = new THREE.Group();
    busGroup.position.set(-3.5, 0, 1.0);
    busGroup.rotation.y = 0.38; // 22° diagonal angle

    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5, metalness: 0.2 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65, roughness: 0.1 });

    // 1. Bus Floor (y = 0.45)
    const busFloor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.2, 9.2), blackMat);
    busFloor.position.set(0, 0.45, 0);
    busGroup.add(busFloor);

    // 2. Bus Roof (y = 2.9)
    const busRoof = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.15, 9.2), yellowMat);
    busRoof.position.set(0, 2.9, 0);
    busGroup.add(busRoof);

    // 3. Left Wall (solid with windows)
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.4, 9.2), yellowMat);
    leftWall.position.set(-1.35, 1.65, 0);
    busGroup.add(leftWall);

    // 4. Right Wall with PASSENGER ENTRANCE OPENING (z: -3.5 to -2.0)
    const rightWallBack = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.4, 7.0), yellowMat);
    rightWallBack.position.set(1.35, 1.65, 1.0);
    busGroup.add(rightWallBack);

    // 5. Front Hood / Engine Block
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.8), yellowMat);
    hood.position.set(0, 0.9, -5.0);
    busGroup.add(hood);

    // Front Windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.1, 0.1), glassMat);
    windshield.position.set(0, 2.0, -4.1);
    busGroup.add(windshield);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.45, 16);
    const wheels = [
      [-1.4, 0.55, -3.2], [1.4, 0.55, -3.2],
      [-1.4, 0.55, 3.2], [1.4, 0.55, 3.2]
    ];
    wheels.forEach(([x, y, z]) => {
      const w = new THREE.Mesh(wheelGeo, blackMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, y, z);
      busGroup.add(w);
    });

    this.scene.add(busGroup);

    // Selective colliders that allow walking along aisles
    this.addCollider(-5.5, 0, -4.5, -4.8, 2.6, 5.0);
    this.addCollider(-2.0, 0, -1.0, -1.5, 2.6, 5.0);
  }

  // Walkable Westward Moving Truck with Loading Ramp (Image 4)
  private buildWalkableTruck() {
    const truckGroup = new THREE.Group();
    truckGroup.position.set(4.0, 0, -1.0);
    truckGroup.rotation.y = -0.15;

    const redCabMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.4, metalness: 0.3 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.5, metalness: 0.4 });
    const woodMat = new THREE.MeshStandardMaterial({ map: this.woodTex, roughness: 0.8 });

    // 1. Trailer Floor (y = 0.9)
    const floor = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.25, 10.5), woodMat);
    floor.position.set(0, 0.9, 0);
    truckGroup.add(floor);

    // 2. Trailer Roof (y = 3.8)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.15, 10.5), silverMat);
    roof.position.set(0, 3.8, 0);
    truckGroup.add(roof);

    // 3. Trailer Left Wall (x = -1.45)
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.8, 10.5), silverMat);
    leftWall.position.set(-1.45, 2.35, 0);
    truckGroup.add(leftWall);

    // 4. Trailer Right Wall (x = 1.45)
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.8, 10.5), silverMat);
    rightWall.position.set(1.45, 2.35, 0);
    truckGroup.add(rightWall);

    // 5. Front Wall behind cab (z = -5.25)
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.8, 0.15), silverMat);
    frontWall.position.set(0, 2.35, -5.2);
    truckGroup.add(frontWall);

    // 6. Cab (Solid front)
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.8, 3.0), redCabMat);
    cab.position.set(0, 1.7, -6.8);
    truckGroup.add(cab);

    // 7. OPEN REAR LOADING RAMP (Walkable inclined plane from ground to trailer floor!)
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 3.8), silverMat);
    ramp.position.set(0, 0.45, 6.8);
    ramp.rotation.x = 0.24; // Smooth incline
    truckGroup.add(ramp);

    // Cargo boxes inside trailer for cover
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 });
    const crate1 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 1.0), crateMat);
    crate1.position.set(-0.7, 1.55, -2.0);
    truckGroup.add(crate1);

    const crate2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 1.2), crateMat);
    crate2.position.set(0.7, 1.35, 1.0);
    truckGroup.add(crate2);

    this.scene.add(truckGroup);

    // Walkable Truck Ramp Collider (y: 0.1 to 1.1)
    this.addRamp(2.6, 5.4, 5.0, 8.5, 0.1, 1.1);

    // Side wall colliders
    this.addCollider(2.3, 0, -6.0, 2.7, 3.8, 5.2);
    this.addCollider(5.3, 0, -6.0, 5.7, 3.8, 5.2);
  }

  private buildParkedVehicles() {
    const grayMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.5 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.4 });

    // Pickup truck (Alpha Driveway - Image 3 foreground)
    const pickup = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 4.8), grayMat);
    pickup.position.set(-9.5, 0.85, -12);
    pickup.rotation.y = 0.45;
    this.scene.add(pickup);
    this.addCollider(-11.0, 0, -14.5, -7.8, 1.6, -9.5);

    // Vintage sedan (Bravo Driveway - Image 4)
    const sedan = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.35, 4.6), whiteMat);
    sedan.position.set(9.5, 0.75, 12);
    sedan.rotation.y = -0.4;
    this.scene.add(sedan);
    this.addCollider(7.8, 0, 9.5, 11.2, 1.5, 14.5);
  }

  // 1950s Mannequins, Mailboxes, Street Lamps, and Picket Fences
  private buildDetailedProps() {
    const picketMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    const mannequinMat = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.9 }); // Retro mannequins

    // Outer perimeter fences
    const fenceWest = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 80), picketMat);
    fenceWest.position.set(-18.5, 1.1, 0);
    this.scene.add(fenceWest);
    this.addCollider(-19, 0, -40, -18, 3, 40);

    const fenceEast = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 80), picketMat);
    fenceEast.position.set(18.5, 1.1, 0);
    this.scene.add(fenceEast);
    this.addCollider(18, 0, -40, 19, 3, 40);

    const fenceNorth = new THREE.Mesh(new THREE.BoxGeometry(37, 2.2, 0.3), picketMat);
    fenceNorth.position.set(0, 1.1, -39.5);
    this.scene.add(fenceNorth);
    this.addCollider(-19, 0, -40, 19, 3, -39);

    const fenceSouth = new THREE.Mesh(new THREE.BoxGeometry(37, 2.2, 0.3), picketMat);
    fenceSouth.position.set(0, 1.1, 39.5);
    this.scene.add(fenceSouth);
    this.addCollider(-19, 0, 39, 19, 3, 40);

    // 1950s Nuclear Test Mannequins (Hallmark of Nuketown)
    const mannequinPositions = [
      [-2.0, -14.0], [2.0, -14.0], // Alpha Porch
      [-2.0, 14.0], [2.0, 14.0],   // Bravo Porch
      [-14.0, 0.0], [14.0, 0.0]    // Sidewalks
    ];
    mannequinPositions.forEach(([x, z]) => {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.4, 8), mannequinMat);
      body.position.set(x, 0.7, z);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), mannequinMat);
      head.position.set(x, 1.55, z);
      this.scene.add(body);
      this.scene.add(head);
    });

    // Street Lamps with warm point lights
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.7 });
    const lampPositions = [[-12.5, -8], [-12.5, 8], [12.5, -8], [12.5, 8]];
    lampPositions.forEach(([lx, lz]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5.0, 8), lampMat);
      pole.position.set(lx, 2.5, lz);
      this.scene.add(pole);

      const lampHead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      lampHead.position.set(lx, 4.9, lz);
      this.scene.add(lampHead);

      const light = new THREE.PointLight(0xfef08a, 0.8, 14);
      light.position.set(lx, 4.8, lz);
      this.scene.add(light);
    });
  }

  // Doomsday Nuclear Clock Tower (Images 3 & 5)
  private buildDoomsdayTower() {
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-5, 0, -46);

    const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.4 });
    const legOffsets = [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]];
    legOffsets.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 24, 8), steelMat);
      leg.position.set(lx, 12, lz);
      towerGroup.add(leg);
    });

    // Clock Face with hour markings
    const clockFace = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 3.6, 0.5, 32),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.3 })
    );
    clockFace.rotation.x = Math.PI / 2;
    clockFace.position.set(0, 22, 0);
    towerGroup.add(clockFace);

    const hand = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 3.0, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x09090b })
    );
    hand.position.set(0, 22.8, 0.35);
    towerGroup.add(hand);

    this.scene.add(towerGroup);
  }

  private buildHardpointVisuals() {
    NUKETOWN_HARDPOINT_ZONES.forEach((zone) => {
      const width = zone.maxX - zone.minX;
      const depth = zone.maxZ - zone.minZ;

      const zoneGeo = new THREE.BoxGeometry(width, 0.12, depth);
      const zoneMat = new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.3
      });

      const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
      zoneMesh.position.set(zone.centerX, 0.08, zone.centerZ);
      this.scene.add(zoneMesh);
      this.hardpointMeshes.push(zoneMesh);

      const edges = new THREE.EdgesGeometry(zoneGeo);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xeab308, linewidth: 2 }));
      zoneMesh.add(line);
    });

    this.activeZoneBeacon = new THREE.Group();
    const beaconGeo = new THREE.CylinderGeometry(0.25, 1.2, 22, 16);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 11;
    this.activeZoneBeacon.add(beacon);
    this.scene.add(this.activeZoneBeacon);
  }

  public updateActiveHardpoint(zoneIndex: number, status: string, team: string | null) {
    const activeZone = NUKETOWN_HARDPOINT_ZONES[zoneIndex];
    if (activeZone && this.activeZoneBeacon) {
      this.activeZoneBeacon.position.set(activeZone.centerX, 0, activeZone.centerZ);
    }

    this.hardpointMeshes.forEach((mesh, idx) => {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (idx === zoneIndex) {
        if (status === 'CONTESTED') {
          mat.color.setHex(0xef4444);
          mat.opacity = 0.6;
        } else if (team === 'ALPHA') {
          mat.color.setHex(0x3b82f6);
          mat.opacity = 0.5;
        } else if (team === 'BRAVO') {
          mat.color.setHex(0xf97316);
          mat.opacity = 0.5;
        } else {
          mat.color.setHex(0xfacc15);
          mat.opacity = 0.45;
        }
      } else {
        mat.color.setHex(0x64748b);
        mat.opacity = 0.08;
      }
    });
  }

  private buildNuketownSignAndRainbow() {
    // 1. Iconic "WELCOME TO NUKETOWN" Population Sign near East cul-de-sac entrance
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 256;
    const ctx = signCanvas.getContext('2d')!;
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 492, 236);
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WELCOME TO', 256, 70);
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 58px sans-serif';
    ctx.fillText('NUKETOWN', 256, 138);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('POPULATION: 5v5', 256, 200);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.7, 0.14),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 })
    );
    signBoard.position.set(13.8, 2.0, -7.8);
    signBoard.rotation.y = -0.6;
    signBoard.castShadow = true;
    this.scene.add(signBoard);

    const postMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.4, 0.14), postMat);
    postL.position.set(13.0, 1.2, -7.2);
    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.4, 0.14), postMat);
    postR.position.set(14.6, 1.2, -8.4);
    this.scene.add(postL, postR);

    // 2. Iconic Nuketown Double Rainbow Arc over the Northern Horizon
    const rainbowColors = [0xef4444, 0xf97316, 0xfacc15, 0x22c55e, 0x3b82f6, 0x8b5cf6];
    rainbowColors.forEach((col, i) => {
      const rOuter = 58 - i * 1.1;
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(rOuter, 0.45, 6, 48, Math.PI),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22 })
      );
      arc.position.set(0, 0, -72);
      this.scene.add(arc);

      const arc2 = new THREE.Mesh(
        new THREE.TorusGeometry(rOuter + 14, 0.35, 6, 48, Math.PI),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.12 })
      );
      arc2.position.set(6, 0, -82);
      this.scene.add(arc2);
    });
  }
}
