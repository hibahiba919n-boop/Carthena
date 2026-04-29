import { GoogleGenAI } from "@google/genai";
import { supabase } from "./supabase";

export interface Product {
  id: string;
  name: string;
  price: number;
  brand: string;
  style: 'baggy' | 'oversize' | 'old money' | 'streetwear' | 'minimalist';
  description: string;
  imageUrl: string;
  stock: number;
  isOnPromo: boolean;
  discountedPrice?: number;
  createdAt: string;
}

export interface Order {
  id: string;
  customerLastName: string;
  customerFirstName: string;
  phone: string;
  wilaya: string;
  productId: string;
  productName: string;
  status: 'pending' | 'processed' | 'shipped' | 'delivered' | 'refused';
  createdAt: string;
}

const PRODUCTS_KEY = 'carthena_products';
const ORDERS_KEY = 'carthena_orders';

// Initial Mock Data
const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Ghost Oversize Tee',
    price: 45,
    brand: 'CARTHENA',
    style: 'oversize',
    description: 'A heavyweight cotton tee with a dropped shoulder fit.',
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800',
    stock: 25,
    isOnPromo: false,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Lunar Baggy Trousers',
    price: 89,
    brand: 'CARTHENA',
    style: 'baggy',
    description: 'Wide-leg silhouette with reinforced stitching.',
    imageUrl: 'https://images.unsplash.com/photo-1551854838-212c20b7c8a1?auto=format&fit=crop&q=80&w=800',
    stock: 15,
    isOnPromo: true,
    discountedPrice: 65,
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Heritage Knit Polo',
    price: 75,
    brand: 'ESSENTIALS',
    style: 'old money',
    description: 'Premium wool blend knit with a classic collar.',
    imageUrl: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&q=80&w=800',
    stock: 10,
    isOnPromo: false,
    createdAt: new Date().toISOString()
  }
];

// Helper to check if Supabase is active
const isSupabaseActive = () => !!supabase;

export const getProducts = async (): Promise<Product[]> => {
  if (isSupabaseActive()) {
    const { data, error } = await supabase!
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase Error fetching products:', error);
    }
    
    if (!error && data) {
      return data.map(p => ({
        id: String(p.id),
        name: p.name,
        price: p.price,
        brand: p.brand,
        style: p.style,
        description: p.description,
        imageUrl: p.image_url,
        stock: p.stock,
        isOnPromo: p.is_on_promo,
        discountedPrice: p.discounted_price,
        createdAt: p.created_at
      }));
    }
  }

  const stored = localStorage.getItem(PRODUCTS_KEY);
  if (!stored) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
    return INITIAL_PRODUCTS;
  }
  return JSON.parse(stored);
};

export const saveProduct = async (product: Product) => {
  if (isSupabaseActive()) {
    const payload = {
      name: product.name,
      price: product.price,
      brand: product.brand,
      style: product.style,
      description: product.description,
      image_url: product.imageUrl,
      stock: product.stock,
      is_on_promo: product.isOnPromo,
      discounted_price: product.discountedPrice
    };

    let error;
    if (product.id && product.id.length > 15) { // UUID-like
      const result = await supabase!.from('products').update(payload).eq('id', product.id);
      error = result.error;
    } else {
      const result = await supabase!.from('products').insert([payload]);
      error = result.error;
    }
    
    if (error) {
      console.error('Supabase Error saving product:', error);
      throw error;
    }
    return;
  }

  const products = await getProducts();
  const index = products.findIndex(p => p.id === product.id);
  if (index >= 0) {
    products[index] = product;
  } else {
    products.push(product);
  }
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
};

export const deleteProduct = async (id: string) => {
  console.log(`Store: Attempting to delete product with ID: ${id}`);
  
  if (isSupabaseActive()) {
    // Try both numeric and string versions
    const isProbablyNumeric = !isNaN(Number(id)) && id.length < 15;
    const targetId = isProbablyNumeric ? Number(id) : id;
    
    console.log(`Store: Supabase delete target ID:`, targetId, `(type: ${typeof targetId})`);
    
    const { error, count } = await supabase!
      .from('products')
      .delete({ count: 'exact' })
      .eq('id', targetId);
    
    if (error) {
      console.error('Store: Supabase Error deleting product:', error);
      throw new Error(`Erreur base de données (Supabase): ${error.message} (Code: ${error.code})`);
    }
    
    console.log(`Store: Supabase delete response count:`, count);
    
    // If we didn't delete anything, it might be due to ID mismatch or RLS
    if (count === 0) {
      console.warn("Store: No rows deleted from Supabase. Attempting fallback with string ID...");
      const { error: errorString } = await supabase!
        .from('products')
        .delete()
        .eq('id', id);
      if (errorString) console.warn("Store: Fallback string delete also failed:", errorString);
    }
  }

  // Backup cleanup in local storage
  const stored = localStorage.getItem(PRODUCTS_KEY);
  if (stored) {
    try {
      const products = JSON.parse(stored) as Product[];
      const filtered = products.filter(p => String(p.id).trim() !== String(id).trim());
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(filtered));
      console.log('Store: Local storage cleaned up');
    } catch (e) {
      console.error('Store: Error cleaning up local storage:', e);
    }
  }
};

