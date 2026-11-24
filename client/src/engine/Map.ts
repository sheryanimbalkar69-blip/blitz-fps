import * as THREE from 'three';
import { NUKETOWN_HARDPOINT_ZONES } from '../../../shared/packets';

export interface CollidableBox {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export class NuketownMap {
  public scene: THREE.Scene;
  public colliders: CollidableBox[] = [];
  public hardpointMeshes: THREE.Mesh[] = [];
  public activeZoneBeacon: THREE.Group | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildTerrain();
    this.buildRoads();
    this.buildHouseAlpha(); // Mint Teal House (North)
    this.buildHouseBravo(); // Yellow House (South)
    this.buildCenterVehicles(); // Yellow Bus & Westward Moving Truck
    this.buildParkedCars();
    this.buildFencesAndProps();
    this.buildDoomsdayTower();
    this.buildHardpointVisuals();
  }

  private addCollider(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number) {
    this.colliders.push({
      min: new THREE.Vector3(minX, minY, minZ),
      max: new THREE.Vector3(maxX, maxY, maxZ)
    });
  }

  private buildTerrain() {
    // Main terrain plane
    const terrainGeo = new THREE.PlaneGeometry(120, 160);
    const terrainMat = new THREE.MeshLambertMaterial({ color: 0x5a7d36 }); // Suburban grass green
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    this.scene.add(terrain);

    // Desert mountains backdrop (surrounding nuclear test site)
    const mountainGeo = new THREE.ConeGeometry(28, 35, 6);
    const mountainMat = new THREE.MeshLambertMaterial({ color: 0x9c7a52 });
    
    const mountainPositions = [
      [-65, 0, -90], [0, 0, -100], [65, 0, -90],
      [-75, 0, 90], [0, 0, 100], [75, 0, 90],
      [-85, 0, 0], [85, 0, 0]
    ];

    mountainPositions.forEach(([x, y, z]) => {
      const m = new THREE.Mesh(mountainGeo, mountainMat);
      m.position.set(x, 15, z);
      this.scene.add(m);
    });
  }

  private buildRoads() {
    // Asphalt street
    const roadGeo = new THREE.PlaneGeometry(24, 80);
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x222225 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, 0);
    road.receiveShadow = true;
    this.scene.add(road);

    // Center circular cul-de-sac roundabout (matching Image 2)
    const circleGeo = new THREE.CircleGeometry(13, 32);
    const circleMat = new THREE.MeshLambertMaterial({ color: 0x2d3036 });
    const circle = new THREE.Mesh(circleGeo, circleMat);
    circle.rotation.x = -Math.PI / 2;
    circle.position.set(0, 0.025, 0);
    circle.receiveShadow = true;
    this.scene.add(circle);

