
import React from 'react';
import { AnimationGroup, PROPERTY_LABELS, AnimationTrack } from '../types';
import { Layers, StickyNote, Tag, Clock } from 'lucide-react';

interface HandoffSpecProps {
  group: AnimationGroup;
  isExport?: boolean;
}

// Helper to create a non-linear time scale that compresses empty space
const createVisualTimeScale = (tracks: AnimationTrack[]) => {
    const allProps = tracks.flatMap(t => t.properties);
    
    // 1. Get all significant time points (start and end of every animation)
    const timePoints = new Set<number>([0]);
    allProps.forEach(p => {
        timePoints.add(p.delay);
        timePoints.add(p.delay + p.duration);
    });
    // Sort and unique
    const sortedPoints = Array.from(timePoints).sort((a, b) => a - b);
    const maxRealDuration = sortedPoints[sortedPoints.length - 1] || 0;

    // 2. Build map of Real Time -> Visual Time
    let visualMap = [{ real: 0, visual: 0 }];
    let currentVisual = 0;
    const MAX_EMPTY_GAP_VISUAL = 60; // Visually, an empty gap is never wider than 60ms equivalent

    for (let i = 0; i < sortedPoints.length - 1; i++) {
        const tStart = sortedPoints[i];
        const tEnd = sortedPoints[i + 1];
        const mid = (tStart + tEnd) / 2;
        
        // Check if any property is active during this segment
        const isActive = allProps.some(p => mid >= p.delay && mid <= (p.delay + p.duration));
        
        const realDuration = tEnd - tStart;
        // If active, use real duration. If empty, compress it.
        const visualDuration = isActive ? realDuration : Math.min(realDuration, MAX_EMPTY_GAP_VISUAL);
        
        currentVisual += visualDuration;
        visualMap.push({ real: tEnd, visual: currentVisual });
    }

    const totalVisualDuration = currentVisual || 100; // Avoid divide by zero

    // 3. Mapping function
    const getPercent = (realTime: number) => {
        // Find the segment this time falls into
        const segmentIndex = visualMap.findIndex(m => m.real >= realTime);
        
        if (segmentIndex === -1) return 100;
        if (segmentIndex === 0) return 0;
        
        const endPoint = visualMap[segmentIndex];
        const startPoint = visualMap[segmentIndex - 1];
        
        const segmentRealDuration = endPoint.real - startPoint.real;
        const segmentVisualDuration = endPoint.visual - startPoint.visual;
        
        const progressInSegment = (realTime - startPoint.real) / segmentRealDuration;
        const visualTime = startPoint.visual + (progressInSegment * segmentVisualDuration);
        
        return (visualTime / totalVisualDuration) * 100;
    };

    return { getPercent, totalDuration: maxRealDuration };
};

