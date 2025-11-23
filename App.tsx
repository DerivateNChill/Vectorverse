import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, RotateCcw, Crosshair, Move, Play, CheckCircle, Flame, Zap, History, Ruler, SkipForward, X, ZoomIn, ZoomOut, Lightbulb, Lock, BookOpen, Trash2, GraduationCap, ChevronDown, ChevronUp, Dices, Anchor, Link as LinkIcon, MapPin, Calculator } from 'lucide-react';
import { Button } from './components/Button';
import { LEVELS } from './levels';
import { GameVector, GameObject, LevelConfig, TutorialConfig, DiagramType } from './types';

// --- GAME CONSTANTS ---
const BASE_GRID_SCALE = 50; // Pixels per grid unit (Increased for larger look)
const PLAYER_RADIUS = 6;
const COIN_RADIUS = 8;
const MONSTER_RADIUS = 20;

// --- TYPE HELPERS ---
type FitPoint = { x: number; y: number };

type Projectile = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  id: number;
};

// --- HELPER COMPONENTS ---

// Helper to generate a, b, c ... z, a1, b1 ...
const getVectorName = (index: number) => {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const char = alphabet[index % 26];
  const suffix = Math.floor(index / 26) > 0 ? Math.floor(index / 26) : "";
  return `${char}${suffix}`;
};

// Correct math vector notation: Arrow over letter
const VectorLabel = ({ name }: { name: string }) => (
  <div className="relative inline-flex flex-col items-center justify-end leading-none mx-1 text-blue-300 font-serif italic h-6 align-bottom">
    <span className="text-[10px] absolute -top-0.5 opacity-80 not-italic font-sans">→</span>
    <span className="mt-1">{name}</span>
  </div>
);

const ColumnVector = ({ x, y, label, color, className = "" }: { x: number, y: number, label?: React.ReactNode, color?: string, className?: string }) => (
  <div className={`inline-flex items-center align-middle ${className}`}>
    {label && <span className="mr-1.5">{label}</span>}
    <div className="flex items-center">
      <span className="text-2xl font-light text-slate-500 leading-none transform scale-y-125">(</span>
      <div className="flex flex-col items-center justify-center px-1 text-sm font-bold font-mono leading-tight">
        <span className={color || "text-white"}>{Number(x).toFixed(1).replace(/\.0$/, '')}</span>
        <span className={color || "text-white"}>{Number(y).toFixed(1).replace(/\.0$/, '')}</span>
      </div>
      <span className="text-2xl font-light text-slate-500 leading-none transform scale-y-125">)</span>
    </div>
  </div>
);

// Helper component to render Latex using window.katex
const Latex = ({ children, className = "" }: { children: string, className?: string }) => {
  const [html, setHtml] = useState("");

  useEffect(() => {
    // Check if KaTeX is available in the window object
    if ((window as any).katex) {
      try {
        // renderToString is safer than render() as it avoids DOM strict mode checks (quirks mode error)
        const renderedHtml = (window as any).katex.renderToString(children, {
          throwOnError: false,
          displayMode: true
        });
        setHtml(renderedHtml);
      } catch (e) {
        console.error("KaTeX Render Error:", e);
        setHtml(children); // Fallback to raw text
      }
    } else {
      setHtml(children);
    }
  }, [children]);

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};

// --- MAIN APP ---