    // Sidewalk concrete strips
    const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0xbfb8a8 });
    const swLeft = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 80), sidewalkMat);
    swLeft.position.set(-13, 0.08, 0);
    this.scene.add(swLeft);

    const swRight = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 80), sidewalkMat);
    swRight.position.set(13, 0.08, 0);
    this.scene.add(swRight);
  }

  // House Alpha (North / Green-Teal House - Images 3 & 4)
  private buildHouseAlpha() {
    const group = new THREE.Group();
    group.position.set(0, 0, -24);

    // Teal wall material & White trim
    const tealMat = new THREE.MeshLambertMaterial({ color: 0x208c7a }); // Mint teal (CODM signature)
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xedf2f7 });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a5568 });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0xa0522d });

    // Ground Floor: Living room + Kitchen
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(14, 4.0, 16), tealMat);
    mainBody.position.set(-1.0, 2.0, 0);
    mainBody.castShadow = true;
    group.add(mainBody);
    this.addCollider(-8.0, 0, -32, 6.0, 4.0, -16);

    // Garage Wing (East side)
    const garage = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 9), whiteMat);
    garage.position.set(9.0, 1.75, 3.0);
    garage.castShadow = true;
    group.add(garage);
    this.addCollider(6.0, 0, -25.5, 12.0, 3.5, -16.5);

    // Second Floor (Sniper bedroom)
    const secondFloor = new THREE.Mesh(new THREE.BoxGeometry(12, 3.5, 12), tealMat);
    secondFloor.position.set(-1.0, 5.75, 0);
    secondFloor.castShadow = true;
    group.add(secondFloor);

    // Slanted Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(11, 2.5, 4), roofMat);
    roof.position.set(-1.0, 8.5, 0);
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

    // 2nd Floor Front Sniper Window (Window opening facing the street)
    const windowFrameMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const frontWindow = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.8, 0.4), windowFrameMat);
    frontWindow.position.set(-1.0, 5.8, 6.1);
    group.add(frontWindow);

    // Backyard Wooden Deck & Balcony Stairs (Matching Image 5)
    const deckMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    const patio = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 6), deckMat);
    patio.position.set(-1.0, 0.2, -11.0);
    group.add(patio);

    // Exterior Staircase from backyard up to 2nd floor balcony
    const stairGeo = new THREE.BoxGeometry(2.0, 0.3, 1.0);
    for (let i = 0; i < 10; i++) {
      const step = new THREE.Mesh(stairGeo, deckMat);
      step.position.set(4.0, 0.3 + i * 0.38, -6.5 - i * 0.45);
      group.add(step);
    }

    this.scene.add(group);
  }

  // House Bravo (South / Yellow-Wood House - Images 2 & 5)
  private buildHouseBravo() {
    const group = new THREE.Group();
    group.position.set(0, 0, 24);

    const yellowMat = new THREE.MeshLambertMaterial({ color: 0xd99b26 }); // Warm 1950s yellow
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf7fafc });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x5c3d28 });
    const deckMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });

    // Ground Floor: Living Room
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(14, 4.0, 16), yellowMat);
    mainBody.position.set(1.0, 2.0, 0);
    mainBody.castShadow = true;
    group.add(mainBody);
    this.addCollider(-6.0, 0, 16, 8.0, 4.0, 32);

    // Garage Wing (West side)
    const garage = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 9), whiteMat);
    garage.position.set(-9.0, 1.75, -3.0);
    garage.castShadow = true;
    group.add(garage);
    this.addCollider(-12.0, 0, 16.5, -6.0, 3.5, 25.5);

    // Second Floor
    const secondFloor = new THREE.Mesh(new THREE.BoxGeometry(12, 3.5, 12), yellowMat);
    secondFloor.position.set(1.0, 5.75, 0);
    secondFloor.castShadow = true;
    group.add(secondFloor);

    // Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(11, 2.5, 4), roofMat);
    roof.position.set(1.0, 8.5, 0);
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

    // 2nd Floor Front Sniper Window
    const windowFrameMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const frontWindow = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.8, 0.4), windowFrameMat);
    frontWindow.position.set(1.0, 5.8, -6.1);
    group.add(frontWindow);

    // Backyard Patio Deck (HP 3 Location!)
    const patio = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 6), deckMat);
    patio.position.set(1.0, 0.2, 11.0);
    group.add(patio);

    // Exterior Stairs leading up to balcony
    const stairGeo = new THREE.BoxGeometry(2.0, 0.3, 1.0);
    for (let i = 0; i < 10; i++) {
      const step = new THREE.Mesh(stairGeo, deckMat);
      step.position.set(-4.0, 0.3 + i * 0.38, 6.5 + i * 0.45);
      group.add(step);
    }

    this.scene.add(group);
  }

  // Yellow School Bus & Westward Moving Truck (Images 3 & 4)
  private buildCenterVehicles() {
    // 1. YELLOW SCHOOL BUS (Angled ~22° in center cul-de-sac)
    const busGroup = new THREE.Group();
    busGroup.position.set(-3.2, 0, 1.0);
    busGroup.rotation.y = 0.38; // Diagonal tilt

    const busYellow = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
    const busBlack = new THREE.MeshLambertMaterial({ color: 0x18181b });
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 });

    // Main Bus Body
    const busBody = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.6, 9.5), busYellow);
    busBody.position.set(0, 1.6, 0);
    busBody.castShadow = true;
    busGroup.add(busBody);

    // Bus Hood (Front nose)
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 2.0), busYellow);
    hood.position.set(0, 1.0, -5.2);
    busGroup.add(hood);

    // Windows
    const windowStrip = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.9, 8.5), glassMat);
    windowStrip.position.set(0, 2.1, 0.2);
    busGroup.add(windowStrip);

    // Black Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.5, 16);
    const wheels = [
      [-1.5, 0.55, -3.2], [1.5, 0.55, -3.2],
      [-1.5, 0.55, 3.2], [1.5, 0.55, 3.2]
    ];
    wheels.forEach(([x, y, z]) => {
      const w = new THREE.Mesh(wheelGeo, busBlack);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, y, z);
      busGroup.add(w);
    });

    this.scene.add(busGroup);
    this.addCollider(-6.5, 0, -5.0, 0.5, 3.2, 6.0);

    // 2. WESTWARD MOVING TRUCK WITH OPEN RAMP (Image 4)
    const truckGroup = new THREE.Group();
    truckGroup.position.set(3.8, 0, -1.0);
    truckGroup.rotation.y = -0.15;

    const redMat = new THREE.MeshLambertMaterial({ color: 0xb91c1c }); // Red tractor cab
    const silverMat = new THREE.MeshLambertMaterial({ color: 0xd1d5db }); // Cargo trailer

    // Trailer Box
    const trailer = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.6, 11.0), silverMat);
    trailer.position.set(0, 2.2, 0);
    trailer.castShadow = true;
    truckGroup.add(trailer);

    // Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.0, 3.2), redMat);
    cab.position.set(0, 1.8, -6.8);
    truckGroup.add(cab);

    // Open Rear Loading Ramp (Players can run up into trailer!)
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 4.0), silverMat);
    ramp.position.set(0, 0.5, 7.2);
    ramp.rotation.x = 0.28; // Incline to ground
    truckGroup.add(ramp);

    this.scene.add(truckGroup);
    this.addCollider(1.5, 0, -7.5, 6.5, 3.8, 6.0);
  }

  private buildParkedCars() {
    // Gray pickup truck in front of House Alpha (Image 3 foreground)
    const pickupGroup = new THREE.Group();
    pickupGroup.position.set(-8.5, 0, -12);
    pickupGroup.rotation.y = 0.6;
    const grayMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const pickup = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 5.0), grayMat);
    pickup.position.set(0, 0.9, 0);
    pickupGroup.add(pickup);
    this.scene.add(pickupGroup);
    this.addCollider(-10.5, 0, -15, -6.5, 1.8, -9);

    // White sedan car in front of House Bravo (Image 4)
    const sedanGroup = new THREE.Group();
    sedanGroup.position.set(8.5, 0, 12);
    sedanGroup.rotation.y = -0.5;
    const sedanMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
    const sedan = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.4, 4.8), sedanMat);
    sedan.position.set(0, 0.8, 0);
    sedanGroup.add(sedan);
    this.scene.add(sedanGroup);
    this.addCollider(6.5, 0, 9, 10.5, 1.6, 15);
  }

  // Picket fences bounding yards and map edges
  private buildFencesAndProps() {
    const fenceMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const hedgeMat = new THREE.MeshLambertMaterial({ color: 0x2d5a27 });

    // Outer East / West perimeter fences
    const fenceWest = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 80), fenceMat);
    fenceWest.position.set(-18.5, 1.2, 0);
    this.scene.add(fenceWest);
    this.addCollider(-19, 0, -40, -18, 3, 40);

    const fenceEast = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 80), fenceMat);
    fenceEast.position.set(18.5, 1.2, 0);
    this.scene.add(fenceEast);
    this.addCollider(18, 0, -40, 19, 3, 40);

    // North / South backyard boundaries
    const fenceNorth = new THREE.Mesh(new THREE.BoxGeometry(37, 2.4, 0.3), fenceMat);
    fenceNorth.position.set(0, 1.2, -39.5);
    this.scene.add(fenceNorth);
    this.addCollider(-19, 0, -40, 19, 3, -39);

    const fenceSouth = new THREE.Mesh(new THREE.BoxGeometry(37, 2.4, 0.3), fenceMat);
    fenceSouth.position.set(0, 1.2, 39.5);
    this.scene.add(fenceSouth);
    this.addCollider(-19, 0, 39, 19, 3, 40);

    // Decorative hedges (Images 3 & 5)
    const hedge1 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 8.0), hedgeMat);
    hedge1.position.set(-15, 0.9, -6);
    this.scene.add(hedge1);

    const hedge2 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 8.0), hedgeMat);
    hedge2.position.set(15, 0.9, 6);
    this.scene.add(hedge2);
  }

  // The Iconic Doomsday Nuclear Clock Tower (Images 3 & 5)
  private buildDoomsdayTower() {
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-5, 0, -46); // Stands tall behind Alpha backyard

    const steelMat = new THREE.MeshLambertMaterial({ color: 0x475569 });

    // 4 legs
    const legGeo = new THREE.CylinderGeometry(0.2, 0.3, 22, 8);
    const legOffsets = [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]];
    legOffsets.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, steelMat);
      leg.position.set(lx, 11, lz);
      towerGroup.add(leg);
    });

    // Circular clock face
    const clockFace = new THREE.Mesh(
      new THREE.CylinderGeometry(3.5, 3.5, 0.5, 32),
      new THREE.MeshLambertMaterial({ color: 0xfef08a })
    );
    clockFace.rotation.x = Math.PI / 2;
    clockFace.position.set(0, 20, 0);
    towerGroup.add(clockFace);

    // Clock hands
    const hand = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 2.8, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x111111 })
    );
    hand.position.set(0, 20.8, 0.3);
    towerGroup.add(hand);

    this.scene.add(towerGroup);
  }

  // Visual cues for all 5 Hardpoint zones (translucent glowing zones)
  private buildHardpointVisuals() {
    NUKETOWN_HARDPOINT_ZONES.forEach((zone, i) => {
      const width = zone.maxX - zone.minX;
      const depth = zone.maxZ - zone.minZ;

      const zoneGeo = new THREE.BoxGeometry(width, 0.1, depth);
      const zoneMat = new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.25,
        wireframe: false
      });

      const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
      zoneMesh.position.set(zone.centerX, 0.06, zone.centerZ);
      this.scene.add(zoneMesh);
      this.hardpointMeshes.push(zoneMesh);

      // Yellow border outline
      const edges = new THREE.EdgesGeometry(zoneGeo);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xeab308, linewidth: 2 }));
      zoneMesh.add(line);
    });

    // Animated vertical light beacon for current active zone
    this.activeZoneBeacon = new THREE.Group();
    const beaconGeo = new THREE.CylinderGeometry(0.3, 1.2, 18, 16);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 9;
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
          mat.color.setHex(0xef4444); // Red pulse
          mat.opacity = 0.55;
        } else if (team === 'ALPHA') {
          mat.color.setHex(0x3b82f6); // Alpha Blue
          mat.opacity = 0.45;
        } else if (team === 'BRAVO') {
          mat.color.setHex(0xf97316); // Bravo Orange
          mat.opacity = 0.45;
        } else {
          mat.color.setHex(0xfacc15); // Neutral Yellow
          mat.opacity = 0.4;
        }
      } else {
        mat.color.setHex(0x64748b);
        mat.opacity = 0.08;
      }
    });
  }
}
