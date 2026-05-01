import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { getProducts, getWishlistProductIds, Product, toggleWishlistProduct } from "../services/store";

export default function Wishlist() {
  const [products, setProducts] = useState<Product[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  const refresh = async () => {
    const [allProducts, ids] = await Promise.all([getProducts(), getWishlistProductIds()]);
    setProducts(allProducts);
    setWishlistIds(ids);
  };

  useEffect(() => {
    refresh();
  }, []);

  const wishlistProducts = useMemo(
    () => products.filter((p) => wishlistIds.includes(p.id)),
    [products, wishlistIds]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase mb-8">Wishlist</h1>
      {wishlistProducts.length === 0 ? (
        <div className="bg-white border border-zinc-200 p-10 text-center">
          <p className="text-zinc-500 mb-6">Aucun article dans la wishlist.</p>
          <Link to="/shop" className="btn-primary inline-flex">Découvrir la boutique</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          {wishlistProducts.map((product) => (
            <div key={product.id} className="group">
              <Link to={`/product/${product.id}`}>
                <div className="aspect-[3/4] overflow-hidden bg-white mb-4 relative">
                  <img src={product.imageUrl} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleWishlistProduct(product.id).then(refresh).catch(console.error);
                    }}
                    className="absolute top-3 right-3 bg-white p-2 border border-zinc-200"
                  >
                    <Heart size={14} className="fill-red-500 text-red-500" />
                  </button>
                </div>
                <h3 className="font-bold line-clamp-2">{product.name}</h3>
                <p className="text-sm opacity-60">{product.price.toLocaleString()} DZD</p>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
