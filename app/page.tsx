'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Wallet, 
  TrendingUp, 
  Info,
  ChevronRight,
  Clock,
  ArrowLeft,
  Star,
  CheckCircle2,
  User,
  AlertCircle,
  Edit2,
  Check,
  X,
  Trophy,
  BarChart3
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Add Telegram types
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        openLink: (url: string) => void;
        initDataUnsafe?: {
          user?: {
            first_name?: string;
            username?: string;
          };
        };
      };
    };
    show_10669509?: () => void;
  }
}

// Constants
const RUB_TO_STRAWBERRY = 30;
const MIN_REWARD = 0.001;
const MAX_REWARD = 0.003;
const WITHDRAW_MIN = 100; // 100 rubles minimum
const MONETAG_DIRECT_LINK = "https://omg10.com/4/10669246"; // Placeholder for user's link

const LEVEL_THRESHOLDS = [0, 10000, 25000, 50000];

const TONLogo = () => (
  <svg width="24" height="24" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M28 56C43.464 56 56 43.464 56 28C56 12.536 43.464 0 28 0C12.536 0 0 12.536 0 28C0 43.464 12.536 56 28 56Z" fill="#0088CC"/>
    <path d="M28 12L13 32H43L28 12Z" fill="white"/>
    <path d="M28 44L13 32H43L28 44Z" fill="white" opacity="0.5"/>
  </svg>
);

const USDTLogo = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="16" fill="#26A17B"/>
    <path d="M17.922 17.383v-.002c-.017.008-.67.311-1.922.311-1.251 0-1.905-.303-1.922-.311v.002c-3.144-.14-5.466-.752-5.466-1.487 0-.735 2.322-1.347 5.466-1.487v2.333c.017.008.67.311 1.922.311 1.251 0 1.905-.303 1.922-.311V14.41c3.144.14 5.466.752 5.466 1.487 0 .735-2.322 1.347-5.466 1.487zm0-3.321V9.222h3.111V6.111H10.967v3.111h3.111v4.84c-3.533.166-6.111.911-6.111 1.811 0 .9.258 1.645 6.111 1.811v7.111h3.844v-7.111c3.533-.166 6.111-.911 6.111-1.811 0-.9-2.578-1.645-6.111-1.811z" fill="white"/>
  </svg>
);

// Safe storage helper
const safeStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('Storage access error:', e);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('Storage write error:', e);
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Storage remove error:', e);
    }
  }
};

