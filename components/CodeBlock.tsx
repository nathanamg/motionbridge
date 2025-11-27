import React, { useState } from 'react';
import { AnimationParams, CodeFormat } from '../types';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  params: AnimationParams;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ params }) => {
  const [activeTab, setActiveTab] = useState<CodeFormat>('css');
  const [copied, setCopied] = useState(false);

  const bezierStr = `cubic-bezier(${params.bezier.map(n => n.toFixed(2)).join(', ')})`;
  
  const generateCSS = () => {
    return `.animated-element {
  /* Initial State */
  opacity: ${params.initial.opacity};
  transform: translate(${params.initial.x}px, ${params.initial.y}px) scale(${params.initial.scale}) rotate(${params.initial.rotate}deg);
  
  /* Animation */
  transition: all ${params.duration}ms ${bezierStr};
  transition-delay: ${params.delay}ms;
}

.animated-element.active {
  /* Target State */
  opacity: ${params.target.opacity};
  transform: translate(${params.target.x}px, ${params.target.y}px) scale(${params.target.scale}) rotate(${params.target.rotate}deg);
}`;
  };

  const generateTailwind = () => {
    // Tailwind config usually required for arbitrary bezier, but we can use arbitrary values (JIT)
    return `<!-- Tailwind Arbitrary Values -->
<div className="
  transition-all 
  duration-[${params.duration}ms] 
  delay-[${params.delay}ms] 
  ease-[${bezierStr}]
  opacity-${params.initial.opacity * 100} 
  scale-[${params.initial.scale}] 
  translate-x-[${params.initial.x}px] 
  translate-y-[${params.initial.y}px] 
  rotate-[${params.initial.rotate}deg]
  
  data-[state=active]:opacity-${params.target.opacity * 100} 
  data-[state=active]:scale-[${params.target.scale}] 
  data-[state=active]:translate-x-[${params.target.x}px] 
  data-[state=active]:translate-y-[${params.target.y}px] 
  data-[state=active]:rotate-[${params.target.rotate}deg]
">
  Content
</div>`;
  };

  const generateFramer = () => {
    return `// Framer Motion Variant
const variants = {
  hidden: { 
    opacity: ${params.initial.opacity}, 
    scale: ${params.initial.scale}, 
    x: ${params.initial.x}, 
    y: ${params.initial.y}, 
    rotate: ${params.initial.rotate} 
  },
  visible: { 
    opacity: ${params.target.opacity}, 
    scale: ${params.target.scale}, 
    x: ${params.target.x}, 
    y: ${params.target.y}, 
    rotate: ${params.target.rotate},
    transition: {
      duration: ${params.duration / 1000},
      delay: ${params.delay / 1000},
      ease: [${params.bezier.join(', ')}]
    }
  }
};`;
  };

  const getCode = () => {
    switch (activeTab) {
      case 'css': return generateCSS();
      case 'tailwind': return generateTailwind();
      case 'framer': return generateFramer();
      default: return '';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex space-x-2">
          {(['css', 'tailwind', 'framer'] as CodeFormat[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === tab 
                ? 'bg-accent-600 text-white' 
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <button 
          onClick={handleCopy}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
        </button>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        <pre className="font-mono text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
          {getCode()}
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;
