import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ShieldCheck, ArrowRight, Package, Truck } from 'lucide-react';
import { getProducts, saveOrder, Product, Order } from '../services/store';
import { WILAYAS } from '../constants';

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    getProducts().then(products => {
      const found = products.find(p => p.id === id);
      if (found) setProduct(found);
    });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('button');
    if (btn) btn.disabled = true;

    try {
      const formData = new FormData(e.currentTarget);
      
      if (!product) return;

      const newOrder: Order = {
        id: Math.random().toString(36).substr(2, 9).toUpperCase(),
        customerLastName: formData.get('lastName') as string,
        customerFirstName: formData.get('firstName') as string,
        phone: formData.get('phone') as string,
        wilaya: formData.get('wilaya') as string,
        productId: product.id,
        productName: product.name,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await saveOrder(newOrder);
      setIsSuccess(true);
      
      // Redirect after delay
      setTimeout(() => {
        navigate('/');
      }, 5000);
    } catch (error) {
      alert("Error logging order. Please try again.");
      if (btn) btn.disabled = false;
    }
  };

  if (!product) return <div className="py-40 text-center font-mono opacity-50">ERROR: NO ORDER TARGET</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 md:py-24">
      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.div 
            key="form"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-20"
          >
            {/* Form Section */}
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Order Finalization</h1>
              <p className="text-zinc-500 mb-12">No account required. Enter your delivery coordinates below.</p>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black tracking-widest opacity-40 mb-2 block uppercase">Last Name / Nom</label>
                    <input required name="lastName" className="input-field" placeholder="LAST NAME" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black tracking-widest opacity-40 mb-2 block uppercase">First Name / Prénom</label>
                    <input required name="firstName" className="input-field" placeholder="FIRST NAME" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black tracking-widest opacity-40 mb-2 block uppercase">Phone Number / Téléphone</label>
                  <input required name="phone" type="tel" className="input-field" placeholder="+213..." />
                </div>

                <div>
                  <label className="text-[10px] font-black tracking-widest opacity-40 mb-2 block uppercase">Wilaya / Location</label>
                  <select required name="wilaya" className="input-field">
                    <option value="">SELECT WILAYA</option>
                    {WILAYAS.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-zinc-50 p-6 flex items-start gap-4">
                  <Truck size={20} className="mt-1" />
                  <div>
                    <p className="font-bold text-sm uppercase">Paiement à la livraison</p>
                    <p className="text-xs opacity-50 mt-1">Vous paierez le montant total une fois que vous aurez reçu votre produit.</p>
                  </div>
                </div>

                <div className="pt-8 border-t border-zinc-100">
                  <button type="submit" className="btn-primary w-full text-xl flex items-center justify-center gap-4">
                    CONFIRM ACQUISITION <ArrowRight size={24} />
                  </button>
                </div>
              </form>
            </div>

            {/* Summary Section */}
            <div className="bg-white border border-zinc-200 p-12 h-fit rounded-sm shadow-2xl lg:sticky lg:top-32">
               <h2 className="text-xs font-black tracking-widest opacity-30 uppercase mb-8">Summary</h2>
               <div className="flex gap-6 mb-8">
                 <img src={product.imageUrl} className="w-24 h-32 object-cover bg-zinc-100" />
                 <div>
                   <h3 className="font-bold text-xl uppercase leading-tight mb-2">{product.name}</h3>
                   <span className="text-[10px] font-black px-3 py-1 bg-zinc-100 inline-block uppercase tracking-widest mb-4">
                     {product.style} Style
                   </span>
                   <p className="text-2xl font-black">{(product.isOnPromo ? (product.discountedPrice || product.price) : product.price).toLocaleString()} DZD</p>
                  </div>
               </div>

               <div className="space-y-4 pt-8 border-t border-zinc-100">
                 <div className="flex justify-between text-sm">
                   <span className="opacity-50">Sous-total</span>
                   <span className="font-bold">{(product.isOnPromo ? (product.discountedPrice || product.price) : product.price).toLocaleString()} DZD</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="opacity-50">Livraison (Standard)</span>
                   <span className="font-bold text-green-600 uppercase tracking-widest">Calculé à l'expédition</span>
                 </div>
                 <div className="flex justify-between text-xl font-black pt-4 border-t border-zinc-100">
                   <span>TOTAL</span>
                   <span>{(product.isOnPromo ? (product.discountedPrice || product.price) : product.price).toLocaleString()} DZD</span>
                 </div>
               </div>

               <div className="mt-12 flex items-center gap-4 opacity-40">
                 <ShieldCheck size={20} />
                 <span className="text-[10px] font-black tracking-widest uppercase">Verified Acquisition</span>
               </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-40 max-w-xl mx-auto"
          >
            <div className="inline-flex items-center justify-center w-24 h-24 bg-zinc-900 text-beige rounded-full mb-12">
              <CheckCircle2 size={48} />
            </div>
            <h1 className="text-5xl font-black tracking-tighter uppercase mb-6">Order Logged.</h1>
            <p className="text-zinc-500 font-light text-lg mb-12">
              Votre commande pour le produit <strong className="text-black">{product.name}</strong> a été enregistrée avec succès. 
              Notre équipe logistique vous contactera par téléphone sous peu.
            </p>
            <div className="flex flex-col gap-4">
              <div className="bg-white border border-zinc-200 p-6 flex justify-between items-center rounded-sm">
                 <span className="text-[10px] font-black tracking-widest opacity-40 uppercase">Tracking Token</span>
                 <span className="font-mono text-xs font-bold">#{Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
              </div>
              <button 
                onClick={() => navigate('/')}
                className="btn-outline w-full"
              >
                RETURN TO GRID
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
