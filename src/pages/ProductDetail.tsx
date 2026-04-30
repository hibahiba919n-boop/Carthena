import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ShoppingBag, Truck, RotateCcw, ShieldCheck } from 'lucide-react';
import { getProducts, Product } from '../services/store';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  useEffect(() => {
    getProducts().then(products => {
      const found = products.find(p => p.id === id);
      if (found) setProduct(found);
    });
  }, [id]);

  useEffect(() => {
    if (product?.colorVariants?.length) {
      setSelectedColor(product.colorVariants[0].color);
    } else {
      setSelectedColor(null);
    }
  }, [product]);

  if (!product) return <div className="py-40 text-center font-mono opacity-50">DATA RECORD NOT FOUND</div>;

  const displayedSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const activeVariant = product.colorVariants?.find(v => v.color === selectedColor) || product.colorVariants?.[0];
  const availableSizes = activeVariant?.availableSizes || [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
      <Link to="/shop" className="inline-flex items-center gap-2 text-xs font-bold tracking-widest opacity-40 hover:opacity-100 transition-opacity mb-12 uppercase">
        <ArrowLeft size={14} /> Back to Catalog
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24">
        {/* Product Image */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="aspect-[3/4] bg-white overflow-hidden border border-zinc-100"
        >
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        </motion.div>

        {/* Product Info */}
        <motion.div
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           className="flex flex-col"
        >
          <span className="text-xs font-black tracking-[0.3em] opacity-30 uppercase mb-4">{product.brand}</span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-6">{product.name}</h1>
          
          <div className="flex items-center gap-4 mb-10">
            {product.isOnPromo && product.discountedPrice ? (
              <>
                <span className="text-3xl font-black">{product.discountedPrice.toLocaleString()} DZD</span>
                <span className="text-xl line-through opacity-30">{product.price.toLocaleString()} DZD</span>
              </>
            ) : (
              <span className="text-3xl font-black">{product.price.toLocaleString()} DZD</span>
            )}
          </div>

          <div className="prose prose-zinc mb-12">
            <p className="text-zinc-500 leading-relaxed font-light text-lg">
              {product.description}
            </p>
          </div>

          {!!product.colorVariants?.length && (
            <div className="mb-10">
              <p className="text-[10px] font-black tracking-widest opacity-40 uppercase mb-3">Couleur</p>
              <div className="flex flex-wrap gap-3">
                {product.colorVariants.map(variant => (
                  <button
                    key={variant.color}
                    type="button"
                    onClick={() => setSelectedColor(variant.color)}
                    className={`px-4 py-2 border text-xs font-bold uppercase tracking-widest ${
                      (selectedColor || activeVariant?.color) === variant.color
                        ? 'bg-ink text-beige border-ink'
                        : 'bg-white border-zinc-200 text-zinc-600'
                    }`}
                  >
                    {variant.color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!!availableSizes.length && (
            <div className="mb-12">
              <p className="text-[10px] font-black tracking-widest opacity-40 uppercase mb-3">Tailles</p>
              <div className="flex flex-wrap gap-3">
                {displayedSizes.map(size => {
                  const isAvailable = availableSizes.includes(size);
                  return (
                    <span
                      key={size}
                      className={`px-4 py-2 border text-xs font-bold uppercase tracking-widest ${
                        isAvailable
                          ? 'bg-white border-zinc-300 text-zinc-800'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-400 line-through'
                      }`}
                    >
                      {size}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 mb-12">
             <div className="bg-zinc-50 p-6 flex flex-col gap-4 border border-zinc-100">
               <span className="text-[10px] font-black tracking-widest opacity-40 uppercase">System Specifications</span>
               <div className="flex justify-between text-sm">
                 <span className="opacity-50">Style Profile</span>
                 <span className="font-bold uppercase tracking-widest">{product.style}</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="opacity-50">Inventory Status</span>
                 <span className={`font-bold uppercase tracking-widest ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                   {product.stock > 0 ? `${product.stock} Units Available` : 'Out of Stock'}
                 </span>
               </div>
             </div>
          </div>

          <button 
            disabled={product.stock <= 0}
            onClick={() => navigate(`/checkout/${product.id}`)}
            className="btn-primary flex items-center justify-center gap-4 text-xl py-5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ShoppingBag size={24} /> 
            {product.stock > 0 ? 'ACQUIRE NOW' : 'OUT OF STOCK'}
          </button>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 pt-8 border-t border-zinc-100">
             <div className="flex flex-col gap-2">
               <Truck size={18} className="opacity-40" />
               <span className="text-[10px] font-black tracking-widest uppercase">Rapid Transit</span>
               <p className="text-[10px] leading-tight opacity-40">Express delivery to all 58 Wilayas.</p>
             </div>
             <div className="flex flex-col gap-2">
               <RotateCcw size={18} className="opacity-40" />
               <span className="text-[10px] font-black tracking-widest uppercase">Quality Return</span>
               <p className="text-[10px] leading-tight opacity-40">30-day inspection period guaranteed.</p>
             </div>
             <div className="flex flex-col gap-2">
               <ShieldCheck size={18} className="opacity-40" />
               <span className="text-[10px] font-black tracking-widest uppercase">Secured Order</span>
               <p className="text-[10px] leading-tight opacity-40">Verified checkout sans account requirements.</p>
             </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
