import { ROULETTE_NUMBERS, RED_NUMBERS, TERMINAL_GROUPS, CYLINDER_SECTORS, getNumberColor, getWheelNeighbors, getSector } from './constants';

export interface NumberScore {
  num: number;
  total: number;
  factors: { name: string; value: number }[];
}

export interface AnalysisResult {
  targets: number[];
  biasMessage: string;
  confidence: number;
  playSignal: 'red' | 'yellow' | 'green';
  stats: {
    hotNumbers: { num: number; count: number }[];
    recentProbabilities: { num: number; probability: number }[];
    terminalFrequency: Record<string, number>;
    colorTendency: { red: number; black: number; green: number };
    lastPattern: string;
    dealerRhythm: 'ESTÁVEL' | 'INSTÁVEL' | 'MUDANDO';
    mirrorAlert: boolean;
    mirrorTarget: number | null;
    activeSector: string;
    predictedSector: string;
    sectorConfidence: number;
    sectorSequencePattern: string;
    sectorBias: { sector: string; frequency: number; percentage: number; hotNumbers: number[] }[];
    biasDetected: boolean;
    terminalRepeat: boolean;
    lastTerminalGroup: string;
    vacuumAlerts: { num: number; gap: number; strength: number }[];
    quebraAlert: boolean;
    quebraTarget: number | null;
    quebraReason: string;
    sequenceAlert: boolean;
    sequenceTarget: number | null;
    sequenceStrength: number;
    omegaAlert: boolean;
    omegaPercentage: number;
    omegaTarget: number | null;
    omegaScores: NumberScore[];
  };
}

const MIRRORS: Record<number, number> = {
  12: 21, 21: 12,
  13: 31, 31: 13,
  23: 32, 32: 23,
  5: 15, 15: 5,
  6: 16, 16: 6,
  1: 11, 11: 1,
  2: 22, 22: 2,
  3: 33, 33: 3,
  4: 14, 14: 4
};

