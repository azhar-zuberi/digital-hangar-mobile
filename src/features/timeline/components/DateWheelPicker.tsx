import { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../../utils/tokens';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const ROW_HEIGHT = 40;
const VISIBLE_ROWS = 5;
const OLDEST_SELECTABLE_YEARS_AGO = 100;

function daysInMonth(year: number, month: number): number {
  // Day 0 of the *next* month is the last day of `month` — a standard JS
  // Date trick, avoids a leap-year lookup table.
  return new Date(year, month + 1, 0).getDate();
}

type WheelItem = { value: number; label: string };

type WheelColumnProps = {
  label: string;
  items: WheelItem[];
  selected: number;
  onSelect: (value: number) => void;
};

// One scrollable column of a three-column (Month / Day / Year) date picker.
// Built from scratch rather than pulling in a native date-picker dependency
// (issue #36 implementation note — see AddTimelineEntryScreen.tsx's header
// comment): this is a genuinely "scrollable date picker" per the issue's
// acceptance criteria, but stays dependency-free, has no native-module jest
// mocking to set up, and renders identically via `expo start --web`, which
// most third-party native date pickers do not.
function WheelColumn({ label, items, selected, onSelect }: WheelColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = items.findIndex((item) => item.value === selected);

  useEffect(() => {
    if (selectedIndex < 0) return;
    // Center the selected row rather than scrolling it to the very top, so
    // there's visible context above and below it.
    const offset = Math.max(0, selectedIndex * ROW_HEIGHT - ROW_HEIGHT * 2);
    scrollRef.current?.scrollTo({ y: offset, animated: false });
    // Re-center only when the selected value or the item list identity
    // changes (e.g. switching months changes the day count) — not on every
    // unrelated re-render, so this doesn't fight a user mid-scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, items.length]);

  return (
    <View style={styles.column}>
      <Text style={styles.columnLabel}>{label}</Text>
      <ScrollView
        ref={scrollRef}
        style={styles.columnScroll}
        showsVerticalScrollIndicator={false}
        accessibilityRole="scrollbar"
      >
        {items.map((item) => {
          const isSelected = item.value === selected;
          return (
            <Pressable
              key={item.value}
              onPress={() => onSelect(item.value)}
              style={[styles.row, isSelected && styles.rowSelected]}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${item.label}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.rowText, isSelected && styles.rowTextSelected]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

type Props = {
  value: Date;
  onChange: (date: Date) => void;
  /** Latest selectable year — defaults to the current year. Selecting a
   * date past `maxDate` isn't blocked here (the "cannot be in the future"
   * rule is enforced as form validation with a warning, per the issue's AC
   * — "warn user if attempted" rather than making the control unable to
   * express it), only the year list's upper bound uses it. */
  maxDate?: Date;
};

/** Three-column scrollable date picker (Month / Day / Year), defaulting to
 * whichever date `value` holds. Days re-render to match the selected
 * month/year's actual day count (leap years included), clamping the
 * selected day down if it no longer exists (e.g. Mar 31 -> Apr changes day
 * to 30). */
export function DateWheelPicker({ value, onChange, maxDate }: Props) {
  const year = value.getFullYear();
  const month = value.getMonth();
  const day = value.getDate();

  const latestYear = (maxDate ?? new Date()).getFullYear();

  const years = useMemo(() => {
    const list: WheelItem[] = [];
    for (let y = latestYear; y >= latestYear - OLDEST_SELECTABLE_YEARS_AGO; y--) {
      list.push({ value: y, label: String(y) });
    }
    return list;
  }, [latestYear]);

  const months = useMemo(
    () => MONTH_NAMES.map((name, index) => ({ value: index, label: name })),
    [],
  );

  const days = useMemo(() => {
    const count = daysInMonth(year, month);
    return Array.from({ length: count }, (_, index) => ({
      value: index + 1,
      label: String(index + 1),
    }));
  }, [year, month]);

  function setPart(part: 'year' | 'month' | 'day', partValue: number) {
    const nextYear = part === 'year' ? partValue : year;
    const nextMonth = part === 'month' ? partValue : month;
    const maxDay = daysInMonth(nextYear, nextMonth);
    const nextDay = Math.min(part === 'day' ? partValue : day, maxDay);
    onChange(new Date(nextYear, nextMonth, nextDay));
  }

  return (
    <View style={styles.container}>
      <WheelColumn
        label="Month"
        items={months}
        selected={month}
        onSelect={(v) => setPart('month', v)}
      />
      <WheelColumn label="Day" items={days} selected={day} onSelect={(v) => setPart('day', v)} />
      <WheelColumn
        label="Year"
        items={years}
        selected={year}
        onSelect={(v) => setPart('year', v)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  column: {
    flex: 1,
  },
  columnLabel: {
    fontSize: typography.caption.size,
    color: colors.graphite60,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  columnScroll: {
    height: ROW_HEIGHT * VISIBLE_ROWS,
    borderWidth: 1,
    borderColor: colors.graphite12,
    borderRadius: radii.control,
    backgroundColor: colors.cloudWhite,
  },
  row: {
    height: ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowSelected: {
    backgroundColor: colors.graphite12,
  },
  rowText: {
    fontSize: typography.body.size,
    color: colors.graphite60,
  },
  rowTextSelected: {
    color: colors.graphite,
    fontWeight: '600',
  },
});
