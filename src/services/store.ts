import { GoogleGenAI } from "@google/genai";
import { supabase } from "./supabase";

export interface Product {
  id: string;
  name: string;
  price: number;
  brand: string;
  style: string;
  description: string;
  imageUrl: string;
  stock: number;
  colorVariants?: ProductColorVariant[];
  isOnPromo: boolean;
  discountedPrice?: number;
  createdAt: string;
}

export interface ProductColorVariant {
  color: string;
  availableSizes: string[];
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

export const CATEGORIES = [
  'baggy', 'oversize', 'old money', 'streetwear', 'minimalist', 
  'jeans', 'survetements', 'polo', 'chemises', 'costumes', 
  'sportswear', 'casual', 'sneakers', 'accessoires', 'vestes', 
  'manteaux', 't-shirts', 'pulls', 'shorts', 'pantalons', 
  'vintage', 'y2k', 'gothique', 'techwear', 'luxe', 
  'robes', 'jupes', 'maillots', 'loungewear', 'cargos', 'denim'
];

export const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

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

const mapColorVariants = (value: any): ProductColorVariant[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  const normalized = value
    .map((item) => {
      const color = typeof item?.color === 'string' ? item.color.trim() : '';
      const availableSizes = Array.isArray(item?.availableSizes)
        ? item.availableSizes
            .filter((size: unknown) => typeof size === 'string' && size.trim().length > 0)
            .map((size: string) => size.trim().toUpperCase())
        : [];

      if (!color) return null;
      return { color, availableSizes };
    })
    .filter(Boolean) as ProductColorVariant[];

  return normalized.length ? normalized : undefined;
};

export const uploadProductImage = async (file: File): Promise<string> => {
  if (!isSupabaseActive()) {
    throw new Error("Supabase n'est pas configuré. Impossible d'uploader l'image.");
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const bucket = import.meta.env.VITE_SUPABASE_PRODUCT_IMAGES_BUCKET || 'product-images';
  const path = `products/${filename}`;

  const { error: uploadError } = await supabase!.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false
  });

  if (uploadError) {
    throw new Error(`Upload image échoué: ${uploadError.message}`);
  }

  const { data } = supabase!.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("Impossible d'obtenir l'URL publique de l'image.");
  }

  return data.publicUrl;
};

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
        colorVariants: mapColorVariants(p.color_variants),
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
      color_variants: product.colorVariants || null,
      is_on_promo: product.isOnPromo,
      discounted_price: product.discountedPrice
    };

    let error: any;
    if (product.id && product.id.length > 15) { // UUID-like
      const result = await supabase!.from('products').update(payload).eq('id', product.id);
      error = result.error;
    } else {
      const result = await supabase!.from('products').insert([payload]);
      error = result.error;
    }

    // DB sans colonne color_variants -> retry sans ce champ
    if (error?.code === 'PGRST204' || error?.code === '42703') {
      const fallbackPayload = { ...payload };
      delete (fallbackPayload as any).color_variants;
      const retryResult = product.id && product.id.length > 15
        ? await supabase!.from('products').update(fallbackPayload).eq('id', product.id)
        : await supabase!.from('products').insert([fallbackPayload]);
      error = retryResult.error;
    }
    
    if (error) {
      console.error('Supabase Error saving product:', error);
      if (error.code === '23514') {
        throw new Error(
          `La valeur du style "${product.style}" est bloquée par une contrainte de votre table products (check/enum). ` +
          `Ajoutez ce style dans Supabase, ou remplacez la contrainte actuelle.`
        );
      }
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

    // D'abord, supprimer les commandes liées pour éviter l'erreur de contrainte de clé étrangère (Foreign Key Constraint)
    console.log(`Store: Deleting related orders for product ${targetId}`);
    const { error: orderError } = await supabase!
      .from('orders')
      .delete()
      .eq('product_id', targetId);
      
    if (orderError) {
      console.error('Store: Failed to delete related orders:', orderError);
    }
    
    // Ensuite, supprimer le produit
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
      await supabase!.from('orders').delete().eq('product_id', id); // Fallback for orders
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

export const updateOrderStatus = async (orderId: string, status: string, productId?: string) => {
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

    if (status === 'delivered' && productId) {
      const prodId = (productId.length < 15 && !isNaN(Number(productId))) ? Number(productId) : productId;
      const { data: product } = await supabase!
        .from('products')
        .select('stock')
        .eq('id', prodId)
        .single();
        
      if (product && typeof product.stock === 'number') {
        const newStock = Math.max(0, product.stock - 1);
        await supabase!
          .from('products')
          .update({ stock: newStock })
          .eq('id', prodId);
      }
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

  if (status === 'delivered' && productId) {
    const storedProd = localStorage.getItem(PRODUCTS_KEY);
    if (storedProd) {
      const products = JSON.parse(storedProd) as Product[];
      const pIdx = products.findIndex(p => String(p.id) === String(productId));
      if (pIdx >= 0) {
         products[pIdx].stock = Math.max(0, products[pIdx].stock - 1);
         localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
      }
    }
  }
};

export interface AIResponse {
  analysis?: string;
  recommendation: string;
  outfitSuggestion?: string;
  styleTip?: string;
  productIds: string[];
}

export const getAIStylistRecommendation = async (
  userMessage: string,
  history: { role: 'user' | 'model', text: string }[]
): Promise<AIResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const products = await getProducts();

  const systemInstructions = `
    Tu es "Hamza", le conseiller en image IA exclusif et prestigieux de la Maison CARTHENA. 
    Ta mission est d'offrir une expérience client exceptionnelle, chaleureuse mais toujours vouvoyée, avec un vocabulaire pointu mêlant luxe et modernité (streetwear, old money, casual chic).

    RÈGLES DE CONDUITE (TRÈS IMPORTANT):
    1. VOUVOYEMENT ET ÉLÉGANCE : Vouvoie systématiquement le client. Sois courtois, raffiné, mais accessible et passionné par la mode.
    2. SOUPLESSE ET DIALOGUE : 
       - Si le client dit juste "bonjour", réponds chaleureusement en te présentant (Hamza) et demande comment tu peux l'aider, SANS forcer de vêtements.
       - Si le client pose une question de style générale (ex: "comment s'habiller pour un date"), donne des conseils experts en couleurs, matières, et coupes.
    3. HORS-SUJET : Si la question n'a absolument aucun rapport avec la mode ou le lifestyle, réponds avec un trait d'esprit ou d'humour élégant, puis ramène la conversation sur le style vestimentaire.
    4. RECOMMANDATIONS PRODUITS : Ne propose des articles de la boutique QUE si c'est pertinent par rapport à la demande. Laisse la liste "productIds" vide si ce n'est pas le moment de vendre.
    5. LE "STYLE TIP" : Ajoute toujours une petite astuce mode secrète ou un conseil de styliste en bonus ("styleTip").

    Voici le catalogue actuel de la boutique CARTHENA (en DZD) :
    ${JSON.stringify(products, null, 2)}

    Format de réponse attendu (JSON uniquement, sois très rigoureux sur les clés) :
    {
      "analysis": "Analyse rapide de la demande (optionnel)",
      "recommendation": "Ta réponse principale au client (chaleureuse, experte, formelle)",
      "outfitSuggestion": "Une idée de tenue complète si pertinent (optionnel)",
      "styleTip": "Une petite astuce de styliste (ex: 'Roulez vos manches pour un look plus décontracté...')",
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
