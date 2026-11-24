// HUD and UI System for Project Blitz (CODM Theme)
import { HardpointState, MatchState, KillfeedEvent, WEAPON_REGISTRY } from '../../../shared/packets';

export class GameHUD {
  private container: HTMLDivElement;
  private hitmarkerEl: HTMLDivElement;
  private killfeedContainer: HTMLDivElement;
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;

  // State
  private lastHitmarkerTime: number = 0;
  private isHitmarkerKill: boolean = false;
  public onSendChat: ((text: string, channel: 'WORLD' | 'MATCH') => void) | null = null;
  public onSelectWeapon: ((weaponId: string) => void) | null = null;
  public onSettingsChange: ((settings: any) => void) | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'game-hud';
    this.container.innerHTML = this.getTemplate();
    document.body.appendChild(this.container);

    this.hitmarkerEl = document.getElementById('hitmarker') as HTMLDivElement;
    this.killfeedContainer = document.getElementById('killfeed') as HTMLDivElement;
    this.minimapCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;

    this.setupListeners();
  }

  private getTemplate(): string {
    return `
      <!-- Crosshair & Hitmarker -->
      <div id="crosshair" class="crosshair-center">
        <div class="ch-line ch-top"></div>
        <div class="ch-line ch-bottom"></div>
        <div class="ch-line ch-left"></div>
        <div class="ch-line ch-right"></div>
        <div class="ch-dot"></div>
      </div>
      <div id="hitmarker" class="hitmarker-hidden">
        <svg viewBox="0 0 40 40" width="36" height="36">
          <line x1="8" y1="8" x2="16" y2="16" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="32" y1="8" x2="24" y2="16" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="8" y1="32" x2="16" y2="24" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="32" y1="32" x2="24" y2="24" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>

      <!-- High-Precision Tactical Sniper Scope Overlay (Kar98k) -->
      <div id="sniper-scope" class="scope-hidden">
        <div class="scope-dark-vignette"></div>
        <div class="scope-reticle-circle">
          <div class="scope-cross-v"></div>
          <div class="scope-cross-h"></div>
          <div class="scope-inner-ring"></div>
          <div class="scope-mil-marks"></div>
          <div class="scope-center-point"></div>
        </div>
      </div>

      <!-- Low Health Screen Vignette -->
      <div id="damage-vignette"></div>

      <!-- Top Hardpoint & Match Scoreboard -->
      <div id="scoreboard-top">
        <div class="team-score alpha-team">
          <span class="team-tag">ALPHA</span>
          <span id="score-alpha" class="score-val">0</span>
        </div>
        <div class="match-center-info">
          <div id="hardpoint-title">HARDPOINT</div>
          <div id="hardpoint-zone-name">HP 1: Cul-de-sac Center</div>
          <div id="hardpoint-timer-bar"><div id="hp-progress"></div></div>
          <div id="hardpoint-status" class="status-empty">EMPTY</div>
        </div>
        <div class="team-score bravo-team">
          <span id="score-bravo" class="score-val">0</span>
          <span class="team-tag">BRAVO</span>
        </div>
      </div>

      <!-- Top-Left Performance Metrics -->
      <div id="metrics-panel">
        <div class="metric-row"><span class="metric-label">FPS:</span> <span id="val-fps">60</span></div>
        <div class="metric-row"><span class="metric-label">PING:</span> <span id="val-ping">24</span> ms</div>
        <div class="metric-row map-name">NUKETOWN 5v5</div>
      </div>

      <!-- Top-Right Minimap & Killfeed -->
      <div id="top-right-section">
        <div id="minimap-container">
          <canvas id="minimap-canvas" width="130" height="130"></canvas>
        </div>
        <div id="killfeed"></div>
      </div>

      <!-- Bottom-Left Health Bar -->
      <div id="health-panel">
        <div class="health-meta">
          <span class="health-icon">✚</span>
          <span id="val-hp">100</span>
        </div>
        <div class="health-bar-bg">
          <div id="hp-fill"></div>
        </div>
      </div>

      <!-- Bottom-Right Ammo & Weapon Info -->
      <div id="weapon-panel">
        <div class="hud-key-hints">Right Click / Q: Scope | B: Cycle Gun</div>
        <div id="weapon-name">M4A1 ASSAULT RIFLE</div>
        <div class="ammo-counter">
          <span id="val-ammo">30</span>
          <span class="ammo-slash">/</span>
          <span id="val-reserve">90</span>
        </div>
        <div class="loadout-slots">
          <div class="slot active" id="slot-1">1: PRIMARY</div>
          <div class="slot" id="slot-2">2: SECONDARY</div>
          <div class="slot" id="slot-3">3: LETHAL</div>
          <div class="slot" id="slot-4">4: TACTICAL</div>
        </div>
      </div>

      <!-- Bottom-Left World & Match Chat -->
      <div id="chat-container">
        <div id="chat-tabs">
          <button class="chat-tab active" id="tab-match">MATCH</button>
          <button class="chat-tab" id="tab-world">WORLD</button>
        </div>
        <div id="chat-messages"></div>
        <div id="chat-input-bar">
          <input type="text" id="chat-input" placeholder="Press Enter to chat..." maxlength="120" />
        </div>
      </div>

      <!-- Pause / Settings / Loadout Modal (ESC) -->
      <div id="settings-modal" class="modal-hidden">
        <div class="modal-content">
          <div class="modal-header">
            <h2>TACTICAL LOADOUT & SETTINGS</h2>
            <button id="btn-close-settings">✕ CLOSE (ESC)</button>
          </div>

          <div class="modal-body">
            <!-- Weapon Loadout Selection -->
            <div class="settings-section">
              <h3>SELECT PRIMARY WEAPON</h3>
              <div class="weapon-grid">
                <button class="btn-weapon selected" data-w="m4a1">M4A1<br><small>Assault Rifle</small></button>
                <button class="btn-weapon" data-w="ak47">AK-47<br><small>Heavy AR</small></button>
                <button class="btn-weapon" data-w="mp5">MP5<br><small>Fast SMG</small></button>
                <button class="btn-weapon" data-w="pp19">PP19 Bizon<br><small>Large Mag SMG</small></button>
                <button class="btn-weapon" data-w="kar98k">Kar98k<br><small>Sniper Rifle</small></button>
                <button class="btn-weapon" data-w="model680">Model 680<br><small>Shotgun</small></button>
              </div>
            </div>

            <!-- Graphics & Controls -->
            <div class="settings-section">
              <h3>GRAPHICS & CONTROLS</h3>
              <div class="control-row">
                <label>Mouse Sensitivity:</label>
                <input type="range" id="slider-sens" min="0.001" max="0.005" step="0.0002" value="0.0022" />
              </div>
              <div class="control-row">
                <label>Field of View (FOV):</label>
                <input type="range" id="slider-fov" min="65" max="100" step="1" value="75" />
                <span id="label-fov">75°</span>
              </div>
              <div class="control-row">
                <label>Audio Volume:</label>
                <input type="range" id="slider-vol" min="0" max="1" step="0.05" value="0.5" />
              </div>
              <div class="control-row">
                <label>Resolution Scale:</label>
                <select id="select-res">
                  <option value="1">100% (High Quality)</option>
                  <option value="0.75">75% (Balanced)</option>
                  <option value="0.5">50% (Performance Boost)</option>
                </select>
              </div>
            </div>
            <div class="settings-section">
              <h3>KEYBOARD & MOUSE CONTROLS</h3>
              <div class="controls-list" style="font-size: 13px; line-height: 1.6; color: #94a3b8;">
                <div><strong style="color: #38bdf8;">WASD</strong>: Move</div>
                <div><strong style="color: #38bdf8;">Left Click</strong>: Fire</div>
                <div><strong style="color: #38bdf8;">Right Click / Q</strong>: Scope / Aim Down Sights (Tap or Hold)</div>
                <div><strong style="color: #38bdf8;">B</strong>: Cycle Primary Gun (M4A1, Kar98k Sniper, AK-47, MP5, PP19, Model 680)</div>
                <div><strong style="color: #38bdf8;">R</strong>: Reload</div>
                <div><strong style="color: #38bdf8;">Shift</strong>: Sprint</div>
                <div><strong style="color: #38bdf8;">C / Ctrl</strong>: Crouch</div>
                <div><strong style="color: #38bdf8;">Space</strong>: Jump</div>
                <div><strong style="color: #38bdf8;">1 / 2 / 3 / 4</strong>: Weapon Slots (Primary / Pistol / Frag / Flash)</div>
                <div><strong style="color: #38bdf8;">ESC</strong>: Open Loadout & Settings</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private setupListeners() {
    // Chat toggle with Enter
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Enter') {
        if (document.activeElement === chatInput) {
          const text = chatInput.value.trim();
          if (text && this.onSendChat) {
            const isWorld = document.getElementById('tab-world')?.classList.contains('active');
            this.onSendChat(text, isWorld ? 'WORLD' : 'MATCH');
          }
          chatInput.value = '';
          chatInput.blur();
        } else {
          chatInput.focus();
        }
      } else if (e.code === 'Escape') {
        this.toggleSettingsModal();
      }
    });

    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      this.toggleSettingsModal(false);
    });

    // Chat tabs
    document.getElementById('tab-match')?.addEventListener('click', () => {
      document.getElementById('tab-match')?.classList.add('active');
      document.getElementById('tab-world')?.classList.remove('active');
    });
    document.getElementById('tab-world')?.addEventListener('click', () => {
      document.getElementById('tab-world')?.classList.add('active');
      document.getElementById('tab-match')?.classList.remove('active');
    });

    // Weapon selection
    document.querySelectorAll('.btn-weapon').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-weapon').forEach(b => b.classList.remove('selected'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('selected');
        const weaponId = target.getAttribute('data-w') || 'm4a1';
        if (this.onSelectWeapon) this.onSelectWeapon(weaponId);
      });
    });

    // Settings sliders
    document.getElementById('slider-fov')?.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      const label = document.getElementById('label-fov');
      if (label) label.textContent = `${val}°`;
      if (this.onSettingsChange) this.onSettingsChange({ fov: Number(val) });
    });

    document.getElementById('slider-sens')?.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      if (this.onSettingsChange) this.onSettingsChange({ sens: Number(val) });
    });

    document.getElementById('slider-vol')?.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      if (this.onSettingsChange) this.onSettingsChange({ vol: Number(val) });
    });
  }

  public toggleSettingsModal(open?: boolean) {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    const shouldOpen = open !== undefined ? open : modal.classList.contains('modal-hidden');
    if (shouldOpen) {
      modal.classList.remove('modal-hidden');
      if (document.exitPointerLock) document.exitPointerLock();
    } else {
      modal.classList.add('modal-hidden');
    }
  }

  public showHitmarker(isKill: boolean = false) {
    this.lastHitmarkerTime = Date.now();
    this.isHitmarkerKill = isKill;
    this.hitmarkerEl.className = isKill ? 'hitmarker-kill' : 'hitmarker-hit';

    setTimeout(() => {
      if (Date.now() - this.lastHitmarkerTime >= 140) {
        this.hitmarkerEl.className = 'hitmarker-hidden';
      }
    }, 150);
  }

  public addKillfeedItem(event: KillfeedEvent) {
    const item = document.createElement('div');
    item.className = 'kf-item';
    const killerClass = event.killerTeam === 'ALPHA' ? 'team-alpha-text' : 'team-bravo-text';
    const victimClass = event.victimTeam === 'ALPHA' ? 'team-alpha-text' : 'team-bravo-text';
    const weaponName = WEAPON_REGISTRY[event.weapon]?.name || event.weapon.toUpperCase();

    item.innerHTML = `
      <span class="${killerClass}">${event.killerName}</span>
      <span class="kf-weapon">🔫 ${weaponName}</span>
      <span class="${victimClass}">${event.victimName}</span>
      ${event.isHeadshot ? '<span class="kf-hs">🎯</span>' : ''}
    `;

    this.killfeedContainer.appendChild(item);
    setTimeout(() => {
      item.style.opacity = '0';
      setTimeout(() => item.remove(), 400);
    }, 4500);
  }

  public addChatMessage(sender: string, text: string, isWorld: boolean = false) {
    const msgBox = document.getElementById('chat-messages');
    if (!msgBox) return;

    const div = document.createElement('div');
    div.className = `chat-msg ${isWorld ? 'msg-world' : 'msg-match'}`;
    div.innerHTML = `<span class="chat-sender">${sender}:</span> <span class="chat-text">${text}</span>`;
    msgBox.appendChild(div);
    msgBox.scrollTop = msgBox.scrollHeight;
  }

  public updateHUD(
    hp: number,
    ammo: number,
    reserveAmmo: number,
    weaponId: string,
    match: MatchState,
    hpState: HardpointState,
    fps: number,
    ping: number,
    playerX: number,
    playerZ: number,
    playerYaw: number,
    otherPlayers: any[],
    isAiming: boolean = false
  ) {
    // Health
    const hpVal = document.getElementById('val-hp');
    const hpFill = document.getElementById('hp-fill');
    const vignette = document.getElementById('damage-vignette');
    if (hpVal && hpFill) {
      hpVal.textContent = String(Math.max(0, Math.round(hp)));
      const pct = Math.max(0, Math.min(100, hp));
      hpFill.style.width = `${pct}%`;
      hpFill.style.background = hp > 40 ? '#22c55e' : '#ef4444';
      if (vignette) {
        vignette.style.opacity = hp < 40 ? String((40 - hp) / 40 * 0.7) : '0';
      }
    }

    // Ammo
    const ammoVal = document.getElementById('val-ammo');
    const reserveVal = document.getElementById('val-reserve');
    const weaponLabel = document.getElementById('weapon-name');
    if (ammoVal && reserveVal) {
      ammoVal.textContent = String(ammo);
      reserveVal.textContent = String(reserveAmmo);
      const w = WEAPON_REGISTRY[weaponId];
      if (weaponLabel && w) {
        weaponLabel.textContent = `${w.name.toUpperCase()} [${w.slot}]`;
      }
    }

    // Scoreboard
    const alphaScore = document.getElementById('score-alpha');
    const bravoScore = document.getElementById('score-bravo');
    if (alphaScore) alphaScore.textContent = String(match.alphaScore);
    if (bravoScore) bravoScore.textContent = String(match.bravoScore);

    // Hardpoint Zone
    const zoneName = document.getElementById('hardpoint-zone-name');
    const hpProgress = document.getElementById('hp-progress');
    const hpStatus = document.getElementById('hardpoint-status');
    if (zoneName) zoneName.textContent = hpState.zoneName;
    if (hpProgress) hpProgress.style.width = `${(hpState.remainingTime / 60) * 100}%`;
    if (hpStatus) {
      hpStatus.textContent = hpState.status;
      if (hpState.status === 'CONTESTED') {
        hpStatus.className = 'status-contested';
      } else if (hpState.controllingTeam === 'ALPHA') {
        hpStatus.className = 'status-alpha';
      } else if (hpState.controllingTeam === 'BRAVO') {
        hpStatus.className = 'status-bravo';
      } else {
        hpStatus.className = 'status-empty';
      }
    }

    // Metrics
    const fpsEl = document.getElementById('val-fps');
    const pingEl = document.getElementById('val-ping');
    if (fpsEl) fpsEl.textContent = String(Math.round(fps));
    if (pingEl) {
      const p = Math.round(ping);
      pingEl.textContent = String(p);
      if (p <= 65) {
        pingEl.style.color = '#2ecc71'; // Low green ping
      } else if (p <= 110) {
        pingEl.style.color = '#f1c40f'; // Moderate yellow ping
      } else {
        pingEl.style.color = '#e74c3c'; // High ping
      }
    }

    // Crosshair & Scope ADS state
    const crosshairEl = document.getElementById('crosshair');
    const scopeEl = document.getElementById('sniper-scope');
    const isSniper = weaponId === 'kar98k';

    if (crosshairEl) {
      if (isAiming) {
        crosshairEl.classList.add('ads-active');
        if (isSniper) {
          crosshairEl.style.display = 'none';
        } else {
          crosshairEl.style.display = 'block';
        }
      } else {
        crosshairEl.classList.remove('ads-active');
        crosshairEl.style.display = 'block';
      }
    }

    if (scopeEl) {
      if (isAiming && isSniper) {
        scopeEl.className = 'scope-visible';
      } else {
        scopeEl.className = 'scope-hidden';
      }
    }

    // Minimap Radar
    this.renderMinimap(playerX, playerZ, playerYaw, otherPlayers, hpState.zoneIndex);
  }

  private renderMinimap(px: number, pz: number, pyaw: number, players: any[], zoneIdx: number) {
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // 1. Radar Circular Clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    ctx.clip();

    // Radar Dark Grid Background
    ctx.fillStyle = 'rgba(10, 15, 26, 0.92)';
    ctx.fillRect(0, 0, w, h);

    // Radar Range Rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, cx * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, cx * 0.85, 0, Math.PI * 2);
    ctx.stroke();

    // Map Scale: 80m map length -> fits radar view
    const scale = (cx * 0.85) / 38;

    // Transform world coordinates relative to local player
    const worldToRadar = (wx: number, wz: number) => {
      return {
        x: cx + (wx - px) * scale,
        y: cy + (wz - pz) * scale
      };
    };

    // 2. Draw Nuketown Road & Cul-de-sac
    const rLeft = worldToRadar(-12, -40);
    const rRight = worldToRadar(12, 40);
    ctx.fillStyle = 'rgba(51, 65, 85, 0.6)';
    ctx.fillRect(rLeft.x, rLeft.y, (24 * scale), (80 * scale));

    const culDeSac = worldToRadar(0, 0);
    ctx.beginPath();
    ctx.arc(culDeSac.x, culDeSac.y, 13 * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(71, 85, 105, 0.7)';
    ctx.fill();

    // 3. Draw House Alpha (North / Green House)
    const hA = worldToRadar(-7, -32);
    ctx.fillStyle = 'rgba(20, 184, 166, 0.5)';
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 1.5;
    ctx.fillRect(hA.x, hA.y, 14 * scale, 16 * scale);
    ctx.strokeRect(hA.x, hA.y, 14 * scale, 16 * scale);

    // 4. Draw House Bravo (South / Yellow House)
    const hB = worldToRadar(-7, 16);
    ctx.fillStyle = 'rgba(234, 179, 8, 0.5)';
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.5;
    ctx.fillRect(hB.x, hB.y, 14 * scale, 16 * scale);
    ctx.strokeRect(hB.x, hB.y, 14 * scale, 16 * scale);

    // 5. Draw Center School Bus & Moving Truck
    const busPos = worldToRadar(-3.5, 1.0);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(busPos.x - 1.5 * scale, busPos.y - 4.5 * scale, 3 * scale, 9 * scale);

    const truckPos = worldToRadar(4.0, -1.0);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(truckPos.x - 1.5 * scale, truckPos.y - 5.5 * scale, 3 * scale, 11 * scale);

    // 6. Draw Active Hardpoint Zone (Pulsing Yellow Box with 'HP')
    const hpDefs = [
      { x: 0, z: 0, w: 9, d: 10 },     // HP 1: Center
      { x: -1, z: -24, w: 10, d: 8 },  // HP 2: House A
      { x: 0, z: 36, w: 10, d: 8 },    // HP 3: Patio B
      { x: 0, z: -36, w: 10, d: 8 },   // HP 4: Patio A
      { x: 1, z: 24, w: 10, d: 8 }     // HP 5: House B
    ];
    const currentHp = hpDefs[zoneIdx] || hpDefs[0];
    const hpCenter = worldToRadar(currentHp.x, currentHp.z);
    const pulseAlpha = 0.5 + Math.sin(Date.now() * 0.006) * 0.3;

    ctx.fillStyle = `rgba(250, 204, 21, ${pulseAlpha})`;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.fillRect(
      hpCenter.x - (currentHp.w * scale) / 2,
      hpCenter.y - (currentHp.d * scale) / 2,
      currentHp.w * scale,
      currentHp.d * scale
    );
    ctx.strokeRect(
      hpCenter.x - (currentHp.w * scale) / 2,
      hpCenter.y - (currentHp.d * scale) / 2,
      currentHp.w * scale,
      currentHp.d * scale
    );

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HP', hpCenter.x, hpCenter.y);

    // 7. Draw Other Players & Bots
    for (const p of players) {
      if (p.isDead) continue;
      const pPos = worldToRadar(p.x, p.z);
      if (Math.hypot(pPos.x - cx, pPos.y - cy) < cx - 4) {
        ctx.fillStyle = p.team === 'ALPHA' ? '#38bdf8' : '#f97316';
        ctx.beginPath();
        ctx.arc(pPos.x, pPos.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // 8. Draw Local Player Chevron in Center
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-pyaw + Math.PI);
    ctx.fillStyle = '#22c55e'; // Bright green tactical arrow
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // End Circular Clip

    // Outer Tactical Ring & Compass Markers
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, 11);
    ctx.fillText('S', cx, h - 3);
    ctx.fillText('W', 7, cy + 3);
    ctx.fillText('E', w - 7, cy + 3);
  }
}
