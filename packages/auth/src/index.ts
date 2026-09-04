if (typeof (globalThis as any).__dirname === 'undefined' && typeof process !== 'undefined') {
  (globalThis as any).__dirname = typeof process.cwd === 'function' ? process.cwd() : '/';
}

export * from './authActions';
export * from './authorization';
export * from './config';
export * from './types';
export * from './password';
export * from './jwt';
export * from './accountService';
export * from './characterService';
