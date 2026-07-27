// Design tokens per IMPLEMENTATION_SPEC.md §3.
// Flagged there as a starting point for visual design validation, not final —
// concrete enough to build against for Phase 1 scaffolding.

export const colors = {
  ivory: '#FAF6EE',
  graphite: '#26272B',
  graphite60: 'rgba(38, 39, 43, 0.6)',
  brass: '#A8813F',
  aluminum: '#D4D6D9',
} as const;

export const typography = {
  hero: { size: 34, weight: '700' as const },
  title1: { size: 28, weight: '600' as const },
  title2: { size: 22, weight: '600' as const },
  body: { size: 17, weight: '400' as const },
  caption: { size: 14, weight: '400' as const },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

export const radii = {
  control: 8,
  card: 12,
  hero: 20,
} as const;
