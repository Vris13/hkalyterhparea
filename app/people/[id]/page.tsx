'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Edit2, Save, X, Phone, Cake, Upload, Trash2 } from 'lucide-react';
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

interface Photo {
  id: string;
  url: string;
  created_at: string;
}

export default function PersonPage() {
  const router = useRouter();
  const params = useParams();
  const personId = params.id as string;
  
  const [person, setPerson] = useState<Person | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPerson, setEditedPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (personId) {
      fetchPerson();
      fetchPhotos();
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

  const fetchPhotos = async () => {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('person_id', personId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching photos:', error);
    } else {
      setPhotos(data || []);
    }
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

  const handleUploadPhoto = (isProfilePhoto: boolean = false) => {
    // @ts-ignore
    if (typeof window.cloudinary === 'undefined') {
      alert('Cloudinary widget δεν είναι διαθέσιμο. Βεβαιωθείτε ότι έχετε ρυθμίσει τις μεταβλητές περιβάλλοντος.');
      return;
    }

    // @ts-ignore
    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'camera'],
        multiple: !isProfilePhoto,
        folder: 'memory-book/people',
        tags: [`person_${personId}`],
      },
      async (error: any, result: any) => {
        if (error) {
          console.error('Upload error:', error);
          alert('Σφάλμα κατά το ανέβασμα της φωτογραφίας');
          return;
        }

        if (result.event === 'success') {
          const photoUrl = result.info.secure_url;

          // If it's a profile photo change, only update profile photo
          if (isProfilePhoto) {
            const { error: profileError } = await supabase
              .from('people')
              .update({ profile_photo: photoUrl })
              .eq('id', personId);
            
            if (profileError) {
              console.error('Error saving photo:', profileError);
              alert('Σφάλμα κατά την αποθήκευση της φωτογραφίας');
            } else {
              setPerson(prev => prev ? { ...prev, profile_photo: photoUrl } : null);
            }
          } else {
            // If this is the first photo, set as profile photo
            if (!person?.profile_photo && photos.length === 0) {
              await supabase
                .from('people')
                .update({ profile_photo: photoUrl })
                .eq('id', personId);
              
              setPerson(prev => prev ? { ...prev, profile_photo: photoUrl } : null);
            }

            // Save to photos table
            const { error: photoError } = await supabase
              .from('photos')
              .insert({
                url: photoUrl,
                person_id: personId,
              });

            if (photoError) {
              console.error('Error saving photo:', photoError);
            } else {
              fetchPhotos();
            }
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
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Photo */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-md">
            <div className="aspect-square bg-gradient-to-br from-peach-100 to-warm-100 relative group">
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
              {isEditing && (
                <button
                  onClick={() => handleUploadPhoto(true)}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div className="text-center text-white">
                    <Upload className="w-12 h-12 mx-auto mb-2" />
                    <p className="font-semibold">Αλλαγή Φωτογραφίας</p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-white rounded-2xl p-6 shadow-md space-y-4">
            {!isEditing ? (
              <>
                <div className="flex items-start gap-3">
                  <Cake className="w-5 h-5 text-peach-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-warm-600 mb-1">Γενέθλια</p>
                    <p className="font-semibold text-warm-800">
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
                        className="font-semibold text-warm-800 hover:text-peach-600"
                      >
                        {person.phone}
                      </a>
                    </div>
                  </div>
                )}

                {person.bio && (
                  <div>
                    <p className="text-sm text-warm-600 mb-2">Βιογραφικό</p>
                    <p className="text-warm-800 whitespace-pre-wrap">
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
                    className="w-full px-4 py-2 rounded-lg border-2 border-warm-200 focus:border-peach-400 focus:outline-none"
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
                    className="w-full px-4 py-2 rounded-lg border-2 border-warm-200 focus:border-peach-400 focus:outline-none"
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
                    className="w-full px-4 py-2 rounded-lg border-2 border-warm-200 focus:border-peach-400 focus:outline-none"
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
                    className="w-full px-4 py-2 rounded-lg border-2 border-warm-200 focus:border-peach-400 focus:outline-none resize-none"
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

        {/* Right Column - Photo Gallery */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-warm-800">
                Φωτογραφίες ({photos.length})
              </h2>
              <button
                onClick={() => handleUploadPhoto(false)}
                className="flex items-center gap-2 bg-peach-500 hover:bg-peach-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                Ανέβασμα
              </button>
            </div>

            {photos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative group aspect-square rounded-lg overflow-hidden bg-warm-100"
                  >
                    <img
                      src={photo.url}
                      alt="Photo"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-warm-600 mb-4">
                  Δεν υπάρχουν φωτογραφίες ακόμα
                </p>
                <button
                  onClick={() => handleUploadPhoto(false)}
                  className="inline-flex items-center gap-2 bg-peach-500 hover:bg-peach-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  Ανέβασε την πρώτη φωτογραφία
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