const App: React.FC = () => {
  // --- STATE ---
  const [levelIndex, setLevelIndex] = useState(1); // Start at level 1, 0 is sandbox
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const [vectors, setVectors] = useState<GameVector[]>([]);
  const [objects, setObjects] = useState<GameObject[]>([]);
  const [gameState, setGameState] = useState<'playing' | 'level_complete' | 'game_won'>('playing');
  const [monsterPos, setMonsterPos] = useState({ x: 0, y: 0 });
  const [ammo, setAmmo] = useState(0);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  
  // Tutorial & Cheat Sheet State
  const [showTutorial, setShowTutorial] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  
  // Canvas Size State
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  // View State (Zoom & Pan)
  const [viewState, setViewState] = useState({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
  });

  // Sandbox Mode State
  const [sandboxMode, setSandboxMode] = useState<'chain' | 'origin' | 'points' | 'parametric'>('chain');

  // Animation State
  const [coinAngle, setCoinAngle] = useState(0);

  // Vector Details Modal
  const [selectedVector, setSelectedVector] = useState<{ vec: GameVector, index: number } | null>(null);

  // Hint State
  const [hint, setHint] = useState<{active: boolean, targetX: number, targetY: number} | null>(null);

  // Inputs
  const [inputX, setInputX] = useState<string>('0');
  const [inputY, setInputY] = useState<string>('0');
  const [startInputX, setStartInputX] = useState<string>('0');
  const [startInputY, setStartInputY] = useState<string>('0');
  const [scalar, setScalar] = useState<string>('1');
  const [operation, setOperation] = useState<'add' | 'subtract'>('add');
  const [actionMode, setActionMode] = useState<'move' | 'shoot'>('move');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tutorialCanvasRef = useRef<HTMLCanvasElement>(null);
  const cheatSheetCanvasRef = useRef<HTMLCanvasElement>(null);

  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentLevel = LEVELS[levelIndex] || LEVELS[0];

  // --- RESIZE OBSERVER ---
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setCanvasSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', updateSize);
    updateSize(); // Initial

    return () => window.removeEventListener('resize', updateSize);
  }, []);


  // --- TRANSFORMATION HELPERS ---
  const worldToScreen = useCallback((wx: number, wy: number) => {
    const scale = BASE_GRID_SCALE * viewState.zoom;
    const centerX = (canvasSize.width / 2) + viewState.offsetX;
    const centerY = (canvasSize.height / 2) + viewState.offsetY;
    return {
        x: centerX + (wx * scale),
        y: centerY - (wy * scale) // Flip Y
    };
  }, [viewState, canvasSize]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const scale = BASE_GRID_SCALE * viewState.zoom;
    const centerX = (canvasSize.width / 2) + viewState.offsetX;
    const centerY = (canvasSize.height / 2) + viewState.offsetY;
    
    const wx = (sx - centerX) / scale;
    const wy = (centerY - sy) / scale; // Flip Y
    return { x: wx, y: wy };
  }, [viewState, canvasSize]);


  // --- AUTO FIT VIEW ---
  const autoFitView = useCallback(() => {
    // Collect all important points
    const points: FitPoint[] = [
      { x: 0, y: 0 }, // Origin
      { x: playerPos.x, y: playerPos.y } // Player
    ];
    
    // Add coins/objects
    objects.forEach(o => !o.collected && points.push({ x: o.x, y: o.y }));
    
    // Add vectors start/end
    vectors.forEach(v => {
      points.push({ x: v.startX, y: v.startY });
      points.push({ x: v.startX + v.x, y: v.startY + v.y });
    });
    
    // Add static visuals
    if (currentLevel.staticVisuals) {
        currentLevel.staticVisuals.forEach(sv => {
            points.push({ x: sv.x, y: sv.y });
            if (sv.type === 'line' || sv.type === 'vector') {
                // Approximate end for fit
                points.push({ x: sv.x + (sv.dx || 0), y: sv.y + (sv.dy || 0) });
            }
        });
    }

    if (currentLevel.mechanics.hasMonster) {
      points.push({ x: monsterPos.x, y: monsterPos.y });
    }

    if (points.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach((p: FitPoint) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    // Add padding (in world units) - smaller padding for "larger" view
    const padding = 1.5;
    minX -= padding; maxX += padding;
    minY -= padding; maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;
    
    // Convert canvas dimensions to world units roughly to ensure fit
    const canvasAspect = canvasSize.width / canvasSize.height;
    const worldAspect = width / height;

    // Calculate needed scale to fit
    let desiredScale;
    if (canvasAspect > worldAspect) {
        desiredScale = canvasSize.height / height;
    } else {
        desiredScale = canvasSize.width / width;
    }
    
    // Clamp zoom
    const newZoom = Math.min(Math.max(desiredScale / BASE_GRID_SCALE, 0.6), 3.0);

    // Calculate Center
    const worldCenterX = minX + width / 2;
    const worldCenterY = minY + height / 2;

    const actualScale = BASE_GRID_SCALE * newZoom;
    const newOffsetX = -worldCenterX * actualScale;
    const newOffsetY = worldCenterY * actualScale; // Y is flipped in calculation

    setViewState({
      zoom: newZoom,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0
    });
  }, [objects, vectors, playerPos, monsterPos, currentLevel, canvasSize]);

  // Trigger autofit on level load or canvas resize
  useEffect(() => {
    // Small delay to ensure container size is ready
    const timer = setTimeout(autoFitView, 50);
    return () => clearTimeout(timer);
  }, [levelIndex, canvasSize.width, canvasSize.height, autoFitView]); 


  // --- INITIALIZATION ---
  const initLevel = useCallback((idx: number) => {
    // Safety check
    if (idx < 0 || idx >= LEVELS.length) {
        setLevelIndex(1); // Default to level 1
        return;
    }

    const lvl = LEVELS[idx];
    setPlayerPos({ ...lvl.startPos });
    setVectors([]);
    setObjects(JSON.parse(JSON.stringify(lvl.objects)));
    setGameState('playing');
    setAmmo(0);
    setProjectiles([]);
    setActionMode('move');
    setHint(null);
    setOperation('add');
    setScalar('1');
    setInputX('0');
    setInputY('0');
    setStartInputX('0');
    setStartInputY('0');
    
    const boss = lvl.objects.find(o => o.type === 'monster');
    if (boss) setMonsterPos({ x: boss.x, y: boss.y });
    
    // Show tutorial if exists
    if (lvl.tutorial) {
        setShowTutorial(true);
    } else {
        setShowTutorial(false);
    }
    
  }, []);

  useEffect(() => {
    initLevel(levelIndex);
  }, [levelIndex, initLevel]);

  // Auto-scroll history
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [vectors]);

  // Trigger autofit when vector added
  useEffect(() => {
    if (vectors.length > 0) {
      autoFitView();
    }
  }, [vectors.length, autoFitView]); // Only on count change


  // --- INTERACTION HANDLERS ---
  const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const newZoom = Math.min(Math.max(0.5, viewState.zoom - e.deltaY * zoomSensitivity), 4);
      setViewState(prev => ({ ...prev, zoom: newZoom }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
     setViewState(prev => ({ 
         ...prev, 
         isDragging: true, 
         lastMouseX: e.clientX, 
         lastMouseY: e.clientY 
     }));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (viewState.isDragging) {
          const dx = e.clientX - viewState.lastMouseX;
          const dy = e.clientY - viewState.lastMouseY;
          setViewState(prev => ({
              ...prev,
              offsetX: prev.offsetX + dx,
              offsetY: prev.offsetY + dy,
              lastMouseX: e.clientX,
              lastMouseY: e.clientY
          }));
      }
  };

  const handleMouseUp = () => {
      setViewState(prev => ({ ...prev, isDragging: false }));
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
      // If dragging occurred, ignore click
      if (Math.abs(e.clientX - viewState.lastMouseX) > 5 || Math.abs(e.clientY - viewState.lastMouseY) > 5) {
          return;
      }

      // Check for Double Click logic manually if needed, or rely on onDoubleClick handler
      // This is for SANDBOX MODE click-to-add-target
      if (currentLevel.isSandbox && canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          
          const worldPos = screenToWorld(mx, my);
          const gridX = Math.round(worldPos.x);
          const gridY = Math.round(worldPos.y);

          // Add a coin there
          setObjects(prev => [
              ...prev, 
              { id: `sandbox_${Date.now()}`, x: gridX, y: gridY, type: 'coin' }
          ]);
      }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const hitIndex = vectors.findIndex(v => {
          const start = worldToScreen(v.startX, v.startY);
          const end = worldToScreen(v.startX + v.x, v.startY + v.y);
          
          const l2 = Math.pow(start.x - end.x, 2) + Math.pow(start.y - end.y, 2);
          if (l2 === 0) return false;
          let t = ((mx - start.x) * (end.x - start.x) + (my - start.y) * (end.y - start.y)) / l2;
          t = Math.max(0, Math.min(1, t));
          const projX = start.x + t * (end.x - start.x);
          const projY = start.y + t * (end.y - start.y);
          const dist = Math.sqrt(Math.pow(mx - projX, 2) + Math.pow(my - projY, 2));
          
          return dist < 10;
      });

      if (hitIndex !== -1) {
          setSelectedVector({ vec: vectors[hitIndex], index: hitIndex });
      }
  };


  // --- GAME LOOP ---
  const animate = useCallback((time: number) => {
    lastTimeRef.current = time;
    const seconds = time / 1000;

    // 1. Coin Animation
    setCoinAngle(seconds * 3); 

    if (gameState === 'playing' && !showTutorial && !showCheatSheet) {
        // 2. Monster Logic
        if (currentLevel.mechanics.hasMonster) {
            // Static Boss: Use fixed coordinates from state (set in initLevel)
            const mx = monsterPos.x;
            const my = monsterPos.y;

            // Projectiles logic
            setProjectiles(prev => {
                const next: Projectile[] = [];
                for(const p of prev) {
                   const px = p.x + p.vx * 0.1;
                   const py = p.y + p.vy * 0.1;
                   
                   // Monster Hit?
                   const dx = px - mx;
                   const dy = py - my;
                   const dist = Math.sqrt(dx*dx + dy*dy);
                   
                   if (dist < (MONSTER_RADIUS / BASE_GRID_SCALE)) {
                     handleMonsterHit();
                     continue; 
                   }

                   // Bounds check for projectiles
                   if (Math.abs(px) < 20 && Math.abs(py) < 20) {
                     next.push({ ...p, x: px, y: py });
                   }
                }
                return next;
            });
        }
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [currentLevel, gameState, monsterPos, showTutorial, showCheatSheet]); 

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [animate]);


  // --- UNIFIED DIAGRAM DRAWING (TUTORIAL & CHEAT SHEET) ---
  const drawMathDiagram = useCallback((canvas: HTMLCanvasElement | null, type: DiagramType) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const w = canvas.width;
      const h = canvas.height;
      const cx = w/2;
      const cy = h/2;
      const scale = 30;

      ctx.clearRect(0,0,w,h);
      ctx.fillStyle = '#1e293b'; // Slate 800
      ctx.fillRect(0,0,w,h);
      
      // Coordinate System small
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();

      const drawArrow = (fromX: number, fromY: number, toX: number, toY: number, color: string, dashed = false) => {
          const fx = cx + fromX * scale; const fy = cy - fromY * scale;
          const tx = cx + toX * scale; const ty = cy - toY * scale;
          const headLen = 8;
          const angle = Math.atan2(ty - fy, tx - fx);
          
          ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2;
          if(dashed) ctx.setLineDash([5,5]); else ctx.setLineDash([]);
          ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
          ctx.setLineDash([]);
          
          ctx.beginPath(); ctx.fillStyle = color;
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx - headLen * Math.cos(angle - Math.PI / 6), ty - headLen * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(tx - headLen * Math.cos(angle + Math.PI / 6), ty - headLen * Math.sin(angle + Math.PI / 6));
          ctx.fill();
      };

      const drawLabel = (text: string, x: number, y: number, color = '#fff') => {
          ctx.fillStyle = color;
          ctx.font = '12px monospace';
          ctx.fillText(text, cx + x * scale, cy - y * scale);
      };

      switch(type) {
          case 'position-vector':
              drawArrow(0,0, 3, 2, '#3b82f6');
              drawLabel('P(3|2)', 3.2, 2.2);
              drawLabel('v', 1.5, 1.2, '#3b82f6');
              break;
          case 'vector-addition':
              drawArrow(0,0, 2, 1, '#3b82f6'); // v1
              drawLabel('a', 1, 0.8, '#3b82f6');
              drawArrow(2,1, 4, 0, '#ec4899'); // v2
              drawLabel('b', 3, 0.8, '#ec4899');
              drawArrow(0,0, 4, 0, '#10b981', true); // Result
              drawLabel('a+b', 2, -0.5, '#10b981');
              break;
          case 'vector-subtraction':
              drawArrow(0,0, 3, 1, '#3b82f6'); // a
              drawLabel('a', 1.5, 0.8, '#3b82f6');
              drawArrow(3,1, 3, 3, '#94a3b8', true); // b ghost
              drawArrow(3,1, 3, -1, '#ef4444'); // -b
              drawLabel('-b', 3.2, 0, '#ef4444');
              drawArrow(0,0, 3, -1, '#10b981', true); // Result
              break;
          case 'scalar-mult':
              drawArrow(0,0, 1.5, 1, '#3b82f6');
              drawLabel('v', 0.5, 0.8, '#3b82f6');
              // Scaled version offset slightly
              drawArrow(0, -1.5, 3, -0.5, '#10b981'); // 2*v
              drawLabel('2·v', 1.5, -0.8, '#10b981');
              break;
          case 'linear-comb':
               drawArrow(0,0, 1, 1, '#3b82f6');
               drawArrow(1,1, 2, 2, '#3b82f6');
               drawArrow(2,2, 3, 2, '#ec4899');
               drawLabel('2a + b', 1.5, 1.5);
               break;
          case 'velocity':
              // Player
              ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(cx-2*scale, cy+scale, 5, 0, Math.PI*2); ctx.fill();
              // Monster
              ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(cx+2*scale, cy-scale, 8, 0, Math.PI*2); ctx.fill();
              // Shot
              drawArrow(-2, -1, 2, 1, '#facc15', true);
              drawLabel('Differenz', 0, 0, '#facc15');
              break;
          case 'unit-vector':
              ctx.beginPath(); ctx.strokeStyle = '#475569'; ctx.setLineDash([5,5]);
              ctx.arc(cx, cy, scale, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
              drawArrow(0,0, 2, 1.5, '#64748b');
              drawArrow(0,0, 0.8, 0.6, '#facc15');
              drawLabel('v₀', 1, 0.8, '#facc15');
              break;
          case 'normal-vector':
              // Line slope 0.5 (2, 1)
              ctx.beginPath(); ctx.strokeStyle = '#60a5fa'; ctx.lineWidth=2;
              const ldx = 2; const ldy = 1; const len = 3;
              ctx.moveTo(cx - ldx*len*scale, cy + ldy*len*scale); 
              ctx.lineTo(cx + ldx*len*scale, cy - ldy*len*scale); ctx.stroke();
              // Normal slope -2 (-1, 2) FIX: Visually correct orthogonality
              drawArrow(0,0, -1, 2, '#facc15');
              drawLabel('n', -1.2, 2.2, '#facc15');
              break;
          case 'dot-product':
              drawArrow(0,0, 2, 0, '#60a5fa');
              drawArrow(0,0, 1.5, 2, '#facc15');
              ctx.beginPath(); ctx.strokeStyle='#fff'; 
              ctx.arc(cx, cy, 20, 0, -1); ctx.stroke();
              drawLabel('α', 0.5, 0.5);
              break;
          case 'lines':
              ctx.beginPath(); ctx.strokeStyle = '#ef4444';
              ctx.moveTo(cx - 2*scale, cy); ctx.lineTo(cx + 2*scale, cy - 2*scale); ctx.stroke();
              ctx.beginPath(); ctx.strokeStyle = '#3b82f6';
              ctx.moveTo(cx - 1*scale, cy + 2*scale); ctx.lineTo(cx + 2*scale, cy - 1*scale); ctx.stroke();
              ctx.fillStyle='#facc15'; ctx.beginPath(); ctx.arc(cx + 0.8*scale, cy - 1.4*scale, 4, 0, Math.PI*2); ctx.fill();
              break;
          case 'distance':
              ctx.beginPath(); ctx.strokeStyle = '#94a3b8';
              ctx.moveTo(cx - 2*scale, cy+scale); ctx.lineTo(cx + 2*scale, cy+scale); ctx.stroke();
              ctx.fillStyle='#facc15'; ctx.beginPath(); ctx.arc(cx, cy-1.5*scale, 4, 0, Math.PI*2); ctx.fill();
              drawLabel('P', 0.2, 1.5);
              ctx.beginPath(); ctx.strokeStyle='#facc15'; ctx.setLineDash([3,3]);
              ctx.moveTo(cx, cy-1.5*scale); ctx.lineTo(cx, cy+scale); ctx.stroke();
              drawLabel('d', 0.2, 0, '#facc15');
              break;
      }
  }, []);

  // Update Diagram in Modal when opened
  useEffect(() => {
     if (showTutorial && currentLevel.tutorial) {
         drawMathDiagram(tutorialCanvasRef.current, currentLevel.tutorial.diagramType);
     }
  }, [showTutorial, currentLevel, drawMathDiagram]);
  
  useEffect(() => {
     if (showCheatSheet && currentLevel.eduContent) {
         // Tiny delay to ensure ref is mounted
         setTimeout(() => {
             drawMathDiagram(cheatSheetCanvasRef.current, currentLevel.eduContent!.diagramType);
         }, 50);
     }
  }, [showCheatSheet, currentLevel, drawMathDiagram]);


  // --- GAME LOGIC ---
  const handleMonsterHit = () => {
    setObjects(prev => prev.map(obj => {
      if (obj.type === 'monster' && (obj.hp || 0) > 0) {
        const newHp = (obj.hp || 0) - 1;
        if (newHp <= 0) {
            setTimeout(() => setGameState('game_won'), 500);
        }
        return { ...obj, hp: newHp };
      }
      return obj;
    }));
  };

  const checkCollisions = (currX: number, currY: number) => {
    const threshold = 0.5; 
    setObjects(prev => {
      let changed = false;
      const next = prev.map(obj => {
        if (obj.collected) return obj;
        if (obj.type === 'monster') return obj;

        const dist = Math.sqrt(Math.pow(currX - obj.x, 2) + Math.pow(currY - obj.y, 2));
        if (dist < threshold) {
          changed = true;
          if (obj.type === 'ammo') setAmmo(a => a + 1);
          return { ...obj, collected: true };
        }
        return obj;
      });

      if (changed) {
        const remainingObjective = next.filter(o => !o.collected && o.type !== 'ammo' && o.type !== 'monster');
        const monsterAlive = next.find(o => o.type === 'monster' && (o.hp || 0) > 0);
        
        if (remainingObjective.length === 0 && !monsterAlive && !currentLevel.isSandbox) {
            setTimeout(() => {
                if(levelIndex < LEVELS.length - 1) {
                    setGameState('level_complete');
                } else {
                    setGameState('game_won');
                }
            }, 500);
        }
      }
      return next;
    });
  };

  const applyVector = () => {
    // Basic Inputs
    let vxRaw = parseFloat(inputX) || 0;
    let vyRaw = parseFloat(inputY) || 0;
    let startXRaw = parseFloat(startInputX) || 0;
    let startYRaw = parseFloat(startInputY) || 0;

    const s = currentLevel.mechanics.allowScalar ? (parseFloat(scalar) || 1) : 1;
    const opMultiplier = operation === 'subtract' ? -1 : 1;
    
    // Determine actual Vector components (dx, dy) and Start Position based on Mode
    let finalVx = 0;
    let finalVy = 0;
    let finalStartX = playerPos.x;
    let finalStartY = playerPos.y;

    if (currentLevel.isSandbox) {
        if (sandboxMode === 'origin') {
            finalStartX = 0;
            finalStartY = 0;
            finalVx = vxRaw;
            finalVy = vyRaw;
        } else if (sandboxMode === 'points') {
            finalStartX = startXRaw;
            finalStartY = startYRaw;
            // Vector is B - A
            finalVx = vxRaw - startXRaw;
            finalVy = vyRaw - startYRaw;
        } else if (sandboxMode === 'parametric') {
            // p + t*u
            finalStartX = startXRaw;
            finalStartY = startYRaw;
            // Direction u is inputX/Y, parameter is scalar
            finalVx = vxRaw * s; 
            finalVy = vyRaw * s;
        } else {
            // Chain mode
            finalVx = vxRaw * s * opMultiplier;
            finalVy = vyRaw * s * opMultiplier;
        }
    } else {
        // Normal Level Logic
        if (currentLevel.mechanics.isOrtsvektorOnly) {
            finalStartX = 0;
            finalStartY = 0;
        }
        finalVx = vxRaw * s * opMultiplier;
        finalVy = vyRaw * s * opMultiplier;
    }

    if (actionMode === 'shoot' && ammo > 0) {
        setAmmo(prev => prev - 1);
        setProjectiles(prev => [...prev, {
            x: playerPos.x,
            y: playerPos.y,
            vx: finalVx,
            vy: finalVy,
            id: Date.now()
        }]);
        setHint(null);
        return;
    }

    const nextX = finalStartX + finalVx;
    const nextY = finalStartY + finalVy;

    setVectors(prev => [
        ...prev, 
        { 
            id: Date.now().toString(), 
            x: finalVx, 
            y: finalVy, 
            startX: finalStartX, 
            startY: finalStartY, 
            type: 'move', 
            isScalar: s !== 1, 
            color: operation === 'subtract' ? '#ef4444' : undefined 
        }
    ]);

    setPlayerPos({ x: nextX, y: nextY });
    checkCollisions(nextX, nextY);
    setHint(null); // Clear hint after move
  };

  const undoLast = () => {
    if (vectors.length === 0) return;
    setVectors(prev => {
        const newVectors = prev.slice(0, -1);
        
        // Where to put player?
        if (currentLevel.isSandbox && sandboxMode === 'origin') {
            // Jump to end of previous vector or 0,0
            if (newVectors.length > 0) {
                const last = newVectors[newVectors.length - 1];
                setPlayerPos({ x: last.startX + last.x, y: last.startY + last.y });
            } else {
                setPlayerPos({ x: 0, y: 0 });
            }
        } else if (currentLevel.mechanics.isOrtsvektorOnly) {
             setPlayerPos({ x: 0, y: 0 });
        } else {
            // Chain logic: Player goes back to start of deleted vector
            const lastDeleted = prev[prev.length - 1];
            setPlayerPos({ x: lastDeleted.startX, y: lastDeleted.startY });
        }
        return newVectors;
    });
    setHint(null);
  };

  const handleDeleteVector = (index: number) => {
    if (index < 0 || index >= vectors.length) return;

    // Create a copy
    const newVectors = [...vectors];
    
    // Remove the vector
    newVectors.splice(index, 1);
    
    // If it's chain mode (not OrtsvektorOnly), we need to repair the chain
    const isChainMode = !currentLevel.mechanics.isOrtsvektorOnly && !(currentLevel.isSandbox && sandboxMode !== 'chain');

    if (isChainMode) {
        let currentX = currentLevel.startPos.x;
        let currentY = currentLevel.startPos.y;
        
        for (let i = 0; i < newVectors.length; i++) {
            newVectors[i].startX = currentX;
            newVectors[i].startY = currentY;
            currentX += newVectors[i].x;
            currentY += newVectors[i].y;
        }
        
        // Update player position to end of chain
        setPlayerPos({ x: currentX, y: currentY });
    } else {
        // Origin/Discrete Mode: Just remove it. Player position might stay or reset?
        // Let's reset player to end of last vector for consistency
        if (newVectors.length > 0) {
             const last = newVectors[newVectors.length - 1];
             setPlayerPos({ x: last.startX + last.x, y: last.startY + last.y }); 
        } else {
             setPlayerPos({ x: 0, y: 0 });
        }
    }

    setVectors(newVectors);
  };

  const skipLevel = () => {
      setLevelIndex(prev => Math.min(prev + 1, LEVELS.length - 1));
      setGameState('playing');
  };

  const startSandbox = () => {
      setLevelIndex(0); // Sandbox is ID 0 in our new array
  };

  const giveHint = () => {
    // Find nearest uncollected coin
    let nearest: GameObject | null = null;
    let minDist = Infinity;
    
    objects.forEach(obj => {
        if (!obj.collected && obj.type === 'coin') {
            const dist = Math.sqrt(Math.pow(obj.x - playerPos.x, 2) + Math.pow(obj.y - playerPos.y, 2));
            if (dist < minDist) {
                minDist = dist;
                nearest = obj;
            }
        }
    });

    if (nearest) {
        let dx = nearest.x - playerPos.x;
        let dy = nearest.y - playerPos.y;
        
        const constraints = currentLevel.constraints;

        // Smart Hint: If constraints are active, adjust the suggestion
        if (constraints?.allowNegativeInput === false) {
             // If we need to go negative, user MUST use subtract
             if (dx < 0 || dy < 0) {
                 dx = Math.abs(dx);
                 dy = Math.abs(dy);
             }
        }

        if (constraints?.maxInputValue) {
            const max = Math.max(Math.abs(dx), Math.abs(dy));
            if (max > constraints.maxInputValue) {
                const factor = Math.ceil(max / constraints.maxInputValue);
                dx = dx / factor;
                dy = dy / factor;
            }
        }
        
        // If Ortsvektor level, hint is absolute coord
        if (currentLevel.mechanics.isOrtsvektorOnly) {
            setInputX(nearest.x.toString());
            setInputY(nearest.y.toString());
            setHint({ active: true, targetX: nearest.x, targetY: nearest.y });
        } else {
            // Suggest vector
            setInputX(dx.toString());
            setInputY(dy.toString());
            setHint({ active: true, targetX: nearest.x - playerPos.x, targetY: nearest.y - playerPos.y });
        }
    }
  };


  // --- CANVAS RENDER ---
  const drawArrow = (ctx: CanvasRenderingContext2D, from: {x:number, y:number}, to: {x:number, y:number}, color: string, width = 2, dashed = false) => {
    const headLen = 10;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if(dashed) ctx.setLineDash([5, 5]);
    else ctx.setLineDash([]);
    
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.setLineDash([]); // Reset

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6));
    ctx.fill();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear using dynamic dimensions
    ctx.fillStyle = '#0f172a'; 
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    const { zoom, offsetX, offsetY } = viewState;
    const currentGridScale = BASE_GRID_SCALE * zoom;
    const centerX = (canvasSize.width / 2) + offsetX;
    const centerY = (canvasSize.height / 2) + offsetY;

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    
    // Calculate visible range optimization based on dynamic size
    const startGridX = Math.floor(-centerX / currentGridScale);
    const endGridX = Math.ceil((canvasSize.width - centerX) / currentGridScale);
    const topWorldY = Math.ceil(centerY / currentGridScale);
    const bottomWorldY = Math.floor((centerY - canvasSize.height) / currentGridScale);

    // Verticals
    for (let i = startGridX; i <= endGridX; i++) {
        const x = centerX + i * currentGridScale;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasSize.height); ctx.stroke();
    }
    // Horizontals
    for (let i = bottomWorldY; i <= topWorldY; i++) {
         const y = centerY - i * currentGridScale;
         ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasSize.width, y); ctx.stroke();
    }

    // AXES
    ctx.strokeStyle = '#64748b'; // Updated for better visibility
    ctx.lineWidth = 2; // Slightly thicker
    ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(canvasSize.width, centerY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(centerX, 0); ctx.lineTo(centerX, canvasSize.height); ctx.stroke();

    // TICKS & LABELS - UPDATED
    ctx.fillStyle = '#cbd5e1'; // Brighter Text
    ctx.strokeStyle = '#94a3b8'; 
    ctx.font = '600 13px "Inter", sans-serif'; // Larger, bold sans-serif
    
    for (let i = startGridX; i <= endGridX; i++) {
        if (i === 0) continue; 
        const x = centerX + i * currentGridScale;
        // Draw tick
        ctx.beginPath(); ctx.moveTo(x, centerY - 5); ctx.lineTo(x, centerY + 5); ctx.stroke();
        
        // Draw Text
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(i.toString(), x, centerY + 10); // More spacing
    }
    for (let i = bottomWorldY; i <= topWorldY; i++) {
        if (i === 0) continue;
        const y = centerY - i * currentGridScale;
        // Draw tick
        ctx.beginPath(); ctx.moveTo(centerX - 5, y); ctx.lineTo(centerX + 5, y); ctx.stroke();
        
        // Draw Text
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(i.toString(), centerX - 12, y); // More spacing
    }

    // Labels
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText("x", canvasSize.width - 25, centerY - 25);
    ctx.fillText("y", centerX + 25, 25);

    // --- STATIC VISUALS (Lines, Points) ---
    if (currentLevel.staticVisuals) {
        currentLevel.staticVisuals.forEach(vis => {
            const start = worldToScreen(vis.x, vis.y);
            
            if (vis.type === 'line' && vis.dx !== undefined && vis.dy !== undefined) {
                const far = 100;
                const p1 = worldToScreen(vis.x - vis.dx*far, vis.y - vis.dy*far);
                const p2 = worldToScreen(vis.x + vis.dx*far, vis.y + vis.dy*far);
                
                ctx.beginPath(); 
                ctx.strokeStyle = vis.color || '#fff';
                ctx.lineWidth = 1.5;
                if(vis.dashed) ctx.setLineDash([5,5]);
                ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); 
                ctx.stroke(); ctx.setLineDash([]);
                
                ctx.fillStyle = vis.color || '#fff';
                ctx.fillText(vis.label || '', start.x + 10, start.y - 10);
            }
            else if (vis.type === 'vector' && vis.dx !== undefined && vis.dy !== undefined) {
                 const end = worldToScreen(vis.x + vis.dx, vis.y + vis.dy);
                 drawArrow(ctx, start, end, vis.color || '#fff', 2, vis.dashed);
                 if (vis.label) {
                     ctx.fillStyle = vis.color || '#fff';
                     ctx.fillText(vis.label, (start.x + end.x)/2, (start.y + end.y)/2 - 10);
                 }
            }
            else if (vis.type === 'point') {
                 ctx.beginPath(); ctx.fillStyle = vis.color || '#fff';
                 ctx.arc(start.x, start.y, 4, 0, Math.PI*2); ctx.fill();
                 if (vis.label) {
                     ctx.fillStyle = vis.color || '#fff';
                     ctx.fillText(vis.label, start.x + 8, start.y - 8);
                 }
            }
        });
    }

    // --- GAME OBJECTS ---
    objects.forEach(obj => {
        if (obj.collected) return;
        const pos = worldToScreen(obj.x, obj.y);

        if (obj.type === 'coin') {
            const widthScale = Math.abs(Math.cos(coinAngle)); 
            ctx.beginPath();
            ctx.fillStyle = '#fbbf24'; 
            ctx.ellipse(pos.x, pos.y, COIN_RADIUS * widthScale, COIN_RADIUS, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1; ctx.stroke();
            // Shine
            ctx.beginPath(); ctx.fillStyle = '#fcd34d';
            ctx.ellipse(pos.x, pos.y, COIN_RADIUS * 0.6 * widthScale, COIN_RADIUS * 0.6, 0, 0, Math.PI * 2); ctx.fill();

        } else if (obj.type === 'ammo') {
            ctx.beginPath(); ctx.fillStyle = '#3b82f6'; ctx.arc(pos.x, pos.y, COIN_RADIUS, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = '12px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText("⚡", pos.x, pos.y);
            
        } else if (obj.type === 'monster') {
            const mx = currentLevel.mechanics.hasMonster ? monsterPos.x : obj.x;
            const my = currentLevel.mechanics.hasMonster ? monsterPos.y : obj.y;
            const mPos = worldToScreen(mx, my);
            
            ctx.beginPath(); ctx.fillStyle = '#ef4444'; ctx.arc(mPos.x, mPos.y, MONSTER_RADIUS, 0, Math.PI * 2); ctx.fill();
            // Face
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(mPos.x - 7, mPos.y - 5, 5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(mPos.x + 7, mPos.y - 5, 5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(mPos.x - 7, mPos.y - 5, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(mPos.x + 7, mPos.y - 5, 2, 0, Math.PI*2); ctx.fill();
            // HP
            if (obj.maxHp) {
                const w = 40; const h = 6;
                ctx.fillStyle = '#334155'; ctx.fillRect(mPos.x - w/2, mPos.y - 35, w, h);
                const hpPct = (obj.hp || 0) / obj.maxHp;
                ctx.fillStyle = '#22c55e'; ctx.fillRect(mPos.x - w/2, mPos.y - 35, w * hpPct, h);
            }
        }
    });

    // --- VECTORS ---
    vectors.forEach((v, index) => {
      const isLast = index === vectors.length - 1;
      const color = v.color || (isLast ? '#34d399' : '#10b981');
      const width = isLast ? 3 : 2;
      const start = worldToScreen(v.startX, v.startY);
      const end = worldToScreen(v.startX + v.x, v.startY + v.y);
      const renderColor = (!isLast && !currentLevel.mechanics.isOrtsvektorOnly && !(currentLevel.isSandbox && sandboxMode !== 'chain')) ? '#0f766e' : color; 
      drawArrow(ctx, start, end, renderColor, width);
    });

    // --- HINT ---
    if (hint && hint.active) {
        const start = worldToScreen(playerPos.x, playerPos.y);
        let end;
        if (currentLevel.mechanics.isOrtsvektorOnly || (currentLevel.isSandbox && sandboxMode === 'origin')) {
             end = worldToScreen(hint.targetX, hint.targetY);
             const origin = worldToScreen(0, 0);
             drawArrow(ctx, origin, end, 'rgba(255, 255, 255, 0.5)', 2, true);
        } else {
             end = worldToScreen(playerPos.x + hint.targetX, playerPos.y + hint.targetY);
             drawArrow(ctx, start, end, 'rgba(255, 255, 255, 0.5)', 2, true);
        }
    }

    // --- PROJECTILES ---
    projectiles.forEach(p => {
        const pos = worldToScreen(p.x, p.y);
        ctx.beginPath(); ctx.fillStyle = '#60a5fa'; ctx.arc(pos.x, pos.y, 4, 0, Math.PI*2); ctx.fill();
    });

    // --- PLAYER ---
    const pPos = worldToScreen(playerPos.x, playerPos.y);
    ctx.beginPath(); ctx.fillStyle = '#3b82f6'; ctx.shadowBlur = 10; ctx.shadowColor = '#3b82f6';
    ctx.arc(pPos.x, pPos.y, PLAYER_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;

  }, [playerPos, vectors, objects, monsterPos, projectiles, currentLevel, viewState, coinAngle, worldToScreen, hint, canvasSize, sandboxMode]);


  // --- UI ---
  const renderHistory = () => (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 mb-4 flex-1 overflow-hidden flex flex-col min-h-[150px]">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <History size={14} /> Vektor Protokoll
          </h3>
          <div className="overflow-y-auto space-y-2 pr-2 custom-scrollbar" ref={scrollRef}>
              {vectors.length === 0 && <p className="text-slate-600 text-xs italic text-center py-4">Noch keine Vektoren.</p>}
              {vectors.map((v, i) => {
                  const length = Math.sqrt(v.x*v.x + v.y*v.y).toFixed(2);
                  const endX = v.startX + v.x;
                  const endY = v.startY + v.y;
                  const name = getVectorName(i);
                  
                  return (
                      <div key={i} className="bg-slate-800/50 rounded p-3 text-sm border border-slate-700 flex flex-col gap-2 group hover:bg-slate-800 transition relative pr-8">
                          {/* DELETE BUTTON */}
                          <button 
                             onClick={() => handleDeleteVector(i)}
                             className="absolute top-2 right-2 text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition"
                             title="Diesen Vektor entfernen"
                          >
                             <Trash2 size={14} />
                          </button>
                      
                          <div className="flex items-center justify-start flex-wrap gap-2 text-slate-300">
                             <div className="flex items-center">
                               <ColumnVector x={v.startX} y={v.startY} label={i === 0 ? "Start" : undefined} color="text-slate-400" />
                               <span className="mx-1 text-slate-500 font-bold">{v.color === '#ef4444' ? '-' : '+'}</span>
                               <ColumnVector x={Math.abs(v.x)} y={Math.abs(v.y)} label={<VectorLabel name={name} />} color="text-blue-300" />
                               <span className="mx-1 text-slate-500 font-bold">=</span>
                               <ColumnVector x={endX} y={endY} color="text-emerald-400" />
                             </div>
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-700/50 pt-1 mt-1">
                              <span className="text-xs text-slate-500 font-mono">Schritt {i+1}</span>
                              <div className="flex items-center gap-1 text-slate-400 font-mono text-xs bg-slate-900/50 px-1.5 py-0.5 rounded cursor-help" title="Länge">
                                  <Ruler size={10} /> 
                                  <span className="italic">|{name}|</span>
                                  <span>= {length}</span>
                              </div>
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-slate-200">
      
      {/* LEFT: Game Area (Full responsive container) */}
      <div ref={containerRef} className="flex-1 bg-slate-950 relative overflow-hidden h-[60vh] md:h-screen">
             <canvas 
                ref={canvasRef} 
                width={canvasSize.width} 
                height={canvasSize.height}
                onClick={handleCanvasClick}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDoubleClick={handleDoubleClick}
                className="absolute inset-0 bg-[#0f172a] cursor-crosshair block"
             />
             
             {/* TOP LEFT BUTTONS (Cheat Sheet) */}
             {currentLevel.eduContent && (
                 <div className="absolute top-4 left-4 z-10 animate-fade-in-down flex flex-col gap-2">
                     <Button 
                        onClick={() => setShowCheatSheet(true)} 
                        variant="secondary" 
                        className="bg-slate-900/80 backdrop-blur border-blue-500/30 text-blue-300 shadow-xl"
                     >
                         <GraduationCap size={18} /> Mathe-Spicker
                     </Button>
                     {currentLevel.isSandbox && (
                         <div className="text-emerald-400 text-xs bg-slate-900/80 px-3 py-1 rounded backdrop-blur border border-emerald-500/30 flex items-center gap-2">
                            <Dices size={12}/> Freies Spiel
                         </div>
                     )}
                 </div>
             )}
             
             {/* Canvas Controls */}
             <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                 <button onClick={() => setViewState(v => ({...v, zoom: Math.min(v.zoom + 0.2, 4)}))} className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-white backdrop-blur"><ZoomIn size={16} /></button>
                 <button onClick={() => setViewState(v => ({...v, zoom: Math.max(v.zoom - 0.2, 0.5)}))} className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-white backdrop-blur"><ZoomOut size={16} /></button>
                 <button onClick={autoFitView} className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-white backdrop-blur" title="Auto Fit"><Move size={16} /></button>
                 <button onClick={() => setViewState(v => ({...v, zoom: 1, offsetX: 0, offsetY: 0}))} className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-white backdrop-blur" title="Reset View"><RotateCcw size={16} /></button>
             </div>

             <div className="absolute bottom-2 left-2 text-[10px] text-slate-500 pointer-events-none bg-slate-900/50 px-2 py-1 rounded z-10">
                 Double-click a vector for details • Wheel to Zoom • Drag to Pan {currentLevel.isSandbox && "• Click to place Target"}
             </div>
         
         {/* TUTORIAL MODAL (Start of Level) */}
         {showTutorial && currentLevel.tutorial && (
             <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-40 p-4">
                 <div className="bg-slate-800 rounded-2xl border border-blue-500/50 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in-up">
                      <div className="bg-slate-900/50 p-4 border-b border-slate-700 flex justify-between items-center">
                          <h2 className="text-xl font-bold text-white flex items-center gap-2"><BookOpen className="text-blue-400" /> {currentLevel.tutorial.title}</h2>
                      </div>
                      <div className="p-6">
                          <p className="text-slate-300 mb-6 leading-relaxed">{currentLevel.tutorial.text}</p>
                          
                          <div className="flex gap-4 items-center justify-center bg-slate-900 rounded-xl p-4 mb-6">
                              <canvas ref={tutorialCanvasRef} width={200} height={150} className="bg-slate-900 rounded-lg" />
                              <div className="text-sm font-mono text-blue-300 space-y-2">
                                  {currentLevel.tutorial.variables.map((v,i) => (
                                      <div key={i} className="bg-slate-800 px-2 py-1 rounded">{v}</div>
                                  ))}
                              </div>
                          </div>

                          <Button onClick={() => setShowTutorial(false)} fullWidth>
                              Verstanden, los geht's! <Play size={18} />
                          </Button>
                      </div>
                 </div>
             </div>
         )}
         
         {/* CHEAT SHEET MODAL (On Demand) */}
         {showCheatSheet && currentLevel.eduContent && (
             <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShowCheatSheet(false)}>
                 <div className="bg-slate-800 rounded-2xl border border-indigo-500/50 shadow-2xl max-w-2xl w-full overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                      <div className="bg-indigo-900/30 p-4 border-b border-indigo-500/30 flex justify-between items-center">
                          <h2 className="text-2xl font-bold text-indigo-300 flex items-center gap-3"><GraduationCap size={28} /> {currentLevel.eduContent.concept}</h2>
                          <button onClick={() => setShowCheatSheet(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
                      </div>
                      <div className="p-8 grid md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                              <p className="text-slate-200 text-lg leading-relaxed whitespace-pre-wrap">{currentLevel.eduContent.explanation}</p>
                              
                              {currentLevel.eduContent.formula && (
                                  <div className="bg-slate-950 p-4 rounded-lg border-l-4 border-emerald-500 overflow-x-auto">
                                      <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Formel</p>
                                      <Latex className="text-emerald-400 text-lg">{currentLevel.eduContent.formula}</Latex>
                                  </div>
                              )}
                              
                              {currentLevel.eduContent.example && (
                                  <div className="text-slate-400 italic bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                                      <span className="font-bold text-indigo-400 not-italic mr-2">Beispiel:</span>
                                      {currentLevel.eduContent.example}
                                  </div>
                              )}
                          </div>
                          
                          <div className="flex flex-col items-center justify-center bg-slate-900 rounded-xl p-4 border border-slate-700">
                               <canvas ref={cheatSheetCanvasRef} width={280} height={200} className="rounded-lg mb-2" />
                               <p className="text-xs text-slate-500 mt-2">Grafische Veranschaulichung</p>
                          </div>
                      </div>
                      <div className="p-4 bg-slate-900/30 border-t border-slate-800 flex justify-end">
                          <Button onClick={() => setShowCheatSheet(false)}>Schließen</Button>
                      </div>
                 </div>
             </div>
         )}

         {gameState === 'level_complete' && (
             <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-20">
                 <div className="bg-slate-800 p-8 rounded-2xl border border-emerald-500/50 shadow-2xl text-center max-w-sm animate-fade-in-up">
                     <CheckCircle size={64} className="mx-auto text-emerald-500 mb-4" />
                     <h2 className="text-3xl font-bold text-white mb-2">Level geschafft!</h2>
                     <Button onClick={() => setLevelIndex(l => l + 1)} fullWidth>Nächstes Level <Play size={18} /></Button>
                 </div>
             </div>
         )}
         
         {/* Vector Details Modal */}
         {selectedVector && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30" onClick={() => setSelectedVector(null)}>
                <div className="bg-slate-900 p-6 rounded-xl border border-blue-500/50 shadow-2xl max-w-sm w-full relative" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setSelectedVector(null)} className="absolute top-3 right-3 text-slate-500 hover:text-white"><X size={20} /></button>
                    <h3 className="text-lg font-bold text-blue-300 mb-4 flex items-center gap-2"><Ruler size={18} /> Vektor Details</h3>
                    <div className="space-y-4">
                        <div className="bg-slate-800 p-4 rounded-lg flex justify-center">
                            <ColumnVector x={selectedVector.vec.x} y={selectedVector.vec.y} label={<VectorLabel name={getVectorName(selectedVector.index)} />} color="text-white text-xl" />
                        </div>
                        <div className="text-sm text-slate-300 space-y-2 font-mono">
                            <p className="border-b border-slate-700 pb-2">Längenberechnung (Pythagoras):</p>
                            <p>|{getVectorName(selectedVector.index)}| = √(x² + y²)</p>
                            <p>|{getVectorName(selectedVector.index)}| = √({selectedVector.vec.x.toFixed(1)}² + {selectedVector.vec.y.toFixed(1)}²)</p>
                            <p className="text-emerald-400 font-bold text-lg pt-1">|{getVectorName(selectedVector.index)}| = {Math.sqrt(selectedVector.vec.x**2 + selectedVector.vec.y**2).toFixed(2)} LE</p>
                        </div>
                    </div>
                </div>
            </div>
         )}
      </div>

      {/* RIGHT: UI Panel */}
      <div className="w-full md:w-[400px] bg-slate-950 border-l border-slate-800 p-6 flex flex-col h-[40vh] md:h-screen overflow-y-auto z-10 shadow-xl">
         <div className="flex items-center justify-between mb-6">
             <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">VectorVerse</h1>
             <div className="flex gap-2">
               <button onClick={startSandbox} className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 p-2 rounded-lg transition" title="Freies Spiel (Sandbox)">
                  <Dices size={18} />
               </button>
               <button onClick={giveHint} className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 p-2 rounded-lg transition" title="Tipp anzeigen">
                  <Lightbulb size={18} />
               </button>
               <button onClick={skipLevel} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 px-3 py-1 rounded-full flex items-center gap-1 transition">Skip <SkipForward size={12} /></button>
             </div>
         </div>

         <div className="mb-4 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
             <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mission</span>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-full border border-slate-700">
                    {currentLevel.isSandbox ? "Sandbox" : `Level ${levelIndex}/${LEVELS.length-1}`}
                </span>
             </div>
             <h2 className="text-xl font-bold text-slate-100 mb-1">{currentLevel.title}</h2>
             <p className="text-slate-400 text-sm mb-3">{currentLevel.description}</p>
             <div className="text-xs text-blue-400 bg-blue-400/10 p-2 rounded border border-blue-400/20">
                <span className="font-bold mr-1">Tipp:</span>{currentLevel.hint}
             </div>
             
             {/* Constraint Warnings */}
             {currentLevel.constraints?.allowNegativeInput === false && (
                 <div className="mt-2 text-xs text-amber-500 flex items-center gap-1">
                     <Lock size={10} /> Negative Eingaben gesperrt. Nutze Subtraktion!
                 </div>
             )}
             {currentLevel.constraints?.maxInputValue && (
                 <div className="mt-2 text-xs text-amber-500 flex items-center gap-1">
                     <Lock size={10} /> Eingabe max. {currentLevel.constraints.maxInputValue}. Nutze Skalare!
                 </div>
             )}
         </div>

         {renderHistory()}

         <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            {/* SANDBOX MODE TOGGLES */}
            {currentLevel.isSandbox && (
               <div className="grid grid-cols-4 gap-1 mb-4 p-1 bg-slate-900 rounded-lg">
                   <button onClick={() => setSandboxMode('chain')} title="Vektorkette" className={`py-1.5 rounded flex items-center justify-center transition ${sandboxMode === 'chain' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><LinkIcon size={14} /></button>
                   <button onClick={() => setSandboxMode('origin')} title="Ortsvektor" className={`py-1.5 rounded flex items-center justify-center transition ${sandboxMode === 'origin' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><Anchor size={14} /></button>
                   <button onClick={() => setSandboxMode('points')} title="2 Punkte" className={`py-1.5 rounded flex items-center justify-center transition ${sandboxMode === 'points' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><MapPin size={14} /></button>
                   <button onClick={() => setSandboxMode('parametric')} title="Parameterform" className={`py-1.5 rounded flex items-center justify-center transition ${sandboxMode === 'parametric' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><Calculator size={14} /></button>
               </div>
            )}

            {currentLevel.mechanics.hasMonster && ammo > 0 && (
                <div className="flex gap-2 mb-4 p-1 bg-slate-900 rounded-lg">
                    <button onClick={() => setActionMode('move')} className={`flex-1 py-2 rounded flex items-center justify-center gap-2 text-sm font-bold transition ${actionMode === 'move' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}><Move size={16} /> Bewegen</button>
                    <button onClick={() => setActionMode('shoot')} className={`flex-1 py-2 rounded flex items-center justify-center gap-2 text-sm font-bold transition ${actionMode === 'shoot' ? 'bg-red-500 text-white' : 'text-slate-500'}`}><Crosshair size={16} /> Schießen</button>
                </div>
            )}

            {currentLevel.mechanics.allowSubtract && !currentLevel.isSandbox && (
                <div className="flex mb-4 gap-2">
                    <button onClick={() => setOperation('add')} className={`flex-1 py-2 text-sm rounded border transition ${operation === 'add' ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-slate-600 text-slate-400'}`}>+ Addieren</button>
                    <button onClick={() => setOperation('subtract')} className={`flex-1 py-2 text-sm rounded border transition ${operation === 'subtract' ? 'bg-red-500 border-red-400 text-white' : 'border-slate-600 text-slate-400'}`}>- Subtrahieren</button>
                </div>
            )}

            {/* PARAMETRIC & 2-POINTS EXTRA INPUTS */}
            {currentLevel.isSandbox && (sandboxMode === 'points' || sandboxMode === 'parametric') && (
                 <div className="grid grid-cols-2 gap-4 mb-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                    <div className="col-span-2 text-xs font-bold text-indigo-400 mb-1">
                        {sandboxMode === 'points' ? 'Startpunkt A' : 'Stützvektor p'}
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 block mb-1 text-center italic">x</label>
                        <input type="number" value={startInputX} onChange={e => setStartInputX(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-center text-white font-mono focus:border-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 block mb-1 text-center italic">y</label>
                        <input type="number" value={startInputY} onChange={e => setStartInputY(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-center text-white font-mono focus:border-indigo-500 outline-none" />
                    </div>
                 </div>
            )}

            {currentLevel.mechanics.allowScalar && (
                <div className="mb-4">
                <label className="text-xs text-slate-400 block mb-1">
                    {sandboxMode === 'parametric' ? 'Parameter (t)' : 'Skalarfaktor (λ)'}
                </label>
                <input type="number" value={scalar} onChange={e => setScalar(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white font-mono focus:border-blue-500 outline-none" />
                </div>
            )}

            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                 <div className="text-xs font-bold text-blue-400 mb-2">
                     {sandboxMode === 'points' ? 'Endpunkt B' : sandboxMode === 'parametric' ? 'Richtungsvektor u' : 'Vektor v'}
                 </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="text-xs text-slate-400 block mb-1 text-center font-serif italic">x</label>
                    <input 
                        type="number" 
                        value={inputX} 
                        min={currentLevel.constraints?.allowNegativeInput === false ? 0 : undefined}
                        max={currentLevel.constraints?.maxInputValue}
                        onChange={e => {
                            let val = e.target.value;
                            if (currentLevel.constraints?.allowNegativeInput === false && parseFloat(val) < 0) return;
                            if (currentLevel.constraints?.maxInputValue && parseFloat(val) > currentLevel.constraints.maxInputValue) return;
                            setInputX(val);
                        }} 
                        className="w-full bg-slate-950 border border-slate-600 rounded p-3 text-center text-xl font-mono text-white focus:border-blue-500 outline-none" 
                    />
                    </div>
                    <div>
                    <label className="text-xs text-slate-400 block mb-1 text-center font-serif italic">y</label>
                    <input 
                        type="number" 
                        value={inputY} 
                        min={currentLevel.constraints?.allowNegativeInput === false ? 0 : undefined}
                        max={currentLevel.constraints?.maxInputValue}
                        onChange={e => {
                            let val = e.target.value;
                            if (currentLevel.constraints?.allowNegativeInput === false && parseFloat(val) < 0) return;
                            if (currentLevel.constraints?.maxInputValue && parseFloat(val) > currentLevel.constraints.maxInputValue) return;
                            setInputY(val);
                        }} 
                        className="w-full bg-slate-950 border border-slate-600 rounded p-3 text-center text-xl font-mono text-white focus:border-blue-500 outline-none" 
                    />
                    </div>
                </div>
            </div>

            {/* LIVE PREVIEW FOR PARAMETRIC */}
            {currentLevel.isSandbox && sandboxMode === 'parametric' && (
                <div className="mt-3 bg-slate-950 p-2 rounded border border-slate-800 overflow-x-auto">
                    <Latex className="text-xs text-slate-400">{`g: \\vec{x} = \\begin{pmatrix} ${startInputX} \\\\ ${startInputY} \\end{pmatrix} + t \\cdot \\begin{pmatrix} ${inputX} \\\\ ${inputY} \\end{pmatrix}`}</Latex>
                </div>
            )}
             {currentLevel.isSandbox && sandboxMode === 'points' && (
                <div className="mt-3 bg-slate-950 p-2 rounded border border-slate-800 overflow-x-auto">
                    <Latex className="text-xs text-slate-400">{`\\vec{AB} = \\vec{B} - \\vec{A} = \\begin{pmatrix} ${inputX} \\\\ ${inputY} \\end{pmatrix} - \\begin{pmatrix} ${startInputX} \\\\ ${startInputY} \\end{pmatrix}`}</Latex>
                </div>
            )}

            <Button onClick={applyVector} fullWidth variant={actionMode === 'shoot' ? 'danger' : 'primary'} className="mt-4">
                {actionMode === 'shoot' ? 'Feuer!' : 'Anwenden'} <ArrowRight size={18} />
            </Button>
            
            <button onClick={undoLast} disabled={vectors.length === 0} className="w-full mt-2 text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed text-xs py-2 flex items-center justify-center gap-2">
                <RotateCcw size={12} /> Schritt rückgängig
            </button>
         </div>

         <div className="mt-4 bg-slate-800/50 p-3 rounded-lg flex justify-between items-center text-xs text-slate-400">
             <span>Position: <span className="text-blue-300 font-mono ml-1">({playerPos.x.toFixed(1)} | {playerPos.y.toFixed(1)})</span></span>
             {currentLevel.mechanics.hasMonster && <span className="flex items-center gap-1 text-yellow-400"><Zap size={12}/> {ammo}</span>}
         </div>
      </div>
    </div>
  );
};

export default App;