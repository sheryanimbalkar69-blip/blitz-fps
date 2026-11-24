// High-Detail Procedural Weapon Models for Project Blitz FPS
import * as THREE from 'three';

export class WeaponModelFactory {
  // Shared materials for weapon rendering with realistic PBR properties
  private static gunMetalMat = new THREE.MeshStandardMaterial({
    color: 0x22262d,
    roughness: 0.3,
    metalness: 0.85
  });

  private static steelMat = new THREE.MeshStandardMaterial({
    color: 0x4b5563,
    roughness: 0.2,
    metalness: 0.95
  });

  private static darkPlasticMat = new THREE.MeshStandardMaterial({
    color: 0x181a1f,
    roughness: 0.5,
    metalness: 0.2
  });

  private static fdeTanMat = new THREE.MeshStandardMaterial({
    color: 0x9a652f, // Magpul Flat Dark Earth
    roughness: 0.7,
    metalness: 0.1
  });

  private static walnutWoodMat = new THREE.MeshStandardMaterial({
    color: 0x542d13, // Rich Russian walnut
    roughness: 0.65,
    metalness: 0.05
  });

  private static goldBrassMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.25,
    metalness: 0.9
  });

  // Hands & Gloves Material
  private static gloveMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.85
  });

  private static knuckleMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.3,
    metalness: 0.6
  });

  private static sleeveMat = new THREE.MeshStandardMaterial({
    color: 0x3f4f38, // Tactical Multicam Olive
    roughness: 0.9
  });

  public static buildWeaponModel(weaponId: string): THREE.Group {
    const root = new THREE.Group();

    switch (weaponId) {
      case 'ak47':
        root.add(this.createAK47());
        break;
      case 'mp5':
        root.add(this.createMP5());
        break;
      case 'pp19':
        root.add(this.createPP19());
        break;
      case 'kar98k':
        root.add(this.createKar98k());
        break;
      case 'model680':
        root.add(this.createModel680());
        break;
      case 'pistol1911':
        root.add(this.createPistol1911());
        break;
      case 'deagle':
        root.add(this.createDeagle());
        break;
      case 'knife':
        root.add(this.createKnife());
        break;
      case 'm4a1':
      default:
        root.add(this.createM4A1());
        break;
    }

    // Attach Tactical Hands & Arms to every weapon
    root.add(this.createOperatorHands(weaponId));

    return root;
  }

  // 1. M4A1 CARBINE WITH EOTECH SIGHT & PEQ-15
  private static createM4A1(): THREE.Group {
    const g = new THREE.Group();

    // Receiver (Upper & Lower)
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.048, 0.24), this.gunMetalMat);
    upper.position.set(0, 0.02, -0.12);
    g.add(upper);

    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.045, 0.2), this.gunMetalMat);
    lower.position.set(0, -0.02, -0.1);
    g.add(lower);

    // Forward Assist Knob
    const fa = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.025, 8), this.steelMat);
    fa.rotation.z = Math.PI / 4;
    fa.position.set(0.028, 0.025, -0.05);
    g.add(fa);

    // Picatinny Top Rail
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.012, 0.38), this.steelMat);
    rail.position.set(0, 0.048, -0.17);
    g.add(rail);

    // Quad-Rail Handguard
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.052, 0.22), this.fdeTanMat);
    handguard.position.set(0, 0.006, -0.34);
    g.add(handguard);

    // PEQ-15 Tactical Laser Box (Mounted on Top Rail)
    const peq = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.022, 0.07), this.darkPlasticMat);
    peq.position.set(0, 0.062, -0.36);
    g.add(peq);
    const laserLens = new THREE.Mesh(new THREE.CircleGeometry(0.004, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    laserLens.position.set(0.008, 0.062, -0.396);
    g.add(laserLens);

    // Angled Foregrip (Under Handguard)
    const afg = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.045, 0.08), this.fdeTanMat);
    afg.position.set(0, -0.035, -0.34);
    afg.rotation.x = -0.3;
    g.add(afg);

    // Barrel & Birdcage Flash Hider
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.18, 12), this.steelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, -0.52);
    g.add(barrel);

    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.045, 8), this.steelMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.01, -0.62);
    g.add(muzzle);

    // 30-round STANAG Magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.14, 0.065), this.steelMat);
    mag.position.set(0, -0.085, -0.15);
    mag.rotation.x = 0.2;
    g.add(mag);

    // Pistol Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.11, 0.048), this.fdeTanMat);
    grip.position.set(0, -0.07, -0.02);
    grip.rotation.x = -0.35;
    g.add(grip);

    // Holographic Sight (EOTech) with Floating Red Reticle
    const opticHood = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.034, 0.07), this.darkPlasticMat);
    opticHood.position.set(0, 0.075, -0.12);
    g.add(opticHood);

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.026, 0.005),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.25 })
    );
    glass.position.set(0, 0.075, -0.12);
    g.add(glass);

    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.004, 0.0055, 16),
      new THREE.MeshBasicMaterial({ color: 0xff1111, side: THREE.DoubleSide })
    );
    reticle.position.set(0, 0.075, -0.121);
    g.add(reticle);

    const reticleCenter = new THREE.Mesh(
      new THREE.CircleGeometry(0.0012, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2222 })
    );
    reticleCenter.position.set(0, 0.075, -0.121);
    g.add(reticleCenter);

    return g;
  }

  // 2. AK-47 KALASHNIKOV WITH WALNUT WOOD & STEEL
  private static createAK47(): THREE.Group {
    const g = new THREE.Group();

    // Stamped Receiver
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.07, 0.28), this.gunMetalMat);
    receiver.position.set(0, 0, -0.12);
    g.add(receiver);

    // Bolt Carrier & Charging Handle (Right side)
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.025, 8), this.steelMat);
    bolt.rotation.z = Math.PI / 2;
    bolt.position.set(0.03, 0.02, -0.1);
    g.add(bolt);

    // Russian Walnut Wood Lower Handguard & Upper Gas Tube
    const woodLower = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.035, 0.18), this.walnutWoodMat);
    woodLower.position.set(0, -0.01, -0.34);
    g.add(woodLower);

    const woodUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 10), this.walnutWoodMat);
    woodUpper.rotation.x = Math.PI / 2;
    woodUpper.position.set(0, 0.025, -0.34);
    g.add(woodUpper);

    // Barrel & Slant Muzzle Brake
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.22, 12), this.steelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.005, -0.52);
    g.add(barrel);

    const slantBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.04, 8), this.steelMat);
    slantBrake.rotation.x = Math.PI / 2 + 0.15; // Signature AK slant
    slantBrake.position.set(0, 0.005, -0.64);
    g.add(slantBrake);

    // Curved Orange-Brown Bakelite / Steel Banana Magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.18, 0.08), this.fdeTanMat);
    mag.position.set(0, -0.1, -0.18);
    mag.rotation.x = 0.38; // Heavy AK curve
    g.add(mag);

    // Wood Pistol Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.11, 0.048), this.walnutWoodMat);
    grip.position.set(0, -0.07, -0.01);
    grip.rotation.x = -0.32;
    g.add(grip);

    // Iron Sights: Rear Tangent + Front Hooded Post
    const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.04), this.steelMat);
    rearSight.position.set(0, 0.042, -0.23);
    g.add(rearSight);

    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.035, 0.015), this.steelMat);
    frontSight.position.set(0, 0.032, -0.6);
    g.add(frontSight);

    const frontPost = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.012, 6), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    frontPost.position.set(0, 0.04, -0.6);
    g.add(frontPost);

    return g;
  }

  // 3. MP5 SUBMACHINE GUN
  private static createMP5(): THREE.Group {
    const g = new THREE.Group();

    // Receiver & Cocking Tube
    const rec = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.065, 0.22), this.gunMetalMat);
    rec.position.set(0, 0, -0.1);
    g.add(rec);

    const cockingTube = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.22, 10), this.gunMetalMat);
    cockingTube.rotation.x = Math.PI / 2;
    cockingTube.position.set(0, 0.038, -0.2);
    g.add(cockingTube);

    // Classic MP5 Cocking Handle in 45° notch
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.025, 8), this.steelMat);
    handle.rotation.z = Math.PI / 4;
    handle.position.set(-0.02, 0.048, -0.24);
    g.add(handle);

    // Ribbed Polymer Handguard
    const handguard = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.16, 12), this.darkPlasticMat);
    handguard.rotation.x = Math.PI / 2;
    handguard.position.set(0, 0, -0.28);
    g.add(handguard);

    // Short Barrel with 3-Lug Muzzle
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 10), this.steelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.008, -0.4);
    g.add(barrel);

    // Curved 9mm 30-round Magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.16, 0.045), this.steelMat);
    mag.position.set(0, -0.09, -0.14);
    mag.rotation.x = 0.25;
    g.add(mag);

    // Polymer Navy Trigger Group & Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.1, 0.045), this.darkPlasticMat);
    grip.position.set(0, -0.065, -0.01);
    grip.rotation.x = -0.3;
    g.add(grip);

    // H&K Drum Diopter Rear Sight & Circular Hooded Front Sight
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.015, 10), this.steelMat);
    drum.position.set(0, 0.044, -0.02);
    g.add(drum);

    const frontHood = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0025, 8, 16), this.steelMat);
    frontHood.position.set(0, 0.038, -0.38);
    g.add(frontHood);

    return g;
  }

  // 4. PP19 BIZON WITH HELICAL DRUM MAGAZINE
  private static createPP19(): THREE.Group {
    const g = new THREE.Group();

    // AK-style Receiver
    const rec = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.065, 0.24), this.gunMetalMat);
    rec.position.set(0, 0, -0.1);
    g.add(rec);

    // Signature Massive Helical 64-round Cylinder Magazine under barrel
    const drumMag = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.26, 16), this.darkPlasticMat);
    drumMag.rotation.x = Math.PI / 2;
    drumMag.position.set(0, -0.035, -0.28);
    g.add(drumMag);

    // Barrel & Sight
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.14, 10), this.steelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, -0.44);
    g.add(barrel);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.1, 0.045), this.darkPlasticMat);
    grip.position.set(0, -0.065, -0.01);
    grip.rotation.x = -0.3;
    g.add(grip);

    return g;
  }

  // 5. KAR98K BOLT ACTION SNIPER RIFLE WITH HIGH-POWER OPTIC
  private static createKar98k(): THREE.Group {
    const g = new THREE.Group();

    // Polished Walnut Stock (Full length)
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.055, 0.55), this.walnutWoodMat);
    stock.position.set(0, -0.015, -0.24);
    g.add(stock);

    // Receiver & Bolt-Action System
    const rec = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.2, 12), this.steelMat);
    rec.rotation.x = Math.PI / 2;
    rec.position.set(0, 0.02, -0.12);
    g.add(rec);

    // Turned-down Mauser Bolt Handle with Ball Knob
    const boltArm = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.035, 6), this.steelMat);
    boltArm.position.set(0.028, 0.01, -0.08);
    boltArm.rotation.z = Math.PI / 3;
    g.add(boltArm);
    const boltBall = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), this.steelMat);
    boltBall.position.set(0.042, -0.005, -0.08);
    g.add(boltBall);

    // Long Sniper Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.35, 12), this.steelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.018, -0.58);
    g.add(barrel);

    // High-Power 8x Sniper Scope mounted on tall rings
    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.24, 16), this.gunMetalMat);
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.065, -0.18);
    g.add(scopeTube);

    // Scope Objective & Ocular bells
    const scopeBellFront = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.015, 0.06, 16), this.gunMetalMat);
    scopeBellFront.rotation.x = Math.PI / 2;
    scopeBellFront.position.set(0, 0.065, -0.32);
    g.add(scopeBellFront);

    const scopeBellRear = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.015, 0.04, 16), this.gunMetalMat);
    scopeBellRear.rotation.x = Math.PI / 2;
    scopeBellRear.position.set(0, 0.065, -0.05);
    g.add(scopeBellRear);

    // Brass Scope Turrets
    const turretTop = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.012, 10), this.goldBrassMat);
    turretTop.position.set(0, 0.083, -0.18);
    g.add(turretTop);

    // Scope Glass with Illuminated Crosshair
    const scopeGlass = new THREE.Mesh(
      new THREE.CircleGeometry(0.016, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 })
    );
    scopeGlass.position.set(0, 0.065, -0.03);
    g.add(scopeGlass);

    const crosshairV = new THREE.Mesh(new THREE.PlaneGeometry(0.0008, 0.024), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    crosshairV.position.set(0, 0.065, -0.031);
    g.add(crosshairV);

    const crosshairH = new THREE.Mesh(new THREE.PlaneGeometry(0.024, 0.0008), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    crosshairH.position.set(0, 0.065, -0.031);
    g.add(crosshairH);

    return g;
  }

  // 6. MODEL 680 TACTICAL SHOTGUN
  private static createModel680(): THREE.Group {
    const g = new THREE.Group();

    // Heavy 12-Gauge Receiver
    const rec = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.08, 0.26), this.gunMetalMat);
    rec.position.set(0, 0, -0.1);
    g.add(rec);

    // Smoothbore Shotgun Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.32, 12), this.steelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.025, -0.38);
    g.add(barrel);

    // Full-Length Under-Barrel Tubular Magazine
    const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 12), this.steelMat);
    magTube.rotation.x = Math.PI / 2;
    magTube.position.set(0, -0.005, -0.37);
    g.add(magTube);

    // Ribbed Polymer Pump-Action Forend
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.16, 14), this.darkPlasticMat);
    pump.rotation.x = Math.PI / 2;
    pump.position.set(0, -0.005, -0.32);
    g.add(pump);

    // Pistol Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.11, 0.05), this.darkPlasticMat);
    grip.position.set(0, -0.07, -0.01);
    grip.rotation.x = -0.35;
    g.add(grip);

    // High-Viz Front Bead Sight
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    bead.position.set(0, 0.042, -0.53);
    g.add(bead);

    return g;
  }

  // 7. 1911 CLASSIC PISTOL
  private static createPistol1911(): THREE.Group {
    const g = new THREE.Group();

    // Brushed Steel Slide
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.042, 0.2), this.steelMat);
    slide.position.set(0, 0.02, -0.08);
    g.add(slide);

    // Frame & Trigger Guard
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.035, 0.18), this.steelMat);
    frame.position.set(0, -0.015, -0.08);
    g.add(frame);

    // Checkered Wood Grip Panels
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.11, 0.05), this.walnutWoodMat);
    grip.position.set(0, -0.07, -0.01);
    grip.rotation.x = -0.28;
    g.add(grip);

    // Skeletonized Hammer Cocked
    const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.016, 0.016), this.gunMetalMat);
    hammer.position.set(0, 0.035, 0.02);
    g.add(hammer);

    // 3-Dot Combat Sights
    const frontDot = new THREE.Mesh(new THREE.CircleGeometry(0.0018, 6), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    frontDot.position.set(0, 0.045, -0.178);
    g.add(frontDot);

    return g;
  }

  // 8. DESERT EAGLE .50 AE
  private static createDeagle(): THREE.Group {
    const g = new THREE.Group();

    // Massive Angular Slide & Polygonal Barrel
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.056, 0.24), this.gunMetalMat);
    slide.position.set(0, 0.025, -0.09);
    g.add(slide);

    // Large Heavy Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.042, 0.22), this.gunMetalMat);
    frame.position.set(0, -0.018, -0.09);
    g.add(frame);

    // Finger-Groove Wrap-Around Rubber Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.13, 0.065), this.darkPlasticMat);
    grip.position.set(0, -0.08, -0.01);
    grip.rotation.x = -0.28;
    g.add(grip);

    // Oversized Trigger Guard & Trigger
    const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.025, 0.015), this.steelMat);
    trigger.position.set(0, -0.035, -0.07);
    g.add(trigger);

    return g;
  }

  // 9. TACTICAL COMBAT KNIFE
  private static createKnife(): THREE.Group {
    const g = new THREE.Group();

    // Clip-Point Bowie Blade with Black Anti-Glare Finish
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.042, 0.22), this.steelMat);
    blade.position.set(0, 0.01, -0.14);
    g.add(blade);

    // Sawback Serrations on Spine
    for (let z = -0.18; z <= -0.08; z += 0.015) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.003, 0.008, 4), this.steelMat);
      tooth.position.set(0, 0.034, z);
      g.add(tooth);
    }

    // Steel Crossguard
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.014, 0.02), this.gunMetalMat);
    guard.position.set(0, 0.01, -0.03);
    g.add(guard);

    // Ribbed Kraton Rubber Grip
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 10), this.darkPlasticMat);
    grip.rotation.x = Math.PI / 2;
    grip.position.set(0, 0.01, 0.04);
    g.add(grip);

    // Steel Skull-Crusher Pommel
    const pommel = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.016, 6), this.steelMat);
    pommel.rotation.x = -Math.PI / 2;
    pommel.position.set(0, 0.01, 0.11);
    g.add(pommel);

    return g;
  }

  // OPERATOR GLOVED HANDS & FOREARMS (Realistic First-Person Rig)
  private static createOperatorHands(weaponId: string): THREE.Group {
    const hands = new THREE.Group();

    // Right Hand (Firing hand on grip)
    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.24, 10), this.sleeveMat);
    rightArm.rotation.x = -0.35;
    rightArm.position.set(0.05, -0.15, 0.12);
    hands.add(rightArm);

    const rightGlove = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.065, 0.09), this.gloveMat);
    rightGlove.position.set(0.035, -0.08, 0.02);
    rightGlove.rotation.x = -0.35;
    hands.add(rightGlove);

    // Molded Carbon-Fiber Knuckle Guard
    const knuckleGuard = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.018, 0.035), this.knuckleMat);
    knuckleGuard.position.set(0.035, -0.06, 0.025);
    knuckleGuard.rotation.x = -0.35;
    hands.add(knuckleGuard);

    // Trigger Finger Posed on Trigger Guard
    const triggerFinger = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.045, 8), this.gloveMat);
    triggerFinger.rotation.x = Math.PI / 2;
    triggerFinger.position.set(0.02, -0.045, -0.04);
    hands.add(triggerFinger);

    // Left Hand (Supporting Handguard / Forend) - Only for 2-handed primary weapons!
    const isPistolOrKnife = (weaponId === 'pistol1911' || weaponId === 'deagle' || weaponId === 'knife');
    if (!isPistolOrKnife) {
      const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.3, 10), this.sleeveMat);
      leftArm.rotation.set(0.3, 0.5, -0.8);
      leftArm.position.set(-0.16, -0.18, -0.15);
      hands.add(leftArm);

      const leftGlove = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.05, 0.08), this.gloveMat);
      leftGlove.position.set(-0.04, -0.045, -0.32);
      leftGlove.rotation.set(0.1, 0.3, -0.2);
      hands.add(leftGlove);

      const leftThumb = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.04, 6), this.gloveMat);
      leftThumb.position.set(-0.04, -0.015, -0.31);
      leftThumb.rotation.z = Math.PI / 3;
      hands.add(leftThumb);
    }

    return hands;
  }
}
