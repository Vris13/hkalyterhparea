'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';

export default function NotificationToggle() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      await navigator.serviceWorker.ready;
      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      throw error;
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribe = async () => {
    setLoading(true);
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        alert('Παρακαλώ επίτρεψε τις ειδοποιήσεις στις ρυθμίσεις του browser σου');
        setLoading(false);
        return;
      }

      // Register service worker
      const registration = await registerServiceWorker();

      // Subscribe to push notifications
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to server
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setIsSubscribed(true);
      alert('Ειδοποιήσεις ενεργοποιήθηκαν! ✓');
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Σφάλμα κατά την ενεργοποίηση ειδοποιήσεων');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Notify server
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        setIsSubscribed(false);
        alert('Ειδοποιήσεις απενεργοποιήθηκαν');
      }
    } catch (error) {
      console.error('Unsubscribe error:', error);
      alert('Σφάλμα κατά την απενεργοποίηση ειδοποιήσεων');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (isSubscribed) {
      unsubscribe();
    } else {
      subscribe();
    }
  };

  if (!isSupported) {
    return null; // Don't show if not supported
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <Bell className="w-6 h-6 text-green-600" />
          ) : (
            <BellOff className="w-6 h-6 text-gray-400" />
          )}
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">
              Ειδοποιήσεις
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {isSubscribed 
                ? 'Θα λαμβάνεις ειδοποιήσεις για events' 
                : 'Ενεργοποίησε για να λαμβάνεις ειδοποιήσεις'}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
            isSubscribed 
              ? 'bg-green-600' 
              : 'bg-gray-300 dark:bg-gray-600'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
              isSubscribed ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
