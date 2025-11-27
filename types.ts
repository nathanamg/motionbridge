
export type PropertyType = 'opacity' | 'scale' | 'x' | 'y' | 'rotate' | 'json' | 'video' | 'custom';

export interface AnimatedProperty {
  id: string;
  type: PropertyType;
  customName?: string; // For custom property type
  from: number;
  to: number;
  assetName?: string; // For json/video
  note?: string; // Remarks
  delay: number; // Start Time
  duration: number; // Duration
  bezier: [number, number, number, number]; // x1, y1, x2, y2
}

export interface AnimationTrack {
  id: string;
  name: string; // The Object Name (e.g. "Button Container")
  properties: AnimatedProperty[];
}

export interface AnimationGroup {
  id: string;
  name: string;
  tracks: AnimationTrack[];
}

export interface ProjectState {
  groups: AnimationGroup[];
  activeGroupId: string;
}

// Added missing types for geminiService and CodeBlock
export type PropertyTrack = AnimatedProperty;

export interface AnimationSpec {
  tracks: PropertyTrack[];
}

export type CodeFormat = 'css' | 'tailwind' | 'framer';

export interface AnimationState {
  opacity: number;
  scale: number;
  x: number;
  y: number;
  rotate: number;
}

export interface AnimationParams {
  initial: AnimationState;
  target: AnimationState;
  duration: number;
  delay: number;
  bezier: [number, number, number, number];
}

export const PROPERTY_LABELS: Record<PropertyType, string> = {
  opacity: '不透明度 (Opacity)',
  scale: '缩放 (Scale)',
  x: '水平位移 (X)',
  y: '垂直位移 (Y)',
  rotate: '旋转 (Rotation)',
  json: 'Lottie (JSON)',
  video: '视频 (Video)',
  custom: '自定义 (Custom)',
};

export const getPropertyTimes = (prop: AnimatedProperty) => ({
  start: prop.delay,
  end: prop.delay + prop.duration
});

export const DEFAULT_PROPERTY: Omit<AnimatedProperty, 'id'> = {
  type: 'opacity',
  from: 0,
  to: 1,
  delay: 0,
  duration: 400,
  bezier: [0.25, 0.1, 0.25, 1.0]
};

export const DEFAULT_PROJECT: ProjectState = {
  activeGroupId: 'group-1',
  groups: [
    {
      id: 'group-1',
      name: '组件入场 (Entrance)',
      tracks: [
        {
          id: 'track-1',
          name: '整体容器 (Container)',
          properties: [
            {
              id: 'p1',
              type: 'opacity',
              from: 0,
              to: 1,
              delay: 0,
              duration: 400,
              bezier: [0.25, 0.1, 0.25, 1.0]
            },
            {
              id: 'p2',
              type: 'y',
              from: 20,
              to: 0,
              delay: 0,
              duration: 600,
              bezier: [0.34, 1.56, 0.64, 1.0]
            }
          ]
        }
      ]
    }
  ]
};