import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getProducts, Product, CATEGORIES, getWishlistProductIds, toggleWishlistProduct } from '../services/store';

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  useEffect(() => {
    getProducts().then(allProducts => {
      console.log("Shop: Loaded products", allProducts);
      setProducts(allProducts);
    }).catch(err => {
      console.error("Shop: Error loading products", err);
    });
    getWishlistProductIds().then(setWishlistIds).catch(console.error);
  }, []);

  const styles = CATEGORIES;

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const productStyle = (product.style || '').toLowerCase();
      const matchesStyle = activeFilter === 'all' || productStyle === activeFilter.toLowerCase();
      
      const searchLower = searchQuery.toLowerCase();
      const nameMatch = (product.name || '').toLowerCase().includes(searchLower);
      const brandMatch = (product.brand || '').toLowerCase().includes(searchLower);
      
      return matchesStyle && (nameMatch || brandMatch);
    });
  }, [products, activeFilter, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2 uppercase">The Catalog</h1>
          <p className="text-zinc-500">{filteredProducts.length} results found</p>
        </div>

        <div className="flex items-center gap-4">
          <input 
            type="text" 
            placeholder="SEARCH PRODUCTS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field max-w-xs py-2 h-12"
          />
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-6 h-12 border border-zinc-200 bg-white font-bold text-xs tracking-widest hover:border-ink transition-colors"
          >
             {showFilters ? <X size={16} /> : <SlidersHorizontal size={16} />} FILTERS
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-12 border-b border-zinc-100"
          >
            <div className="flex flex-wrap gap-4 pb-8">
              <button 
                onClick={() => setActiveFilter('all')}
                className={`px-8 py-3 rounded-full text-xs font-bold tracking-widest transition-all ${
                  activeFilter === 'all' ? 'bg-ink text-beige shadow-lg' : 'bg-white border border-zinc-200 text-zinc-500'
                }`}
              >
                ALL STYLES
              </button>
              {styles.map(style => (
                <button
                  key={style}
                  onClick={() => setActiveFilter(style as any)}
                  className={`px-8 py-3 rounded-full text-xs font-bold tracking-widest uppercase transition-all ${
                    activeFilter === style ? 'bg-ink text-beige shadow-lg' : 'bg-white border border-zinc-200 text-zinc-500'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
        {filteredProducts.map((product, idx) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group"
          >
            <Link to={`/product/${product.id}`}>
              <div className="aspect-[3/4] overflow-hidden bg-white mb-6 relative">
                {product.isOnPromo && (
                  <div className="absolute top-4 left-4 z-10 bg-red-600 text-white text-[10px] font-black tracking-widest px-3 py-1 uppercase">
                    SALE
                  </div>
                )}
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleWishlistProduct(product.id)
                      .then(() => getWishlistProductIds().then(setWishlistIds))
                      .catch(console.error);
                  }}
                  className="absolute top-4 right-4 z-10 bg-white/90 p-2 border border-zinc-200"
                >
                  <Heart size={14} className={wishlistIds.includes(product.id) ? 'fill-red-500 text-red-500' : ''} />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black tracking-widest opacity-30 uppercase">{product.brand}</span>
                <h3 className="text-xl font-bold tracking-tight h-14 line-clamp-2">{product.name}</h3>
                <div className="flex items-center gap-3">
                  {product.isOnPromo && product.discountedPrice ? (
                    <>
                      <span className="text-xl font-black">{product.discountedPrice.toLocaleString()} DZD</span>
                      <span className="text-sm line-through opacity-30">{product.price.toLocaleString()} DZD</span>
                    </>
                  ) : (
                    <span className="text-xl font-black">{product.price.toLocaleString()} DZD</span>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="py-40 text-center">
          <p className="text-zinc-400 font-mono text-sm uppercase tracking-widest">No products found for this selection.</p>
        </div>
      )}
    </div>
  );
}
