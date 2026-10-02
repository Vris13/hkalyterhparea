'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, MapPin, Users, Pencil, Trash2, Save, X, Upload } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Memory {
  id: string;
  title: string;
  start_date: string;
  end_date?: string | null;
  place?: string | null;
  notes?: string | null;
}
interface Photo { id: string; url: string; position: number; }
interface Person { id: string; name: string; }

export default function MemoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memoryId = params.id as string;
  const [memory, setMemory] = useState<Memory | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editData, setEditData] = useState({ title: '', start_date: '', end_date: '', place: '', notes: '' });

  useEffect(() => {
    const fetchMemory = async () => {
      const [{ data: memoryData, error: memoryError }, { data: photoData, error: photoError }, { data: peopleData, error: peopleError }, { data: allPeopleData, error: allPeopleError }] = await Promise.all([
        supabase.from('memories').select('*').eq('id', memoryId).single(),
        supabase.from('memory_photos').select('*').eq('memory_id', memoryId).order('position'),
        supabase.from('memory_people').select('person_id, people(id, name)').eq('memory_id', memoryId),
        supabase.from('people').select('id, name').order('name'),
      ]);
      if (memoryError || photoError || peopleError || allPeopleError) console.error('Error fetching memory:', memoryError || photoError || peopleError || allPeopleError);

      const linkedPeople = (peopleData || []).map((item: any) => Array.isArray(item.people) ? item.people[0] : item.people).filter(Boolean) as Person[];
      const loadedPhotos = photoData || [];
      setMemory(memoryData);
      setPhotos(loadedPhotos);
      setCoverPhotoId(loadedPhotos[0]?.id || null);
      setPeople(linkedPeople);
      setSelectedPeople((peopleData || []).map((item: any) => item.person_id));
      setAllPeople(allPeopleData || []);
      if (memoryData) {
        setEditData({
          title: memoryData.title,
          start_date: memoryData.start_date,
          end_date: memoryData.end_date || '',
          place: memoryData.place || '',
          notes: memoryData.notes || '',
        });
      }
      setLoading(false);
    };
    if (memoryId) fetchMemory();
  }, [memoryId]);

  const formatDate = (value: string) => new Date(value).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' });

  const uploadPhoto = async (file: File) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) throw new Error('Cloudinary δεν είναι διαθέσιμο.');
    const body = new FormData();
    body.append('file', file);
    body.append('upload_preset', uploadPreset);
    body.append('folder', 'memory-book/memories');
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body });
    if (!response.ok) throw new Error('Η μεταφόρτωση απέτυχε');
    return (await response.json()).secure_url as string;
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(uploadPhoto));
      const newPhotos = urls.map((url, index) => ({ memory_id: memoryId, url, position: photos.length + index }));
      const { data, error } = await supabase.from('memory_photos').insert(newPhotos).select();
      if (error) throw error;
      setPhotos(previous => [...previous, ...(data || [])]);
      if (!coverPhotoId && data?.[0]) setCoverPhotoId(data[0].id);
    } catch (error: any) {
      alert(`Σφάλμα κατά την προσθήκη φωτογραφιών: ${error?.message || 'Άγνωστο σφάλμα'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (photos.length <= 1) {
      alert('Η ανάμνηση πρέπει να έχει τουλάχιστον μία φωτογραφία.');
      return;
    }
    if (!confirm('Να διαγραφεί αυτή η φωτογραφία από την ανάμνηση;')) return;
    const { error } = await supabase.from('memory_photos').delete().eq('id', photoId);
    if (error) {
      alert(`Σφάλμα κατά τη διαγραφή: ${error.message}`);
      return;
    }
    const remaining = photos.filter(photo => photo.id !== photoId);
    setPhotos(remaining);
    if (coverPhotoId === photoId) setCoverPhotoId(remaining[0]?.id || null);
  };

  const togglePerson = (personId: string) => {
    setSelectedPeople(previous => previous.includes(personId) ? previous.filter(id => id !== personId) : [...previous, personId]);
  };

  const handleSave = async () => {
    if (!memory || !editData.title.trim() || !editData.start_date || selectedPeople.length === 0 || photos.length === 0) {
      alert('Συμπλήρωσε τον τίτλο, την ημερομηνία, τουλάχιστον ένα άτομο και μία φωτογραφία.');
      return;
    }
    if (editData.end_date && editData.end_date < editData.start_date) {
      alert('Η ημερομηνία λήξης δεν μπορεί να είναι πριν την ημερομηνία έναρξης.');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('memories').update({
        title: editData.title.trim(),
        start_date: editData.start_date,
        end_date: editData.end_date || null,
        place: editData.place.trim() || null,
        notes: editData.notes.trim() || null,
      }).eq('id', memory.id).select().single();
      if (error) throw error;

      const { error: peopleDeleteError } = await supabase.from('memory_people').delete().eq('memory_id', memory.id);
      if (peopleDeleteError) throw peopleDeleteError;
      const { error: peopleInsertError } = await supabase.from('memory_people').insert(selectedPeople.map(personId => ({ memory_id: memory.id, person_id: personId })));
      if (peopleInsertError) throw peopleInsertError;

      const orderedPhotos = [
        ...photos.filter(photo => photo.id === coverPhotoId),
        ...photos.filter(photo => photo.id !== coverPhotoId),
      ];
      const { error: photoOrderError } = await Promise.all(orderedPhotos.map((photo, position) =>
        supabase.from('memory_photos').update({ position }).eq('id', photo.id)
      )).then(results => ({ error: results.find(result => result.error)?.error || null }));
      if (photoOrderError) throw photoOrderError;

      setMemory(data);
      setPhotos(orderedPhotos.map((photo, position) => ({ ...photo, position })));
      setPeople(allPeople.filter(person => selectedPeople.includes(person.id)));
      setIsEditing(false);
    } catch (error: any) {
      alert(`Σφάλμα κατά την αποθήκευση: ${error?.message || 'Άγνωστο σφάλμα'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Να διαγραφεί οριστικά αυτή η ανάμνηση;')) return;
    const { error } = await supabase.from('memories').delete().eq('id', memoryId);
    if (error) {
      alert(`Σφάλμα κατά τη διαγραφή: ${error.message}`);
      return;
    }
    router.push(people[0] ? `/people/${people[0].id}` : '/people');
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-pulse text-warm-600">Φόρτωση...</div></div>;
  if (!memory) return <div className="text-center py-16 text-warm-600">Η ανάμνηση δεν βρέθηκε.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4"><Link href={people[0] ? `/people/${people[0].id}` : '/people'} className="p-2 hover:bg-warm-100 rounded-lg"><ArrowLeft className="w-6 h-6 text-warm-600" /></Link><h1 className="text-3xl md:text-4xl font-bold text-warm-800">{memory.title}</h1></div>
        <div className="flex items-center gap-2"><button type="button" onClick={() => setIsEditing(true)} className="memory-edit-action"><Pencil className="w-4 h-4" />Επεξεργασία</button><button type="button" onClick={handleDelete} className="memory-delete-action"><Trash2 className="w-4 h-4" />Διαγραφή</button></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">{photos.map(photo => <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-xl bg-warm-100"><img src={photo.url} alt={memory.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" /></a>)}</div>
          {isEditing && <div className="memory-editor-panel space-y-4"><div className="flex items-center justify-between gap-3"><h2 className="memory-editor-heading">Φωτογραφίες</h2><label className="memory-upload-action"><Upload className="w-4 h-4" />{uploading ? 'Μεταφόρτωση...' : 'Προσθήκη'}<input type="file" accept="image/*" multiple onChange={handlePhotoUpload} disabled={uploading} className="hidden" /></label></div><p className="memory-editor-help">Επίλεξε «Εξώφυλλο» στη φωτογραφία που θέλεις να εμφανίζεται πρώτη.</p><div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{photos.map(photo => <div key={photo.id} className="relative aspect-square"><img src={photo.url} alt={memory.title} className="w-full h-full object-cover rounded-lg" /><label className="absolute bottom-1 left-1 right-1 flex items-center gap-1 bg-black/70 text-white text-xs p-1 rounded"><input type="radio" name="cover-photo" checked={coverPhotoId === photo.id} onChange={() => setCoverPhotoId(photo.id)} />Εξώφυλλο</label><button type="button" onClick={() => handleDeletePhoto(photo.id)} className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full" aria-label="Διαγραφή φωτογραφίας"><X className="w-4 h-4" /></button></div>)}</div></div>}
        </div>

        <aside className="memory-editor-card">
          {isEditing ? <div className="space-y-5"><div><label className="memory-editor-label">Τίτλος</label><input value={editData.title} onChange={event => setEditData({ ...editData, title: event.target.value })} className="memory-editor-input" /></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="memory-editor-label">Έναρξη</label><input type="date" value={editData.start_date} onChange={event => setEditData({ ...editData, start_date: event.target.value })} className="memory-editor-input" /></div><div><label className="memory-editor-label">Λήξη</label><input type="date" value={editData.end_date} onChange={event => setEditData({ ...editData, end_date: event.target.value })} className="memory-editor-input" /></div></div><div><label className="memory-editor-label">Τόπος</label><input value={editData.place} onChange={event => setEditData({ ...editData, place: event.target.value })} className="memory-editor-input" /></div><div><label className="memory-editor-label">Άτομα</label><div className="memory-people-list">{allPeople.map(person => <label key={person.id} className="memory-person-option"><input type="checkbox" checked={selectedPeople.includes(person.id)} onChange={() => togglePerson(person.id)} />{person.name}</label>)}</div></div><div><label className="memory-editor-label">Σημειώσεις</label><textarea rows={5} value={editData.notes} onChange={event => setEditData({ ...editData, notes: event.target.value })} className="memory-editor-input resize-none" /></div><div className="flex gap-2"><button type="button" onClick={handleSave} disabled={saving} className="memory-save-action"><Save className="w-4 h-4" />{saving ? 'Αποθήκευση...' : 'Αποθήκευση'}</button><button type="button" onClick={() => setIsEditing(false)} className="memory-cancel-action"><X className="w-4 h-4" />Ακύρωση</button></div></div> : <div className="space-y-5"><div className="flex gap-3"><CalendarDays className="w-5 h-5 text-peach-500 shrink-0" /><div><p className="text-sm text-warm-600">Ημερομηνία</p><p className="font-semibold text-warm-800">{formatDate(memory.start_date)}{memory.end_date ? ` - ${formatDate(memory.end_date)}` : ''}</p></div></div>{memory.place && <div className="flex gap-3"><MapPin className="w-5 h-5 text-peach-500 shrink-0" /><div><p className="text-sm text-warm-600">Τόπος</p><p className="font-semibold text-warm-800">{memory.place}</p></div></div>}<div className="flex gap-3"><Users className="w-5 h-5 text-peach-500 shrink-0" /><div><p className="text-sm text-warm-600">Μαζί</p><div className="flex flex-wrap gap-1">{people.map(person => <Link key={person.id} href={`/people/${person.id}`} className="text-peach-700 hover:underline">{person.name}</Link>)}</div></div></div>{memory.notes && <div><p className="text-sm text-warm-600 mb-1">Σημειώσεις</p><p className="text-warm-800 whitespace-pre-wrap">{memory.notes}</p></div>}</div>}
        </aside>
      </div>
    </div>
  );
}
