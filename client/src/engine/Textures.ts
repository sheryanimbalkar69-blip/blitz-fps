import * as THREE from 'three';

export class TextureGenerator {
  public static createGrassTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#4d7c2f';
    ctx.fillRect(0, 0, 512, 512);

    // Noise variation
    for (let i = 0; i < 40000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const shade = Math.random() > 0.5 ? '#5b8f38' : '#3e6625';
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, 2, 3);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 20);
    return tex;
  }

  public static createRoadTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Asphalt base
    ctx.fillStyle = '#23252a';
    ctx.fillRect(0, 0, 512, 512);

    // Noise
    for (let i = 0; i < 30000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.fillStyle = Math.random() > 0.5 ? '#1c1e22' : '#2b2d34';
      ctx.fillRect(x, y, 2, 2);
    }

    // Yellow dashed center stripe
    ctx.fillStyle = '#eab308';
    for (let y = 30; y < 512; y += 100) {
      ctx.fillRect(250, y, 12, 50);
    }

    // White outer shoulder line
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(30, 0, 8, 512);
    ctx.fillRect(474, 0, 8, 512);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 8);
    return tex;
  }

  public static createSidewalkTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 256, 256);

    // Slab joints
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 256, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 20);
    return tex;
  }

  public static createTealSidingTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#268a78';
    ctx.fillRect(0, 0, 256, 256);

    // Horizontal siding planks
    for (let y = 0; y < 256; y += 24) {
      ctx.fillStyle = '#319b88';
      ctx.fillRect(0, y + 2, 256, 20);
      ctx.fillStyle = '#175e52';
      ctx.fillRect(0, y, 256, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }

  public static createYellowSidingTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#d99726';
    ctx.fillRect(0, 0, 256, 256);

    // Horizontal siding planks
    for (let y = 0; y < 256; y += 24) {
      ctx.fillStyle = '#e8a93a';
      ctx.fillRect(0, y + 2, 256, 20);
      ctx.fillStyle = '#9c6810';
      ctx.fillRect(0, y, 256, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }

  public static createWoodDeckTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, 0, 256, 256);

    for (let y = 0; y < 256; y += 18) {
      ctx.fillStyle = '#9e6734';
      ctx.fillRect(0, y + 2, 256, 14);
      ctx.fillStyle = '#593616';
      ctx.fillRect(0, y, 256, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }

  public static createRoofShinglesTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#374151';
    ctx.fillRect(0, 0, 256, 256);

    for (let y = 0; y < 256; y += 16) {
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(0, y + 2, 256, 12);
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, y, 256, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }
}
