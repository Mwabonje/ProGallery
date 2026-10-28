import React from 'react';
import { MapPin, Sparkles, Clock, Sun, Compass, ArrowRight, Check } from 'lucide-react';
import { DESTINATIONS, DestinationInfo } from '../data/destinations';

interface LocationShowcaseHubProps {
  selectedLocation: string; // 'all' | 'watamu' | 'lamu' | 'malindi' | 'diani' | 'safari'
  onSelectLocation: (locationId: string) => void;
  onCheckAvailability?: (destinationId: string) => void;
}

export const LocationShowcaseHub: React.FC<LocationShowcaseHubProps> = ({
  selectedLocation,
  onSelectLocation,
  onCheckAvailability,
}) => {
  const activeDest = DESTINATIONS.find(d => d.id === selectedLocation);

  const handleScrollToAvailability = (destId: string) => {
    if (onCheckAvailability) {
      onCheckAvailability(destId);
    }
    const el = document.getElementById('availability');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full not-prose mb-10">
      {/* Location Filter Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-sans">
            Coastal Destinations:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* All Coast option */}
          <button
            type="button"
            onClick={() => onSelectLocation('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
              selectedLocation === 'all'
                ? 'bg-emerald-700 text-white shadow-xs dark:bg-emerald-600'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Coast
          </button>

          {/* Individual Destinations */}
          {DESTINATIONS.map((dest) => {
            const isSelected = selectedLocation === dest.id;
            return (
              <button
                key={dest.id}
                type="button"
                onClick={() => onSelectLocation(dest.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-xs dark:bg-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{dest.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured Destination Spotlight Card (Shown when specific location is active) */}
      {activeDest && (
        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111722] shadow-sm mb-8 transition-all animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* Visual Cover Column */}
            <div className="lg:col-span-5 relative min-h-[220px] lg:min-h-full overflow-hidden bg-slate-900">
              <img 
                src={activeDest.coverImage} 
                alt={`${activeDest.name} photography showcase by Mwabonje`} 
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-slate-950/80 via-slate-950/30 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <span className="text-[10px] tracking-widest uppercase font-bold text-emerald-400 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-full border border-emerald-500/30">
                  Featured Destination
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-2">
                  {activeDest.name}
                </h3>
                <p className="text-xs text-slate-200 font-light mt-0.5">
                  {activeDest.tagline}
                </p>
              </div>
            </div>

            {/* Editorial Content Column */}
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Kenya Coast Showcase</span>
                </div>
                <h4 className="text-lg sm:text-xl font-serif font-bold text-slate-900 dark:text-white leading-snug">
                  Weddings, Architecture &amp; Editorial Retreats in {activeDest.name}
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-light leading-relaxed mt-2">
                  {activeDest.description}
                </p>
              </div>

              {/* Highlights & Lighting Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="space-y-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Best Lighting Hours</span>
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-mono">
                    {activeDest.bestLighting}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Signature Vibe</span>
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                    {activeDest.weddingVibe}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400">
                  Showing curated portfolio works from {activeDest.name}
                </span>

                <button
                  type="button"
                  onClick={() => handleScrollToAvailability(activeDest.id)}
                  className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Check {activeDest.name} Dates</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
