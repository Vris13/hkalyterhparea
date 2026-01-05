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
    bio: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from('people')
      .insert([formData])
      .select()
      .single();

    if (error) {
      console.error('Error creating person:', error);
      alert('Σφάλμα κατά την προσθήκη');
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
