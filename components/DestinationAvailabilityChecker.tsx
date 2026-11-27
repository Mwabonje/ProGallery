import React, { useState, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  MapPin,
  Check,
  Clock,
  Users,
  ArrowRight,
  Mail,
  Sun,
  User,
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
  const dateInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

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
  const [clientName, setClientName] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
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

  const normalizedClientName = clientName.trim().replace(/\s+/g, ' ');
  const nameParts = normalizedClientName
    .split(' ')
    .filter(part => /[a-zA-Z\u00C0-\u024F]/.test(part));
  const hasTwoNames = nameParts.length >= 2;

  // Construct instant WhatsApp message
  const whatsappMessage = (() => {
    let text = `Hi Mike!\n`;
    text += `I would love to check your availability for a photoshoot:\n`;
    if (normalizedClientName) {
      text += `• Name: ${normalizedClientName}\n`;
    }
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

  const ensureValidClientName = () => {
    if (!hasTwoNames) {
      setNameError('Please enter at least 2 names (e.g. First & Last name) before sending.');
      nameInputRef.current?.focus();
      nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    setNameError('');
    return true;
  };

  const handleOpenWhatsApp = () => {
    if (!ensureValidClientName()) return;
    const baseUrl = formatWhatsappUrl(whatsappLink);
    const targetUrl = `${baseUrl}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenEmail = () => {
    if (!ensureValidClientName()) return;
    const subject = encodeURIComponent(`${currentExperience.title} Inquiry (${normalizedClientName}) — ${currentDestination.name} (${formattedDate})`);
    const body = encodeURIComponent(whatsappMessage);
    window.location.href = `mailto:info@mwabonje.co.ke?subject=${subject}&body=${body}`;
  };

  return (
    <div className="w-full not-prose font-sans">
      <div className="rounded-2xl bg-[#F3EFE6] dark:bg-[#111722] text-slate-900 dark:text-slate-100 border border-slate-900/12 dark:border-white/10 shadow-sm overflow-hidden">
        {/* Editorial Section Header */}
        <header className="px-6 sm:px-10 md:px-12 pt-8 sm:pt-10 pb-7 sm:pb-8 text-center bg-[#EBE4D6]/65 dark:bg-[#141c2b]/70 border-b border-slate-900/10 dark:border-white/10">
          <div className="max-w-2xl mx-auto space-y-3">
            <p className="text-[11px] font-sans font-semibold tracking-[0.26em] uppercase text-emerald-800 dark:text-emerald-400">
              Kenya Coast Destination Booking
            </p>

            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-slate-900 dark:text-white leading-[1.12] [text-wrap:balance]">
              Check Date &amp; <em className="italic font-light">Destination</em> Availability
            </h2>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-light leading-relaxed max-w-xl mx-auto">
              Planning a sun-drenched wedding, oceanfront villa campaign, or private lifestyle session along Kenya’s coastline? Select your details below to check dates and connect with the studio immediately.
            </p>
          </div>
        </header>

        {/* Editorial Steps Flow */}
        <div className="px-4 sm:px-9 md:px-12 py-7 sm:py-9 space-y-8 sm:space-y-9">
          {/* Step 1: Destination Selection */}
          <section aria-labelledby="availability-step-destination" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-2.5 border-b border-slate-900/[0.08] dark:border-white/[0.08]">
              <h3
                id="availability-step-destination"
                className="text-xs font-sans font-semibold uppercase tracking-[0.18em] text-slate-800 dark:text-slate-200 flex items-center gap-2"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                <span>01 · Select Destination</span>
              </h3>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-light">
                Currently selected: <strong className="font-medium text-emerald-800 dark:text-emerald-400">{currentDestination.name}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
              {DESTINATIONS.map((dest, idx) => {
                const isSelected = selectedDestId === dest.id;

                return (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => setSelectedDestId(dest.id)}
                    aria-pressed={isSelected}
                    className={`group p-4 sm:p-4.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:focus-visible:ring-emerald-400 ${
                      isSelected
                        ? 'bg-[#E6EFE9] dark:bg-emerald-950/25 border-emerald-700 dark:border-emerald-500 ring-1 ring-emerald-700/15 dark:ring-emerald-500/25'
                        : 'bg-[#FAF7F1] dark:bg-[#0f1623] border-slate-900/12 dark:border-white/10 hover:border-slate-900/25 dark:hover:border-white/25 hover:bg-[#FDFBF7] dark:hover:bg-[#141c2b]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span
                          className={`text-[11px] font-sans font-medium tracking-[0.2em] tabular-nums ${
                            isSelected
                              ? 'text-emerald-800 dark:text-emerald-400'
                              : 'text-slate-500 dark:text-slate-500'
                          }`}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${
                            isSelected
                              ? 'bg-emerald-700 border-emerald-700 text-white'
                              : 'border-slate-400/70 dark:border-slate-600 bg-transparent'
                          }`}
                          aria-hidden="true"
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </span>
                      </div>

                      <div className="font-serif text-lg sm:text-xl font-medium text-slate-900 dark:text-white leading-snug tracking-tight">
                        {dest.shortLabel}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-light leading-relaxed mt-1">
                        {dest.tagline}
                      </p>
                    </div>

                    <div className="mt-3.5 pt-2.5 border-t border-slate-900/[0.07] dark:border-white/[0.08] flex items-center justify-between text-[11px] font-medium tracking-[0.14em] uppercase">
                      <span
                        className={
                          isSelected
                            ? 'text-emerald-800 dark:text-emerald-400 font-semibold'
                            : 'text-slate-500 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-300 transition-colors'
                        }
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </span>
                      <ArrowRight
                        className={`w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 ${
                          isSelected
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-300'
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 2: Editorial Shoot Experience Selection */}
          <section aria-labelledby="availability-step-experience" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-2.5 border-b border-slate-900/[0.08] dark:border-white/[0.08]">
              <h3
                id="availability-step-experience"
                className="text-xs font-sans font-semibold uppercase tracking-[0.18em] text-slate-800 dark:text-slate-200"
              >
                02 · Choose Shoot Experience
              </h3>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-light">
                Selected: <strong className="font-medium text-emerald-800 dark:text-emerald-400">{currentExperience.title}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-3.5">
              {SHOOT_EXPERIENCES.map((exp, idx) => {
                const isSelected = selectedExperienceId === exp.id;
                return (
                  <button
                    key={exp.id}
                    type="button"
                    aria-pressed={isSelected}
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
                      } else if (
                        exp.id === 'wedding' &&
                        (guestCount === 'Editorial Portraits' ||
                          guestCount === 'Couples Portraits' ||
                          guestCount === 'Commercial / Full Property')
                      ) {
                        setGuestCount('Classic (30 – 80 Guests)');
                      }
                    }}
                    className={`p-4 sm:p-4.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:focus-visible:ring-emerald-400 ${
                      isSelected
                        ? 'bg-[#E6EFE9] dark:bg-emerald-950/25 border-emerald-700 dark:border-emerald-500 ring-1 ring-emerald-700/15 dark:ring-emerald-500/25'
                        : 'bg-[#FAF7F1] dark:bg-[#0f1623] border-slate-900/12 dark:border-white/10 hover:border-slate-900/25 dark:hover:border-white/25 hover:bg-[#FDFBF7] dark:hover:bg-[#141c2b]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span
                          className={`text-[11px] font-sans font-medium tracking-[0.2em] tabular-nums ${
                            isSelected
                              ? 'text-emerald-800 dark:text-emerald-400'
                              : 'text-slate-500 dark:text-slate-500'
                          }`}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${
                            isSelected
                              ? 'bg-emerald-700 border-emerald-700 text-white'
                              : 'border-slate-400/70 dark:border-slate-600 bg-transparent'
                          }`}
                          aria-hidden="true"
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </span>
                      </div>

                      <div className="font-serif text-lg font-medium text-slate-900 dark:text-white leading-snug">
                        {exp.title}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 font-light leading-relaxed mt-1">
                        {exp.subtitle}
                      </div>
                    </div>

                    <div className="mt-3.5 pt-2.5 border-t border-slate-900/[0.07] dark:border-white/[0.08] text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {exp.suggestedDuration}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 3: Refined Enquiry Details */}
          <section aria-labelledby="availability-step-details" className="space-y-5">
            <div className="pb-2.5 border-b border-slate-900/[0.08] dark:border-white/[0.08]">
              <h3
                id="availability-step-details"
                className="text-xs font-sans font-semibold uppercase tracking-[0.18em] text-slate-800 dark:text-slate-200"
              >
                03 · Your Session Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-start">
              {/* Client Full Name (Required: at least 2 names) */}
              <div className="space-y-1.5">
                <label
                  htmlFor="availability-client-name"
                  className="text-[11px] font-sans font-semibold uppercase tracking-[0.16em] text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                  <span>Your Full Name <span className="text-rose-600 dark:text-rose-400">*</span></span>
                </label>
                <input
                  ref={nameInputRef}
                  id="availability-client-name"
                  type="text"
                  required
                  placeholder="e.g. Amina Hassan"
                  value={clientName}
                  onChange={e => {
                    const val = e.target.value;
                    setClientName(val);
                    const parts = val.trim().replace(/\s+/g, ' ').split(' ').filter(p => /[a-zA-Z\u00C0-\u024F]/.test(p));
                    if (parts.length >= 2 && nameError) {
                      setNameError('');
                    }
                  }}
                  aria-invalid={Boolean(nameError)}
                  className={`w-full px-4 py-3 text-sm bg-[#FAF7F1] dark:bg-[#0b0f17] border rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors ${
                    nameError
                      ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-600'
                      : 'border-slate-900/15 dark:border-slate-700 focus:ring-emerald-700/15 focus:border-emerald-700 dark:focus:border-emerald-500'
                  }`}
                />
                {nameError ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                    {nameError}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-light">
                    Enter at least 2 names (e.g. First &amp; Last name).
                  </p>
                )}
              </div>

              {/* Date Picker */}
              <div className="space-y-1.5">
                <label
                  htmlFor="availability-shoot-date"
                  className="text-[11px] font-sans font-semibold uppercase tracking-[0.16em] text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                  <span>Requested Shoot Date</span>
                </label>

                <div
                  className="relative cursor-pointer"
                  onClick={() => {
                    try {
                      dateInputRef.current?.showPicker?.();
                    } catch {
                      // Fallback for browsers that already handle native click
                    }
                  }}
                >
                  <input
                    id="availability-shoot-date"
                    ref={dateInputRef}
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-[#FAF7F1] dark:bg-[#0b0f17] border border-slate-900/15 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700/15 focus:border-emerald-700 dark:focus:border-emerald-500 [color-scheme:light] dark:[color-scheme:dark] cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:p-1 [&::-webkit-calendar-picker-indicator]:rounded-md [&::-webkit-calendar-picker-indicator]:opacity-75 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 transition-colors"
                  />
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 font-light">
                  Flexible? Pick an approximate date and note your preferred window.
                </p>
              </div>

              {/* Scope / Guest Count */}
              <div className="space-y-1.5">
                <label
                  htmlFor="availability-guest-count"
                  className="text-[11px] font-sans font-semibold uppercase tracking-[0.16em] text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                  <span>Guest Count / Scope</span>
                </label>
                <select
                  id="availability-guest-count"
                  value={guestCount}
                  onChange={e => setGuestCount(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-[#FAF7F1] dark:bg-[#0b0f17] border border-slate-900/15 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700/15 focus:border-emerald-700 dark:focus:border-emerald-500 transition-colors"
                >
                  <option value="Editorial Portraits">Editorial Portraits (Solo / Fashion / Brand)</option>
                  <option value="Couples Portraits">Couples Portraits (Engagement / Honeymoon)</option>
                  <option value="Just Couple (Elopement)">Just Couple (Elopement)</option>
                  <option value="Intimate (< 25 Guests)">Intimate Gathering (&lt; 25 Guests)</option>
                  <option value="Classic (30 – 80 Guests)">Classic Celebration (30 – 80 Guests)</option>
                  <option value="Grand (80 – 150+ Guests)">Grand Destination Wedding (80 – 150+ Guests)</option>
                  <option value="Commercial / Full Property">Full Property / Commercial Retreat</option>
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-light">
                  Helps determine creative direction, crew &amp; timing requirements.
                </p>
              </div>

              {/* Venue or Vision notes */}
              <div className="space-y-1.5">
                <label
                  htmlFor="availability-venue-notes"
                  className="text-[11px] font-sans font-semibold uppercase tracking-[0.16em] text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <span>Venue or Villa (Optional)</span>
                </label>
                <input
                  id="availability-venue-notes"
                  type="text"
                  placeholder="e.g. Medina Palms, Shela Villa, Che Shale..."
                  value={specialNotes}
                  onChange={e => setSpecialNotes(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-[#FAF7F1] dark:bg-[#0b0f17] border border-slate-900/15 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700/15 focus:border-emerald-700 dark:focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-light">
                  Any specific coastal venue in mind.
                </p>
              </div>
            </div>

            {/* Editorial Lighting & Seasonal Photography Guidance */}
            <div className="rounded-xl bg-[#EAE3D5]/75 dark:bg-[#0b0f17]/75 border border-slate-900/10 dark:border-white/10 p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-3.5 border-b border-slate-900/[0.08] dark:border-white/[0.08]">
                <div>
                  <span className="text-[10.5px] font-sans font-semibold uppercase tracking-[0.22em] text-emerald-800 dark:text-emerald-400 block">
                    Studio Light &amp; Season Notes
                  </span>
                  <h4 className="font-serif text-xl sm:text-2xl font-normal text-slate-900 dark:text-white mt-0.5">
                    Photographing in {currentDestination.name}
                  </h4>
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-light">
                  {currentDestination.weddingVibe}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Recommended Golden Light</span>
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-light leading-relaxed">
                    {currentDestination.bestLighting}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.16em] text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                    <span>Seasonal Conditions</span>
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                    {currentDestination.bestSeasons}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Step 4: Personalised Availability Summary & Direct Enquiry Actions */}
          <section
            aria-label="Enquiry summary and studio contact"
            className="rounded-xl bg-[#E7DFD0]/90 dark:bg-[#151c28] border border-slate-900/12 dark:border-white/10 p-4 sm:p-7"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-8">
              <div className="space-y-4 flex-1 min-w-0">
                <div>
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.22em] text-emerald-800 dark:text-emerald-400">
                    Personalised Enquiry Summary
                  </p>
                  <h3 className="font-serif text-2xl sm:text-3xl font-normal text-slate-900 dark:text-white tracking-tight mt-1 [text-wrap:balance]">
                    {currentExperience.title} in {currentDestination.name}
                  </h3>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3.5 border-t border-slate-900/10 dark:border-white/10 text-sm">
                  <div>
                    <dt className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400">
                      Destination
                    </dt>
                    <dd className="mt-0.5 font-medium text-slate-900 dark:text-white">
                      {currentDestination.name}, Kenya
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400">
                      Experience
                    </dt>
                    <dd className="mt-0.5 font-medium text-slate-900 dark:text-white">
                      {currentExperience.title}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400">
                      Requested Date
                    </dt>
                    <dd className="mt-0.5 font-medium text-emerald-800 dark:text-emerald-400">
                      {formattedDate}
                    </dd>
                  </div>
                </dl>

                <p className="text-xs text-slate-600 dark:text-slate-400 font-light">
                  Direct consultation with {brandName} Studio — confirm date openness and receive tailored photography packages.
                </p>
              </div>

              <div className="flex flex-col items-stretch sm:items-start lg:items-end gap-2.5 w-full lg:w-auto lg:shrink-0 min-w-0">
                <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto min-w-0">
                  {/* WhatsApp Action Button */}
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="w-full sm:w-auto max-w-full px-3.5 sm:px-7 py-3.5 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-[10.5px] sm:text-xs font-semibold tracking-[0.05em] sm:tracking-[0.14em] uppercase flex items-center justify-center gap-1.5 sm:gap-2.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer sm:whitespace-nowrap min-w-0"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current text-emerald-400 dark:text-emerald-700 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12.004 2C6.479 2 2 6.48 2 12.006c0 1.91.536 3.738 1.554 5.32L2.09 22.09l4.908-1.42a9.96 9.96 0 0 0 5.006 1.34h.004c5.524 0 10.003-4.48 10.003-10.005 0-2.67-1.04-5.18-2.93-7.07A9.94 9.94 0 0 0 12.004 2zm5.834 14.195c-.244.686-1.417 1.31-1.954 1.393-.505.077-1.157.11-1.874-.12-.435-.14-1-.326-1.72-.638-3.04-1.315-5.02-4.385-5.17-4.587-.15-.202-1.233-1.64-1.233-3.13 0-1.49.78-2.222 1.057-2.525.277-.302.604-.378.805-.378.2 0 .403.002.58.01.187.01.436-.07.68.518.252.605.856 2.094.932 2.245.076.15.126.328.025.53-.1.201-.151.327-.302.503-.15.177-.318.394-.453.529-.151.15-.31.313-.134.614.177.302.784 1.293 1.68 2.092 1.152 1.026 2.122 1.344 2.424 1.494.302.152.479.127.655-.075.177-.202.756-.88 1.008-1.182.251-.303.503-.252.855-.126.353.126 2.238 1.057 2.62 1.25.38.192.633.287.726.448.093.161.093.931-.151 1.617z" />
                    </svg>
                    <span>Check Dates on WhatsApp</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  </button>

                  {/* Email Option */}
                  <button
                    type="button"
                    onClick={handleOpenEmail}
                    className="w-full sm:w-auto max-w-full px-5 sm:px-6 py-3.5 rounded-full bg-[#FAF7F1] hover:bg-[#EFE9DC] dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-900 dark:text-white text-[11px] sm:text-xs font-semibold tracking-[0.08em] sm:tracking-[0.14em] uppercase border border-slate-900/15 dark:border-white/15 transition-colors cursor-pointer inline-flex items-center justify-center gap-2 sm:whitespace-nowrap min-w-0"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 shrink-0" aria-hidden="true" />
                    <span>Send via Email</span>
                  </button>
                </div>

                {nameError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium lg:text-right">
                    {nameError}
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
