import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Heart, ShoppingBag, Truck, ShieldCheck } from 'lucide-react';
import { addProductReview, addToCart, getProductReviews, getProducts, Product, Review, toggleWishlistProduct } from '../services/store';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    getProducts().then(products => {
      const found = products.find(p => p.id === id);
      if (found) {
        setProduct(found);
        setActiveImage(found.images?.[0] || found.imageUrl);
      }
    });
  }, [id]);

  useEffect(() => {
    if (product?.colorVariants?.length) {
      setSelectedColor(product.colorVariants[0].color);
    } else {
      setSelectedColor(null);
    }
  }, [product]);

  useEffect(() => {
    if (!id) return;
    getProductReviews(id).then(setReviews).catch(console.error);
  }, [id]);

  useEffect(() => {
    if (!product) return;
    document.title = `${product.name} | CARTHENA`;
    const desc = document.querySelector('meta[name="description"]') || (() => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'description');
      document.head.appendChild(m);
      return m;
    })();
    desc.setAttribute('content', product.description.slice(0, 155));
  }, [product]);

  if (!product) return <div className="py-40 text-center font-mono opacity-50">DATA RECORD NOT FOUND</div>;

  const displayedSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const activeVariant = product.colorVariants?.find(v => v.color === selectedColor) || product.colorVariants?.[0];
  const availableSizes = activeVariant?.availableSizes || [];
  const currentImage = activeImage || product.images?.[0] || product.imageUrl;

  const handleAddToCart = async () => {
    if (availableSizes.length && !selectedSize) {
      alert("Choisissez une taille.");
      return;
    }
    await addToCart(product, 1, selectedSize || undefined, selectedColor || undefined);
    alert("Ajouté au panier.");
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    await addProductReview(product.id, reviewName, reviewRating, reviewComment);
    setReviewName('');
    setReviewRating(5);
    setReviewComment('');
    const updated = await getProductReviews(product.id);
    setReviews(updated);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-20">
      <Link to="/shop" className="inline-flex items-center gap-2 text-xs font-bold tracking-widest opacity-40 hover:opacity-100 transition-opacity mb-12 uppercase">
        <ArrowLeft size={14} /> Back to Catalog
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-16 lg:gap-24">
        {/* Product Image */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="aspect-[3/4] bg-white overflow-hidden border border-zinc-100"
        >
          <img src={currentImage} alt={product.name} loading="eager" decoding="async" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
        </motion.div>

        {/* Product Info */}
        <motion.div
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           className="flex flex-col"
        >
          <span className="text-xs font-black tracking-[0.3em] opacity-30 uppercase mb-4">{product.brand}</span>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase mb-6">{product.name}</h1>
          
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

          {!!product.images?.length && (
            <div className="flex gap-3 mb-8 overflow-x-auto">
              {product.images.map((img) => (
                <button key={img} type="button" onClick={() => setActiveImage(img)} className={`w-16 h-20 border ${currentImage === img ? 'border-ink' : 'border-zinc-200'}`}>
                  <img src={img} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

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
                    <button
                      type="button"
                      onClick={() => isAvailable && setSelectedSize(size)}
                      key={size}
                      className={`px-4 py-2 border text-xs font-bold uppercase tracking-widest ${
                        isAvailable
                          ? selectedSize === size ? 'bg-ink text-beige border-ink' : 'bg-white border-zinc-300 text-zinc-800'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-400 line-through'
                      }`}
                    >
                      {size}
                    </button>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button 
            disabled={product.stock <= 0}
            onClick={handleAddToCart}
            className="btn-outline flex items-center justify-center gap-2 text-sm py-4 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ShoppingBag size={18} /> ADD TO CART
          </button>
          <button
            onClick={() => toggleWishlistProduct(product.id)}
            className="btn-outline flex items-center justify-center gap-2 text-sm py-4"
          >
            <Heart size={18} /> WISHLIST
          </button>
          <button 
            disabled={product.stock <= 0}
            onClick={async () => { await handleAddToCart(); navigate('/checkout'); }}
            className="btn-primary flex items-center justify-center gap-4 text-xl py-5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ShoppingBag size={24} /> 
            {product.stock > 0 ? 'BUY NOW' : 'OUT OF STOCK'}
          </button>
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t border-zinc-100">
             <div className="flex flex-col gap-2">
               <Truck size={18} className="opacity-40" />
               <span className="text-[10px] font-black tracking-widest uppercase">Rapid Transit</span>
               <p className="text-[10px] leading-tight opacity-40">Express delivery to all 58 Wilayas.</p>
             </div>
             <div className="flex flex-col gap-2">
               <ShieldCheck size={18} className="opacity-40" />
               <span className="text-[10px] font-black tracking-widest uppercase">Secured Order</span>
               <p className="text-[10px] leading-tight opacity-40">Verified checkout sans account requirements.</p>
             </div>
          </div>

          <div className="mt-12 border-t border-zinc-100 pt-8">
            <h3 className="text-xl font-black uppercase mb-4">Avis clients</h3>
            <form onSubmit={handleSubmitReview} className="grid gap-3 bg-zinc-50 border border-zinc-200 p-4 mb-6">
              <input required value={reviewName} onChange={(e) => setReviewName(e.target.value)} className="input-field" placeholder="Votre nom" />
              <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))} className="input-field">
                {[5,4,3,2,1].map(v => <option key={v} value={v}>{v} / 5</option>)}
              </select>
              <textarea required value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} className="input-field min-h-[90px]" placeholder="Votre avis..." />
              <button className="btn-primary">Publier l'avis</button>
            </form>
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="bg-white border border-zinc-200 p-4">
                  <p className="font-bold">{r.customerName} - {r.rating}/5</p>
                  <p className="text-sm text-zinc-600 mt-1">{r.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
