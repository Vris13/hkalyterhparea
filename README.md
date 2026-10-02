# Memory Book

Το ψηφιακό άλμπουμ της παρέας, built with Next.js, Supabase and Cloudinary.

## Features

- Password-protected private scrapbook
- People profiles with editable personal information and photos
- Shared memories linked to multiple people
- Memory galleries with cover photo, dates, place and notes
- Events with photos, attendance and calendar views
- Book-club file sharing
- Responsive layout for desktop and mobile

## Requirements

- Node.js 18 or newer
- A Supabase project
- A Cloudinary account with an unsigned upload preset

## Setup

Install dependencies:

```bash
cd memory-book
npm install
```

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset_name
NEXT_PUBLIC_SITE_PASSWORD=your_private_site_password
```

The existing Supabase database must contain the tables used by the application. The schema for the memories feature is kept separately in [`supabase-memory-schema.sql`](supabase-memory-schema.sql). Run that file once in the Supabase SQL Editor after the base project schema is available.

For the book-club section, create a public Supabase Storage bucket named `book-club-files`.

## Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Create a production build:

```bash
npm run build
```

## Main workflows

### People

Open **Άνθρωποι** to add or select a person. A profile contains personal information, profile photos and the person's shared memories.

### Memories

Open a person's profile and select **Νέα ανάμνηση**. Add a title, one or more photos, dates, place, notes and the people who participated. The first photo is used as the cover, and the memory appears on every selected person's profile.

### Events

Open **Events** to create an event, add its details and upload photos. Attendance and calendar information are managed from the event views.

## Project structure

```text
app/             Next.js pages and API routes
components/      Shared UI components
lib/             Supabase, Cloudinary and authentication helpers
public/           Manifest and service worker
supabase-*.sql    Dedicated Supabase schema files
```

## Deployment

The project can be deployed on Vercel. Add the variables from `.env.local` to the Vercel project settings before deploying.

## Tech stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Supabase PostgreSQL and Storage
- Cloudinary image uploads
- Lucide React icons
