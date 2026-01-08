import { supabase } from '@/lib/supabase';
import { Cake, PartyPopper, Calendar } from 'lucide-react';
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
  time?: string;
  place?: string;
  details?: string;
}

async function getPeople(): Promise<Person[]> {
  const { data, error } = await supabase
    .from('people')
    .select('id, name, birthday, profile_photo')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Error fetching people:', error);
    return [];
  }
  
  return data || [];
}

async function getEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: true });
  
  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }
  
  return data || [];
}

function getTodaysBirthdays(people: Person[]): Person[] {
  const today = new Date();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  return people.filter(person => {
    const birthday = new Date(person.birthday);
    return birthday.getMonth() === todayMonth && birthday.getDate() === todayDay;
  });
}

function getTodaysEvents(events: Event[]): Event[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return events.filter(event => {
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    return today >= startDate && today <= endDate;
  });
}

function getRelevantEvents(events: Event[]): { current: Event[], recent: Event[] } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const current: Event[] = [];
  const recent: Event[] = [];

  events.forEach(event => {
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    // Current or upcoming events
    if (endDate >= now) {
      current.push(event);
    }
    // Recent past events (ended within last 2 days)
    else if (endDate >= twoDaysAgo && endDate < now) {
      recent.push(event);
    }
  });

  return { current, recent };
}

export default async function Home() {
  const people = await getPeople();
  const events = await getEvents();
  
  const todaysBirthdays = getTodaysBirthdays(people);
  const { current: upcomingEvents, recent: recentEvents } = getRelevantEvents(events);
  const todaysEvents = getTodaysEvents(events);

  return (
    <div className="min-h-[70vh] space-y-8">
      {/* Today's Birthdays */}
      {todaysBirthdays.length > 0 && (
        <div className="bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900 dark:to-purple-900 rounded-2xl p-6 md:p-8 shadow-lg border-2 border-pink-300 dark:border-pink-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-3 rounded-full">
              <Cake className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
              Σήμερα έχουν γενέθλια! 🎂
            </h2>
          </div>
          
          <div className="space-y-4">
            {todaysBirthdays.map((person) => (
              <Link
                key={person.id}
                href={`/people/${person.id}`}
                className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-xl transition-all"
              >
                {person.profile_photo ? (
                  <img
                    src={person.profile_photo}
                    alt={person.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-pink-300 flex items-center justify-center">
                    <span className="text-2xl font-bold text-pink-700">
                      {person.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{person.name}</h3>
                  <p className="text-gray-600 dark:text-gray-300">Χρόνια Πολλά! 🎉</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Today's Events */}
      {todaysEvents.length > 0 && (
        <div className="bg-gradient-to-r from-purple-100 to-orange-100 dark:from-purple-900 dark:to-orange-900 rounded-2xl p-6 md:p-8 shadow-lg border-2 border-purple-300 dark:border-purple-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-purple-600 to-orange-500 p-3 rounded-full">
              <PartyPopper className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
              Σημερινά Events 🎊
            </h2>
          </div>
          
          <div className="space-y-4">
            {todaysEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="block bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-md hover:shadow-xl transition-all"
              >
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{event.title}</h3>
                
                {event.time && (
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    🕒 {event.time}
                  </p>
                )}
                
                {event.place && (
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    📍 {event.place}
                  </p>
                )}
                
                {event.details && (
                  <p className="text-gray-700 dark:text-gray-200 text-sm">
                    {event.details}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && todaysEvents.length === 0 && (
        <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-2xl p-6 md:p-8 shadow-lg border-2 border-blue-300 dark:border-blue-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
              Επόμενα Events 📅
            </h2>
          </div>
          
          <div className="space-y-4">
            {upcomingEvents.slice(0, 3).map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="block bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-md hover:shadow-xl transition-all"
              >
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{event.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  📅 {new Date(event.start_date).toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                {event.time && (
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    🕒 {event.time}
                  </p>
                )}
                {event.place && (
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    📍 {event.place}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Past Events (for photo uploads) */}
      {recentEvents.length > 0 && (
        <div className="bg-gradient-to-r from-orange-100 to-pink-100 dark:from-orange-900 dark:to-pink-900 rounded-2xl p-6 md:p-8 shadow-lg border-2 border-orange-300 dark:border-orange-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-orange-600 to-pink-600 p-3 rounded-full">
              <PartyPopper className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
              Πρόσφατα Events - Πρόσθεσε Φωτογραφίες! 📸
            </h2>
          </div>
          
          <div className="space-y-4">
            {recentEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="block bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-md hover:shadow-xl transition-all"
              >
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{event.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  📅 {new Date(event.start_date).toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                {event.place && (
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    📍 {event.place}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* No events today */}
      {todaysBirthdays.length === 0 && todaysEvents.length === 0 && upcomingEvents.length === 0 && recentEvents.length === 0 && (
        <div className="text-center py-16">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-md inline-block">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              Καμία ειδική μέρα σήμερα
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Δεν υπάρχουν γενέθλια ή events για σήμερα
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
