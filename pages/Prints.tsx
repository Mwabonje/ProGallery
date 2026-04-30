import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Prints: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-900 selection:text-white flex flex-col">
            <header className="w-full flex items-center justify-between p-4 md:p-8 bg-white border-b border-slate-100 sticky top-0 z-50 transition-all duration-300">
                <button 
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors text-xs tracking-widest font-bold"
                >
                    <ArrowLeft className="w-4 h-4" />
                    BACK
                </button>
                <div className="font-serif tracking-widest uppercase text-xl font-bold flex-1 text-center pr-16 md:pr-[70px]">
                    PRINTS
                </div>
            </header>

            <main className="flex-1 max-w-[1400px] mx-auto w-full p-6 md:p-12 flex flex-col items-center justify-center text-center">
                <h1 className="text-3xl md:text-5xl font-serif tracking-widest uppercase text-slate-900 mb-6 font-bold">
                    Fine Art Prints
                </h1>
                <p className="max-w-2xl text-slate-600 leading-relaxed md:text-lg mb-12">
                    Coming soon. A curated collection of archival quality prints from my portfolio collections. 
                    Each piece is printed on museum-grade cotton rag paper to ensure longevity and exceptional color reproduction.
                </p>
                <div className="bg-slate-50 w-full max-w-lg aspect-[3/4] flex items-center justify-center rounded-sm border border-slate-100">
                    <p className="text-slate-400 tracking-[0.2em] text-xs uppercase font-medium">Available Soon</p>
                </div>
            </main>
        </div>
    );
};
