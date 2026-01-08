import { supabase } from '@/lib/supabase';
import { Users, Plus } from 'lucide-react';
import Link from 'next/link';

interface Person {
  id: string;
  name: string;
  birthday: string;
  profile_photo?: string;
  bio?: string;
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

function formatBirthday(birthday: string): string {
  const date = new Date(birthday);
  return date.toLocaleDateString('el-GR', { 
    day: 'numeric', 
    month: 'long'
  });
}

export default async function PeoplePage() {
  const people = await getPeople();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-peach-500 p-3 rounded-full">
          <Users className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-warm-800">
            Άνθρωποι
          </h1>
          <p className="text-warm-600">
            Η παρέα μας ({people.length} άτομα)
          </p>
        </div>
      </div>

      {/* People Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {people.map((person) => (
          <Link
            key={person.id}
            href={`/people/${person.id}`}
            className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all transform hover:scale-[1.02]"
          >
            {/* Profile Photo */}
            <div className="aspect-square bg-gradient-to-br from-peach-100 to-warm-100 relative">
              {person.profile_photo ? (
                <img
                  src={person.profile_photo}
                  alt={person.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl font-bold text-peach-500">
                    {person.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="text-xl font-bold text-warm-800 dark:text-gray-100 mb-1">
                {person.name}
              </h3>
              <p className="text-warm-600 dark:text-gray-300 text-sm mb-2">
                🎂 {formatBirthday(person.birthday)}
              </p>
              {person.bio && (
                <p className="text-warm-700 dark:text-gray-200 text-sm line-clamp-2">
                  {person.bio}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {people.length === 0 && (
        <div className="text-center py-16">
          <p className="text-warm-600 text-lg mb-4">
            Δεν υπάρχουν άτομα ακόμα
          </p>
          <Link
            href="/people/new"
            className="inline-flex items-center gap-2 bg-peach-500 hover:bg-peach-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Πρόσθεσε το πρώτο άτομο
          </Link>
        </div>
      )}
    </div>
  );
}
