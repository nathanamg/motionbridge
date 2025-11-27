
import React, { useState, useRef } from 'react';
import { AnimationGroup, AnimationTrack, AnimatedProperty, PropertyType, DEFAULT_PROPERTY, getPropertyTimes, PROPERTY_LABELS } from '../types';
import { Trash2, Plus, ArrowRight, Activity, PenLine, FileJson, Video, GripVertical, Settings, StickyNote, Tag, Layers, X, Clock, Move } from 'lucide-react';

interface PropertyControlsProps {
  group: AnimationGroup;
  onChange: (newGroup: AnimationGroup) => void;
}

const PropertyControls: React.FC<PropertyControlsProps> = ({ group, onChange }) => {
  const [draggedTrackIndex, setDraggedTrackIndex] = useState<number | null>(null);
  const [draggedProp, setDraggedProp] = useState<{trackIndex: number, propIndex: number} | null>(null);

  // --- Track (Object) Handlers ---

  const addTrack = () => {
    const newTrack: AnimationTrack = {
      id: `track-${Date.now()}`,
      name: 'New Object',
      properties: [] // Start empty, user adds properties
    };
    onChange({ ...group, tracks: [...group.tracks, newTrack] });
  };

  const removeTrack = (trackId: string) => {
    onChange({ ...group, tracks: group.tracks.filter(t => t.id !== trackId) });
  };

  const updateTrackName = (trackId: string, name: string) => {
    onChange({
      ...group,
      tracks: group.tracks.map(t => t.id === trackId ? { ...t, name } : t)
    });
  };

  // --- Property Handlers ---

  const addProperty = (trackId: string, type: PropertyType) => {
    const newProp: AnimatedProperty = {
      ...DEFAULT_PROPERTY,
      type,
      id: `prop-${Date.now()}-${Math.random()}`,
      assetName: type === 'json' ? 'animation.json' : (type === 'video' ? 'video.mp4' : undefined),
      customName: type === 'custom' ? 'Blur' : undefined
    };

    onChange({
      ...group,
      tracks: group.tracks.map(t => {
        if (t.id !== trackId) return t;
        return { ...t, properties: [...t.properties, newProp] };
      })
    });
  };

  const removeProperty = (trackId: string, propId: string) => {
    onChange({
      ...group,
      tracks: group.tracks.map(t => {
        if (t.id !== trackId) return t;
        return { ...t, properties: t.properties.filter(p => p.id !== propId) };
      })
    });
  };

  const updateProperty = (trackId: string, propId: string, updates: Partial<AnimatedProperty>) => {
    onChange({
      ...group,
      tracks: group.tracks.map(t => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          properties: t.properties.map(p => p.id === propId ? { ...p, ...updates } : p)
        };
      })
    });
  };

  const handleTimeChange = (trackId: string, propId: string, field: 'start' | 'end', value: number, currentProp: AnimatedProperty) => {
    const times = getPropertyTimes(currentProp);
    let newDelay = times.start;
    let newDuration = currentProp.duration;

    if (field === 'start') {
      newDelay = Math.max(0, value);
      if (newDelay >= times.end) {
         newDuration = 100; 
      } else {
         newDuration = times.end - newDelay;
      }
    } else {
      const newEnd = Math.max(times.start + 10, value);
      newDuration = newEnd - times.start;
    }

    updateProperty(trackId, propId, { delay: newDelay, duration: newDuration });
  };

  const handleBezierChange = (trackId: string, propId: string, value: string) => {
    const parts = value.split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      updateProperty(trackId, propId, { bezier: parts as [number, number, number, number] });
    }
  };

  const getIcon = (type: PropertyType) => {
      switch(type) {
          case 'json': return FileJson;
          case 'video': return Video;
          case 'custom': return Settings;
          default: return Activity;
      }
  };

  // --- Drag and Drop Handlers ---

  const handleTrackDragStart = (e: React.DragEvent, index: number) => {
    setDraggedTrackIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleTrackDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTrackIndex === null || draggedTrackIndex === index) return;
    
    // Swap tracks
    const newTracks = [...group.tracks];
    const draggedItem = newTracks[draggedTrackIndex];
    newTracks.splice(draggedTrackIndex, 1);
    newTracks.splice(index, 0, draggedItem);
    
    onChange({ ...group, tracks: newTracks });
    setDraggedTrackIndex(index);
  };

  const handleTrackDragEnd = () => {
    setDraggedTrackIndex(null);
  };

  const handlePropDragStart = (e: React.DragEvent, trackIndex: number, propIndex: number) => {
    e.stopPropagation(); // Prevent track drag
    setDraggedProp({ trackIndex, propIndex });
    e.dataTransfer.effectAllowed = "move";
  };

  const handlePropDragOver = (e: React.DragEvent, trackIndex: number, propIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedProp) return;
    if (draggedProp.trackIndex !== trackIndex || draggedProp.propIndex === propIndex) return; // Only allow reorder within same track

    const newTracks = [...group.tracks];
    const track = newTracks[trackIndex];
    const newProps = [...track.properties];
    const draggedItem = newProps[draggedProp.propIndex];
    
    newProps.splice(draggedProp.propIndex, 1);
    newProps.splice(propIndex, 0, draggedItem);
    
    newTracks[trackIndex] = { ...track, properties: newProps };
    
    onChange({ ...group, tracks: newTracks });
    setDraggedProp({ trackIndex, propIndex });
  };

  const handlePropDragEnd = () => {
    setDraggedProp(null);
  };

  return (
    <div className="space-y-10 pb-32">
      
      {/* GROUP NAME HEADER */}
      <div className="mb-8">
        <label className="block text-[10px] uppercase text-zinc-500 font-bold tracking-widest mb-2">Active Group Name</label>
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-2 focus-within:border-indigo-500 transition-colors">
            <Layers size={20} className="text-zinc-400" />
            <input 
                type="text"
                value={group.name}
                onChange={(e) => onChange({...group, name: e.target.value})}
                className="bg-transparent text-2xl font-bold text-white w-full outline-none placeholder-zinc-700"
                placeholder="Name your group..."
            />
        </div>
      </div>

      {/* TRACKS (OBJECTS) LIST */}
      <div className="space-y-8">
        {group.tracks.map((track, trackIndex) => (
            <div 
                key={track.id} 
                draggable={!draggedProp} // Disable track drag if property is being dragged
                onDragStart={(e) => handleTrackDragStart(e, trackIndex)}
                onDragOver={(e) => handleTrackDragOver(e, trackIndex)}
                onDragEnd={handleTrackDragEnd}
                className={`bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden shadow-sm group-card hover:border-zinc-700 transition-all ${draggedTrackIndex === trackIndex ? 'opacity-50 border-indigo-500 border-dashed' : ''}`}
            >
                
                {/* TRACK HEADER */}
                <div className="px-3 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between cursor-move active:cursor-grabbing">
                    <div className="flex items-center gap-2 flex-1">
                        <GripVertical size={16} className="text-zinc-600 hover:text-zinc-400 cursor-move" />
                        <Tag size={14} className="text-indigo-500" />
                        <input
                            type="text"
                            value={track.name}
                            onChange={(e) => updateTrackName(track.id, e.target.value)}
                            className="bg-transparent text-sm font-semibold text-white w-full outline-none placeholder-zinc-600 focus:text-indigo-400 transition-colors"
                            placeholder="Object Name (e.g., Button)"
                            onMouseDown={(e) => e.stopPropagation()} // Prevent drag when editing text
                        />
                    </div>
                    <button 
                        onClick={() => removeTrack(track.id)}
                        className="text-zinc-600 hover:text-red-400 p-1.5 rounded-md hover:bg-zinc-800 transition-colors"
                        title="Delete Object"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>

                {/* PROPERTIES LIST */}
                <div className="divide-y divide-zinc-800/50">
                    {track.properties.length === 0 && (
                        <div className="py-12 text-center flex flex-col items-center justify-center text-zinc-600 gap-2">
                            <Layers size={24} className="opacity-20" />
                            <span className="text-xs">No properties yet. Add one below.</span>
                        </div>
                    )}

                    {track.properties.map((prop, propIndex) => {
                        const times = getPropertyTimes(prop);
                        const isMedia = prop.type === 'json' || prop.type === 'video';
                        const PropIcon = getIcon(prop.type);
                        const isDraggingThis = draggedProp?.trackIndex === trackIndex && draggedProp?.propIndex === propIndex;

                        return (
                            <div 
                                key={prop.id} 
                                draggable
                                onDragStart={(e) => handlePropDragStart(e, trackIndex, propIndex)}
                                onDragOver={(e) => handlePropDragOver(e, trackIndex, propIndex)}
                                onDragEnd={handlePropDragEnd}
                                className={`p-4 hover:bg-zinc-800/30 transition-colors group relative ${isDraggingThis ? 'opacity-30 bg-zinc-800' : ''}`}
                            >
                                {/* Drag Handle */}
                                <div className="absolute left-1 top-4 opacity-0 group-hover:opacity-100 cursor-move transition-opacity hover:text-white text-zinc-600 p-1">
                                    <GripVertical size={12} />
                                </div>
                                
                                <div className="pl-3">
                                    {/* Header Row */}
                                    <div className="flex items-center justify-between mb-4">
                                         <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-indigo-400">
                                                <PropIcon size={12} />
                                            </div>
                                            {prop.type === 'custom' ? (
                                                 <input 
                                                    type="text"
                                                    value={prop.customName || ''}
                                                    onChange={(e) => updateProperty(track.id, prop.id, { customName: e.target.value })}
                                                    className="bg-transparent border-b border-transparent focus:border-indigo-500 text-xs font-bold text-zinc-200 outline-none w-24 placeholder-zinc-600"
                                                    placeholder="Custom Name"
                                                />
                                            ) : (
                                                <span className="text-xs font-bold text-zinc-300">
                                                    {PROPERTY_LABELS[prop.type].split(' ')[0]}
                                                </span>
                                            )}
                                         </div>
                                         <button 
                                            onClick={() => removeProperty(track.id, prop.id)}
                                            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-1"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>

                                    {/* Controls Grid */}
                                    <div className="grid grid-cols-12 gap-x-4 gap-y-4">
                                        
                                        {/* Timing Column */}
                                        <div className="col-span-5 space-y-1">
                                            <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">
                                                <Clock size={10} /> Timing (ms)
                                            </div>
                                            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-md overflow-hidden">
                                                <input
                                                    type="number"
                                                    value={times.start}
                                                    onChange={(e) => handleTimeChange(track.id, prop.id, 'start', parseInt(e.target.value) || 0, prop)}
                                                    className="w-1/2 bg-transparent text-xs py-1.5 px-2 text-zinc-300 outline-none text-center border-r border-zinc-800 focus:bg-zinc-900"
                                                    placeholder="Start"
                                                />
                                                <input
                                                    type="number"
                                                    value={times.end}
                                                    onChange={(e) => handleTimeChange(track.id, prop.id, 'end', parseInt(e.target.value) || 0, prop)}
                                                    className="w-1/2 bg-transparent text-xs py-1.5 px-2 text-zinc-300 outline-none text-center focus:bg-zinc-900"
                                                    placeholder="End"
                                                />
                                            </div>
                                        </div>

                                        {/* Values Column */}
                                        {isMedia ? (
                                            <div className="col-span-7 space-y-1">
                                                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Asset Name</label>
                                                <input
                                                    type="text"
                                                    value={prop.assetName || ''}
                                                    onChange={(e) => updateProperty(track.id, prop.id, { assetName: e.target.value })}
                                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 focus:border-indigo-500 outline-none"
                                                />
                                            </div>
                                        ) : (
                                            <div className="col-span-7 space-y-1">
                                                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">From / To</label>
                                                <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-md overflow-hidden">
                                                    <input
                                                        type="number"
                                                        value={prop.from}
                                                        onChange={(e) => updateProperty(track.id, prop.id, { from: parseFloat(e.target.value) })}
                                                        step={prop.type === 'scale' || prop.type === 'opacity' ? 0.1 : 1}
                                                        className="w-1/2 bg-transparent text-xs py-1.5 px-2 text-zinc-300 outline-none text-center border-r border-zinc-800 focus:bg-zinc-900"
                                                    />
                                                    <div className="bg-zinc-900 px-1.5 flex items-center justify-center text-zinc-600">
                                                        <ArrowRight size={10} />
                                                    </div>
                                                    <input
                                                        type="number"
                                                        value={prop.to}
                                                        onChange={(e) => updateProperty(track.id, prop.id, { to: parseFloat(e.target.value) })}
                                                        step={prop.type === 'scale' || prop.type === 'opacity' ? 0.1 : 1}
                                                        className="w-1/2 bg-transparent text-xs py-1.5 px-2 text-zinc-300 outline-none text-center focus:bg-zinc-900"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Bezier Column (Full width if no media) */}
                                        {!isMedia && (
                                            <div className="col-span-12 space-y-1 pt-2 border-t border-zinc-800/50">
                                                <label className="flex items-center justify-between text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                                                    <span>Bezier Curve</span>
                                                    <span className="text-[9px] font-mono text-zinc-600">x1, y1, x2, y2</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    defaultValue={prop.bezier.join(', ')}
                                                    onBlur={(e) => handleBezierChange(track.id, prop.id, e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs font-mono text-indigo-400 focus:border-indigo-500 outline-none"
                                                    placeholder="0.25, 0.1, 0.25, 1.0"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Notes */}
                                    <div className="mt-4 pt-2 border-t border-zinc-800/50 flex items-center gap-2">
                                        <StickyNote size={12} className="text-zinc-600" />
                                        <input
                                            type="text"
                                            value={prop.note || ''}
                                            onChange={(e) => updateProperty(track.id, prop.id, { note: e.target.value })}
                                            className="w-full bg-transparent text-xs text-zinc-400 focus:text-zinc-200 placeholder-zinc-700 outline-none"
                                            placeholder="Add remarks (e.g., waiting for API data)..."
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ADD PROPERTY FOOTER */}
                <div className="bg-zinc-900 border-t border-zinc-800 p-2">
                    <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mb-2 px-2 flex items-center gap-1">
                        <Plus size={10} /> Add Property
                    </div>
                    <div className="flex flex-wrap gap-1.5 px-1">
                        {(Object.keys(PROPERTY_LABELS) as PropertyType[]).map((type) => (
                            <button
                                key={type}
                                onClick={() => addProperty(track.id, type)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded text-[10px] text-zinc-400 hover:text-white transition-all shadow-sm"
                            >
                                {PROPERTY_LABELS[type].split(' ')[0]}
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        ))}
      </div>

      {/* ADD TRACK BUTTON */}
      <button 
        onClick={addTrack}
        className="w-full py-5 border-2 border-dashed border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 rounded-xl text-zinc-500 hover:text-white font-bold transition-all flex items-center justify-center gap-2 group"
      >
        <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center group-hover:scale-110 transition-transform">
             <Plus size={16} />
        </div>
        Add New Object Track
      </button>

    </div>
  );
};

export default PropertyControls;
