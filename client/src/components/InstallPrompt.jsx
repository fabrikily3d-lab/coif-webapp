import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

const InstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Check if already installed or dismissed
        const isDismissed = localStorage.getItem('pwa_install_dismissed');
        const isInstalled = window.matchMedia('(display-mode: standalone)').matches;

        if (isDismissed || isInstalled) return;

        const handleBeforeInstallPrompt = (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Update UI notify the user they can install the PWA
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Also show for iOS users (who don't have beforeinstallprompt)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS && !isInstalled && !isDismissed) {
            setShowPrompt(true);
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            // iOS instructions or generic fallback
            alert("Pour installer l'application sur iPhone :\n1. Appuyez sur le bouton de partage (carré avec flèche)\n2. Faites défiler et appuyez sur 'Sur l'écran d'accueil'");
            return;
        }

        // Show the prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa_install_dismissed', 'true');
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-6 left-6 right-6 z-[100] animate-fade-in-up">
            <div className="bg-dark-lighter/95 backdrop-blur-xl border border-gold-500/30 p-5 shadow-2xl shadow-gold-500/10 flex flex-col md:flex-row items-center gap-4 relative overflow-hidden group">
                {/* Decorative background element */}
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gold-500/5 rounded-full blur-2xl group-hover:bg-gold-500/10 transition-all duration-700"></div>

                <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-gold-500 flex items-center justify-center rounded-sm shrink-0 shadow-lg shadow-gold-500/20">
                        <Smartphone className="text-black" size={24} />
                    </div>
                    <div>
                        <h4 className="font-black text-sm uppercase tracking-tight text-white mb-1">Installer Look At Me</h4>
                        <p className="text-gray-400 text-xs font-medium leading-tight">Installez l'application pour un accès rapide et des notifications en direct.</p>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={handleDismiss}
                        className="flex-1 md:flex-none px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                    >
                        Plus tard
                    </button>
                    <button
                        onClick={handleInstallClick}
                        className="flex-1 md:flex-none bg-gold-600 hover:bg-gold-700 text-black px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold-600/20"
                    >
                        <Download size={14} /> Télécharger
                    </button>
                </div>

                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 text-gray-600 hover:text-white transition-colors md:hidden"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default InstallPrompt;
