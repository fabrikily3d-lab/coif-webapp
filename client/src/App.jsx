import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Booking from './pages/Booking';
import Queue from './pages/Queue';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
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

function App() {
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(function (registration) {
        if (!registration.pushManager) {
          return;
        }

        registration.pushManager.getSubscription().then(function (existedSubscription) {
          if (existedSubscription === null) {
            console.log('No subscription detected, make a request.');
            registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
            }).then(function (newSubscription) {
              console.log('New subscription added.');
              // Send to server
              fetch(`${API_URL}/subscribe`, {
                method: 'POST',
                body: JSON.stringify({ subscription: newSubscription }),
                headers: {
                  'Content-Type': 'application/json'
                }
              });
            }).catch(function (e) {
              console.error('An error ocurred during the subscription process.', e);
            });
          } else {
            console.log('Existed subscription detected.');
            // Optionally resend to server to ensure it's up to date
            fetch(`${API_URL}/subscribe`, {
              method: 'POST',
              body: JSON.stringify({ subscription: existedSubscription }),
              headers: {
                'Content-Type': 'application/json'
              }
            });
          }
        });
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
    </Router>
  );
}

export default App;
