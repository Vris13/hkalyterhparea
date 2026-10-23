export const WRAPPED_CONFIG = {
  startMonth: 1,
  startDay: 1,
  endMonth: 1,
  endDay: 10,
} as const;

export type WrappedEvent = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  counts_attendance?: boolean | null;
};

export type WrappedAttendance = {
  event_id: string;
  person_id: string | null;
  custom_name: string | null;
};

export type WrappedPerson = {
  id: string;
  name: string;
};

export type WrappedPhoto = {
  event_id: string;
};

export type WrappedRankedPerson = { name: string; count: number; rate: number };
export type WrappedEventHighlight = { title: string; date: string; count: number };

export type WrappedStats = {
  year: number;
  eventCount: number;
  countedEventCount: number;
  attendanceCount: number;
  eventsByMonth: Array<{ month: string; count: number }>;
  attendanceByMonth: Array<{ month: string; count: number }>;
  mostAttendedPeople: WrappedRankedPerson[];
  leastAttendedPeople: WrappedRankedPerson[];
  rankedCount: number;
  photoChampion: WrappedEventHighlight | null;
  busiestEvent: WrappedEventHighlight | null;
  busiestWeekday: { name: string; count: number } | null;
  longestEvent: { title: string; date: string; days: number } | null;
  longestStreak: { names: string[]; count: number } | null;
  perfectAttendance: string[];
  topDuo: { names: [string, string]; count: number } | null;
};

export function isWrappedSeason(date = new Date()): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const start = WRAPPED_CONFIG.startMonth * 100 + WRAPPED_CONFIG.startDay;
  const current = month * 100 + day;
  const end = WRAPPED_CONFIG.endMonth * 100 + WRAPPED_CONFIG.endDay;

  return current >= start && current <= end;
}

export function getWrappedYear(date = new Date()): number {
  return date.getFullYear() - 1;
}

function dateParts(value: string) {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return { y, m, d };
}

