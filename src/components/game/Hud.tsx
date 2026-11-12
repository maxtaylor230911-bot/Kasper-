// ============================================================
// Voxelcraft — in-game HUD: crosshair, hotbar, status bars,
// item toast, hit flash, underwater tint, F3 debug overlay.
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { useUI, useSettings } from '@/state/gameStore';
import type { Engine } from '@/game/engine';
import { BLOCKS, NAME_OF } from '@/game/blocks';

function BlockIcon({ engine, id, size = 36 }: { engine: Engine | null; id: number; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!engine || !ref.current) return;
    engine.drawIcon(ref.current, id);
  }, [engine, id]);
  return <canvas ref={ref} width={40} height={40} style={{ width: size, height: size }} className="vc-icon" />;
}

interface HeartProps { fill: number } // 0..1
function Heart({ fill }: HeartProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 9 9" shapeRendering="crispEdges">
      <path d="M1 1h2v1h1V1h2v1h1v3h-1v1h-1v1H5v1H4V7H3V6H2V5H1z" fill="#3a0c0c" />
      {fill > 0 && (
        <path
          d="M1.5 1.5h1.6v1h1V1.5h1.8v1h.6v2.2h-1v1h-1v1H4v-1H3v-1H2V3.6h-.5z"
          fill="#e4322c"
          clipPath={fill < 1 ? 'inset(0 50% 0 0)' : undefined}
        />
      )}
      {fill >= 0.5 && fill < 1 && (
        <path d="M5 1.5h1v1h.6v2.2h-1v1h-1v1H5z" fill="#e4322c" opacity={0.95} />
      )}
    </svg>
  );
}

