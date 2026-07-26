import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart } from 'lucide-react';


export default function DonationModal({ isOpen, onClose }) {
  const [amount, setAmount] = useState('99');
  const [customAmount, setCustomAmount] = useState('');
  const [error, setError] = useState('');

  const PRESETS = [99, 199, 499];
  const UPI_ID = 'Kailasu2006@oksbi';
  const PAYEE_NAME = 'Hear Music';

  const handleAmountChange = (val) => {
    // Only allow numbers
    const sanitized = val.replace(/[^0-9]/g, '');
    setCustomAmount(sanitized);
    setAmount(sanitized);
    
    if (sanitized && parseInt(sanitized, 10) < 99) {
      setError('Minimum support amount is â‚¹99 to help cover infrastructure costs.');
    } else {
      setError('');
    }
  };

  const handlePresetClick = (val) => {
    setCustomAmount('');
    setAmount(val.toString());
    setError('');

    // On mobile, immediately try to open the UPI app when they click a preset amount
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      const directUpiString = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&cu=INR&am=${val}`;
      window.location.href = directUpiString;
    }
  };

  const handleClose = () => {
    setAmount('99');
    setCustomAmount('');
    setError('');
    onClose();
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const parsedAmount = parseInt(amount, 10) || 0;
  const isValid = parsedAmount >= 99;

  // Exact encoded UPI intent string format
  const upiString = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&cu=INR&am=${isValid ? parsedAmount : 99}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-[#242424] rounded-xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Badge */}
            <div className="absolute top-0 left-0 bg-[#1DB954] text-black text-xs font-bold px-3 py-1.5 rounded-br-lg z-10">
              Ad-free forever
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 p-2 text-neutral-400 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            {/* Body */}
            <div className="p-6 pt-10 flex-1 overflow-y-auto no-scrollbar">
              
              <div className="flex items-center gap-2 mb-2">
                <Heart className="text-white fill-white" size={16} />
                <span className="text-white font-bold text-sm">Hear Music</span>
              </div>
              
              <h2 className="text-3xl font-bold text-[#1DB954] mb-2 tracking-tight">Support</h2>
              
              <p className="text-white font-bold text-lg mb-1">Help us keep it running</p>
              <p className="text-neutral-400 text-sm mb-6">Cover server & API costs</p>

              <hr className="border-neutral-700 mb-6" />

              <ul className="text-white text-sm space-y-2 mb-8 pl-5 list-disc marker:text-neutral-400">
                <li>1 Ad-free account</li>
                <li>Very high audio quality (up to ~320kbps)</li>
                <li>Download to listen offline (Coming soon)</li>
                <li>Keep the app alive</li>
                <li>One-time payment</li>
              </ul>

              {/* Amount Selection */}
              <div className="space-y-4">
                <div className="flex gap-3">
                  {PRESETS.map((preset) => {
                    const isSelected = amount === preset.toString() && customAmount === '';
                    return (
                      <button
                        key={preset}
                        onClick={() => handlePresetClick(preset)}
                        className={`flex-1 py-2.5 rounded-md font-bold transition-all border ${
                          isSelected
                            ? 'bg-[#1DB954] border-[#1DB954] text-black'
                            : 'bg-transparent border-neutral-500 text-white hover:border-white'
                        }`}
                      >
                        â‚¹{preset}
                      </button>
                    );
                  })}
                </div>

                <div className="relative mb-2">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className={customAmount ? 'text-black font-bold' : 'text-neutral-400 font-medium'}>â‚¹</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="Custom amount"
                    className={`w-full ${customAmount ? 'bg-[#1DB954] text-black border-[#1DB954]' : 'bg-transparent text-white border-neutral-500 focus:border-white'} border rounded-md py-3 pl-8 pr-4 font-bold placeholder-neutral-500 outline-none transition-colors`}
                  />
                </div>

                {/* Validation Error */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-red-400 text-sm"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col gap-3">
                <a
                  href={isValid ? upiString : '#'}
                  onClick={(e) => { if (!isValid) e.preventDefault(); }}
                  className={`flex items-center justify-center w-full py-3.5 rounded-full font-bold transition-all ${
                    isValid 
                      ? 'bg-[#1DB954] text-black hover:bg-[#1ed760] hover:scale-[1.02] active:scale-100' 
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  {customAmount ? `Pay â‚¹${customAmount}` : `Support with â‚¹${amount}`}
                </a>
                
                <button
                  onClick={handleClose}
                  className="flex items-center justify-center w-full py-3.5 rounded-full font-bold text-white border border-neutral-500 hover:border-white transition-all bg-transparent"
                >
                  Not Interested
                </button>
              </div>
              
              <p className="text-neutral-400 text-[11px] mt-6 text-center leading-relaxed">
                Offer only available if you want to support independent development. Thank you for using Hear Music.
              </p>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
