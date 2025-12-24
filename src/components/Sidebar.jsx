import React, { useEffect, useState } from 'react';
import { Package, Box, Sliders, ChevronDown, Check, Grip } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

const PRESETS_CONTAINER = [
    { label: '20ft Container', w: 5.89, h: 2.39, d: 2.35 },
    { label: '40ft Container', w: 12.03, h: 2.39, d: 2.35 },
    { label: '40ft HC Container', w: 12.03, h: 2.69, d: 2.35 },
];

const PRESETS_ITEM = [
    { label: 'Euro Pallet', w: 1.20, h: 0.144, d: 0.80 },
    { label: 'US Pallet', w: 1.22, h: 0.15, d: 1.02 },
    { label: 'Standard Box', w: 0.4, h: 0.4, d: 0.4 },
];

const InputGroup = ({ label, value, onChange, icon: Icon, step = 0.01 }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            {Icon && <Icon size={14} />} {label}
        </label>
        <input
            type="number"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            step={step}
            min={0.01}
            className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono"
        />
    </div>
);

export default function Sidebar({ container, setContainer, item, setItem, results }) {
    const [aspectLock, setAspectLock] = useState(false);

    // Sync aspects if locked
    const updateItem = (key, val) => {
        if (aspectLock) {
            setItem({ width: val, height: val, depth: val });
        } else {
            setItem({ ...item, [key]: val });
        }
    };

    return (
        <aside className="w-[380px] bg-[#0f172a] border-r border-border h-full flex flex-col shadow-2xl z-10 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-border bg-[#161b22]">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <Box className="text-white" size={20} />
                    </div>
                    <h1 className="text-xl font-bold font-sans tracking-tight">VoxelSpace</h1>
                </div>
                <p className="text-xs text-gray-500 pl-11">Advanced Spatial Analysis Tool</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">

                {/* Container Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <Package className="text-primary" size={18} /> CONTAINER DIMENSIONS
                        </h2>
                        <select
                            className="bg-secondary text-xs text-gray-400 border border-border rounded px-2 py-1 outline-none"
                            onChange={(e) => {
                                const p = PRESETS_CONTAINER.find(x => x.label === e.target.value);
                                if (p) setContainer({ width: p.w, height: p.h, depth: p.d });
                            }}
                        >
                            <option>Custom</option>
                            {PRESETS_CONTAINER.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <InputGroup label="WIDTH (M)" value={container.width} onChange={(v) => setContainer({ ...container, width: v })} />
                        <InputGroup label="HEIGHT (M)" value={container.height} onChange={(v) => setContainer({ ...container, height: v })} />
                        <InputGroup label="DEPTH (M)" value={container.depth} onChange={(v) => setContainer({ ...container, depth: v })} />
                    </div>
                </section>

                <div className="h-px bg-border/50" />

                {/* Item Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <Grip className="text-accent" size={18} /> VOXEL / ITEM SIZE
                        </h2>
                        <select
                            className="bg-secondary text-xs text-gray-400 border border-border rounded px-2 py-1 outline-none"
                            onChange={(e) => {
                                const p = PRESETS_ITEM.find(x => x.label === e.target.value);
                                if (p) {
                                    setItem({ width: p.w, height: p.h, depth: p.d });
                                    setAspectLock(false);
                                }
                            }}
                        >
                            <option>Custom</option>
                            {PRESETS_ITEM.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                        <InputGroup label="WIDTH (M)" value={item.width} onChange={(v) => updateItem('width', v)} />
                        <InputGroup label="HEIGHT (M)" value={item.height} onChange={(v) => updateItem('height', v)} />
                        <InputGroup label="DEPTH (M)" value={item.depth} onChange={(v) => updateItem('depth', v)} />
                    </div>

                    <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={aspectLock}
                            onChange={(e) => setAspectLock(e.target.checked)}
                            className="rounded border-border bg-secondary text-primary focus:ring-primary/20"
                        />
                        Lock Aspect Ratio (Perfect Cube)
                    </label>
                </section>

                {/* Results Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#1c2433] rounded-xl p-5 border border-border relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Box size={80} />
                    </div>

                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Analysis Results</h3>

                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                            <span className="text-xs text-gray-400 block mb-1">TOTAL ITEMS</span>
                            <span className="text-3xl font-bold text-white tracking-tight">{results.totalItems.toLocaleString()}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-400 block mb-1">VOLUME EFF.</span>
                            <span className="text-3xl font-bold text-primary tracking-tight">{results.efficiency}%</span>
                        </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-300 border-t border-border pt-4">
                        <div className="flex justify-between">
                            <span>Items along Width (X)</span>
                            <span className="font-mono text-white">{results.countX}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Items along Height (Y)</span>
                            <span className="font-mono text-white">{results.countY}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Items along Depth (Z)</span>
                            <span className="font-mono text-white">{results.countZ}</span>
                        </div>
                        <div className="h-px bg-border/30 my-2" />
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Container Vol</span>
                            <span>{results.containerVol.toFixed(3)} m³</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Item Volume</span>
                            <span>{results.itemVolTotal.toFixed(3)} m³</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-[#0a0e17] text-[10px] text-gray-600 flex justify-between uppercase tracking-wider">
                <span>VoxelSpace v2.0</span>
                <span>Ready</span>
            </div>
        </aside>
    );
}
