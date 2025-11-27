
import { GoogleGenAI, Type } from "@google/genai";
import { AnimationSpec, PropertyTrack } from "../types";

export const generateAnimationFromPrompt = async (prompt: string): Promise<AnimationSpec> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `你是动效设计专家。请根据用户的描述生成一份详细的动效参数交付文档。
    
    用户描述: "${prompt}"
    
    目标：生成一个包含多个独立属性轨道的列表。每个属性（如不透明度、位移、缩放）都可以有独立的持续时间、延迟和缓动曲线。
    
    规则：
    1. 分析描述中隐含的物理运动。例如"弹跳出现"通常意味着Scale有弹性的曲线，Opacity则是线性的。
    2. 如果描述了先后顺序（例如"先移动，再淡出"），请利用 'delay' 参数来实现错帧。
    3. 支持的属性类型 (type): 'opacity', 'scale', 'x' (水平位移px), 'y' (垂直位移px), 'rotate' (旋转deg)。
    4. bezier: 使用4个数字的数组 [x1, y1, x2, y2]。
       - 常用: Ease [0.25, 0.1, 0.25, 1.0]
       - 弹性: [0.34, 1.56, 0.64, 1.0]
    5. 时间单位为毫秒 (ms)。
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tracks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['opacity', 'scale', 'x', 'y', 'rotate'] },
                from: { type: Type.NUMBER },
                to: { type: Type.NUMBER },
                delay: { type: Type.INTEGER },
                duration: { type: Type.INTEGER },
                bezierX1: { type: Type.NUMBER },
                bezierY1: { type: Type.NUMBER },
                bezierX2: { type: Type.NUMBER },
                bezierY2: { type: Type.NUMBER },
              },
              required: ["type", "from", "to", "delay", "duration", "bezierX1", "bezierY1", "bezierX2", "bezierY2"]
            }
          }
        },
        required: ["tracks"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");

  const data = JSON.parse(text);

  const tracks: PropertyTrack[] = data.tracks.map((t: any, index: number) => ({
    id: `ai-${Date.now()}-${index}`,
    type: t.type,
    from: t.from,
    to: t.to,
    delay: t.delay,
    duration: t.duration,
    bezier: [t.bezierX1, t.bezierY1, t.bezierX2, t.bezierY2]
  }));

  return { tracks };
};
