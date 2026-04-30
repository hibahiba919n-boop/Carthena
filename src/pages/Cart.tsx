import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { CartItem, getCartItems, updateCartItemQuantity } from "../services/store";

export default function Cart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const navigate = useNavigate();

  const refresh = async () => {
    const rows = await getCartItems();
    setItems(rows);
  };

  useEffect(() => {
    refresh();
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [items]
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-black tracking-tight uppercase mb-8">Panier</h1>
      {items.length === 0 ? (
        <div className="bg-white border border-zinc-200 p-10 text-center">
          <p className="text-zinc-500 mb-6">Votre panier est vide.</p>
          <Link to="/shop" className="btn-primary inline-flex">Retour à la boutique</Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="bg-white border border-zinc-200 p-4 flex items-center gap-4">
                <img src={item.imageUrl} className="w-20 h-24 object-cover bg-zinc-100" />
                <div className="flex-1">
                  <p className="font-bold">{item.productName}</p>
                  <p className="text-xs opacity-50">{item.selectedColor || "-"} / {item.selectedSize || "-"}</p>
                  <p className="font-black mt-2">{item.unitPrice.toLocaleString()} DZD</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateCartItemQuantity(item.id, item.quantity - 1).then(refresh)} className="p-2 border border-zinc-200"><Minus size={14} /></button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button onClick={() => updateCartItemQuantity(item.id, item.quantity + 1).then(refresh)} className="p-2 border border-zinc-200"><Plus size={14} /></button>
                </div>
                <button onClick={() => updateCartItemQuantity(item.id, 0).then(refresh)} className="p-2 text-red-600"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          <div className="bg-white border border-zinc-200 p-6 h-fit">
            <p className="text-sm opacity-50 mb-2">Sous-total</p>
            <p className="text-3xl font-black mb-6">{total.toLocaleString()} DZD</p>
            <button onClick={() => navigate("/checkout")} className="btn-primary w-full">Passer au checkout</button>
          </div>
        </div>
      )}
    </div>
  );
}
