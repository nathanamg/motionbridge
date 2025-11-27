
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ProjectState, DEFAULT_PROJECT, AnimationGroup, PROPERTY_LABELS } from './types';
import PropertyControls from './components/PropertyControls';
import HandoffSpec from './components/HandoffSpec';
import { Layers, Plus, Trash2, FolderOpen, Download, ChevronDown, FileCode, FileImage, FileText, Upload, FileJson, Layout, MonitorPlay } from 'lucide-react';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const App = () => {
  const [project, setProject] = useState<ProjectState>(DEFAULT_PROJECT);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Resizable Layout State ---
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [editorWidth, setEditorWidth] = useState(450);
  const [isResizing, setIsResizing] = useState<'sidebar' | 'editor' | null>(null);
  
  // We use refs to avoid stale state in event listeners if not careful, 
  // but for simple resizing, state is fine if dependency arrays are correct.
  const startResizing = (panel: 'sidebar' | 'editor') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(panel);
  };

  const stopResizing = useCallback(() => {
    setIsResizing(null);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing === 'sidebar') {
      const newWidth = Math.max(200, Math.min(400, e.clientX));
      setSidebarWidth(newWidth);
    } else if (isResizing === 'editor') {
      // Editor width is relative to where the sidebar ends
      // e.clientX is absolute mouse X. Sidebar takes up `sidebarWidth`.
      // So Editor width = e.clientX - sidebarWidth.
      const newWidth = Math.max(350, Math.min(800, e.clientX - sidebarWidth));
      setEditorWidth(newWidth);
    }
  }, [isResizing, sidebarWidth]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      // Add cursor style to body to prevent flickering
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.cursor = '';
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = '';
    };
  }, [isResizing, resize, stopResizing]);

  // -----------------------------

  const activeGroup = project.groups.find(g => g.id === project.activeGroupId) || project.groups[0];

  const updateActiveGroup = (newGroup: AnimationGroup) => {
    setProject(prev => ({
      ...prev,
      groups: prev.groups.map(g => g.id === newGroup.id ? newGroup : g)
    }));
  };

  const addGroup = () => {
    const newId = `group-${Date.now()}`;
    const newGroup: AnimationGroup = {
      id: newId,
      name: '新动效组 (New Group)',
      tracks: []
    };
    setProject(prev => ({
      groups: [...prev.groups, newGroup],
      activeGroupId: newId
    }));
  };

  const deleteGroup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (project.groups.length <= 1) return; 
    
    const newGroups = project.groups.filter(g => g.id !== id);
    setProject({
      groups: newGroups,
      activeGroupId: newGroups[0].id
    });
  };

  const handleDownloadJSON = () => {
    setIsExportMenuOpen(false);
    const dataStr = JSON.stringify(project, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MotionProject-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.groups && Array.isArray(json.groups) && json.activeGroupId) {
            setProject(json);
            if (!json.groups.find((g: any) => g.id === json.activeGroupId)) {
                setProject(prev => ({ ...prev, activeGroupId: json.groups[0].id }));
            }
        } else {
            alert("无效的项目文件 (Invalid Project File)");
        }
      } catch (err) {
        console.error("Error parsing JSON", err);
        alert("文件读取失败 (Failed to read file)");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleDownloadHTML = () => {
    setIsExportMenuOpen(false);
    const date = new Date().toLocaleDateString();
    
    let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Motion Spec - ${date}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; background-color: #09090b; color: #e4e4e7; }
            .font-mono { font-family: 'JetBrains Mono', monospace; }
        </style>
    </head>
    <body class="p-8 max-w-4xl mx-auto">
        <div class="mb-12 border-b border-zinc-800 pb-6 flex justify-between items-end">
            <div>
                <h1 class="text-4xl font-bold text-white mb-2 leading-relaxed pb-2">Motion Handoff Spec</h1>
                <p class="text-zinc-500">Generated on ${date}</p>
            </div>
            <div class="text-right">
                <div class="text-xs font-bold text-indigo-500 uppercase tracking-wider">Project</div>
                <div class="text-xl font-bold">MotionBridge</div>
            </div>
        </div>
    `;

    project.groups.forEach(group => {
        // --- Calculate Non-Linear Scale Logic (Mirrors HandoffSpec.tsx) ---
        const allProps = group.tracks.flatMap(t => t.properties);
        const timePoints = new Set<number>([0]);
        allProps.forEach(p => {
            timePoints.add(p.delay);
            timePoints.add(p.delay + p.duration);
        });
        const sortedPoints = Array.from(timePoints).sort((a, b) => a - b);
        const maxRealDuration = sortedPoints[sortedPoints.length - 1] || 0;

        let visualMap = [{ real: 0, visual: 0 }];
        let currentVisual = 0;
        const MAX_EMPTY_GAP_VISUAL = 60; 

        for (let i = 0; i < sortedPoints.length - 1; i++) {
            const tStart = sortedPoints[i];
            const tEnd = sortedPoints[i + 1];
            const mid = (tStart + tEnd) / 2;
            const isActive = allProps.some(p => mid >= p.delay && mid <= (p.delay + p.duration));
            const realDuration = tEnd - tStart;
            const visualDuration = isActive ? realDuration : Math.min(realDuration, MAX_EMPTY_GAP_VISUAL);
            currentVisual += visualDuration;
            visualMap.push({ real: tEnd, visual: currentVisual });
        }
        const totalVisualDuration = currentVisual || 100;

        const getPercent = (realTime: number) => {
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
        // ----------------------------------------------------------------

        htmlContent += `
        <div class="mb-16 bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden break-inside-avoid shadow-lg">
            <div class="bg-zinc-800/80 px-8 py-6 flex justify-between items-center border-b border-zinc-700/50">
                <h2 class="text-5xl font-bold text-white leading-tight pb-2">${group.name}</h2>
                <span class="text-xs font-mono text-zinc-300 font-bold bg-zinc-900 px-3 py-1.5 rounded border border-zinc-700">Total: ${maxRealDuration}ms</span>
            </div>
            
            <div class="px-8 pt-12 pb-8">
                <!-- Timeline Visual -->
                <div class="mb-14 relative h-auto">
                    <div class="flex justify-between text-[10px] text-zinc-500 mb-2 uppercase font-bold tracking-wider px-1">
                        <span>0ms</span>
                        <span>${maxRealDuration}ms</span>
                    </div>
                    <div class="relative w-full border-t border-b border-zinc-800 bg-zinc-950/30 pt-10 pb-8 px-0 rounded">
                         <div class="absolute inset-0 flex justify-between px-0 opacity-10 pointer-events-none">
                            <div class="h-full w-px bg-white left-0 absolute"></div>
                            <div class="h-full w-px bg-white left-1/4 absolute"></div>
                            <div class="h-full w-px bg-white left-2/4 absolute"></div>
                            <div class="h-full w-px bg-white left-3/4 absolute"></div>
                            <div class="h-full w-px bg-white right-0 absolute"></div>
                        </div>
                        
                        ${group.tracks.map(track => `
                            <div class="mb-10 relative px-6">
                                <div class="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-8 pl-1 flex items-center gap-2 border-b border-zinc-800/50 pb-2 mt-0">
                                    <span class="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                    ${track.name}
                                </div>
                                ${track.properties.map(prop => {
                                    const leftPercent = getPercent(prop.delay);
                                    const rightPercent = getPercent(prop.delay + prop.duration);
                                    const widthPercent = rightPercent - leftPercent;

                                    const label = prop.customName || PROPERTY_LABELS[prop.type].split(' ')[0];
                                    
                                    // Smart alignment for export
                                    const isRightAligned = leftPercent > 60;
                                    const alignmentStyle = isRightAligned ? 'right: 0;' : 'left: 0;';

                                    return `
                                    <div class="h-2 w-full relative mb-8 flex items-center">
                                         
                                         <div class="absolute h-full flex flex-col"
                                              style="left: ${leftPercent}%; width: ${widthPercent}%; min-width: 70px;">
                                              
                                              <div style="position: absolute; bottom: 100%; margin-bottom: 8px; white-space: nowrap; ${alignmentStyle}" class="flex items-baseline gap-1.5">
                                                  <span class="font-bold text-white text-[10px] drop-shadow-sm">${label}</span>
                                                  <span class="font-mono text-zinc-400 text-[9px]">(${prop.delay}-${prop.delay + prop.duration}ms)</span>
                                              </div>

                                              <div class="h-2 w-full bg-indigo-600 rounded-sm shadow-sm"></div>
                                         </div>

                                    </div>
                                    `;
                                }).join('')}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Spec Cards -->
                <div class="space-y-10">
                    ${group.tracks.map(track => `
                        <div class="bg-zinc-900/40 rounded-xl border border-zinc-800 overflow-hidden">
                             <div class="bg-zinc-800/40 px-6 py-4 border-b border-zinc-800 text-sm font-bold text-zinc-200 uppercase flex items-center gap-2">
                                <div class="w-2 h-2 rounded-full bg-indigo-500"></div>
                                ${track.name}
                             </div>
                             <div class="divide-y divide-zinc-800">
                                ${track.properties.map(prop => {
                                    const isMedia = prop.type === 'json' || prop.type === 'video';
                                    const bezierStr = isMedia ? '-' : prop.bezier.map(n => n.toFixed(2)).join(', ');
                                    const valueStr = isMedia 
                                        ? `<span class="text-indigo-300 font-bold">${prop.assetName}</span>` 
                                        : `<span class="text-zinc-400">${prop.from}</span> <span class="text-zinc-600 mx-2">→</span> <span class="text-white font-bold">${prop.to}</span>`;
                                    
                                    const label = prop.customName || PROPERTY_LABELS[prop.type];
                                    const noteHTML = prop.note ? 
                                        `<div class="mt-2 pt-2 border-t border-zinc-800/50 text-[10px] italic text-zinc-500 flex gap-2">
                                            <span>📝</span> ${prop.note}
                                         </div>` : '';

                                    return `
                                    <div class="p-6 grid grid-cols-12 gap-4 items-center hover:bg-zinc-800/20 transition-colors">
                                        <div class="col-span-3 font-bold text-zinc-300 text-xs">
                                            ${label}
                                        </div>
                                        <div class="col-span-2 text-[10px] text-zinc-500 font-mono">
                                            ${prop.delay}ms - ${prop.delay + prop.duration}ms
                                        </div>
                                        <div class="col-span-4 text-xs font-mono text-zinc-300">
                                            ${valueStr}
                                        </div>
                                        <div class="col-span-3 text-[10px] font-mono text-zinc-500 text-right">
                                            ${isMedia ? '' : `${bezierStr}`}
                                        </div>
                                        ${prop.note ? `<div class="col-span-12">${noteHTML}</div>` : ''}
                                    </div>
                                    `;
                                }).join('')}
                             </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        `;
    });

    htmlContent += `
        <div class="text-center text-zinc-600 text-xs mt-12 mb-8">
            Generated by MotionBridge
        </div>
    </body>
    </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MotionHandoff-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPNG = async () => {
    setIsExportMenuOpen(false);
    if (!exportRef.current) return;
    try {
        const canvas = await html2canvas(exportRef.current, {
            scale: 2,
            backgroundColor: '#09090b',
            useCORS: true,
            logging: false,
            onclone: (document: any) => {
                const el = document.getElementById('export-canvas');
                if (el) {
                    el.style.width = '1024px';
                    el.style.textAlign = 'left'; 
                }
            }
        });
        const image = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = image;
        a.download = `MotionHandoff-${Date.now()}.png`;
        a.click();
    } catch (err) {
        console.error("Export failed", err);
    }
  };

  const handleDownloadPDF = async () => {
    setIsExportMenuOpen(false);
    if (!exportRef.current) return;
    try {
        const canvas = await html2canvas(exportRef.current, {
            scale: 2,
            backgroundColor: '#09090b'
        });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210; 
        const pageHeight = 297; 
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const doc = new jsPDF('p', 'mm', 'a4');
        if (imgHeight > pageHeight) {
             const customDoc = new jsPDF({
                 orientation: 'p',
                 unit: 'mm',
                 format: [imgWidth, imgHeight]
             });
             customDoc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
             customDoc.save(`MotionHandoff-${Date.now()}.pdf`);
        } else {
             doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
             doc.save(`MotionHandoff-${Date.now()}.pdf`);
        }
    } catch (err) {
        console.error("PDF Export failed", err);
    }
  };

  return (
    <div className="flex h-screen w-full bg-black text-gray-100 font-sans overflow-hidden selection:bg-indigo-500/30">
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileImport} 
        accept=".json" 
        className="hidden" 
      />

      {/* Hidden Export Canvas */}
      <div 
        style={{ position: 'fixed', left: '-9999px', top: 0, width: '1024px', zIndex: -1000 }} 
        className="bg-[#09090b] p-16 text-gray-100 font-sans"
        id="export-canvas"
        ref={exportRef}
      >
         <div className="mb-12 border-b border-zinc-800 pb-6 flex justify-between items-end">
            <div>
                <h1 className="text-4xl font-bold text-white mb-2 pb-2 leading-relaxed">Motion Handoff Spec</h1>
                <p className="text-zinc-500">Generated on {new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-right">
                <div className="text-sm font-bold text-indigo-500 uppercase tracking-wider">Project</div>
                <div className="text-2xl font-bold">MotionBridge</div>
            </div>
        </div>
        
        <div className="space-y-12">
            {project.groups.map(group => (
                <HandoffSpec key={group.id} group={group} isExport={true} />
            ))}
        </div>

        <div className="text-center text-zinc-600 text-sm mt-16 pt-8 border-t border-zinc-900 w-full flex justify-center">
            Created with MotionBridge
        </div>
      </div>

      {/* Sidebar - RESIZABLE */}
      <div 
        className="bg-zinc-950 border-r border-zinc-900 flex flex-col flex-shrink-0 z-30 relative"
        style={{ width: sidebarWidth }}
      >
        <div className="p-5 border-b border-zinc-900 flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 text-lg">M</div>
            <span className="font-bold text-gray-100 tracking-tight text-lg truncate">MotionBridge</span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2 custom-scrollbar">
            <div className="px-3 pb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Layers size={10} />
                Groups
            </div>
            {project.groups.map(group => (
                <div 
                    key={group.id}
                    onClick={() => setProject(p => ({ ...p, activeGroupId: group.id }))}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-all border ${
                        project.activeGroupId === group.id 
                        ? 'bg-zinc-900 border-zinc-800 text-white shadow-sm' 
                        : 'border-transparent text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
                    }`}
                >
                    <div className="flex items-center gap-3 truncate">
                        <FolderOpen size={16} className={project.activeGroupId === group.id ? 'text-indigo-400' : 'text-zinc-600'} />
                        <span className="truncate max-w-[120px] font-medium">{group.name}</span>
                    </div>
                    {project.groups.length > 1 && (
                        <button 
                            onClick={(e) => deleteGroup(group.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded transition-all"
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            ))}
        </div>

        <div className="p-4 border-t border-zinc-900 space-y-3 bg-zinc-950">
            <button 
                onClick={addGroup}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-800 transition-all hover:border-zinc-700"
            >
                <Plus size={14} />
                <span className="truncate">New Group</span>
            </button>
            <button 
                onClick={handleTriggerImport}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-zinc-500 hover:text-zinc-300 text-xs font-medium rounded-lg transition-all hover:bg-zinc-900"
            >
                <Upload size={14} />
                <span className="truncate">Import JSON</span>
            </button>
        </div>

        {/* Resizer Handle */}
        <div 
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-50 flex items-center justify-center group translate-x-1/2"
            onMouseDown={startResizing('sidebar')}
        >
             <div className="h-8 w-0.5 bg-zinc-700 group-hover:bg-indigo-400 rounded-full transition-colors"></div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative bg-zinc-950">
        
        {/* Left Pane: Editor - RESIZABLE */}
        <div 
            className="flex-shrink-0 border-r border-zinc-900 flex flex-col relative"
            style={{ width: editorWidth }}
        >
            {/* Header */}
            <div className="h-16 border-b border-zinc-900 bg-zinc-950 px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-zinc-400">
                    <Layout size={18} />
                    <span className="text-sm font-semibold tracking-wide uppercase">Editor</span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-zinc-950">
                <div className="max-w-3xl mx-auto pb-24">
                    <PropertyControls 
                        group={activeGroup} 
                        onChange={updateActiveGroup} 
                    />
                </div>
            </div>

            {/* Resizer Handle */}
            <div 
                className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-50 flex items-center justify-center group translate-x-1/2"
                onMouseDown={startResizing('editor')}
            >
                 <div className="h-8 w-0.5 bg-zinc-700 group-hover:bg-indigo-400 rounded-full transition-colors"></div>
            </div>
        </div>

        {/* Right Pane: Preview - FLEX EXPAND */}
        <div className="flex-1 flex flex-col bg-black min-w-0">
             {/* Header */}
             <div className="h-16 border-b border-zinc-900 bg-zinc-950 px-6 flex items-center justify-between shrink-0 z-20">
                <div className="flex items-center gap-2 text-zinc-400">
                    <MonitorPlay size={18} />
                    <span className="text-sm font-semibold tracking-wide uppercase truncate">Preview / Handoff</span>
                </div>

                <div className="relative">
                    <button 
                        onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-lg shadow-sm transition-all text-xs font-bold uppercase tracking-wide active:scale-95"
                    >
                        <Download size={14} />
                        Export
                        <ChevronDown size={14} />
                    </button>
                    
                    {isExportMenuOpen && (
                        <div className="absolute right-0 mt-2 w-60 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 ring-1 ring-black/50">
                             <div className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-950/50">
                                Project Data
                             </div>
                             <button onClick={handleDownloadJSON} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left border-b border-zinc-800">
                                <FileJson size={16} className="text-yellow-500" />
                                <div>
                                    <span className="block font-medium">Project File (.json)</span>
                                    <span className="block text-[10px] text-zinc-500">Editable backup</span>
                                </div>
                            </button>
                            <div className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-950/50">
                                Visual Spec
                             </div>
                            <button onClick={handleDownloadPNG} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left">
                                <FileImage size={16} className="text-purple-500" />
                                <span>Export Image (PNG)</span>
                            </button>
                            <button onClick={handleDownloadPDF} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left">
                                <FileText size={16} className="text-red-500" />
                                <span>Export Document (PDF)</span>
                            </button>
                            <button onClick={handleDownloadHTML} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left">
                                <FileCode size={16} className="text-blue-500" />
                                <span>Export Web Page (HTML)</span>
                            </button>
                        </div>
                    )}
                     {isExportMenuOpen && (
                        <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)}></div>
                    )}
                </div>
             </div>

            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#050505] flex justify-center">
                {/* WIDER CONTAINER FOR PREVIEW */}
                <div className="w-full max-w-4xl h-full flex flex-col">
                    <div className="flex-1 shadow-2xl shadow-black rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
                        <HandoffSpec group={activeGroup} />
                    </div>
                    <div className="text-center mt-6 text-zinc-600 text-xs">
                        MotionBridge Preview Mode
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default App;