export const getOrders = async (): Promise<Order[]> => {
  if (isSupabaseActive()) {
    try {
      const { data, error } = await supabase!
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) {
        return data.map(o => ({
          id: String(o.id),
          customerLastName: o.customer_last_name,
          customerFirstName: o.customer_first_name,
          phone: o.phone,
          wilaya: o.wilaya,
          productId: String(o.product_id),
          productName: o.product_name,
          status: o.status,
          createdAt: o.created_at
        }));
      }
    } catch (error) {
      console.error('Supabase Error fetching orders:', error);
    }
  }

  const stored = localStorage.getItem(ORDERS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveOrder = async (order: Order) => {
  if (isSupabaseActive()) {
    const { error } = await supabase!.from('orders').insert([{
      customer_last_name: order.customerLastName,
      customer_first_name: order.customerFirstName,
      phone: order.phone,
      wilaya: order.wilaya,
      product_id: order.productId,
      product_name: order.productName,
      status: order.status
    }]);
    
    if (error) {
      console.error('Supabase Error saving order:', error);
      throw error;
    }
    return;
  }

  const orders = await getOrders();
  orders.push(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  if (isSupabaseActive()) {
    const targetId = (orderId.length < 10 && !isNaN(Number(orderId))) ? Number(orderId) : orderId;

    const { error } = await supabase!
      .from('orders')
      .update({ status })
      .eq('id', targetId);
    
    if (error) {
      console.error('Supabase Error updating order status:', error);
      if (error.code === '23514') {
        throw new Error('Le statut "' + status + '" n\'est pas autorisé par votre base de données (Check Constraint).');
      }
      throw new Error(`Supabase error: ${error.message}. (Assurez-vous d'avoir exécuté le SQL des permissions UPDATE)`);
    }
  }

  const stored = localStorage.getItem(ORDERS_KEY);
  if (stored) {
    const orders = JSON.parse(stored) as Order[];
    const index = orders.findIndex(o => String(o.id).trim() === String(orderId).trim());
    if (index >= 0) {
      (orders[index] as any).status = status;
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    }
  }
};

export interface AIResponse {
  analysis: string;
  recommendation: string;
  outfitSuggestion: string;
  productIds: string[];
}

export const getAIStylistRecommendation = async (
  userMessage: string,
  history: { role: 'user' | 'model', text: string }[]
): Promise<AIResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const products = await getProducts();

  const systemInstructions = `
    Tu es un styliste expert en mode (streetwear, old money, oversize, minimalist).
    Ta mission est d'aider l'utilisateur à trouver son style et de lui recommander des produits de notre catalogue en DZD (Dinnars Algériens).

    Voici les produits disponibles en magasin:
    ${JSON.stringify(products, null, 2)}

    CONSIGNES:
    - Analyse le besoin de l'utilisateur (Style, Occasion, Préférence).
    - Propose UNIQUEMENT des produits existants dans la liste ci-dessus en citant leurs noms exacts.
    - Utilise les "id" fournis pour la sélection technique.
    - Sois simple, stylé et donne des suggestions concrètes.
    - Toutes les mentions de prix doivent être en DZD.
    - Format de réponse attendu (JSON uniquement):
    {
      "analysis": "Analyse du style demandé",
      "recommendation": "Ta recommandation personnalisée",
      "outfitSuggestion": "Une idée de tenue complète",
      "productIds": ["liste", "des", "ids", "des", "produits", "recommandés"]
    }
  `;

  const chatHistory = history.map(h => ({
    role: h.role,
    parts: [{ text: h.text }]
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      { role: 'user', parts: [{ text: systemInstructions }] },
      ...chatHistory,
      { role: 'user', parts: [{ text: userMessage }] }
    ],
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || "{}";
  return JSON.parse(text) as AIResponse;
};
