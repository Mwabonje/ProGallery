import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, MapPin, Sparkles, Send, 
  CheckCircle2, Clock, Users, ArrowRight, Heart 
} from 'lucide-react';
import { DESTINATIONS, SHOOT_EXPERIENCES, DestinationInfo } from '../data/destinations';
import { formatWhatsappUrl } from './WhatsAppFloatingChat';

interface DestinationAvailabilityCheckerProps {
  initialDestinationId?: string;
  whatsappLink?: string;
  brandName?: string;
}

export const DestinationAvailabilityChecker: React.FC<DestinationAvailabilityCheckerProps> = ({
  initialDestinationId = 'watamu',
  whatsappLink = 'https://wa.me/254705268604',
  brandName = 'Mwabonje',
}) => {
  const [selectedDestId, setSelectedDestId] = useState<string>(initialDestinationId);
  const [selectedExperienceId, setSelectedExperienceId] = useState<string>('wedding');

  // Keep selected destination in sync if parent passes a new initialDestinationId (e.g. from location hub)
  React.useEffect(() => {
    if (initialDestinationId) {
      setSelectedDestId(initialDestinationId);
    }
  }, [initialDestinationId]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to ~3 months in future
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });
  const [guestCount, setGuestCount] = useState<string>('Classic (30 – 80 Guests)');
  const [specialNotes, setSpecialNotes] = useState<string>('');

  const currentDestination: DestinationInfo = 
    DESTINATIONS.find(d => d.id === selectedDestId) || DESTINATIONS[0];
  const currentExperience = 
    SHOOT_EXPERIENCES.find(e => e.id === selectedExperienceId) || SHOOT_EXPERIENCES[0];

  // Format date for display
  const formattedDate = (() => {
    try {
      if (!selectedDate) return 'Flexible / Upcoming';
      const d = new Date(selectedDate);
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return selectedDate;
    }
  })();

  // Construct instant WhatsApp message
  const whatsappMessage = (() => {
    let text = `Hello ${brandName}! 👋\n\n`;
    text += `I would love to check your availability for a photoshoot:\n`;
    text += `• Experience: ${currentExperience.title}\n`;
    text += `• Destination: ${currentDestination.name}, Kenya\n`;
    text += `• Requested Date: ${formattedDate}\n`;
    if (guestCount) {
      text += `• Scope / Guests: ${guestCount}\n`;
    }
    if (specialNotes.trim()) {
      text += `• Venue / Vision: ${specialNotes.trim()}\n`;
    }
    text += `\nPlease let me know if this date is open and share your package details. Thank you!`;
    return text;
  })();

  const handleOpenWhatsApp = () => {
    const baseUrl = formatWhatsappUrl(whatsappLink);
    const targetUrl = `${baseUrl}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenEmail = () => {
    const subject = encodeURIComponent(`${currentExperience.title} Inquiry — ${currentDestination.name} (${formattedDate})`);
    const body = encodeURIComponent(whatsappMessage);
    window.location.href = `mailto:info@mwabonje.co.ke?subject=${subject}&body=${body}`;
  };

  return (
    <div 
      className="w-full not-prose"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 text-white border border-slate-800 shadow-2xl overflow-hidden relative">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="relative p-6 sm:p-10 md:p-12 pb-6 sm:pb-8 text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-semibold tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Kenya Coast Destination Booking</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal font-serif tracking-tight text-white leading-tight">
            Check Date &amp; <span className="italic font-light">Destination</span> Availability
          </h2>

          <p className="text-sm md:text-base text-slate-300 font-light leading-relaxed">
            Planning a sun-drenched wedding, oceanfront villa campaign, or private lifestyle session along Kenya’s coastline? Select your details below to check dates and connect with the studio immediately.
          </p>
        </div>

        {/* Interactive Steps Grid */}
        <div className="relative px-6 sm:px-10 md:px-12 pb-12 space-y-8">
          {/* Step 1: Destination Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>1. Select Coastal Destination</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Currently exploring: <strong className="text-white">{currentDestination.name}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {DESTINATIONS.map((dest) => {
                const isSelected = selectedDestId === dest.id;
                return (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => setSelectedDestId(dest.id)}
                    className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                      isSelected
                        ? 'bg-emerald-950/60 border-emerald-400/80 ring-2 ring-emerald-500/30 text-white shadow-lg shadow-emerald-950/40'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold tracking-tight">{dest.shortLabel}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                        {dest.tagline}
                      </p>
                    </div>
                    <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-widest mt-3 block">
                      Explore →
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Experience / Shoot Type */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-emerald-400" />
              <span>2. Choose Shoot Experience</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {SHOOT_EXPERIENCES.map((exp) => {
                const isSelected = selectedExperienceId === exp.id;
                return (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => {
                      setSelectedExperienceId(exp.id);
                      if (exp.id === 'editorial_portraits') {
                        setGuestCount('Editorial Portraits');
                      } else if (exp.id === 'couple_portraits') {
                        setGuestCount('Couples Portraits');
                      } else if (exp.id === 'elopement') {
                        setGuestCount('Just Couple (Elopement)');
                      } else if (exp.id === 'hospitality') {
                        setGuestCount('Commercial / Full Property');
                      } else if (exp.id === 'wedding' && (guestCount === 'Editorial Portraits' || guestCount === 'Couples Portraits' || guestCount === 'Commercial / Full Property')) {
                        setGuestCount('Classic (30 – 80 Guests)');
                      }
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-950/60 border-emerald-400/80 ring-2 ring-emerald-500/30 text-white'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-lg">{exp.icon}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <div className="text-xs font-bold text-white">{exp.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{exp.subtitle}</div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-3">
                      {exp.suggestedDuration}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Dates & Details */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            {/* Date Picker */}
            <div className="md:col-span-5 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>3. Requested Shoot Date</span>
              </label>

              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
                />
              </div>

              <div className="text-[11px] text-slate-400 space-y-1 pt-1">
                <p className="flex items-center gap-1.5 text-emerald-400">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span><strong>Best Light:</strong> {currentDestination.bestLighting}</span>
                </p>
                <p className="text-slate-400 text-[10px]">
                  <strong>Seasons:</strong> {currentDestination.bestSeasons}
                </p>
              </div>
            </div>

            {/* Scope / Guest Count */}
            <div className="md:col-span-4 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Guest Count / Scope</span>
              </label>
              <select
                value={guestCount}
                onChange={e => setGuestCount(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
              >
                <option value="Editorial Portraits">Editorial Portraits (Solo / Fashion / Brand)</option>
                <option value="Couples Portraits">Couples Portraits (Engagement / Honeymoon)</option>
                <option value="Just Couple (Elopement)">Just Couple (Elopement)</option>
                <option value="Intimate (< 25 Guests)">Intimate Gathering (&lt; 25 Guests)</option>
                <option value="Classic (30 – 80 Guests)">Classic Celebration (30 – 80 Guests)</option>
                <option value="Grand (80 – 150+ Guests)">Grand Destination Wedding (80 – 150+ Guests)</option>
                <option value="Commercial / Full Property">Full Property / Commercial Retreat</option>
              </select>
              <p className="text-[10px] text-slate-400">
                Helps determine creative direction, crew &amp; timing requirements.
              </p>
            </div>

            {/* Venue or Vision notes */}
            <div className="md:col-span-3 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Venue or Villa (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Medina Palms, Shela Villa, Che Shale..."
                value={specialNotes}
                onChange={e => setSpecialNotes(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 placeholder:text-slate-500"
              />
              <p className="text-[10px] text-slate-400">
                Any specific coastal venue in mind.
              </p>
            </div>
          </div>

          {/* Step 4: Summary Card & Instant Action */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 flex flex-col md:flex-row items-center justify-between gap-5 shadow-xl">
            <div className="space-y-1.5 text-left w-full md:w-auto">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Availability Check</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {currentExperience.title} in {currentDestination.name}
              </h3>
              <p className="text-xs text-slate-300">
                Requested Date: <strong className="text-white">{formattedDate}</strong> · Direct WhatsApp consultation with Mwabonje
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
              {/* WhatsApp Action Button */}
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="px-6 py-3 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#25D366]/20 transition-all hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"
              >
                {/* WhatsApp SVG */}
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.004 2C6.479 2 2 6.48 2 12.006c0 1.91.536 3.738 1.554 5.32L2.09 22.09l4.908-1.42a9.96 9.96 0 0 0 5.006 1.34h.004c5.524 0 10.003-4.48 10.003-10.005 0-2.67-1.04-5.18-2.93-7.07A9.94 9.94 0 0 0 12.004 2zm5.834 14.195c-.244.686-1.417 1.31-1.954 1.393-.505.077-1.157.11-1.874-.12-.435-.14-1-.326-1.72-.638-3.04-1.315-5.02-4.385-5.17-4.587-.15-.202-1.233-1.64-1.233-3.13 0-1.49.78-2.222 1.057-2.525.277-.302.604-.378.805-.378.2 0 .403.002.58.01.187.01.436-.07.68.518.252.605.856 2.094.932 2.245.076.15.126.328.025.53-.1.201-.151.327-.302.503-.15.177-.318.394-.453.529-.151.15-.31.313-.134.614.177.302.784 1.293 1.68 2.092 1.152 1.026 2.122 1.344 2.424 1.494.302.152.479.127.655-.075.177-.202.756-.88 1.008-1.182.251-.303.503-.252.855-.126.353.126 2.238 1.057 2.62 1.25.38.192.633.287.726.448.093.161.093.931-.151 1.617z"/>
                </svg>
                <span>Check Dates on WhatsApp</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </button>

              {/* Email Option */}
              <button
                type="button"
                onClick={handleOpenEmail}
                className="px-4 py-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                Send via Email
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
