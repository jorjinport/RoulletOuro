export const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export const TERMINAL_GROUPS = {
  '1-4-7': [1, 4, 7, 11, 14, 17, 21, 24, 27, 31, 34],
  '2-5-8': [2, 5, 8, 12, 15, 18, 22, 25, 28, 32, 35],
  '3-6-9': [3, 6, 9, 13, 16, 19, 23, 26, 29, 33, 36, 0]
};

export const CYLINDER_SECTORS = {
  'Voisins': [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25],
  'Tiers': [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33],
  'Orphelins': [1, 20, 14, 31, 9, 17, 34, 6]
};

export function getSector(num: number): string {
  for (const [sector, nums] of Object.entries(CYLINDER_SECTORS)) {
    if (nums.includes(num)) return sector;
  }
  return 'N/A';
}

export function getNumberColor(num: number) {
  if (num === 0) return 'green';
  return RED_NUMBERS.includes(num) ? 'red' : 'black';
}

export const getWheelNeighbors = (num: number, count: number = 2) => {
  const index = ROULETTE_NUMBERS.indexOf(num);
  if (index === -1) return [];
  
  const neighbors = [];
  for (let i = -count; i <= count; i++) {
    if (i === 0) continue;
    let neighborIndex = (index + i) % ROULETTE_NUMBERS.length;
    if (neighborIndex < 0) neighborIndex += ROULETTE_NUMBERS.length;
    neighbors.push(ROULETTE_NUMBERS[neighborIndex]);
  }
  return neighbors;
};

export const AI_LAYERS = [
  { id: '1', name: 'Famílias (1, 4, 7)', type: 'core' },
  { id: '2', name: 'Espelhos e Setor Zero', type: 'core' },
  { id: 'EXTRA', name: 'Camuflados (Soma de Dígitos)', type: 'advanced' },
  { id: '3', name: 'Calor e Momentum (Heatmap)', type: 'core' },
  { id: '4', name: 'Momentum de Vizinhança', type: 'core' },
  { id: '5', name: 'Neural Engine (Deep Learning)', type: 'neural' },
  { id: '6', name: 'Markov Chain', type: 'neural' },
  { id: '7', name: 'Sector Velocity & Momentum', type: 'core' },
  { id: '8', name: 'Vizinhos Históricos', type: 'core' },
  { id: '9', name: 'Vácuo Recorrente (Gap Analysis)', type: 'core' },
  { id: '10', name: 'Sequence Analysis', type: 'advanced' },
  { id: '11', name: 'Table Heatmap', type: 'core' },
  { id: '12', name: 'Historical Gap Pattern', type: 'advanced' },
  { id: '13', name: 'Dealer Signature', type: 'advanced' },
  { id: '13.5', name: 'Ballistic Mode', type: 'extreme' },
  { id: '14', name: 'Z-Score', type: 'advanced' },
  { id: '15', name: 'Cluster Analysis', type: 'advanced' },
  { id: '15.5', name: 'Momentum Inverso', type: 'extreme' },
  { id: '15.7', name: 'Sequencial Recognition', type: 'extreme' },
  { id: '15.9', name: 'Mirror Convergence', type: 'extreme' },
  { id: '16', name: 'Chaos Index', type: 'advanced' },
  { id: '17', name: 'Cross-Terminal Convergence', type: 'neural' },
  { id: '18', name: 'Approximation Engine', type: 'neural' },
  { id: '19', name: 'Short-Term Convergence', type: 'advanced' },
  { id: '20', name: 'Lei do Terceiro', type: 'core' },
  { id: '21', name: 'Pendulum Strike', type: 'extreme' },
  { id: '22', name: 'Geometria de Mesa (Dúzias)', type: 'core' },
  { id: '23', name: 'Fibonacci Resonance', type: 'extreme' },
  { id: '24', name: 'Detector de Alternância', type: 'advanced' },
  { id: '25', name: 'Wheel Slice Analysis', type: 'advanced' },
  { id: '25.5', name: 'Breaker/Robbery Detection', type: 'extreme' },
  { id: '26', name: 'Historical Mirroring', type: 'neural' },
  { id: '27', name: 'Sector Transition Matrix', type: 'neural' },
  { id: '28', name: 'Cross-Sector Terminal Break', type: 'extreme' },
  { id: '29', name: 'Neural-Markov Boost', type: 'neural' },
  { id: '30', name: 'Super Convergence', type: 'omega' }
];
