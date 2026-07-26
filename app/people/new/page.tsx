'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewPersonPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    birthday: '',
    phone: '',
    city: '',
    university: '',
    company: '',
    job_title: '',
    phd_title: '',
    bio: '',
  });
  const [loading, setLoading] = useState(false);

  const normalizeOptional = (value: string) => value.trim() || null;

  const describeSupabaseError = (error: { message?: string; details?: string; hint?: string } | null) => {
    if (!error) return 'Άγνωστο σφάλμα';

    const parts = [error.message, error.details, error.hint].filter(Boolean);
    return parts.length > 0 ? parts.join(' | ') : 'Άγνωστο σφάλμα';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from('people')
      .insert([{ 
        name: formData.name,
        birthday: formData.birthday,
        phone: normalizeOptional(formData.phone),
        city: normalizeOptional(formData.city),
        university: normalizeOptional(formData.university),
        company: normalizeOptional(formData.company),
        job_title: normalizeOptional(formData.job_title),
        phd_title: normalizeOptional(formData.phd_title),
        bio: normalizeOptional(formData.bio),
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating person:', error);
      alert(`Σφάλμα κατά την προσθήκη: ${describeSupabaseError(error)}`);
      setLoading(false);
    } else {
      router.push(`/people/${data.id}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/people"
          className="p-2 hover:bg-warm-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-warm-600" />
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-warm-800">
          Νέο Άτομο
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 md:p-8 shadow-md space-y-6">
        <div>
          <label className="block text-sm font-semibold text-warm-800 mb-2">
            Όνομα *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-4 py-3 rounded-lg border-2 border-warm-200 focus:border-peach-400 focus:outline-none transition-colors"
            placeholder="π.χ. Γιώργος Παπαδόπουλος"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-warm-800 mb-2">
            Γενέθλια *
          </label>
          <input
            type="date"
            value={formData.birthday}
            onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
            required
            className="w-full px-4 py-3 rounded-lg border-2 border-warm-200 focus:border-peach-400 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-warm-800 mb-2">
            Τηλέφωνο
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border-2 border-warm-200 focus:border-peach-400 focus:outline-none transition-colors"
            placeholder="π.χ. 6912345678"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-warm-800 mb-2">
              Πόλη
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border-2 border-warm-200 focus:border-peach-400 focus:outline-none transition-colors"
              placeholder="π.χ. Αθήνα"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-warm-800 mb-2">
              Πανεπιστήμιο
            </label>
            <input
              type="text"
              value={formData.university}
              onChange={(e) => setFormData({ ...formData, university: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border-2 border-warm-200 focus:border-peach-400 focus:outline-none transition-colors"
              placeholder="π.χ. ΕΚΠΑ"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-warm-800 mb-2">
              Εταιρεία
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border-2 border-warm-200 focus:border-peach-400 focus:outline-none transition-colors"
              placeholder="π.χ. Deloitte"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-warm-800 mb-2">
              Job title
            </label>
            <input
              type="text"
              value={formData.job_title}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border-2 border-warm-200 focus:border-peach-400 focus:outline-none transition-colors"
              placeholder="π.χ. Data Scientist"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-warm-800 mb-2">
              Τίτλος PhD
            </label>
            <input
              type="text"
              value={formData.phd_title}
              onChange={(e) => setFormData({ ...formData, phd_title: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border-2 border-warm-200 focus:border-peach-400 focus:outline-none transition-colors"
              placeholder="π.χ. Advanced things"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-warm-800 mb-2">
            Βιογραφικό
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 rounded-lg border-2 border-warm-200 focus:border-peach-400 focus:outline-none transition-colors resize-none"
            placeholder="Γράψε κάτι για αυτό το άτομο..."
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-peach-500 hover:bg-peach-600 disabled:bg-warm-300 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </button>
          <Link
            href="/people"
            className="flex-1 flex items-center justify-center gap-2 bg-warm-100 hover:bg-warm-200 text-warm-800 font-semibold py-3 rounded-lg transition-colors"
          >
            Ακύρωση
          </Link>
        </div>
      </form>
    </div>
  );
}
