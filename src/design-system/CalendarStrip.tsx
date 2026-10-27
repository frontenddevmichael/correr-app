import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useColors } from './theme';
import { Icon } from './icons';
import { radii, spacing } from './tokens';
import { AppText } from './typography';
import {
  addDays,
  dayKey,
  formatLongDate,
  formatMonthYear,
  formatWeekdayNarrow,
  isSameDay,
  isSameMonth,
  startOfDay,
  weekDays,
} from '@/core/dates';

interface CalendarStripProps {
  selected: Date;
  onSelect: (date: Date) => void;
  eventDates?: Date[];
  onOpenCalendar: () => void;
}

/**
 * Short week calendar — the reference's date strip, adapted to Ink & Paper.
 *
 * The selected day is a solid ink disc; today keeps a hairline ring; a small
 * dot marks a day with commitments. Selecting a day filters the agenda below.
 */
export function CalendarStrip({
  selected,
  onSelect,
  eventDates = [],
  onOpenCalendar,
}: CalendarStripProps) {
  const colors = useColors();
  const days = weekDays(selected);
  const today = startOfDay(new Date());
  const eventKeys = new Set(eventDates.map((date) => dayKey(new Date(date))));

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surfaceSunken },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.monthNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous week"
            hitSlop={8}
            onPress={() => onSelect(addDays(selected, -7))}
            style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
          >
            <Icon name="chevronLeft" size={16} color={colors.textSecondary} />
          </Pressable>
          <AppText variant="h3">{formatMonthYear(selected)}</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next week"
            hitSlop={8}
            onPress={() => onSelect(addDays(selected, 7))}
            style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
          >
            <Icon name="chevronRight" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open full calendar"
          hitSlop={6}
          onPress={onOpenCalendar}
          style={({ pressed }) => [styles.open, pressed && styles.pressed]}
        >
          <Icon name="calendar" size={15} color={colors.textSecondary} />
          <AppText variant="caption" tone="secondary">
            Calendar
          </AppText>
        </Pressable>
      </View>

      <View style={styles.days}>
        {days.map((day) => {
          const active = isSameDay(day, selected);
          const isToday = isSameDay(day, today);
          const inMonth = isSameMonth(day, selected);
          const hasEvent = eventKeys.has(dayKey(day));

          return (
            <Pressable
              key={dayKey(day)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${formatLongDate(day)}${hasEvent ? ', has commitments' : ''}`}
              onPress={() => onSelect(day)}
              style={({ pressed }) => [styles.day, pressed && styles.pressed]}
            >
              <AppText
                variant="caption"
                tone={inMonth ? 'muted' : 'muted'}
                style={[styles.weekday, !inMonth && styles.outside]}
              >
                {formatWeekdayNarrow(day)}
              </AppText>
              <View
                style={[
                  styles.dayCircle,
                  isToday && !active && { borderColor: colors.textPrimary },
                  active && { backgroundColor: colors.textPrimary },
                ]}
              >
                <AppText
                  variant="bodyMedium"
                  style={[
                    styles.dayNumber,
                    { color: active ? colors.textInverse : colors.textPrimary },
                    !inMonth && !active && { color: colors.textMuted },
                  ]}
                >
                  {day.getDate()}
                </AppText>
              </View>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: hasEvent ? colors.textPrimary : 'transparent',
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  arrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  open: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
  },
  days: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
  },
  weekday: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  outside: {
    opacity: 0.4,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontSize: 15,
    lineHeight: 20,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  pressed: {
    opacity: 0.55,
  },
});
