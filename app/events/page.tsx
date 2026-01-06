'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PartyPopper, Plus, Calendar as CalIcon, Upload, Trash2, Edit2, Save, X } from 'lucide-react';
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

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [photos, setPhotos] = useState<Record<string, Photo[]>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    start_date: '',
    end_date: '',
    time: '',
    place: '',
    details: '',
  });
  const [editData, setEditData] = useState({
    title: '',
    start_date: '',
    end_date: '',
    time: '',
    place: '',
    details: '',
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
    } else {
      setEvents(data || []);
      
      data?.forEach(event => {
        fetchEventPhotos(event.id);
      });
    }
    setLoading(false);
  };

  const fetchEventPhotos = async (eventId: string) => {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching event photos:', error);
    } else {
      setPhotos(prev => ({ ...prev, [eventId]: data || [] }));
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    // If end_date is not provided, use start_date
    const eventData = {
      ...formData,
      end_date: formData.end_date || formData.start_date,
    };

    const startDate = new Date(eventData.start_date);
    const endDate = new Date(eventData.end_date);
    
    if (endDate < startDate) {
      alert('Η ημερομηνία λήξης δεν μπορεί να είναι πριν την ημερομηνία έναρξης');
      return;
    }

    const { data, error} = await supabase
      .from('events')
      .insert([eventData])
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      alert('Σφάλμα κατά τη δημιουργία του event');
    } else {
      setEvents(prev => [data, ...prev]);
      setFormData({ title: '', start_date: '', end_date: '', time: '', place: '', details: '' });
      setShowCreateForm(false);
    }
  };

  const handleEditEvent = async (eventId: string) => {
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
      setEvents(prev =>
        prev.map(event =>
          event.id === eventId
            ? { ...event, ...editData }
            : event
        )
      );
      setEditingEventId(null);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
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
      setEvents(prev => prev.filter(event => event.id !== eventId));
    }
  };

  const handleUploadPhoto = (eventId: string) => {
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
          } else {
            fetchEventPhotos(eventId);
          }
        }
      }
    );

    widget.open();
  };

  const handleDeletePhoto = async (photoId: string, eventId: string) => {
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
      fetchEventPhotos(eventId);
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

  const isUpcoming = (endDate: string) => {
    const eventEnd = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventEnd.setHours(0, 0, 0, 0);
    return eventEnd >= today;
  };

  const upcomingEvents = events.filter(e => isUpcoming(e.end_date));
  const pastEvents = events.filter(e => !isUpcoming(e.end_date));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-gray-600 dark:text-gray-300">Φόρτωση...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-3 rounded-full">
            <PartyPopper className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">
              Events
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Τα γεγονότα της παρέας μας
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-6 py-3 rounded-lg transition-all shadow-md"
        >
          <Plus className="w-5 h-5" />
          Νέο Event
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateEvent}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md space-y-4"
        >
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            Δημιουργία Event
          </h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Τίτλος *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-purple-400 focus:outline-none transition-colors bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              placeholder="π.χ. Κρασιά"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Από *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-purple-400 focus:outline-none transition-colors bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Έως (προαιρετικό)
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                min={formData.start_date}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-purple-400 focus:outline-none transition-colors bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                placeholder="Άδειασε για ημερήσιο event"
              />
              <p className="text-sm text-gray-500 mt-1">
                Άφησε κενό αν το event είναι μία μέρα
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Ώρα (προαιρετικό)
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-purple-400 focus:outline-none transition-colors bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Τοποθεσία (προαιρετικό)
              </label>
              <input
                type="text"
                value={formData.place}
                onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-purple-400 focus:outline-none transition-colors bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                placeholder="π.χ. Αερικό"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Λεπτομέρειες
            </label>
            <textarea
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-purple-400 focus:outline-none transition-colors resize-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              placeholder="π.χ. Οι ρετσίνες Γεωργιάδη είναι φίλοι μας."
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 rounded-lg transition-all"
            >
              Δημιουργία
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setFormData({ title: '', start_date: '', end_date: '', time: '', place: '', details: '' });
              }}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition-colors"
            >
              Ακύρωση
            </button>
          </div>
        </form>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            Προσεχή Events 🎊
          </h2>
          <div className="space-y-6">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-2xl p-6 shadow-md"
              >
                {editingEventId === event.id ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editData.title}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-purple-400 focus:outline-none text-xl font-bold bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="date"
                        value={editData.start_date}
                        onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                      />
                      <input
                        type="date"
                        value={editData.end_date}
                        onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="time"
                        value={editData.time}
                        onChange={(e) => setEditData({ ...editData, time: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                        placeholder="Ώρα"
                      />
                      <input
                        type="text"
                        value={editData.place}
                        onChange={(e) => setEditData({ ...editData, place: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                        placeholder="Τοποθεσία"
                      />
                    </div>
                    <textarea
                      value={editData.details}
                      onChange={(e) => setEditData({ ...editData, details: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-purple-400 focus:outline-none resize-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditEvent(event.id)}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-4 py-2 rounded-lg transition-all"
                      >
                        <Save className="w-4 h-4" />
                        Αποθήκευση
                      </button>
                      <button
                        onClick={() => setEditingEventId(null)}
                        className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Ακύρωση
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <Link href={`/events/${event.id}`}>
                          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2 hover:text-purple-600 transition-colors cursor-pointer">
                            {event.title}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-2">
                          <CalIcon className="w-4 h-4" />
                          <span>{formatDateRange(event.start_date, event.end_date)}</span>
                        </div>
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
                          <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                            {event.details}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingEventId(event.id);
                            setEditData({
                              title: event.title,
                              start_date: event.start_date,
                              end_date: event.end_date,
                              time: event.time || '',
                              place: event.place || '',
                              details: event.details || '',
                            });
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-5 h-5 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5 text-red-500" />
                        </button>
                      </div>
                    </div>

                    {/* Photos */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-100">
                          Φωτογραφίες ({photos[event.id]?.length || 0})
                        </h4>
                        <button
                          onClick={() => handleUploadPhoto(event.id)}
                          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-4 py-2 rounded-lg transition-all text-sm"
                        >
                          <Upload className="w-4 h-4" />
                          Ανέβασμα
                        </button>
                      </div>

                      {photos[event.id]?.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {photos[event.id].map((photo) => (
                            <div
                              key={photo.id}
                              className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100"
                            >
                              <img
                                src={photo.url}
                                alt="Event photo"
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => window.open(photo.url, '_blank')}
                              />
                              <button
                                onClick={() => handleDeletePhoto(photo.id, event.id)}
                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-md"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-600 dark:text-gray-300 text-sm text-center py-4">
                          Δεν υπάρχουν φωτογραφίες ακόμα
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            Παρελθόντα Events 📚
          </h2>
          <div className="space-y-6">
            {pastEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-2xl p-6 shadow-md"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Link href={`/events/${event.id}`}>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2 hover:text-purple-600 transition-colors cursor-pointer">
                        {event.title}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-2">
                      <CalIcon className="w-4 h-4" />
                      <span>{formatDateRange(event.start_date, event.end_date)}</span>
                    </div>
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
                      <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap text-sm">
                        {event.details}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingEventId(event.id);
                        setEditData({
                          title: event.title,
                          start_date: event.start_date,
                          end_date: event.end_date,
                          time: event.time || '',
                          place: event.place || '',
                          details: event.details || '',
                        });
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </button>
                  </div>
                </div>

                {photos[event.id]?.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    {photos[event.id].slice(0, 4).map((photo) => (
                      <div
                        key={photo.id}
                        className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100"
                      >
                        <img
                          src={photo.url}
                          alt="Event photo"
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => window.open(photo.url, '_blank')}
                        />
                        <button
                          onClick={() => handleDeletePhoto(photo.id, event.id)}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-600 dark:text-gray-300 text-lg mb-4">
            Δεν υπάρχουν events ακόμα
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-6 py-3 rounded-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Δημιούργησε το πρώτο event
          </button>
        </div>
      )}
    </div>
  );
}
