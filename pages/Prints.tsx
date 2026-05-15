import React, { useEffect, useState } from 'react';
import { ArrowLeft, ShoppingCart, X, Check } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Gallery } from '../types';
import { getOptimizedImageUrl, rewriteUrlToR2 } from '../utils/formatters';

interface PrintItem {
    id: string;
    file_url: string;
    file_type: string;
    client_name: string;
    title: string;
    caption?: string;
    description?: string;
    print_size?: string;
    material?: string;
    price?: string;
}

export const Prints: React.FC = () => {
    const navigate = useNavigate();
    const [prints, setPrints] = useState<PrintItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
    const [photographerId, setPhotographerId] = useState<string | null>(null);
    const [cart, setCart] = useState<PrintItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const addToCart = (print: PrintItem) => {
        if (!cart.find(item => item.id === print.id)) {
            setCart([...cart, print]);
        }
    };

    const removeFromCart = (id: string) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const form = e.currentTarget;
        const formData = new FormData(form);

        try {
            const response = await fetch(form.action, {
                method: form.method,
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                setIsSuccess(true);
                setCart([]); // Clear cart on success
                setTimeout(() => {
                    setIsSuccess(false);
                    setIsCartOpen(false);
                }, 3000);
            } else {
                const data = await response.json();
                if (Object.hasOwn(data, 'errors')) {
                    alert(data["errors"].map((error: any) => error["message"]).join(", "));
                } else {
                    alert("Oops! There was a problem submitting your form");
                }
            }
        } catch (error) {
            alert("Oops! There was a problem submitting your form");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMediaLoad = (id: string, width: number, height: number) => {
        if (width && height && !aspectRatios[id]) {
            setAspectRatios(prev => ({
                ...prev,
                [id]: width / height
            }));
        }
    };

    useEffect(() => {
        const fetchPrints = async () => {
            try {
                // Fetch public galleries with category 'Prints'
                const { data: galleriesData, error } = await supabase
                    .from('galleries')
                    .select('id, client_name, title, photographer_id')
                    .ilike('category', 'prints')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                let allPrints: PrintItem[] = [];

                if (galleriesData && galleriesData.length > 0) {
                    setPhotographerId(galleriesData[0].photographer_id);
                    const galleryIds = galleriesData.map(g => g.id);
                    
                    const { data: files } = await supabase
                        .from('files')
                        .select('*')
                        .in('gallery_id', galleryIds)
                        .order('created_at', { ascending: false });
                        
                    if (files) {
                        const galleryNameMap = new Map(galleriesData.map(g => [g.id, g.client_name]));
                        const galleryTitleMap = new Map(galleriesData.map(g => [g.id, g.title]));
                        allPrints = files.map(f => ({
                            id: f.id,
                            file_url: f.file_url,
                            file_type: f.file_type,
                            client_name: galleryNameMap.get(f.gallery_id) || 'Print',
                            title: f.title || '',
                            caption: f.caption,
                            description: f.description,
                            print_size: f.print_size,
                            material: f.material,
                            price: f.price
                        }));
                    }
                }

                setPrints(allPrints);
            } catch (error) {
                console.error("Error loading prints:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPrints();
    }, []);

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-900 selection:text-white flex flex-col">
            <header className="w-full flex items-center justify-between p-4 md:p-8 bg-white border-b border-slate-100 sticky top-0 z-50 transition-all duration-300">
                <button 
                    onClick={() => {
                        if (window.history.state && window.history.state.idx > 0) {
                            navigate(-1);
                        } else if (photographerId) {
                            navigate(`/p/${photographerId}`);
                        } else {
                            navigate('/');
                        }
                    }}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors text-xs tracking-widest font-bold"
                >
                    <ArrowLeft className="w-4 h-4" />
                    BACK
                </button>
                <div className="font-serif tracking-widest uppercase text-xl font-bold flex-1 text-center pr-16 md:pr-[70px]">
                    PRINTS
                </div>
            </header>

            <main className="flex-1 max-w-[1400px] mx-auto w-full p-6 md:p-12">
                <div className="flex flex-col items-center justify-center text-center mb-12 md:mb-16">
                    <h1 className="text-2xl md:text-4xl font-serif tracking-widest uppercase text-slate-800 mb-4 font-bold">
                        Fine Art Prints
                    </h1>
                    <p className="max-w-xl text-slate-500 leading-relaxed text-sm md:text-base">
                        A curated collection of archival quality prints from my portfolio collections. 
                        Each piece is printed on museum-grade cotton rag paper to ensure longevity and exceptional color reproduction.
                    </p>
                </div>

                {loading ? (
                    <div className="h-[40vh] flex items-center justify-center">
                        <div className="animate-pulse tracking-[0.2em] uppercase text-xs text-slate-400 font-medium">Loading Prints...</div>
                    </div>
                ) : prints.length > 0 ? (
                    <div className="flex flex-wrap justify-center items-stretch gap-12 lg:gap-20 pt-4 md:pt-8 w-full max-w-[1600px] mx-auto">
                        {[]
                            .concat(prints.filter(p => aspectRatios[p.id] && aspectRatios[p.id] > 1))
                            .concat(prints.filter(p => aspectRatios[p.id] && aspectRatios[p.id] <= 1))
                            .concat(prints.filter(p => !aspectRatios[p.id]))
                            .map((print) => {
                            const aspect = aspectRatios[print.id];
                            
                            let mediaClass = "max-h-[40vh] lg:max-h-[45vh] max-w-[75vw] md:max-w-[45vw] lg:max-w-[30vw] xl:max-w-[25vw] w-auto h-auto block object-contain shadow-sm transition-opacity duration-300";
                            
                            if (aspect) {
                                const isLandscape = aspect > 1;
                                if (isLandscape) {
                                    mediaClass = "w-[75vw] md:w-[40vw] lg:w-[30vw] xl:w-[25vw] aspect-[3/2] object-cover block shadow-sm transition-opacity duration-300";
                                } else {
                                    mediaClass = "w-[60vw] md:w-[25vw] lg:w-[20vw] xl:w-[16vw] aspect-[2/3] object-cover block shadow-sm transition-opacity duration-300";
                                }
                            }

                            return (
                                <div 
                                    key={print.id}
                                    className="block relative flex flex-col items-center w-full md:w-auto px-4 md:px-0"
                                >
                                    <div className="bg-white border-[6px] md:border-[16px] border-[#151515] relative shadow-2xl flex items-center justify-center p-4 md:p-6 lg:p-8 w-fit shrink-0">
                                        <div className="relative shadow-[inset_0_0_1px_rgba(0,0,0,0.2)]">
                                            {print.file_type === 'video' ? (
                                                <video 
                                                    src={rewriteUrlToR2(print.file_url)} 
                                                    className={mediaClass}
                                                    muted playsInline loop autoPlay preload="metadata"
                                                    onContextMenu={(e) => e.preventDefault()}
                                                    style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                                                    onLoadedMetadata={(e) => handleMediaLoad(print.id, e.currentTarget.videoWidth, e.currentTarget.videoHeight)}
                                                    ref={(video) => {
                                                        if (video && video.readyState >= 1 && video.videoWidth) {
                                                            handleMediaLoad(print.id, video.videoWidth, video.videoHeight);
                                                        }
                                                    }}
                                                />
                                            ) : print.file_url ? (
                                                <img 
                                                    src={getOptimizedImageUrl(print.file_url, 1200, undefined, 85)} 
                                                    alt={print.client_name}
                                                    className={`${mediaClass} pointer-events-none`}
                                                    draggable={false}
                                                    onContextMenu={(e) => e.preventDefault()}
                                                    style={{ WebkitTouchCallout: 'none', userSelect: 'none', pointerEvents: 'none' }}
                                                    loading="lazy"
                                                    onLoad={(e) => handleMediaLoad(print.id, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
                                                    ref={(img) => {
                                                        if (img && img.complete && img.naturalWidth) {
                                                            handleMediaLoad(print.id, img.naturalWidth, img.naturalHeight);
                                                        }
                                                    }}
                                                />
                                            ) : null}
                                        </div>
                                    </div>
                                    {(print.title?.trim() || (print.description ?? print.caption)?.trim() || print.print_size?.trim() || print.material?.trim() || print.price?.trim()) ? (
                                        <div className="mt-5 md:mt-6 text-center w-0 min-w-full break-words">
                                            {print.title?.trim() && <h3 className="font-serif text-lg font-medium text-slate-900 mb-1">{print.title}</h3>}
                                            {(print.description ?? print.caption)?.trim() && (
                                                <p className="text-sm md:text-base text-slate-600 leading-relaxed font-serif italic">
                                                    {(print.description ?? print.caption ?? '').trim()}
                                                </p>
                                            )}
                                            {(print.print_size?.trim() || print.material?.trim()) && (
                                                <div className="text-xs text-slate-400 uppercase tracking-widest mt-3 flex flex-wrap justify-center items-center gap-2">
                                                    {print.print_size?.trim() && <span>{print.print_size}</span>}
                                                    {print.print_size?.trim() && print.material?.trim() && <span className="opacity-50">|</span>}
                                                    {print.material?.trim() && <span>{print.material}</span>}
                                                </div>
                                            )}
                                            {print.price?.trim() && (
                                                <p className="text-md font-bold text-amber-700 mt-2">{print.price}</p>
                                            )}
                                            
                                            <div className="mt-5 flex justify-center">
                                                {cart.find(c => c.id === print.id) ? (
                                                    <button className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold tracking-widest uppercase border border-emerald-200">
                                                        <Check className="w-3 h-3" /> Added to Cart
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => addToCart(print)} 
                                                        className="flex items-center justify-center gap-1.5 px-5 py-2 bg-slate-900 text-white rounded-full text-xs font-bold tracking-widest uppercase hover:bg-slate-800 transition-colors active:scale-[0.98] shadow-md border border-slate-900"
                                                    >
                                                        <ShoppingCart className="w-3.5 h-3.5" />
                                                        Add to Cart
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-[20vh] flex flex-col items-center justify-center text-center mt-12">
                        <div className="bg-slate-50 border border-slate-100 px-8 py-4 rounded-sm">
                            <p className="text-slate-400 tracking-[0.2em] text-[10px] uppercase font-bold">No prints available yet</p>
                        </div>
                    </div>
                )}
            </main>

            {/* Floating Cart Button */}
            {cart.length > 0 && (
                <button 
                    onClick={() => setIsCartOpen(true)}
                    className="fixed bottom-6 right-6 z-[60] bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center border-[3px] border-white/20"
                >
                    <ShoppingCart className="w-6 h-6" />
                    <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-md border-2 border-white">
                        {cart.length}
                    </span>
                </button>
            )}

            {/* Cart Modal / Sidebar */}
            {isCartOpen && (
                <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex justify-end">
                    <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right overflow-hidden">
                        <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                            <h2 className="font-serif text-2xl font-bold text-slate-900 flex items-center gap-3">
                                <ShoppingCart className="w-6 h-6" />
                                Your Cart
                            </h2>
                            <button 
                                onClick={() => setIsCartOpen(false)} 
                                className="p-2 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4">
                            {cart.length === 0 ? (
                                <div className="text-center text-slate-500 py-12 flex flex-col items-center justify-center h-full">
                                    <ShoppingCart className="w-12 h-12 text-slate-200 mb-4" />
                                    <p className="font-medium">Your cart is empty</p>
                                    <button 
                                        onClick={() => setIsCartOpen(false)}
                                        className="mt-4 text-sm text-slate-400 hover:text-slate-700 underline underline-offset-4"
                                    >   
                                        Continue browsing prints
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {cart.map(item => (
                                        <div key={item.id} className="flex gap-4 border border-slate-100 p-3 rounded-lg bg-slate-50 relative group">
                                            <div className="shrink-0">
                                                {item.file_type === 'video' ? (
                                                    <video 
                                                        src={rewriteUrlToR2(item.file_url)} 
                                                        className="w-20 h-20 md:w-24 md:h-24 object-cover rounded shadow-sm bg-slate-200"
                                                        muted playsInline
                                                    />
                                                ) : (
                                                    <img 
                                                        src={getOptimizedImageUrl(item.file_url, 200, undefined, 80)} 
                                                        alt={item.title || 'Print'} 
                                                        className="w-20 h-20 md:w-24 md:h-24 object-cover rounded shadow-sm bg-slate-200" 
                                                    />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 py-1 flex flex-col justify-center">
                                                <h4 className="font-serif font-medium text-slate-900 truncate">{item.title || item.client_name}</h4>
                                                <p className="text-xs text-slate-500 mt-1 truncate">{item.print_size} {item.material && `| ${item.material}`}</p>
                                                <p className="font-bold text-amber-700 mt-1.5">{item.price || 'Price on request'}</p>
                                            </div>
                                            <button 
                                                onClick={() => removeFromCart(item.id)} 
                                                className="absolute top-2 right-2 p-1.5 bg-white shadow-sm border border-slate-100 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-100 md:opacity-0 group-hover:opacity-100" 
                                                title="Remove Item"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="p-5 md:p-6 border-t border-slate-200 bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.02)] shrink-0">
                                {isSuccess ? (
                                    <div className="text-center py-6">
                                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Check className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-1">Request Sent!</h3>
                                        <p className="text-sm text-slate-500">We'll get back to you shortly.</p>
                                    </div>
                                ) : (
                                    <form action="https://formspree.io/f/mzdolwql" method="POST" onSubmit={handleFormSubmit} className="space-y-4">
                                        <input type="hidden" name="Order Details" value={cart.map(item => `Item: ${item.title || item.client_name}\nSize: ${item.print_size || 'N/A'}\nMaterial: ${item.material || 'N/A'}\nPrice: ${item.price || 'N/A'}\nID: ${item.id}\n---`).join('\n')} />
                                        
                                        <div className="space-y-3">
                                            <input type="text" name="name" required placeholder="Full Name" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-slate-900 focus:bg-white transition-colors text-sm" />
                                            <input type="email" name="email" required placeholder="Email Address" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-slate-900 focus:bg-white transition-colors text-sm" />
                                            <input type="tel" name="phone" placeholder="Phone Number (Optional)" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-slate-900 focus:bg-white transition-colors text-sm" />
                                            <textarea name="notes" placeholder="Delivery Address & Additional Notes" rows={3} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-slate-900 focus:bg-white transition-colors text-sm resize-none" />
                                        </div>
                                        
                                        <button 
                                            type="submit" 
                                            disabled={isSubmitting}
                                            className="w-full bg-slate-900 text-white font-medium py-3.5 rounded-md hover:bg-slate-800 transition-colors uppercase tracking-widest text-sm shadow-md mt-2 flex justify-center items-center gap-2 disabled:bg-slate-400 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? 'Sending Request...' : 'Submit Request'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
