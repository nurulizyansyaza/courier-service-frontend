import type { SessionOffer, SessionState, SessionContextType, HistoryLine, Framework } from './types';
export type { Framework } from './types';

// ── Default Data ───────────────────────────────────────────────────────

export const DEFAULT_OFFERS: SessionOffer[] = [
  { code: 'OFR001', discount: 10, minDistance: 0, maxDistance: 200, minWeight: 70, maxWeight: 200 },
  { code: 'OFR002', discount: 7, minDistance: 50, maxDistance: 150, minWeight: 100, maxWeight: 250 },
  { code: 'OFR003', discount: 5, minDistance: 50, maxDistance: 250, minWeight: 10, maxWeight: 150 },
];

export const DEFAULT_SESSION: SessionState = {
  offers: DEFAULT_OFFERS,
};

// ── Fallback Session Context ───────────────────────────────────────────

export const FALLBACK_SESSION_CONTEXT: SessionContextType = {
  session: { offers: [] },
  getOffersForCalculation: () => ({}),
};

// ── Welcome Lines ──────────────────────────────────────────────────────

export const WELCOME_LINES: HistoryLine[] = [
  { type: 'system', text: '# ─────────────────────────────────────' },
  { type: 'system', text: '#  Courier Service App Calculator' },
  { type: 'system', text: '# ─────────────────────────────────────' },
  { type: 'system', text: '#' },
  { type: 'system', text: '#  Enter delivery input to calculate' },
  { type: 'system', text: '#  costs and estimated delivery times.' },
  { type: 'system', text: '#' },
  { type: 'system', text: '#  Type "clear" to reset terminal.' },
  { type: 'system', text: '# ─────────────────────────────────────' },
];

// ── Framework Config ───────────────────────────────────────────────────

export const DEFAULT_FRAMEWORK: Framework = 'react';

export const FRAMEWORK_CONFIG: Record<
  Framework,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  react: {
    label: 'React.js',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/30',
  },
  vue: {
    label: 'Vue.js',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
  },
  svelte: {
    label: 'Svelte',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
  },
};

export const MOTORCYCLE_ART = `                            ___
                          /~   ~\\
                         |_      |
                         |/     __-__
                          \\   /~     ~~-_
                           ~~ -~~\\       ~\\
                            /     |        \\
               ,           /     /          \\
             //   _ _---~~~    //-_          \\
           /  (/~~ )    _____/-__  ~-_       _-\\             _________
         /  _-~\\\\0) ~~~~         ~~-_ \\__--~~   \`\\  ___---~~~        /'
        /_-~                       _-/'          )~/               /'
        (___________/           _-~/'         _-~~/             _-~
     _ ----- _~-_\\\\\\\\        _-~ /'      __--~   (_ ______---~~~--_
  _-~         ~-_~\\\\\\\\      (   (     -_~          ~-_  |          ~-_
 /~~~~\\          \\ \\~~       ~-_ ~-_    ~\\            ~~--__-----_    \\
;    / \\ ______-----\\           ~-__~-~~~~~~--_             ~~--_ \\    .
|   | \\((*)~~~~~~~~~~|      __--~~             ~-_               ) |   |
|    \\  |~|~---------)__--~~                      \\_____________/ /    ,
 \\    ~-----~    /  /~                             )  \\    ~-----~    /
  ~-_         _-~ /_______________________________/    \`-_         _-~
     ~ ----- ~                                            ~ ----- ~`;

export const COURIER_ART = ` ██████╗ ██████╗ ██╗   ██╗██████╗ ██╗███████╗██████╗ 
██╔════╝██╔═══██╗██║   ██║██╔══██╗██║██╔════╝██╔══██╗
██║     ██║   ██║██║   ██║██████╔╝██║█████╗  ██████╔╝
██║     ██║   ██║██║   ██║██╔══██╗██║██╔══╝  ██╔══██╗
╚██████╗╚██████╔╝╚██████╔╝██║  ██║██║███████╗██║  ██║
 ╚═════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═╝
              CLI Version 1.0.0`;

export const FRAMEWORK_COLORS: Record<Framework, string> = {
  react: 'text-cyan-400',
  vue: 'text-emerald-400',
  svelte: 'text-orange-400',
};
