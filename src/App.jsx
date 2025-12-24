import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Viewport from './components/Viewport';
import { Download, Github, Grid as GridIcon, RotateCcw } from 'lucide-react';

function App() {
    const [container, setContainer] = useState({ width: 5.89, height: 2.39, depth: 2.35 });
    const [item, setItem] = useState({ width: 1.20, height: 0.14, depth: 0.80 });
    const [results, setResults] = useState({
        totalItems: 0,
        countX: 0, countY: 0, countZ: 0,
        efficiency: 0,
        containerVol: 0,
        itemVolTotal: 0
    });

    const [gridVisible, setGridVisible] = useState(true);
    const [key, setKey] = useState(0); // for forcing re-render of camera if needed

    useEffect(() => {
        // Calculation Engine
        const cVol = container.width * container.height * container.depth;
        const iVol = item.width * item.height * item.depth;

        // Packing Logic: Floor (Container / Item)
        const cX = Math.floor(container.width / item.width) || 0;
        const cY = Math.floor(container.height / item.height) || 0;
        const cZ = Math.floor(container.depth / item.depth) || 0;

        const total = cX * cY * cZ;
        const totalIVol = total * iVol;
        const eff = cVol > 0 ? (totalIVol / cVol) * 100 : 0;

        setResults({
            totalItems: total,
            countX: cX,
            countY: cY,
            countZ: cZ,
            efficiency: eff.toFixed(1),
            containerVol: cVol,
            itemVolTotal: totalIVol
        });

    }, [container, item]);

    return (
        <div className="flex h-screen w-full bg-background text-white selection:bg-primary/30">
            {/* Left Panel */}
            <Sidebar
                container={container}
                setContainer={setContainer}
                item={item}
                setItem={setItem}
                results={results}
            />

            {/* Right Panel (Visualization) */}
            <div className="flex-1 relative h-full flex flex-col">
                {/* Overlay Header */}
                <div className="absolute top-0 right-0 z-20 p-6 flex items-center gap-3">
                    <button
                        onClick={() => setGridVisible(!gridVisible)}
                        className="p-2 bg-secondary/80 backdrop-blur border border-border rounded-lg hover:bg-secondary text-gray-300 hover:text-white transition-colors"
                        title="Toggle Grid"
                    >
                        <GridIcon size={18} />
                    </button>
                    <button
                        onClick={() => setKey(k => k + 1)}
                        className="p-2 bg-secondary/80 backdrop-blur border border-border rounded-lg hover:bg-secondary text-gray-300 hover:text-white transition-colors"
                        title="Reset View"
                    >
                        <RotateCcw size={18} />
                    </button>
                    <div className="h-6 w-px bg-white/10 mx-1" />
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-500/20 transition-all">
                        <Download size={16} /> Export Report
                    </button>
                </div>

                <Viewport
                    key={key}
                    container={container}
                    item={item}
                    counts={{ x: results.countX, y: results.countY, z: results.countZ }}
                    gridVisible={gridVisible}
                />
            </div>
        </div>
    );
}

export default App;
