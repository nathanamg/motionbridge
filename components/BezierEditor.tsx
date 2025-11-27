import React, { useState, useRef, useEffect, useCallback } from 'react';

interface BezierEditorProps {
  value: [number, number, number, number];
  onChange: (newValue: [number, number, number, number]) => void;
}

const BezierEditor: React.FC<BezierEditorProps> = ({ value, onChange }) => {
  const [x1, y1, x2, y2] = value;
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<'p1' | 'p2' | null>(null);

  // Coordinate conversion: SVG 0,0 is top-left, but we want graph 0,0 bottom-left
  // Viewbox is 0 0 100 100.
  // Input coords are 0-1 float.
  // Output drawing coords: x * 100, (1 - y) * 100

  const toSvg = (x: number, y: number) => ({
    x: x * 100,
    y: (1 - y) * 100,
  });

  const fromSvg = (svgX: number, svgY: number) => ({
    x: Math.max(0, Math.min(1, svgX / 100)),
    y: 1 - (svgY / 100), // No clamping on Y for elasticity/bounce effects, though standard css bezier clamps Y visually usually, but technically allows >1 or <0
  });

  const p0 = toSvg(0, 0);
  const p3 = toSvg(1, 1);
  const cp1 = toSvg(x1, y1);
  const cp2 = toSvg(x2, y2);

  const handlePointerDown = (point: 'p1' | 'p2') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(point);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    // Scale logic if SVG is scaled via CSS
    const scaleX = 100 / rect.width;
    const scaleY = 100 / rect.height;

    const svgX = rawX * scaleX;
    const svgY = rawY * scaleY;

    const { x, y } = fromSvg(svgX, svgY);

    // Limit X to [0, 1] for valid CSS bezier, Y can extend for bounce
    const clampedX = Math.max(0, Math.min(1, x)); 
    // Usually bezier editors allow Y to go outside 0-1 for bounce effects
    const safeY = parseFloat(y.toFixed(2));

    if (dragging === 'p1') {
      onChange([clampedX, safeY, x2, y2]);
    } else {
      onChange([x1, y1, clampedX, safeY]);
    }
  }, [dragging, onChange, x1, y1, x2, y2]);

  const handlePointerUp = (e: React.PointerEvent) => {
    setDragging(null);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  return (
    <div className="w-full aspect-square bg-gray-900 rounded-lg border border-gray-700 relative overflow-hidden select-none">
       {/* Grid Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-20" 
           style={{ backgroundImage: 'linear-gradient(#4a5568 1px, transparent 1px), linear-gradient(90deg, #4a5568 1px, transparent 1px)', backgroundSize: '25% 25%' }}>
      </div>

      <svg
        ref={svgRef}
        viewBox="0 -50 100 200" // Expanded viewbox to allow handles to go outside 0-1 range visually
        className="w-full h-full overflow-visible touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Helper Lines */}
        <line x1={p0.x} y1={p0.y} x2={cp1.x} y2={cp1.y} stroke="#6366f1" strokeWidth="1" strokeDasharray="2" opacity="0.5" />
        <line x1={p3.x} y1={p3.y} x2={cp2.x} y2={cp2.y} stroke="#ec4899" strokeWidth="1" strokeDasharray="2" opacity="0.5" />

        {/* The Curve */}
        <path
          d={`M ${p0.x} ${p0.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p3.x} ${p3.y}`}
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Handle 1 */}
        <circle
          cx={cp1.x}
          cy={cp1.y}
          r="6"
          fill="#6366f1"
          className="cursor-pointer hover:scale-125 transition-transform"
          onPointerDown={handlePointerDown('p1')}
        />
        
        {/* Handle 2 */}
        <circle
          cx={cp2.x}
          cy={cp2.y}
          r="6"
          fill="#ec4899"
          className="cursor-pointer hover:scale-125 transition-transform"
          onPointerDown={handlePointerDown('p2')}
        />

        {/* Start/End Points */}
        <circle cx={p0.x} cy={p0.y} r="3" fill="white" />
        <circle cx={p3.x} cy={p3.y} r="3" fill="white" />
      </svg>
      
      <div className="absolute bottom-2 right-2 text-xs font-mono text-gray-500 bg-gray-900/80 px-1 rounded pointer-events-none">
        cubic-bezier({x1.toFixed(2)}, {y1.toFixed(2)}, {x2.toFixed(2)}, {y2.toFixed(2)})
      </div>
    </div>
  );
};

export default BezierEditor;
