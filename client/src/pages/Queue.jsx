import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Home } from 'lucide-react';
import io from 'socket.io-client';
import axios from 'axios';
import { API_URL, SOCKET_URL } from '../config';

const socket = io(SOCKET_URL);

const Queue = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [barber, setBarber] = useState(null);
    const [loading, setLoading] = useState(true);

    const bookingId = location.state?.bookingId;

    const fetchData = async () => {
        if (!bookingId) {
            setLoading(false);
            return;
        }
        try {
            const [bookingsRes, barbersRes] = await Promise.all([
                axios.get(`${API_URL}/bookings`),
                axios.get(`${API_URL}/barbers`)
            ]);

            const myBooking = bookingsRes.data.find(b => b.id === bookingId);
            if (myBooking) {
                setBooking(myBooking);
                const assignedBarber = barbersRes.data.find(b => b.id === myBooking.barber_id);
                setBarber(assignedBarber);

                // Calculate real position (all waiting people before me for the same barber)
                const queueForBarber = bookingsRes.data.filter(b =>
                    b.barber_id === myBooking.barber_id &&
                    b.status === 'waiting' &&
                    b.type === 'queue'
                );
                const myPos = queueForBarber.findIndex(b => b.id === bookingId) + 1;
                setBooking(prev => ({ ...prev, currentPosition: myPos || myBooking.position }));
            }
        } catch (err) {
            console.error('Error fetching queue status:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        if (booking?.barber_id) {
            socket.emit('join_queue_room', booking.barber_id);
        }

        socket.on('refresh_queue', () => {
            console.log('Refreshing queue position...');
            fetchData();
        });

        return () => {
            socket.off('refresh_queue');
        };
    }, [bookingId, booking?.barber_id]);

    if (loading) return <div className="min-h-screen bg-dark text-white flex items-center justify-center font-black uppercase tracking-widest animate-pulse">Chargement de votre ticket...</div>;

    if (!booking) return (
        <div className="min-h-screen bg-dark text-white flex flex-col items-center justify-center p-12 text-center">
            <h2 className="text-3xl font-black mb-6 uppercase tracking-widest">Aucune réservation active</h2>
            <button onClick={() => navigate('/booking')} className="bg-gold-600 px-8 py-4 font-bold uppercase tracking-widest text-black">Prendre rendez-vous</button>
        </div>
    );

    const waitTime = booking.currentPosition ? booking.currentPosition * 15 : 0; // Rough estimate

    return (
        <div className="min-h-screen bg-dark text-white flex flex-col p-6 font-sans">
            <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center">

                {/* Success Header */}
                <div className="text-center mb-12 animate-fade-in">
                    <div className="w-20 h-20 bg-gold-500/10 border border-gold-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Bell className="text-gold-500" size={32} />
                    </div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter mb-2 italic">
                        {booking.status === 'on_chair' ? "C'est votre tour !" : "C'est validé !"}
                    </h1>
                    <p className="text-gray-400">
                        {booking.status === 'on_chair' ? "Votre coiffeur vous attend." : "Vous êtes dans la file d'attente."}
                    </p>
                </div>

                {/* Live Queue Card */}
                <div className={`bg-dark-lighter border p-8 relative overflow-hidden group transition-all duration-500 ${booking.status === 'on_chair' ? 'border-gold-500' : 'border-white/5'}`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 blur-3xl rounded-full -mr-16 -mt-16"></div>

                    <div className="flex justify-between items-start mb-12">
                        <div>
                            <p className="text-gray-500 uppercase text-[10px] font-bold tracking-widest mb-1">Votre position</p>
                            <h2 className="text-7xl font-black text-gold-500">
                                {booking.status === 'on_chair' ? 'GO' : `${booking.currentPosition || booking.position}e`}
                            </h2>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-500 uppercase text-[10px] font-bold tracking-widest mb-1">Attente estimée</p>
                            <p className="text-3xl font-black uppercase">
                                {booking.status === 'on_chair' ? '0' : waitTime} min
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-black/40 border border-white/5">
                        <img src={barber?.photo_url || "https://api.placeholder.com/100/100"} alt={barber?.name} className="w-12 h-12 rounded-full ring-2 ring-gold-500/20" />
                        <div>
                            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Coiffeur choisi</p>
                            <p className="font-bold uppercase">{barber?.name}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 p-6 border border-gold-500/20 bg-gold-500/5 text-center">
                    <p className="text-[10px] text-gold-400 font-bold uppercase tracking-widest leading-relaxed">
                        Gardez cette page ouverte pour suivre l'évolution de la file en temps réel.
                    </p>
                </div>
            </div>

            <div className="mt-auto pt-12 pb-6 flex justify-center">
                <button
                    onClick={() => navigate('/')}
                    className="text-gray-500 hover:text-white flex items-center gap-2 transition-colors uppercase text-xs font-bold tracking-widest"
                >
                    <Home size={16} /> Retour à l'accueil
                </button>
            </div>
        </div>
    );
};

export default Queue;
