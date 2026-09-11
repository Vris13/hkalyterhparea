'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BookOpen, Calendar as CalendarIcon, Check, CheckCircle2, Edit2, FileText, Plus, Star, Trash2, Upload, X } from 'lucide-react';

interface Book { id: string; title: string; author?: string | null; start_date: string; end_date: string; details?: string | null; cover_url?: string | null; }
interface Person { id: string; name: string; }
interface BookFile { id: string; book_id: string; name: string; url: string; storage_path?: string | null; }
interface Participation { id: string; book_id: string; person_id: string; completed: boolean; }
interface Rating { id: string; book_id: string; person_id: string; score: number; comment?: string | null; }

const emptyForm = { title: '', author: '', start_date: '', end_date: '', details: '' };

export default function BookClubPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [files, setFiles] = useState<Record<string, BookFile[]>>({});
  const [participation, setParticipation] = useState<Participation[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [formData, setFormData] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [selectedPerson, setSelectedPerson] = useState('');
  const [ratingScore, setRatingScore] = useState('');
  const [ratingComment, setRatingComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [booksResult, peopleResult, filesResult, participationResult, ratingsResult] = await Promise.all([
      supabase.from('book_club_books').select('*').order('start_date', { ascending: false }),
      supabase.from('people').select('id, name').order('name', { ascending: true }),
      supabase.from('book_club_files').select('*'),
      supabase.from('book_club_participation').select('*'),
      supabase.from('book_club_ratings').select('*'),
    ]);
    if (booksResult.error) console.error('Error fetching books:', booksResult.error);
    if (peopleResult.error) console.error('Error fetching people:', peopleResult.error);
    if (filesResult.error) console.error('Error fetching book files:', filesResult.error);
    if (participationResult.error) console.error('Error fetching participation:', participationResult.error);
    if (ratingsResult.error) console.error('Error fetching ratings:', ratingsResult.error);
    setBooks(booksResult.data || []);
    setPeople(peopleResult.data || []);
    setParticipation(participationResult.data || []);
    setRatings(ratingsResult.data || []);
    const groupedFiles: Record<string, BookFile[]> = {};
    (filesResult.data || []).forEach((file: BookFile) => { groupedFiles[file.book_id] = [...(groupedFiles[file.book_id] || []), file]; });
    setFiles(groupedFiles);
    setLoading(false);
  };

  const uploadToCloudinary = async (file: File) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) throw new Error('Cloudinary δεν είναι διαθέσιμο.');
    const body = new FormData();
    body.append('file', file); body.append('upload_preset', uploadPreset); body.append('folder', 'memory-book/book-club');
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Cloudinary: ${data?.error?.message || `HTTP ${response.status}`}`);
    return data.secure_url as string;
  };

  const uploadPdfToSupabase = async (file: File, bookId: string) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${bookId}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from('book-club-files').upload(storagePath, file, { contentType: 'application/pdf', upsert: false });
    if (error) throw new Error(`Supabase Storage: ${error.message}`);
    return { url: supabase.storage.from('book-club-files').getPublicUrl(storagePath).data.publicUrl, name: file.name, storage_path: storagePath };
  };

  const resetBookForm = () => { setFormData(emptyForm); setCoverFile(null); setPdfFiles([]); setEditingBookId(null); setShowForm(false); };

  const startEditingBook = (book: Book) => {
    setEditingBookId(book.id);
    setFormData({ title: book.title, author: book.author || '', start_date: book.start_date, end_date: book.end_date, details: book.details || '' });
    setCoverFile(null); setPdfFiles([]); setShowForm(true);
  };

  const handleSaveBook = async (event: FormEvent) => {
    event.preventDefault();
    if (formData.end_date < formData.start_date) { alert('Η ημερομηνία λήξης δεν μπορεί να είναι πριν την ημερομηνία έναρξης'); return; }
    setSaving(true);
    try {
      const currentBook = editingBookId ? books.find(book => book.id === editingBookId) : null;
      const coverUrl = coverFile ? await uploadToCloudinary(coverFile) : currentBook?.cover_url || null;
      const payload = { ...formData, author: formData.author || null, details: formData.details || null, cover_url: coverUrl };
      const result = editingBookId ? await supabase.from('book_club_books').update(payload).eq('id', editingBookId).select().single() : await supabase.from('book_club_books').insert(payload).select().single();
      if (result.error) throw result.error;
      if (pdfFiles.length) {
        const uploaded = await Promise.all(pdfFiles.map(file => uploadPdfToSupabase(file, result.data.id)));
        const { error } = await supabase.from('book_club_files').insert(uploaded.map(file => ({ book_id: result.data.id, ...file })));
        if (error) throw error;
      }
      await fetchData(); resetBookForm();
    } catch (error: any) { console.error('Error saving book:', error); alert(error?.message || 'Σφάλμα κατά την αποθήκευση του βιβλίου'); }
    finally { setSaving(false); }
  };

  const deleteBook = async (bookId: string) => {
    if (!confirm('Να διαγραφεί αυτό το βιβλίο και τα στοιχεία του;')) return;
    const { error } = await supabase.from('book_club_books').delete().eq('id', bookId);
    if (error) alert('Σφάλμα κατά τη διαγραφή'); else setBooks(prev => prev.filter(book => book.id !== bookId));
  };

  const deleteFile = async (file: BookFile) => {
    if (!confirm(`Να διαγραφεί το αρχείο «${file.name}»;`)) return;
    if (file.storage_path) {
      const { error } = await supabase.storage.from('book-club-files').remove([file.storage_path]);
      if (error) { alert(`Σφάλμα κατά τη διαγραφή του αρχείου: ${error.message}`); return; }
    }
    const { error } = await supabase.from('book_club_files').delete().eq('id', file.id);
    if (error) alert('Σφάλμα κατά τη διαγραφή του αρχείου'); else setFiles(prev => ({ ...prev, [file.book_id]: (prev[file.book_id] || []).filter(item => item.id !== file.id) }));
  };

  const toggleParticipation = async (bookId: string, personId: string) => {
    const existing = participation.find(item => item.book_id === bookId && item.person_id === personId);
    if (existing) { const { error } = await supabase.from('book_club_participation').delete().eq('id', existing.id); if (!error) setParticipation(prev => prev.filter(item => item.id !== existing.id)); return; }
    const { data, error } = await supabase.from('book_club_participation').insert({ book_id: bookId, person_id: personId }).select().single();
    if (error) alert('Σφάλμα κατά την ενημέρωση συμμετοχής'); else setParticipation(prev => [...prev, data]);
  };

  const toggleCompleted = async (item: Participation) => {
    const { error } = await supabase.from('book_club_participation').update({ completed: !item.completed }).eq('id', item.id);
    if (!error) setParticipation(prev => prev.map(row => row.id === item.id ? { ...row, completed: !item.completed } : row));
  };

  const saveRating = async (bookId: string) => {
    const normalizedScore = ratingScore.trim().replace(',', '.');
    if (!/^(?:\d|10)(?:\.\d)?$/.test(normalizedScore) || Number(normalizedScore) > 10) { alert('Ο βαθμός πρέπει να είναι αριθμός από 0 έως 10 με έως ένα δεκαδικό ψηφίο.'); return; }
    if (!selectedPerson) { alert('Επέλεξε άτομο'); return; }
    const existing = ratings.find(item => item.book_id === bookId && item.person_id === selectedPerson);
    const payload = { book_id: bookId, person_id: selectedPerson, score: Number(normalizedScore), comment: ratingComment || null };
    const result = existing ? await supabase.from('book_club_ratings').update(payload).eq('id', existing.id).select().single() : await supabase.from('book_club_ratings').insert(payload).select().single();
    if (result.error) alert('Σφάλμα κατά την αποθήκευση της αξιολόγησης'); else { setRatings(prev => existing ? prev.map(item => item.id === existing.id ? result.data : item) : [...prev, result.data]); setSelectedPerson(''); setRatingScore(''); setRatingComment(''); }
  };

  const deleteRating = async (ratingId: string) => {
    if (!confirm('Να διαγραφεί αυτή η αξιολόγηση;')) return;
    const { error } = await supabase.from('book_club_ratings').delete().eq('id', ratingId);
    if (error) alert('Σφάλμα κατά τη διαγραφή της αξιολόγησης'); else setRatings(prev => prev.filter(rating => rating.id !== ratingId));
  };

  const isActive = (book: Book) => new Date(book.end_date) >= new Date(new Date().setHours(0, 0, 0, 0));
  const formatDateRange = (start: string, end: string) => `${new Date(start).toLocaleDateString('el-GR')} - ${new Date(end).toLocaleDateString('el-GR')}`;
  const averageFor = (bookId: string) => { const scores = ratings.filter(rating => rating.book_id === bookId).map(rating => rating.score); return scores.length ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1) : null; };

  const renderBook = (book: Book) => {
    const bookParticipation = participation.filter(item => item.book_id === book.id);
    const bookRatings = ratings.filter(item => item.book_id === book.id);
    const average = averageFor(book.id);
    return <details key={book.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md group">
      <summary className="list-none cursor-pointer p-5 [&::-webkit-details-marker]:hidden"><div className="flex flex-col md:flex-row gap-5"><div className="w-full md:w-32 aspect-[3/4] shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center">{book.cover_url ? <img src={book.cover_url} alt={`Εξώφυλλο ${book.title}`} className="w-full h-full object-cover" /> : <BookOpen className="w-12 h-12 text-orange-500" />}</div><div className="flex-1 min-w-0"><div className="flex items-start justify-between gap-3"><div><h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{book.title}</h3>{book.author && <p className="text-gray-600 dark:text-gray-300">{book.author}</p>}</div><div className="flex gap-1" onClick={event => event.stopPropagation()}><button onClick={() => startEditingBook(book)} className="p-2 hover:bg-orange-100 rounded-lg" aria-label="Επεξεργασία βιβλίου"><Edit2 className="w-5 h-5 text-orange-600" /></button><button onClick={() => deleteBook(book.id)} className="p-2 hover:bg-red-100 rounded-lg" aria-label="Διαγραφή βιβλίου"><Trash2 className="w-5 h-5 text-red-500" /></button></div></div>{book.details && <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap mt-4">{book.details}</p>}{files[book.id]?.length > 0 && <div className="flex flex-wrap gap-2 mt-4">{files[book.id].map(file => <span key={file.id} className="inline-flex items-center gap-2 text-sm text-orange-700"><FileText className="w-4 h-4" />{file.name}</span>)}</div>}<p className="text-sm text-gray-500 mt-4">Πάτησε για περισσότερα</p></div></div></summary>
      <div className="border-t border-gray-200 dark:border-gray-700 mx-5 py-5 grid lg:grid-cols-2 gap-6"><section><h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3">Ημερομηνίες</h4><p className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><CalendarIcon className="w-4 h-4" />{formatDateRange(book.start_date, book.end_date)}</p><h4 className="font-bold text-gray-800 dark:text-gray-100 mt-6 mb-3">Συμμετοχή</h4><div className="space-y-2">{people.map(person => { const item = bookParticipation.find(row => row.person_id === person.id); return <div key={person.id} className="flex items-center justify-between gap-3 text-sm"><label className="flex items-center gap-2 text-gray-700 dark:text-gray-200"><input type="checkbox" checked={Boolean(item)} onChange={() => toggleParticipation(book.id, person.id)} className="w-4 h-4 accent-orange-500" />{person.name}</label>{item && <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><input type="checkbox" checked={item.completed} onChange={() => toggleCompleted(item)} className="w-4 h-4 accent-green-600" />Διάβασε</label>}</div>; })}</div></section><section><h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3">Αξιολογήσεις {average !== null && <span className="ml-2 inline-flex items-center gap-1 text-orange-600"><Star className="w-4 h-4" />Μέσος όρος: {average}/10</span>}</h4><div className="space-y-3">{bookRatings.map(rating => <div key={rating.id} className="rounded-lg bg-orange-50 dark:bg-gray-700 p-3"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-100"><Star className="w-4 h-4 text-orange-500" />{people.find(person => person.id === rating.person_id)?.name || 'Άγνωστο'}: {rating.score}/10</div><button onClick={() => deleteRating(rating.id)} aria-label="Διαγραφή αξιολόγησης" className="p-1 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button></div>{rating.comment && <p className="text-sm text-gray-700 dark:text-gray-200 mt-1 whitespace-pre-wrap">{rating.comment}</p>}</div>)}</div><div className="grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-2 mt-4"><select value={selectedPerson} onChange={event => setSelectedPerson(event.target.value)} className="input-book"><option value="">Επίλεξε άτομο</option>{people.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select><input type="text" inputMode="decimal" placeholder="0-10" value={ratingScore} onChange={event => setRatingScore(event.target.value)} className="input-book" /></div><textarea value={ratingComment} onChange={event => setRatingComment(event.target.value)} rows={3} placeholder="Σχόλιο (προαιρετικό)" className="input-book mt-2 resize-none" /><button onClick={() => saveRating(book.id)} className="mt-2 inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg"><Check className="w-4 h-4" />Αποθήκευση αξιολόγησης</button></section></div>
    </details>;
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-gray-600">Φόρτωση...</div>;
  const activeBooks = books.filter(isActive); const oldBooks = books.filter(book => !isActive(book));
  return <div className="space-y-8"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div className="flex items-center gap-3"><div className="bg-gradient-to-r from-orange-500 to-amber-500 p-3 rounded-full"><BookOpen className="w-6 h-6 text-white" /></div><div><h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">Το Φανερό Σχολείο</h1><p className="text-gray-600 dark:text-gray-300">Η λέσχη βιβλίου της παρέας</p></div></div><button onClick={() => { if (showForm) resetBookForm(); else setShowForm(true); }} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-3 rounded-lg"><Plus className="w-5 h-5" />Νέο βιβλίο</button></div>
    {showForm && <form onSubmit={handleSaveBook} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md space-y-4"><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{editingBookId ? 'Επεξεργασία βιβλίου' : 'Προσθήκη βιβλίου'}</h2><button type="button" onClick={resetBookForm} aria-label="Κλείσιμο"><X className="w-5 h-5" /></button></div><div className="grid md:grid-cols-2 gap-4"><input required placeholder="Τίτλος βιβλίου *" value={formData.title} onChange={event => setFormData({ ...formData, title: event.target.value })} className="input-book" /><input placeholder="Συγγραφέας" value={formData.author} onChange={event => setFormData({ ...formData, author: event.target.value })} className="input-book" /><div><label className="label-book">Από *</label><input required type="date" value={formData.start_date} onChange={event => setFormData({ ...formData, start_date: event.target.value })} className="input-book" /></div><div><label className="label-book">Έως *</label><input required type="date" min={formData.start_date} value={formData.end_date} onChange={event => setFormData({ ...formData, end_date: event.target.value })} className="input-book" /></div></div><textarea placeholder="Σημειώσεις" rows={3} value={formData.details} onChange={event => setFormData({ ...formData, details: event.target.value })} className="input-book resize-none" /><div className="grid md:grid-cols-2 gap-4"><label className="label-book flex items-center gap-2"><Upload className="w-4 h-4" />{editingBookId ? 'Νέο εξώφυλλο (προαιρετικό)' : 'Εξώφυλλο'}<input type="file" accept="image/*" onChange={(event: ChangeEvent<HTMLInputElement>) => setCoverFile(event.target.files?.[0] || null)} className="block text-sm" /></label><label className="label-book flex items-center gap-2"><FileText className="w-4 h-4" />{editingBookId ? 'Πρόσθετα PDF (προαιρετικά)' : 'PDF αρχεία'}<input type="file" accept="application/pdf" multiple onChange={(event: ChangeEvent<HTMLInputElement>) => setPdfFiles(Array.from(event.target.files || []))} className="block text-sm" /></label></div><button disabled={saving} type="submit" className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg">{saving ? 'Αποθήκευση...' : editingBookId ? 'Αποθήκευση αλλαγών' : 'Δημιουργία βιβλίου'}</button></form>}
    {activeBooks.length > 0 && <section><h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2"><CheckCircle2 className="w-6 h-6 text-green-600" />Ενεργά βιβλία</h2><div className="space-y-6">{activeBooks.map(renderBook)}</div></section>}
    {oldBooks.length > 0 && <section><h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Παλιά βιβλία</h2><div className="space-y-6">{oldBooks.map(renderBook)}</div></section>}
    {books.length === 0 && <div className="text-center py-16 text-gray-600 dark:text-gray-300"><BookOpen className="w-12 h-12 mx-auto mb-3 text-orange-400" /><p>Δεν υπάρχει βιβλίο ακόμα.</p></div>}
  </div>;
}