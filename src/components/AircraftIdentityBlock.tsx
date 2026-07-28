import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../utils/tokens';

type Props = {
  registration: string;
  manufacturer: string;
  model: string;
  nickname: string | null;
};

// Aircraft identity block (issue #35), per BRAND.md §9's hierarchy
// (primary: tail number, secondary: make/model, optional: nickname) and
// IMPLEMENTATION_SPEC.md §2 item 2 / §3 typography tokens: tail number in
// Hero typography (34pt Bold, graphite), make/model in Body (17pt Regular),
// nickname in Caption (13pt Regular, graphite-60) when present. All text
// comes from the `aircraft` row passed in — no placeholder copy, per
// BRAND.md §17.
//
// Deliberately generic (no data-fetching of its own): issue #35's "Blocks"
// note calls out that Phase 5's Community aircraft cards will reuse this
// same identity block with card-sourced data, so it stays a pure display
// component rather than being wired to Home's aircraft-selection state.
export function AircraftIdentityBlock({ registration, manufacturer, model, nickname }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.registration} accessibilityRole="header">
        {registration}
      </Text>
      <Text style={styles.makeModel}>
        {manufacturer} {model}
      </Text>
      {nickname ? <Text style={styles.nickname}>&quot;{nickname}&quot;</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  registration: {
    fontSize: typography.hero.size,
    fontWeight: typography.hero.weight,
    color: colors.graphite,
  },
  makeModel: {
    marginTop: spacing.xs,
    fontSize: typography.body.size,
    fontWeight: typography.body.weight,
    color: colors.graphite,
  },
  nickname: {
    marginTop: spacing.xs,
    fontSize: typography.caption.size,
    fontWeight: typography.caption.weight,
    color: colors.graphite60,
  },
});
