import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, TrendingUp, ShieldCheck, Instagram, Facebook } from 'lucide-react';
import { getProducts, Product } from '../services/store';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    getProducts().then(all => setProducts(all.slice(0, 3)));
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[75vh] sm:h-[90vh] flex items-center justify-center overflow-hidden bg-zinc-900">
        <div className="absolute inset-0 opacity-40">
          <img 
            src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=2000" 
            alt="Hero Streetwear" 
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 text-center px-6">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-7xl lg:text-8xl font-black tracking-tighter text-beige mb-8"
          >
            THE NEW ERA OF <br /> STREETWEAR.
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Link to="/shop" className="btn-primary inline-flex items-center gap-3 text-lg">
              SHOP COLLECTION <ArrowRight size={20} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Featured Collection */}
      <section className="py-16 sm:py-32 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-end mb-10 sm:mb-16 gap-4">
          <div>
            <h2 className="text-4xl font-black tracking-tight mb-4 uppercase">Latest Drops</h2>
            <p className="text-zinc-500 max-w-md">Limited release silhouettes designed with attention to every seam.</p>
          </div>
          <Link to="/shop" className="font-bold text-xs tracking-widest border-b-2 border-ink pb-2 hover:opacity-60 transition-opacity">
            VIEW ALL
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
          {products.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="group cursor-pointer"
            >
              <Link to={`/product/${product.id}`}>
                <div className="aspect-[3/4] overflow-hidden bg-zinc-100 mb-6">
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    loading="lazy"
                    decoding="async"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold tracking-widest opacity-30 mb-1">{product.brand.toUpperCase()}</p>
                    <h3 className="text-lg font-bold group-hover:underline">{product.name}</h3>
                  </div>
                  <p className="font-bold text-lg">{product.price.toLocaleString()} DZD</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Value Proposition */}
      <section className="bg-white py-32 border-y border-zinc-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-20">
          <div className="text-center md:text-left">
            <div className="w-12 h-12 bg-beige rounded-full flex items-center justify-center mb-8 mx-auto md:mx-0">
              <TrendingUp size={24} />
            </div>
            <h4 className="text-xl font-bold mb-4">Trendsetting Styles</h4>
            <p className="text-zinc-500 font-light leading-relaxed">Carefully curated styles from baggy trousers to old money minimalism.</p>
          </div>
          <div className="text-center md:text-left">
            <div className="w-12 h-12 bg-beige rounded-full flex items-center justify-center mb-8 mx-auto md:mx-0">
              <ShieldCheck size={24} />
            </div>
            <h4 className="text-xl font-bold mb-4">Premium Quality</h4>
            <p className="text-zinc-500 font-light leading-relaxed">We focus on high-gsm fabrics and durable construction for longevity.</p>
          </div>
          <div className="text-center md:text-left">
            <div className="w-12 h-12 bg-beige rounded-full flex items-center justify-center mb-8 mx-auto md:mx-0">
              <Star size={24} />
            </div>
            <h4 className="text-xl font-bold mb-4">AI Recommendations</h4>
            <p className="text-zinc-500 font-light leading-relaxed">Our Gemini-powered stylist helps you find the perfect outfit in seconds.</p>
          </div>
        </div>
      </section>

      {/* Google Maps Section */}
      <section className="py-20 bg-zinc-50 font-sans">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-black uppercase mb-12 text-center">Visitez Notre Boutique</h2>
          <div className="w-full h-[400px] bg-zinc-200 grayscale hover:grayscale-0 transition-all duration-700 overflow-hidden shadow-2xl">
            <iframe 
              src="https://maps.google.com/maps?q=Boutique%20carthena%2C%20W395%2BGJQ%2C%20Mostaganem&t=&z=15&ie=UTF8&iwloc=&output=embed" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={true} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </section>

      {/* Social Links / Footer CTA */}
      <section className="py-40 px-6 text-center bg-white border-t border-zinc-100">
        <h2 className="text-5xl md:text-7xl font-black tracking-tight mb-12 uppercase">Join The Club.</h2>
        <div className="flex flex-wrap justify-center gap-8">
          <a 
            href="https://www.instagram.com/carthena_boutique27/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-8 py-4 bg-zinc-100 font-black tracking-widest uppercase hover:bg-zinc-200 transition-colors"
          >
            <Instagram size={24} /> Instagram
          </a>
          <a 
            href="https://www.tiktok.com/@hamzacheikh73?_r=1&_t=ZS-95vj4fSMTsQ" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-8 py-4 bg-zinc-100 font-black tracking-widest uppercase hover:bg-zinc-200 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.13-1.47-.13-.08-.26-.17-.38-.26v5.48c.01 3.82-2.06 6.13-5.14 7.42-2.8 1.17-6.07.69-8.43-1.39-2.31-2.05-3.32-5.46-2.14-8.3 1.11-2.67 3.89-4.8 6.78-4.76v4.11c-.93-.07-1.92.17-2.65.73l-.15.13c-.93.89-1.22 2.22-.81 3.44.49 1.48 2.02 2.37 3.52 2.1 1.08-.2 1.91-1.02 2.06-2.1l.01-.13V.02h-.01z" />
            </svg> 
            TikTok
          </a>
          <a 
            href="https://www.facebook.com/carthenamenswear" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-8 py-4 bg-zinc-100 font-black tracking-widest uppercase hover:bg-zinc-200 transition-colors"
          >
            <Facebook size={24} /> Facebook
          </a>
        </div>
      </section>
    </div>
  );
}
