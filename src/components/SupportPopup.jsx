import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X } from 'lucide-react';
import usePlayerStore from '../store/usePlayerStore';

export default function SupportPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const { setDonationModalOpen } = usePlayerStore();

  useEffect(() => {
    // Check if the user has already answered the popup
    const hasAnswered = localStorage.getItem('hear_support_answered');
    if (!hasAnswered) {
      // Delay slightly so it doesn't immediately jar the user
      const timer = setTimeout(() => setIsOpen(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSure = () => {
    localStorage.setItem('hear_support_answered', 'true');
    setIsOpen(false);
    // Open the actual donation modal
    setTimeout(() => setDonationModalOpen(true), 300);
  };

  const handleLater = () => {
    // Don't save to local storage, so it asks again next time
    setIsOpen(false);
  };

  const handleNo = () => {
    // Save to local storage so it never bothers them again
    localStorage.setItem('hear_support_answered', 'true');
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={handleLater}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 pb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mx-auto mb-4">
                <Heart className="text-red-500 fill-red-500" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-white text-center mb-2">
                A Quick Request
              </h2>
              <p className="text-neutral-300 text-center text-sm leading-relaxed">
                This app may shut down in the future because it costs money to run the servers and APIs. If you support us, you can help keep Hear Music alive at least in a small way.
              </p>
              <div className="mt-4 p-4 bg-neutral-800/50 rounded-xl border border-neutral-700/50 text-center">
                <span className="block text-neutral-400 text-xs uppercase tracking-wider font-bold mb-1">Current Goal</span>
                <span className="block text-white font-medium">The app currently needs <strong className="text-red-400">$25 a month</strong> to stay online.</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 pt-4 flex flex-col gap-3">
              <button
                onClick={handleSure}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all active:scale-95"
              >
                Sure, I'll support!
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={handleLater}
                  className="flex-1 py-3 rounded-xl font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 transition-colors"
                >
                  Maybe Later
                </button>
                <button
                  onClick={handleNo}
                  className="flex-1 py-3 rounded-xl font-medium text-neutral-400 bg-transparent hover:text-white transition-colors"
                >
                  No, thanks
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
