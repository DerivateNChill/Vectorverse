export interface Vector {
  x: number;
  y: number;
}

export interface GameVector extends Vector {
  id: string;
  type: 'move' | 'shoot';
  startX: number;
  startY: number;
  color?: string;
  isScalar?: boolean;
}

export interface GameObject {
  id: string;
  x: number;
  y: number;
  type: 'coin' | 'ammo' | 'monster';
  collected?: boolean;
  hp?: number; // For monster
  maxHp?: number;
}

export type StaticVisualType = 'vector' | 'line' | 'point' | 'label';

export interface StaticVisual {
  type: StaticVisualType;
  x: number;
  y: number;
  dx?: number; // For vectors/lines
  dy?: number; // For vectors/lines
  color?: string;
  label?: string;
  dashed?: boolean;
}

export type DiagramType = 
  | 'position-vector' 
  | 'vector-addition' 
  | 'vector-subtraction' 
  | 'scalar-mult' 
  | 'linear-comb' 
  | 'velocity'
  | 'unit-vector' 
  | 'normal-vector' 
  | 'dot-product' 
  | 'lines' 
  | 'distance';

export interface TutorialConfig {
  title: string;
  text: string;
  variables: string[]; // e.g. ["v = (vx, vy)", "|v| = Länge"]
  diagramType: DiagramType;
}

export interface EducationalContent {
  concept: string; 
  explanation: string;
  formula?: string;
  example?: string;
  diagramType: DiagramType;
}

export interface LevelConfig {
  id: number;
  title: string;
  description: string;
  hint: string; // "Teacher's note" displayed in UI
  mechanics: {
    allowAdd: boolean;
    allowSubtract: boolean;
    allowScalar: boolean;
    isOrtsvektorOnly: boolean; // Level 1 specific
    hasMonster: boolean;
  };
  constraints?: {
    allowNegativeInput?: boolean; // If false, user cannot type negative numbers (forces subtraction mode)
    maxInputValue?: number;       // If set, user cannot type numbers larger than this (forces scalar)
  };
  startPos: Vector;
  objects: GameObject[];
  staticVisuals?: StaticVisual[]; // Things drawn on canvas that aren't the player
  tutorial?: TutorialConfig; // Shows before level starts
  eduContent?: EducationalContent; // Collapsible explanation block
  isSandbox?: boolean; // New flag for Sandbox mode
}

export interface GameConfig {
  category: string;
  difficulty: string;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  text: string;
  isError?: boolean;
}