import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, MapPin, Instagram, Facebook, Clock } from 'lucide-react';
import axios from 'axios';
import io from 'socket.io-client';
import { API_URL, SOCKET_URL } from '../config';
import { subscribeUser } from '../App';

const socket = io(SOCKET_URL);
const BARBER_ID = 1; // Defaulting to Miloud

const Home = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('active'); // active, break, closed

    const fetchStatus = async () => {
        try {
            const res = await axios.get(`${API_URL}/barbers`);
            const miloud = res.data.find(b => b.id === BARBER_ID);
            if (miloud) {
                setStatus(miloud.status);
            }
        } catch (err) {
            console.error('Error fetching status:', err);
        }
    };

    useEffect(() => {
        fetchStatus();

        socket.emit('join_queue_room', BARBER_ID);

        socket.on('refresh_queue', (data) => {
            console.log('Real-time status update received:', data);
            fetchStatus();
        });

        return () => {
            socket.off('refresh_queue');
        };
    }, []);

    return (
        <div className="min-h-screen bg-dark text-white font-sans selection:bg-gold-500/30">
            {/* Hero Section */}
            <section className="relative h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-black/60 z-10"></div>
                    <img
                        src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80"
                        alt="Barber Background"
                        className="w-full h-full object-cover"
                    />
                </div>

                <div className="relative z-20 max-w-4xl animate-fade-in-up">
                    <h2 className="text-gold-400 uppercase tracking-widest text-sm mb-4 font-bold">Look At Me Barbershop</h2>
                    <h1 className="text-6xl md:text-8xl font-black mb-6 leading-tight">
                        ALL EYES <br /> <span className="text-gold-500">ON YOU</span>
                    </h1>
                    <p className="text-gray-300 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
                        At Look at Me, every detail matters. From sharp fades to classic trims, we make sure your look turns heads the moment you walk out.
                    </p>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                        <button
                            onClick={() => navigate('/booking')}
                            className="bg-gold-600 hover:bg-gold-700 text-black px-12 py-4 rounded-none font-bold text-lg transition-all transform hover:scale-105 shadow-xl uppercase tracking-wider"
                        >
                            Prendre rendez-vous
                        </button>
                        <div className="flex items-center gap-3 bg-dark-lighter/80 backdrop-blur-md px-6 py-4 border border-white/10 min-w-[180px] justify-center">
                            <span className={`w-3 h-3 rounded-full ${status === 'active' ? 'bg-green-500' : status === 'break' ? 'bg-orange-500' : 'bg-red-500'
                                } animate-pulse`}></span>
                            <span className="font-semibold uppercase text-sm tracking-widest">
                                {status === 'active' ? 'Salon Ouvert' : status === 'break' ? 'En Pause' : 'Salon Fermé'}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Services Preview */}
            <section className="py-24 px-6 bg-dark-lighter">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                        <div className="flex-1">
                            <h2 className="text-gold-500 uppercase tracking-widest font-bold mb-4">Nos Services</h2>
                            <h3 className="text-4xl md:text-5xl font-bold">L'EXCELLENCE DE LA COUPE</h3>
                        </div>
                        <p className="flex-1 text-gray-400 max-w-md">
                            Précision et style dans chaque détail. Nos barbiers créent un look qui correspond à votre personnalité et à votre style de vie.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { title: 'Coupe Dégradé + Barbe', price: '500 DA', desc: 'Le combo parfait pour un look net et soigné.' },
                            { title: 'Coupe Dégradé + Kératine', price: '3000 DA', desc: 'Soin profond et coupe précise pour une allure premium.' },
                            { title: 'Nettoyage de Peau', price: '700 DA', desc: 'Un soin visage tonifiant pour une peau revitalisée.' }
                        ].map((item, i) => (
                            <div key={i} className="group p-8 border border-white/5 bg-dark hover:border-gold-500/50 transition-all duration-500 transform hover:-translate-y-2">
                                <div className="flex justify-between items-start mb-6">
                                    <h4 className="text-xl font-bold group-hover:text-gold-400 transition-colors uppercase tracking-tight">{item.title}</h4>
                                    <span className="text-gold-500 font-black text-2xl whitespace-nowrap">{item.price}</span>
                                </div>
                                <p className="text-gray-500 leading-relaxed mb-8">{item.desc}</p>
                                <div className="w-12 h-0.5 bg-gold-600 group-hover:w-full transition-all duration-500"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-dark py-20 px-6 border-t border-white/5">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16">
                    <div>
                        <h4 className="text-2xl font-bold mb-8">LOOK AT ME</h4>
                        <p className="text-gray-500 mb-8 leading-relaxed">
                            Le meilleur Barber Shop de la ville pour une expérience de soin premium et authentique.
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="p-3 bg-dark-lighter hover:text-gold-500 transition-colors"><Instagram size={20} /></a>
                            <a href="#" className="p-3 bg-dark-lighter hover:text-gold-500 transition-colors"><Facebook size={20} /></a>
                            <a href="#" className="p-3 bg-dark-lighter hover:text-gold-500 transition-colors"><MapPin size={20} /></a>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-lg font-bold mb-8 uppercase tracking-widest text-gold-500">Horaires</h4>
                        <ul className="space-y-4 text-gray-400">
                            <li className="flex justify-between border-b border-white/5 pb-2"><span>Lundi - Jeudi</span> <span>9:00 - 20:00</span></li>
                            <li className="flex justify-between border-b border-white/5 pb-2"><span>Vendredi</span> <span>14:30 - 20:00</span></li>
                            <li className="flex justify-between border-b border-white/5 pb-2"><span>Samedi</span> <span>9:00 - 21:00</span></li>
                            <li className="flex justify-between text-gold-500"><span>Dimanche</span> <span>Fermé</span></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-lg font-bold mb-8 uppercase tracking-widest text-gold-500">Contact</h4>
                        <p className="text-gray-400 flex items-center gap-3 mb-4"><MapPin size={18} /> Ain El Turk, Oran, Algérie</p>
                        <p className="text-gray-400 flex items-center gap-3 mb-4"><Clock size={18} /> +213 5XX XX XX XX</p>
                        <div className="mt-8 grayscale hover:grayscale-0 transition-all duration-700 border border-white/10 p-2">
                            <img src="https://api.placeholder.com/400/200" alt="Map Placeholder" className="w-full h-40 object-cover" />
                        </div>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-600 text-sm">
                    <p>© 2026 Look At Me Barbershop. All Rights Reserved.</p>
                    <button
                        onClick={async () => {
                            const sub = await subscribeUser();
                            if (sub) {
                                axios.post(`${API_URL}/test-push`, { subscription: sub })
                                    .then(() => alert("Test lancé ! Fermez l'application maintenant pour tester l'arrière-plan (5s)."))
                                    .catch(e => alert("Erreur: " + e.message));
                            } else {
                                alert("Veuillez autoriser les notifications dans les réglages du site/téléphone.");
                            }
                        }}
                        className="text-[10px] uppercase tracking-tighter opacity-20 hover:opacity-100 transition-opacity"
                    >
                        Tester les Notifications
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default Home;
