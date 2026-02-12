import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, UserRound, Baby, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import io from 'socket.io-client';
import { API_URL, SOCKET_URL } from '../config';

const socket = io(SOCKET_URL);

const Booking = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [bookingData, setBookingData] = useState({
        category: '', // adult, child
        service: null,
        barber: null,
        mode: '', // appointment, queue
        date: new Date().toISOString().split('T')[0],
        time: '',
        client: { name: '', phone: '' }
    });

    const [services, setServices] = useState([]);
    const [barbers, setBarbers] = useState([]);
    const [existingBookings, setExistingBookings] = useState([]);

    const fetchData = async () => {
        try {
            const [servicesRes, barbersRes, bookingsRes] = await Promise.all([
                axios.get(`${API_URL}/services`),
                axios.get(`${API_URL}/barbers`),
                axios.get(`${API_URL}/bookings`)
            ]);
            setServices(servicesRes.data);
            setBarbers(barbersRes.data);
            setExistingBookings(bookingsRes.data);
        } catch (err) {
            console.error('Error fetching data:', err);
        }
    };

    useEffect(() => {
        fetchData();
        socket.on('refresh_queue', (data) => {
            fetchData();
        });
        return () => {
            socket.off('refresh_queue');
        };
    }, []);

    const nextStep = () => {
        if (step === 4 && bookingData.mode === 'queue') {
            setStep(6); // Skip date/time for queue
        } else {
            setStep(step + 1);
        }
    };

    const prevStep = () => {
        if (step === 6 && bookingData.mode === 'queue') {
            setStep(4);
        } else {
            setStep(step - 1);
        }
    };

    const filteredServices = services.filter(s => s.category === bookingData.category);

    // Debug logging
    console.log('🔍 Debug Info:');
    console.log('Total services loaded:', services.length);
    console.log('Selected category:', bookingData.category);
    console.log('Filtered services:', filteredServices.length);
    if (services.length > 0) {
        console.log('Sample service:', services[0]);
    }

    const handleConfirm = async () => {
        if (!bookingData.barber || !bookingData.service) return;

        setLoading(true);
        try {
            const scheduledTime = bookingData.mode === 'appointment'
                ? `${bookingData.date}T${bookingData.time}:00`
                : null;

            const res = await axios.post(`${API_URL}/bookings`, {
                client_name: bookingData.client.name,
                client_phone: bookingData.client.phone,
                barber_id: bookingData.barber.id,
                service_id: bookingData.service.id,
                type: bookingData.mode,
                scheduled_time: scheduledTime
            });

            socket.emit('queue_update', { barberId: bookingData.barber.id, type: 'join' });
            navigate('/success', { state: { bookingId: res.data.id, position: res.data.position } });
        } catch (err) {
            console.error('Error creating booking:', err);
            alert('Erreur lors de la réservation.');
        } finally {
            setLoading(false);
        }
    };

    const timeSlots = [
        "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
        "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"
    ];

    return (
        <div className="min-h-screen bg-dark text-white p-6 md:p-12">
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-between mb-12">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className={`h-1 flex-1 mx-1 ${step >= i ? 'bg-gold-500' : 'bg-white/10'}`}></div>
                    ))}
                </div>

                {/* Step 1: Category */}
                {step === 1 && (
                    <div className="animate-fade-in">
                        <h2 className="text-3xl font-black mb-8 uppercase tracking-widest">Qui est le client ?</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <button onClick={() => { setBookingData({ ...bookingData, category: 'adult' }); nextStep(); }} className="flex flex-col items-center p-10 border border-white/10 bg-dark-lighter hover:border-gold-500 transition-all group">
                                <UserRound size={64} className="mb-4 group-hover:text-gold-500" />
                                <span className="text-xl font-bold uppercase">Adulte</span>
                            </button>
                            <button onClick={() => { setBookingData({ ...bookingData, category: 'child' }); nextStep(); }} className="flex flex-col items-center p-10 border border-white/10 bg-dark-lighter hover:border-gold-500 transition-all group">
                                <Baby size={64} className="mb-4 group-hover:text-gold-500" />
                                <span className="text-xl font-bold uppercase">Enfant</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Service */}
                {step === 2 && (
                    <div className="animate-fade-in">
                        <h2 className="text-3xl font-black mb-8 uppercase tracking-widest">Choisir un service</h2>
                        <div className="space-y-4">
                            {filteredServices.map(service => (
                                <div key={service.id} onClick={() => { setBookingData({ ...bookingData, service }); nextStep(); }} className="flex justify-between items-center p-6 border border-white/10 bg-dark-lighter hover:border-gold-500 cursor-pointer group">
                                    <div>
                                        <h3 className="text-xl font-bold uppercase group-hover:text-gold-400">{service.name}</h3>
                                        <p className="text-gray-500 text-sm flex items-center gap-2 mt-1"><Clock size={14} /> {service.duration} min</p>
                                    </div>
                                    <span className="text-gold-500 font-black text-2xl">{service.price} DA</span>
                                </div>
                            ))}
                        </div>
                        <button onClick={prevStep} className="mt-8 text-gray-500 hover:text-white flex items-center gap-2"><ChevronLeft size={20} /> Retour</button>
                    </div>
                )}

                {/* Step 3: Barber */}
                {step === 3 && (
                    <div className="animate-fade-in">
                        <h2 className="text-3xl font-black mb-8 uppercase tracking-widest">Choisir votre Barbier</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                            {barbers.map(barber => (
                                <div key={barber.id} onClick={() => { if (barber.status === 'active') { setBookingData({ ...bookingData, barber }); nextStep(); } }} className={`flex items-center gap-4 p-4 border transition-all ${barber.status !== 'active' ? 'opacity-50 cursor-not-allowed border-red-900/20' : bookingData.barber?.id === barber.id ? 'border-gold-500 bg-gold-900/10 cursor-pointer' : 'border-white/10 bg-dark-lighter cursor-pointer hover:border-gold-500'}`}>
                                    <div className="relative">
                                        <img src={barber.photo_url || 'https://api.placeholder.com/100/100'} alt={barber.name} className="w-16 h-16 rounded-full border-2 border-white/10" />
                                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-dark-lighter ${barber.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold uppercase">{barber.name} {barber.status !== 'active' && <span className="text-[10px] text-red-500">(Indisponible)</span>}</h3>
                                        <p className="text-gray-500 text-xs">{barber.specialty}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={prevStep} className="mt-8 text-gray-500 hover:text-white flex items-center gap-2"><ChevronLeft size={20} /> Retour</button>
                    </div>
                )}

                {/* Step 4: Mode */}
                {step === 4 && (
                    <div className="animate-fade-in">
                        <h2 className="text-3xl font-black mb-8 uppercase tracking-widest">Mode de passage</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <button onClick={() => { setBookingData({ ...bookingData, mode: 'queue' }); setStep(6); }} className="p-8 border border-white/10 bg-dark-lighter hover:border-gold-500 text-left group transition-all">
                                <p className="text-2xl font-bold uppercase mb-3 group-hover:text-gold-400 text-gold-500">File d'attente</p>
                                <p className="text-gray-500 text-sm leading-relaxed">Passez selon l'ordre d'arrivée dès que le barbier se libère.</p>
                            </button>
                            <button onClick={() => { setBookingData({ ...bookingData, mode: 'appointment' }); setStep(5); }} className="p-8 border border-white/10 bg-dark-lighter hover:border-gold-500 text-left group transition-all">
                                <p className="text-2xl font-bold uppercase mb-3 group-hover:text-gold-400 text-gold-500">Rendez-vous</p>
                                <p className="text-gray-500 text-sm leading-relaxed">Réservez un créneau horaire précis pour éviter l'attente.</p>
                            </button>
                        </div>
                        <button onClick={prevStep} className="mt-8 text-gray-500 hover:text-white flex items-center gap-2"><ChevronLeft size={20} /> Retour</button>
                    </div>
                )}

                {/* Step 5: Date & Time (Selection only in Appointment mode) */}
                {step === 5 && (
                    <div className="animate-fade-in">
                        <h2 className="text-3xl font-black mb-8 uppercase tracking-widest">Date & Heure</h2>
                        <div className="space-y-8">
                            <div>
                                <label className="block text-gray-400 uppercase text-xs font-bold mb-4 tracking-widest">Choisir une date</label>
                                <input
                                    type="date"
                                    value={bookingData.date}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                                    className="w-full bg-dark-lighter border border-white/10 p-4 focus:border-gold-500 outline-none transition-all font-bold text-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 uppercase text-xs font-bold mb-4 tracking-widest">Heures disponibles</label>
                                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                                    {timeSlots.map(time => {
                                        const isTaken = existingBookings.some(b =>
                                            b.barber_id === bookingData.barber?.id &&
                                            b.status !== 'cancelled' && b.status !== 'finished' &&
                                            b.scheduled_time?.startsWith(`${bookingData.date}T${time}`)
                                        );

                                        return (
                                            <button
                                                key={time}
                                                onClick={() => !isTaken && setBookingData({ ...bookingData, time })}
                                                disabled={isTaken}
                                                className={`p-3 border font-bold transition-all relative overflow-hidden ${bookingData.time === time
                                                    ? 'bg-gold-500 text-black border-gold-500'
                                                    : isTaken
                                                        ? 'bg-red-900/10 border-red-900/20 text-red-900 cursor-not-allowed opacity-50'
                                                        : 'bg-dark-lighter border-white/10 text-gray-400 hover:border-gold-500/50'
                                                    }`}
                                            >
                                                {time}
                                                {isTaken && <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[8px] uppercase tracking-widest text-white font-black">Pris</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between mt-12">
                            <button onClick={prevStep} className="text-gray-500 hover:text-white flex items-center gap-2"><ChevronLeft size={20} /> Retour</button>
                            <button
                                onClick={nextStep}
                                disabled={!bookingData.time}
                                className={`bg-gold-600 text-black px-8 py-3 font-bold uppercase tracking-widest transition-all ${!bookingData.time ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gold-700'}`}
                            >
                                Suivant <ChevronRight size={20} className="inline" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 6: Info & Confirm */}
                {step === 6 && (
                    <div className="animate-fade-in">
                        <h2 className="text-3xl font-black mb-8 uppercase tracking-widest">Finaliser</h2>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-gray-400 uppercase text-xs font-bold mb-2 tracking-widest">Nom complet</label>
                                <input type="text" placeholder="Votre nom" className="w-full bg-dark-lighter border border-white/10 p-4 focus:border-gold-500 outline-none transition-all font-bold" onChange={(e) => setBookingData({ ...bookingData, client: { ...bookingData.client, name: e.target.value } })} />
                            </div>
                            <div>
                                <label className="block text-gray-400 uppercase text-xs font-bold mb-2 tracking-widest">Numéro de téléphone</label>
                                <input type="tel" placeholder="05 XX XX XX XX" className="w-full bg-dark-lighter border border-white/10 p-4 focus:border-gold-500 outline-none transition-all font-bold" onChange={(e) => setBookingData({ ...bookingData, client: { ...bookingData.client, phone: e.target.value } })} />
                            </div>

                            <div className="p-6 bg-gold-900/5 border border-gold-500/20 mt-8">
                                <h4 className="font-bold text-gold-500 uppercase tracking-widest mb-4">Récapitulatif</h4>
                                <div className="space-y-3 text-sm">
                                    <p className="flex justify-between border-b border-white/5 pb-2"><span>Service:</span> <span className="text-white font-bold">{bookingData.service?.name}</span></p>
                                    <p className="flex justify-between border-b border-white/5 pb-2"><span>Barbier:</span> <span className="text-white font-bold">{bookingData.barber?.name}</span></p>
                                    <p className="flex justify-between border-b border-white/5 pb-2"><span>Mode:</span> <span className="text-white uppercase font-bold">{bookingData.mode === 'queue' ? 'File d\'attente' : 'Rendez-vous'}</span></p>
                                    {bookingData.mode === 'appointment' && (
                                        <p className="flex justify-between border-b border-white/5 pb-2"><span>Date & Heure:</span> <span className="text-gold-400 font-bold">{bookingData.date} à {bookingData.time}</span></p>
                                    )}
                                    <p className="flex justify-between font-bold text-xl mt-4 pt-4"><span>Total:</span> <span className="text-gold-500">{bookingData.service?.price} DA</span></p>
                                </div>
                            </div>

                            <button className={`w-full bg-gold-600 hover:bg-gold-700 text-black py-5 font-black uppercase tracking-widest text-lg transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={handleConfirm} disabled={loading || !bookingData.client.name || !bookingData.client.phone}>
                                {loading ? 'Envoi...' : 'Confirmer la réservation'}
                            </button>
                        </div>
                        <button onClick={prevStep} className="mt-8 text-gray-500 hover:text-white flex items-center gap-2"><ChevronLeft size={20} /> Retour</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Booking;
