/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ShoppingBag, Menu, X, MessageSquare, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getProducts, Product } from './services/store';

// Pages
import Home from './pages/Home';
import Shop from './pages/Shop';
import Admin from './pages/Admin';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import Cart from './pages/Cart';
import TrackOrder from './pages/TrackOrder';
import AIChatbot from './components/AIChatbot';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const links = [
    { name: 'HOME', path: '/' },
    { name: 'SHOP', path: '/shop' },
    { name: 'TRACK', path: '/track' },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="text-2xl font-black tracking-tighter hover:opacity-80 transition-opacity">
          CARTHENA
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-12">
          {links.map((link) => (
            <Link 
              key={link.name} 
              to={link.path}
              className={`text-xs font-bold tracking-widest hover:text-zinc-500 transition-colors ${
                location.pathname === link.path ? 'border-b-2 border-ink' : ''
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center space-x-6">
          <Link to="/track" className="hover:opacity-60 transition-opacity">
            <Heart size={20} />
          </Link>
          <Link to="/cart" className="hover:opacity-60 transition-opacity">
            <ShoppingBag size={20} />
          </Link>
          <Link to="/shop" className="hover:opacity-60 transition-opacity">
            <ShoppingBag size={20} />
          </Link>
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-0 w-full bg-white border-b border-zinc-100 p-8 flex flex-col space-y-6 md:hidden shadow-xl"
          >
            {links.map((link) => (
              <Link 
                key={link.name} 
                to={link.path}
                onClick={() => setIsOpen(false)}
                className="text-xl font-bold tracking-tight"
              >
                {link.name}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default function App() {
  const [showAI, setShowAI] = useState(false);

  return (
    <Router>
      <AppContent showAI={showAI} setShowAI={setShowAI} />
    </Router>
  );
}

function AppContent({ showAI, setShowAI }: { showAI: boolean, setShowAI: (v: boolean) => void }) {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-beige flex flex-col">
      {!isAdminPage && <Navbar />}
      
      <main className={`flex-grow ${isAdminPage ? '' : 'pt-20'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/:id" element={<Checkout />} />
          <Route path="/track" element={<TrackOrder />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>

      {!isAdminPage && (
        <footer className="bg-ink text-beige py-20 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="max-w-sm">
              <h3 className="text-3xl font-black mb-6">CARTHENA</h3>
              <p className="text-zinc-500 leading-relaxed font-light">
                Modern streetwear built for the oversized generation. 
                Premium quality, timeless silhouettes.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-12">
              <div>
                <h4 className="font-bold text-xs tracking-widest mb-6 opacity-30">SHOP</h4>
                <ul className="space-y-4">
                  <li><Link to="/shop" className="hover:underline">All Products</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-xs tracking-widest mb-6 opacity-30">SERVICES</h4>
                <ul className="space-y-4">
                  <li><button onClick={() => setShowAI(true)} className="hover:underline text-left">AI Stylist</button></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto pt-20 border-t border-white/10 mt-20 text-xs font-mono opacity-30 flex justify-between">
            <span>© 2026 CARTHENA INC.</span>
            <span>ALGERIA, DZ.</span>
          </div>
        </footer>
      )}

      {/* AI Stylist Button - Only on visitor pages */}
      {!isAdminPage && (
        <motion.button
          id="ai-trigger"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAI(true)}
          className="fixed bottom-8 right-8 bg-ink text-beige w-16 h-16 rounded-full flex items-center justify-center shadow-2xl z-40"
        >
          <MessageSquare size={24} />
        </motion.button>
      )}

      {!isAdminPage && <AIChatbot isOpen={showAI} onClose={() => setShowAI(false)} />}
    </div>
  );
}
