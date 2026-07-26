# Memory Book - Βιβλίο Αναμνήσεων

A digital scrapbook for your friend group, built with Next.js, Supabase, and Cloudinary.

## 🚀 Features

- **Password Protection**: Simple password gate to keep your memories private
- **Homepage**: Shows today's birthdays and countdown to the next event
- **People Management**: Grid view of friends with individual profile pages
- **Editable Profiles**: All text fields can be edited directly on the page
- **Photo Galleries**: Each person has their own photo gallery
- **Calendar**: View all birthdays and events in one place
- **Events**: Create and manage events with photos
- **Photo Uploads**: One-click upload using Cloudinary widget
- **Mobile-Friendly**: Responsive design with warm color palette

## 📋 Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- A Cloudinary account (free tier works)
- A Vercel account for deployment (optional, free tier works)

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd memory-book
npm install
```

### 2. Set Up Supabase

1. Go to [Supabase](https://supabase.com) and create a new project
2. Wait for the project to be provisioned (takes ~2 minutes)
3. Go to **Settings** → **API** and copy:
   - Project URL (as `NEXT_PUBLIC_SUPABASE_URL`)
   - `anon` public key (as `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

4. Go to **SQL Editor** and run the schema from `supabase-schema.sql`:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- People table
create table people (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  birthday date not null,
  phone text,
  city text,
  university text,
  company text,
  job_title text,
  phd_title text,
  profile_photo text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Events table
create table events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  date date not null,
  details text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Photos table
create table photos (
  id uuid default uuid_generate_v4() primary key,
  url text not null,
  person_id uuid references people(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  check (
    (person_id is not null and event_id is null) or
    (person_id is null and event_id is not null)
  )
);

-- Enable Row Level Security (RLS)
alter table people enable row level security;
alter table events enable row level security;
alter table photos enable row level security;

-- Create policies (allow all operations for authenticated users)
create policy "Enable all operations for authenticated users" on people
  for all using (true);

create policy "Enable all operations for authenticated users" on events
  for all using (true);

create policy "Enable all operations for authenticated users" on photos
  for all using (true);

-- Create indexes for better performance
create index people_birthday_idx on people(birthday);
create index events_date_idx on events(date);
create index photos_person_id_idx on photos(person_id);
create index photos_event_id_idx on photos(event_id);
```

If your `people` table already exists, add the new optional fields with:

```sql
alter table people add column if not exists city text;
alter table people add column if not exists university text;
alter table people add column if not exists company text;
alter table people add column if not exists job_title text;
alter table people add column if not exists phd_title text;
```

The webapp will then save and update these fields automatically through the create and edit forms. Empty values are stored as `null`, so they stay hidden on the profile page until filled in.

### 3. Set Up Cloudinary

1. Go to [Cloudinary](https://cloudinary.com) and create a free account
2. Go to **Settings** → **Upload**
3. Scroll down to **Upload presets** and click **Add upload preset**
4. Configure the preset:
   - **Signing Mode**: Unsigned
   - **Upload preset name**: Choose a name (e.g., `memory-book-unsigned`)
   - **Folder**: `memory-book` (optional, helps organize your images)
   - Click **Save**

5. Go to **Dashboard** and copy:
   - Cloud name (as `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`)
   - The upload preset name you just created (as `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`)

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset_name

# Password (you can change this)
NEXT_PUBLIC_SITE_PASSWORD=kwstasleftas
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Default Password**: `kwstasleftas`

## 🔐 Changing the Password

To change the site password, update the `NEXT_PUBLIC_SITE_PASSWORD` in your `.env.local` file or edit `lib/auth.ts`:

```typescript
export function checkPassword(password: string): boolean {
  return password === 'your-new-password';
}
```

## 📦 Deployment to Vercel

### Option 1: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and sign in
3. Click **Add New** → **Project**
4. Import your GitHub repository
5. Add environment variables from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
   - `NEXT_PUBLIC_SITE_PASSWORD`
6. Click **Deploy**

### Option 2: Deploy via CLI

```bash
npm install -g vercel
vercel login
vercel
```

Follow the prompts and add your environment variables when asked.

## 🎨 Customization

### Colors

Edit `tailwind.config.ts` to customize the warm color palette:

```typescript
colors: {
  warm: {
    50: '#fdf8f6',
    100: '#f2e8e5',
    200: '#eaddd7',
    300: '#e0cec7',
    400: '#d2bab0',
    500: '#bfa094',
    600: '#a18072',
    700: '#977669',
    800: '#846358',
    900: '#43302b',
  },
  peach: {
    100: '#ffe5d0',
    200: '#ffd4a3',
    300: '#ffc078',
    400: '#ffab4d',
    500: '#ff9124',
    600: '#e67700',
    700: '#b35c00',
    800: '#804200',
    900: '#4d2700',
  },
}
```

### Site Name and Metadata

Edit `app/layout.tsx`:

```typescript
export const metadata: Metadata = {
  title: "Your Custom Title",
  description: "Your custom description",
};
```

## 📱 Usage Tips

### Adding Your First Person

1. Go to **Άνθρωποι** (People)
2. Click **Προσθήκη Ατόμου** (Add Person)
3. Fill in the name and birthday (required)
4. Optionally add phone and bio
5. Click **Αποθήκευση** (Save)
6. Upload photos from the person's profile page

### Creating Events

1. Go to **Events**
2. Click **Νέο Event** (New Event)
3. Enter title and date (required)
4. Optionally add details
5. Click **Δημιουργία** (Create)
6. Upload photos after creation

### Editing Information

All pages have an **Επεξεργασία** (Edit) button that allows you to modify information inline. Just click it, make your changes, and save.

## 🔒 Security Notes

- The password gate uses cookies, which is fine for a private friend group site
- Row Level Security (RLS) is enabled on Supabase but set to allow all operations
- For production use with multiple users, consider implementing proper authentication
- The Supabase `anon` key is safe to expose as it respects RLS policies

## 🐛 Troubleshooting

### Cloudinary Upload Not Working

1. Make sure your upload preset is set to **Unsigned** mode
2. Verify the environment variables are correct
3. Check browser console for errors
4. Ensure the Cloudinary script loads (check Network tab)

### Supabase Connection Issues

1. Verify your Supabase URL and key in `.env.local`
2. Check if RLS policies are properly set
3. Make sure the database schema is created
4. Check Supabase logs in the dashboard

### Images Not Displaying

1. Check if the URLs are correct in the database
2. Verify Cloudinary URLs are publicly accessible
3. Check browser console for CORS errors

## 📚 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Cloudinary
- **Icons**: Lucide React
- **Deployment**: Vercel
- **Language**: TypeScript

## 🎉 Features Overview

### Homepage
- Shows today's birthdays with profile photos
- Displays countdown to next event
- Quick links to all sections

### People Page
- Grid view of all friends
- Clickable cards with profile photos
- Shows birthday date on each card

### Individual Profile
- Large profile photo
- Editable fields (name, birthday, phone, bio)
- Photo gallery with upload and delete
- First photo automatically becomes profile photo

### Calendar
- Combined view of birthdays and events
- Separated into upcoming and past
- Shows days until each event
- Highlights today's events

### Events Page
- Create events with title, date, and details
- Upload multiple photos per event
- Edit and delete events
- Separated into upcoming and past

## 📞 Support

For issues or questions, check:
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 📄 License

This project is free to use and modify for personal purposes.

---

Made with ❤️ for your friend group

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
