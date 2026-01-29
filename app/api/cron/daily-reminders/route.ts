import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    
    // Get today's date in Greek timezone
    const todayStr = now.toISOString().split('T')[0];
    
    // Get all events happening today
    const { data: todayEvents, error: todayError } = await supabase
      .from('events')
      .select('*')
      .lte('start_date', todayStr)
      .gte('end_date', todayStr);

    if (todayError) {
      console.error('Error fetching events:', todayError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!todayEvents || todayEvents.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No events today',
        greekTime: now.toLocaleString('el-GR', { timeZone: 'Europe/Athens' })
      });
    }

    const notificationsSent = [];

    // Send notification for each event
    for (const event of todayEvents) {
      // Build notification body based on time
      let notificationBody = '';
      let notificationTitle = '';
      
      if (event.time) {
        // Event has specific time
        notificationTitle = `Σήμερα στις ${event.time}: ${event.title}`;
        notificationBody = event.place ? `📍 ${event.place}` : 'Μην το ξεχάσεις!';
      } else {
        // Event without specific time
        notificationTitle = `Σήμερα: ${event.title}`;
        notificationBody = event.place ? `📍 ${event.place}` : 'Μην το ξεχάσεις!';
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: notificationTitle,
            body: notificationBody,
            url: `/events/${event.id}`,
            icon: '/icon-192x192.png',
          }),
        }
      );
      const result = await response.json();
      notificationsSent.push({ event: event.title, time: event.time, result });
    }

    return NextResponse.json({ 
      success: true, 
      greekTime: now.toLocaleString('el-GR', { timeZone: 'Europe/Athens' }),
      eventsProcessed: todayEvents.length,
      notificationsSent
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
