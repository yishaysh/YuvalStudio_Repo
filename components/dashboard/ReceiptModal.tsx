import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Download, Share2, Printer, Check } from 'lucide-react';
import { Modal, Button } from '../ui';
import { Appointment, StudioDetails } from '../../types';
import { DEFAULT_STUDIO_DETAILS } from '../../constants';

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: Appointment;
    studioDetails?: StudioDetails;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
    isOpen,
    onClose,
    appointment,
    studioDetails
}) => {
    const details = studioDetails || DEFAULT_STUDIO_DETAILS;
    const receiptRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const isQuickSale = appointment.id === 'QUICK-SALE' || appointment.notes?.includes('מכירה מהירה');
    const hasBaseService = !isQuickSale && appointment.service_name && appointment.service_name !== 'כללי';
    const cartItems = appointment.cart_items || [];
    
    // Total price of items in cart (undiscounted)
    const cartUndiscountedTotal = cartItems.reduce((acc, item) => acc + ((item.final_price || item.price || 0) * item.quantity), 0);
    
    // Extract base service price (full price without discount)
    const inferredBasePrice = appointment.price ? Math.max(0, appointment.price - cartUndiscountedTotal) : 0;
    const mainServicePrice = appointment.service_price !== undefined ? appointment.service_price : inferredBasePrice;

    // Total final price to map onto receipt (either directly final_price, or calculated sum)
    const totalToPay = appointment.final_price ?? (mainServicePrice + cartUndiscountedTotal);
    
    // Overall discount string format
    const discountStr = appointment.price && appointment.price > totalToPay ? appointment.price - totalToPay : 0;
    
    // Combine items for display
    const receiptItems = [
        ...(hasBaseService 
            ? [{ name: appointment.service_name, price: mainServicePrice, quantity: 1 }] 
            : []),
        ...cartItems.map(item => ({
            name: item.name,
            price: item.final_price || item.price || 0,
            quantity: item.quantity
        }))
    ];

    const generateImage = async (): Promise<string | null> => {
        if (!receiptRef.current) return null;
        try {
            const canvas = await html2canvas(receiptRef.current, {
                scale: 3, // High resolution
                backgroundColor: '#1E1E2E', // Brand dark color to match wrapper
                useCORS: true,
                logging: false,
            });
            return canvas.toDataURL('image/png', 1.0);
        } catch (error) {
            console.error('Failed to generate image', error);
            return null;
        }
    };

    const handleDownload = async () => {
        setIsExporting(true);
        const dataUrl = await generateImage();
        if (dataUrl) {
            const link = document.createElement('a');
            link.download = `קבלה_${appointment.client_name || 'לקוח_מזדמן'}_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.png`;
            link.href = dataUrl;
            link.click();
        }
        setIsExporting(false);
    };

    const handleShare = async () => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        
        setIsExporting(true);
        try {
            const dataUrl = await generateImage();
            if (!dataUrl) return;

            // Convert Base64 to Blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const file = new File([blob], 'receipt.png', { type: 'image/png' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'סיכום חשבון - ' + details.name,
                    text: 'מצורף סיכום חשבון עבור הביקור בסטודיו.',
                });
            } else {
                // Flash message handled by parent usually, but we try just sharing image
                // If can't share directly, fallback to download
                handleDownload();
            }
        } catch (error) {
            console.error('Error sharing receipt:', error);
            handleDownload(); // fallback
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title=" " className="!max-w-md !p-4 bg-brand-dark/95 border-brand-primary/20 overflow-hidden">
            <div className="flex flex-col gap-5">
                
                {/* Visual Receipt Element (Will be captured) */}
                <div 
                    ref={receiptRef} 
                    className="relative bg-[#1A1A27] text-white p-8 rounded-2xl border border-brand-primary/10 shadow-2xl mx-auto w-full max-w-[340px] flex flex-col font-sans"
                    style={{ direction: 'rtl' }}
                >
                    {/* Decorative Top Pattern */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-primary/20 via-brand-primary to-brand-primary/20 rounded-t-2xl"></div>

                    {/* Header with Logo */}
                    <div className="text-center mb-8 mt-4 flex flex-col items-center">
                        <img 
                            src="/logo.png" 
                            alt={details.name} 
                            className="h-20 w-auto object-contain mb-3" 
                            onError={(e) => {
                                // Fallback to text if logo not found
                                e.currentTarget.style.display = 'none';
                                const nextEl = e.currentTarget.nextElementSibling as HTMLElement;
                                if (nextEl) nextEl.style.display = 'block';
                            }}
                        />
                        <div className="hidden">
                            <div className="font-script text-4xl text-brand-primary mb-1 tracking-wider">{details.name || 'Yuval'}</div>
                            <h2 className="text-[10px] uppercase tracking-[0.3em] font-medium text-slate-500 mb-5">{details.name ? 'Studio' : 'Studio'}</h2>
                        </div>

                        <h1 className="text-xl font-serif text-slate-100">סיכום חשבון</h1>
                        <p className="text-xs text-slate-400 mt-1">{new Date(appointment.start_time).toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' })} • {new Date(appointment.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-6 pb-5 border-b border-white/5 space-y-1.5">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">לכבוד:</span>
                            <span className="font-medium text-white">{appointment.client_name || 'לקוח/ה'}</span>
                        </div>
                        {appointment.client_phone && (
                            <div className="flex justify-between text-sm text-slate-400">
                                <span>טלפון:</span>
                                <span>{appointment.client_phone}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xs text-slate-500 mt-2">
                            <span>מספר תור:</span>
                            <span>#{appointment.id.split('-')[0].toUpperCase()}</span>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="mb-6 space-y-3 min-h-[100px]">
                        <div className="flex justify-between text-[10px] text-brand-primary mb-3 font-bold uppercase tracking-wider pb-2 border-b border-brand-primary/10">
                            <span>פירוט</span>
                            <span>סכום</span>
                        </div>
                        {receiptItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start text-sm">
                                <div className="flex-1 pr-3">
                                    <div className="text-slate-200">{item.name}</div>
                                    {item.quantity > 1 && (
                                        <div className="text-[10px] text-slate-500 font-serif mt-0.5">{item.quantity} x ₪{item.price.toFixed(2)}</div>
                                    )}
                                </div>
                                <div className="font-serif text-white shrink-0 mt-0.5">₪{(item.price * item.quantity).toFixed(2)}</div>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t border-brand-primary/10 pt-5 mb-8 space-y-2">
                        {discountStr > 0 && (
                            <div className="flex justify-between text-sm text-brand-primary/80">
                                <span>הנחות שיושמו:</span>
                                <span className="font-serif">-₪{discountStr.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-end pt-1">
                            <span className="text-sm font-bold text-slate-300">סה״כ שולם:</span>
                            <span className="text-2xl font-serif text-brand-primary font-bold">₪{totalToPay.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-[11px] text-slate-500 space-y-1.5 pt-5 border-t border-white/5 mx-[-1rem]">
                        <p className="font-serif italic text-sm text-brand-primary/80 mb-3">תודה שבחרת בנו 💫</p>
                        <p>{details.address}</p>
                        <p>{details.phone}</p>
                        {details.instagram_url && <p>Instagram: @{details.instagram_url.split('.com/')[1]?.replace('/','') || 'yuval_studio'}</p>}
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 mt-2 px-1">
                    <Button 
                        onClick={handleDownload} 
                        disabled={isExporting}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center gap-2 py-3 rounded-xl transition-all"
                    >
                        <Download className="w-4 h-4" />
                        {isExporting ? 'מייצר...' : 'שמור תמונה'}
                    </Button>
                    <Button 
                        onClick={handleShare} 
                        disabled={isExporting}
                        variant="primary"
                        className="flex items-center justify-center gap-2 py-3 shadow-lg shadow-brand-primary/20 rounded-xl"
                    >
                        {isCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                        {isCopied ? 'נשמר בהצלחה!' : 'שתף קבלה'}
                    </Button>
                </div>

            </div>
        </Modal>
    );
};
