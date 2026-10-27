import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useColors } from './theme';
import { Icon } from './icons';
import { radii, shadows, spacing } from './tokens';
import { AppText } from './typography';
import {
  addMonths,
  dayKey,
  formatLongDate,
  formatMonthYear,
  formatWeekdayNarrow,
  isSameDay,
  isSameMonth,
  monthGrid,
  startOfDay,
  weekDays,
} from '@/core/dates';

interface CalendarMonthProps {
  month: Date;
  selected: Date;
  onSelect: (date: Date) => void;
  onChangeMonth: (month: Date) => void;
  eventDates?: Date[];
}

/**
 * Full-month calendar. Six fixed weeks keep the panel height stable while
 * moving between months. Selected day is ink; today is an outline; a dot
 * marks a day with commitments.
 */
export function CalendarMonth({
  month,
  selected,
  onSelect,
  onChangeMonth,
  eventDates = [],
}: CalendarMonthProps) {
  const colors = useColors();
  const cells = monthGrid(month);
  const today = startOfDay(new Date());
  const eventKeys = new Set(eventDates.map((date) => dayKey(new Date(date))));
  const weekdays = weekDays(month).map(formatWeekdayNarrow);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, ...shadows.subtle },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={8}
          onPress={() => onChangeMonth(addMonths(month, -1))}
          style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
        >
          <Icon name="chevronLeft" size={18} color={colors.textSecondary} />
        </Pressable>
        <AppText variant="h2">{formatMonthYear(month)}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={8}
          onPress={() => onChangeMonth(addMonths(month, 1))}
          style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
        >
          <Icon name="chevronRight" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.weekdays}>
        {weekdays.map((label, index) => (
          <AppText
            key={`${label}-${index}`}
            variant="caption"
            tone="muted"
            style={styles.weekday}
          >
            {label}
          </AppText>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day) => {
          const active = isSameDay(day, selected);
          const isToday = isSameDay(day, today);
          const inMonth = isSameMonth(day, month);
          const hasEvent = eventKeys.has(dayKey(day));

          return (
            <Pressable
              key={dayKey(day)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${formatLongDate(day)}${hasEvent ? ', has commitments' : ''}`}
              onPress={() => onSelect(day)}
              style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
            >
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
                    {
                      color: active
                        ? colors.textInverse
                        : inMonth
                          ? colors.textPrimary
                          : colors.textMuted,
                    },
                  ]}
                >
                  {day.getDate()}
                </AppText>
              </View>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: active
                      ? colors.textPrimary
                      : hasEvent && inMonth
                        ? colors.textSecondary
                        : 'transparent',
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to today"
          onPress={() => {
            onSelect(today);
            onChangeMonth(new Date(today.getFullYear(), today.getMonth(), 1));
          }}
          style={({ pressed }) => [styles.todayButton, pressed && styles.pressed]}
        >
          <Icon name="target" size={14} color={colors.textSecondary} />
          <AppText variant="caption" tone="secondary">
            Today
          </AppText>
        </Pressable>
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: colors.textSecondary }]} />
          <AppText variant="caption" tone="muted">
            Commitments
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdays: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontSize: 14,
    lineHeight: 18,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  pressed: {
    opacity: 0.55,
  },
});