export function analyzeHistory(history: number[], depth = 0): AnalysisResult {
  if (history.length < 3) {
    return {
      targets: [],
      biasMessage: "COLETANDO DADOS...",
      confidence: 0,
      playSignal: 'red',
      stats: {
        hotNumbers: [],
        recentProbabilities: [],
        terminalFrequency: {},
        colorTendency: { red: 0, black: 0, green: 0 },
        lastPattern: "N/A",
        dealerRhythm: 'ESTÁVEL',
        mirrorAlert: false,
        mirrorTarget: null,
        activeSector: "N/A",
        predictedSector: "N/A",
        sectorConfidence: 0,
        sectorSequencePattern: "N/A",
        sectorBias: [],
        biasDetected: false,
        terminalRepeat: false,
        lastTerminalGroup: "N/A",
        vacuumAlerts: [],
        quebraAlert: false,
        quebraTarget: null,
        quebraReason: "",
        sequenceAlert: false,
        sequenceTarget: null,
        sequenceStrength: 0,
        omegaAlert: false,
        omegaPercentage: 0,
        omegaTarget: null,
        omegaScores: []
      }
    };
  }

  // Vacuum/Gap Analysis
  const numberGaps: Record<number, number[]> = {};
  const currentGaps: Record<number, number> = {};
  
  // Initialize gaps
  for (let i = 0; i <= 36; i++) {
    numberGaps[i] = [];
    currentGaps[i] = -1; // -1 means not seen yet
  }

  // Calculate historical gaps (history is [newest, ..., oldest])
  // We need to process from oldest to newest to calculate gaps correctly
  const chronologicalHistory = [...history].reverse();
  const lastSeenAt: Record<number, number> = {};
  
  chronologicalHistory.forEach((num, index) => {
    if (lastSeenAt[num] !== undefined) {
      const gap = index - lastSeenAt[num] - 1;
      numberGaps[num].push(gap);
    }
    lastSeenAt[num] = index;
  });

  // Current gap for each number
  Object.keys(currentGaps).forEach(numStr => {
    const num = parseInt(numStr);
    const lastIdx = history.indexOf(num);
    if (lastIdx !== -1) {
      currentGaps[num] = lastIdx;
    }
  });

  const vacuumAlerts: { num: number; gap: number; strength: number }[] = [];
  Object.entries(currentGaps).forEach(([numStr, gap]) => {
    const num = parseInt(numStr);
    if (gap > 0 && numberGaps[num].length > 0) {
      // Check if current gap matches any historical gap
      const matches = numberGaps[num].filter(g => g === gap).length;
      if (matches >= 1) {
        vacuumAlerts.push({
          num,
          gap,
          strength: matches * 20 + (gap > 10 ? 15 : 0)
        });
      }
    }
  });

  const counts: Record<number, number> = {};
  const terminals: Record<string, number> = { '1-4-7': 0, '2-5-8': 0, '3-6-9': 0 };
  const sectors: Record<string, number> = { 'Voisins': 0, 'Tiers': 0, 'Orphelins': 0 };
  const colors = { red: 0, black: 0, green: 0 };
  
  history.forEach(num => {
    counts[num] = (counts[num] || 0) + 1;
    const color = getNumberColor(num);
    colors[color]++;
    
    // Terminals
    Object.entries(TERMINAL_GROUPS).forEach(([group, nums]) => {
      if (nums.includes(num)) terminals[group]++;
    });

    // Sectors
    Object.entries(CYLINDER_SECTORS).forEach(([sector, nums]) => {
      if (nums.includes(num)) sectors[sector]++;
    });
  });

  const lastNum = history[0];
  const prevNum = history[1];
  
  // Terminal Group Analysis (Streaks and Repeats)
  const getGroup = (n: number) => Object.entries(TERMINAL_GROUPS).find(([_, nums]) => nums.includes(n))?.[0];
  const lastGroup = getGroup(lastNum);
  const prevGroup = getGroup(prevNum);
  const isTerminalRepeat = lastGroup === prevGroup;

  // 1. Markov Prediction
  const transitions: Record<number, number> = {};
  for (let i = 0; i < history.length - 1; i++) {
    if (history[i + 1] === lastNum) {
      const next = history[i];
      transitions[next] = (transitions[next] || 0) + 1;
    }
  }
  const markovTargets = Object.entries(transitions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([num]) => parseInt(num));

  // 2. Mirror Logic
  const mirrorTarget = MIRRORS[lastNum];
  const mirrorAlert = !!mirrorTarget;

  // 3. Dealer Rhythm & Displacement Analysis
  const signedDistances = [];
  for (let i = 0; i < Math.min(history.length - 1, 10); i++) {
    const idxCurrent = ROULETTE_NUMBERS.indexOf(history[i]);
    const idxPrev = ROULETTE_NUMBERS.indexOf(history[i+1]);
    // Calculate clockwise distance
    let dist = idxCurrent - idxPrev;
    if (dist < 0) dist += 37;
    signedDistances.push(dist);
  }
  
  const avgDist = signedDistances.reduce((a, b) => a + b, 0) / signedDistances.length;
  const distVariance = signedDistances.reduce((a, b) => a + Math.pow(b - avgDist, 2), 0) / signedDistances.length;
  const dealerRhythm = distVariance < 25 ? 'ESTÁVEL' : distVariance < 64 ? 'MUDANDO' : 'INSTÁVEL';

  // Find most frequent displacement (mode)
  const distCounts: Record<number, number> = {};
  signedDistances.forEach(d => distCounts[d] = (distCounts[d] || 0) + 1);
  const commonDist = parseInt(Object.entries(distCounts).sort((a, b) => b[1] - a[1])[0][0]);
  
  const displacementTargets = [
    ROULETTE_NUMBERS[(ROULETTE_NUMBERS.indexOf(lastNum) + commonDist) % 37],
    ROULETTE_NUMBERS[(ROULETTE_NUMBERS.indexOf(lastNum) + Math.round(avgDist)) % 37]
  ];

  // 4. Sector Analysis
  const activeSector = Object.entries(sectors).sort((a, b) => b[1] - a[1])[0][0];

  // 4.1 Sector Transition Analysis (Markov on Sectors based on lastNum)
  const sectorTransitions: Record<string, number> = { 'Voisins': 0, 'Tiers': 0, 'Orphelins': 0 };
  let transitionCount = 0;
  
  // Look for occurrences of lastNum to see what follows
  for (let i = 1; i < history.length - 1; i++) {
    if (history[i] === lastNum) {
      const nextNum = history[i - 1];
      const nextSector = getSector(nextNum);
      
      // Weight the transition based on context (if prevNum matches)
      let weight = 1;
      if (i < history.length - 2 && history[i + 1] === prevNum) {
        weight = 3; // Stronger weight if the sequence (prev -> last) matches
      }
      
      if (nextSector !== 'N/A') {
        sectorTransitions[nextSector] += weight;
        transitionCount += weight;
      }
    }
  }
  
  const sortedTransitions = Object.entries(sectorTransitions).sort((a, b) => b[1] - a[1]);
  const predictedSector = transitionCount > 0 && sortedTransitions[0][1] > 0
    ? sortedTransitions[0][0]
    : 'N/A';
  const sectorConfidence = transitionCount > 0 ? (sortedTransitions[0][1] / transitionCount) : 0;
  
  // 4.2 Sector Sequence Pattern Analysis (Higher-level patterns)
  const sectorHistory = history.map(n => getSector(n)).filter(s => s !== 'N/A').reverse();
  let sectorSequencePattern = "N/A";
  let sequencePrediction = "N/A";
  
  if (sectorHistory.length >= 4) {
    const lastTwo = sectorHistory.slice(-2); // [S-1, S0]
    const seqCounts: Record<string, number> = { 'Voisins': 0, 'Tiers': 0, 'Orphelins': 0 };
    let totalSeqMatches = 0;
    
    for (let i = 0; i < sectorHistory.length - 3; i++) {
      if (sectorHistory[i] === lastTwo[0] && sectorHistory[i + 1] === lastTwo[1]) {
        const next = sectorHistory[i + 2];
        seqCounts[next]++;
        totalSeqMatches++;
      }
    }
    
    if (totalSeqMatches > 0) {
      const sortedSeq = Object.entries(seqCounts).sort((a, b) => b[1] - a[1]);
      if (sortedSeq[0][1] > 0) {
        sequencePrediction = sortedSeq[0][0];
        sectorSequencePattern = `${lastTwo[0]} → ${lastTwo[1]} → ${sequencePrediction}`;
      }
    }
  }

  // 5. Bias Detection (Statistical deviation)
  const expectedFreq = history.length / 37;
  const maxFreq = Math.max(...Object.values(counts));
  const biasDetected = maxFreq > expectedFreq * 2.5 && history.length > 20;

  // 6. Quebra (Break/Robbery) Detection
  // Detects sudden shifts in patterns or specific numbers that follow anomalies
  let quebraAlert = false;
  let quebraTarget: number | null = null;
  let quebraReason = "";

  // Strategy A: Color Streak Break
  let redStreak = 0;
  let blackStreak = 0;
  for (const n of history) {
    if (getNumberColor(n) === 'red') { redStreak++; blackStreak = 0; }
    else if (getNumberColor(n) === 'black') { blackStreak++; redStreak = 0; }
    else break;
  }

  if (redStreak >= 4 || blackStreak >= 4) {
    // If we have a long streak, check what usually breaks it
    const streakColor = redStreak >= 4 ? 'red' : 'black';
    const breakSuccessors: Record<number, number> = {};
    
    // Scan history for similar streaks
    let tempStreak = 0;
    for (let i = history.length - 1; i >= 1; i--) {
      const color = getNumberColor(history[i]);
      if (color === streakColor) {
        tempStreak++;
      } else {
        if (tempStreak >= 4) {
          const breaker = history[i];
          breakSuccessors[breaker] = (breakSuccessors[breaker] || 0) + 1;
        }
        tempStreak = 0;
      }
    }

    const sortedBreakers = Object.entries(breakSuccessors).sort((a, b) => b[1] - a[1]);
    if (sortedBreakers.length > 0) {
      quebraAlert = true;
      quebraTarget = parseInt(sortedBreakers[0][0]);
      quebraReason = `ROUBO APÓS SEQUÊNCIA ${streakColor.toUpperCase()}`;
    }
  }

  // Strategy B: Terminal Fatigue Break
  // When specific terminals repeat too much, the system usually shifts to a different family
  if (isTerminalRepeat && history.length > 10) {
    const last3 = history.slice(0, 3);
    const allSameGroup = last3.every(n => getGroup(n) === lastGroup);
    
    if (allSameGroup) {
      const fatigueGroup = lastGroup;
      const breakers: Record<number, number> = {};
      
      // Look for what historically broke this terminal group streak
      let currentStreakCount = 0;
      for (let i = history.length - 1; i >= 1; i--) {
        const g = getGroup(history[i]);
        if (g === fatigueGroup) {
          currentStreakCount++;
        } else {
          if (currentStreakCount >= 3) {
            const breaker = history[i];
            breakers[breaker] = (breakers[breaker] || 0) + 1;
          }
          currentStreakCount = 0;
        }
      }

      const sortedBreakers = Object.entries(breakers).sort((a, b) => b[1] - a[1]);
      if (sortedBreakers.length > 0) {
        quebraAlert = true;
        quebraTarget = parseInt(sortedBreakers[0][0]);
        quebraReason = `QUEBRA DE FAMÍLIA ${fatigueGroup}`;
      } else {
        // Fallback to Zero or strongest neighbor of opposite group
        quebraAlert = true;
        quebraTarget = 0; 
        quebraReason = "SISTEMA DE ROUBO: IMÃ ZERO ATIVADO";
      }
    }
  }

  // Strategy C: Sector Fatigue (The "Opposite Jump")
  const last4Sectors = history.slice(0, 4).map(n => getSector(n));
  const dominantSector = last4Sectors[0];
  if (dominantSector !== 'N/A' && last4Sectors.every(s => s === dominantSector) && history.length > 15) {
    // Find numbers in the opposite side of the wheel that often act as "jump targets"
    const oppositeSectorMap: Record<string, string> = {
      'Voisins': 'Tiers',
      'Tiers': 'Voisins',
      'Orphelins': 'Voisins' // Orphelins usually jump back to Voisins
    };
    const targetSector = oppositeSectorMap[dominantSector] || 'Voisins';
    const sectorNums = CYLINDER_SECTORS[targetSector as keyof typeof CYLINDER_SECTORS];
    
    // Find the historically most common entry point into this sector after a fatigue in the dominant one
    const entryPoints: Record<number, number> = {};
    for (let i = history.length - 1; i >= 1; i--) {
      if (getSector(history[i]) === dominantSector && getSector(history[i-1]) === targetSector) {
        entryPoints[history[i-1]] = (entryPoints[history[i-1]] || 0) + 1;
      }
    }

    const bestEntry = Object.entries(entryPoints).sort((a, b) => b[1] - a[1])[0];
    if (bestEntry) {
      quebraAlert = true;
      quebraTarget = parseInt(bestEntry[0]);
      quebraReason = `SALTO DE SETOR: ${dominantSector} → ${targetSector}`;
    }
  }

  // 7. Historical Sequence Recognition (The "Third Number" Pattern)
  // Looks for occurrences of [history[2], history[1]] and predicts what followed (history[0])
  let sequenceAlert = false;
  let sequenceTarget: number | null = null;
  let sequenceStrength = 0;

  if (history.length >= 10) {
    const pattern = [history[2], history[1]]; // The pair that just completed before lastNum
    // Actually, user wants to predict history[0] (next) based on [history[1], history[0]]
    const currentPair = [history[1], history[0]];
    const successors: Record<number, number> = {};
    
    // Scan history for currentPair
    for (let i = 1; i < history.length - 2; i++) {
      if (history[i + 1] === currentPair[0] && history[i] === currentPair[1]) {
        const next = history[i - 1]; // What came after this pair historically
        successors[next] = (successors[next] || 0) + 1;
      }
    }

    const sortedSuccessors = Object.entries(successors).sort((a, b) => b[1] - a[1]);
    if (sortedSuccessors.length > 0) {
      sequenceTarget = parseInt(sortedSuccessors[0][0]);
      sequenceStrength = sortedSuccessors[0][1];
      sequenceAlert = sequenceStrength >= 1; // Even 1 match is significant for a triple
    }
  }

  // 7. Prediction Targets
  const cylinderTargets = getWheelNeighbors(lastNum, 2);
  const topTerminalGroup = Object.entries(terminals).sort((a, b) => b[1] - a[1])[0][0] as keyof typeof TERMINAL_GROUPS;
  const terminalTargets = [...TERMINAL_GROUPS[topTerminalGroup].slice(0, 2)];
  
  // If terminal group repeated, prioritize that group
  if (isTerminalRepeat && lastGroup) {
    const groupNums = TERMINAL_GROUPS[lastGroup as keyof typeof TERMINAL_GROUPS];
    terminalTargets.push(...groupNums.slice(0, 2));
  }

  const sectorTargets = CYLINDER_SECTORS[activeSector as keyof typeof CYLINDER_SECTORS].slice(0, 2);
  const predictedSectorTargets = predictedSector !== 'N/A' 
    ? CYLINDER_SECTORS[predictedSector as keyof typeof CYLINDER_SECTORS].slice(0, 3)
    : [];
  
  const sequenceTargets = sequencePrediction !== 'N/A'
    ? CYLINDER_SECTORS[sequencePrediction as keyof typeof CYLINDER_SECTORS].slice(0, 3)
    : [];

  const finalTargets = Array.from(new Set([
    ...markovTargets,
    ...(mirrorTarget ? [mirrorTarget] : []),
    ...cylinderTargets,
    ...terminalTargets,
    ...sectorTargets,
    ...predictedSectorTargets,
    ...sequenceTargets,
    ...(sequenceTarget !== null ? [sequenceTarget] : []),
    ...(quebraTarget !== null ? [quebraTarget] : []),
    ...displacementTargets,
    ...vacuumAlerts.sort((a, b) => b.strength - a.strength).slice(0, 2).map(v => v.num)
  ])).slice(0, 10);

  // Sniper Analysis (High Precision Alignment)
  // Check if multiple independent systems point to the same number
  const targetScores: Record<number, NumberScore> = {};
  
  const addToScore = (nums: number[], weight: number, factorName: string) => {
    nums.forEach(n => {
      if (!targetScores[n]) {
        targetScores[n] = { num: n, total: 0, factors: [] };
      }
      targetScores[n].total += weight;
      targetScores[n].factors.push({ name: factorName, value: weight });
    });
  };

  addToScore(markovTargets, 30, "Markov");
  if (mirrorTarget) addToScore([mirrorTarget], 40, "Espelho");
  addToScore(cylinderTargets, 20, "Cilindro");
  addToScore(terminalTargets, 25, "Terminais");
  addToScore(predictedSectorTargets, 35, "Setor Alvo");
  addToScore(displacementTargets, 30, "Deslocamento");
  
  // Add direct sequence recognition to score
  if (sequenceAlert && sequenceTarget !== null) {
    addToScore([sequenceTarget], 45, "Recon. Sequencial");
  }

  if (quebraAlert && quebraTarget !== null) {
    addToScore([quebraTarget], 50, "Padrão de Quebra");
  }
  
  // Add vacuum alerts to scores
  vacuumAlerts.forEach(v => {
    addToScore([v.num], v.strength / 2, "Vácuo");
  });

  const sortedScores = Object.values(targetScores).sort((a, b) => b.total - a.total);
  const topScore = sortedScores.length > 0 ? sortedScores[0] : null;
  
  const omegaTarget = topScore && topScore.total > 80 ? topScore.num : null;
  const omegaAlert = omegaTarget !== null;
  const omegaPercentage = topScore ? Math.min(99, 70 + (topScore.total / 5)) : 0;

  // Confidence Calculation
  let confidence = 40;
  if (dealerRhythm === 'ESTÁVEL') confidence += 25;
  if (distVariance < 16) confidence += 10; // High physical consistency
  if (history.length > 30) confidence += 15;
  if (mirrorAlert) confidence += 10;
  if (isTerminalRepeat) confidence += 10;
  if (biasDetected) confidence += 10;
  if (sectorConfidence > 0.6) confidence += 15; // Strong sector transition pattern
  if (omegaAlert) confidence += 15;
  if (quebraAlert) confidence += 12;
  confidence = Math.min(confidence, 98);

  // Bias Message
  let biasMessage = "PREDIÇÃO CALCULADA";
  if (omegaAlert) biasMessage = `ALERTA ÔMEGA: NÚMERO ${omegaTarget}`;
  else if (quebraAlert) biasMessage = `AVISO DE QUEBRA: ROUBO NO ${quebraTarget}`;
  else if (biasDetected) biasMessage = "VIÉS DETECTADO: NÚMERO VICIADO";
  else if (sectorConfidence > 0.75) biasMessage = `FORTE TENDÊNCIA: ÁREA ${predictedSector.toUpperCase()}`;
  else if (confidence > 85) biasMessage = "ALTA CONFIANÇA: ENTRADA FORTE";
  else if (confidence > 65) biasMessage = "CONFIANÇA MÉDIA: SIGA O PADRÃO";

  const recentHistory = history.slice(0, 20);
  const recentCounts: Record<number, number> = {};
  recentHistory.forEach(num => {
    recentCounts[num] = (recentCounts[num] || 0) + 1;
  });
  const recentProbabilities = Array.from({ length: 37 }, (_, i) => ({
    num: i,
    probability: Math.round(((recentCounts[i] || 0) / recentHistory.length) * 100)
  })).filter(item => item.probability > 0);

  const sectorBias = Object.entries(sectors).map(([sector, count]) => {
    const sectorNums = CYLINDER_SECTORS[sector as keyof typeof CYLINDER_SECTORS];
    const hotInSector = sectorNums
      .filter(n => counts[n] > 0)
      .sort((a, b) => (counts[b] || 0) - (counts[a] || 0))
      .slice(0, 3);

    return {
      sector,
      frequency: count,
      percentage: Math.round((count / history.length) * 100),
      hotNumbers: hotInSector
    };
  });

  // 7. Play Signal Logic (The "Lightning" Intensity)
  // Red: Unstable, Yellow: Pattern forming, Green: Strong Entry (especially after a quebra miss)
  let playSignal: 'red' | 'yellow' | 'green' = 'red';
  
  if (history.length >= 15 && depth === 0) {
    const analysis_v1 = analyzeHistory(history.slice(1), 1);
    const analysis_v2 = analyzeHistory(history.slice(2), 2);
    
    const lastNum = history[0];
    const prevNum = history[1];
    
    // Check if the current most recent spin missed its target
    const lastHitTarget = analysis_v1.targets.includes(lastNum) || analysis_v1.stats.quebraTarget === lastNum;
    const lastWasQuebra = analysis_v1.stats.quebraAlert;

    // Check if the spin before the most recent missed its target
    const prevHitTarget = analysis_v2.targets.includes(prevNum) || analysis_v2.stats.quebraTarget === prevNum;
    const prevWasQuebra = analysis_v2.stats.quebraAlert;

    // THE "VOLTA É CERTA" LOGIC (Return is Certain)
    // Rule: If game broke pattern (quebra) and missed target 1 or 2 times, the entry is confirmed.
    
    const doubleMiss = (!lastHitTarget && lastWasQuebra) && (!prevHitTarget && prevWasQuebra);
    const singleMiss = (!lastHitTarget && lastWasQuebra);

    if (doubleMiss) {
      // Very high probability: 2 consecutive missed quebras
      playSignal = 'green';
    } else if (singleMiss) {
      // 1 missed quebra: check if current state is very stable or has omega
      if (confidence > 80 || omegaAlert) {
        playSignal = 'green';
      } else {
        playSignal = 'yellow';
      }
    } else if (quebraAlert) {
      // Current pattern is a break but hasn't resulted in a hit/miss yet
      if (confidence > 85) playSignal = 'green';
      else playSignal = 'yellow';
    } else if (omegaAlert || confidence > 80) {
      playSignal = 'yellow';
    }
  }

  return {
    targets: finalTargets,
    biasMessage,
    confidence,
    playSignal,
    stats: {
      hotNumbers: Object.entries(counts)
        .map(([num, count]) => ({ num: parseInt(num), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      recentProbabilities,
      terminalFrequency: terminals,
      colorTendency: {
        red: Math.round((colors.red / history.length) * 100),
        black: Math.round((colors.black / history.length) * 100),
        green: Math.round((colors.green / history.length) * 100),
      },
      lastPattern: history.slice(0, 3).map(n => getNumberColor(n)[0].toUpperCase()).join(''),
      dealerRhythm,
      mirrorAlert,
      mirrorTarget: mirrorTarget ?? null,
      activeSector,
      predictedSector,
      sectorConfidence,
      sectorSequencePattern,
      sectorBias,
      biasDetected,
      terminalRepeat: isTerminalRepeat,
      lastTerminalGroup: lastGroup || "N/A",
      vacuumAlerts,
      quebraAlert,
      quebraTarget,
      quebraReason,
      sequenceAlert,
      sequenceTarget,
      sequenceStrength,
      omegaAlert,
      omegaPercentage,
      omegaTarget,
      omegaScores: sortedScores.slice(0, 10)
    }
  };
}
