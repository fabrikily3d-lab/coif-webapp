import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import { Lock, User } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await axios.post(`${API_URL}/auth/login`, { username, password });
            if (res.data.success) {
                // Store minimal info in localStorage for simple persistence
                // In a real production app, we'd use HTTP-only cookies or JWT
                localStorage.setItem('barber_token', JSON.stringify(res.data.barber));
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Erreur de connexion');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark text-white flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-dark-lighter border border-white/5 p-8 md:p-12 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-500 to-transparent"></div>

                <div className="text-center mb-10">
                    <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-2">Look At Me <span className="text-gold-500">Pro</span></h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Espace Barbier</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                            <input
                                type="text"
                                placeholder="Identifiant"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-dark border border-white/10 p-4 pl-12 focus:border-gold-500 outline-none transition-all font-bold"
                            />
                        </div>
                    </div>
                    <div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                            <input
                                type="password"
                                placeholder="Mot de passe"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-dark border border-white/10 p-4 pl-12 focus:border-gold-500 outline-none transition-all font-bold"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold uppercase tracking-wide text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full bg-gold-600 hover:bg-gold-700 text-black py-4 font-black uppercase tracking-widest transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Connexion...' : 'Accéder au Dashboard'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
