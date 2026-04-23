import React from 'react';
import { motion } from 'framer-motion';
import { getNumberColor } from '../constants';
import { cn } from '../lib/utils';

interface VacuumTrackerProps {
  vacuumAlerts: Array<{ num: number; gap: number; strength: number }>;
}

export const VacuumTracker: React.FC<VacuumTrackerProps> = ({ vacuumAlerts }) => {
  if (vacuumAlerts.length === 0) return null;

  return (
    <div className="mt-6 grid grid-cols-1 gap-3 w-full max-w-2xl">
      <div className="flex items-center space-x-4 px-2 mb-1">
        <div className="h-[1px] flex-1 bg-white/5" />
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em]">Rastreador de Vácuo</span>
        </div>
        <div className="h-[1px] flex-1 bg-white/5" />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {vacuumAlerts.map((v, i) => (
          <motion.div 
            key={i}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-gold/30 hover:bg-white/10 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-center space-x-3 relative z-10">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-2xl group-hover:scale-110 transition-transform duration-500",
                getNumberColor(v.num) === 'red' ? "bg-red-600/20 border border-red-500/40 text-red-500" : 
                getNumberColor(v.num) === 'black' ? "bg-zinc-900 border border-white/20 text-white" : 
                "bg-emerald-600/20 border border-emerald-500/40 text-emerald-400"
              )}>
                {v.num}
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Vácuo Atual</span>
                <span className="text-xs font-black text-white uppercase tracking-tighter">{v.gap} Rodadas</span>
              </div>
            </div>

            <div className="flex flex-col items-end relative z-10">
              <span className="text-[9px] font-black text-gold uppercase tracking-widest mb-1">Força</span>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((dot) => (
                  <div 
                    key={dot} 
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all duration-500",
                      dot <= Math.ceil(v.strength / 20) ? "bg-gold shadow-[0_0_8px_rgba(212,175,55,0.8)]" : "bg-white/10"
                    )} 
                  />
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
