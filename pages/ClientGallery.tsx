import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
} from "lucide-react";
import { supabase } from "../services/supabase";
import { Gallery, GalleryFile } from "../types";
import { generateSlug } from "../utils/slug";
import {
  formatCurrency,
  getTimeRemaining,
  getOptimizedImageUrl,
  rewriteUrlToR2,
} from "../utils/formatters";
import { SEO } from "../components/SEO";
// @ts-ignore
import JSZip from "jszip";
// @ts-ignore
import saveAs from "file-saver";

const WatermarkOverlay = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="36" fill="rgba(255,255,255,0.25)" transform="rotate(-45 150 150)" letter-spacing="6">
            MWABONJE
        </text>
    </svg>`;
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return (
    <div
      className="absolute inset-0 pointer-events-none z-[8] select-none mix-blend-overlay drop-shadow-md"
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
  const { galleryId } = useParams<{ galleryId: string }>();
  const navigate = useNavigate();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [downloadedImageIds, setDownloadedImageIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
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
  const [acceptedExtras, setAcceptedExtras] = useState(false);

  // Selection Mode State
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectionNotes, setSelectionNotes] = useState<Record<string, string>>(
    {},
  );
  const [submittingSelection, setSubmittingSelection] = useState(false);
  const [selectionSubmitted, setSelectionSubmitted] = useState(false);
  const [viewFilter, setViewFilter] = useState<
    "all" | "selected" | "main" | "extras"
  >("all");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "info";
  } | null>(null);
  const [lightboxFile, setLightboxFile] = useState<GalleryFile | null>(null);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Download states
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatusText, setDownloadStatusText] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [singleDownloadStats, setSingleDownloadStats] = useState<{
    loaded: number;
    total: number;
  } | null>(null);

  const horizontalRef = useRef<HTMLDivElement | null>(null);

  // Ref to cancel download if needed
  const abortControllerRef = useRef<AbortController | null>(null);
  const singleAbortControllerRef = useRef<AbortController | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastWheelTime = useRef<number>(0);
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedDelta = useRef<number>(0);

  const cancelSingleDownload = () => {
    if (singleAbortControllerRef.current) {
      singleAbortControllerRef.current.abort();
      setDownloadingId(null);
      setSingleDownloadStats(null);
    }
  };

  useEffect(() => {
    if (galleryId) {
      loadGallery();
      const storedDownloads = localStorage.getItem(`gallery_downloads_${galleryId}`);
      if (storedDownloads) {
        try {
          setDownloadedImageIds(JSON.parse(storedDownloads));
        } catch (e) {
          console.error('Failed to parse stored downloads', e);
        }
      }
    }
  }, [galleryId]);

  useEffect(() => {
    if (gallery?.seo_title) {
      document.title = gallery.seo_title;
    } else if (gallery?.client_name) {
      document.title = `${gallery.client_name} - Gallery`;
    }

    if (gallery?.seo_description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", gallery.seo_description);
    }
  }, [gallery]);

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

  const loadGallery = async () => {
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

      if (galError || !galData) {
        setError("Gallery not found or accessed denied.");
        setLoading(false);
        return;
      }

      const activeGalleryId = galData.id;

      if (!galData.link_enabled) {
        setError(
          "This gallery is currently unavailable. Please contact the photographer.",
        );
        setLoading(false);
        return;
      }

      setGallery(galData);

      // Track Analytics View via R2 backend
      const trackView = async () => {
        const viewedKey = `viewed_${activeGalleryId}`;
        if (!localStorage.getItem(viewedKey)) {
          // Check session to exclude photographer
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session || session.user.id !== galData!.photographer_id) {
            try {
              const isNetlify =
                typeof window !== "undefined" &&
                window.location.hostname.includes("netlify.app");
              await fetch(
                isNetlify
                  ? "/.netlify/functions/sys-interaction"
                  : "/api/sys/interaction",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    galleryId: activeGalleryId,
                    event: "view",
                  }),
                  keepalive: true,
                },
              );
            } catch (e) {
              console.warn("Failed to track view:", e);
            }
          }
          // Mark as viewed regardless of whether they are photographer or client
          localStorage.setItem(viewedKey, "true");
        }
      };
      trackView().catch((e) => console.warn("Failed to track view:", e));

      const agreedAmount = galData.agreed_balance || 0;
      const amountPaid = galData.amount_paid || 0;
      const balanceDue = Math.max(0, agreedAmount - amountPaid);

      if (
        balanceDue > 0 &&
        !(galData.category && galData.category.trim() !== "")
      ) {
        setShowBalanceWarningModal(true);
      }

      if (
        galData.selection_status === "submitted" ||
        galData.selection_status === "completed"
      ) {
        setSelectionSubmitted(true);
      }

      // Load Files
      let allFiles: GalleryFile[] = [];
      let hasMore = true;
      let offset = 0;
      const limit = 1000;

      while (hasMore) {
        const { data: fileData, error: fileError } = await supabase
          .from("files")
          .select("*")
          .eq("gallery_id", activeGalleryId)
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

      if (allFiles.length === 0) {
        setError(
          "This gallery link has expired. Please contact the photographer to request access.",
        );
      } else {
        setFiles(allFiles);
      }

      // Load Selections if enabled
      if (galData.selection_enabled) {
        const { data: selectionData } = await supabase
          .from("selections")
          .select("file_id, client_note, created_at")
          .eq("gallery_id", activeGalleryId)
          .order("created_at", { ascending: true }); // Important for counting extras

        if (selectionData) {
          setSelectedFileIds(new Set(selectionData.map((s) => s.file_id)));
          const notes: Record<string, string> = {};
          const dates: Record<string, string> = {};
          selectionData.forEach((s) => {
            if (s.client_note) notes[s.file_id] = s.client_note;
            if (s.created_at) dates[s.file_id] = s.created_at;
          });
          setSelectionNotes(notes);
          setSelectionDates(dates);
          if (
            selectionData.length === 0 &&
            galData.selection_limit > 0 &&
            galData.selection_status !== "submitted" &&
            galData.selection_status !== "completed"
          ) {
            setShowWelcomeModal(true);
          }
          if (
            galData.selection_limit > 0 &&
            selectionData.length >= galData.selection_limit
          ) {
            setAcceptedExtras(true); // Don't prompt randomly if they already accepted
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError("Error loading gallery.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = async (file: GalleryFile) => {
    if (!gallery?.selection_enabled || selectionSubmitted) return;
    
    // Always track click on the file when interacted with
    trackFileClick(file.id);

    const isSelected = selectedFileIds.has(file.id);

    if (!isSelected && gallery.selection_limit && gallery.selection_limit > 0) {
      if (selectedFileIds.size >= gallery.selection_limit && !acceptedExtras) {
        const confirmExtras = window.confirm(
          `You have reached the agreed limit of ${gallery.selection_limit} photos.\n\nDo you want to proceed with selecting extras?`,
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
        const now = new Date().toISOString();
        setSelectionDates(prev => ({ ...prev, [file.id]: now }));
        const { error } = await supabase
          .from("selections")
          .insert({ gallery_id: gallery.id, file_id: file.id, created_at: now });
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
    try {
      // Due to RLS restrictions on UPDATE for public users, we delete and re-insert to update the note
      const { error: delError } = await supabase
        .from("selections")
        .delete()
        .eq("gallery_id", gallery.id)
        .eq("file_id", fileId);

      if (delError) {
        console.error("Failed to delete selection for note update", delError);
        return;
      }

      const { error: insError } = await supabase
        .from("selections")
        .insert({
          gallery_id: gallery.id,
          file_id: fileId,
          client_note: note,
          ...(selectionDates[fileId] ? { created_at: selectionDates[fileId] } : {})
        });

      if (insError) {
        console.error("Failed to insert updated note", insError);
      }
    } catch (err) {
      console.error("Error updating note", err);
    }
  };

  const submitSelection = async () => {
    if (!gallery) return;
    if (
      !confirm(
        `Are you sure you want to submit your selection of ${selectedFileIds.size} photos? This will notify the photographer.`,
      )
    )
      return;

    setSubmittingSelection(true);
    try {
      const { error } = await supabase.rpc("submit_selection", {
        gallery_id: gallery.id,
      });

      if (error) throw error;

      setSelectionSubmitted(true);
      setGallery({
        ...gallery,
        selection_status: "submitted",
        link_enabled: false,
      });
      setError(
        "This gallery is currently unavailable. Please contact the photographer.",
      );

      alert(
        "Selection submitted successfully! The photographer has been notified.",
      );
    } catch (err: any) {
      console.error(err);
      alert(
        "Failed to submit selection: " + (err?.message || JSON.stringify(err)),
      );
    } finally {
      setSubmittingSelection(false);
    }
  };

  const unsubmitSelection = async () => {
    if (!gallery) return;
    if (
      !confirm(
        `Are you sure you want to edit your selection? This will notify the photographer that you are making changes.`,
      )
    )
      return;

    setSubmittingSelection(true);
    try {
      const { error } = await supabase.rpc("unsubmit_selection", {
        gallery_id: gallery.id,
      });

      if (error) throw error;

      setSelectionSubmitted(false);
      setGallery({ ...gallery, selection_status: "pending" });

      alert("Selection re-opened for editing.");
    } catch (err: any) {
      console.error(err);
      alert(
        "Failed to re-open selection: " + (err?.message || JSON.stringify(err)),
      );
    } finally {
      setSubmittingSelection(false);
    }
  };

  const handleDownload = async (file: GalleryFile) => {
    if (!gallery) return;

    if (gallery.selection_enabled) {
      alert("Downloads are disabled while Selection Mode is active.");
      return;
    }

    if (isFileLocked(file.id)) {
      setShowPayModal(true);
      return;
    }

    setDownloadingId(file.id);
    setSingleDownloadStats({ loaded: 0, total: 0 });
    singleAbortControllerRef.current = new AbortController();

    // Track the download for the limit
    setDownloadedImageIds(prev => {
      if (prev.includes(file.id)) return prev;
      const next = [...prev, file.id];
      if (gallery.id) localStorage.setItem(`gallery_downloads_${gallery.id}`, JSON.stringify(next));
      return next;
    });

    try {
      await supabase.rpc("increment_download", { row_id: file.id });
      trackFileClick(file.id);

      const response = await fetch(rewriteUrlToR2(file.file_url), {
        signal: singleAbortControllerRef.current.signal,
      });

      if (!response.body) {
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download =
          file.title || file.file_path.split("/").pop() || "download";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const contentLength = response.headers.get("content-length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;
      setSingleDownloadStats({ loaded, total });

      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        loaded += value.length;

        setSingleDownloadStats({ loaded, total });
      }

      const blob = new Blob(chunks, {
        type: response.headers.get("content-type") || "",
      });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download =
        file.title || file.file_path.split("/").pop() || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Short timeout to allow the download to start before removing spinner
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (e: any) {
      if (e.name === "AbortError") {
        console.log("Download cancelled");
      } else {
        console.error("Download failed", e);
        alert("Download failed. Please check your internet connection.");
      }
    } finally {
      setDownloadingId(null);
      setSingleDownloadStats(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!gallery || !files.length) return;

    if (gallery.selection_enabled) {
      alert("Downloads are disabled while Selection Mode is active.");
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
      let globalProcessed = 0;
      const total = files.length;
      const galleryName = gallery.client_name
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();

      // Bulk increment download counts for all files in the gallery
      const fileIds = files.map((f) => f.id);
      const { error: bulkError } = await supabase.rpc(
        "increment_downloads_bulk",
        { file_ids: fileIds },
      );
      if (bulkError) {
        console.error(
          "Failed to bulk increment downloads. Make sure the increment_downloads_bulk RPC exists.",
          bulkError,
        );
        // Optional: we could fallback to individual increments, but for large galleries it might trigger rate limits.
      }
      
      // Also increment clicks for all files
      fileIds.forEach((id) => trackFileClick(id));

      const zip = new JSZip();

      setDownloadStatusText("Preparing list...");

      const CONCURRENCY_LIMIT = 3;
      const queue = [...files];
      const activePromises: Promise<void>[] = [];

      const processFile = async (file: GalleryFile) => {
        if (abortControllerRef.current?.signal.aborted) return;
        try {
          const response = await fetch(rewriteUrlToR2(file.file_url), {
            signal: abortControllerRef.current.signal,
          });
          if (!response.ok)
            throw new Error(`Failed to fetch ${file.file_path}`);
          const blob = await response.blob();
          const fileName =
            file.title || file.file_path.split("/").pop() || `file-${file.id}`;
          zip.file(fileName, blob);
        } catch (error: any) {
          if (error.name !== "AbortError") {
            console.error(`Error downloading file: ${file.id}`, error);
          }
        } finally {
          globalProcessed++;
          setDownloadProgress(Math.round((globalProcessed / total) * 100));
          setDownloadStatusText(
            `Fetching files (${globalProcessed}/${total})...`,
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

      for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, files.length); i++) {
        activePromises.push(next());
      }

      await Promise.all(activePromises);

      if (abortControllerRef.current?.signal.aborted) return;

      setDownloadStatusText("Packaging... (almost done)");

      const content = await zip.generateAsync({
        type: "blob",
        compression: "STORE",
      });

      if (abortControllerRef.current?.signal.aborted) return;

      const zipName = `${galleryName}_photos.zip`;

      saveAs(content, zipName);

      // Log download all feature
      try {
        // You could optionally increment all files' download counters here if desired
        // For now, logging the activity is sufficient
        await supabase.from("activity_logs").insert({
          gallery_id: id,
          action: `Client downloaded all ${files.length} photos`,
        });
      } catch (err) {}
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Error creating zip:", error);
        alert(
          "Failed to download all files. Please try downloading individually.",
        );
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
    gallery?.category && gallery.category.trim() !== "",
  );
  
  const isBalancePending = balanceDue > 0 && !isPortfolio;
  
  const downloadLimit = gallery?.downloads_before_clearing || 0;
  const canDownloadAll = !isBalancePending || (downloadLimit >= files.length);

  
  const getDisplayUrl = (file: GalleryFile, isLightbox = false) => {
    const legacyThumbnail = file.thumbnail_url;
    
    const computeWatermarkUrl = (url: string) => {
        if (!url) return url;
        const parts = url.split('/');
        const filename = parts.pop();
        if (!filename) return url;
        return parts.join('/') + '/watermark_' + filename + '.jpg';
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
    if (!isBalancePending) return false;
    if (downloadLimit <= 0) return true;
    if (downloadedImageIds.includes(fileId)) return false;
    if (downloadedImageIds.length >= downloadLimit) return true;
    return false;
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
  const isHorizontalLayout = explicitSwipe ? true : (explicitGrid ? false : (isPortraitGallery || isFilmGallery));
  const isInstagramGrid = explicitGrid;
  const isMasonryPortfolio = isPortfolio && !explicitGrid && !explicitSwipe && !isHorizontalLayout;

  // Selection mode is not relevant for portfolio collections
  const isSelectionMode = !isPortfolio && gallery?.selection_enabled;

  const limit = gallery?.selection_limit || 0;
  const selectedArray = Array.from(selectedFileIds);
  const mainSelections =
    limit > 0 ? selectedArray.slice(0, limit) : selectedArray;
  const extraSelections = limit > 0 ? selectedArray.slice(limit) : [];

  let displayedFiles = files;
  if (viewFilter === "selected")
    displayedFiles = files.filter((f) => selectedFileIds.has(f.id));
  if (viewFilter === "main")
    displayedFiles = files.filter((f) => mainSelections.includes(f.id));
  if (viewFilter === "extras")
    displayedFiles = files.filter((f) => extraSelections.includes(f.id));

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

  const handlePrevLightbox = (e?: React.MouseEvent | KeyboardEvent) => {
    if (e && "stopPropagation" in e) e.stopPropagation();
    if (!lightboxFile) return;
    const index = displayedFiles.findIndex((f) => f.id === lightboxFile.id);
    if (index > 0) {
      setLightboxFileWithTracking(displayedFiles[index - 1]);
    } else {
      setLightboxFileWithTracking(displayedFiles[displayedFiles.length - 1]);
    }
  };

  const handleNextLightbox = (e?: React.MouseEvent | KeyboardEvent) => {
    if (e && "stopPropagation" in e) e.stopPropagation();
    if (!lightboxFile) return;
    const index = displayedFiles.findIndex((f) => f.id === lightboxFile.id);
    if (index !== -1 && index < displayedFiles.length - 1) {
      setLightboxFileWithTracking(displayedFiles[index + 1]);
    } else {
      setLightboxFileWithTracking(displayedFiles[0]);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe) {
      handleNextLightbox();
    }
    if (isRightSwipe) {
      handlePrevLightbox();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Prevent native scrolling so it doesn't fight with our image transition and scrollIntoView
    // Check if the event is cancelable before preventing default (React synthetic events might not need this, but good practice)
    // Wait, e.preventDefault() in React WheelEvent is allowed if it's not a passive listener. 
    // Just in case, if it throws a warning, it's fine, but let's prevent the default scroll.
    e.preventDefault();

    // Determine the primary scrolling direction (horizontal vs vertical)
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    
    // Smooth scrolling for trackpads: Accumulate delta instead of time delay
    accumulatedDelta.current += delta;

    // Threshold determines how much scrolling is required to change an image
    // A threshold of ~50-100 feels smooth on Mac trackpads
    const threshold = 60;

    if (accumulatedDelta.current > threshold) {
      handleNextLightbox();
      accumulatedDelta.current = 0;
    } else if (accumulatedDelta.current < -threshold) {
      handlePrevLightbox();
      accumulatedDelta.current = 0;
    }

    // Reset accumulated delta if the user stops scrolling for a short time
    if (wheelTimeoutRef.current) {
      clearTimeout(wheelTimeoutRef.current);
    }
    wheelTimeoutRef.current = setTimeout(() => {
      accumulatedDelta.current = 0;
    }, 150);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxFile) return;

      // Do not handle keyboard events if the user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevLightbox(e);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextLightbox(e);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setLightboxFile(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxFile, displayedFiles]);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (lightboxFile) {
      const thumb = document.getElementById(`thumbnail-${lightboxFile.id}`);
      if (thumb) {
        thumb.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
      // Prevent body scroll when lightbox is open
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxFile]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 relative flex items-center justify-center">
          <div className="absolute inset-0 border border-slate-100 rounded-full"></div>
          <div className="absolute inset-0 border border-slate-900 border-r-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100 max-w-md w-full">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-slate-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-3">
            Gallery Unavailable
          </h1>
          <p className="text-slate-600 mb-8 leading-relaxed">{error}</p>
          <div className="pt-6 border-t border-slate-100">
            <p className="text-sm text-slate-400">Mwabonje</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-white text-slate-900 select-none ${isSelectionMode ? "pb-24" : ""}`}
    >
      <SEO 
        title={gallery ? `${gallery.client_name} | Mwabonje` : "Gallery | Mwabonje"}
        description={gallery ? `View the ${gallery.client_name} photography gallery by Mwabonje. Discover stunning visual storytelling and beautiful moments.` : "Explore professional photography galleries by Mwabonje."}
        image={(files.length > 0 && files[0].file_url) ? files[0].file_url : `${window.location.origin}/og-image.jpg`}
        url={window.location.origin + window.location.pathname}
        type="website"
        keywords={`photography, gallery, Mwabonje, ${gallery?.client_name || ""}, ${gallery?.category || "portraits"}, professional photographer, visual storytelling`}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "ImageGallery",
          name: gallery?.client_name || "Gallery",
          url: window.location.href,
          author: {
            "@type": "Person",
            name: "Mwabonje",
          },
        }}
      />
      {/* Header */}
      <header className="sticky top-0 z-20 shadow-sm transition-all duration-300 bg-white/95 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 flex flex-col md:flex-row justify-between md:items-center gap-3 md:gap-4">
          <div>
            <h1
              className={`text-lg md:text-xl font-bold flex items-center gap-2 ${isPortfolio ? "text-slate-900 tracking-widest uppercase font-sans" : "text-slate-900"}`}
            >
              {viewFilter !== "all" ? (
                <button
                  onClick={() => setViewFilter("all")}
                  className="md:hidden mr-1 p-2 -ml-2 text-slate-400"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              ) : isPortfolio ? (
                <button
                  onClick={() => navigate(`/`)}
                  className="mr-1 p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              ) : null}
              {viewFilter === "selected"
                ? "My Selection"
                : viewFilter === "main"
                  ? "Main Photos"
                  : viewFilter === "extras"
                    ? "Extra Photos"
                    : gallery?.client_name}
            </h1>
            {!isPortfolio && (
              <p className="text-xs md:text-sm flex items-center gap-2 text-slate-500">
                {displayedFiles.length} items
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3 text-sm">
            {!isPortfolio && gallery?.photographer_id && (
              <button
                onClick={() => navigate(`/`)}
                className="flex items-center gap-1.5 px-4 h-10 bg-[#161616] text-white/90 rounded-md font-bold tracking-[0.15em] text-[10px] md:text-[11px] hover:bg-black hover:text-white transition-all shadow-sm group active:scale-[0.98]"
              >
                PORTFOLIO{" "}
                <ArrowUpRight className="w-3.5 h-3.5 text-white/70 group-hover:text-white transition-colors" />
              </button>
            )}
            {isSelectionMode ? (
              // Selection Mode Header Content
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 h-10 bg-rose-50 text-rose-700 rounded-full font-medium border border-rose-100 shadow-sm text-xs md:text-sm animate-in fade-in">
                  <Heart className="w-4 h-4 text-rose-600 fill-rose-600" />
                  <span>Selection Mode Active</span>
                </div>
              </div>
            ) : !isPortfolio ? (
              // Standard Mode Header Content
              <>
                {/* Download All Button */}
                <button
                  onClick={handleDownloadAll}
                  disabled={downloadingAll || files.length === 0}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 h-10 rounded-lg font-medium transition-all text-sm shadow-sm ${
                    !canDownloadAll
                      ? "bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed"
                      : downloadingAll
                        ? "bg-[#0f1423] border border-white/5 text-slate-400 cursor-wait opacity-80"
                        : "bg-[#0f1423] border border-white/5 text-white hover:bg-[#161d30] hover:shadow-md active:scale-[0.98]"
                  }`}
                >
                  {downloadingAll ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Preparing...</span>
                    </>
                  ) : (
                    <>
                      <FolderDown className="w-4 h-4 text-slate-200" />
                      <span>Download All</span>
                    </>
                  )}
                </button>

                {isBalancePending ? (
                  <div className="flex items-center gap-2 bg-slate-50 px-4 h-10 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex flex-col text-right justify-center">
                      <span className="text-slate-500 text-[9px] uppercase tracking-wider font-semibold leading-none mb-0.5">
                        {downloadLimit > 0 ? `${Math.max(0, downloadLimit - downloadedImageIds.length)} Free Downloads` : "Balance Due"}
                      </span>
                      <span className="font-bold text-slate-800 text-sm leading-none">
                        {formatCurrency(balanceDue)}
                      </span>
                    </div>
                    <Lock className="w-4 h-4 text-slate-500" />
                  </div>
                ) : agreedAmount === 0 ? (
                  <div className="flex items-center gap-2.5 px-4 h-10 bg-[#f4f6ff] text-indigo-700 rounded-full font-medium border border-indigo-100 shadow-sm text-sm">
                    <Heart className="w-4 h-4 text-indigo-600" />
                    <span>Collaboration</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 px-4 h-10 bg-emerald-50 text-emerald-700 rounded-full font-medium border border-emerald-100 shadow-sm text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Paid in Full</span>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>

        {/* Visual Countdown Banner */}
        {timeLeft && !isPortfolio && (
          <div
            className={`w-full py-1.5 px-4 text-center text-[10px] md:text-xs font-semibold tracking-[0.2em] uppercase transition-colors duration-500 flex justify-center items-center gap-2 md:gap-3 ${
              timeLeft.expired
                ? "bg-slate-100 text-slate-500 border-b border-slate-200"
                : timeLeft.days === 0 && timeLeft.hours < 24
                  ? "bg-slate-900 text-white"
                  : "bg-slate-50 text-slate-500 border-b border-slate-200"
            }`}
          >
            {timeLeft.expired ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4" /> GALLERY
                EXPIRED
              </>
            ) : (
              <>
                <Clock
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 ${timeLeft.days === 0 && timeLeft.hours < 24 ? "text-slate-400" : "text-slate-400"}`}
                />
                <span
                  className={
                    timeLeft.days === 0 && timeLeft.hours < 24
                      ? "text-slate-300"
                      : "text-slate-500"
                  }
                >
                  Expires In:
                </span>
                <div className="flex items-center gap-1 md:gap-1.5 ml-1 font-mono text-[11px] md:text-[13px] tracking-wider">
                  <span
                    className={
                      timeLeft.days === 0 && timeLeft.hours < 24
                        ? "bg-white/10 px-1.5 py-0.5 rounded"
                        : "bg-slate-200/50 px-1.5 py-0.5 rounded"
                    }
                  >
                    {timeLeft.days.toString().padStart(2, "0")}
                  </span>
                  <span
                    className={
                      timeLeft.days === 0 && timeLeft.hours < 24
                        ? "text-slate-400 text-[9px] mr-1"
                        : "text-slate-400 text-[9px] mr-1"
                    }
                  >
                    D
                  </span>
                  <span
                    className={
                      timeLeft.days === 0 && timeLeft.hours < 24
                        ? "text-slate-600"
                        : "text-slate-300"
                    }
                  >
                    :
                  </span>
                  <span
                    className={
                      timeLeft.days === 0 && timeLeft.hours < 24
                        ? "bg-white/10 px-1.5 py-0.5 rounded"
                        : "bg-slate-200/50 px-1.5 py-0.5 rounded"
                    }
                  >
                    {timeLeft.hours.toString().padStart(2, "0")}
                  </span>
                  <span
                    className={
                      timeLeft.days === 0 && timeLeft.hours < 24
                        ? "text-slate-400 text-[9px] mr-1"
                        : "text-slate-400 text-[9px] mr-1"
                    }
                  >
                    H
                  </span>
                  <span
                    className={
                      timeLeft.days === 0 && timeLeft.hours < 24
                        ? "text-slate-600"
                        : "text-slate-300"
                    }
                  >
                    :
                  </span>
                  <span
                    className={
                      timeLeft.days === 0 && timeLeft.hours < 24
                        ? "bg-white/10 px-1.5 py-0.5 rounded"
                        : "bg-slate-200/50 px-1.5 py-0.5 rounded"
                    }
                  >
                    {timeLeft.minutes.toString().padStart(2, "0")}
                  </span>
                  <span
                    className={
                      timeLeft.days === 0 && timeLeft.hours < 24
                        ? "text-slate-400 text-[9px] mr-1"
                        : "text-slate-400 text-[9px] mr-1"
                    }
                  >
                    M
                  </span>
                  <span
                    className={
                      timeLeft.days === 0 && timeLeft.hours < 24
                        ? "text-slate-600"
                        : "text-slate-300"
                    }
                  >
                    :
                  </span>
                  <span
                    className={
                      timeLeft.days === 0 && timeLeft.hours < 24
                        ? "bg-white/10 px-1.5 py-0.5 rounded"
                        : "bg-slate-200/50 px-1.5 py-0.5 rounded"
                    }
                  >
                    {timeLeft.seconds.toString().padStart(2, "0")}
                  </span>
                  <span
                    className={
                      timeLeft.days === 0 && timeLeft.hours < 24
                        ? "text-slate-400 text-[9px]"
                        : "text-slate-400 text-[9px]"
                    }
                  >
                    S
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* Grid */}
      <main
        className={
          isHorizontalLayout
            ? "w-full overflow-hidden"
            : "max-w-7xl mx-auto px-2 md:px-4 py-4 md:py-8"
        }
      >
        {isSelectionMode && viewFilter === "all" && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-3 md:hidden">
            <Heart className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
            <p className="text-sm text-rose-800">
              <strong>Selection Mode:</strong> Tap the heart icon to select your
              favorites. Downloads are disabled until selection is complete.
            </p>
          </div>
        )}

        {displayedFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            {viewFilter !== "all" ? (
              <>
                <Heart className="w-16 h-16 text-slate-200 mb-4" />
                <h3 className="text-lg font-semibold text-slate-600">
                  No Photos Selected Yet
                </h3>
                <p className="text-sm mb-6 max-w-xs text-center">
                  Tap the heart icon on photos to add them to your selection.
                </p>
                <button
                  onClick={() => setViewFilter("all")}
                  className="text-rose-600 font-medium hover:underline"
                >
                  Browse All Photos
                </button>
              </>
            ) : (
              <>
                <ImageIcon className="w-16 h-16 text-slate-200 mb-4" />
                <p>No photos available.</p>
              </>
            )}
          </div>
        ) : (
          <div
            ref={isHorizontalLayout ? horizontalRef : undefined}
            className={
              isHorizontalLayout
                ? `flex overflow-x-auto snap-x snap-mandatory md:snap-proximity gap-2 md:gap-4 pb-8 pt-4 sm:pt-8 w-full items-center h-[calc(100vh-140px)] min-h-[500px] px-4 md:px-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${displayedFiles.length === 1 ? "justify-center" : ""}`
                : isInstagramGrid 
                  ? "grid grid-cols-3 gap-1 md:gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500"
                  : isPortfolio 
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 md:gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500" 
                  : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
            }
          >
            {(() => {
              const selectedArray = Array.from(selectedFileIds);
              return displayedFiles.map((file, index) => {
                const isSelected = selectedFileIds.has(file.id);
                let isExtra = false;
                if (
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
                    onClick={() => {
                      if (!isPortfolio) {
                        setLightboxFile(file);
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
                    className={`group relative flex flex-col ${isFilmGallery ? "flex-none w-auto h-full min-w-[300px] snap-center justify-center items-center" : isPortraitGallery ? "flex-none h-full aspect-[4/5] snap-center bg-slate-50" : isPrintsGallery ? "aspect-auto w-full block bg-white border border-slate-100 p-2 shadow-sm rounded-sm" : isInstagramGrid ? "aspect-[4/6] w-full bg-slate-50 relative" : (isPortfolio ? "aspect-auto w-full block bg-slate-50 relative" : "aspect-square bg-slate-100")} overflow-hidden break-inside-avoid shadow-sm hover:shadow-md transition-all ${isSelectionMode && isSelected ? "ring-4 ring-rose-500" : ""} content-vis-auto max-w-full ${isPortfolio ? "active:scale-[0.98] duration-300 md:active:scale-100" : "cursor-pointer"}`}
                    style={{
                      contentVisibility: "auto",
                      WebkitTouchCallout: "none",
                      userSelect: "none",
                    }}
                  >
                    {/* Badges */}
                    {isSelectionMode && isSelected && !isPortfolio && (
                      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 pointer-events-none">
                        <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                          SELECTED
                        </span>
                        {isExtra && (
                          <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                            EXTRA
                          </span>
                        )}
                        {selectionNotes[file.id] && (
                          <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                            NOTE ADDED
                          </span>
                        )}
                      </div>
                    )}
                    {file.file_type === "image" &&
                    !file.file_url?.match(/\.(mp4|mov|webm|ogg)$/i) ? (
                      isPortfolio ? (
                        <img
                          src={getOptimizedImageUrl(
                            getDisplayUrl(file),
                            isPortraitGallery ? 1200 : 800,
                            isPortraitGallery ? 1500 : 1000,
                            75,
                          )}
                          alt="Portfolio item"
                          className={`w-full object-cover block transform transition-transform duration-[1.5s] pointer-events-none will-change-transform ${isPrintsGallery ? "h-auto" : "h-full"} ${isPortraitGallery ? "" : "md:group-hover:scale-[1.02]"}`}
                          loading={index < 4 ? "eager" : "lazy"}
                          decoding="async"
                          // @ts-ignore
                          fetchPriority={index < 4 ? "high" : "auto"}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.dataset.retried) {
                              target.dataset.retried = "true";
                              target.src =
                                rewriteUrlToR2(
                                  getDisplayUrl(file),
                                ) || "";
                            }
                          }}
                          onContextMenu={(e) => e.preventDefault()}
                        />
                      ) : (
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
                            sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 24vw"
                            alt="Gallery item"
                            className="w-full h-full block object-cover transition-transform duration-500 md:group-hover:scale-105 pointer-events-none will-change-transform"
                            loading={index < 8 ? "eager" : "lazy"}
                            decoding="async"
                            // @ts-ignore
                            fetchPriority={index < 8 ? "high" : "auto"}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.removeAttribute("srcset");
                              target.removeAttribute("sizes");
                              if (!target.dataset.retried) {
                                target.dataset.retried = "true";
                                target.src =
                                  rewriteUrlToR2(
                                    getDisplayUrl(file),
                                  ) || "";
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
                      )
                    ) : (
                      <video
                        src={rewriteUrlToR2(file.file_url)}
                        className={`block transform transition-transform duration-[1.5s] ${isFilmGallery ? "w-auto h-full max-w-[90vw] object-contain mx-auto" : "w-full h-full object-cover"} ${isHorizontalLayout ? "" : "md:group-hover:scale-[1.02]"} ${isFilmGallery ? "" : isPortfolio ? "pointer-events-none" : ""}`}
                        controls={isFilmGallery || !isPortfolio}
                        controlsList={
                          isFileLocked(file.id) ? "nodownload nofullscreen" : "nodownload"
                        }
                        disablePictureInPicture={isFileLocked(file.id)}
                        preload="metadata"
                        autoPlay={isPortfolio && !isFilmGallery}
                        muted={isPortfolio && !isFilmGallery}
                        loop={isPortfolio}
                        playsInline={isPortfolio}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    )}

                    {/* Desktop Hover Overlay */}
                    <div
                      className={`hidden md:flex absolute inset-0 z-10 ${isPortfolio ? "bg-black/10" : "bg-black/40"} opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-3 pointer-events-none`}
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
                            className="pointer-events-auto bg-white/95 hover:bg-white text-slate-900 px-4 py-2 rounded-full font-medium flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all shadow-lg text-sm disabled:opacity-75 disabled:cursor-wait"
                          >
                            {downloadingId === file.id ? (
                              <X className="w-4 h-4 text-red-500" />
                            ) : isFileLocked(file.id) ? (
                              <Lock className="w-4 h-4" />
                            ) : (
                              <Download className="w-4 h-4" />
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
                          className={`p-3 rounded-full shadow-md backdrop-blur-sm transition-all active:scale-95 border border-white/20 ${isSelected ? "bg-rose-500 text-white" : "bg-white/90 text-slate-400"}`}
                        >
                          <Heart
                            className={`w-5 h-5 ${isSelected ? "fill-current" : ""}`}
                          />
                        </button>
                      )}
                      {!isSelectionMode && !isPortfolio && (
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
                          className={`flex items-center justify-center gap-1.5 ${downloadingId === file.id && singleDownloadStats ? "px-3 py-2 text-sm max-w-[120px]" : "p-3"} rounded-full shadow-md backdrop-blur-sm transition-all active:scale-95 border border-white/20
                                ${
                                  isFileLocked(file.id)
                                    ? "bg-slate-100/90 text-slate-800"
                                    : "bg-white/90 text-slate-900"
                                }
                                ${downloadingId === file.id ? "!bg-red-50 !text-red-600 !border-red-200" : ""}
                                `}
                        >
                          {downloadingId === file.id ? (
                            <X className="w-5 h-5 shrink-0" />
                          ) : isFileLocked(lightboxFile ? lightboxFile.id : "") ? (
                    <Lock className="w-5 h-5" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                          {downloadingId === file.id && singleDownloadStats && (
                            <span className="font-semibold truncate">
                              {singleDownloadStats.total
                                ? `${Math.round((singleDownloadStats.loaded / singleDownloadStats.total) * 100)}%`
                                : `${(singleDownloadStats.loaded / 1024 / 1024).toFixed(1)}M`}
                            </span>
                          )}
                        </button>
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
      </main>

      {/* Selection Mode Bottom Bar */}
      {isSelectionMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 z-30">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() =>
                  setViewFilter(viewFilter === "all" ? "selected" : "all")
                }
              >
                <div
                  className={`p-2 rounded-full transition-colors ${viewFilter !== "all" ? "bg-rose-500 text-white" : "bg-rose-100 text-rose-600"}`}
                >
                  <Heart
                    className={`w-5 h-5 ${viewFilter !== "all" ? "fill-current" : ""}`}
                  />
                </div>
                <div>
                  <p className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors flex items-center gap-2">
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
                    {viewFilter !== "all"
                      ? "Showing favorites"
                      : "Tap heart to select"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-3 sm:gap-2 w-full sm:w-auto items-center">
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

              {selectionSubmitted ? (
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="flex-1 sm:flex-none bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg font-medium border border-emerald-200 flex items-center justify-center gap-2 text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Submitted</span>
                  </div>
                  <button
                    onClick={unsubmitSelection}
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

      {/* Lightbox Modal */}
      {lightboxFile && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxFile(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxFile(null);
            }}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-3 md:p-2 z-50 bg-black/50 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="relative w-full h-full flex items-center justify-center pb-20"
            style={{ WebkitTouchCallout: "none", userSelect: "none" }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onWheel={handleWheel}
            onContextMenu={(e) => {
              e.preventDefault();
              if (!isPortfolio) {
                setShowScreenshotWarning(true);
              }
            }}
          >
            {displayedFiles.length > 1 && (
              <>
                <button
                  onClick={handlePrevLightbox}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 z-50 bg-black/50 hover:bg-black/80 rounded-full transition-all"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={handleNextLightbox}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 z-50 bg-black/50 hover:bg-black/80 rounded-full transition-all"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}

            {lightboxFile.file_type === "image" ? (
              <div className="relative w-full h-full flex items-center justify-center p-4 md:p-8">
                <img
                  key={lightboxFile.id}
                  src={getOptimizedImageUrl(
                    getDisplayUrl(lightboxFile, true),
                    1920,
                    undefined,
                    85,
                  )}
                  alt="Gallery item preview"
                  className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-2xl animate-in fade-in duration-300"
                  style={{ WebkitTouchCallout: "none", userSelect: "none" }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isPortfolio) {
                      setShowScreenshotWarning(true);
                    }
                  }}
                />
                {isFileLocked(lightboxFile ? lightboxFile.id : "") && !isPortfolio && <WatermarkOverlay />}
                {/* Protection overlay to catch right-clicks / drag-and-drops from extensions */}
                <div
                  className="absolute inset-0 z-10"
                  style={{ WebkitTouchCallout: "none", userSelect: "none" }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
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
                  onDragStart={(e) => e.preventDefault()}
                />
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center p-4 md:p-8">
                <video
                  key={lightboxFile.id}
                  src={rewriteUrlToR2(lightboxFile.file_url)}
                  className="max-w-full max-h-full object-contain pointer-events-auto shadow-2xl animate-in fade-in duration-300"
                  controls
                  controlsList={
                    isFileLocked(lightboxFile ? lightboxFile.id : "") ? "nodownload nofullscreen" : "nodownload"
                  }
                  disablePictureInPicture={isFileLocked(lightboxFile ? lightboxFile.id : "")}
                  autoPlay
                  playsInline
                  onTouchStart={handleLongPressStart}
                  onTouchEnd={handleLongPressEnd}
                  onTouchMove={handleLongPressEnd}
                  onMouseDown={handleLongPressStart}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (!isPortfolio) {
                      setShowScreenshotWarning(true);
                    }
                  }}
                />
                {isFileLocked(lightboxFile ? lightboxFile.id : "") && !isPortfolio && <WatermarkOverlay />}
              </div>
            )}
          </div>

          {/* Print Info in Lightbox */}
          {(isPrintsGallery && lightboxFile.title?.trim()) ||
          (lightboxFile.description ?? lightboxFile.caption)?.trim() ||
          lightboxFile.print_size?.trim() ||
          lightboxFile.material?.trim() ||
          lightboxFile.price?.trim() ? (
            <div className="absolute bottom-6 left-6 right-6 sm:right-auto sm:max-w-md z-50 bg-black/60 backdrop-blur-md text-white p-5 rounded-lg border border-white/10 overflow-y-auto max-h-[40vh]">
              {lightboxFile.title?.trim() && isPrintsGallery && (
                <h3 className="font-sans text-2xl font-medium mb-1 drop-shadow-sm">
                  {lightboxFile.title}
                </h3>
              )}
              {(lightboxFile.description ?? lightboxFile.caption)?.trim() && (
                <p className="text-sm text-slate-300 leading-relaxed mb-3 font-light">
                  {lightboxFile.description ?? lightboxFile.caption}
                </p>
              )}
              {(lightboxFile.print_size?.trim() ||
                lightboxFile.material?.trim()) && (
                <div className="text-xs text-slate-400 uppercase tracking-widest mt-2 flex flex-wrap items-center gap-2">
                  {lightboxFile.print_size?.trim() && (
                    <span>{lightboxFile.print_size}</span>
                  )}
                  {lightboxFile.print_size?.trim() &&
                    lightboxFile.material?.trim() && (
                      <span className="opacity-50">|</span>
                    )}
                  {lightboxFile.material?.trim() && (
                    <span>{lightboxFile.material}</span>
                  )}
                </div>
              )}
              {lightboxFile.price?.trim() && (
                <p className="text-lg font-bold text-slate-300 mt-2">
                  {lightboxFile.price}
                </p>
              )}
            </div>
          ) : null}

          {/* Action buttons in lightbox */}
          <div className="absolute bottom-[90px] left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center gap-4 w-[90%] max-w-sm">
            {isSelectionMode ? (
              <>
                {selectedFileIds.has(lightboxFile.id) && (
                  <div className="w-full bg-black/60 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 border border-white/20">
                    <textarea
                      value={selectionNotes[lightboxFile.id] || ""}
                      placeholder="Add a note (e.g., Please crop this)..."
                      onChange={(e) =>
                        updateSelectionNoteLocal(
                          lightboxFile.id,
                          e.target.value,
                        )
                      }
                      // Submit to DB when user finishes typing
                      onBlur={(e) =>
                        saveSelectionNoteDb(lightboxFile.id, e.target.value)
                      }
                      // Make sure typing doesn't trigger lightbox shortcuts or close lightbox
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        // Allow using arrows without navigating photos
                      }}
                      disabled={selectionSubmitted}
                      className="w-full bg-transparent text-white placeholder-white/50 text-sm p-4 resize-none outline-none focus:bg-white/10 transition-colors"
                      rows={2}
                    />
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelection(lightboxFile);
                  }}
                  disabled={selectionSubmitted}
                  className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-medium transition-all ${
                    selectedFileIds.has(lightboxFile.id)
                      ? "bg-rose-500 text-white hover:bg-rose-600"
                      : "bg-white text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Heart
                    className={`w-5 h-5 ${selectedFileIds.has(lightboxFile.id) ? "fill-current" : ""}`}
                  />
                  <span>
                    {selectedFileIds.has(lightboxFile.id)
                      ? "Selected"
                      : "Select Photo"}
                  </span>
                </button>
              </>
            ) : (
              !isPortfolio && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (downloadingId === lightboxFile.id) {
                      cancelSingleDownload();
                    } else {
                      handleDownload(lightboxFile);
                    }
                  }}
                  disabled={
                    downloadingId !== null && downloadingId !== lightboxFile.id
                  }
                  className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-medium transition-all border border-white/20 ${
                    isFileLocked(lightboxFile ? lightboxFile.id : "")
                      ? "bg-slate-100 text-slate-800"
                      : downloadingId === lightboxFile.id
                        ? "bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                        : "bg-white text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {downloadingId === lightboxFile.id ? (
                    <X className="w-5 h-5" />
                  ) : isFileLocked(lightboxFile ? lightboxFile.id : "") ? (
                    <Lock className="w-5 h-5" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  <span>
                    {downloadingId === lightboxFile.id
                      ? singleDownloadStats
                        ? singleDownloadStats.total
                          ? `Cancel (${Math.round((singleDownloadStats.loaded / singleDownloadStats.total) * 100)}%)`
                          : `Cancel (${(singleDownloadStats.loaded / 1024 / 1024).toFixed(1)}MB)`
                        : "Cancel"
                      : isFileLocked(lightboxFile ? lightboxFile.id : "")
                        ? "Locked"
                        : "Download Photo"}
                  </span>
                </button>
              )
            )}
          </div>

          {/* Thumbnail slider */}
          <div
            className="absolute bottom-4 left-0 right-0 z-50 px-4 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              id="lightbox-thumbnails-container"
              className="flex gap-2 overflow-x-auto pb-2 snap-x items-center justify-start max-w-4xl mx-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              onWheel={handleWheel}
            >
              {displayedFiles.map((file) => (
                <button
                  key={file.id}
                  id={`thumbnail-${file.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxFile(file);
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
                  className={`relative shrink-0 snap-center rounded-lg overflow-hidden transition-all duration-300 ${
                    lightboxFile.id === file.id
                      ? "w-16 h-16 border-2 border-white opacity-100 shadow-lg"
                      : "w-12 h-12 border border-white/20 opacity-50 hover:opacity-100"
                  }`}
                >
                  <img
                    src={getOptimizedImageUrl(
                      getDisplayUrl(file),
                      150,
                      150,
                      30,
                    )}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