export default function StrawberryApp() {
  // State with functional initializers for localStorage
  const [balanceRub, setBalanceRub] = useState<number>(0);
  const [totalAdsWatched, setTotalAdsWatched] = useState<number>(0);
  const [totalEarnedRub, setTotalEarnedRub] = useState<number>(0);
  const [xp, setXp] = useState<number>(0);
  const [nickname, setNickname] = useState<string>('Пользователь');

  const [isWatching, setIsWatching] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState(false);
  const [blurTime, setBlurTime] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [tempNickname, setTempNickname] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<{ name: string, icon: React.ReactNode } | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [isLucky, setIsLucky] = useState(false);
  const [isLoadingAd, setIsLoadingAd] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isOpeningAd = useRef(false);

  // Telegram Integration
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();

      // Set nickname from Telegram if not already set
      const user = tg.initDataUnsafe?.user;
      if (user && !safeStorage.getItem('strawberry_nickname')) {
        const tgName = user.first_name || user.username || 'Пользователь';
        setNickname(tgName);
        setTempNickname(tgName);
      }
    }
  }, []);

  // Level logic
  const getLevelInfo = (currentXp: number) => {
    if (currentXp >= LEVEL_THRESHOLDS[3]) return { level: 3, nextThreshold: Infinity, prevThreshold: LEVEL_THRESHOLDS[3], multiplier: 1.35 };
    if (currentXp >= LEVEL_THRESHOLDS[2]) return { level: 2, nextThreshold: LEVEL_THRESHOLDS[3], prevThreshold: LEVEL_THRESHOLDS[2], multiplier: 1.35 };
    if (currentXp >= LEVEL_THRESHOLDS[1]) return { level: 1, nextThreshold: LEVEL_THRESHOLDS[2], prevThreshold: LEVEL_THRESHOLDS[1], multiplier: 1.15 };
    return { level: 0, nextThreshold: LEVEL_THRESHOLDS[1], prevThreshold: LEVEL_THRESHOLDS[0], multiplier: 1.0 };
  };

  const levelInfo = getLevelInfo(xp);
  const level = levelInfo.level;
  const xpInLevel = xp - levelInfo.prevThreshold;
  const levelRange = levelInfo.nextThreshold - levelInfo.prevThreshold;
  const bonusMultiplier = levelInfo.multiplier;

  // Load state from localStorage on mount (Client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedBalance = safeStorage.getItem('strawberry_balance');
      const savedStats = safeStorage.getItem('strawberry_stats');
      const savedXp = safeStorage.getItem('strawberry_xp');
      const savedTotalEarned = safeStorage.getItem('strawberry_total_earned');
      const savedNickname = safeStorage.getItem('strawberry_nickname');
      const savedIsWatching = safeStorage.getItem('strawberry_is_watching');
      const savedIsVerifying = safeStorage.getItem('strawberry_is_verifying');
      const savedBlurTime = safeStorage.getItem('strawberry_blur_time');

      if (savedBalance) setBalanceRub(parseFloat(savedBalance));
      if (savedStats) setTotalAdsWatched(parseInt(savedStats));
      if (savedXp) setXp(parseInt(savedXp));
      if (savedTotalEarned) setTotalEarnedRub(parseFloat(savedTotalEarned));
      if (savedNickname) setNickname(savedNickname);
      
      if (savedIsVerifying === 'true') {
        setIsVerifying(true);
        setIsWatching(true);
        setProgress(100);
      } else if (savedIsWatching === 'true' && savedBlurTime) {
        setIsWatching(true);
        setBlurTime(parseInt(savedBlurTime));
      }
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    safeStorage.setItem('strawberry_balance', balanceRub.toString());
    safeStorage.setItem('strawberry_stats', totalAdsWatched.toString());
    safeStorage.setItem('strawberry_xp', xp.toString());
    safeStorage.setItem('strawberry_total_earned', totalEarnedRub.toString());
    safeStorage.setItem('strawberry_nickname', nickname);
    
    if (isVerifying) {
      safeStorage.setItem('strawberry_is_verifying', 'true');
      safeStorage.setItem('strawberry_is_watching', 'true');
    } else if (isWatching) {
      safeStorage.setItem('strawberry_is_watching', 'true');
      safeStorage.setItem('strawberry_is_verifying', 'false');
      if (blurTime) safeStorage.setItem('strawberry_blur_time', blurTime.toString());
    } else {
      safeStorage.removeItem('strawberry_is_watching');
      safeStorage.removeItem('strawberry_is_verifying');
      safeStorage.removeItem('strawberry_blur_time');
    }
  }, [balanceRub, totalAdsWatched, xp, totalEarnedRub, nickname, isWatching, blurTime, isVerifying]);

  // Progress Bar Logic
  useEffect(() => {
    if (!isWatching || isVerifying || !blurTime) return;

    const updateProgress = () => {
      const elapsed = (Date.now() - blurTime) / 1000;
      const newProgress = Math.min((elapsed / 10) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress < 100) {
        timerRef.current = setTimeout(updateProgress, 100);
      } else {
        setIsVerifying(true);
        safeStorage.setItem('strawberry_is_verifying', 'true');
      }
    };

    updateProgress();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isWatching, isVerifying, blurTime]);

  // Ad Verification Logic (Focus/Visibility tracking)
  const handleReturn = useCallback(() => {
    if (isWatching && blurTime) {
      const timeSpentAway = (Date.now() - blurTime) / 1000;
      
      if (timeSpentAway >= 10) {
        setIsVerifying(true);
        setVerificationError(false);
        setProgress(100);
        safeStorage.setItem('strawberry_is_verifying', 'true');
      } else {
        setVerificationError(true);
      }
    }
  }, [isWatching, blurTime]);

  const handleBlur = useCallback(() => {
    if (isWatching && !blurTime) {
      setBlurTime(Date.now());
    }
  }, [isWatching, blurTime]);

  useEffect(() => {
    const handleStateChange = () => {
      if (document.visibilityState === 'visible' || document.hasFocus()) {
        handleReturn();
      } else {
        handleBlur();
      }
    };

    window.addEventListener('focus', handleStateChange);
    window.addEventListener('blur', handleStateChange);
    document.addEventListener('visibilitychange', handleStateChange);
    
    return () => {
      window.removeEventListener('focus', handleStateChange);
      window.removeEventListener('blur', handleStateChange);
      document.removeEventListener('visibilitychange', handleStateChange);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [handleReturn, handleBlur]);

  const completeAd = useCallback(() => {
    const baseReward = Math.random() * (MAX_REWARD - MIN_REWARD) + MIN_REWARD;
    
    // XP Calculation: 1 to 2 XP based on reward (0.001 to 0.003)
    const baseXp = 1 + (baseReward - MIN_REWARD) / (MAX_REWARD - MIN_REWARD);
    
    // Lucky Bonus: 2% chance for 3x reward
    const luckyChance = Math.random() < 0.02;
    const luckyMultiplier = luckyChance ? 3 : 1;
    setIsLucky(luckyChance);
    
    const reward = baseReward * bonusMultiplier * luckyMultiplier;
    const gainedXp = Math.round(baseXp * bonusMultiplier * 100) / 100;
    const roundedReward = Math.round(reward * 10000) / 10000;

    setBalanceRub((prev) => prev + roundedReward);
    setTotalEarnedRub((prev) => prev + roundedReward);
    setTotalAdsWatched((prev) => prev + 1);
    setXp((prev) => prev + gainedXp);
    
    setIsWatching(false);
    setIsVerifying(false);
    setBlurTime(null);
    setProgress(0);
    safeStorage.removeItem('strawberry_is_watching');
    safeStorage.removeItem('strawberry_is_verifying');
    safeStorage.removeItem('strawberry_blur_time');

    // Celebration
    confetti({
      particleCount: luckyChance ? 100 : 40,
      spread: 70,
      origin: { y: 0.6 },
      colors: luckyChance ? ['#FFD700', '#FFA500', '#FF4D4D'] : ['#FF4D4D', '#FF8080', '#4CAF50']
    });

    if (luckyChance) {
      setTimeout(() => setIsLucky(false), 3000);
    }
  }, [bonusMultiplier]);

  const startWatching = () => {
    if (isWatching || isVerifying || isLoadingAd || isOpeningAd.current) return;
    
    isOpeningAd.current = true;
    setIsLoadingAd(true);
    setVerificationError(false);
    setProgress(0);
    
    const now = Date.now();
    setBlurTime(now);
    setIsWatching(true);
    safeStorage.setItem('strawberry_is_watching', 'true');
    safeStorage.setItem('strawberry_blur_time', now.toString());
    safeStorage.setItem('strawberry_is_verifying', 'false');

    const openAdLink = () => {
      const tg = (window as any).Telegram?.WebApp;
      if (tg && typeof tg.openLink === 'function') {
        tg.openLink(MONETAG_DIRECT_LINK);
      } else {
        window.open(MONETAG_DIRECT_LINK, '_blank');
      }
    };

    // Try to use Monetag SDK function if available, otherwise fallback to link
    const monetagShow = (window as any).show_10669509;
    if (typeof monetagShow === 'function') {
      try {
        monetagShow();
      } catch (e) {
        console.error("Monetag SDK error:", e);
        openAdLink();
      }
    } else {
      openAdLink();
    }
    
    // Prevent spam and reset opening flag
    setTimeout(() => {
      setIsLoadingAd(false);
      isOpeningAd.current = false;
    }, 3000);
  };

  const strawberries = (balanceRub * RUB_TO_STRAWBERRY).toFixed(2);

  return (
    <main className="min-h-screen max-w-md mx-auto px-4 py-8 font-sans">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          {/* Branding removed as requested */}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowWithdrawModal(true)}
            className="bg-white border border-red-100 px-4 py-2 rounded-full text-xs font-bold text-red-600 flex items-center gap-2 hover:bg-red-50 transition-colors"
          >
            <Wallet size={14} />
            Вывод
          </button>
          <button 
            onClick={() => {
              setTempNickname(nickname);
              setShowProfileModal(true);
            }}
            className="w-9 h-9 bg-white border border-red-100 rounded-full flex items-center justify-center text-red-400 hover:text-red-600 transition-colors"
          >
            <User size={18} />
          </button>
        </div>
      </header>

      {/* Balance Card */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[32px] p-8 shadow-xl shadow-red-100/50 border border-red-50 mb-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <span className="text-9xl">🍓</span>
        </div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-red-400 font-bold mb-1">Ваш баланс</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-5xl font-serif font-black text-red-600">{strawberries}</h2>
                <span className="text-red-400 font-bold">🍓</span>
              </div>
              <p className="text-sm text-red-900/60 font-medium">≈ {balanceRub.toFixed(4)} руб.</p>
            </div>
            <div className="bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 flex items-center gap-2">
              <Star size={14} className="text-red-500 fill-red-500" />
              <div className="flex flex-col items-start">
                <span className="text-xs font-black text-red-900 leading-none">Ур. {level}</span>
                {bonusMultiplier > 1 && (
                  <span className="text-[8px] font-bold text-green-600">+{((bonusMultiplier - 1) * 100).toFixed(0)}% ₽</span>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-bold uppercase text-red-300">Опыт уровня</span>
              <span className="text-[10px] font-bold text-red-400">
                {level === 3 ? 'MAX' : `${Math.floor(xpInLevel)} / ${levelRange} XP`}
              </span>
            </div>
            <div className="w-full bg-red-50 h-1.5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-red-400"
                initial={{ width: 0 }}
                animate={{ width: level === 3 ? '100%' : `${(xpInLevel / levelRange) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-red-50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                <TrendingUp size={14} className="text-green-600" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold">Курс</p>
                <p className="text-xs font-bold text-gray-700">30 🍓 = 1 ₽</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase font-bold">Всего XP</p>
              <p className="text-xs font-bold text-gray-700">{Math.floor(xp)}</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Lucky Notification */}
      <AnimatePresence>
        {isLucky && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-yellow-400 text-yellow-950 px-6 py-3 rounded-full font-black shadow-xl border-2 border-yellow-500 flex items-center gap-2"
          >
            <Star className="fill-yellow-950" size={20} />
            УДАЧНЫЙ БОНУС x3!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Area */}
      <section className="mb-8">
        <AnimatePresence>
          {verificationError && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-50 border border-red-100 p-4 rounded-2xl mb-4 flex items-center gap-3 text-red-600"
            >
              <AlertCircle size={20} />
              <p className="text-xs font-bold">Проверка не пройдена! Вы должны пробыть на сайте минимум 10 секунд.</p>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={isVerifying ? completeAd : isWatching ? handleReturn : startWatching}
          disabled={isLoadingAd}
          className={`w-full group relative overflow-hidden rounded-[24px] p-6 transition-all duration-300 ${
            isLoadingAd
            ? 'bg-gray-400 cursor-wait'
            : isVerifying
            ? 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-200'
            : isWatching
            ? 'bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-200'
            : 'bg-red-500 hover:bg-red-600 active:scale-95 shadow-lg shadow-red-200'
          }`}
        >
          <div className="relative z-10 flex flex-col items-center gap-3">
            {isLoadingAd ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                <p className="text-white font-bold text-sm">Загрузка рекламы...</p>
              </div>
            ) : isWatching && !isVerifying ? (
              <>
                <div className="w-full bg-orange-100 h-2 rounded-full overflow-hidden mb-2">
                  <motion.div 
                    className="h-full bg-orange-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-orange-900 font-bold text-sm flex items-center gap-2 text-center">
                  <Clock size={16} className="animate-spin" />
                  Проверить просмотр (10 сек)
                </p>
              </>
            ) : isVerifying ? (
              <>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
                  <CheckCircle2 size={32} className="text-white" />
                </div>
                <div className="text-center">
                  <p className="text-white font-black text-xl">Забрать награду!</p>
                  <p className="text-white/70 text-xs font-medium">Проверка пройдена</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play size={24} fill="white" className="text-white ml-1" />
                </div>
                <div className="text-center">
                  <p className="text-white font-black text-xl">Смотреть рекламу</p>
                  <p className="text-white/70 text-xs font-medium">Награда: {MIN_REWARD} - {MAX_REWARD} ₽</p>
                </div>
              </>
            )}
          </div>
        </button>
      </section>

      {/* Info Footer */}
      <footer className="mt-12 text-center">
        <div className="inline-flex items-center gap-2 bg-red-50 px-4 py-2 rounded-full text-[10px] font-bold text-red-400 uppercase tracking-widest">
          <Info size={12} />
          Минимальный вывод: 100 рублей
        </div>
        <p className="mt-4 text-[10px] text-gray-400 font-medium">
          © 2024 Strawberry Cash • v.1.0.3
        </p>
      </footer>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWithdrawModal(false)}
              className="absolute inset-0 bg-red-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-sm bg-white rounded-t-[32px] sm:rounded-[32px] p-8 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-6 sm:hidden" />
              
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={() => {
                    if (selectedMethod) {
                      setSelectedMethod(null);
                    } else {
                      setShowWithdrawModal(false);
                    }
                  }}
                  className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="font-serif italic text-2xl font-black text-red-900">
                  {selectedMethod ? selectedMethod.name : 'Вывод средств'}
                </h2>
              </div>

              {!selectedMethod ? (
                <>
                  <p className="text-sm text-gray-500 mb-6">Выберите удобный способ получения выплаты.</p>
                  
                  <div className="space-y-3 mb-8 max-h-[300px] overflow-y-auto pr-2">
                    {[
                      { name: 'USDT (TRC-20)', icon: <USDTLogo /> },
                      { name: 'TON', icon: <TONLogo /> },
                    ].map((method) => (
                      <button 
                        key={method.name}
                        onClick={() => setSelectedMethod(method)}
                        className="w-full p-4 rounded-2xl border border-gray-100 flex justify-between items-center hover:border-red-200 hover:bg-red-50 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 flex items-center justify-center">
                            {method.icon}
                          </div>
                          <span className="font-bold text-gray-700">{method.name}</span>
                        </div>
                        <ChevronRight size={18} className="text-gray-300 group-hover:text-red-400" />
                      </button>
                    ))}
                  </div>

                  <div className="bg-red-50 p-4 rounded-2xl mb-8">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-red-400 uppercase">Доступно</span>
                      <span className="text-xs font-bold text-red-900">{balanceRub.toFixed(2)} ₽</span>
                    </div>
                    <div className="w-full bg-red-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-red-500 h-full" 
                        style={{ width: `${Math.min((balanceRub / WITHDRAW_MIN) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-red-400 mt-2 font-bold">
                      {balanceRub >= WITHDRAW_MIN 
                        ? 'Вы можете заказать выплату!' 
                        : `Нужно еще ${(WITHDRAW_MIN - balanceRub).toFixed(2)} ₽ до минимума`}
                    </p>
                  </div>

                  <button 
                    disabled={balanceRub < WITHDRAW_MIN}
                    onClick={() => {}} // This button now just acts as a guide, selection happens above
                    className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg transition-all ${
                      balanceRub >= WITHDRAW_MIN 
                      ? 'bg-red-500 text-white shadow-red-200 hover:bg-red-600' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    Выберите способ
                  </button>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 bg-red-50/50 p-4 rounded-2xl border border-red-100">
                    <div className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm">
                      {selectedMethod.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-red-400">Выбранный метод</p>
                      <p className="text-sm font-bold text-red-900">{selectedMethod.name}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-2 ml-1">
                      Адрес кошелька
                    </label>
                    <input 
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="Введите адрес..."
                      className="w-full p-4 rounded-2xl border border-gray-100 focus:border-red-200 focus:bg-red-50 outline-none transition-all font-bold text-gray-700"
                    />
                  </div>

                  <div className="bg-red-50 p-6 rounded-[24px]">
                    <p className="text-[10px] font-bold uppercase text-red-400 mb-1">Сумма к выводу</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-3xl font-serif font-black text-red-900">{balanceRub.toFixed(2)}</h3>
                      <span className="text-red-400 font-bold">₽</span>
                    </div>
                    <p className="text-[10px] text-red-400 mt-2 font-medium">
                      Комиссия сети включена в сумму
                    </p>
                  </div>

                  <button 
                    disabled={!walletAddress || balanceRub < WITHDRAW_MIN}
                    onClick={() => {
                      alert('Заявка на вывод успешно создана!');
                      setShowWithdrawModal(false);
                      setSelectedMethod(null);
                      setWalletAddress('');
                    }}
                    className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg transition-all ${
                      walletAddress && balanceRub >= WITHDRAW_MIN
                      ? 'bg-red-500 text-white shadow-red-200 hover:bg-red-600' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    Подтвердить вывод
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowProfileModal(false);
                setIsEditingNickname(false);
              }}
              className="absolute inset-0 bg-red-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-sm bg-white rounded-t-[32px] sm:rounded-[32px] p-8 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-6 sm:hidden" />
              
              <div className="flex items-center gap-4 mb-8">
                <button 
                  onClick={() => {
                    setShowProfileModal(false);
                    setIsEditingNickname(false);
                  }}
                  className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="font-serif italic text-2xl font-black text-red-900">Профиль</h2>
              </div>

              {/* User Info */}
              <div className="flex flex-col items-center mb-8">
                <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-4 border-2 border-red-100 relative">
                  <User size={40} className="text-red-400" />
                  <div className="absolute -bottom-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center border-4 border-white font-black text-xs">
                    {level}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isEditingNickname ? (
                    <div className="flex items-center gap-1">
                      <input 
                        type="text"
                        value={tempNickname}
                        onChange={(e) => setTempNickname(e.target.value)}
                        className="bg-red-50 border border-red-100 rounded-lg px-3 py-1 text-sm font-bold text-red-900 outline-none focus:border-red-300"
                        autoFocus
                      />
                      <button 
                        onClick={() => {
                          if (tempNickname.trim()) {
                            setNickname(tempNickname.trim());
                            setIsEditingNickname(false);
                          }
                        }}
                        className="p-1 text-green-500 hover:bg-green-50 rounded"
                      >
                        <Check size={18} />
                      </button>
                      <button 
                        onClick={() => setIsEditingNickname(false)}
                        className="p-1 text-red-400 hover:bg-red-50 rounded"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xl font-black text-red-900">{nickname}</h3>
                      <button 
                        onClick={() => setIsEditingNickname(true)}
                        className="p-1 text-red-300 hover:text-red-500 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                    </>
                  )}
                </div>
                <p className="text-[10px] font-bold uppercase text-red-400 tracking-widest mt-1">
                  Уровень {level} • {Math.floor(xp)} XP
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="bg-red-50/50 p-4 rounded-2xl border border-red-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy size={14} className="text-yellow-600" />
                    <span className="text-[10px] font-bold uppercase text-red-400">Заработано</span>
                  </div>
                  <p className="text-lg font-black text-red-900">{totalEarnedRub.toFixed(2)} ₽</p>
                </div>
                <div className="bg-red-50/50 p-4 rounded-2xl border border-red-50">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 size={14} className="text-blue-600" />
                    <span className="text-[10px] font-bold uppercase text-red-400">Просмотры</span>
                  </div>
                  <p className="text-lg font-black text-red-900">{totalAdsWatched}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Star size={16} className="text-red-400" />
                    <span className="text-sm font-bold text-gray-600">Бонус дохода</span>
                  </div>
                  <span className="text-sm font-black text-green-600">+{((bonusMultiplier - 1) * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <TrendingUp size={16} className="text-red-400" />
                    <span className="text-sm font-bold text-gray-600">Курс вывода</span>
                  </div>
                  <span className="text-sm font-black text-gray-900">30 🍓 = 1 ₽</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
