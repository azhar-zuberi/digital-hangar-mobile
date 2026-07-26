import type { SFSymbol } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import { Text } from 'react-native';

type Props = {
  name: SFSymbol;
  size?: number;
  color: string;
  /** Rendered on platforms without SF Symbols support (Android, web). */
  fallback: string;
};

// Thin wrapper around expo-symbols so the nav shell can use SF Symbols per
// IMPLEMENTATION_SPEC.md §3 ("Iconography — SF Symbols, for native feel and
// zero maintenance overhead") while still rendering something reasonable on
// Android/web, where expo-symbols has no native symbol font and falls back
// to whatever `fallback` node is passed in.
export function IconSymbol({ name, size = 24, color, fallback }: Props) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      weight="regular"
      resizeMode="scaleAspectFit"
      fallback={<Text style={{ fontSize: size * 0.8, color, lineHeight: size }}>{fallback}</Text>}
      style={{ width: size, height: size }}
    />
  );
}
