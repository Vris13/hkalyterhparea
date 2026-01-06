'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar as CalIcon, Upload, Trash2, Edit2, Save, X, UserCheck } from 'lucide-react';
import Link from 'next/link';

interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  time?: string;
  place?: string;
  details?: string;
  created_at: string;
}

interface Photo {
  id: string;
  url: string;
  created_at: string;
}

interface Person {
  id: string;
  name: string;
}

interface RSVP {
  id: string;
  event_id: string;
  person_id: string | null;
  custom_name?: string;
  response: 'Ναι' | 'Όχι' | 'Μπορεί' | 'Θα αργήσω';
  person?: Person;
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [rsvps, setRSVPs] = useState<RSVP[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [selectedResponse, setSelectedResponse] = useState<'Ναι' | 'Όχι' | 'Μπορεί' | 'Θα αργήσω'>('Ναι');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    start_date: '',
    end_date: '',
    time: '',
    place: '',
    details: '',
  });

  useEffect(() => {
    fetchEvent();
    fetchPhotos();
    fetchPeople();
    fetchRSVPs();
  }, [eventId]);

  const fetchEvent = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      console.error('Error fetching event:', error);
      router.push('/events');
    } else {
      setEvent(data);
      setEditData({
        title: data.title,
        start_date: data.start_date,
        end_date: data.end_date,
        time: data.time || '',
        place: data.place || '',
        details: data.details || '',
      });
    }
    setLoading(false);
  };

  const fetchPhotos = async () => {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false});

    if (error) {
      console.error('Error fetching photos:', error);
    } else {
      setPhotos(data || []);
    }
  };

  const fetchPeople = async () => {
    const { data, error } = await supabase
      .from('people')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching people:', error);
    } else {
      setPeople(data || []);
    }
  };

  const fetchRSVPs = async () => {
    const { data, error } = await supabase
      .from('event_rsvps')
      .select('*, people(id, name)')
      .eq('event_id', eventId);

    if (error) {
      console.error('Error fetching RSVPs:', error);
    } else {
      const transformedData = (data || []).map(item => ({
        id: item.id,
        event_id: item.event_id,
        person_id: item.person_id,
        custom_name: item.custom_name,
        response: item.response,
        person: Array.isArray(item.people) ? item.people[0] : item.people
      }));
      setRSVPs(transformedData as RSVP[]);
    }
  };

  const handleAddRSVP = async () => {
    if (!selectedPersonId && !customName.trim()) {
      alert('Επέλεξε ένα άτομο ή γράψε ένα όνομα');
      return;
    }

    if (customName.trim()) {
      const existingCustomRSVP = rsvps.find(r => r.custom_name?.toLowerCase() === customName.trim().toLowerCase());
      
      if (existingCustomRSVP) {
        const { error } = await supabase
          .from('event_rsvps')
          .update({ response: selectedResponse })
          .eq('id', existingCustomRSVP.id);

        if (error) {
          console.error('Error updating RSVP:', error);
          alert('Σφάλμα κατά την ενημέρωση');
        } else {
          fetchRSVPs();
          setCustomName('');
        }
        return;
      }

      const { error } = await supabase
        .from('event_rsvps')
        .insert({
          event_id: eventId,
          custom_name: customName.trim(),
          response: selectedResponse,
        });

      if (error) {
        console.error('Error adding RSVP:', error);
        alert('Σφάλμα κατά την προσθήκη');
      } else {
        fetchRSVPs();
        setCustomName('');
      }
      return;
    }

    const existingRSVP = rsvps.find(r => r.person_id === selectedPersonId);

    if (existingRSVP) {
      const { error } = await supabase
        .from('event_rsvps')
        .update({ response: selectedResponse })
        .eq('id', existingRSVP.id);

      if (error) {
        console.error('Error updating RSVP:', error);
        alert('Σφάλμα κατά την ενημέρωση');
      } else {
        fetchRSVPs();
        setSelectedPersonId('');
      }
    } else {
      const { error } = await supabase
        .from('event_rsvps')
        .insert({
          event_id: eventId,
          person_id: selectedPersonId,
          response: selectedResponse,
        });

      if (error) {
        console.error('Error adding RSVP:', error);
        alert('Σφάλμα κατά την προσθήκη');
      } else {
        fetchRSVPs();
        setSelectedPersonId('');
      }
    }
  };

  const handleDeleteRSVP = async (rsvpId: string) => {
    if (!confirm('Είσαι σίγουρος ότι θες να διαγράψεις αυτή την απάντηση;')) {
      return;
    }

    const { error } = await supabase
      .from('event_rsvps')
      .delete()
      .eq('id', rsvpId);

    if (error) {
      console.error('Error deleting RSVP:', error);
      alert('Σφάλμα κατά τη διαγραφή');
    } else {
      fetchRSVPs();
    }
  };

  const handleSave = async () => {
    if (!event) return;

    const eventData = {
      title: editData.title,
      start_date: editData.start_date,
      end_date: editData.end_date || editData.start_date,
      time: editData.time,
      place: editData.place,
      details: editData.details,
    };

    const startDate = new Date(eventData.start_date);
    const endDate = new Date(eventData.end_date);
    
    if (endDate < startDate) {
      alert('Η ημερομηνία λήξης δεν μπορεί να είναι πριν την ημερομηνία έναρξης');
      return;
    }

    const { error } = await supabase
      .from('events')
      .update(eventData)
      .eq('id', eventId);

    if (error) {
      console.error('Error updating event:', error);
      alert('Σφάλμα κατά την ενημέρωση');
    } else {
      setEvent({ ...event, ...eventData });
      setIsEditing(false);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      alert('Cloudinary δεν είναι διαθέσιμο.');
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'memory-book/events');
      formData.append('tags', `event_${eventId}`);

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
        const publicId = data.public_id;

        const { data: photoData, error: photoError } = await supabase
          .from('photos')
          .insert({
            url: photoUrl,
            public_id: publicId,
            event_id: eventId,
          })
          .select();

        if (photoError) {
          console.error('Error saving photo:', photoError);
          alert(`Σφάλμα κατά την αποθήκευση φωτογραφίας: ${photoError.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert('Σφάλμα κατά το ανέβασμα');
      }
    }

    fetchPhotos();
    e.target.value = '';
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Είσαι σίγουρος ότι θες να διαγράψεις αυτή τη φωτογραφία;')) {
      return;
    }

    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId);

    if (error) {
      console.error('Error deleting photo:', error);
      alert('Σφάλμα κατά τη διαγραφή');
    } else {
      fetchPhotos();
    }
  };

  const handleDelete = async () => {
    if (!confirm('Είσαι σίγουρος ότι θες να διαγράψεις αυτό το event;')) {
      return;
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Error deleting event:', error);
      alert('Σφάλμα κατά τη διαγραφή');
    } else {
      router.push('/events');
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    const startStr = startDate.toLocaleDateString('el-GR', {
      day: 'numeric',
      month: 'long',
    });
    
    const endStr = endDate.toLocaleDateString('el-GR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    
    if (start === end) {
      return endStr;
    }
    
    return `${startStr} - ${endStr}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-gray-600">Φόρτωση...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600 text-lg mb-4">Event δεν βρέθηκε</p>
        <Link
          href="/events"
          className="text-purple-600 hover:text-purple-700 font-semibold"
        >
          Επιστροφή στα Events
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Link
        href="/events"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Πίσω στα Events
      </Link>

      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md">
        {isEditing ? (
          <div className="space-y-4">
            <input
              type="text"
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-400 focus:outline-none text-2xl font-bold"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Από *</label>
                <input
                  type="date"
                  value={editData.start_date}
                  onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Έως (προαιρετικό)</label>
                <input
                  type="date"
                  value={editData.end_date}
                  onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ώρα (προαιρετικό)</label>
                <input
                  type="time"
                  value={editData.time}
                  onChange={(e) => setEditData({ ...editData, time: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Τοποθεσία (προαιρετικό)</label>
                <input
                  type="text"
                  value={editData.place}
                  onChange={(e) => setEditData({ ...editData, place: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-400 focus:outline-none"
                  placeholder="π.χ. Χανιά, Κρήτη"
                />
              </div>
            </div>
            <textarea
              value={editData.details}
              onChange={(e) => setEditData({ ...editData, details: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-400 focus:outline-none resize-none"
              placeholder="Λεπτομέρειες..."
            />
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-6 py-3 rounded-lg transition-all"
              >
                <Save className="w-5 h-5" />
                Αποθήκευση
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditData({
                    title: event.title,
                    start_date: event.start_date,
                    end_date: event.end_date,
                    time: event.time || '',
                    place: event.place || '',
                    details: event.details || '',
                  });
                }}
                className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
                Ακύρωση
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                  {event.title}
                </h1>
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <CalIcon className="w-5 h-5" />
                  <span className="text-lg">{formatDateRange(event.start_date, event.end_date)}</span>
                </div>
                {event.time && (
                  <p className="text-gray-600 text-lg mb-3">
                    🕒 {event.time}
                  </p>
                )}
                {event.place && (
                  <p className="text-gray-600 text-lg mb-3">
                    📍 {event.place}
                  </p>
                )}
                {event.details && (
                  <p className="text-gray-700 mt-4 whitespace-pre-wrap">
                    {event.details}
                  </p>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                  title="Επεξεργασία"
                >
                  <Edit2 className="w-5 h-5 text-purple-600" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                  title="Διαγραφή"
                >
                  <Trash2 className="w-5 h-5 text-red-600" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md">
        <div className="flex items-center gap-3 mb-6">
          <UserCheck className="w-6 h-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-800">
            Ποιος Έρχεται
          </h2>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Πρόσθεσε Απάντηση</h3>
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                value={selectedPersonId}
                onChange={(e) => {
                  setSelectedPersonId(e.target.value);
                  if (e.target.value && e.target.value !== 'other') setCustomName('');
                }}
                className="px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-400 focus:outline-none"
                disabled={!!customName.trim()}
              >
                <option value="">Επέλεξε άτομο...</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
                <option value="other">✨ Άλλος</option>
              </select>

              <select
                value={selectedResponse}
                onChange={(e) => setSelectedResponse(e.target.value as any)}
                className="px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-400 focus:outline-none"
              >
                <option value="Ναι">✅ Ναι</option>
                <option value="Όχι">❌ Όχι</option>
                <option value="Μπορεί">🤔 Μπορεί</option>
                <option value="Θα αργήσω">⏰ Θα αργήσω</option>
              </select>
            </div>

            {(selectedPersonId === 'other' || customName) && (
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Γράψε το όνομα (π.χ. Γιάννης +1)"
                className="px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-400 focus:outline-none"
              />
            )}

            <button
              onClick={handleAddRSVP}
              disabled={!selectedPersonId && !customName.trim()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Προσθήκη
            </button>
          </div>
        </div>

        {rsvps.length > 0 ? (
          <div className="space-y-3">
            {['Ναι', 'Μπορεί', 'Θα αργήσω', 'Όχι'].map((responseType) => {
              const filtered = rsvps.filter(r => r.response === responseType);
              if (filtered.length === 0) return null;

              const emoji = responseType === 'Ναι' ? '✅' : responseType === 'Όχι' ? '❌' : responseType === 'Μπορεί' ? '🤔' : '⏰';
              const bgColor = responseType === 'Ναι' ? 'bg-green-50 border-green-200' : responseType === 'Όχι' ? 'bg-red-50 border-red-200' : responseType === 'Μπορεί' ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200';

              return (
                <div key={responseType} className={`rounded-lg p-4 border-2 ${bgColor}`}>
                  <h4 className="font-semibold text-gray-800 mb-2">
                    {emoji} {responseType} ({filtered.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {filtered.map((rsvp) => (
                      <div
                        key={rsvp.id}
                        className="bg-white px-3 py-2 rounded-lg shadow-sm flex items-center gap-2 group"
                      >
                        <span className="text-gray-800 font-medium">
                          {rsvp.custom_name || rsvp.person?.name || 'Unknown'}
                        </span>
                        <button
                          onClick={() => handleDeleteRSVP(rsvp.id)}
                          className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-600">
              Δεν υπάρχουν απαντήσεις ακόμα
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Φωτογραφίες ({photos.length})
          </h2>
          <label className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-6 py-3 rounded-lg transition-all shadow-md cursor-pointer">
            <Upload className="w-5 h-5" />
            Ανέβασμα Φωτογραφιών
            <input
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handleUploadPhoto}
              className="hidden"
            />
          </label>
        </div>

        {photos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 shadow-md hover:shadow-xl transition-shadow"
              >
                <img
                  src={photo.url}
                  alt="Event photo"
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => window.open(photo.url, '_blank')}
                />
                <button
                  onClick={() => handleDeletePhoto(photo.id)}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Διαγραφή"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-lg mb-4">
              Δεν υπάρχουν φωτογραφίες ακόμα
            </p>
            <p className="text-gray-500 text-sm">
              Πρόσθεσε φωτογραφίες για να δημιουργήσεις αναμνήσεις από αυτό το event!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
