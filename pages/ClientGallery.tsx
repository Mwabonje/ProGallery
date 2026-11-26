import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  Download,
  Clock,
  Lock,
  AlertCircle,
  X,
  ShieldAlert,
  FolderDown,
  Loader2,
  Mail,
  CheckCircle2,
  Heart,
  FileImage,
  FileVideo,
  Send,
  Eye,
  ArrowLeft,
  Image as ImageIcon,
  Edit2,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Layers,
  Calendar,
  MoreHorizontal,
  LayoutGrid,
  List,
  PlayCircle,
  ChevronDown,
  Link2Off,
} from "lucide-react";
import { supabase } from "../services/supabase";
import { Gallery, GalleryFile } from "../types";
import { generateSlug } from "../utils/slug";
import {
  formatCurrency,
  getTimeRemaining,
  getOptimizedImageUrl,
  isVideoMediaUrl,
  rewriteUrlToR2,
  getCleanGalleryTitle,
  getCleanGalleryDescription,
  getParentGalleryId,
  parseGalleryMetadata,
  getLockedExtraFileIds,
} from "../utils/formatters";
import { isRealPortfolioUrl, getThemedLookbookImages } from "../utils/portfolioImages";
import { getApiUrl } from "../utils/api";
import {
  LIGHTBOX_IMAGE_QUALITY,
  LIGHTBOX_IMAGE_SIZES,
  LIGHTBOX_IMAGE_WIDTHS,
  preloadResponsiveImage,
} from "../utils/imagePreloader";

import { Helmet } from "react-helmet-async";
import { PublicHeader } from "../components/PublicHeader";
import { ProgressiveImage } from "../components/ProgressiveImage";
import { GalleryLightbox } from "../components/GalleryLightbox";
// @ts-ignore
import JSZip from "jszip";
// @ts-ignore
import saveAs from "file-saver";

const HERO_IMAGE_WIDTHS = [640, 1024, 1536, 2048];
const GRID_PORTRAIT_WIDTHS = [320, 480, 720, 960];