export default function Hud({ engine }: { engine: Engine | null }) {
  const screen = useUI((s) => s.screen);
  const hotbar = useUI((s) => s.hotbar);
  const selected = useUI((s) => s.selectedSlot);
  const debugOpen = useUI((s) => s.debugOpen);
  const hitFlash = useUI((s) => s.hitFlash);
  const guiScale = useSettings((s) => s.settings.guiScale);
  const [toast, setToast] = useState<string | null>(null);
  const [status, setStatus] = useState({ health: 20, air: 15, underwater: false, mode: 'creative' });
  const [debugText, setDebugText] = useState<string[]>([]);
  const [scale, setScale] = useState(1);
  const lastSelRef = useRef(-1);

  // item name toast — react to store changes via subscription
  useEffect(() => {
    let timer: number | undefined;
    const unsub = useUI.subscribe((state, prev) => {
      if (state.selectedSlot === prev.selectedSlot && state.hotbar === prev.hotbar) return;
      const id = state.hotbar[state.selectedSlot];
      if (!id) return;
      setToast(NAME_OF[id] || null);
      if (timer) clearTimeout(timer);
      timer = window.setTimeout(() => setToast(null), 1400);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, []);

  // status polling
  useEffect(() => {
    const iv = setInterval(() => {
      if (!engine) return;
      const st = engine.getPlayerState();
      setStatus({ health: st.health, air: st.air, underwater: st.underwater, mode: st.mode });
    }, 120);
    return () => clearInterval(iv);
  }, [engine]);

  // debug polling
  useEffect(() => {
    if (!debugOpen) return;
    const update = () => {
      if (!engine) return;
      const d = engine.getDebug();
      setDebugText([
        `Voxelcraft 1.0 — ${d.fps} fps`,
        `XYZ: ${d.x.toFixed(3)} / ${d.y.toFixed(3)} / ${d.z.toFixed(3)}`,
        `Block: ${Math.floor(d.x)} ${Math.floor(d.y)} ${Math.floor(d.z)}`,
        `Chunk: ${d.chunkX} ${d.chunkZ}`,
        `Facing: ${d.facing} (yaw ${Math.round(d.yaw)}° / pitch ${Math.round(d.pitch)}°)`,
        `Biome: ${d.biome}`,
        `Light (sky): ${d.lightFeet}`,
        `Day time: ${d.dayTime} ticks`,
        `Chunks: ${d.chunks}  Draw calls: ${d.drawCalls}  Tris: ${(d.tris / 1000).toFixed(0)}k`,
        `Mode: ${d.mode}${engine.player.flying ? ' (flying)' : ''}`,
        d.mem ? `Mem: ${d.mem} MB` : '',
      ].filter(Boolean));
    };
    update();
    const iv = setInterval(update, 250);
    return () => clearInterval(iv);
  }, [debugOpen, engine]);

  // gui scale
  useEffect(() => {
    const compute = () => {
      if (guiScale === 0) {
        const auto = Math.max(1, Math.min(4, Math.floor(Math.min(window.innerWidth / 320, window.innerHeight / 240))));
        setScale(auto > 2 ? 2 : auto); // cap HUD at 2x so it stays tasteful
      } else {
        setScale(Math.min(guiScale, 3));
      }
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [guiScale]);

  if (screen !== 'playing' && screen !== 'paused') return null;
  const showStatus = status.mode === 'survival';

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {status.underwater && <div className="vc-underwater" />}
      {hitFlash > 0 && <div key={hitFlash} className="vc-hitflash" />}

      <div className="vc-crosshair" />

      {/* debug overlay */}
      {debugOpen && (
        <div className="vc-debug absolute left-2 top-2 max-w-[560px] whitespace-pre-wrap text-white">
          {debugText.map((line, i) => (
            <div key={i} className="bg-black/35 px-1 inline-block">{line}</div>
          ))}
        </div>
      )}

      {/* item toast */}
      {toast && (
        <div
          className="absolute left-1/2 -translate-x-1/2 font-pixel text-white text-shadow-mc"
          style={{ bottom: `${86 * scale + 34}px`, fontSize: `${13 * scale}px` }}
        >
          {toast}
        </div>
      )}

      {/* bottom center: status + hotbar */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        style={{ bottom: 8, transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'bottom center' }}
      >
        {showStatus && (
          <div className="flex w-full flex-col gap-0.5 mb-1" style={{ width: `${9 * 48}px` }}>
            <div className="flex justify-end gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => {
                const v = status.air;
                const filled = v / 15 * 10;
                return (
                  <svg key={i} width="16" height="16" viewBox="0 0 9 9" shapeRendering="crispEdges" style={{ opacity: filled > i ? 1 : 0.25 }}>
                    <path d="M4.5 1C3 2.5 1.5 4 1.5 5.8 1.5 7.3 2.7 8.5 4.2 8.5h.6c1.5 0 2.7-1.2 2.7-2.7C7.5 4 6 2.5 4.5 1z" fill="#cfe6ff" stroke="#123" strokeWidth="0.6" />
                  </svg>
                );
              })}
            </div>
            <div className="flex justify-between gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => {
                const hp = status.health;
                const fill = Math.max(0, Math.min(1, hp / 2 - i));
                return <Heart key={i} fill={fill} />;
              })}
            </div>
          </div>
        )}
        <div className="flex gap-0.5">
          {hotbar.map((id, i) => (
            <div
              key={i}
              className={`vc-hotbar-slot ${i === selected ? 'selected' : ''}`}
              style={{ pointerEvents: 'auto', touchAction: 'none' }}
              onPointerDown={(e) => {
                e.stopPropagation();
                useUI.getState().set({ selectedSlot: i });
              }}
            >
              {id ? <BlockIcon engine={engine} id={id} /> : null}
            </div>
          ))}
        </div>
      </div>

      {/* version label */}
      <div className="absolute bottom-1 left-2 font-pixel text-[11px] text-white/80 text-shadow-mc">
        Voxelcraft 1.0
      </div>
      {status.mode === 'creative' && (
        <div className="absolute bottom-1 right-2 font-pixel text-[11px] text-white/60 text-shadow-mc">
          Creative
        </div>
      )}
    </div>
  );
}

export { BlockIcon };
export const ALL_BLOCKS = BLOCKS;
