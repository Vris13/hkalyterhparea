'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Person {
  id: string;
  name: string;
  birthday: string;
  profile_photo?: string;
}

interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  details?: string;
}

interface CalendarGridProps {
  people: Person[];
  events: Event[];
}

const MONTHS_GR = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
  'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
];

const DAYS_GR = ['Δ', 'Τ', 'Τ', 'Π', 'Π', 'Σ', 'Κ'];

export default function CalendarGrid({ people, events }: CalendarGridProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const adjustedStartDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const isDateInRange = (date: Date, start: string, end: string): boolean => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);
    return checkDate >= startDate && checkDate <= endDate;
  };

  const getEventsForDate = (day: number) => {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayEvents = events.filter(event => 
      isDateInRange(date, event.start_date, event.end_date)
    );

    const dayBirthdays = people.filter(person => {
      const birthday = new Date(person.birthday);
      return birthday.getMonth() === month && birthday.getDate() === day;
    });

    return { events: dayEvents, birthdays: dayBirthdays };
  };

  const getEventColor = (event: Event, date: Date) => {
    const colors = [
      'bg-pink-400',
      'bg-purple-400', 
      'bg-blue-400',
      'bg-cyan-400',
      'bg-orange-400',
      'bg-green-400'
    ];
    
    // Use event id to consistently assign color
    const hash = event.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && 
           today.getMonth() === month && 
           today.getFullYear() === year;
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < adjustedStartDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="min-h-[100px] bg-gray-50 dark:bg-gray-900"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const { events: dayEvents, birthdays } = getEventsForDate(day);
      const today = isToday(day);

      days.push(
        <div
          key={day}
          className={`min-h-[100px] p-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${
            today ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          <div className={`text-sm font-semibold mb-1 ${
            today ? 'bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center' : 'text-gray-700 dark:text-gray-200'
          }`}>
            {day}
          </div>
          
          <div className="space-y-1">
            {/* Birthdays */}
            {birthdays.map((person) => (
              <Link
                key={person.id}
                href={`/people/${person.id}`}
                className="block text-xs px-2 py-1 bg-pink-400 text-white rounded truncate hover:bg-pink-500 transition-colors"
              >
                🎂 {person.name}
              </Link>
            ))}

            {/* Events */}
            {dayEvents.slice(0, 3).map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className={`block text-xs px-2 py-1 ${getEventColor(event, new Date(year, month, day))} text-white rounded truncate hover:opacity-80 transition-opacity`}
              >
                {event.title}
              </Link>
            ))}

            {/* Show +X if more events */}
            {dayEvents.length + birthdays.length > 3 && (
              <div className="text-xs text-gray-500 px-2">
                +{dayEvents.length + birthdays.length - 3}
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={previousMonth}
          className="p-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {MONTHS_GR[month]} {year}
        </h2>
        
        <button
          onClick={nextMonth}
          className="p-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0">
        {/* Day headers */}
        {DAYS_GR.map((day, index) => (
          <div
            key={index}
            className="text-center font-semibold text-gray-600 dark:text-gray-300 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {renderCalendarDays()}
      </div>
    </div>
  );
}
