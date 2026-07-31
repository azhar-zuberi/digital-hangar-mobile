// Design tokens per docs/brand-design-direction.md v1.1 §14 and
// IMPLEMENTATION_SPEC.md §3. v1.1 replaced the Warm Ivory / Aviation Brass /
// Aircraft Aluminum palette with Aviation Blue, Sky Blue, Cloud White, and
// Graphite — white space leads, blue anchors identity moments only.
//
// Usage split (the source doc doesn't distinguish this finely on its own):
// - aviationBlue: primary CTA buttons, nav accents (tab bar active tint),
//   sign-in/onboarding — identity moments and calls to action, per §14.
// - skyBlue: in-content active/selected states, links, loading spinners,
//   tags and highlights (e.g. milestone markers) — everything interactive
//   that isn't an identity moment or a CTA.
// - graphite12: supporting neutral for dividers, disabled states, and
//   placeholder fills. Not one of the four brand colors — v1.1 has no
//   neutral gray — derived as a low-opacity Graphite tint (same approach as
//   graphite60) so it reads as part of the same family rather than an
//   unrelated gray. Replaces the old `aluminum` token.
// - error: functional-only validation/error color for form fields. Not a
//   brand accent and deliberately not blue, which doesn't read as an error
//   state; the old palette overloaded `brass` for this.
export const colors = {
  aviationBlue: '#042C53',
  skyBlue: '#185FA5',
  cloudWhite: '#FFFFFF',
  graphite: '#2C2C2A',
  graphite60: 'rgba(44, 44, 42, 0.6)',
  graphite12: 'rgba(44, 44, 42, 0.12)',
  error: '#C0392B',
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
