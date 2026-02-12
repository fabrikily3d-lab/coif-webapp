import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Booking from './pages/Booking';
import Queue from './pages/Queue';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import InstallPrompt from './components/InstallPrompt';
import { API_URL } from './config';

const PUBLIC_VAPID_KEY = 'BOXNhnfoL63FT3IJ4oAa0SLi-HmLMmFyezrOwMKA95kBGuCV3efkb4SmjI3FEAyd8jpQfqpxaG2XyfwxtN0eJzY';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUser() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Explicitly request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Permission not granted');
      return null;
    }

    const existedSubscription = await registration.pushManager.getSubscription();
    if (existedSubscription) {
      // Refresh it on server just in case
      await fetch(`${API_URL}/subscribe`, {
        method: 'POST',
        body: JSON.stringify({ subscription: existedSubscription }),
        headers: { 'Content-Type': 'application/json' }
      });
      return existedSubscription;
    }

    const newSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
    });

    console.log('New subscription added.');
    await fetch(`${API_URL}/subscribe`, {
      method: 'POST',
      body: JSON.stringify({ subscription: newSubscription }),
      headers: { 'Content-Type': 'application/json' }
    });

    return newSubscription;
  } catch (e) {
    console.error('Push error:', e);
    return null;
  }
}

function App() {
  useEffect(() => {
    // Only register SW automatically, don't force subscribe here (unreliable on mobile)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        console.log('SW Ready');
      });
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/queue" element={<Queue />} />
        <Route path="/success" element={<Queue />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
      <InstallPrompt />
    </Router>
  );
}

export default App;
