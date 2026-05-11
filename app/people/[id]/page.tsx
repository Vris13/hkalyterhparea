'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Edit2, Save, X, Phone, Cake, Upload, Trash2, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

interface Person {
  id: string;
  name: string;
  birthday: string;
  phone?: string;
  profile_photo?: string;
  bio?: string;
}

export default function PersonPage() {
  const router = useRouter();
  const params = useParams();
  const personId = params.id as string;
  
  const [person, setPerson] = useState<Person | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPerson, setEditedPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState({ attended: 0, total: 0 });

  useEffect(() => {
    if (personId) {
      fetchPerson();
      fetchAttendanceStats();
    }
  }, [personId]);

  const fetchPerson = async () => {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .eq('id', personId)
      .single();

    if (error) {
      console.error('Error fetching person:', error);
    } else {
      setPerson(data);
      setEditedPerson(data);
    }
    setLoading(false);
  };

  const fetchAttendanceStats = async () => {
    // Get total past events (events that have already ended)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Only consider past events that are marked to count for attendance (counts_attendance = true or NULL)
    let eventsData = null;
    try {
      const res = await supabase
        .from('events')
        .select('id, end_date')
        .lt('end_date', todayStr)
        .or('counts_attendance.eq.true,counts_attendance.is.null');

      if (res.error) throw res.error;
      eventsData = res.data;
    } catch (err: any) {
      console.error('Error fetching events with counts_attendance filter (falling back):', err);
      // Fallback: fetch past events without counts_attendance filter (for DBs without the column)
      const { data, error } = await supabase
        .from('events')
        .select('id, end_date')
        .lt('end_date', todayStr);

      if (error) {
        console.error('Error fetching events:', error);
        return;
      }
      eventsData = data;
    }

    const totalEvents = eventsData?.length || 0;
    const pastEventIds = eventsData?.map(e => e.id) || [];

    // Get attendances for this person, only for past events
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('event_attendances')
      .select('event_id')
      .eq('person_id', personId)
      .in('event_id', pastEventIds.length > 0 ? pastEventIds : ['']);

    if (attendanceError) {
      console.error('Error fetching attendances:', attendanceError);
      return;
    }

    const attended = attendanceData?.length || 0;

    setAttendanceStats({ attended, total: totalEvents });
  };

  const handleSave = async () => {
    if (!editedPerson) return;

    const { error } = await supabase
      .from('people')
      .update({
        name: editedPerson.name,
        birthday: editedPerson.birthday,
        phone: editedPerson.phone,
        bio: editedPerson.bio,
      })
      .eq('id', personId);

    if (error) {
      console.error('Error updating person:', error);
      alert('Σφάλμα κατά την αποθήκευση');
    } else {
      setPerson(editedPerson);
      setIsEditing(false);
      router.refresh(); // Refresh to update the people list page
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      alert('Cloudinary δεν είναι διαθέσιμο.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'memory-book/people');
    formData.append('tags', `person_${personId}`);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const photoUrl = data.secure_url;

      const { error: profileError } = await supabase
        .from('people')
        .update({ profile_photo: photoUrl })
        .eq('id', personId);
      
      if (profileError) {
        console.error('Error saving photo:', profileError);
        alert('Σφάλμα κατά την αποθήκευση της φωτογραφίας');
      } else {
        setPerson(prev => prev ? { ...prev, profile_photo: photoUrl } : null);
        setEditedPerson(prev => prev ? { ...prev, profile_photo: photoUrl } : null);
        await fetchPerson();
        router.refresh();
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Σφάλμα κατά το ανέβασμα');
    }

    // Reset the input
    if (e.target) {
      e.target.value = '';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('el-GR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-warm-600">Φόρτωση...</div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="text-center py-16">
        <p className="text-warm-600 text-lg mb-4">Το άτομο δεν βρέθηκε</p>
        <Link
          href="/people"
          className="text-peach-600 hover:underline"
        >
          Επιστροφή στη λίστα
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/people"
          className="p-2 hover:bg-warm-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-warm-600" />
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-warm-800">
          {person.name}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Info Card - Right on Desktop, Below Photo on Mobile */}
        <div className="lg:col-span-2 order-2 lg:order-2">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md space-y-4">
            {!isEditing ? (
              <>
                <div className="flex items-start gap-3">
                  <Cake className="w-5 h-5 text-peach-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-warm-600 mb-1">Γενέθλια</p>
                    <p className="font-semibold text-warm-800 dark:text-gray-100">
                      {formatDate(person.birthday)}
                    </p>
                  </div>
                </div>

                {person.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-peach-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-warm-600 mb-1">Τηλέφωνο</p>
                      <a
                        href={`tel:${person.phone}`}
                        className="font-semibold text-warm-800 dark:text-gray-100 hover:text-peach-600"
                      >
                        {person.phone}
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <UserCheck className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-warm-600 mb-1">Παρουσίες / Απουσίες</p>
                    <p className="font-semibold text-warm-800 dark:text-gray-100">
                      <span className="text-green-600">{attendanceStats.attended}</span>
                      {' / '}
                      <span className="text-red-600">{attendanceStats.total - attendanceStats.attended}</span>
                      <span className="text-gray-600 dark:text-gray-400 text-sm ml-2">
                        ({attendanceStats.total} events συνολικά)
                      </span>
                    </p>
                    {attendanceStats.total > 0 && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div
                            className="bg-green-600 h-2.5 rounded-full"
                            style={{ width: `${(attendanceStats.attended / attendanceStats.total) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {Math.round((attendanceStats.attended / attendanceStats.total) * 100)}% συμμετοχή
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {person.bio && (
                  <div>
                    <p className="text-sm text-warm-600 mb-2">Βιογραφικό</p>
                    <p className="text-warm-800 dark:text-gray-100 whitespace-pre-wrap">
                      {person.bio}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full flex items-center justify-center gap-2 bg-warm-100 hover:bg-warm-200 text-warm-800 font-semibold py-3 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Επεξεργασία
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm text-warm-600 mb-2">
                    Όνομα
                  </label>
                  <input
                    type="text"
                    value={editedPerson?.name || ''}
                    onChange={(e) =>
                      setEditedPerson(prev => prev ? { ...prev, name: e.target.value } : null)
                    }
                    className="w-full px-4 py-2 rounded-lg border-2 border-warm-200 dark:border-gray-700 focus:border-peach-400 focus:outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm text-warm-600 mb-2">
                    Γενέθλια
                  </label>
                  <input
                    type="date"
                    value={editedPerson?.birthday || ''}
                    onChange={(e) =>
                      setEditedPerson(prev => prev ? { ...prev, birthday: e.target.value } : null)
                    }
                    className="w-full px-4 py-2 rounded-lg border-2 border-warm-200 dark:border-gray-700 focus:border-peach-400 focus:outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm text-warm-600 mb-2">
                    Τηλέφωνο
                  </label>
                  <input
                    type="tel"
                    value={editedPerson?.phone || ''}
                    onChange={(e) =>
                      setEditedPerson(prev => prev ? { ...prev, phone: e.target.value } : null)
                    }
                    className="w-full px-4 py-2 rounded-lg border-2 border-warm-200 dark:border-gray-700 focus:border-peach-400 focus:outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm text-warm-600 mb-2">
                    Βιογραφικό
                  </label>
                  <textarea
                    value={editedPerson?.bio || ''}
                    onChange={(e) =>
                      setEditedPerson(prev => prev ? { ...prev, bio: e.target.value } : null)
                    }
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border-2 border-warm-200 dark:border-gray-700 focus:border-peach-400 focus:outline-none resize-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 rounded-lg transition-all shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    Αποθήκευση
                  </button>
                  <button
                    onClick={() => {
                      setEditedPerson(person);
                      setIsEditing(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Ακύρωση
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Profile Photo - Left on Desktop, Top on Mobile */}
        <div className="lg:col-span-1 order-1 lg:order-1">
          <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md">
            <div className="aspect-square bg-gradient-to-br from-peach-100 to-warm-100 relative">
              {person.profile_photo ? (
                <img
                  src={person.profile_photo}
                  alt={person.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-8xl font-bold text-peach-500">
                    {person.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            {isEditing && (
              <div className="p-4">
                <label className="w-full flex items-center justify-center gap-2 bg-peach-100 hover:bg-peach-200 text-peach-800 font-semibold py-3 rounded-lg transition-colors cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Αλλαγή Φωτογραφίας
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadPhoto}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
