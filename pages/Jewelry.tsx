import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { api } from '../services/mockApi';
import { X, ChevronRight, ChevronLeft, Tag, ShoppingBag, Sparkles, Calendar, CheckCircle2, Circle, Heart, Zap, Plus, Check, Search, Info, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui';
import { useNavigate, useLocation } from 'react-router-dom';
import { Service, JewelryItem } from '../types';
import { JEWELRY_CATALOG } from '../constants';
import { useJewelryCart } from '../contexts/JewelryCartContext';
import { SmartImage } from '../components/SmartImage';
import { Money } from '../components/Money';
import { useDialogA11y } from '../hooks/useDialogA11y';
import { agorotToShekels, parsePriceToShekels, sumAgorot } from '../shared/money';
import { AUTHORITATIVE_SHIPPING_POLICY, ShippingPolicyConfig } from '../shared/shipping';
import { pluralizeHebrew } from '../shared/validation';

const m = motion as any;
const GUEST_WISHLIST_KEY = 'yuval_guest_wishlist_v1';

const readGuestWishlist = (): string[] => {
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const writeGuestWishlist = (ids: string[]) => {
  try {
    localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage errors in private browsing
  }
};

const CATEGORY_FILTER_OPTIONS = [
  { id: 'all', label: 'הכל' },
  { id: 'ear', label: 'אוזן', keywords: ['אוזן', 'אוזניים', 'ear', 'helix', 'tragus', 'conch', 'lobe', 'daith', 'rook'] },
  { id: 'face', label: 'פנים', keywords: ['פנים', 'אף', 'שפה', 'גבה', 'face', 'nose', 'nostril', 'septum', 'lip', 'eyebrow'] },
  { id: 'body', label: 'גוף', keywords: ['גוף', 'טבור', 'לשון', 'פטמה', 'body', 'navel', 'tongue', 'nipple'] },
];

const JewelryPage: React.FC = () => {
  const { user } = useAuth();
  const { addToCart, openQuickBuy, justAddedItemId, openCart } = useJewelryCart();
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Selection Dialog State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [direction, setDirection] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'gallery' | 'inventory'>(
    (location.state as any)?.activeTab || 'gallery'
  );
  const [jewelryCatalog, setJewelryCatalog] = useState<JewelryItem[]>([]);
  const [shippingPolicy, setShippingPolicy] = useState<ShippingPolicyConfig>(AUTHORITATIVE_SHIPPING_POLICY);
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => readGuestWishlist());
  const [wishlistNotice, setWishlistNotice] = useState<string | null>(null);

  // U2 Inventory Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [materialFilter, setMaterialFilter] = useState('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<JewelryItem | null>(null);

  useEffect(() => {
    if ((location.state as any)?.activeTab) {
      setActiveTab((location.state as any).activeTab);
    }
  }, [location.state]);

  // Refs for event listener access
  const selectedIndexRef = useRef(selectedIndex);
  const isSelectionModeRef = useRef(isSelectionMode);
  const galleryItemsRef = useRef(galleryItems);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    isSelectionModeRef.current = isSelectionMode;
  }, [isSelectionMode]);

  useEffect(() => {
    galleryItemsRef.current = galleryItems;
  }, [galleryItems]);

  const loadGallery = async (pageNum: number) => {
    try {
      setLoading(true);
      const { items, total } = await api.getGallery(pageNum, 12);

      setGalleryItems((prev) => {
        const next = pageNum === 1 ? items : [...prev, ...items];
        setHasMore(next.length < total && items.length > 0);
        return next;
      });
    } catch (error) {
      console.error('Failed to load gallery images', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBootstrapAndWishlist = async () => {
    try {
      const boot = await api.getBootstrap();
      setShippingPolicy(boot.shippingPolicy || AUTHORITATIVE_SHIPPING_POLICY);
      const rawItems =
        Array.isArray(boot.inventoryItems) && boot.inventoryItems.length > 0
          ? boot.inventoryItems
          : JEWELRY_CATALOG;
      const validItems = rawItems
        .map((item, idx): JewelryItem => ({
          id: item.id || `jewelry_${idx}`,
          name: item.name,
          price: parsePriceToShekels(item.price),
          image_url: item.image_url || '',
          category: item.category || 'עגיל',
          description: item.description || '',
          in_stock: item.in_stock !== false,
          allowed_locations: Array.isArray(item.allowed_locations) ? item.allowed_locations : [],
          material: item.material,
          gauge: item.gauge,
          diameter: item.diameter,
          duration_minutes: 0,
          pain_level: 0,
        }))
        .filter((item) => item.price > 0);

      setJewelryCatalog(validItems.length > 0 ? validItems : JEWELRY_CATALOG);
    } catch (e) {
      console.error('Failed to load bootstrap for inventory', e);
      setJewelryCatalog(JEWELRY_CATALOG);
    }
  };

  useEffect(() => {
    loadGallery(1);
    loadBootstrapAndWishlist();
  }, []);

  useEffect(() => {
    let active = true;
    if (user?.id) {
      api
        .getWishlist(user.id)
        .then((items) => {
          if (!active) return;
          setWishlistIds(items.map((entry: any) => String(entry.id)));
        })
        .catch(() => {
          // Keep current state cleanly on transient read failure
        });
    } else {
      setWishlistIds(readGuestWishlist());
    }
    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleToggleWishlist = async (itemId: string) => {
    const id = String(itemId);
    const wasWishlisted = wishlistIds.includes(id);
    const optimistic = wasWishlisted
      ? wishlistIds.filter((entry) => entry !== id)
      : [...wishlistIds, id];

    setWishlistIds(optimistic);
    setWishlistNotice(null);

    if (user?.id) {
      try {
        const updated = await api.toggleWishlist(user.id, id);
        if (Array.isArray(updated)) {
          setWishlistIds(updated.map(String));
        }
      } catch (err) {
        console.error(err);
        setWishlistIds(wishlistIds);
        setWishlistNotice('לא הצלחנו לשמור את העדכון ברשימת המשאלות. נסי שוב.');
      }
    } else {
      writeGuestWishlist(optimistic);
      setWishlistNotice(
        wasWishlisted
          ? 'הלוק הוסר מרשימת המשאלות המקומית במכשיר זה.'
          : 'הלוק נשמר בדפדפן זה. התחברות בחשבון Google תסנכרן אותו בין מכשירים.'
      );
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadGallery(nextPage);
  };

  // Lock body scroll when modal is open - dedicated effect with cleanup
  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function ensures scroll is restored when unmounting or navigating away
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedIndex]);

  // Handler refs to use inside the stable event listener
  const handleNextStable = useCallback(() => {
    const currentItems = galleryItemsRef.current;
    const currentIdx = selectedIndexRef.current;
    if (currentIdx === null || currentItems.length === 0) return;

    setDirection(1);
    setSelectedIndex((currentIdx + 1) % currentItems.length);
    if (isSelectionModeRef.current) setIsSelectionMode(false);
  }, []);

  const handlePrevStable = useCallback(() => {
    const currentItems = galleryItemsRef.current;
    const currentIdx = selectedIndexRef.current;
    if (currentIdx === null || currentItems.length === 0) return;

    setDirection(-1);
    setSelectedIndex((currentIdx - 1 + currentItems.length) % currentItems.length);
    if (isSelectionModeRef.current) setIsSelectionMode(false);
  }, []);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    handleNextStable();
  }, [handleNextStable]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    handlePrevStable();
  }, [handlePrevStable]);

  // Keydown navigation inside gallery lightbox (Escape handled by useDialogA11y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndexRef.current === null || selectedDetailItem) return;

      if (e.key === 'ArrowLeft') handleNextStable();
      if (e.key === 'ArrowRight') handlePrevStable();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextStable, handlePrevStable, selectedDetailItem]);

  const lightboxDialogRef = useDialogA11y({
    isOpen: selectedIndex !== null && !selectedDetailItem,
    onClose: () => {
      if (isSelectionModeRef.current) setIsSelectionMode(false);
      else setSelectedIndex(null);
    },
  });

  const detailDialogRef = useDialogA11y({
    isOpen: Boolean(selectedDetailItem),
    onClose: () => setSelectedDetailItem(null),
  });

  const currentItem = selectedIndex !== null ? galleryItems[selectedIndex] : null;
  const taggedServices: Service[] = useMemo(
    () =>
      (currentItem?.taggedServices || []).filter(
        (svc: any) => Boolean(svc) && svc.is_active !== false
      ),
    [currentItem]
  );

  const handleOpenSelection = () => {
    setSelectedServices(taggedServices);
    setIsSelectionMode(true);
  };

  const toggleServiceSelection = (service: Service) => {
    if (selectedServices.find((s) => s.id === service.id)) {
      setSelectedServices(selectedServices.filter((s) => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleFinalBooking = () => {
    if (!selectedServices.length) return;
    navigate('/booking', { state: { preSelectedServices: selectedServices, skipAi: true } });
  };

  const handleConsultLookBooking = () => {
    const imageUrl = currentItem?.image_url;
    setSelectedIndex(null);
    navigate('/booking', {
      state: { skipAi: true, lookInspirationUrl: imageUrl },
    });
  };

  const totalPrice = useMemo(
    () => agorotToShekels(sumAgorot(taggedServices.map((s) => s.price))),
    [taggedServices]
  );
  const selectedPrice = useMemo(
    () => agorotToShekels(sumAgorot(selectedServices.map((s) => s.price))),
    [selectedServices]
  );

  const availableMaterials = useMemo(() => {
    const set = new Set<string>();
    for (const item of jewelryCatalog) {
      if (item.material && String(item.material).trim()) {
        set.add(String(item.material).trim());
      }
    }
    return Array.from(set);
  }, [jewelryCatalog]);

  const filteredCatalog = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const catOption = CATEGORY_FILTER_OPTIONS.find((opt) => opt.id === categoryFilter);

    return jewelryCatalog.filter((item) => {
      if (inStockOnly && item.in_stock === false) return false;
      if (materialFilter !== 'all' && String(item.material || '').trim() !== materialFilter) {
        return false;
      }
      if (catOption && catOption.id !== 'all' && 'keywords' in catOption && catOption.keywords) {
        const haystack = `${item.category || ''} ${item.name || ''} ${(item.allowed_locations || []).join(' ')}`.toLowerCase();
        const matchesCat = catOption.keywords.some((kw) => haystack.includes(kw));
        if (!matchesCat) return false;
      }
      if (query) {
        const searchable = [
          item.name,
          item.category,
          item.description,
          item.material,
          ...(item.allowed_locations || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(query)) return false;
      }
      return true;
    });
  }, [jewelryCatalog, searchQuery, categoryFilter, materialFilter, inStockOnly]);

  const resetCatalogFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setMaterialFilter('all');
    setInStockOnly(false);
  };

  // Swipe logic
  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const handleDragEnd = (e: any, { offset, velocity }: PanInfo) => {
    const swipe = swipePower(offset.x, velocity.x);

    if (swipe < -swipeConfidenceThreshold) {
      handleNext();
    } else if (swipe > swipeConfidenceThreshold) {
      handlePrev();
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9
    })
  };

  return (
    <div className="pt-24 pb-20">
      <section className="text-center mb-12 px-6">
        <h1 className="text-5xl font-serif text-white mb-6">התכשיטים שלנו</h1>
        <p className="text-slate-400 text-lg">בואי לקבל השראה ולבחור את הלוק הבא שלך</p>
      </section>

      <div className="container mx-auto px-6 mb-8 flex justify-center">
        <div className="flex bg-brand-surface/50 p-1 rounded-full border border-white/10">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`min-h-[44px] px-8 py-2.5 rounded-full text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ease-out flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
              activeTab === 'gallery'
                ? 'bg-brand-primary text-brand-dark shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            גלריית השראה
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`min-h-[44px] px-8 py-2.5 rounded-full text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ease-out flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
              activeTab === 'inventory'
                ? 'bg-brand-primary text-brand-dark shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            מלאי העגילים
          </button>
        </div>
      </div>

      <div className="container mx-auto px-6">
        <h2 className="sr-only">גלריית השראה וקטלוג עגילי פירסינג</h2>
        {activeTab === 'gallery' ? (
          galleryItems.length > 0 ? (
            <>
              {wishlistNotice && (
                <div
                  role="status"
                  className="mb-4 px-4 py-2.5 rounded-xl bg-brand-surface/80 border border-brand-primary/30 text-xs text-slate-200 flex items-center justify-between gap-3"
                >
                  <span>{wishlistNotice}</span>
                  <button
                    type="button"
                    onClick={() => setWishlistNotice(null)}
                    aria-label="סגור הודעת משאלות"
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.05
                    }
                  }
                }}
                className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"
              >
                {galleryItems.map((item, i) => {
                  const isWishlisted = wishlistIds.includes(String(item.id));
                  const itemLabel = item.title || item.name || `תכשיט פירסינג בגלריה - דגם ${i + 1}`;
                  return (
                    <m.div
                      key={item.id || i}
                      variants={{
                        hidden: { opacity: 0, transform: 'translateY(10px)' },
                        visible: { opacity: 1, transform: 'translateY(0px)' }
                      }}
                      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                      className="aspect-[4/5] rounded-xl overflow-hidden shadow-xl border border-white/5 relative group will-change-transform"
                      whileHover={{ transform: 'translateY(-4px)' }}
                    >
                      <button
                        type="button"
                        onClick={() => { setDirection(1); setSelectedIndex(i); }}
                        aria-label={`הגדלת ${itemLabel}`}
                        className="w-full h-full block cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                      >
                        {/* Overlay - Centered "Get The Look" */}
                        {item.taggedServices?.length > 0 && (
                          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-emil-out z-10 flex items-center justify-center pointer-events-none">
                            <div className="text-white transform scale-95 group-hover:scale-100 transition-transform duration-200 ease-emil-out bg-black/60 px-5 py-2.5 rounded-full border border-white/20 shadow-xl backdrop-blur-md">
                              <p className="font-serif text-sm md:text-base flex items-center gap-2 tracking-wide">
                                <Sparkles className="w-4 h-4 text-brand-primary" /> Get The Look
                              </p>
                            </div>
                          </div>
                        )}

                        <SmartImage
                          src={item.image_url}
                          alt={itemLabel}
                          className="w-full h-full object-cover"
                          priority={i < 4}
                        />
                      </button>

                      {/* Sibling Wishlist Button Overlay */}
                      <button
                        type="button"
                        onClick={() => handleToggleWishlist(item.id)}
                        aria-pressed={isWishlisted}
                        aria-label={isWishlisted ? `הסרת ${itemLabel} מרשימת המשאלות` : `הוספת ${itemLabel} לרשימת המשאלות`}
                        className="absolute top-3 right-3 z-20 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-black/60 hover:bg-brand-primary/20 text-white hover:text-red-400 transition-colors border border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                      >
                        <Heart className={`w-5 h-5 transition-colors ${isWishlisted ? 'text-red-500 fill-current' : ''}`} />
                      </button>
                    </m.div>
                  );
                })}
              </motion.div>

              {/* Load More Button */}
              {hasMore && (
                <div className="mt-12 text-center">
                  <Button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="px-8 py-3 text-lg bg-white/5 hover:bg-white/10 border-white/10"
                  >
                    {loading ? 'טוען...' : 'הצג עוד'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            !loading && (
              <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-slate-400 text-lg">הגלריה ריקה כרגע. תמונות יעלו בקרוב!</p>
              </div>
            )
          )
        ) : (
          /* Inventory View */
          <div className="space-y-6">
            {/* Delivery Info Banner (Single Source of Truth) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-brand-surface/60 border border-brand-primary/20 rounded-2xl px-5 py-3.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-primary shrink-0" />
                <span>
                  <strong>רכישת תכשיטים אונליין:</strong> משלוח עד הבית (<Money amount={shippingPolicy.deliveryFeeShekels} /> • חינם בקנייה מ-<Money amount={shippingPolicy.freeShippingThresholdShekels} /> • {shippingPolicy.estimatedDeliveryTime}) או איסוף חינם מהסטודיו | טיטניום ASTM F-136 וזהב 14K
                </span>
              </div>
              <button
                type="button"
                onClick={openCart}
                className="text-brand-primary hover:text-white font-medium flex items-center gap-1.5 transition-colors underline underline-offset-4 shrink-0"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                צפייה בסל הקניות
              </button>
            </div>

            {/* U2 Search & Filter Controls */}
            <div className="bg-brand-surface/40 border border-white/10 rounded-2xl p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-5 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="חיפוש תכשיט לפי שם, חומר או מיקום..."
                    aria-label="חיפוש בקטלוג התכשיטים"
                    className="w-full bg-brand-dark/70 border border-white/10 rounded-xl py-2.5 pr-10 pl-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div className="md:col-span-4 flex flex-wrap gap-1.5" role="group" aria-label="סינון לפי קטגוריה">
                  {CATEGORY_FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCategoryFilter(opt.id)}
                      aria-pressed={categoryFilter === opt.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                        categoryFilter === opt.id
                          ? 'bg-brand-primary text-brand-dark border-brand-primary font-bold'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="md:col-span-3 flex items-center gap-3 justify-between md:justify-end">
                  {availableMaterials.length > 0 && (
                    <select
                      value={materialFilter}
                      onChange={(e) => setMaterialFilter(e.target.value)}
                      aria-label="סינון לפי חומר"
                      className="bg-brand-dark/70 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-brand-primary"
                    >
                      <option value="all">כל החומרים</option>
                      {availableMaterials.map((mat) => (
                        <option key={mat} value={mat}>
                          {mat}
                        </option>
                      ))}
                    </select>
                  )}

                  <label className="inline-flex items-center gap-2 text-xs text-slate-200 cursor-pointer select-none whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                      className="accent-brand-primary w-4 h-4 rounded"
                    />
                    במלאי בלבד
                  </label>
                </div>
              </div>

              {(searchQuery || categoryFilter !== 'all' || materialFilter !== 'all' || inStockOnly) && (
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/5">
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-brand-primary" />
                    מוצגים {pluralizeHebrew(filteredCatalog.length, 'פריט אחד', `${filteredCatalog.length} פריטים`)} מתוך {jewelryCatalog.length}
                  </span>
                  <button
                    type="button"
                    onClick={resetCatalogFilters}
                    className="text-brand-primary hover:text-white underline underline-offset-4"
                  >
                    איפוס סינון
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredCatalog.length > 0 ? (
                filteredCatalog.map((item, idx) => {
                  const normalizedItem: JewelryItem = {
                    ...item,
                    id: item.id || `jewelry_${idx}`,
                    name: item.name,
                    price: parsePriceToShekels(item.price),
                    image_url: item.image_url || '',
                    category: item.category || 'עגיל',
                    description: item.description || '',
                    in_stock: item.in_stock !== false,
                    allowed_locations: item.allowed_locations || [],
                  };

                  const isJustAdded = justAddedItemId === normalizedItem.id;
                  const isOutOfStock = normalizedItem.in_stock === false;

                  return (
                    <div
                      key={normalizedItem.id || idx}
                      className="bg-brand-surface/50 border border-white/5 rounded-2xl overflow-hidden flex flex-col group hover:border-brand-primary/30 transition-colors duration-150 shadow-lg relative"
                    >
                      {/* Image Preview + Specs trigger */}
                      <div className="aspect-square w-full relative overflow-hidden bg-brand-dark/50">
                        <button
                          type="button"
                          onClick={() => setSelectedDetailItem(normalizedItem)}
                          aria-label={`הצגת מפרט עבור ${normalizedItem.name}`}
                          className="w-full h-full block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                        >
                          <SmartImage
                            src={normalizedItem.image_url}
                            alt={normalizedItem.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedDetailItem(normalizedItem)}
                          aria-label={`פרטי תכשיט ${normalizedItem.name}`}
                          className="absolute top-2.5 left-2.5 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                            <span className="text-xs bg-red-500/80 text-white font-medium px-3 py-1 rounded-full shadow-lg">
                              אזל מהמלאי
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Content */}
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="mb-2">
                          <p className="text-[10px] text-brand-primary/90 font-medium uppercase tracking-widest leading-none mb-1">
                            {normalizedItem.category}
                          </p>
                          <h3 className="text-white font-serif font-medium text-sm md:text-base leading-tight">
                            {normalizedItem.name}
                          </h3>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed flex-1">
                          {normalizedItem.description}
                        </p>

                        {(normalizedItem.material || normalizedItem.gauge || normalizedItem.diameter) && (
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-slate-300">
                            {normalizedItem.material && (
                              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                                {normalizedItem.material}
                              </span>
                            )}
                            {normalizedItem.gauge && (
                              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                                {normalizedItem.gauge}
                              </span>
                            )}
                            {normalizedItem.diameter && (
                              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                                {normalizedItem.diameter}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                          <Money
                            amount={normalizedItem.price}
                            className="text-brand-primary font-serif font-bold text-base md:text-lg"
                          />
                          {!isOutOfStock && (
                            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              במלאי
                            </span>
                          )}
                        </div>

                        {/* Order Buttons */}
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => openQuickBuy(normalizedItem)}
                            disabled={isOutOfStock}
                            className="w-full py-2 px-2 rounded-xl bg-brand-primary text-brand-dark font-bold text-xs flex items-center justify-center gap-1 hover:bg-brand-primaryHover transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] shadow-md shadow-brand-primary/10 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="רכישה מהירה מיידית"
                          >
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            רכישה מהירה
                          </button>

                          <button
                            type="button"
                            onClick={() => addToCart(normalizedItem)}
                            disabled={isOutOfStock}
                            className={`w-full py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${
                              isJustAdded
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10 hover:text-white'
                            }`}
                            title="הוספה לסל הקניות"
                          >
                            {isJustAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                נוסף!
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                לסל
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-20 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                  <p className="text-slate-300 text-lg">לא נמצאו תכשיטים התואמים לסינון שבחרת.</p>
                  {(searchQuery || categoryFilter !== 'all' || materialFilter !== 'all' || inStockOnly) && (
                    <Button onClick={resetCatalogFilters} variant="outline" className="mx-auto">
                      הצג את כל המלאי
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legacy code continues... */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <m.div
            // ... (rest of modal code)
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSelectedIndex(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-0 md:p-8 backdrop-blur-xl"
          >
            {/* ... modal content ... */}
            <div
              ref={lightboxDialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="תצוגת תכשיט מוגדלת"
              tabIndex={-1}
              className="relative w-full max-w-6xl h-full md:h-auto md:max-h-[90vh] bg-brand-surface rounded-none md:rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl border border-white/10 focus:outline-none"
              onClick={(e: any) => e.stopPropagation()}
            >
              {/* ... */}
              <button
                type="button"
                onClick={() => setSelectedIndex(null)}
                aria-label="סגור תצוגה מוגדלת"
                className="absolute top-4 right-4 z-50 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-[background-color,color,transform] duration-[160ms] ease-emil-out active:scale-[0.95] border border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="w-full md:w-2/3 h-[40vh] md:h-auto relative bg-black flex items-center justify-center group overflow-hidden">
                {/* Navigation Arrows */}
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="לתמונה הקודמת"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-white/90 hover:text-white p-3 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-[background-color,color,transform] duration-[160ms] ease-emil-out active:scale-[0.95] border border-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="לתמונה הבאה"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-white/90 hover:text-white p-3 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-[background-color,color,transform] duration-[160ms] ease-emil-out active:scale-[0.95] border border-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Image */}
                <AnimatePresence initial={false} custom={direction}>
                  <m.img
                    key={selectedIndex}
                    src={galleryItems[selectedIndex].image_url}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 }
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={1}
                    onDragEnd={handleDragEnd}
                    className="absolute max-w-full max-h-full object-contain touch-pan-y"
                    alt={currentItem?.title || currentItem?.name || 'תצוגת השראה בגלריה'}
                  />
                </AnimatePresence>
              </div>

              <div className="w-full md:w-1/3 bg-brand-dark/95 border-l border-white/5 flex flex-col h-[60vh] md:h-auto relative overflow-hidden z-30">
                <AnimatePresence mode="wait">
                  {!isSelectionMode ? (
                    <m.div
                      key="details"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col h-full"
                    >
                      <div className="p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="mb-6 pb-6 border-b border-white/10 text-center">
                          <h2 className="text-3xl font-serif text-white mb-2">Get The Look</h2>
                          <p className="text-slate-400 text-sm">הפריטים המופיעים בתמונה זו</p>
                        </div>
                        {/* Items List */}
                        {taggedServices.length > 0 ? (
                          <div className="space-y-4">
                            {taggedServices.map((item, idx) => (
                              <div key={item.id || idx} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5 hover:border-brand-primary/30 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                    <Tag className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-slate-200 font-medium text-sm">{item.name}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{item.category}</p>
                                  </div>
                                </div>
                                <Money amount={item.price} className="text-white font-serif" />
                              </div>
                            ))}

                            <div className="mt-8 p-4 bg-brand-surface rounded-xl border border-brand-primary/20">
                              <div className="flex justify-between items-end mb-1">
                                <span className="text-slate-400">סה"כ לוק משוער</span>
                                <Money amount={totalPrice} className="text-2xl font-serif text-brand-primary" />
                              </div>
                              <p className="text-[10px] text-slate-500">* המחיר כולל תכשיט פתיחה סטנדרטי (טיטניום ASTM F-136) וביצוע</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center min-h-[10rem] text-center px-4 text-slate-400">
                            <ShoppingBag className="w-8 h-8 mb-3 opacity-50" />
                            <p className="text-sm leading-relaxed">
                              לתמונה זו טרם שויכו שירותים בקטלוג או שחלקם אינם זמינים כרגע.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="p-6 border-t border-white/10 bg-brand-surface/95 backdrop-blur-sm z-10 mt-auto">
                        {taggedServices.length > 0 ? (
                          <>
                            <Button onClick={handleOpenSelection} className="w-full py-4 text-lg mb-2 shadow-xl shadow-brand-primary/20">
                              <span className="flex items-center justify-center gap-2">
                                אני רוצה את הלוק הזה <Calendar className="w-4 h-4" />
                              </span>
                            </Button>
                            <p className="text-center text-[10px] text-slate-500">לחיצה תעביר לבחירת הפריטים הרצויים</p>
                          </>
                        ) : (
                          <>
                            <Button onClick={handleConsultLookBooking} className="w-full py-4 text-base mb-2 shadow-xl shadow-brand-primary/20">
                              <span className="flex items-center justify-center gap-2">
                                קביעת תור / התייעצות על הלוק <Calendar className="w-4 h-4" />
                              </span>
                            </Button>
                            <p className="text-center text-[10px] text-slate-500">ניתן לבחור את האזורים והתכשיטים בתיאום התור</p>
                          </>
                        )}
                      </div>
                    </m.div>
                  ) : (
                    <m.div
                      key="selection"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col h-full bg-brand-dark"
                    >
                      {/* Selection Mode Content */}
                      <div className="p-6 border-b border-white/10 flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-serif text-white">הרכבת הלוק</h2>
                          <p className="text-slate-400 text-xs">בחרי את הפריטים שתרצי לבצע</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsSelectionMode(false)}
                          aria-label="חזרה לפרטי הלוק"
                          className="text-slate-400 hover:text-white p-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="space-y-3">
                          {taggedServices.map((item) => {
                            const isSelected = selectedServices.some((s) => s.id === item.id);
                            return (
                              <button
                                type="button"
                                key={item.id}
                                onClick={() => toggleServiceSelection(item)}
                                aria-pressed={isSelected}
                                className={`w-full text-right flex justify-between items-center p-4 rounded-xl border cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${isSelected ? 'bg-brand-primary/10 border-brand-primary' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`transition-colors ${isSelected ? 'text-brand-primary' : 'text-slate-600'}`}>
                                    {isSelected ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                                  </div>
                                  <div>
                                    <p className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-slate-400'}`}>{item.name}</p>
                                    <p className="text-[10px] text-slate-500">{item.category}</p>
                                  </div>
                                </div>
                                <Money amount={item.price} className={isSelected ? 'text-brand-primary font-bold' : 'text-slate-500'} />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-6 border-t border-white/10 bg-brand-surface/95 backdrop-blur-sm z-10">
                        <div className="flex justify-between items-end mb-4 px-1">
                          <span className="text-slate-400 text-sm">סה"כ נבחר</span>
                          <Money amount={selectedPrice} className="text-2xl font-serif text-white" />
                        </div>
                        <Button onClick={handleFinalBooking} className="w-full py-4 text-lg shadow-xl" disabled={selectedServices.length === 0}>
                          המשך לקביעת תור ({pluralizeHebrew(selectedServices.length, 'פריט אחד', `${selectedServices.length} פריטים`)})
                        </Button>
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* U2 Inventory Item Details Modal */}
      {selectedDetailItem && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedDetailItem(null)}
        >
          <div
            ref={detailDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`פרטי תכשיט: ${selectedDetailItem.name}`}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-brand-surface border border-white/10 rounded-3xl overflow-hidden shadow-2xl focus:outline-none"
          >
            <div className="relative aspect-[16/10] bg-brand-dark/60">
              <SmartImage
                src={selectedDetailItem.image_url}
                alt={selectedDetailItem.name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setSelectedDetailItem(null)}
                aria-label="סגור פרטי תכשיט"
                className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-brand-primary font-medium">{selectedDetailItem.category}</p>
                  <h3 className="text-2xl font-serif text-white">{selectedDetailItem.name}</h3>
                </div>
                <Money amount={selectedDetailItem.price} className="text-2xl font-serif font-bold text-brand-primary shrink-0" />
              </div>

              {selectedDetailItem.description && (
                <p className="text-sm text-slate-300 leading-relaxed">{selectedDetailItem.description}</p>
              )}

              <dl className="grid grid-cols-2 gap-3 text-xs bg-white/5 rounded-2xl p-4 border border-white/10">
                <div>
                  <dt className="text-slate-400">זמינות במלאי</dt>
                  <dd className={selectedDetailItem.in_stock === false ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {selectedDetailItem.in_stock === false ? 'אזל מהמלאי' : 'במלאי למשלוח או איסוף'}
                  </dd>
                </div>
                {selectedDetailItem.material && (
                  <div>
                    <dt className="text-slate-400">חומר</dt>
                    <dd className="text-white font-medium">{selectedDetailItem.material}</dd>
                  </div>
                )}
                {selectedDetailItem.gauge && (
                  <div>
                    <dt className="text-slate-400">עובי (Gauge)</dt>
                    <dd className="text-white font-medium">{selectedDetailItem.gauge}</dd>
                  </div>
                )}
                {selectedDetailItem.diameter && (
                  <div>
                    <dt className="text-slate-400">קוטר / אורך</dt>
                    <dd className="text-white font-medium">{selectedDetailItem.diameter}</dd>
                  </div>
                )}
                {Array.isArray(selectedDetailItem.allowed_locations) && selectedDetailItem.allowed_locations.length > 0 && (
                  <div className="col-span-2">
                    <dt className="text-slate-400 mb-1">מיקומים מתאימים</dt>
                    <dd className="text-slate-200">{selectedDetailItem.allowed_locations.join(' • ')}</dd>
                  </div>
                )}
              </dl>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  disabled={selectedDetailItem.in_stock === false}
                  onClick={() => {
                    const target = selectedDetailItem;
                    setSelectedDetailItem(null);
                    openQuickBuy(target);
                  }}
                >
                  רכישה מהירה
                </Button>
                <Button
                  variant="outline"
                  disabled={selectedDetailItem.in_stock === false}
                  onClick={() => {
                    addToCart(selectedDetailItem);
                    setSelectedDetailItem(null);
                  }}
                >
                  הוספה לסל
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JewelryPage;
