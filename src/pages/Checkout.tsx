import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, ShieldCheck, ArrowRight, Truck } from "lucide-react";
import {
  addToCart,
  CartItem,
  clearCart,
  decrementVariantStock,
  getCartItems,
  getProducts,
  getShippingFeeByWilaya,
  saveOrder,
  validatePromoCode
} from "../services/store";
import { WILAYAS } from "../constants";

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [trackingToken, setTrackingToken] = useState("");
  const [shippingFee, setShippingFee] = useState(0);
  const [promoCode, setPromoCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isPromoApplied, setIsPromoApplied] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (id) {
        const products = await getProducts();
        const found = products.find((p) => p.id === id);
        if (found) await addToCart(found, 1);
      }
      const items = await getCartItems();
      setCartItems(items);
    };
    load();
  }, [id]);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cartItems]
  );
  const total = Math.max(0, subtotal + shippingFee - discountAmount);

  const handleWilayaChange = async (wilaya: string) => {
    if (!wilaya) return;
    const fee = await getShippingFeeByWilaya(wilaya);
    setShippingFee(fee);
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    const promo = await validatePromoCode(promoCode);
    if (!promo) {
      alert("Code promo invalide.");
      setDiscountAmount(0);
      setIsPromoApplied(false);
      return;
    }
    const value = promo.type === "percentage" ? Math.round((subtotal * promo.value) / 100) : promo.value;
    setDiscountAmount(value);
    setIsPromoApplied(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector("button[type='submit']") as HTMLButtonElement | null;
    if (btn) btn.disabled = true;

    try {
      if (!cartItems.length) return;
      const formData = new FormData(e.currentTarget);
      const wilaya = formData.get("wilaya") as string;
      const tokens: string[] = [];

      for (const item of cartItems) {
        const token = await saveOrder({
          id: "",
          customerLastName: formData.get("lastName") as string,
          customerFirstName: formData.get("firstName") as string,
          phone: formData.get("phone") as string,
          wilaya,
          productId: item.productId,
          productName: item.productName,
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor,
          subtotal,
          shippingFee,
          promoCode: isPromoApplied ? promoCode : undefined,
          discountAmount,
          totalAmount: total,
          status: "pending",
          createdAt: new Date().toISOString()
        });
        tokens.push(token as string);
        if (item.selectedColor && item.selectedSize) {
          await decrementVariantStock(item.productId, item.selectedColor, item.selectedSize, item.quantity);
        }
      }

      await clearCart();
      setTrackingToken(tokens[0] || "");
      setIsSuccess(true);
    } catch (error: any) {
      console.error("Checkout error:", error);
      alert("Erreur checkout: " + (error?.message || JSON.stringify(error)));
      if (btn) btn.disabled = false;
    }
  };

  if (!cartItems.length && !isSuccess) {
    return (
      <div className="py-40 text-center">
        <p className="opacity-50 mb-6">Votre panier est vide.</p>
        <Link to="/shop" className="btn-primary">Retour à la boutique</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-24">
      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.div key="form" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-20">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase mb-2">Order Finalization</h1>
              <p className="text-zinc-500 mb-12">No account required. Enter your delivery coordinates below.</p>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                  <select required name="wilaya" className="input-field" onChange={(e) => handleWilayaChange(e.target.value)}>
                    <option value="">SELECT WILAYA</option>
                    {WILAYAS.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} className="input-field" placeholder="Code promo" />
                  <button type="button" onClick={handleApplyPromo} className="btn-outline whitespace-nowrap">Appliquer</button>
                </div>
                <div className="bg-zinc-50 p-6 flex items-start gap-4">
                  <Truck size={20} className="mt-1" />
                  <div>
                    <p className="font-bold text-sm uppercase">Paiement à la livraison</p>
                    <p className="text-xs opacity-50 mt-1">Vous paierez le montant total à la réception.</p>
                  </div>
                </div>
                <div className="pt-8 border-t border-zinc-100">
                  <button type="submit" className="btn-primary w-full text-xl flex items-center justify-center gap-4">
                    CONFIRM ACQUISITION <ArrowRight size={24} />
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white border border-zinc-200 p-12 h-fit rounded-sm shadow-2xl lg:sticky lg:top-32">
              <h2 className="text-xs font-black tracking-widest opacity-30 uppercase mb-8">Summary</h2>
              <div className="space-y-4 mb-8 max-h-[220px] overflow-y-auto pr-2">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <img src={item.imageUrl} loading="lazy" decoding="async" className="w-16 h-20 object-cover bg-zinc-100" />
                    <div>
                      <h3 className="font-bold text-sm uppercase">{item.productName}</h3>
                      <p className="text-[10px] opacity-50">{item.selectedColor || "-"} / {item.selectedSize || "-"}</p>
                      <p className="text-sm font-black">{item.unitPrice.toLocaleString()} DZD x {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-8 border-t border-zinc-100">
                <div className="flex justify-between text-sm">
                  <span className="opacity-50">Sous-total</span>
                  <span className="font-bold">{subtotal.toLocaleString()} DZD</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-50">Livraison</span>
                  <span className="font-bold">{shippingFee.toLocaleString()} DZD</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-50">Réduction</span>
                  <span className="font-bold text-green-600">-{discountAmount.toLocaleString()} DZD</span>
                </div>
                <div className="flex justify-between text-xl font-black pt-4 border-t border-zinc-100">
                  <span>TOTAL</span>
                  <span>{total.toLocaleString()} DZD</span>
                </div>
              </div>
              <div className="mt-12 flex items-center gap-4 opacity-40">
                <ShieldCheck size={20} />
                <span className="text-[10px] font-black tracking-widest uppercase">Verified Acquisition</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="success" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20 max-w-xl mx-auto">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-zinc-900 text-beige rounded-full mb-12">
              <CheckCircle2 size={48} />
            </div>
            <h1 className="text-5xl font-black tracking-tighter uppercase mb-6">Order Logged.</h1>
            <p className="text-zinc-500 font-light text-lg mb-8">Votre commande a été enregistrée avec succès.</p>
            
            <div className="bg-red-50 border border-red-100 text-red-800 p-6 rounded-sm mb-8 text-left">
              <p className="font-bold mb-2 uppercase text-sm">⚠️ Attention : Conservez ce code</p>
              <p className="text-sm opacity-90">Ce Tracking Token est indispensable pour suivre l'état de votre livraison ou pour toute réclamation. Prenez une capture d'écran ou notez-le soigneusement avant de quitter cette page.</p>
            </div>

            <div className="bg-white border border-zinc-200 p-6 flex justify-between items-center rounded-sm mb-12">
              <span className="text-[10px] font-black tracking-widest opacity-40 uppercase">Tracking Token</span>
              <span className="font-mono text-xl font-black tracking-widest">{trackingToken}</span>
            </div>

            <Link to="/" className="btn-primary inline-flex">Retour à la boutique</Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
