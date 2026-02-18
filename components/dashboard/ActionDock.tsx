import React from 'react';
import { Button } from '../ui';
import { Plus, Image, Settings, LogOut, Ticket } from 'lucide-react';

interface ActionDockProps {
    onBookNew: () => void;
    onViewGallery: () => void;
    onOpenSettings: () => void;
    onLogout: () => void;
}

export const ActionDock: React.FC<ActionDockProps> = ({ onBookNew, onViewGallery, onOpenSettings, onLogout }) => {
    return (
        <div className="flex flex-col sm:flex-row gap-4 p-4 border border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl w-full justify-between items-center z-10 relative shadow-2xl">
            <div className="w-full sm:w-auto flex gap-3">
                <Button onClick={onBookNew} className="flex-1 sm:flex-none shadow-[0_0_20px_rgba(212,181,133,0.3)] gap-2">
                    <Plus className="w-4 h-4" />
                    קביעת תור חדש
                </Button>

                {/* Mobile Only Extras */}
                <Button variant="outline" className="sm:hidden flex-1 border-white/10" onClick={onViewGallery}>
                    <Image className="w-4 h-4" />
                </Button>
                <Button variant="outline" className="sm:hidden flex-1 border-white/10" onClick={onOpenSettings}>
                    <Settings className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex gap-1 w-full sm:w-auto justify-end">
                <div className="hidden sm:flex gap-1">
                    <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5" onClick={onViewGallery} title="הגלריה שלי">
                        <Image className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5" onClick={onOpenSettings} title="הגדרות">
                        <Settings className="w-5 h-5" />
                    </Button>
                </div>

                <div className="w-[1px] h-8 bg-white/10 mx-2 hidden sm:block"></div>

                <Button variant="ghost" className="text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-colors gap-2 w-full sm:w-auto" onClick={onLogout}>
                    <LogOut className="w-4 h-4" />
                    <span className="sm:hidden">התנתק</span>
                </Button>
            </div>
        </div>
    );
};