const HandoffSpec: React.FC<HandoffSpecProps> = ({ group, isExport = false }) => {
  
  // Use the compression logic
  const { getPercent, totalDuration } = createVisualTimeScale(group.tracks);
  
  const formatBezier = (b: [number, number, number, number]) => `${b.map(n => n.toFixed(2)).join(', ')}`;

  const containerClass = isExport 
    ? "bg-zinc-950 border border-zinc-900 rounded-xl mb-8 overflow-hidden" 
    : "flex flex-col h-full bg-zinc-950 text-zinc-200";
    
  const headerClass = isExport
    ? "px-8 py-6 bg-zinc-950 border-b border-zinc-900"
    : "flex items-center justify-between px-6 py-4 bg-zinc-950 border-b border-zinc-900 shrink-0";
    
  const contentClass = isExport
    ? "px-8 pt-12 pb-8"
    : "flex-1 px-8 pt-12 pb-8 overflow-y-auto custom-scrollbar bg-[#050505]";

  const titleClass = isExport
    ? "text-5xl font-bold text-white leading-tight pb-2"
    : "text-4xl font-bold text-white truncate";

  return (
    <div className={containerClass}>
      
      {/* Header */}
      <div className={headerClass}>
        <div>
            {!isExport && (
                <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <Layers size={10} /> Active Spec
                </div>
            )}
            <h3 className={titleClass}>
                {group.name}
            </h3>
        </div>
        {!isExport && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 rounded border border-zinc-800">
                <Clock size={12} className="text-zinc-500" />
                <span className="text-xs font-mono text-zinc-300 font-bold">{totalDuration}ms</span>
            </div>
        )}
      </div>

      <div className={contentClass}>
        
        {/* Timeline Visualization */}
        <div className="mb-14">
            <div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-wider font-mono px-1">
                <span>0ms</span>
                <span>{totalDuration}ms</span>
            </div>
            
            <div className="relative pt-10 pb-8 px-8 bg-zinc-900/20 rounded-lg border border-zinc-900/50 overflow-hidden">
                {/* Visual Cue for compressed timeline (faint stripes) */}
                <div className="absolute inset-0 opacity-5 pointer-events-none" 
                     style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }}>
                </div>

                {/* Render Tracks in Timeline */}
                {group.tracks.map((track) => (
                    <div key={track.id} className="relative z-10 mb-10 last:mb-0">
                        {/* Track Group Label */}
                        <div className="flex items-center gap-2 mb-8 pl-1 border-b border-zinc-800/50 pb-2 mx-1 mt-0">
                             <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                             <span className="text-sm font-bold text-zinc-300 uppercase tracking-widest">{track.name}</span>
                        </div>
                        
                        {/* Properties Bars */}
                        <div className="space-y-7 pl-1">
                            {track.properties.map((prop) => {
                                // USE NON-LINEAR MAPPING HERE
                                const leftPercent = getPercent(prop.delay);
                                const rightPercent = getPercent(prop.delay + prop.duration);
                                const widthPercent = rightPercent - leftPercent;

                                const propLabel = prop.customName || PROPERTY_LABELS[prop.type].split(' ')[0];
                                
                                // Determine alignment anchor based on position
                                const isRightAligned = leftPercent > 60;

                                return (
                                    <div key={prop.id} className="relative h-2 w-full group">
                                         
                                        {/* Container for Bar + Labels */}
                                        <div 
                                            className="absolute h-full flex flex-col"
                                            style={{ 
                                                left: `${leftPercent}%`, 
                                                width: `${widthPercent}%`,
                                                minWidth: '70px' // Ensure visibility even if very short
                                            }}
                                        >
                                            {/* Labels Row (Above Bar) */}
                                            <div className={`absolute bottom-full mb-2 whitespace-nowrap flex items-baseline gap-1.5 ${isRightAligned ? 'right-0' : 'left-0'}`}>
                                                <span className="text-[10px] font-bold text-white drop-shadow-md">{propLabel}</span>
                                                <span className="text-[9px] text-zinc-400 font-mono">({prop.delay}-{prop.delay + prop.duration}ms)</span>
                                            </div>

                                            {/* The Bar */}
                                            <div className="h-2 w-full bg-indigo-600 rounded-sm shadow-sm hover:bg-indigo-500 transition-colors"></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Detailed Spec Cards (Grouped by Object) */}
        <div className="space-y-10">
             <div className="flex items-center gap-4">
                 <div className="h-px bg-zinc-800 flex-1"></div>
                 <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Specifications</div>
                 <div className="h-px bg-zinc-800 flex-1"></div>
             </div>
            
            {group.tracks.map(track => (
                <div key={track.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    
                    {/* Track Header */}
                    <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center gap-2">
                        <Tag size={14} className="text-indigo-500" />
                        <h4 className="font-bold text-sm text-zinc-200">{track.name}</h4>
                    </div>

                    {/* Properties Table */}
                    <div className="divide-y divide-zinc-800">
                        {track.properties.map(prop => {
                            const isMedia = prop.type === 'json' || prop.type === 'video';
                            const label = prop.customName || PROPERTY_LABELS[prop.type];
                            
                            return (
                                <div key={prop.id} className="p-6 hover:bg-zinc-800/20 transition-colors">
                                    <div className="flex items-start justify-between mb-5">
                                        <div className="flex items-center gap-2">
                                            <div className="px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-zinc-300 uppercase tracking-wide">
                                                {label}
                                            </div>
                                        </div>
                                        <div className="font-mono text-[10px] text-zinc-500 bg-zinc-950 px-2.5 py-1.5 rounded border border-zinc-900">
                                            T: {prop.delay}ms - {prop.delay + prop.duration}ms
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-8 text-xs pl-1">
                                        <div>
                                            <div className="text-[9px] text-zinc-500 uppercase font-bold mb-2 tracking-wider">Values</div>
                                            <div className="font-mono text-zinc-300 text-sm">
                                                {isMedia ? (
                                                    <span className="text-indigo-300 font-bold">{prop.assetName}</span>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-zinc-400">{prop.from}</span> 
                                                        <ArrowRight size={12} className="text-zinc-600" />
                                                        <span className="text-white font-bold">{prop.to}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {!isMedia && (
                                            <div className="text-right">
                                                <div className="text-[9px] text-zinc-500 uppercase font-bold mb-2 tracking-wider">Timing Function</div>
                                                <div className="font-mono text-indigo-400 bg-indigo-500/10 inline-block px-2.5 py-1 rounded border border-indigo-500/20 text-[11px]">
                                                    {formatBezier(prop.bezier)}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {prop.note && (
                                        <div className="mt-5 pt-3 border-t border-zinc-800/50 flex items-start gap-2">
                                            <StickyNote size={12} className="text-yellow-600/60 mt-0.5" />
                                            <p className="text-[11px] text-zinc-400 leading-relaxed">{prop.note}</p>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                        {track.properties.length === 0 && (
                            <div className="p-8 text-center text-xs text-zinc-600 italic">No animation properties defined.</div>
                        )}
                    </div>
                </div>
            ))}

            {group.tracks.length === 0 && (
                 <div className="text-center text-zinc-600 text-sm py-12">No objects created yet.</div>
            )}
        </div>

      </div>
    </div>
  );
};

// Simple helper icon for the table
const ArrowRight = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
)

export default HandoffSpec;
