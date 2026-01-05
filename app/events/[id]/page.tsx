'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar as CalIcon, Upload, Trash2, Edit2, Save, X } from 'lucide-react';
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

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching photos:', error);
    } else {
      setPhotos(data || []);
    }
  };

  const handleSave = async () => {
    if (!event) return;

    // If end_date is not provided, use start_date
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

  const handleUploadPhoto = () => {
    // @ts-ignore
    if (typeof window.cloudinary === 'undefined') {
      alert('Cloudinary widget δεν είναι διαθέσιμο.');
      return;
    }

    // @ts-ignore
    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'camera'],
        multiple: true,
        folder: 'memory-book/events',
        tags: [`event_${eventId}`],
      },
      async (error: any, result: any) => {
        if (error) {
          console.error('Upload error:', error);
          alert('Σφάλμα κατά το ανέβασμα');
          return;
        }

        if (result.event === 'success') {
          const photoUrl = result.info.secure_url;

          const { error: photoError } = await supabase
            .from('photos')
            .insert({
              url: photoUrl,
              event_id: eventId,
            });

          if (photoError) {
            console.error('Error saving photo:', photoError);
            alert('Σφάλμα κατά την αποθήκευση φωτογραφίας');
          } else {
            fetchPhotos();
          }
        }
      }
    );

    widget.open();
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
      {/* Back Button */}
      <Link
        href="/events"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Πίσω στα Events
      </Link>

      {/* Event Details Card */}
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Από *
                </label>
                <input
                  type="date"
                  value={editData.start_date}
                  onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Έως (προαιρετικό)
                </label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ώρα (προαιρετικό)
                </label>
                <input
                  type="time"
                  value={editData.time}
                  onChange={(e) => setEditData({ ...editData, time: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Τοποθεσία (προαιρετικό)
                </label>
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
                  <p className="text-gray-700 whitespace-pre-wrap text-lg">
                    {event.details}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-3 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Επεξεργασία"
                >
                  <Edit2 className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-3 hover:bg-red-100 rounded-lg transition-colors"
                  title="Διαγραφή"
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Photos Section */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Φωτογραφίες ({photos.length})
          </h2>
          <button
            onClick={handleUploadPhoto}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-6 py-3 rounded-lg transition-all shadow-md"
          >
            <Upload className="w-5 h-5" />
            Ανέβασμα Φωτογραφιών
          </button>
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