const WatermarkOverlay = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="36" fill="rgba(255,255,255,0.32)" transform="rotate(-45 150 150)" letter-spacing="6">
            MWABONJE
        </text>
    </svg>`;
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return (
    <div
      className="absolute inset-0 pointer-events-none z-[8] select-none"
      style={{
        backgroundImage: `url("${dataUrl}")`,
        backgroundRepeat: "repeat",
        backgroundPosition: "center",
        backgroundSize: "220px 220px",
      }}
    />
  );
};

export const ClientGallery: React.FC = () => {
  const { galleryId, subGallerySlug } = useParams<{ galleryId: string; subGallerySlug?: string }>();
  const [searchParams] = useSearchParams();
  const subQuery = searchParams.get('sub');
  const navigate = useNavigate();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [parentGallery, setParentGallery] = useState<Gallery | null>(null);
  const [subGalleries, setSubGalleries] = useState<(Gallery & { coverUrl?: string | null; itemCount?: number })[]>([]);
  const [activeSubGallery, setActiveSubGallery] = useState<Gallery | null>(null);
  const [activeSubFiles, setActiveSubFiles] = useState<GalleryFile[]>([]);
  const [loadingSubFiles, setLoadingSubFiles] = useState<boolean>(false);
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [downloadedImageIds, setDownloadedImageIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showExtraImageModal, setShowExtraImageModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showBalanceWarningModal, setShowBalanceWarningModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  } | null>(null);
  const [showScreenshotWarning, setShowScreenshotWarning] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const deliveryProgressRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let rafId: number | null = null;
    const isPortfolioMode = Boolean(
      gallery?.category &&
      gallery.category.trim() !== "" &&
      gallery.category.toLowerCase().trim() !== "delivery",
    );

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const totalScroll = document.documentElement.scrollTop || document.body.scrollTop;
        const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const progress = windowHeight > 0 ? Math.min(1, Math.max(0, totalScroll / windowHeight)) : 0;
        if (deliveryProgressRef.current) {
          deliveryProgressRef.current.style.transform = `scaleX(${progress})`;
        }
        if (isPortfolioMode) {
          setScrollProgress(progress);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [gallery?.category]);

  const [galleryPassword, setGalleryPassword] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [acceptedExtras, setAcceptedExtras] = useState(false);

  // Selection Mode State
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectionNotes, setSelectionNotes] = useState<Record<string, string>>(
    {},
  );
  const [submittingSelection, setSubmittingSelection] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPinInput, setUnlockPinInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [selectionSubmitted, setSelectionSubmitted] = useState(false);
  const [viewFilter, setViewFilter] = useState<
    "all" | "selected" | "main" | "extras" | "videos"
  >("all");
  const [deliveryLayoutMode, setDeliveryLayoutMode] = useState<"grid" | "masonry">("grid");
  const [deliverySortOrder, setDeliverySortOrder] = useState<"newest" | "oldest" | "edited">("newest");
  const [showDeliveryMoreMenu, setShowDeliveryMoreMenu] = useState(false);
  const [localFavouriteIds, setLocalFavouriteIds] = useState<Set<string>>(new Set());
  const [failedFileIds, setFailedFileIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "info" | "download";
  } | null>(null);
  const [lightboxFile, setLightboxFile] = useState<GalleryFile | null>(null);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [portfolioNavList, setPortfolioNavList] = useState<Gallery[]>([]);
  const pendingNoteSaves = useRef<Promise<void>[]>([]);

  // Project Info States for Portfolio Mode (Cover + Title + Description)
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  // Download states
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatusText, setDownloadStatusText] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [singleDownloadStats, setSingleDownloadStats] = useState<{
    loaded: number;
    total: number;
  } | null>(null);
  const [readyZipModal, setReadyZipModal] = useState<{
    blob: Blob;
    url: string;
    name: string;
    count: number;
    skippedExtrasCount?: number;
    videoFiles?: GalleryFile[];
  } | null>(null);

  const horizontalRef = useRef<HTMLDivElement | null>(null);

  // Ref to cancel download if needed
  const abortControllerRef = useRef<AbortController | null>(null);
  const singleAbortControllerRef = useRef<AbortController | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeLoadIdRef = useRef<number>(0);

  const cancelSingleDownload = () => {
    if (singleAbortControllerRef.current) {
      singleAbortControllerRef.current.abort();
      setDownloadingId(null);
      setSingleDownloadStats(null);
    }
  };

  useEffect(() => {
    if (galleryId) {
      window.scrollTo({ top: 0, behavior: "auto" });
      setLoading(true);
      setError(null);
      setGallery(null);
      setParentGallery(null);
      setSubGalleries([]);
      setActiveSubGallery(null);
      setActiveSubFiles([]);
      setFiles([]);
      setLightboxFile(null);
      setHeroLoaded(false);
      setPortfolioNavList([]);
      setScrollProgress(0);
      setDownloadedImageIds([]);
      setLocalFavouriteIds(new Set());
      setFailedFileIds(new Set());
      setSelectedFileIds(new Set());
      setSelectionNotes({});
      setSelectionSubmitted(false);
      setShowBalanceWarningModal(false);
      setShowWelcomeModal(false);
      setGalleryPassword(null);
      setIsAuthenticated(false);
      setPasswordInput("");
      setPasswordError(false);
      setProjectTitle("");
      setProjectDescription("");

      const requestId = ++activeLoadIdRef.current;
      loadGallery(requestId);
      const storedDownloads = localStorage.getItem(`gallery_downloads_${galleryId}`);
      if (storedDownloads) {
        try {
          setDownloadedImageIds(JSON.parse(storedDownloads));
        } catch (e) {
          console.error('Failed to parse stored downloads', e);
        }
      }
      const storedFavourites = localStorage.getItem(`gallery_favourites_${galleryId}`);
      if (storedFavourites) {
        try {
          setLocalFavouriteIds(new Set(JSON.parse(storedFavourites)));
        } catch (e) {
          console.error('Failed to parse stored favourites', e);
        }
      }
    }
  }, [galleryId]);

  const toggleLocalFavourite = (file: GalleryFile) => {
    setLocalFavouriteIds((prev) => {
      const next = new Set(prev);
      const isNowFav = !next.has(file.id);
      if (isNowFav) {
        next.add(file.id);
        setToast({ message: "Saved to Favourites", type: "success" });
      } else {
        next.delete(file.id);
        setToast({ message: "Removed from Favourites", type: "info" });
      }
      setTimeout(() => setToast(null), 2000);
      if (galleryId) {
        try {
          localStorage.setItem(`gallery_favourites_${galleryId}`, JSON.stringify(Array.from(next)));
        } catch {}
      }
      return next;
    });
  };



  useEffect(() => {
    const el = horizontalRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        const isTrackpad = Math.abs(e.deltaY) < 40;
        if (isTrackpad) {
          el.scrollLeft += e.deltaY;
        } else {
          el.scrollBy({ left: Math.sign(e.deltaY) * 300, behavior: "smooth" });
        }
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [files, viewFilter]); // re-run when content renders

  // Network Optimization: Preconnect to Supabase Storage
  useEffect(() => {
    if (files.length > 0) {
      try {
        // Extract the hostname from the first file URL to preconnect
        const url = new URL(files[0].file_url);
        const origin = url.origin;

        // Check if link already exists
        if (
          !document.querySelector(`link[rel="preconnect"][href="${origin}"]`)
        ) {
          const link = document.createElement("link");
          link.rel = "preconnect";
          link.href = origin;
          document.head.appendChild(link);
        }
      } catch (e) {
        // Ignore URL parsing errors
      }
    }
  }, [files]);

  // Timer effect
  useEffect(() => {
    if (!files.length) return;

    // Find the earliest expiry date
    const firstFile = files[0];

    const updateTimer = () => {
      const timeData = getTimeRemaining(firstFile.expires_at);
      const { days, hours, minutes, seconds, expired } = timeData;
      setTimeLeft(timeData);
      if (expired) {
        setTimeRemaining("Expired");
      } else if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h`);
      } else {
        setTimeRemaining(`${hours}h ${minutes}m`);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [files]);

  // Anti-Screenshot & Right-Click Protection
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (
        (e.target as HTMLElement).tagName === "IMG" ||
        (e.target as HTMLElement).tagName === "VIDEO"
      ) {
        setShowScreenshotWarning(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        setShowScreenshotWarning(true);
        try {
          navigator.clipboard.writeText("");
        } catch (err) {}
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.key === "3" || e.key === "4" || e.key === "s")
      ) {
        setShowScreenshotWarning(true);
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Real-time synchronization for selections
  useEffect(() => {
    if (!gallery?.id || !gallery?.selection_enabled) return;

    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "selections",
          filter: `gallery_id=eq.${gallery.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setSelectedFileIds((prev) => {
              const next = new Set(prev);
              next.add(payload.new.file_id);
              return next;
            });
          } else if (payload.eventType === "DELETE") {
            setSelectedFileIds((prev) => {
              const next = new Set(prev);
              next.delete(payload.old.file_id);
              return next;
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gallery?.id, gallery?.selection_enabled]);

  const verifyPasswordOnServer = async (activeGalleryId: string, enteredPass: string): Promise<{ authorized: boolean; requiresPassword: boolean }> => {
    try {
      // 1. Try Netlify serverless function first (works on mwabonje.co.ke, netlify.app, etc.)
      let res = await fetch(`/.netlify/functions/verify-gallery-password?id=${activeGalleryId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeGalleryId, password: enteredPass })
      }).catch(() => null);

      // 2. Fallback to Express backend if 404 or failed
      if (!res || res.status === 404) {
        res = await fetch(`/api/gallery/${activeGalleryId}/verify-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: activeGalleryId, password: enteredPass })
        }).catch(() => null);
      }

      if (res) {
        if (res.ok) {
          const data = await res.json();
          return { authorized: true, requiresPassword: Boolean(data.requiresPassword) };
        } else if (res.status === 401) {
          return { authorized: false, requiresPassword: true };
        }
      }
    } catch (e) {
      console.warn("Server verification error, checking database RPC:", e);
    }

    // 3. Database RPC verification fallback (enforced on PostgreSQL side, never exposes plaintext)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('verify_gallery_password', {
        p_gallery_id: activeGalleryId,
        p_password: enteredPass
      });

      if (!rpcError && rpcData) {
        if (rpcData.valid === true) {
          return { authorized: true, requiresPassword: Boolean(rpcData.requires_password) };
        }
        return { authorized: false, requiresPassword: true };
      }
    } catch (e) {
      console.warn("Database RPC verification error:", e);
    }

    // Default to unauthorized on failure (NEVER assume open access on error)
    return { authorized: false, requiresPassword: true };
  };

  const loadGalleryFiles = async (activeGalleryId: string, galData: Gallery) => {
    let allFiles: GalleryFile[] = [];
    let hasMore = true;
    let offset = 0;
    const limit = 1000;

    while (hasMore) {
      const { data: fileData, error: fileError } = await supabase
        .from("files")
        .select("*")
        .eq("gallery_id", activeGalleryId)
        .neq("file_path", "GALLERY_PASSWORD") // NEVER load password record as photo
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: true })
        .range(offset, offset + limit - 1);

      if (fileError) throw fileError;

      if (fileData) {
        allFiles = [...allFiles, ...fileData];
        if (fileData.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      } else {
        hasMore = false;
      }
    }

    const isPortfolioGal = Boolean(
      galData.category && 
      galData.category.trim() !== "" && 
      galData.category.toLowerCase().trim() !== "delivery"
    );

    if (isPortfolioGal) {
      setFiles(allFiles);
    } else {
      if (allFiles.length === 0) {
        setError(
          "This gallery link has expired. Please contact the photographer to request access.",
        );
      } else {
        setFiles(allFiles);
      }
    }

    // Load Selections if enabled
    if (galData.selection_enabled) {
      const { data: selectionData } = await supabase
        .from("selections")
        .select("file_id, client_note")
        .eq("gallery_id", activeGalleryId)
        .order("created_at", { ascending: true });

      if (selectionData) {
        setSelectedFileIds(new Set(selectionData.map((s) => s.file_id)));
        const notes: Record<string, string> = {};
        selectionData.forEach((s) => {
          if (s.client_note) notes[s.file_id] = s.client_note;
        });
        setSelectionNotes(notes);
        if (
          selectionData.length === 0 &&
          galData.selection_limit > 0 &&
          galData.selection_status !== "submitted" &&
          galData.selection_status !== "completed"
        ) {
          setShowWelcomeModal(true);
        }
      }
    }
  };

  const loadSubGalleryFiles = async (subGal: Gallery) => {
    setLoadingSubFiles(true);
    try {
      const { data: fileData, error: fileError } = await supabase
        .from("files")
        .select("*")
        .eq("gallery_id", subGal.id)
        .neq("file_path", "GALLERY_PASSWORD")
        .order("created_at", { ascending: false });

      if (fileError) throw fileError;

      if (fileData && fileData.length > 0) {
        setActiveSubFiles(fileData);
      } else {
        setActiveSubFiles([]);
      }
    } catch (e) {
      console.warn("Failed to load sub-gallery files:", e);
    } finally {
      setLoadingSubFiles(false);
    }
  };

  const handleSelectSubGallery = (sub: (Gallery & { coverUrl?: string | null }) | null) => {
    setHeroLoaded(false);
    setActiveSubGallery(sub);
    if (sub) {
      loadSubGalleryFiles(sub);
      const subSlug = generateSlug(sub.client_name);
      const parentSlug = generateSlug(gallery?.client_name || '');
      if (parentSlug) {
        window.history.pushState({}, '', `/${parentSlug}/${subSlug}`);
      }
    } else {
      setActiveSubFiles([]);
      const parentSlug = generateSlug(gallery?.client_name || '');
      if (parentSlug) {
        window.history.pushState({}, '', `/${parentSlug}`);
      }
    }
  };

  const trackGalleryView = async (activeGalleryId: string, galData: Gallery) => {
    try {
      const viewedKey = `viewed_${activeGalleryId}`;
      if (!localStorage.getItem(viewedKey)) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || session.user.id !== galData.photographer_id) {
          await fetch(
            getApiUrl('/api/sys/interaction'),
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                galleryId: activeGalleryId,
                event: "view",
              }),
              keepalive: true,
            }
          ).catch(() => {});
        }
        localStorage.setItem(viewedKey, "true");
      }
    } catch (e) {
      console.warn("Failed to track view:", e);
    }
  };

  const loadGallery = async (requestId: number = activeLoadIdRef.current) => {
    const isStale = () => requestId !== activeLoadIdRef.current;
    try {
      if (!galleryId) return;

      let galData: Gallery | null = null;
      let galError: any = null;

      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          galleryId,
        );

      if (isUUID) {
        const { data, error } = await supabase
          .from("galleries")
          .select("*")
          .eq("id", galleryId)
          .single();
        galData = data;
        galError = error;
      } else {
        // It's a slug, fetch active galleries and find the matching one
        const { data, error } = await supabase
          .from("galleries")
          .select("*")
          .order("created_at", { ascending: false });

        if (data) {
          galData =
            data.find((g) => generateSlug(g.client_name) === galleryId) || null;
        }
        if (!galData && !error) {
          galError = new Error("Gallery not found");
        }
      }

      if (isStale()) return;

      if (galError || !galData) {
        setError("Gallery not found or accessed denied.");
        setLoading(false);
        return;
      }

      const activeGalleryId = galData.id;

      if (!galData.link_enabled) {
        setError(
          "This gallery link has been disabled by the photographer. Please contact the photographer for access.",
        );
        setLoading(false);
        return;
      }

      setGallery(galData);

      // Save gallery slug and ID in sessionStorage so returning to the main portfolio restores exact position
      try {
        const slug = generateSlug(galData.client_name);
        sessionStorage.setItem('portfolio_last_clicked_slug', slug);
        sessionStorage.setItem('portfolio_last_clicked_id', galData.id);
      } catch {}

      // Parse project title & description for portfolio view
      const cleanTitle = getCleanGalleryTitle(galData);
      const cleanDesc = getCleanGalleryDescription(galData);
      setProjectTitle(cleanTitle);
      setProjectDescription(cleanDesc);

      // Check if this gallery is itself a child of another gallery
      const parentId = getParentGalleryId(galData);
      if (parentId) {
        supabase
          .from("galleries")
          .select("*")
          .eq("id", parentId)
          .maybeSingle()
          .then(({ data: pData }) => {
            if (!isStale() && pData) setParentGallery(pData);
          });
      } else {
        setParentGallery(null);
      }

      // Check if this gallery has sub-galleries
      if (galData.photographer_id) {
        supabase
          .from("galleries")
          .select("*")
          .eq("photographer_id", galData.photographer_id)
          .order("created_at", { ascending: true })
          .then(async ({ data: allPhotogGals }) => {
            if (isStale()) return;
            if (allPhotogGals) {
              const topLevelPortfolio = allPhotogGals
                .filter(
                  g =>
                    g.link_enabled !== false &&
                    g.category &&
                    g.category.trim() !== '' &&
                    g.category.toLowerCase() !== 'delivery' &&
                    g.category !== 'SETTINGS' &&
                    g.category !== 'ABOUT' &&
                    g.category !== 'FAQ' &&
                    g.client_name !== '__FAQ__' &&
                    g.client_name !== '__ABOUT__' &&
                    g.client_name !== 'SITE_SETTINGS' &&
                    !getParentGalleryId(g)
                )
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              setPortfolioNavList(topLevelPortfolio);

              const children = allPhotogGals.filter(g => getParentGalleryId(g) === galData.id);
              if (children.length > 0) {
                const enrichedChildren = await Promise.all(
                  children.map(async (child) => {
                    const { data: cFiles } = await supabase
                      .from("files")
                      .select("file_url, file_type")
                      .eq("gallery_id", child.id)
                      .neq("file_path", "GALLERY_PASSWORD")
                      .order("created_at", { ascending: false });

                    const cover = cFiles && cFiles.length > 0 ? cFiles[0].file_url : null;
                    const count = cFiles ? cFiles.length : 0;
                    return {
                      ...child,
                      coverUrl: cover,
                      itemCount: count,
                    };
                  })
                );
                if (isStale()) return;
                setSubGalleries(enrichedChildren);

                // Auto-activate sub-gallery if subGallerySlug or ?sub= was supplied
                const targetSubSlug = subGallerySlug || subQuery;
                if (targetSubSlug) {
                  const matchedChild = enrichedChildren.find(
                    c => generateSlug(c.client_name) === targetSubSlug || c.id === targetSubSlug
                  );
                  if (matchedChild) {
                    setActiveSubGallery(matchedChild);
                    loadSubGalleryFiles(matchedChild);
                  }
                }
              } else {
                setSubGalleries([]);
              }
            }
          })
          .then(undefined, err => console.warn("Error fetching sub-galleries:", err));
      }

      // Helper to initialize authenticated gallery state
      const initAuthenticatedGallery = async (activeGalId: string, activeGal: Gallery) => {
        setIsAuthenticated(true);
        // Track analytics view only for authenticated viewers
        trackGalleryView(activeGalId, activeGal).catch(() => {});

        const agreedAmount = activeGal.agreed_balance || 0;
        const amountPaid = activeGal.amount_paid || 0;
        const balanceDue = Math.max(0, agreedAmount - amountPaid);

        if (
          balanceDue > 0 &&
          !(activeGal.category && activeGal.category.trim() !== "")
        ) {
          setShowBalanceWarningModal(true);
        }

        if (
          activeGal.selection_status === "submitted" ||
          activeGal.selection_status === "completed"
        ) {
          setSelectionSubmitted(true);
        }

        await loadGalleryFiles(activeGalId, activeGal);
      };

      // Security: Check if gallery requires password BEFORE fetching any files
      let requiresPassword = false;
      try {
        // Try Netlify function first (handles both custom domain and netlify.app)
        let statusRes = await fetch(`/.netlify/functions/verify-gallery-password?id=${activeGalleryId}`).catch(() => null);
        if (!statusRes || !statusRes.ok) {
          statusRes = await fetch(`/api/gallery/${activeGalleryId}/auth-status?id=${encodeURIComponent(activeGalleryId)}`).catch(() => null);
        }

        if (statusRes && statusRes.ok) {
          const sJson = await statusRes.json();
          requiresPassword = Boolean(sJson.requiresPassword);
        } else {
          // Check via database RPC if available
          const { data: rpcCheck } = await supabase.rpc('verify_gallery_password', {
            p_gallery_id: activeGalleryId,
            p_password: ''
          });
          if (rpcCheck) {
            requiresPassword = rpcCheck.requires_password !== false;
          } else {
            // Defensive check
            const { data: pwCheck } = await supabase
              .from("files")
              .select("id")
              .eq("gallery_id", activeGalleryId)
              .eq("file_path", "GALLERY_PASSWORD")
              .maybeSingle();
            requiresPassword = Boolean(pwCheck?.id);
          }
        }
      } catch (e) {
        console.warn("Password status check error:", e);
      }

      if (isStale()) return;
      setGalleryPassword(requiresPassword ? 'PROTECTED' : null);

      if (requiresPassword) {
        const savedAuth = sessionStorage.getItem(`auth_${activeGalleryId}`) || (galleryId ? sessionStorage.getItem(`auth_${galleryId}`) : null);
        if (savedAuth) {
          const verifyResult = await verifyPasswordOnServer(activeGalleryId, savedAuth);
          if (isStale()) return;
          if (verifyResult.authorized) {
            await initAuthenticatedGallery(activeGalleryId, galData);
            if (!isStale()) setLoading(false);
            return;
          }
        }
        // Password required and not yet verified: STOP here. DO NOT load files or private data.
        setIsAuthenticated(false);
        setFiles([]);
        setLoading(false);
        return;
      }

      // No password required: initialize authenticated session immediately
      await initAuthenticatedGallery(activeGalleryId, galData);
    } catch (err) {
      if (!isStale()) {
        console.error(err);
        setError("Error loading gallery.");
      }
    } finally {
      if (!isStale()) {
        setLoading(false);
      }
    }
  };

  const toggleSelection = async (file: GalleryFile) => {
    if (!gallery?.selection_enabled || selectionSubmitted) return;
    
    // Always track click on the file when interacted with
    trackFileClick(file.id);

    const isSelected = selectedFileIds.has(file.id);

    if (isSelected && file.is_edited) {
      setToast({ message: "This photo has already been edited and cannot be unselected.", type: "info" });
      return;
    }

    if (!isSelected && gallery.selection_limit && gallery.selection_limit > 0) {
      if (selectedFileIds.size >= gallery.selection_limit && !acceptedExtras) {
        const confirmExtras = window.confirm(
          `You have reached the agreed limit of ${gallery.selection_limit} photos.\n\nDo you wish to proceed and pay for the extras?`,
        );
        if (confirmExtras) {
          setAcceptedExtras(true);
        } else {
          return;
        }
      }
    }

    const newSet = new Set(selectedFileIds);

    // Optimistic UI Update
    if (isSelected) {
      newSet.delete(file.id);
      setToast({ message: "Removed from favorites", type: "info" });
    } else {
      if (gallery.selection_limit > 0 && selectedFileIds.size === gallery.selection_limit) {
        if (!window.confirm(`You have reached the agreed limit of ${gallery.selection_limit} photos. Any additional photos selected will be charged as extras.\n\nDo you wish to continue and pay for extras?`)) {
          return;
        }
      }
      newSet.add(file.id);
      setToast({ message: "Added to favorites", type: "success" });
    }
    setSelectedFileIds(newSet);

    // Auto hide toast
    setTimeout(() => setToast(null), 2000);

    try {
      if (isSelected) {
        // Remove from DB
        const { error } = await supabase
          .from("selections")
          .delete()
          .eq("gallery_id", gallery.id)
          .eq("file_id", file.id);
        if (error) throw error;
      } else {
        // Add to DB
        const { error } = await supabase
          .from("selections")
          .insert({ gallery_id: gallery.id, file_id: file.id });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error("Selection sync failed", err);
      // Revert on error
      setSelectedFileIds(selectedFileIds); // Revert to old state
      setToast({
        message:
          "Failed to update selection: " +
          (err?.message || JSON.stringify(err)),
        type: "info",
      });
    }
  };

  const updateSelectionNoteLocal = (fileId: string, note: string) => {
    setSelectionNotes((prev) => ({ ...prev, [fileId]: note }));
  };

  const saveSelectionNoteDb = async (fileId: string, note: string) => {
    if (!gallery) return;

    const savePromise = (async () => {
      try {
        // 1. Fetch existing created_at
        const { data: existingSelection, error: fetchError } = await supabase
          .from("selections")
          .select("created_at")
          .eq("gallery_id", gallery.id)
          .eq("file_id", fileId)
          .maybeSingle();
          
        if (fetchError) {
            console.error("Failed to fetch selection for note update", fetchError);
            return;
        }

        // 2. Delete existing
        const { error: delError } = await supabase
          .from("selections")
          .delete()
          .eq("gallery_id", gallery.id)
          .eq("file_id", fileId);

        if (delError) {
            console.error("Failed to delete selection for note update", delError);
            return;
        }

        // 3. Insert new with note and original created_at
        const { error: insertError } = await supabase
          .from("selections")
          .insert({
             gallery_id: gallery.id,
             file_id: fileId,
             client_note: note,
             ...(existingSelection?.created_at ? { created_at: existingSelection.created_at } : {})
          });

        if (insertError) {
          console.error("Failed to insert updated note", insertError);
        }
      } catch (err) {
        console.error("Error updating note", err);
      }
    })();
    pendingNoteSaves.current.push(savePromise);
    await savePromise;
  };

  const submitSelection = async () => {
    if (!gallery) return;

    let extraPhotos = 0;
    if (gallery.selection_limit && gallery.selection_limit > 0 && selectedFileIds.size > gallery.selection_limit) {
      extraPhotos = selectedFileIds.size - gallery.selection_limit;
    }
    
    const extraMessage = extraPhotos > 0 
      ? `\n\nYou have selected ${extraPhotos} extra photo${extraPhotos > 1 ? 's' : ''} which will be charged as extras.` 
      : "";

    if (
      !confirm(
        `Are you sure you want to submit your selection of ${selectedFileIds.size} photos?${extraMessage}\n\nThis will notify the photographer.`,
      )
    )
      return;

    setSubmittingSelection(true);
    try {
      await Promise.allSettled(pendingNoteSaves.current);
      const { error } = await supabase.rpc("submit_selection", {
        gallery_id: gallery.id,
      });

      if (error) throw error;

      setSelectionSubmitted(true);
      setGallery({
        ...gallery,
        selection_status: "submitted"
      });
      setLightboxFile(null);
      setShowWelcomeModal(false);
      setShowBalanceWarningModal(false);

      setToast({
        message: "Selection submitted! Your photographer has been notified.",
        type: "success",
      });
      setTimeout(() => setToast(null), 5000);
    } catch (err: any) {
      console.error(err);
      setToast({
        message:
          "Failed to submit selection: " + (err?.message || "Please try again."),
        type: "info",
      });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSubmittingSelection(false);
    }
  };

  const handleUnlockRequest = () => {
    setUnlockError('');
    setUnlockPinInput('');
    setShowUnlockModal(true);
  };

  const confirmUnlockSelection = async () => {
    if (!gallery) return;
    
    const expectedPin = gallery.id.split('-')[0].slice(0, 4).toUpperCase();
    if (unlockPinInput.toUpperCase() !== expectedPin) {
      setUnlockError('Incorrect PIN. Please contact your photographer.');
      return;
    }

    setShowUnlockModal(false);
    setSubmittingSelection(true);
    try {
      const { error } = await supabase.rpc("unsubmit_selection", {
        gallery_id: gallery.id,
      });
      if (error) throw error;
      setSelectionSubmitted(false);
      setGallery({ ...gallery, selection_status: "pending" });
      setToast({ message: "Selection unlocked for editing", type: "success" });
    } catch (err) {
      console.error("Error unsubmitting:", err);
      setToast({ message: "Failed to unlock selection", type: "info" });
    } finally {
      setSubmittingSelection(false);
    }
  };

  const handleDownload = async (file: GalleryFile) => {
    if (!gallery) return;

    if (gallery.selection_enabled) {
      setToast({
        message: "Downloads are disabled while Selection Mode is active.",
        type: "info",
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    if (isExtraLocked(file.id)) {
      setShowExtraImageModal(true);
      return;
    }

    if (isBalanceLocked(file.id)) {
      setShowPayModal(true);
      return;
    }

    const isVideo =
      file.file_type === "video" ||
      !!file.file_url.match(/\.(mp4|mov|webm|ogg)$/i);
    const defaultExt = isVideo ? ".mp4" : ".jpg";
    let fileName =
      file.title || file.file_path.split("/").pop() || `download${defaultExt}`;
    if (!fileName.includes(".")) {
      fileName += defaultExt;
    }

    const directUrl = rewriteUrlToR2(file.file_url);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const serverDownloadUrl = `/api/download?url=${encodeURIComponent(directUrl)}&name=${encodeURIComponent(fileName)}`;

    setDownloadingId(file.id);
    setSingleDownloadStats({ loaded: 0, total: 0 });
    singleAbortControllerRef.current = new AbortController();

    // Track the download for the limit
    setDownloadedImageIds((prev) => {
      if (prev.includes(file.id)) return prev;
      const next = [...prev, file.id];
      if (gallery.id)
        localStorage.setItem(
          `gallery_downloads_${gallery.id}`,
          JSON.stringify(next),
        );
      return next;
    });

    try {
      await supabase.rpc("increment_download", { row_id: file.id });
      trackFileClick(file.id);
    } catch (err) {
      console.warn("Analytics increment failed:", err);
    }

    try {
      const response = await fetch(directUrl, {
        signal: singleAbortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const contentLength = response.headers.get("content-length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;
      setSingleDownloadStats({ loaded, total });

      let blob: Blob;

      if (!response.body) {
        blob = await response.blob();
      } else {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          chunks.push(value);
          loaded += value.length;

          setSingleDownloadStats({ loaded, total });
        }

        blob = new Blob(chunks, {
          type:
            response.headers.get("content-type") ||
            (isVideo ? "video/mp4" : "image/jpeg"),
        });
      }

      // Priority 1 for Mobile: Native Web Share API
      // When navigator.share is called with a file, iOS brings up the system Share Sheet
      // with "Save Image" to save directly into Camera Roll / Apple Photos!
      if (
        isMobile &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function"
      ) {
        try {
          const fileObj = new File([blob], fileName, {
            type: blob.type || (isVideo ? "video/mp4" : "image/jpeg"),
          });
          if (navigator.canShare({ files: [fileObj] })) {
            await navigator.share({
              files: [fileObj],
              title: fileName,
            });
            setToast({
              message: "Photo ready! Saved to device.",
              type: "download",
            });
            setTimeout(() => setToast(null), 3000);
            return;
          }
        } catch (shareErr: any) {
          if (shareErr.name === "AbortError") {
            // User cancelled the share sheet intentionally
            return;
          }
          console.warn(
            "navigator.share failed, using direct download:",
            shareErr,
          );
        }
      }

      // Priority 2: Standard anchor download
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      link.target = "_self";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 3000);

      // On iOS Safari, if the programmatic click above was ignored due to user gesture expiry,
      // fallback to the server attachment endpoint:
      if (isIOS) {
        setTimeout(() => {
          const serverLink = document.createElement("a");
          serverLink.href = serverDownloadUrl;
          serverLink.download = fileName;
          document.body.appendChild(serverLink);
          serverLink.click();
          setTimeout(() => document.body.removeChild(serverLink), 2000);
        }, 300);
      }

      setToast({ message: "Download started!", type: "download" });
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) {
      if (e.name === "AbortError") {
        console.log("Download cancelled");
        return;
      }

      console.error(
        "Standard download failed, falling back to server route:",
        e,
      );

      // Robust fallback: trigger server route
      try {
        const fallbackLink = document.createElement("a");
        fallbackLink.href = serverDownloadUrl;
        fallbackLink.download = fileName;
        document.body.appendChild(fallbackLink);
        fallbackLink.click();
        setTimeout(() => document.body.removeChild(fallbackLink), 2000);

        setToast({
          message: "Download started via direct link!",
          type: "download",
        });
        setTimeout(() => setToast(null), 3000);
      } catch {
        setToast({
          message: "Download failed. Please check your connection.",
          type: "info",
        });
        setTimeout(() => setToast(null), 3000);
      }
    } finally {
      setDownloadingId(null);
      setSingleDownloadStats(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!gallery || !files.length) return;

    if (gallery.selection_enabled) {
      setToast({
        message: "Downloads are disabled while Selection Mode is active.",
        type: "info",
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const allActiveSource = activeSubGallery ? activeSubFiles : files;
    const unlockedActiveFiles = allActiveSource.filter((f) => !isExtraLocked(f.id));
    if (unlockedActiveFiles.length === 0) {
      setShowExtraImageModal(true);
      return;
    }

    if (!canDownloadAll) {
      setShowPayModal(true);
      return;
    }

    setDownloadingAll(true);
    setDownloadProgress(0);
    setDownloadStatusText("Preparing download...");
    abortControllerRef.current = new AbortController();

    try {
      const galleryName = gallery.client_name
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();

      const validFiles = allActiveSource.filter(
        (f) => !failedFileIds.has(f.id) && !isExtraLocked(f.id),
      );
      const skippedExtrasCount = allActiveSource.filter(
        (f) => !failedFileIds.has(f.id) && isExtraLocked(f.id),
      ).length;

      // Bulk increment download counts for unlocked files in the gallery
      const fileIds = validFiles.map((f) => f.id);
      try {
        await supabase.rpc("increment_downloads_bulk", { file_ids: fileIds });
        fileIds.forEach((id) => trackFileClick(id));
      } catch (err) {
        console.warn("Analytics increment failed:", err);
      }

      const zip = new JSZip();

      // Identify large videos (e.g. > 30MB) so we don't blow browser memory on mobile
      const videoFiles = validFiles.filter(
        (f) =>
          f.file_type === "video" ||
          f.file_url.match(/\.(mp4|mov|webm|ogg)$/i),
      );
      // Photos to include in ZIP: include all photos (exclude large video from in-memory ZIP so mobile Safari doesn't crash)
      const filesToZip = validFiles.filter(
        (f) =>
          f.file_type !== "video" &&
          !f.file_url.match(/\.(mp4|mov|webm|ogg)$/i),
      );

      const targetFiles = filesToZip.length > 0 ? filesToZip : validFiles;
      let globalProcessed = 0;
      const total = targetFiles.length;

      setDownloadStatusText(
        `Preparing ${targetFiles.length} photos for packaging...`,
      );

      const CONCURRENCY_LIMIT = 2; // Keep conservative concurrency to prevent mobile memory pressure
      const queue = [...targetFiles];
      const activePromises: Promise<void>[] = [];

      const processFile = async (file: GalleryFile) => {
        if (abortControllerRef.current?.signal.aborted) return;
        try {
          const directUrl = rewriteUrlToR2(file.file_url);
          const response = await fetch(directUrl, {
            signal: abortControllerRef.current?.signal,
          });
          if (!response.ok)
            throw new Error(`Failed to fetch ${file.file_path}`);
          const blob = await response.blob();
          const fileName =
            file.title ||
            file.file_path.split("/").pop() ||
            `file-${file.id}.jpg`;
          zip.file(fileName, blob);
        } catch (error: any) {
          if (error.name !== "AbortError") {
            console.error(`Error downloading file: ${file.id}`, error);
          }
        } finally {
          globalProcessed++;
          setDownloadProgress(Math.round((globalProcessed / total) * 100));
          setDownloadStatusText(
            `Packaging files (${globalProcessed}/${total})...`,
          );
        }
      };

      const next = async (): Promise<void> => {
        if (queue.length === 0) return;
        const file = queue.shift();
        if (file) {
          await processFile(file);
          await next();
        }
      };

      for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, targetFiles.length); i++) {
        activePromises.push(next());
      }

      await Promise.all(activePromises);

      if (abortControllerRef.current?.signal.aborted) return;

      setDownloadStatusText("Compressing archive... (almost done)");

      const content = await zip.generateAsync({
        type: "blob",
        compression: "STORE",
      });

      if (abortControllerRef.current?.signal.aborted) return;

      const zipName = `${galleryName}_photos.zip`;
      const blobUrl = window.URL.createObjectURL(content);

      // Attempt automatic download
      try {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = zipName;
        link.target = "_self";
        document.body.appendChild(link);
        link.click();
        setTimeout(() => document.body.removeChild(link), 3000);
      } catch (err) {
        console.warn("Auto link click error:", err);
      }

      // Present ready modal for 100% mobile and desktop reliability
      setReadyZipModal({
        blob: content,
        url: blobUrl,
        name: zipName,
        count: targetFiles.length,
        skippedExtrasCount,
        videoFiles: videoFiles,
      });

      setToast({
        message:
          skippedExtrasCount > 0
            ? `Your ZIP is ready! (${skippedExtrasCount} locked extra image${skippedExtrasCount === 1 ? "" : "s"} excluded pending payment)`
            : "Your gallery ZIP is ready!",
        type: "download",
      });
      setTimeout(() => setToast(null), 4000);

      // Log download all feature
      try {
        await supabase.from("activity_logs").insert({
          gallery_id: galleryId,
          action: `Client downloaded all ${files.length} photos`,
        });
      } catch (err) {}
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Error creating zip:", error);
        setToast({
          message:
            "Failed to package all files. Please try downloading individually.",
          type: "info",
        });
        setTimeout(() => setToast(null), 4000);
      }
    } finally {
      setDownloadingAll(false);
      setDownloadProgress(0);
      setDownloadStatusText("");
      abortControllerRef.current = null;
    }
  };

  const cancelDownloadAll = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setDownloadingAll(false);
      setDownloadStatusText("");
    }
  };

  const agreedAmount = gallery?.agreed_balance || 0;
  const amountPaid = gallery?.amount_paid || 0;
  const balanceDue = Math.max(0, agreedAmount - amountPaid);
  const isPortfolio = Boolean(
    gallery?.category && 
    gallery.category.trim() !== "" && 
    gallery.category.toLowerCase().trim() !== "delivery"
  );
  
  const isBalancePending = balanceDue > 0 && !isPortfolio;

  const lockedExtraIds = useMemo(() => {
    return new Set<string>([
      ...getLockedExtraFileIds(gallery),
      ...getLockedExtraFileIds(activeSubGallery),
    ]);
  }, [gallery, activeSubGallery]);

  const isExtraLocked = (fileId: string) => {
    if (isPortfolio) return false;
    return lockedExtraIds.has(fileId);
  };

  const downloadLimit = gallery?.downloads_before_clearing || 0;

  const isBalanceLocked = (fileId: string) => {
    if (!isBalancePending) return false;
    if (downloadLimit <= 0) return true;
    if (downloadedImageIds.includes(fileId)) return false;
    if (downloadedImageIds.length >= downloadLimit) return true;
    return false;
  };

  const unlockedForZipCount = files.filter((f) => !isExtraLocked(f.id)).length;
  const canDownloadAll =
    (!isBalancePending || downloadLimit >= unlockedForZipCount) &&
    unlockedForZipCount > 0;

  
  const getDisplayUrl = (file: GalleryFile, isLightbox = false) => {
    const legacyThumbnail = file.thumbnail_url;
    
    const computeWatermarkUrl = (url: string) => {
        if (!url) return url;
        const parts = url.split('/');
        const filename = parts.pop();
        if (!filename) return url;
        const baseName = filename.replace(/\.[^/.]+$/, "");
        return parts.join('/') + '/watermark_' + baseName + '.jpg';
    };

    if (isFileLocked(file.id) && !isPortfolio) {
        return legacyThumbnail || computeWatermarkUrl(file.file_url);
    }
    
    if (file.file_url && file.file_url.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
        return file.file_url;
    }
    
    return legacyThumbnail || computeWatermarkUrl(file.file_url);
  };

  const isFileLocked = (fileId: string) => {
    return isExtraLocked(fileId) || isBalanceLocked(fileId);
  };

  const isPortraitGallery =
    isPortfolio &&
    Boolean(
      gallery?.client_name.toLowerCase().includes("portrait") ||
      gallery?.category?.toLowerCase().includes("portrait") ||
      gallery?.client_name.toLowerCase().includes("couple") ||
      gallery?.category?.toLowerCase().includes("couple") ||
      gallery?.client_name.toLowerCase().includes("detail") ||
      gallery?.category?.toLowerCase().includes("detail"),
    );
  const isPrintsGallery =
    isPortfolio && Boolean(gallery?.category?.toLowerCase().includes("print"));
  const isFilmGallery =
    isPortfolio &&
    files.some(
      (f) =>
        f.file_type === "video" ||
        (f.file_url && f.file_url.match(/\.(mp4|mov|webm|ogg)$/i)),
    );
  const explicitGrid = isPortfolio && Boolean(gallery?.category?.toLowerCase().includes("[grid]"));
  const explicitSwipe = isPortfolio && Boolean(gallery?.category?.toLowerCase().includes("[swipe]"));
  const isHorizontalLayout = explicitSwipe;
  const isInstagramGrid = explicitGrid;
  const isMasonryPortfolio = isPortfolio && !explicitGrid && !explicitSwipe && !isHorizontalLayout;

  // Selection mode is not relevant for portfolio collections
  const isSelectionMode = !isPortfolio && gallery?.selection_enabled;
  const isSelectionLockedOut = Boolean(
    isSelectionMode &&
      (selectionSubmitted ||
        gallery?.selection_status === "submitted" ||
        gallery?.selection_status === "completed"),
  );

  const limit = gallery?.selection_limit || 0;
  const selectedArray = Array.from(selectedFileIds);
  const mainSelections =
    limit > 0 ? selectedArray.slice(0, limit) : selectedArray;
  const extraSelections = limit > 0 ? selectedArray.slice(limit) : [];

  const activeFilesSource = activeSubGallery ? activeSubFiles : files;
  const nonFailedFiles = useMemo(
    () => activeFilesSource.filter((f) => !failedFileIds.has(f.id)),
    [activeFilesSource, failedFileIds],
  );
  const deliveryPhotoCount = nonFailedFiles.length;
  const deliveryVideoCount = useMemo(
    () =>
      nonFailedFiles.filter(
        (f) => f.file_type === "video" || Boolean(f.file_url?.match(/\.(mp4|mov|webm|ogg)$/i)),
      ).length,
    [nonFailedFiles],
  );
  const deliveryFavouriteCount = isSelectionMode ? selectedFileIds.size : localFavouriteIds.size;
  const heroCoverFile = useMemo(
    () =>
      !isPortfolio && !isSelectionLockedOut
        ? nonFailedFiles.find(
            (f) =>
              f.file_type === "image" &&
              !f.file_url?.match(/\.(mp4|mov|webm|ogg)$/i) &&
              !lockedExtraIds.has(f.id),
          ) ||
          nonFailedFiles.find(
            (f) => f.file_type === "image" && !f.file_url?.match(/\.(mp4|mov|webm|ogg)$/i),
          ) ||
          nonFailedFiles[0] ||
          null
        : null,
    [isPortfolio, isSelectionLockedOut, nonFailedFiles, lockedExtraIds],
  );

  const displayedFiles = useMemo(() => {
    let list = nonFailedFiles;
    if (viewFilter === "selected") {
      list = isSelectionMode
        ? list.filter((f) => selectedFileIds.has(f.id))
        : list.filter((f) => localFavouriteIds.has(f.id));
    } else if (viewFilter === "main") {
      list = list.filter((f) => mainSelections.includes(f.id));
    } else if (viewFilter === "extras") {
      list = list.filter((f) => extraSelections.includes(f.id));
    } else if (viewFilter === "videos") {
      list = list.filter(
        (f) => f.file_type === "video" || Boolean(f.file_url?.match(/\.(mp4|mov|webm|ogg)$/i)),
      );
    } else {
      list = [...list];
    }

    if (!isPortfolio) {
      if (deliverySortOrder === "oldest") {
        list.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      } else if (deliverySortOrder === "edited") {
        list.sort((a, b) => Number(Boolean(b.is_edited)) - Number(Boolean(a.is_edited)));
      } else {
        list.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      }
    }
    return list;
  }, [
    nonFailedFiles,
    viewFilter,
    isSelectionMode,
    selectedFileIds,
    localFavouriteIds,
    mainSelections,
    extraSelections,
    isPortfolio,
    deliverySortOrder,
  ]);

  const setLightboxFileWithTracking = (file: GalleryFile | null) => {
    setLightboxFile(file);
    if (file) {
      supabase.rpc("update_file_v", { fid: file.id }).then(({ error }) => {
        if (error) console.error(error);
      });
    }
  };

  const trackFileClick = (fileId: string) => {
    supabase.rpc("update_file_c", { fid: fileId }).then(({ error }) => {
      if (error) console.error(error);
    });
  };

  const handleLongPressStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      if (!isPortfolio) {
        setShowScreenshotWarning(true);
      }
    }, 500); // 500ms for long press
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0b0f17]">
        <Helmet>
          <title>Client Gallery | Mwabonje</title>
          <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
          <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet" />
        </Helmet>
        <div className="w-8 h-8 relative flex items-center justify-center">
          <div className="absolute inset-0 border border-slate-100 rounded-full"></div>
          <div className="absolute inset-0 border border-slate-900 border-r-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0b0f17] p-4 text-center">
        <Helmet>
          <title>Client Gallery | Mwabonje</title>
          <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
          <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet" />
        </Helmet>
        <div className="bg-white dark:bg-[#151c28] p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 max-w-md w-full">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            {error.toLowerCase().includes("disabled") ? (
              <Link2Off className="w-8 h-8 text-slate-400" />
            ) : (
              <Clock className="w-8 h-8 text-slate-400" />
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
            {error.toLowerCase().includes("disabled") ? "Link Disabled" : "Gallery Unavailable"}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">{error}</p>
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <p className="text-sm text-slate-400">Mwabonje</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && galleryPassword) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0b0f17] p-4 text-center">
              <Helmet>
                  <title>Private Client Gallery | Mwabonje</title>
                  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
                  <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet" />
              </Helmet>
              <div className="bg-white dark:bg-[#151c28] p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 max-w-md w-full">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Lock className="w-8 h-8 text-slate-400" />
                  </div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                      Protected Gallery
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">Please enter the password to view this gallery.</p>
                  
                  <form onSubmit={async (e) => {
                      e.preventDefault();
                      const entered = passwordInput.trim();
                      if (!entered || !gallery?.id) return;
                      const verifyResult = await verifyPasswordOnServer(gallery.id, entered);
                      if (verifyResult.authorized) {
                          setIsAuthenticated(true);
                          sessionStorage.setItem(`auth_${gallery.id}`, entered);
                          if (galleryId) {
                              sessionStorage.setItem(`auth_${galleryId}`, entered);
                          }
                          setPasswordError(false);
                          setLoading(true);

                          // Run authenticated setup
                          trackGalleryView(gallery.id, gallery).catch(() => {});
                          const agreedAmount = gallery.agreed_balance || 0;
                          const amountPaid = gallery.amount_paid || 0;
                          if (agreedAmount - amountPaid > 0 && !(gallery.category && gallery.category.trim() !== "")) {
                            setShowBalanceWarningModal(true);
                          }
                          if (gallery.selection_status === "submitted" || gallery.selection_status === "completed") {
                            setSelectionSubmitted(true);
                          }

                          await loadGalleryFiles(gallery.id, gallery);
                          setLoading(false);
                      } else {
                          setPasswordError(true);
                      }
                  }} className="space-y-4">
                      <div>
                          <input 
                              type="password"
                              placeholder="Enter password"
                              value={passwordInput}
                              onChange={(e) => {
                                  setPasswordInput(e.target.value);
                                  setPasswordError(false);
                              }}
                              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-white ${passwordError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                          />
                          {passwordError && (
                              <p className="text-red-500 text-sm mt-2 text-left">Incorrect password. Please try again.</p>
                          )}
                      </div>
                      <button 
                          type="submit"
                          className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 p-3 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
                      >
                          Unlock Gallery
                      </button>
                  </form>
              </div>
          </div>
      );
  }

  const displayGalleryTitle = activeSubGallery 
    ? getCleanGalleryTitle(activeSubGallery)
    : (projectTitle || getCleanGalleryTitle(gallery));
  const displayGalleryDescription = activeSubGallery
    ? getCleanGalleryDescription(activeSubGallery)
    : (projectDescription || getCleanGalleryDescription(gallery));
  const parentCollectionTitle = parentGallery ? getCleanGalleryTitle(parentGallery) : getCleanGalleryTitle(gallery);

  const activeTopLevelGallery = parentGallery || gallery;
  const activePortfolioNavIndex = activeTopLevelGallery
    ? portfolioNavList.findIndex(g => g.id === activeTopLevelGallery.id)
    : -1;
  const prevPortfolioGallery =
    activePortfolioNavIndex > 0 ? portfolioNavList[activePortfolioNavIndex - 1] : null;
  const nextPortfolioGallery =
    activePortfolioNavIndex >= 0 && activePortfolioNavIndex < portfolioNavList.length - 1
      ? portfolioNavList[activePortfolioNavIndex + 1]
      : null;

  const editorialKicker = (() => {
    const rawCat =
      (activeSubGallery?.category || gallery?.category || "PORTFOLIO")
        .replace(/\s*\[(swipe|grid)\]/gi, "")
        .trim()
        .toUpperCase() || "PORTFOLIO";

    if (activeSubGallery && parentGallery) {
      return `${rawCat} / ${getCleanGalleryTitle(parentGallery).toUpperCase()}`;
    }
    if (activeSubGallery) {
      return `${rawCat} / ${getCleanGalleryTitle(gallery).toUpperCase()}`;
    }

    const haystack = `${displayGalleryTitle || ""} ${displayGalleryDescription || ""}`.toLowerCase();
    const knownPlaces: Array<[RegExp, string]> = [
      [/\blamu\b/, "LAMU, KENYA"],
      [/\bwatamu\b/, "WATAMU, KENYA"],
      [/\bmalindi\b/, "MALINDI, KENYA"],
      [/\bkilifi\b/, "KILIFI, KENYA"],
      [/\bdiani\b/, "DIANI, KENYA"],
      [/\bmombasa\b/, "MOMBASA, KENYA"],
      [/\bmida\b/, "MIDA CREEK, KENYA"],
      [/\bnairobi\b/, "NAIROBI, KENYA"],
    ];
    const matchedPlace = knownPlaces.find(([re]) => re.test(haystack));
    const locationLabel = matchedPlace ? matchedPlace[1] : "KENYAN COAST";
    return `${rawCat} / ${locationLabel}`;
  })();

  return (
    <div
      className={`min-h-screen ${isPortfolio ? "bg-[#FAF8F5] dark:bg-[#0b0f17]" : "bg-[#FAF7F2] dark:bg-[#0b0f17]"} text-slate-900 dark:text-slate-100 select-none ${
        isPortfolio ? "pb-0" : isSelectionMode ? "pb-24" : "pb-16"
      }`}
    >
      {/* Scroll Progress Bar for Client Galleries (GPU compositor transform, zero re-renders) */}
      {!isPortfolio && (
        <div className="fixed top-0 left-0 right-0 h-1 z-[100] pointer-events-none">
          <div
            ref={deliveryProgressRef}
            className="h-full w-full bg-emerald-500 origin-left"
            style={{ transform: "scaleX(0)" }}
          />
        </div>
      )}
      <Helmet>
        {isPortfolio ? (
          <>
            <title>{`${displayGalleryTitle} | Mwabonje Photography`}</title>
            <meta
              name="description"
              content={displayGalleryDescription || `Explore the ${displayGalleryTitle} photography collection by Mwabonje — capturing authentic lifestyle and documentary moments on the Kenyan coast.`}
            />
            <meta property="og:title" content={`${displayGalleryTitle} | Mwabonje Photography`} />
            <meta property="og:description" content={displayGalleryDescription || `Explore the ${displayGalleryTitle} photography collection by Mwabonje — capturing authentic lifestyle and documentary moments on the Kenyan coast.`} />
            <meta name="twitter:title" content={`${displayGalleryTitle} | Mwabonje Photography`} />
            <meta name="twitter:description" content={displayGalleryDescription || `Explore the ${displayGalleryTitle} photography collection by Mwabonje — capturing authentic lifestyle and documentary moments on the Kenyan coast.`} />
          </>
        ) : (
          <>
            <title>{isAuthenticated ? `${displayGalleryTitle} | Client Gallery` : "Private Client Gallery | Mwabonje"}</title>
            <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
            <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet" />
          </>
        )}
      </Helmet>

      {/* Navigation Header */}
      {isPortfolio ? (
        <PublicHeader
          activeNav={gallery?.category?.toLowerCase().includes("film") ? "films" : "portfolio"}
          scrollProgress={scrollProgress * 100}
          isGalleryView={true}
          currentGallerySlug={generateSlug((parentGallery || gallery)?.client_name || "")}
        />
      ) : (
        /* Editorial Client Delivery Hero Banner + Overlay Top Navigation */
        <header className="relative w-full min-h-[410px] sm:min-h-[470px] lg:min-h-[520px] flex flex-col justify-between overflow-hidden bg-[#241D18] text-white">
          {/* Background Cover Photography (hidden completely when selection is submitted) */}
          {heroCoverFile && !isSelectionLockedOut ? (
            <div
              className="absolute inset-0 z-0"
              onContextMenu={(e) => {
                e.preventDefault();
                setShowScreenshotWarning(true);
              }}
            >
              {heroCoverFile.file_type === "video" ||
              heroCoverFile.file_url?.match(/\.(mp4|mov|webm|ogg)$/i) ? (
                <video
                  src={`${rewriteUrlToR2(heroCoverFile.file_url)}#t=0.001`}
                  className="w-full h-full object-cover object-center pointer-events-none"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={getOptimizedImageUrl(getDisplayUrl(heroCoverFile), 2200, undefined, 82)}
                  alt={displayGalleryTitle || "Client gallery cover"}
                  className="w-full h-full object-cover object-center pointer-events-none select-none"
                  loading="eager"
                  // @ts-ignore
                  fetchPriority="high"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.dataset.retried) {
                      target.dataset.retried = "true";
                      target.src = rewriteUrlToR2(heroCoverFile.file_url) || "";
                    }
                  }}
                />
              )}
              {isFileLocked(heroCoverFile.id) && <WatermarkOverlay />}
              <div className="absolute inset-0 bg-gradient-to-r from-[#1A1410]/85 via-[#1A1410]/45 to-[#1A1410]/10" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/55" />
            </div>
          ) : (
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#2C241E] via-[#201915] to-[#14100E]" />
          )}

          {/* Top Navigation Bar Overlay */}
          <div className="relative z-30 max-w-[1440px] w-full mx-auto px-5 sm:px-8 lg:px-12 pt-5 sm:pt-6 pb-4 flex items-center justify-between gap-4">
            {/* Left Brand + Client Gallery Label */}
            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                onClick={() => navigate(`/`)}
                className="flex flex-col items-center text-white hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
              >
                <span className="font-editorial text-2xl sm:text-[26px] font-semibold tracking-tight leading-none">
                  Mwabonje
                </span>
                <span className="text-[7px] sm:text-[8px] uppercase tracking-[0.38em] text-white/75 mt-1 leading-none">
                  PHOTOGRAPHY
                </span>
              </button>
              <span className="hidden sm:inline-block h-6 w-px bg-white/30 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline-block text-xs sm:text-sm font-medium text-white/90 whitespace-nowrap">
                Client Gallery
              </span>
            </div>

            {/* Right Navigation Links & Actions */}
            <div className="flex items-center gap-4 sm:gap-7 text-xs sm:text-sm font-medium text-white/95 shrink-0">
              {!isSelectionLockedOut && (
                <button
                  type="button"
                  onClick={() => {
                    setViewFilter((prev) => (prev === "selected" ? "all" : "selected"));
                    document.getElementById("delivery-gallery-grid")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-opacity hover:opacity-80 cursor-pointer ${
                    viewFilter === "selected" ? "underline underline-offset-4" : ""
                  }`}
                >
                  <Heart className={`w-4 h-4 ${viewFilter === "selected" ? "fill-white" : ""}`} />
                  <span>Favourites</span>
                </button>
              )}

              {!isSelectionMode && !isSelectionLockedOut && (
                <button
                  type="button"
                  onClick={handleDownloadAll}
                  disabled={downloadingAll || files.length === 0}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-opacity hover:opacity-80 disabled:opacity-50 cursor-pointer"
                >
                  {downloadingAll ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : !canDownloadAll ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span className="hidden xs:inline sm:inline">
                    {downloadingAll ? "Preparing..." : "Download"}
                  </span>
                </button>
              )}

              {gallery?.photographer_id && (
                <button
                  type="button"
                  onClick={() => navigate(`/`)}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-opacity hover:opacity-80 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Portfolio</span>
                </button>
              )}

              {/* Overflow / Gallery Info Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDeliveryMoreMenu((prev) => !prev)}
                  aria-label="Gallery details"
                  className="p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>

                {showDeliveryMoreMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowDeliveryMoreMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#151c28] text-slate-900 dark:text-slate-100 rounded-xl shadow-2xl border border-[#E6DDD1] dark:border-slate-800 p-4 z-50 text-left space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Gallery Status
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowDeliveryMoreMenu(false)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {timeLeft && (
                        <div className="text-xs space-y-1">
                          <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{timeLeft.expired ? "Gallery Expired" : "Gallery Expires In"}</span>
                          </div>
                          {!timeLeft.expired && (
                            <p className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                              {timeLeft.days.toString().padStart(2, "0")}d :{" "}
                              {timeLeft.hours.toString().padStart(2, "0")}h :{" "}
                              {timeLeft.minutes.toString().padStart(2, "0")}m :{" "}
                              {timeLeft.seconds.toString().padStart(2, "0")}s
                            </p>
                          )}
                        </div>
                      )}

                      {!isSelectionMode && (
                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Payment</span>
                            {isBalancePending ? (
                              <span className="font-semibold text-amber-700 dark:text-amber-400">
                                Balance {formatCurrency(balanceDue)}
                              </span>
                            ) : agreedAmount === 0 ? (
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                Collaboration
                              </span>
                            ) : (
                              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                Paid in Full
                              </span>
                            )}
                          </div>
                          {isBalancePending && (
                            <>
                              {downloadLimit > 0 && (
                                <p className="text-[11px] text-slate-500">
                                  {Math.max(0, downloadLimit - downloadedImageIds.length)} of {downloadLimit} free downloads remaining.
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setShowDeliveryMoreMenu(false);
                                  setShowPayModal(true);
                                }}
                                className="w-full py-2 px-3 rounded-lg bg-[#2C241E] text-white font-medium text-xs hover:bg-[#1E1813] transition-colors"
                              >
                                View Payment Details
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {isSelectionMode && (
                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Selection</span>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {isSelectionLockedOut ? "Submitted" : "Active"}
                            </span>
                          </div>
                          {isSelectionLockedOut && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowDeliveryMoreMenu(false);
                                handleUnlockRequest();
                              }}
                              className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                              Edit Selection (PIN)
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Editorial Hero Title & Metadata Block (Bottom-Left) */}
          <div className="relative z-20 max-w-[1440px] w-full mx-auto px-5 sm:px-8 lg:px-12 pb-10 sm:pb-12 pt-8 sm:pt-14">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-white/85 mb-2">
              {gallery?.client_name &&
              displayGalleryTitle &&
              gallery.client_name.toLowerCase() !== displayGalleryTitle.toLowerCase()
                ? gallery.client_name
                : isSelectionMode
                  ? "CLIENT SELECTION GALLERY"
                  : "PRIVATE CLIENT GALLERY"}
            </p>

            <h1 className="font-editorial text-4xl sm:text-5xl md:text-[56px] font-normal text-white leading-[1.06] tracking-tight text-balance max-w-2xl">
              {displayGalleryTitle || gallery?.client_name || "Client Gallery"}
            </h1>

            <p className="text-sm sm:text-base text-white/90 mt-2.5 max-w-xl font-normal">
              {isSelectionLockedOut
                ? "Your photo selection has been sent to the photographer"
                : isSelectionMode
                  ? "Select your favourite photographs for final editing & delivery"
                  : isBalancePending
                    ? "Private gallery preview · Clear remaining balance for full downloads"
                    : "A curated collection of your captured moments"}
            </p>

            {/* Clean Inline Metadata Row with Hairline Bottom Rule */}
            <div className="mt-5 inline-flex flex-wrap items-center gap-x-5 gap-y-2 pb-2.5 border-b border-white/25 text-xs sm:text-sm text-white/90 tabular-nums">
              {gallery?.created_at && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-white/80" />
                  <span>
                    {new Date(gallery.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </span>
              )}

              <span className="inline-flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-white/80" />
                <span>
                  {isSelectionLockedOut
                    ? `${selectedFileIds.size} selected`
                    : `${deliveryPhotoCount} ${deliveryPhotoCount === 1 ? "photo" : "photos"}`}
                </span>
              </span>

              {timeLeft && (
                <span className="inline-flex items-center gap-1.5 text-white/85">
                  <Clock className="w-4 h-4 text-white/75" />
                  <span>
                    {timeLeft.expired
                      ? "Expired"
                      : `Expires ${timeLeft.days > 0 ? `${timeLeft.days}d ${timeLeft.hours}h` : `${timeLeft.hours}h ${timeLeft.minutes}m`}`}
                  </span>
                </span>
              )}

              {isSelectionMode ? (
                <span className="inline-flex items-center gap-1.5">
                  {isSelectionLockedOut ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  ) : (
                    <Heart className="w-4 h-4 text-rose-300" />
                  )}
                  <span>
                    {isSelectionLockedOut
                      ? "Selection Submitted"
                      : limit > 0
                        ? `${selectedFileIds.size} of ${limit} selected`
                        : `${selectedFileIds.size} selected`}
                  </span>
                </span>
              ) : isBalancePending ? (
                <button
                  type="button"
                  onClick={() => setShowPayModal(true)}
                  className="inline-flex items-center gap-1.5 text-amber-200 hover:text-white transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>
                    {downloadLimit > 0
                      ? `${Math.max(0, downloadLimit - downloadedImageIds.length)} free · Balance ${formatCurrency(balanceDue)}`
                      : `Balance ${formatCurrency(balanceDue)}`}
                  </span>
                </button>
              ) : agreedAmount > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Paid in Full</span>
                </span>
              ) : null}
            </div>

            <p className="mt-3.5 max-w-md text-xs sm:text-sm text-white/85 leading-relaxed">
              {displayGalleryDescription &&
              displayGalleryDescription.toLowerCase() !== (displayGalleryTitle || "").toLowerCase()
                ? displayGalleryDescription
                : isSelectionLockedOut
                  ? "Thank you for completing your selection. Your photographer is preparing your final edited photographs."
                  : isSelectionMode
                    ? "Welcome to your selection gallery. Click the heart on your favourite moments, leave optional notes, and submit when ready."
                    : "Welcome to your private gallery. Thank you for letting us capture these moments — browse your favourites and download high-resolution files below."}
            </p>
          </div>
        </header>
      )}

      {/* Portfolio vs Delivery Gallery Layout */}
      {isPortfolio ? (
        <main className="w-full bg-[#FAF8F5] dark:bg-[#0b0f17] min-h-screen text-slate-900 dark:text-slate-100 pb-16 sm:pb-24 transition-colors">
          {/* Breadcrumb Bar if navigating a child gallery directly */}
          {parentGallery && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between text-xs tracking-widest uppercase border-b border-slate-200/60 dark:border-slate-800/80">
              <div className="flex items-center gap-2 text-slate-500">
                <Link 
                  to={`/${generateSlug(parentGallery.client_name)}`} 
                  className="hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
                >
                  ← {getCleanGalleryTitle(parentGallery)}
                </Link>
                <span className="opacity-40">/</span>
                <span className="text-slate-900 dark:text-white font-semibold">
                  {displayGalleryTitle}
                </span>
              </div>
            </div>
          )}

          {/* Sub-Galleries Sticky Navigation Bar - only displayed when inside a specific story */}
          {subGalleries.length > 0 && activeSubGallery && (
            <div className="w-full border-b border-slate-200/80 dark:border-slate-800 bg-[#FAF8F5]/95 dark:bg-[#0b0f17]/95 backdrop-blur-md sticky top-0 z-30 transition-colors">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
                <button
                  onClick={() => handleSelectSubGallery(null)}
                  className="px-3.5 py-1.5 text-xs font-sans tracking-[0.15em] uppercase font-medium transition-all rounded-none text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-slate-900/80 cursor-pointer"
                >
                  All Stories
                </button>

                <button
                  onClick={() => handleSelectSubGallery(null)}
                  className="text-xs tracking-wider uppercase text-slate-500 hover:text-slate-900 dark:hover:text-white shrink-0 font-medium transition-colors cursor-pointer"
                >
                  ← Back to {parentCollectionTitle}
                </button>
              </div>
            </div>
          )}

          {loadingSubFiles ? (
            <div className="flex flex-col items-center justify-center py-28 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-slate-600 dark:text-slate-400 mb-3" />
              <p className="text-xs uppercase tracking-widest font-mono text-slate-500">Loading story...</p>
            </div>
          ) : displayedFiles.length === 0 && (subGalleries.length === 0 || activeSubGallery) ? (
            <div className="flex flex-col items-center justify-center py-28 text-slate-400">
              <ImageIcon className="w-16 h-16 text-slate-200 mb-4" />
              <p className="text-slate-500 font-medium">No photos available in this project.</p>
            </div>
          ) : (
            <>
              {/* 1. Opening Editorial Hero Image */}
              {(() => {
                const coverTarget = displayedFiles[0];
                const fallbackCoverUrl = subGalleries.find(s => s.coverUrl)?.coverUrl;
                const coverUrl = coverTarget ? getDisplayUrl(coverTarget) : fallbackCoverUrl;
                if (!coverUrl) return null;
                const isVideo = coverTarget 
                  ? isVideoMediaUrl(coverTarget.file_url, coverTarget.file_type)
                  : false;
                return (
                  <div className="w-full">
                    <div
                      onClick={() => {
                        if (coverTarget) setLightboxFileWithTracking(coverTarget);
                      }}
                      role={coverTarget ? "button" : undefined}
                      tabIndex={coverTarget ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (coverTarget && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          setLightboxFileWithTracking(coverTarget);
                        }
                      }}
                      aria-label={coverTarget ? `Open ${displayGalleryTitle || "gallery"} opening photograph in full screen` : undefined}
                      className={`relative w-full aspect-[16/10] sm:aspect-auto sm:h-[52vh] md:h-[58vh] lg:h-[62vh] min-h-[260px] max-h-[680px] bg-[#EFEBE4] dark:bg-slate-900 overflow-hidden ${
                        coverTarget ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900 dark:focus-visible:ring-amber-300" : ""
                      }`}
                    >
                      {isVideo && coverTarget ? (
                        <video
                          src={`${rewriteUrlToR2(coverTarget.file_url)}#t=0.001`}
                          onLoadedData={() => setHeroLoaded(true)}
                          className={`w-full h-full object-cover transition-opacity duration-700 ease-out motion-reduce:transition-none ${
                            heroLoaded ? "opacity-100" : "opacity-0"
                          }`}
                          autoPlay
                          muted
                          loop
                          playsInline
                        />
                      ) : (
                        <ProgressiveImage
                          src={coverUrl}
                          alt={displayGalleryTitle || "Cover Image"}
                          widths={HERO_IMAGE_WIDTHS}
                          sizes="100vw"
                          quality={88}
                          priority="hero"
                          containerClassName="relative w-full h-full overflow-hidden bg-[#EFEBE4] dark:bg-slate-900"
                          className="w-full h-full object-cover"
                          onLoadComplete={() => setHeroLoaded(true)}
                        />
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* 2. Editorial Introduction */}
              <header className="max-w-2xl mx-auto px-5 sm:px-6 pt-12 pb-10 sm:pt-16 sm:pb-12 md:pt-20 md:pb-16 text-center">
                <p className="text-[10.5px] sm:text-[11px] font-sans font-medium tracking-[0.26em] uppercase text-slate-500 dark:text-slate-400 mb-3.5 sm:mb-4">
                  {editorialKicker}
                </p>
                <h1 className="font-serif text-3xl sm:text-4xl md:text-[46px] tracking-[0.16em] sm:tracking-[0.18em] font-medium text-slate-900 dark:text-white uppercase leading-[1.15] [text-wrap:balance]">
                  {displayGalleryTitle || "UNTITLED PROJECT"}
                </h1>
                {displayGalleryDescription ? (
                  <>
                    <div className="w-10 h-px bg-slate-900/20 dark:bg-white/20 mx-auto my-5 sm:my-6" aria-hidden="true" />
                    <div className="space-y-4 max-w-xl mx-auto">
                      {displayGalleryDescription
                        .replace(/\\n/g, '\n')
                        .split(/\n\s*\n/)
                        .map((para, idx) => {
                          const trimmed = para.trim();
                          if (!trimmed) return null;
                          return (
                            <p
                              key={idx}
                              className="text-[15px] sm:text-base text-slate-600 dark:text-slate-300 font-normal leading-[1.82] tracking-[0.01em] whitespace-pre-line"
                            >
                              {trimmed}
                            </p>
                          );
                        })}
                    </div>
                  </>
                ) : null}
              </header>

              {/* 2.5 Sub-Galleries Showcase Grid (Rendered when viewing parent overview and child stories exist) */}
              {subGalleries.length > 0 && !activeSubGallery && (
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-12 sm:mb-16">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4 md:gap-5 lg:gap-6">
                    {subGalleries.map((sub, subIdx) => {
                      const subTitle = getCleanGalleryTitle(sub);
                      const subCover = sub.coverUrl;
                      return (
                        <div
                          key={sub.id}
                          onClick={() => handleSelectSubGallery(sub)}
                          className="group cursor-pointer flex flex-col text-center"
                        >
                          <div className="relative aspect-[3/4] bg-[#EFEBE4] dark:bg-slate-900 overflow-hidden rounded-none shadow-sm group-hover:shadow-md transition-shadow">
                            {subCover ? (
                              <ProgressiveImage
                                src={subCover}
                                alt={subTitle}
                                widths={GRID_PORTRAIT_WIDTHS}
                                aspectRatio={4 / 3}
                                sizes="(max-width: 767px) 48vw, (max-width: 1280px) 32vw, 400px"
                                quality={82}
                                priority={subIdx < 3 ? "above-fold" : "lazy"}
                                containerClassName="relative w-full h-full overflow-hidden bg-[#EFEBE4] dark:bg-slate-900"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-none motion-reduce:transform-none"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <ImageIcon className="w-10 h-10" />
                              </div>
                            )}
                            {/* Subtle dark gradient overlay so title is crisp and legible on any photo */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />

                            {/* Name centered at bottom of cover image */}
                            <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 z-10 text-center flex flex-col items-center justify-center">
                              <h3 className="font-serif text-base sm:text-lg md:text-xl font-medium uppercase tracking-[0.18em] text-white transition-all duration-300 drop-shadow-sm text-center w-full">
                                {subTitle}
                              </h3>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Photography Grid (Strict 3-Column Desktop / 2-Column Mobile Grid) */}
              {displayedFiles.length > 1 && (
                <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4 md:gap-5 lg:gap-6 animate-in fade-in duration-500">
                    {displayedFiles.slice(1).map((file, idx) => {
                      const isVideo = isVideoMediaUrl(file.file_url, file.file_type);
                      const prefetchTileLightbox = () => {
                        if (!isVideo) {
                          preloadResponsiveImage({
                            url: getDisplayUrl(file, true),
                            widths: LIGHTBOX_IMAGE_WIDTHS,
                            sizes: LIGHTBOX_IMAGE_SIZES,
                            quality: LIGHTBOX_IMAGE_QUALITY,
                          });
                        }
                      };
                      return (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => setLightboxFileWithTracking(file)}
                          onMouseEnter={prefetchTileLightbox}
                          onFocus={prefetchTileLightbox}
                          aria-label={`Open ${displayGalleryTitle || "gallery"} ${isVideo ? "video" : "photograph"} ${idx + 2} in full screen`}
                          className="group relative w-full aspect-[3/4] bg-[#EFEBE4] dark:bg-slate-900 overflow-hidden rounded-none cursor-pointer block text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF8F5] dark:focus-visible:ring-offset-[#0b0f17]"
                        >
                          {isVideo ? (
                            <div className="relative w-full h-full">
                              <video
                                src={`${rewriteUrlToR2(file.file_url)}#t=0.001`}
                                className="w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03] motion-reduce:transform-none"
                                muted
                                loop
                                playsInline
                                autoPlay
                                preload="metadata"
                              />
                              <div className="absolute top-2.5 right-2.5 bg-black/45 backdrop-blur-sm p-1.5 rounded-full">
                                <FileVideo className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          ) : (
                            <ProgressiveImage
                              src={getDisplayUrl(file)}
                              alt={`${displayGalleryTitle || "Gallery"} photo ${idx + 2}`}
                              widths={GRID_PORTRAIT_WIDTHS}
                              aspectRatio={4 / 3}
                              sizes="(max-width: 767px) 48vw, (max-width: 1280px) 32vw, 400px"
                              quality={80}
                              priority={idx < 3 ? "above-fold" : "lazy"}
                              containerClassName="relative w-full h-full overflow-hidden bg-[#EFEBE4] dark:bg-slate-900"
                              className="w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03] motion-reduce:transform-none"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.06] transition-colors duration-300 pointer-events-none" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. Discreet Editorial Navigation Between Galleries */}
              <nav
                aria-label="Gallery navigation"
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-24 pt-10 sm:pt-12 border-t border-slate-900/10 dark:border-white/10"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-8 sm:gap-4">
                  <div className="flex justify-center sm:justify-start min-w-0">
                    {prevPortfolioGallery ? (
                      <Link
                        to={`/${generateSlug(prevPortfolioGallery.client_name)}`}
                        className="group inline-flex flex-col items-center sm:items-start gap-1.5 min-w-0 py-1 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-amber-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#FAF8F5] dark:focus-visible:ring-offset-[#0b0f17]"
                      >
                        <span className="text-[10px] font-sans font-medium tracking-[0.22em] uppercase text-slate-500 dark:text-slate-400">
                          Previous Gallery
                        </span>
                        <span className="inline-flex items-center gap-2 font-serif text-lg sm:text-xl text-slate-900 dark:text-white group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors max-w-full">
                          <ArrowLeft className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:-translate-x-1" aria-hidden="true" />
                          <span className="truncate">{getCleanGalleryTitle(prevPortfolioGallery)}</span>
                        </span>
                      </Link>
                    ) : (
                      <span className="hidden sm:block" aria-hidden="true" />
                    )}
                  </div>

                  <div className="flex justify-center">
                    <Link
                      to="/"
                      className="inline-flex items-center justify-center min-h-[44px] px-3 text-[11px] font-sans font-semibold tracking-[0.2em] uppercase text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border-b border-slate-900/25 dark:border-white/25 hover:border-slate-900 dark:hover:border-white pb-1 transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-amber-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#FAF8F5] dark:focus-visible:ring-offset-[#0b0f17]"
                    >
                      Explore All Portfolio Works
                    </Link>
                  </div>

                  <div className="flex justify-center sm:justify-end min-w-0">
                    {nextPortfolioGallery ? (
                      <Link
                        to={`/${generateSlug(nextPortfolioGallery.client_name)}`}
                        className="group inline-flex flex-col items-center sm:items-end gap-1.5 min-w-0 py-1 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-amber-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#FAF8F5] dark:focus-visible:ring-offset-[#0b0f17]"
                      >
                        <span className="text-[10px] font-sans font-medium tracking-[0.22em] uppercase text-slate-500 dark:text-slate-400">
                          Next Gallery
                        </span>
                        <span className="inline-flex items-center gap-2 font-serif text-lg sm:text-xl text-slate-900 dark:text-white group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors max-w-full">
                          <span className="truncate">{getCleanGalleryTitle(nextPortfolioGallery)}</span>
                          <ChevronRight className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                        </span>
                      </Link>
                    ) : (
                      <span className="hidden sm:block" aria-hidden="true" />
                    )}
                  </div>
                </div>
              </nav>
            </>
          )}
        </main>
      ) : (
        /* Editorial Client Delivery Toolbar + Photo Grid */
        <>
          {!isSelectionLockedOut && (
            <div className="sticky top-0 z-20 bg-[#FAF7F2] dark:bg-[#0b0f17] border-b border-[#E6DDD1] dark:border-slate-800">
              <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 flex flex-wrap items-center justify-between gap-3">
                {/* Filter Tabs */}
                <div className="flex items-center gap-6 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  <button
                    type="button"
                    onClick={() => setViewFilter("all")}
                    className={`inline-flex items-center gap-2 py-3.5 text-xs sm:text-sm whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                      viewFilter === "all"
                        ? "border-[#3C2F26] dark:border-white text-[#2A211B] dark:text-white font-semibold"
                        : "border-transparent text-[#6E6359] dark:text-slate-400 hover:text-[#2A211B] dark:hover:text-white font-medium"
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span>All Photos ({deliveryPhotoCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewFilter("selected")}
                    className={`inline-flex items-center gap-2 py-3.5 text-xs sm:text-sm whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                      viewFilter === "selected"
                        ? "border-[#3C2F26] dark:border-white text-[#2A211B] dark:text-white font-semibold"
                        : "border-transparent text-[#6E6359] dark:text-slate-400 hover:text-[#2A211B] dark:hover:text-white font-medium"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${viewFilter === "selected" ? "fill-current" : ""}`} />
                    <span>Favourites ({deliveryFavouriteCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewFilter("videos")}
                    className={`inline-flex items-center gap-2 py-3.5 text-xs sm:text-sm whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                      viewFilter === "videos"
                        ? "border-[#3C2F26] dark:border-white text-[#2A211B] dark:text-white font-semibold"
                        : "border-transparent text-[#6E6359] dark:text-slate-400 hover:text-[#2A211B] dark:hover:text-white font-medium"
                    }`}
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Videos ({deliveryVideoCount})</span>
                  </button>

                  {isSelectionMode && limit > 0 && selectedFileIds.size > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setViewFilter("main")}
                        className={`inline-flex items-center gap-1.5 py-3.5 text-xs sm:text-sm whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                          viewFilter === "main"
                            ? "border-[#3C2F26] dark:border-white text-[#2A211B] dark:text-white font-semibold"
                            : "border-transparent text-[#6E6359] dark:text-slate-400 hover:text-[#2A211B] dark:hover:text-white font-medium"
                        }`}
                      >
                        <span>Main ({mainSelections.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewFilter("extras")}
                        className={`inline-flex items-center gap-1.5 py-3.5 text-xs sm:text-sm whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                          viewFilter === "extras"
                            ? "border-[#3C2F26] dark:border-white text-[#2A211B] dark:text-white font-semibold"
                            : "border-transparent text-[#6E6359] dark:text-slate-400 hover:text-[#2A211B] dark:hover:text-white font-medium"
                        }`}
                      >
                        <span>Extras ({extraSelections.length})</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Layout Switcher & Sort Controls */}
                <div className="flex items-center gap-3 py-2 shrink-0 ml-auto">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDeliveryLayoutMode("grid")}
                      title="Grid view"
                      className={`p-2 rounded-md transition-colors cursor-pointer ${
                        deliveryLayoutMode === "grid"
                          ? "bg-[#E5D5BE] text-[#2A211B] dark:bg-amber-200 dark:text-slate-900"
                          : "text-[#6E6359] dark:text-slate-400 hover:bg-[#EFEAE2] dark:hover:bg-slate-800"
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryLayoutMode("masonry")}
                      title="Natural masonry view"
                      className={`p-2 rounded-md transition-colors cursor-pointer ${
                        deliveryLayoutMode === "masonry"
                          ? "bg-[#E5D5BE] text-[#2A211B] dark:bg-amber-200 dark:text-slate-900"
                          : "text-[#6E6359] dark:text-slate-400 hover:bg-[#EFEAE2] dark:hover:bg-slate-800"
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="h-5 w-px bg-[#DFD5C7] dark:bg-slate-800" aria-hidden="true" />

                  <div className="relative flex items-center">
                    <span className="text-xs sm:text-sm text-[#6E6359] dark:text-slate-400 mr-1.5">
                      Sort:
                    </span>
                    <select
                      value={deliverySortOrder}
                      onChange={(e) =>
                        setDeliverySortOrder(e.target.value as "newest" | "oldest" | "edited")
                      }
                      aria-label="Sort gallery photos"
                      className="appearance-none bg-transparent pr-5 text-xs sm:text-sm font-medium text-[#2A211B] dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="newest" className="bg-white text-slate-900">Newest</option>
                      <option value="oldest" className="bg-white text-slate-900">Oldest</option>
                      <option value="edited" className="bg-white text-slate-900">Edited First</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#6E6359] dark:text-slate-400 pointer-events-none -ml-4" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <main
            id="delivery-gallery-grid"
            className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-8"
          >
            {isSelectionLockedOut ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-in fade-in duration-300">
                <div className="bg-white dark:bg-[#151c28] border border-[#E6DDD1] dark:border-slate-800 rounded-2xl shadow-sm p-8 md:p-10 max-w-md w-full">
                  <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900 rounded-full flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h2 className="font-editorial text-2xl font-semibold text-slate-900 dark:text-white mb-2">
                    Selection Submitted
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                    Thank you! Your selection of{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {selectedFileIds.size} photo{selectedFileIds.size === 1 ? "" : "s"}
                    </strong>{" "}
                    has been sent to your photographer. The gallery previews are now hidden while your selection is being prepared.
                  </p>
                  {limit > 0 && selectedFileIds.size > limit && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 bg-[#FAF7F2] dark:bg-slate-900/60 border border-[#E6DDD1] dark:border-slate-800 rounded-lg px-3 py-2 mb-6">
                      Includes {limit} main photos and {selectedFileIds.size - limit} extra photo{selectedFileIds.size - limit === 1 ? "" : "s"}.
                    </p>
                  )}
                  <button
                    onClick={handleUnlockRequest}
                    disabled={submittingSelection}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-[#D8CCBC] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-[#FAF7F2] dark:hover:bg-slate-800 font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit Selection (PIN Required)</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {isSelectionMode && viewFilter === "all" && (
                  <div className="mb-6 p-4 bg-white/80 dark:bg-slate-900/60 border border-[#E6DDD1] dark:border-slate-800 rounded-xl flex items-start gap-3">
                    <Heart className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-[#4A3F37] dark:text-slate-300">
                      <strong>Selection Mode:</strong> Tap the heart icon on any photograph to add it to your favourites. Downloads stay paused until your selection is complete.
                    </p>
                  </div>
                )}

                {displayedFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-[#8A7E72] dark:text-slate-400">
                    {viewFilter === "selected" ? (
                      <>
                        <Heart className="w-14 h-14 text-[#D5C9B8] mb-4" />
                        <h3 className="text-lg font-semibold text-[#2A211B] dark:text-white">
                          No Favourites Yet
                        </h3>
                        <p className="text-sm mb-6 max-w-xs text-center mt-1">
                          Tap the heart icon on photos to save them to your favourites.
                        </p>
                        <button
                          onClick={() => setViewFilter("all")}
                          className="text-[#3C2F26] dark:text-white font-medium underline underline-offset-4 cursor-pointer"
                        >
                          Browse All Photos
                        </button>
                      </>
                    ) : viewFilter === "videos" ? (
                      <>
                        <PlayCircle className="w-14 h-14 text-[#D5C9B8] mb-4" />
                        <h3 className="text-lg font-semibold text-[#2A211B] dark:text-white">
                          No Videos in This Gallery
                        </h3>
                        <button
                          onClick={() => setViewFilter("all")}
                          className="mt-4 text-[#3C2F26] dark:text-white font-medium underline underline-offset-4 cursor-pointer"
                        >
                          View All Photos
                        </button>
                      </>
                    ) : viewFilter !== "all" ? (
                      <>
                        <Heart className="w-14 h-14 text-[#D5C9B8] mb-4" />
                        <h3 className="text-lg font-semibold text-[#2A211B] dark:text-white">
                          No Photos Selected Yet
                        </h3>
                        <p className="text-sm mb-6 max-w-xs text-center mt-1">
                          Tap the heart icon on photos to add them to your selection.
                        </p>
                        <button
                          onClick={() => setViewFilter("all")}
                          className="text-[#3C2F26] dark:text-white font-medium underline underline-offset-4 cursor-pointer"
                        >
                          Browse All Photos
                        </button>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-14 h-14 text-[#D5C9B8] mb-4" />
                        <p>No photos available.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div
                    className={
                      deliveryLayoutMode === "grid"
                        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3.5 animate-in fade-in duration-300"
                        : "columns-2 md:columns-3 lg:columns-4 gap-3 sm:gap-4 animate-in fade-in duration-300"
                    }
                  >
                    {(() => {
                      const selectedArray = Array.from(selectedFileIds);
                      return displayedFiles.map((file, index) => {
                        const isSelected = isSelectionMode
                          ? selectedFileIds.has(file.id)
                          : localFavouriteIds.has(file.id);
                        let isExtra = false;
                        if (
                          isSelectionMode &&
                          isSelected &&
                          gallery?.selection_limit &&
                          gallery.selection_limit > 0
                        ) {
                          const selIndex = selectedArray.indexOf(file.id);
                          if (selIndex >= gallery.selection_limit) isExtra = true;
                        }
                  return (
                    <div
                      key={file.id}
                      onMouseEnter={() => {
                        if (!isPortfolio && !isBalanceLocked(file.id) && !isVideoMediaUrl(file.file_url, file.file_type)) {
                          preloadResponsiveImage({
                            url: getDisplayUrl(file, true),
                            widths: LIGHTBOX_IMAGE_WIDTHS,
                            sizes: LIGHTBOX_IMAGE_SIZES,
                            quality: LIGHTBOX_IMAGE_QUALITY,
                          });
                        }
                      }}
                      onClick={() => {
                        if (!isPortfolio) {
                          if (isBalanceLocked(file.id)) {
                            setShowBalanceWarningModal(true);
                            return;
                          }
                          setLightboxFileWithTracking(file);
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (!isPortfolio) {
                          setShowScreenshotWarning(true);
                        }
                      }}
                      onTouchStart={handleLongPressStart}
                      onTouchEnd={handleLongPressEnd}
                      onTouchMove={handleLongPressEnd}
                      onMouseDown={handleLongPressStart}
                      onMouseUp={handleLongPressEnd}
                      onMouseLeave={handleLongPressEnd}
                      className={`group relative rounded-lg touch-pan-y ${
                        deliveryLayoutMode === "grid"
                          ? "delivery-grid-card aspect-[4/3] w-full bg-[#EAE3D8] dark:bg-slate-900"
                          : "aspect-auto w-full inline-block bg-[#EAE3D8] dark:bg-slate-900 mb-3 sm:mb-4 min-h-[160px]"
                      } overflow-hidden break-inside-avoid [break-inside:avoid] transition-shadow duration-150 hover:shadow-md ${
                        isSelectionMode && isSelected ? "ring-3 ring-rose-500 ring-offset-2 ring-offset-[#FAF7F2] dark:ring-offset-[#0b0f17]" : ""
                      } max-w-full cursor-pointer`}
                      style={{
                        WebkitTouchCallout: "none",
                        userSelect: "none",
                      }}
                    >
                      {/* Badges */}
                      {!isPortfolio && ((isSelectionMode && isSelected) || file.is_edited || isExtraLocked(file.id)) && (
                        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 pointer-events-none">
                          {isSelectionMode && isSelected && (
                            <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                              SELECTED
                            </span>
                          )}
                          {file.is_edited && (
                            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm tracking-wide">
                              EDITED
                            </span>
                          )}
                          {isExtraLocked(file.id) && (
                            <span className="bg-amber-600/95 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm inline-flex items-center gap-1 tracking-wide">
                              <Lock className="w-2.5 h-2.5" />
                              EXTRA · LOCKED
                            </span>
                          )}
                          {isSelectionMode && isSelected && isExtra && (
                            <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                              EXTRA
                            </span>
                          )}
                          {isSelectionMode && isSelected && selectionNotes[file.id] && (
                            <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                              NOTE ADDED
                            </span>
                          )}
                        </div>
                      )}
                      {file.file_type === "image" &&
                      !file.file_url?.match(/\.(mp4|mov|webm|ogg)$/i) ? (
                        <>
                          <img
                            src={getOptimizedImageUrl(
                              getDisplayUrl(file),
                              400,
                              400,
                              30,
                            )}
                            srcSet={`
                                    ${getOptimizedImageUrl(getDisplayUrl(file), 150, 150, 25)} 150w,
                                    ${getOptimizedImageUrl(getDisplayUrl(file), 300, 300, 30)} 300w,
                                    ${getOptimizedImageUrl(getDisplayUrl(file), 600, 600, 40)} 600w,
                                    ${getOptimizedImageUrl(getDisplayUrl(file), 900, 900, 50)} 900w
                                `}
                            sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 18vw"
                            alt="Gallery item"
                            className="w-full h-full block object-cover transition-transform duration-200 md:group-hover:scale-[1.03] pointer-events-none"
                            loading={index < 12 ? "eager" : "lazy"}
                            decoding="async"
                            // @ts-ignore
                            fetchPriority={index < 8 ? "high" : "auto"}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.removeAttribute("srcset");
                              target.removeAttribute("sizes");
                              if (!target.dataset.retried) {
                                target.dataset.retried = "true";
                                const directUrl = rewriteUrlToR2(file.file_url) || "";
                                if (directUrl && directUrl !== target.src) {
                                  target.src = directUrl;
                                } else {
                                  setFailedFileIds((prev) => new Set(prev).add(file.id));
                                }
                              } else {
                                setFailedFileIds((prev) => new Set(prev).add(file.id));
                              }
                            }}
                            onContextMenu={(e) => e.preventDefault()}
                          />
                          {isFileLocked(file.id) && !isPortfolio && <WatermarkOverlay />}
                          <div
                            className="absolute inset-0 z-[5]"
                            onContextMenu={(e) => {
                              e.preventDefault();
                              if (!isPortfolio) {
                                setShowScreenshotWarning(true);
                              }
                            }}
                            onDragStart={(e) => e.preventDefault()}
                          />
                        </>
                      ) : (
                        <div className="relative w-full h-full">
                          <video
                            src={`${rewriteUrlToR2(file.file_url)}#t=0.001`}
                            className={`block transform transition-transform duration-[1.5s] w-full h-full object-cover ${isHorizontalLayout ? "" : "md:group-hover:scale-[1.02]"} pointer-events-none`}
                            preload="metadata"
                            muted={true}
                            loop={true}
                            playsInline={true}
                          />
                          <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md rounded-full p-1.5 shadow-sm">
                            <FileVideo className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}

                      {/* Desktop Hover Overlay */}
                      <div
                        className="hidden md:flex absolute inset-0 z-10 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-3 pointer-events-none"
                      >
                        {isSelectionMode ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelection(file);
                            }}
                            className={`pointer-events-auto p-3 rounded-full shadow-lg transform transition-all hover:scale-110 ${isSelected ? "bg-rose-500 text-white" : "bg-white text-slate-400 hover:text-rose-500"}`}
                            disabled={selectionSubmitted}
                          >
                            <Heart
                              className={`w-5 h-5 ${isSelected ? "fill-current" : ""}`}
                            />
                          </button>
                        ) : (
                          !isPortfolio && (
                            <div className="flex items-center gap-2 pointer-events-auto">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleLocalFavourite(file);
                                }}
                                title={isSelected ? "Remove from Favourites" : "Save to Favourites"}
                                className={`p-2.5 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all ${
                                  isSelected
                                    ? "bg-rose-500 text-white"
                                    : "bg-white/95 hover:bg-white text-slate-600 hover:text-rose-500"
                                }`}
                              >
                                <Heart className={`w-4 h-4 ${isSelected ? "fill-current" : ""}`} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (downloadingId === file.id) {
                                    cancelSingleDownload();
                                  } else {
                                    handleDownload(file);
                                  }
                                }}
                                disabled={
                                  downloadingId !== null &&
                                  downloadingId !== file.id
                                }
                                className="bg-white/95 hover:bg-white text-slate-900 px-3.5 py-2 rounded-full font-medium flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-all shadow-lg text-xs disabled:opacity-75 disabled:cursor-wait"
                              >
                                {downloadingId === file.id ? (
                                  <X className="w-3.5 h-3.5 text-red-500" />
                                ) : isFileLocked(file.id) ? (
                                  <Lock className="w-3.5 h-3.5" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                                <span
                                  className={
                                    downloadingId === file.id ? "text-red-600" : ""
                                  }
                                >
                                  {downloadingId === file.id
                                    ? singleDownloadStats
                                      ? singleDownloadStats.total
                                        ? `Cancel (${Math.round((singleDownloadStats.loaded / singleDownloadStats.total) * 100)}%)`
                                        : `Cancel (${(singleDownloadStats.loaded / 1024 / 1024).toFixed(1)}MB)`
                                      : "Cancel"
                                    : isFileLocked(file.id)
                                      ? "Locked"
                                      : "Download"}
                                </span>
                              </button>
                            </div>
                          )
                        )}
                      </div>

                      {/* Mobile Actions */}
                      <div className="md:hidden absolute bottom-2 right-2 flex gap-2 z-10">
                        {isSelectionMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelection(file);
                            }}
                            disabled={selectionSubmitted}
                            className={`p-3 rounded-full shadow-md transition-transform active:scale-95 border border-white/20 ${isSelected ? "bg-rose-500 text-white" : "bg-white/95 text-slate-400"}`}
                          >
                            <Heart
                              className={`w-5 h-5 ${isSelected ? "fill-current" : ""}`}
                            />
                          </button>
                        )}
                        {!isSelectionMode && !isPortfolio && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLocalFavourite(file);
                              }}
                              aria-label={isSelected ? "Remove from Favourites" : "Save to Favourites"}
                              className={`p-2.5 rounded-full shadow-md transition-transform active:scale-95 border border-white/20 ${
                                isSelected ? "bg-rose-500 text-white" : "bg-white/95 text-slate-600"
                              }`}
                            >
                              <Heart className={`w-4 h-4 ${isSelected ? "fill-current" : ""}`} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (downloadingId === file.id) {
                                  cancelSingleDownload();
                                } else {
                                  handleDownload(file);
                                }
                              }}
                              disabled={
                                downloadingId !== null && downloadingId !== file.id
                              }
                              className={`flex items-center justify-center gap-1.5 ${downloadingId === file.id && singleDownloadStats ? "px-3 py-2 text-sm max-w-[120px]" : "p-2.5"} rounded-full shadow-md transition-transform active:scale-95 border border-white/20
                                    ${
                                      isFileLocked(file.id)
                                        ? "bg-slate-100 text-slate-800"
                                        : "bg-white/95 text-slate-900"
                                    }
                                    ${downloadingId === file.id ? "!bg-red-50 !text-red-600 !border-red-200" : ""}
                                    `}
                            >
                              {downloadingId === file.id ? (
                                <X className="w-4 h-4 shrink-0" />
                              ) : isFileLocked(file.id) ? (
                                <Lock className="w-4 h-4" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                              {downloadingId === file.id && singleDownloadStats && (
                                <span className="font-semibold truncate">
                                  {singleDownloadStats.total
                                    ? `${Math.round((singleDownloadStats.loaded / singleDownloadStats.total) * 100)}%`
                                    : `${(singleDownloadStats.loaded / 1024 / 1024).toFixed(1)}M`}
                                </span>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Print Details Banner */}
                      {(isPrintsGallery && file.title?.trim()) ||
                      (file.description ?? file.caption)?.trim() ||
                      file.print_size?.trim() ||
                      file.material?.trim() ||
                      file.price?.trim() ? (
                        <div
                          className={`px-2 py-4 flex flex-col gap-1 border-t mt-2 w-full ${isPrintsGallery ? "bg-white border-slate-100" : "bg-transparent border-slate-200"}`}
                        >
                          {file.title?.trim() && isPrintsGallery && (
                            <h3 className="font-sans text-lg font-medium text-slate-900">
                              {file.title}
                            </h3>
                          )}
                          {(file.description ?? file.caption)?.trim() && (
                            <p className="text-sm text-slate-600 leading-relaxed italic">
                              {file.description ?? file.caption}
                            </p>
                          )}
                          {(file.print_size?.trim() || file.material?.trim()) && (
                            <div className="text-xs text-slate-500 uppercase tracking-widest mt-2 flex flex-wrap items-center gap-2">
                              {file.print_size?.trim() && (
                                <span>{file.print_size}</span>
                              )}
                              {file.print_size?.trim() &&
                                file.material?.trim() && (
                                  <span className="opacity-50">|</span>
                                )}
                              {file.material?.trim() && (
                                <span>{file.material}</span>
                              )}
                            </div>
                          )}
                          {file.price?.trim() && (
                            <p className="text-md font-bold text-slate-700 mt-1">
                              {file.price}
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                });
              })()}
            </div>
          )}
            </>
          )}
        </main>
        </>
      )}

      {/* Selection Mode Bottom Bar */}
      {isSelectionMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 z-30">
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div
                className={`flex items-center gap-2 ${isSelectionLockedOut ? "" : "cursor-pointer group"}`}
                onClick={() => {
                  if (!isSelectionLockedOut) {
                    setViewFilter(viewFilter === "all" ? "selected" : "all");
                  }
                }}
              >
                <div
                  className={`p-2 rounded-full transition-colors ${isSelectionLockedOut ? "bg-emerald-100 text-emerald-600" : viewFilter !== "all" ? "bg-rose-500 text-white" : "bg-rose-100 text-rose-600"}`}
                >
                  {isSelectionLockedOut ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Heart
                      className={`w-5 h-5 ${viewFilter !== "all" ? "fill-current" : ""}`}
                    />
                  )}
                </div>
                <div>
                  <p className={`font-bold text-slate-900 flex items-center gap-2 ${isSelectionLockedOut ? "" : "group-hover:text-rose-600 transition-colors"}`}>
                    {limit > 0
                      ? `${selectedFileIds.size} of ${limit} Selected`
                      : `${selectedFileIds.size} Selected`}
                    {limit > 0 && selectedFileIds.size > limit && (
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold flex-shrink-0">
                        {selectedFileIds.size - limit} Extras
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 hidden sm:inline-block">
                    {isSelectionLockedOut
                      ? "Selection sent to photographer"
                      : viewFilter !== "all"
                        ? "Showing favorites"
                        : "Tap heart to select"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-3 sm:gap-2 w-full sm:w-auto items-center">
              {!isSelectionLockedOut && (
                <div className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden bg-slate-100 p-1 rounded-lg text-xs font-medium w-full sm:w-auto">
                  <button
                    onClick={() => setViewFilter("all")}
                    className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${viewFilter === "all" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setViewFilter("selected")}
                    className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap flex items-center gap-1 ${viewFilter === "selected" ? "bg-white shadow-sm text-rose-600" : "text-slate-500 hover:text-rose-600"}`}
                  >
                    <Heart className="w-3 h-3" />
                    Selected
                  </button>
                  {limit > 0 && selectedFileIds.size > 0 && (
                    <>
                      <button
                        onClick={() => setViewFilter("main")}
                        className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${viewFilter === "main" ? "bg-white shadow-sm text-rose-600" : "text-slate-500 hover:text-rose-600"}`}
                      >
                        Main ({mainSelections.length})
                      </button>
                      <button
                        onClick={() => setViewFilter("extras")}
                        className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${viewFilter === "extras" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        Extras ({extraSelections.length})
                      </button>
                    </>
                  )}
                </div>
              )}

              {isSelectionLockedOut ? (
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="flex-1 sm:flex-none bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg font-medium border border-emerald-200 flex items-center justify-center gap-2 text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Submitted</span>
                  </div>
                  <button
                    onClick={handleUnlockRequest}
                    disabled={submittingSelection}
                    className="flex-1 sm:flex-none bg-white text-slate-700 px-4 py-2 rounded-lg font-medium border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    {submittingSelection ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Edit2 className="w-4 h-4" />
                    )}
                    <span>Edit Selection</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={submitSelection}
                  disabled={submittingSelection || selectedFileIds.size === 0}
                  className="w-full sm:w-auto flex-1 sm:flex-none bg-slate-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shrink-0"
                >
                  {submittingSelection ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Submit Selection</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div
            className={`px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium ${
              toast.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <Heart className="w-4 h-4 fill-current" />
            ) : toast.type === "download" ? (
              <span className="text-base leading-none">🎉</span>
            ) : (
              <Heart className="w-4 h-4" />
            )}
            {toast.message}
          </div>
        </div>
      )}

      {/* Welcome/Instructions Modal */}
      {showWelcomeModal && gallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Welcome to your Gallery
            </h3>
            <p className="text-slate-600 mb-6 text-sm">
              Please select your agreed number of{" "}
              <strong>{gallery?.selection_limit} photos</strong> first.
              <br />
              <br />
              If you wish to select more than {gallery?.selection_limit}, you
              will be asked to confirm before selecting extras.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setShowWelcomeModal(false)}
                className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balance Warning Modal */}
      {showBalanceWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-xl animate-in fade-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setShowBalanceWarningModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Notice</h3>
            <p className="text-slate-600 mb-6 text-sm">
              {downloadLimit > 0
                ? `You can download up to ${downloadLimit} high-res images. To download the rest, please clear the remaining balance.`
                : "Once the balance has been cleared, you will be able to download high-res images and videos."}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setShowBalanceWarningModal(false)}
                className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors"
              >
                View Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Downloads Locked
            </h3>
            <p className="text-slate-600 mb-6 text-sm">
              You have a remaining balance of{" "}
              <strong className="text-slate-900">
                {formatCurrency(balanceDue)}
              </strong>
              .
              <br />
              <span className="text-xs text-slate-500 mt-2 block">
                (Agreed: {formatCurrency(agreedAmount)} - Paid:{" "}
                {formatCurrency(amountPaid)})
              </span>
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setShowPayModal(false)}
                className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              <p className="text-xs text-slate-400">
                Contact your photographer to settle payment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Locked Extra Image Modal */}
      {showExtraImageModal && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setShowExtraImageModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-[#EDE5D8] animate-in fade-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowExtraImageModal(false)}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-amber-700" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Extra Image Locked
            </h3>
            <p className="text-slate-700 mb-2 text-sm leading-relaxed">
              Kindly note: this is an <strong>extra image</strong>. Kindly pay to access the high-res image.
            </p>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Once payment for your extra selected photo(s) is confirmed with the studio, high-resolution downloads will be unlocked immediately.
            </p>
            <div className="space-y-2.5">
              <a
                href={`https://wa.me/254705268604?text=${encodeURIComponent(
                  `Hello Mwabonje Photography, I would like to pay for the locked extra image(s) in my "${displayGalleryTitle || gallery?.client_name || "Client"}" gallery to access the high-res downloads.`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#2C241E] text-white py-2.5 px-4 rounded-xl font-medium hover:bg-[#1E1813] transition-colors inline-flex items-center justify-center gap-2 text-sm"
              >
                <Send className="w-4 h-4" />
                <span>Contact Studio to Unlock</span>
              </a>
              <button
                type="button"
                onClick={() => setShowExtraImageModal(false)}
                className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-xl font-medium hover:bg-slate-200 transition-colors text-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Progress Modal */}
      {downloadingAll && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
                <div className="absolute inset-0 border-2 border-slate-200 rounded-full"></div>
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Preparing Download
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {downloadStatusText}
              </p>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-xs mb-2 font-medium">
                <span className="text-slate-600">Progress</span>
                <span className="text-emerald-600">{downloadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-200 ease-out"
                  style={{ width: `${downloadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">
                Please do not close this window.
              </p>
            </div>

            <button
              onClick={cancelDownloadAll}
              className="w-full py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Ready ZIP Modal for Seamless Mobile & Desktop Downloads */}
      {readyZipModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center animate-in zoom-in-95 text-white">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <FolderDown className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Gallery ZIP is Ready!
            </h3>
            <p className="text-xs text-slate-300 mt-1 mb-5">
              {readyZipModal.count} photos packaged into {readyZipModal.name}.
            </p>
            {readyZipModal.skippedExtrasCount && readyZipModal.skippedExtrasCount > 0 ? (
              <div className="mb-4 p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-200 text-[11px] leading-relaxed">
                {readyZipModal.skippedExtrasCount} locked extra image{readyZipModal.skippedExtrasCount === 1 ? " was" : "s were"} excluded. Kindly pay for extra images to unlock their high-res versions.
              </div>
            ) : null}

            <div className="space-y-2.5">
              <a
                href={readyZipModal.url}
                download={readyZipModal.name}
                onClick={() => {
                  setToast({ message: "Download started!", type: "download" });
                  setTimeout(() => setToast(null), 3000);
                }}
                className="w-full py-3.5 px-4 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-sm"
              >
                <Download className="w-4 h-4" />
                Save ZIP to Device
              </a>

              {typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof navigator.canShare === "function" && (
                <button
                  onClick={async () => {
                    try {
                      const zipFile = new File([readyZipModal.blob], readyZipModal.name, {
                        type: "application/zip",
                      });
                      if (navigator.canShare({ files: [zipFile] })) {
                        await navigator.share({
                          files: [zipFile],
                          title: readyZipModal.name,
                        });
                      }
                    } catch (err: any) {
                      if (err.name !== "AbortError") {
                        console.warn("Share error:", err);
                      }
                    }
                  }}
                  className="w-full py-3 px-4 bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700/80 font-medium rounded-xl flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-all text-xs"
                >
                  <Send className="w-4 h-4" />
                  Save to Files / AirDrop
                </button>
              )}
            </div>

            {readyZipModal.videoFiles && readyZipModal.videoFiles.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10 text-left">
                <p className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                  <FileVideo className="w-3.5 h-3.5 text-blue-400" />
                  Video Files (Download individually):
                </p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {readyZipModal.videoFiles.map((vf) => {
                    const vfName = vf.title || vf.file_path.split("/").pop() || "video.mp4";
                    const directVfUrl = rewriteUrlToR2(vf.file_url);
                    const dlUrl = `/api/download?url=${encodeURIComponent(directVfUrl)}&name=${encodeURIComponent(vfName)}`;
                    return (
                      <a
                        key={vf.id}
                        href={dlUrl}
                        download={vfName}
                        className="py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-between text-xs text-slate-200 transition-colors"
                      >
                        <span className="truncate max-w-[170px]">{vfName}</span>
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold shrink-0">
                          <Download className="w-3 h-3" />
                          Download
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
              Tip on iPhone: Tap "Save ZIP to Device" to save into your Files app, or tap the download button on any individual photo to save straight to Apple Photos.
            </p>

            <button
              onClick={() => {
                if (readyZipModal.url) {
                  window.URL.revokeObjectURL(readyZipModal.url);
                }
                setReadyZipModal(null);
              }}
              className="mt-3 w-full py-2 text-slate-400 hover:text-white font-medium text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Screenshot Warning Modal */}
      {showScreenshotWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div className="relative">
              <button
                onClick={() => setShowScreenshotWarning(false)}
                className="absolute right-0 top-0 text-slate-400 hover:text-slate-600 p-3 -mt-2 -mr-2"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Screenshotting Not Allowed
              </h3>
              <p className="text-slate-600 mb-6 text-sm">
                To protect the photographer's work, screenshots are disabled.
                <br />
                <br />
                {isSelectionMode ? (
                  <span className="font-medium text-rose-600">
                    Downloads are currently disabled while Selection Mode is
                    active. Please select your favorites first.
                  </span>
                ) : (
                  <span>
                    Please{" "}
                    {!canDownloadAll
                      ? "complete the payment"
                      : "use the download button"}{" "}
                    to access high-quality versions of these images.
                  </span>
                )}
              </p>
              <button
                onClick={() => setShowScreenshotWarning(false)}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal (Editorial Portfolio + Client Delivery) */}
      {lightboxFile && !isSelectionLockedOut && (
        <GalleryLightbox
          displayedFiles={displayedFiles}
          currentFile={lightboxFile}
          onSelectFile={(file) => setLightboxFileWithTracking(file)}
          onClose={() => setLightboxFile(null)}
          galleryTitle={displayGalleryTitle}
          galleryClientName={gallery?.client_name}
          galleryCategory={gallery?.category}
          isPortfolio={Boolean(isPortfolio)}
          isPrintsGallery={Boolean(isPrintsGallery)}
          getDisplayUrl={getDisplayUrl}
          isBalanceLocked={isBalanceLocked}
          isExtraLocked={isExtraLocked}
          isFileLocked={isFileLocked}
          isSelectionMode={Boolean(isSelectionMode)}
          selectionSubmitted={Boolean(selectionSubmitted)}
          selectedFileIds={selectedFileIds}
          selectionNotes={selectionNotes}
          updateSelectionNoteLocal={updateSelectionNoteLocal}
          saveSelectionNoteDb={saveSelectionNoteDb}
          toggleSelection={toggleSelection}
          localFavouriteIds={localFavouriteIds}
          toggleLocalFavourite={toggleLocalFavourite}
          downloadingId={downloadingId}
          singleDownloadStats={singleDownloadStats}
          handleDownload={handleDownload}
          cancelSingleDownload={cancelSingleDownload}
          onShowScreenshotWarning={() => setShowScreenshotWarning(true)}
          onShowBalanceWarning={() => setShowBalanceWarningModal(true)}
          handleLongPressStart={handleLongPressStart}
          handleLongPressEnd={handleLongPressEnd}
          watermarkOverlay={<WatermarkOverlay />}
        />
      )}
    
      {/* Unlock Selection Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Unlock Selections</h3>
            <p className="text-sm text-slate-600 mb-6">
              Please enter the 4-character PIN provided by your photographer to unlock and modify your submitted selections.
            </p>
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={unlockPinInput}
                  onChange={(e) => setUnlockPinInput(e.target.value.toUpperCase())}
                  placeholder="Enter PIN"
                  maxLength={4}
                  className="w-full text-center text-2xl tracking-widest font-mono py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
                />
                {unlockError && <p className="text-red-500 text-sm mt-2">{unlockError}</p>}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUnlockModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUnlockSelection}
                  disabled={unlockPinInput.length !== 4 || submittingSelection}
                  className="flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {submittingSelection ? 'Unlocking...' : 'Unlock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Gallery Site Footer */}
      {isPortfolio && (
        <footer className="bg-slate-950 text-white py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 border-t border-white/10">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-10 pb-10 sm:pb-12 border-b border-white/10">
            <div>
              <span className="font-serif text-2xl sm:text-3xl font-bold tracking-widest text-white">
                MWABONJE
              </span>
              <p className="text-slate-400 text-xs tracking-wider uppercase mt-2">
                East African Photography &amp; Film Studio
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs uppercase tracking-widest font-semibold text-slate-300">
              <Link to="/#work" className="hover:text-white transition-colors py-1">
                Portfolio
              </Link>
              <Link to="/?category=FILMS#work" className="hover:text-white transition-colors py-1">
                Films
              </Link>
              <Link to="/blog" className="hover:text-white transition-colors py-1">
                Journal
              </Link>
              <Link to="/about" className="hover:text-white transition-colors py-1">
                About
              </Link>
              <Link to="/faq" className="hover:text-white transition-colors py-1">
                FAQ
              </Link>
              <a
                href="https://mwabonjebooking.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors py-1"
              >
                Contact
              </a>
            </div>
          </div>

          <div className="max-w-[1600px] mx-auto pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
            <p>&copy; {new Date().getFullYear()} MWABONJE. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a
                href="https://instagram.com/mwabonje"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Instagram
              </a>
              <a
                href="https://wa.me/254705268604"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
