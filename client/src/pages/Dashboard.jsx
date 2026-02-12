import React, { useState, useEffect } from 'react';
import {
    Play, Check, X, Power, Coffee, Users,
    BarChart3, LayoutDashboard, UserSquare2,
    Calendar, TrendingUp, ShieldAlert,
    ArrowUp, ArrowDown, UserPlus, LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { API_URL, SOCKET_URL } from '../config';

const socket = io(SOCKET_URL);
const BARBER_ID = 1; // Defaulting to Miloud for this dashboard instance

const Dashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('queue'); // queue, clients, team, analytics
    const [barber, setBarber] = useState(null);
    const [queue, setQueue] = useState([]);
    const [clients, setClients] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    // Walk-in Modal State
    const [showWalkInModal, setShowWalkInModal] = useState(false);
    const [walkInName, setWalkInName] = useState('');
    const [walkInPhone, setWalkInPhone] = useState('');
    const [services, setServices] = useState([]);
    const [walkInServiceId, setWalkInServiceId] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('barber_token');
        if (!token) {
            navigate('/login');
            return;
        }

        fetchData();
        socket.emit('join_queue_room', BARBER_ID);
        socket.on('refresh_queue', () => fetchData());
        return () => socket.off('refresh_queue');
    }, [navigate]);

    const fetchData = async () => {
        try {
            const [barbersRes, bookingsRes, clientsRes, analyticsRes, servicesRes] = await Promise.all([
                axios.get(`${API_URL}/barbers`),
                axios.get(`${API_URL}/bookings`),
                axios.get(`${API_URL}/clients`),
                axios.get(`${API_URL}/analytics/summary`),
                axios.get(`${API_URL}/services`)
            ]);

            const currentBarber = barbersRes.data.find(b => b.id === BARBER_ID);
            setBarber(currentBarber);
            setServices(servicesRes.data || []);
            if (servicesRes.data && servicesRes.data.length > 0) {
                setWalkInServiceId(servicesRes.data[0].id);
            }

            const activeQueue = bookingsRes.data.filter(b =>
                b.barber_id === BARBER_ID &&
                (b.status === 'waiting' || b.status === 'on_chair')
            ).sort((a, b) => {
                // Priority 1: On Chair at the top
                if (a.status === 'on_chair' && b.status !== 'on_chair') return -1;
                if (b.status === 'on_chair' && a.status !== 'on_chair') return 1;
                // Priority 2: Position for waiting clients
                return (a.position || 0) - (b.position || 0);
            });

            setQueue(activeQueue);
            setClients(clientsRes.data);
            setAnalytics(analyticsRes.data);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleBarberStatus = async () => {
        if (!barber) return;
        const newStatus = barber.status === 'active' ? 'break' : 'active';
        try {
            await axios.patch(`${API_URL}/barbers/${BARBER_ID}`, { status: newStatus });
            setBarber({ ...barber, status: newStatus });
            socket.emit('queue_update', { barberId: BARBER_ID, type: 'status_change' });
        } catch (err) { console.error(err); }
    };

    const handleAction = async (id, action) => {
        let newStatus = '';
        if (action === 'call') newStatus = 'on_chair';
        else if (action === 'finish') newStatus = 'finished';
        else if (action === 'cancel') newStatus = 'cancelled';

        try {
            await axios.patch(`${API_URL}/bookings/${id}`, { status: newStatus });
            socket.emit('queue_update', { barberId: BARBER_ID, type: 'move' });
            fetchData();
        } catch (err) { console.error(err); }
    };

    const blockClient = async (id, isBlocked) => {
        try {
            await axios.patch(`${API_URL}/clients/${id}`, { is_blocked: isBlocked ? 1 : 0 });
            fetchData();
        } catch (err) { console.error(err); }
    };

    const handleLogout = () => {
        localStorage.removeItem('barber_token');
        navigate('/login');
    };

    const handleReorder = async (index, direction) => {
        const item1 = queue[index];
        const item2 = direction === 'up' ? queue[index - 1] : queue[index + 1];

        if (!item1 || !item2) return;

        try {
            // Swap positions
            await axios.post(`${API_URL}/bookings/reorder`, {
                id1: item1.id, position1: item2.position || item2.id, // Fallback to ID if pos is null, but API should handle better
                id2: item2.id, position2: item1.position || item1.id
            });
            socket.emit('queue_update', { barberId: BARBER_ID, type: 'reorder' });
            fetchData();
        } catch (err) { console.error(err); }
    };

    const handleWalkInSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/bookings`, {
                client_name: walkInName,
                client_phone: walkInPhone,
                barber_id: BARBER_ID,
                service_id: walkInServiceId,
                type: 'queue',
                scheduled_time: null
            });
            setShowWalkInModal(false);
            setWalkInName('');
            setWalkInPhone('');
            socket.emit('queue_update', { barberId: BARBER_ID, type: 'join' });
            fetchData();
        } catch (err) { console.error(err); }
    };

    if (loading) return <div className="min-h-screen bg-dark text-white flex items-center justify-center font-black uppercase tracking-widest animate-pulse">Chargement du CRM...</div>;

    return (
        <div className="min-h-screen bg-dark text-white font-sans flex flex-col md:flex-row relative">

            {/* Walk-in Modal */}
            {showWalkInModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-dark-lighter border border-white/10 p-8 w-full max-w-md relative">
                        <button onClick={() => setShowWalkInModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={24} /></button>
                        <h2 className="text-2xl font-black uppercase mb-6">Ajout Rapide</h2>
                        <form onSubmit={handleWalkInSubmit} className="space-y-4">
                            <input type="text" placeholder="Nom du client" value={walkInName} onChange={(e) => setWalkInName(e.target.value)} className="w-full bg-dark border border-white/10 p-3 font-bold outline-none focus:border-gold-500" required />
                            <input type="tel" placeholder="Téléphone" value={walkInPhone} onChange={(e) => setWalkInPhone(e.target.value)} className="w-full bg-dark border border-white/10 p-3 font-bold outline-none focus:border-gold-500" required />

                            <select
                                value={walkInServiceId}
                                onChange={(e) => setWalkInServiceId(e.target.value)}
                                className="w-full bg-dark border border-white/10 p-3 font-bold outline-none focus:border-gold-500 text-white"
                            >
                                {services.map(s => (
                                    <option key={s.id} value={s.id} className="bg-dark text-white">
                                        {s.name} ({s.price} DA)
                                    </option>
                                ))}
                            </select>
                            <div className="pt-4 flex gap-4">
                                <button type="button" onClick={() => setShowWalkInModal(false)} className="flex-1 border border-white/10 py-3 font-bold uppercase hover:bg-white/5">Annuler</button>
                                <button type="submit" className="flex-1 bg-gold-600 text-black py-3 font-bold uppercase hover:bg-gold-700">Ajouter</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sidebar Navigation */}
            <aside className="w-full md:w-64 bg-dark-lighter border-r border-white/5 p-6 flex flex-col gap-8">
                <div className="mb-4">
                    <h1 className="text-xl font-black text-gold-500 tracking-tighter uppercase italic">Look At Me <span className="text-white not-italic">CRM</span></h1>
                </div>

                <nav className="flex flex-col gap-2">
                    {[
                        { id: 'queue', label: 'File Live', icon: LayoutDashboard },
                        { id: 'clients', label: 'Clients', icon: Users },
                        { id: 'team', label: 'Equipe', icon: UserSquare2 },
                        { id: 'analytics', label: 'Analytique', icon: BarChart3 },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex items-center gap-3 px-4 py-3 font-bold uppercase text-xs tracking-widest transition-all ${activeTab === item.id ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' : 'text-gray-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <item.icon size={18} /> {item.label}
                        </button>
                    ))}
                </nav>

                <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                        <img src={barber?.photo_url || "https://api.placeholder.com/40/40"} alt="Avatar" className="w-10 h-10 rounded-full border border-gold-500" />
                        <div>
                            <p className="text-sm font-bold truncate">{barber?.name}</p>
                            <span className="text-[10px] text-gold-500 uppercase font-black tracking-widest">Barbier Pro</span>
                        </div>
                    </div>
                    <button onClick={toggleBarberStatus} className={`w-full py-3 text-[10px] font-black uppercase tracking-widest border transition-all ${barber?.status === 'active' ? 'border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white' : 'border-green-500/20 text-green-500 hover:bg-green-500 hover:text-white'
                        }`}>
                        {barber?.status === 'active' ? 'Passer en Pause' : 'Reprendre'}
                    </button>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase text-gray-500 hover:text-white">
                        <LogOut size={14} /> Déconnexion
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-6 md:p-10 overflow-y-auto">

                {/* View: Live Queue */}
                {activeTab === 'queue' && (
                    <div className="animate-fade-in">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight">Gestion <span className="text-gold-500">Live</span></h2>
                                <p className="text-gray-500 text-xs mt-1 font-bold uppercase">Contrôle total du flux</p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowWalkInModal(true)}
                                    className="bg-white text-black px-6 py-3 font-bold uppercase tracking-widest text-xs hover:bg-gray-200 flex items-center gap-2"
                                >
                                    <UserPlus size={16} /> Ajout Rapide
                                </button>
                                <div className="flex items-center gap-2 text-xs font-bold text-gold-400 ring-1 ring-gold-400/20 px-4 py-2 uppercase">
                                    <span className="w-2 h-2 bg-gold-400 rounded-full animate-pulse"></span> Synchronisé
                                </div>
                            </div>
                        </div>

                        <div className="bg-dark-lighter border border-white/5">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                                <h3 className="font-bold uppercase tracking-widest text-sm">File de passage</h3>
                                {queue.some(b => b.status === 'on_chair') && (
                                    <span className="text-[10px] font-black uppercase text-gold-500 animate-pulse">Session en cours</span>
                                )}
                            </div>
                            <div className="divide-y divide-white/5">
                                {queue.length === 0 ? (
                                    <div className="p-12 text-center text-gray-500 uppercase font-bold text-xs tracking-widest">Aucune activité pour le moment</div>
                                ) : (
                                    queue.map((item, idx) => (
                                        <div key={item.id} className={`p-6 flex flex-col md:flex-row justify-between items-center gap-6 ${item.status === 'on_chair' ? 'bg-gold-500/[0.03] border-l-4 border-l-gold-500' : 'hover:bg-white/[0.01]'}`}>
                                            <div className="flex items-center gap-6">
                                                <div className="flex flex-col items-center gap-1">
                                                    {idx > 0 && <button onClick={() => handleReorder(idx, 'up')} className="text-gray-600 hover:text-gold-500"><ArrowUp size={14} /></button>}
                                                    <span className="text-2xl font-black text-white/10 w-8 text-center">{idx + 1}</span>
                                                    {idx < queue.length - 1 && <button onClick={() => handleReorder(idx, 'down')} className="text-gray-600 hover:text-gold-500"><ArrowDown size={14} /></button>}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold flex items-center gap-3 uppercase">
                                                        {item.client_name}
                                                        {item.type === 'appointment' && <span className="bg-purple-500/10 text-purple-400 text-[8px] px-2 py-0.5 border border-purple-500/20 rounded-full">RDV {item.scheduled_time?.split('T')[1].substring(0, 5)}</span>}
                                                        {item.status === 'on_chair' && <span className="bg-gold-500 text-black text-[8px] px-2 py-0.5 font-black rounded-sm">SUR CHAISE</span>}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 uppercase mt-1">{item.service_name || 'Coupe Standard'} • <span className="text-gold-500/80">{item.service_price} DA</span></p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {item.status === 'waiting' && (
                                                    <button
                                                        onClick={() => handleAction(item.id, 'call')}
                                                        disabled={queue.some(b => b.status === 'on_chair')}
                                                        className={`px-6 py-3 border border-white/10 font-black text-[10px] uppercase tracking-widest transition-all ${queue.some(b => b.status === 'on_chair')
                                                            ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                                                            : 'bg-white/5 text-white hover:bg-gold-500 hover:text-black hover:border-gold-500'
                                                            }`}
                                                    >
                                                        Appeler
                                                    </button>
                                                )}
                                                {item.status === 'on_chair' && <button onClick={() => handleAction(item.id, 'finish')} className="px-6 py-3 bg-green-500 text-black font-black text-[10px] uppercase tracking-widest hover:bg-green-600 transition-all">Terminer</button>}
                                                <button onClick={() => handleAction(item.id, 'cancel')} className="p-3 border border-white/10 hover:bg-red-500 text-gray-500 hover:text-white transition-all"><X size={16} /></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* View: Clients (Simplified for brevtiy, reusing previous logic but keeping structure) */}
                {activeTab === 'clients' && (
                    <div className="animate-fade-in">
                        <h2 className="text-3xl font-black uppercase mb-10">Base <span className="text-gold-500">Clients</span></h2>
                        <div className="bg-dark-lighter border border-white/5">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white/[0.02] border-b border-white/5 uppercase text-[10px] font-black tracking-widest text-gray-500">
                                    <tr>
                                        <th className="p-6">Nom & Tel</th>
                                        <th className="p-6">Préférences</th>
                                        <th className="p-6">No-Shows</th>
                                        <th className="p-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {clients.map(c => (
                                        <tr key={c.id} className={`hover:bg-white/[0.01] ${c.is_blocked ? 'opacity-50 grayscale' : ''}`}>
                                            <td className="p-6">
                                                <p className="font-bold uppercase">{c.name}</p>
                                                <p className="text-xs text-gray-500">{c.phone}</p>
                                            </td>
                                            <td className="p-6 text-gray-400 italic text-xs">{c.preferences || 'Aucune préférence notée'}</td>
                                            <td className="p-6">
                                                <span className={`font-black ${c.no_show_count > 0 ? 'text-red-500' : 'text-gray-500'}`}>{c.no_show_count}</span>
                                            </td>
                                            <td className="p-6 text-right">
                                                <button
                                                    onClick={() => blockClient(c.id, !c.is_blocked)}
                                                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${c.is_blocked ? 'bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500 hover:text-white' : 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white'
                                                        }`}
                                                >
                                                    {c.is_blocked ? 'Débloquer' : 'Bloquer'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* View: Team (Same as before) */}
                {activeTab === 'team' && (
                    <div className="animate-fade-in text-center py-20 bg-dark-lighter border border-white/5">
                        <UserSquare2 className="mx-auto mb-6 text-gold-500" size={48} />
                        <h2 className="text-2xl font-black uppercase mb-4">Gestion d'Equipe</h2>
                        <div className="bg-dark border border-white/10 p-6 inline-block text-left min-w-[300px]">
                            <p className="text-[10px] uppercase font-black text-gray-500 mb-4">Miloud (Equipe Matin)</p>
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-bold">Heure de début:</span>
                                <input type="time" defaultValue="09:00" className="bg-dark-lighter border border-white/10 px-3 py-1 text-sm rounded outline-none" />
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold">Heure de fin:</span>
                                <input type="time" defaultValue="20:00" className="bg-dark-lighter border border-white/10 px-3 py-1 text-sm rounded outline-none" />
                            </div>
                        </div>
                    </div>
                )}

                {/* View: Analytics (Same as before) */}
                {activeTab === 'analytics' && (
                    <div className="animate-fade-in">
                        <h2 className="text-3xl font-black uppercase mb-10">Statistiques <span className="text-gold-500">Business</span></h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                            <div className="bg-dark-lighter p-10 border border-white/5 text-center relative overflow-hidden">
                                <TrendingUp className="absolute top-4 right-4 text-green-500/20" size={32} />
                                <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-4">Chiffre d'Affaire Total</p>
                                <p className="text-6xl font-black text-gold-500">{analytics?.totalRevenue || 0} <span className="text-2xl">DA</span></p>
                            </div>
                            <div className="bg-dark-lighter p-8 border border-white/5">
                                <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Performance Individuelle</p>
                                <div className="space-y-6">
                                    {analytics?.barberPerformance.map(p => (
                                        <div key={p.name}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold uppercase">{p.name}</span>
                                                <span className="text-xs text-gold-500 font-black">{p.revenue || 0} DA</span>
                                            </div>
                                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gold-500"
                                                    style={{ width: `${Math.min(100, (p.revenue / (analytics.totalRevenue || 1)) * 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;
