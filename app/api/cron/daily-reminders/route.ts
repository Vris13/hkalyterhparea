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
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Get today's date in Greek timezone
    const todayStr = now.toISOString().split('T')[0];
    
    // Time windows to check (Greek time):
    // 1. Events happening today (send at 9 AM)
    // 2. Events with specific time - send 1 hour before
    
    const notificationsSent = [];

    // At 9 AM Greek time, send reminders for all events today
    if (currentHour === 9 && currentMinute < 15) {
      const { data: todayEvents, error: todayError } = await supabase
        .from('events')
        .select('*')
        .lte('start_date', todayStr)
        .gte('end_date', todayStr);

      if (!todayError && todayEvents && todayEvents.length > 0) {
        for (const event of todayEvents) {
          // Skip if already notified in last 12 hours
          const { data: subs } = await supabase
            .from('push_subscriptions')
            .select('last_notified_at')
            .eq('is_active', true)
            .single();

          const lastNotified = subs?.last_notified_at ? new Date(subs.last_notified_at) : null;
          const hoursSinceNotification = lastNotified ? (now.getTime() - lastNotified.getTime()) / (1000 * 60 * 60) : 999;

          if (hoursSinceNotification < 12) continue;

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/send`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: `Σήμερα: ${event.title}`,
                body: event.time 
                  ? `${event.time}${event.place ? ` - ${event.place}` : ''}` 
                  : event.place || 'Μην το ξεχάσεις!',
                url: `/events/${event.id}`,
                icon: '/icon-192x192.png',
              }),
            }
          );
          const result = await response.json();
          notificationsSent.push({ type: 'today', event: event.title, result });
        }
      }
    }

    // Check for events with specific times happening in 1 hour
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .lte('start_date', todayStr)
      .gte('end_date', todayStr)
      .not('time', 'is', null);

    if (!error && events && events.length > 0) {
      for (const event of events) {
        // Parse event time (format: "HH:MM" or "HH:MM - HH:MM")
        const timeMatch = event.time?.match(/^(\d{1,2}):(\d{2})/);
        if (!timeMatch) continue;

        const eventHour = parseInt(timeMatch[1]);
        const eventMinute = parseInt(timeMatch[2]);

        // Check if event is in exactly 1 hour (±15 minutes window)
        const minutesUntilEvent = (eventHour * 60 + eventMinute) - (currentHour * 60 + currentMinute);
        
        if (minutesUntilEvent >= 45 && minutesUntilEvent <= 75) {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/send`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: `Σε 1 ώρα: ${event.title}`,
                body: 'Θα αργήσεις τρέχααα',
                url: `/events/${event.id}`,
                icon: '/icon-192x192.png',
              }),
            }
          );
          const result = await response.json();
          notificationsSent.push({ type: '1-hour-before', event: event.title, result });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      greekTime: now.toLocaleString('el-GR', { timeZone: 'Europe/Athens' }),
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
