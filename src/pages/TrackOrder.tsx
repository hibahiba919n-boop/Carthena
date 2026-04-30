import { FormEvent, useState } from "react";
import { getOrderByTrackingToken, Order } from "../services/store";

export default function TrackOrder() {
  const [token, setToken] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const found = await getOrderByTrackingToken(token);
    if (!found) {
      setOrder(null);
      setError("Aucune commande trouvée avec ce token.");
      return;
    }
    setOrder(found);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-black tracking-tight uppercase mb-8">Suivi Commande</h1>
      <form onSubmit={handleSearch} className="bg-white border border-zinc-200 p-6 mb-8">
        <label className="text-xs font-black tracking-widest opacity-40 block mb-2">Tracking Token</label>
        <div className="flex gap-3">
          <input value={token} onChange={(e) => setToken(e.target.value)} required className="input-field" placeholder="EX: AB12CD34" />
          <button className="btn-primary">Rechercher</button>
        </div>
      </form>
      {error && <p className="text-red-600">{error}</p>}
      {order && (
        <div className="bg-white border border-zinc-200 p-6 space-y-3">
          <p><strong>Produit:</strong> {order.productName}</p>
          <p><strong>Statut:</strong> <span className="uppercase font-bold">{order.status}</span></p>
          <p><strong>Client:</strong> {order.customerFirstName} {order.customerLastName}</p>
          <p><strong>Taille/Couleur:</strong> {order.selectedSize || "-"} / {order.selectedColor || "-"}</p>
          <p><strong>Total:</strong> {(order.totalAmount || 0).toLocaleString()} DZD</p>
        </div>
      )}
    </div>
  );
}
