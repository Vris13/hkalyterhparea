'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface Person { id: string; name: string; }
interface SelectedPhoto { file: File; preview: string; }

export default function NewMemoryPage() {
  const params = useParams();
  const router = useRouter();
  const personId = params.id as string;
  const [person, setPerson] = useState<Person | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([personId]);
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [formData, setFormData] = useState({ title: '', start_date: '', end_date: '', place: '', notes: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPeople = async () => {
      const { data, error } = await supabase.from('people').select('id, name').order('name');
      if (error) { alert('Σφάλμα κατά τη φόρτωση των ατόμων'); return; }
      setPeople(data || []);
      setPerson((data || []).find(item => item.id === personId) || null);
    };
    if (personId) fetchPeople();
  }, [personId]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setPhotos(prev => [...prev, ...files.map(file => ({ file, preview: URL.createObjectURL(file) }))]);
    event.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, photoIndex) => photoIndex !== index);
    });
  };

  const togglePerson = (id: string) => {
    setSelectedPeople(prev => prev.includes(id) ? prev.filter(personId => personId !== id) : [...prev, id]);
  };

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedPeople.length === 0 || photos.length === 0) {
      alert('Πρόσθεσε τουλάχιστον ένα άτομο και μία φωτογραφία.');
      return;
    }
    if (formData.end_date && formData.end_date < formData.start_date) {
      alert('Η ημερομηνία λήξης δεν μπορεί να είναι πριν την ημερομηνία έναρξης.');
      return;
    }
    setLoading(true);
    try {
      const { data: memory, error: memoryError } = await supabase
        .from('memories')
        .insert({ ...formData, end_date: formData.end_date || null, place: formData.place.trim() || null, notes: formData.notes.trim() || null })
        .select()
        .single();
      if (memoryError) throw memoryError;

      const { error: peopleError } = await supabase.from('memory_people').insert(selectedPeople.map(id => ({ memory_id: memory.id, person_id: id })));
      if (peopleError) throw peopleError;

      const urls = await Promise.all(photos.map(photo => uploadPhoto(photo.file)));
      const { error: photosError } = await supabase.from('memory_photos').insert(urls.map((url, position) => ({ memory_id: memory.id, url, position })));
      if (photosError) throw photosError;
      router.push(`/memories/${memory.id}`);
    } catch (error: any) {
      console.error('Error creating memory:', error);
      alert(`Σφάλμα κατά τη δημιουργία: ${error?.message || 'Άγνωστο σφάλμα'}`);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/people/${personId}`} className="p-2 hover:bg-warm-100 rounded-lg transition-colors"><ArrowLeft className="w-6 h-6 text-warm-600" /></Link>
        <div><h1 className="text-3xl md:text-4xl font-bold text-warm-800">Νέα ανάμνηση</h1><p className="text-warm-600 mt-1">Για {person?.name || 'το άτομο'}</p></div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 md:p-8 shadow-md space-y-6">
        <div><label className="label-book mb-2">Τίτλος *</label><input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="input-book" placeholder="π.χ. Εκδρομή στο Πήλιο" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="label-book mb-2">Ημερομηνία έναρξης *</label><input required type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="input-book" /></div><div><label className="label-book mb-2">Ημερομηνία λήξης</label><input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} className="input-book" /></div></div>
        <div><label className="label-book mb-2">Τόπος</label><input value={formData.place} onChange={e => setFormData({ ...formData, place: e.target.value })} className="input-book" placeholder="π.χ. Πήλιο" /></div>
        <div><label className="label-book mb-2">Άτομα</label><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border-2 border-warm-200 rounded-lg p-3">{people.map(item => <label key={item.id} className="flex items-center gap-2 p-2 rounded hover:bg-warm-50"><input type="checkbox" checked={selectedPeople.includes(item.id)} onChange={() => togglePerson(item.id)} className="accent-orange-500" />{item.name}</label>)}</div></div>
        <div><label className="label-book mb-2">Φωτογραφίες * <span className="font-normal text-warm-600">(η πρώτη γίνεται εξώφυλλο)</span></label><label className="flex items-center justify-center gap-2 border-2 border-dashed border-peach-300 rounded-lg p-5 text-peach-700 hover:bg-peach-50 cursor-pointer"><Upload className="w-5 h-5" />Προσθήκη φωτογραφιών<input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" /></label>{photos.length > 0 && <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">{photos.map((photo, index) => <div key={photo.preview} className="relative aspect-square"><img src={photo.preview} alt={`Φωτογραφία ${index + 1}`} className="w-full h-full object-cover rounded-lg" /><button type="button" onClick={() => removePhoto(index)} className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full" aria-label="Αφαίρεση φωτογραφίας"><X className="w-4 h-4" /></button>{index === 0 && <span className="absolute bottom-1 left-1 bg-black/65 text-white text-xs px-2 py-1 rounded">Εξώφυλλο</span>}</div>)}</div>}</div>
        <div><label className="label-book mb-2">Σημειώσεις</label><textarea rows={4} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="input-book resize-none" placeholder="Κάτι ακόμα που αξίζει να θυμόμαστε..." /></div>
        <div className="flex gap-4"><button type="submit" disabled={loading} className="memory-save-action"><Save className="w-5 h-5" />{loading ? 'Αποθήκευση...' : 'Αποθήκευση'}</button><Link href={`/people/${personId}`} className="memory-cancel-action flex-1">Ακύρωση</Link></div>
      </form>
    </div>
  );
}