import { supabase } from '@/lib/supabase';
import { Calendar as CalendarIcon } from 'lucide-react';
import CalendarGrid from '@/components/CalendarGrid';

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

async function getPeople(): Promise<Person[]> {
  const { data, error } = await supabase
    .from('people')
    .select('*')
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

export default async function CalendarPage() {
  const people = await getPeople();
  const events = await getEvents();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-3 rounded-full">
          <CalendarIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
            Ημερολόγιο
          </h1>
          <p className="text-gray-600">
            Όλα τα events και γενέθλια της παρέας
          </p>
        </div>
      </div>

      {/* Calendar Grid */}
      <CalendarGrid people={people} events={events} />
    </div>
  );
}
