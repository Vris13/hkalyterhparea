import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Verify this is a Vercel Cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current time in Greek timezone (Europe/Athens)
    const greekTime = new Date().toLocaleString('en-US', { timeZone: 'Europe/Athens' });
    const now = new Date(greekTime);

    const requestedDate = new URL(request.url).searchParams.get('date');
    const dateOverride = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : null;
    const targetDate = dateOverride || now.toISOString().split('T')[0];
    const [targetYear, targetMonth, targetDay] = targetDate.split('-').map(Number);
    
    // Get all events happening today
    const { data: todayEvents, error: todayError } = await supabase
      .from('events')
      .select('*')
      .lte('start_date', targetDate)
      .gte('end_date', targetDate);

    if (todayError) {
      console.error('Error fetching events:', todayError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Birthdays are stored as dates, so compare their month/day parts directly
    // instead of converting them to server-local Date objects.
    const { data: people, error: peopleError } = await supabase
      .from('people')
      .select('id, name, birthday');

    if (peopleError) {
      console.error('Error fetching birthdays:', peopleError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const todaysBirthdays = (people || []).filter((person) => {
      if (!person.birthday) return false;

      const [, month, day] = person.birthday.split('-');
      return month === String(targetMonth).padStart(2, '0')
        && day === String(targetDay).padStart(2, '0');
    });

    if ((!todayEvents || todayEvents.length === 0) && todaysBirthdays.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No events or birthdays today',
        greekTime: now.toLocaleString('el-GR', { timeZone: 'Europe/Athens' })
      });
    }

    const notificationSections = [];

    if (todayEvents && todayEvents.length > 0) {
      const eventLines = todayEvents.map((event) => {
        const eventLabel = event.time ? `${event.time}: ${event.title}` : event.title;
        return `📅 ${eventLabel}${event.place ? ` - ${event.place}` : ''}`;
      });
      notificationSections.push(eventLines.join('\n'));
    }

    if (todaysBirthdays.length > 0) {
      const birthdayNames = todaysBirthdays.map((person) => person.name).join(', ');
      notificationSections.push(`🎂 Γενέθλια: ${birthdayNames}`);
    }

    const firstEvent = todayEvents?.[0];
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/send`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Σήμερα',
          body: notificationSections.join('\n'),
          url: firstEvent ? `/events/${firstEvent.id}` : '/people',
          icon: '/icon-192x192.png',
        }),
      }
    );
    const result = await response.json();

    return NextResponse.json({ 
      success: true, 
      greekTime: now.toLocaleString('el-GR', { timeZone: 'Europe/Athens' }),
      dateChecked: targetDate,
      eventsProcessed: todayEvents?.length || 0,
      birthdaysProcessed: todaysBirthdays.length,
      notificationsSent: [{ result }]
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