function formatEventDate(value: string): string {
  const { y, m, d } = dateParts(value);
  return new Intl.DateTimeFormat('el-GR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(y, m - 1, d));
}

export function buildWrappedStats(
  year: number,
  events: WrappedEvent[],
  attendances: WrappedAttendance[],
  people: WrappedPerson[],
  photos: WrappedPhoto[],
): WrappedStats {
  const yearEvents = events.filter((event) => event.start_date.startsWith(`${year}-`));
  const eventIds = new Set(yearEvents.map((event) => event.id));
  const countedEvents = new Set(
    yearEvents
      .filter((event) => event.counts_attendance !== false)
      .map((event) => event.id),
  );
  const namedPeople = new Map(people.map((person) => [person.id, person.name]));
  const yearAttendances = attendances.filter((attendance) => countedEvents.has(attendance.event_id));
  const groupAttendances = yearAttendances.filter(
    (attendance) => attendance.person_id !== null && namedPeople.has(attendance.person_id),
  );
  const monthNames = [
    'Ιανουάριος',
    'Φεβρουάριος',
    'Μάρτιος',
    'Απρίλιος',
    'Μάιος',
    'Ιούνιος',
    'Ιούλιος',
    'Αύγουστος',
    'Σεπτέμβριος',
    'Οκτώβριος',
    'Νοέμβριος',
    'Δεκέμβριος',
  ];
  const eventsByMonth = monthNames.map((month, index) => ({
    month,
    count: yearEvents.filter((event) => Number(event.start_date.slice(5, 7)) === index + 1).length,
  }));
  const attendanceByMonth = monthNames.map((month, index) => {
    const monthEventIds = new Set(
      yearEvents
        .filter((event) => Number(event.start_date.slice(5, 7)) === index + 1)
        .map((event) => event.id),
    );
    return {
      month,
      count: yearAttendances.filter((attendance) => monthEventIds.has(attendance.event_id)).length,
    };
  });

  // Who was at which event (deduplicated per event)
  const attendeesByEvent = new Map<string, Set<string>>();
  yearAttendances.forEach((attendance) => {
    const name = attendance.person_id
      ? namedPeople.get(attendance.person_id)
      : attendance.custom_name?.trim();
    if (!name) return;
    const set = attendeesByEvent.get(attendance.event_id) || new Set<string>();
    set.add(name);
    attendeesByEvent.set(attendance.event_id, set);
  });

  const groupAttendeesByEvent = new Map<string, Set<string>>();
  groupAttendances.forEach((attendance) => {
    if (!attendance.person_id) return;
    const name = namedPeople.get(attendance.person_id);
    if (!name) return;
    const set = groupAttendeesByEvent.get(attendance.event_id) || new Set<string>();
    set.add(name);
    groupAttendeesByEvent.set(attendance.event_id, set);
  });

  const attendanceByPerson = new Map<string, number>(people.map((person) => [person.name, 0]));
  groupAttendeesByEvent.forEach((names) => {
    Array.from(names).forEach((name) => {
      attendanceByPerson.set(name, (attendanceByPerson.get(name) || 0) + 1);
    });
  });

  const countedTotal = countedEvents.size;
  const rankedPeople: WrappedRankedPerson[] = Array.from(attendanceByPerson, ([name, count]) => ({
    name,
    count,
    rate: countedTotal ? count / countedTotal : 0,
  })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'el'));

  const eventById = new Map(yearEvents.map((event) => [event.id, event]));
  const busiestEvent = Array.from(attendeesByEvent, ([eventId, names]) => {
    const event = eventById.get(eventId);
    return {
      title: event?.title || 'Άγνωστο event',
      date: event ? formatEventDate(event.start_date) : '',
      count: names.size,
    };
  }).sort((a, b) => b.count - a.count)[0] || null;

  const photoCounts = new Map<string, number>();
  photos.forEach((photo) => {
    if (eventIds.has(photo.event_id)) {
      photoCounts.set(photo.event_id, (photoCounts.get(photo.event_id) || 0) + 1);
    }
  });
  const photoChampion = Array.from(photoCounts, ([eventId, count]) => {
    const event = eventById.get(eventId);
    return {
      title: event?.title || 'Άγνωστο event',
      date: event ? formatEventDate(event.start_date) : '',
      count,
    };
  }).sort((a, b) => b.count - a.count)[0] || null;

  // Favourite weekday (Sunday = 0)
  const weekdayFormatter = new Intl.DateTimeFormat('el-GR', { weekday: 'long' });
  const weekdayNames = Array.from({ length: 7 }, (_, i) => weekdayFormatter.format(new Date(2024, 0, 7 + i)));
  const weekdayCounts = new Array<number>(7).fill(0);
  yearEvents.forEach((event) => {
    const { y, m, d } = dateParts(event.start_date);
    weekdayCounts[new Date(y, m - 1, d).getDay()] += 1;
  });
  const topWeekdayIndex = weekdayCounts.indexOf(Math.max(...weekdayCounts));
  const busiestWeekday = yearEvents.length
    ? { name: weekdayNames[topWeekdayIndex], count: weekdayCounts[topWeekdayIndex] }
    : null;

  // Longest multi-day event
  let longestEvent: WrappedStats['longestEvent'] = null;
  for (const event of yearEvents) {
    const s = dateParts(event.start_date);
    const e = dateParts(event.end_date || event.start_date);
    const days = Math.round((Date.UTC(e.y, e.m - 1, e.d) - Date.UTC(s.y, s.m - 1, s.d)) / 86400000) + 1;
    if (days >= 2 && (!longestEvent || days > longestEvent.days)) {
      longestEvent = { title: event.title, date: formatEventDate(event.start_date), days };
    }
  }

  // Longest streak of consecutive events attended
  const sortedCounted = yearEvents
    .filter((event) => countedEvents.has(event.id))
    .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.id.localeCompare(b.id));
  const run = new Map<string, number>();
  let longestStreak: WrappedStats['longestStreak'] = null;
  for (const event of sortedCounted) {
    const present = groupAttendeesByEvent.get(event.id) || new Set<string>();
    for (const name of Array.from(run.keys())) {
      if (!present.has(name)) run.set(name, 0);
    }
    for (const name of Array.from(present)) {
      const next = (run.get(name) || 0) + 1;
      run.set(name, next);
      if (!longestStreak || next > longestStreak.count) {
        longestStreak = { names: [name], count: next };
      } else if (next === longestStreak.count && !longestStreak.names.includes(name)) {
        longestStreak.names.push(name);
      }
    }
  }

  // Duo who showed up together the most
  const pairCounts = new Map<string, number>();
  groupAttendeesByEvent.forEach((names) => {
    const list = Array.from(names).sort((a, b) => a.localeCompare(b, 'el'));
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const key = `${list[i]}\u0000${list[j]}`;
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  });
  const topPair = Array.from(pairCounts, ([key, count]) => ({ key, count })).sort(
    (a, b) => b.count - a.count || a.key.localeCompare(b.key, 'el'),
  )[0];
  const topDuo = topPair
    ? { names: topPair.key.split('\u0000') as [string, string], count: topPair.count }
    : null;

  const perfectAttendance = countedTotal
    ? rankedPeople.filter((person) => person.count === countedTotal).map((person) => person.name)
    : [];

  return {
    year,
    eventCount: yearEvents.length,
    countedEventCount: countedTotal,
    attendanceCount: yearAttendances.length,
    eventsByMonth,
    attendanceByMonth,
    mostAttendedPeople: rankedPeople.length
      ? rankedPeople.filter((person) => person.count >= rankedPeople[Math.min(4, rankedPeople.length - 1)].count)
      : [],
    leastAttendedPeople: rankedPeople.length
      ? rankedPeople.filter((person) => person.count <= rankedPeople[Math.max(0, rankedPeople.length - 5)].count).reverse()
      : [],
    rankedCount: rankedPeople.length,
    photoChampion,
    busiestEvent,
    busiestWeekday,
    longestEvent,
    longestStreak,
    perfectAttendance,
    topDuo,
  };
}