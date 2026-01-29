import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { eventId, title, time, place } = await request.json();

    if (!eventId || !title) {
      return NextResponse.json(
        { error: 'Event ID and title are required' },
        { status: 400 }
      );
    }

    // Send notification about the new event
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/send`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Νέα εκδήλωση: ${title}`,
          body: time 
            ? `${time}${place ? ` - ${place}` : ''}` 
            : place || 'Δες τις λεπτομέρειες',
          url: `/events/${eventId}`,
          icon: '/icon-192x192.png',
        }),
      }
    );

    const result = await response.json();

    return NextResponse.json({ 
      success: true,
      notification: result
    });
  } catch (error) {
    console.error('New event notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
