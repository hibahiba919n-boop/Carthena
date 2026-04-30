import { GoogleGenAI } from "@google/genai";
import { supabase } from "./supabase";
import { getOrCreateSessionId } from "./session";

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
  images?: string[];
  variantStocks?: ProductVariantStock[];
  isOnPromo: boolean;
  discountedPrice?: number;
  createdAt: string;
}

export interface ProductColorVariant {
  color: string;
  availableSizes: string[];
}

export interface ProductVariantStock {
  id: string;
  productId: string;
  color: string;
  size: string;
  stock: number;
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
  trackingToken?: string;
  selectedSize?: string;
  selectedColor?: string;
  subtotal?: number;
  shippingFee?: number;
  promoCode?: string;
  discountAmount?: number;
  totalAmount?: number;
  createdAt: string;
}

export interface CartItem {
  id: string;
  sessionId: string;
  productId: string;
  productName: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface Review {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface PromoValidation {
  code: string;
  type: "percentage" | "fixed";
  value: number;
}

export const CATEGORIES = [
  'baggy', 'oversize', 'old money', 'streetwear', 'minimalist', 
  'jeans', 'survetements', 'polo', 'chemises', 'costumes', 
  'sportswear', 'casual', 'sneakers', 'accessoires', 'vestes', 
  'manteaux', 't-shirts', 'pulls', 'shorts', 'pantalons', 
  'vintage', 'y2k', 'gothique', 'techwear', 'luxe', 
  'robes', 'jupes', 'maillots', 'loungewear', 'cargos', 'denim'
];

export const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const requireSupabase = () => {
  if (!supabase) {
    throw new Error("Supabase non configuré. Configurez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
};

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
  const client = requireSupabase();

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const bucket = import.meta.env.VITE_SUPABASE_PRODUCT_IMAGES_BUCKET || 'product-images';
  const path = `products/${filename}`;

  const { error: uploadError } = await client.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false
  });

  if (uploadError) {
    throw new Error(`Upload image échoué: ${uploadError.message}`);
  }

  const { data } = client.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("Impossible d'obtenir l'URL publique de l'image.");
  }

  return data.publicUrl;
};

export const getProducts = async (): Promise<Product[]> => {
  const client = requireSupabase();
  const { data, error } = await client
    .from('products')
    .select(`
      *,
      product_images(image_url, sort_order),
      product_variants(id, color, size, stock)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((p: any) => {
    const images = (p.product_images || [])
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((img: any) => img.image_url);
    const variants: ProductVariantStock[] = (p.product_variants || []).map((v: any) => ({
      id: String(v.id),
      productId: String(p.id),
      color: v.color,
      size: v.size,
      stock: v.stock
    }));
    const grouped = variants.reduce<Record<string, string[]>>((acc, item) => {
      if (!acc[item.color]) acc[item.color] = [];
      if (item.stock > 0) acc[item.color].push(item.size);
      return acc;
    }, {});
    const colorVariants = Object.entries(grouped).map(([color, availableSizes]) => ({ color, availableSizes }));

    return {
      id: String(p.id),
      name: p.name,
      price: p.price,
      brand: p.brand,
      style: p.style,
      description: p.description,
      imageUrl: p.image_url,
      images: images.length ? images : [p.image_url],
      stock: p.stock,
      variantStocks: variants,
      colorVariants: colorVariants.length ? colorVariants : mapColorVariants(p.color_variants),
      isOnPromo: p.is_on_promo,
      discountedPrice: p.discounted_price,
      createdAt: p.created_at
    };
  });
};

export const saveProduct = async (product: Product) => {
  {
    const client = requireSupabase();
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
      const result = await client.from('products').update(payload).eq('id', product.id);
      error = result.error;
    } else {
      const result = await client.from('products').insert([payload]);
      error = result.error;
    }

    // DB sans colonne color_variants -> retry sans ce champ
    if (error?.code === 'PGRST204' || error?.code === '42703') {
      const fallbackPayload = { ...payload };
      delete (fallbackPayload as any).color_variants;
      const retryResult = product.id && product.id.length > 15
        ? await client.from('products').update(fallbackPayload).eq('id', product.id)
        : await client.from('products').insert([fallbackPayload]);
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
};

export const deleteProduct = async (id: string) => {
  const client = requireSupabase();
  const { error } = await client.from('products').delete().eq('id', id);
  if (error) throw error;
};

export const getOrders = async (): Promise<Order[]> => {
  const client = requireSupabase();
  const { data, error } = await client
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((o: any) => ({
    id: String(o.id),
    customerLastName: o.customer_last_name,
    customerFirstName: o.customer_first_name,
    phone: o.phone,
    wilaya: o.wilaya,
    productId: String(o.product_id),
    productName: o.product_name,
    status: o.status,
    trackingToken: o.tracking_token,
    selectedSize: o.selected_size,
    selectedColor: o.selected_color,
    subtotal: o.subtotal,
    shippingFee: o.shipping_fee,
    promoCode: o.promo_code,
    discountAmount: o.discount_amount,
    totalAmount: o.total_amount,
    createdAt: o.created_at
  }));
};

export const saveOrder = async (order: Order) => {
  const client = requireSupabase();
  const trackingToken = order.trackingToken || Math.random().toString(36).slice(2, 10).toUpperCase();
  const { error } = await client.from('orders').insert([{
      customer_last_name: order.customerLastName,
      customer_first_name: order.customerFirstName,
      phone: order.phone,
      wilaya: order.wilaya,
      product_id: order.productId,
      product_name: order.productName,
      status: order.status,
      tracking_token: trackingToken,
      selected_size: order.selectedSize || null,
      selected_color: order.selectedColor || null,
      subtotal: order.subtotal || null,
      shipping_fee: order.shippingFee || null,
      promo_code: order.promoCode || null,
      discount_amount: order.discountAmount || null,
      total_amount: order.totalAmount || null
    }]);
  if (error) throw error;
  return trackingToken;
};

export const decrementVariantStock = async (productId: string, color: string, size: string, quantity: number) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from('product_variants')
    .select('id, stock')
    .eq('product_id', productId)
    .eq('color', color)
    .eq('size', size)
    .single();
  if (error) throw error;
  const newStock = Math.max(0, (data.stock || 0) - quantity);
  const { error: updateError } = await client.from('product_variants').update({ stock: newStock }).eq('id', data.id);
  if (updateError) throw updateError;
};

export const getShippingFeeByWilaya = async (wilaya: string): Promise<number> => {
  const client = requireSupabase();
  const { data, error } = await client.from('shipping_rates').select('fee').eq('wilaya', wilaya).maybeSingle();
  if (error) throw error;
  return data?.fee ?? 600;
};

export const validatePromoCode = async (code: string): Promise<PromoValidation | null> => {
  const client = requireSupabase();
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  const { data, error } = await client
    .from('promo_codes')
    .select('code, discount_type, discount_value, is_active, starts_at, ends_at')
    .eq('code', normalized)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.is_active) return null;
  const now = new Date();
  if (data.starts_at && new Date(data.starts_at) > now) return null;
  if (data.ends_at && new Date(data.ends_at) < now) return null;
  return { code: data.code, type: data.discount_type, value: data.discount_value };
};

export const getOrCreateCart = async () => {
  const client = requireSupabase();
  const sessionId = getOrCreateSessionId();
  const { data } = await client.from('carts').select('id').eq('session_id', sessionId).maybeSingle();
  if (data?.id) return { cartId: String(data.id), sessionId };
  const created = await client.from('carts').insert([{ session_id: sessionId }]).select('id').single();
  if (created.error) throw created.error;
  return { cartId: String(created.data.id), sessionId };
};

export const getCartItems = async (): Promise<CartItem[]> => {
  const client = requireSupabase();
  const { cartId, sessionId } = await getOrCreateCart();
  const { data, error } = await client
    .from('cart_items')
    .select('id, product_id, quantity, selected_size, selected_color, unit_price, products(name, image_url)')
    .eq('cart_id', cartId);
  if (error) throw error;
  return (data || []).map((item: any) => ({
    id: String(item.id),
    sessionId,
    productId: String(item.product_id),
    productName: item.products?.name || 'Product',
    imageUrl: item.products?.image_url || '',
    unitPrice: item.unit_price || 0,
    quantity: item.quantity || 1,
    selectedSize: item.selected_size || undefined,
    selectedColor: item.selected_color || undefined
  }));
};

export const addToCart = async (product: Product, quantity: number, selectedSize?: string, selectedColor?: string) => {
  const client = requireSupabase();
  const { cartId } = await getOrCreateCart();
  const basePrice = product.isOnPromo ? (product.discountedPrice || product.price) : product.price;
  const existing = await client
    .from('cart_items')
    .select('id, quantity')
    .eq('cart_id', cartId)
    .eq('product_id', product.id)
    .eq('selected_size', selectedSize || null)
    .eq('selected_color', selectedColor || null)
    .maybeSingle();
  if (existing.error && existing.error.code !== 'PGRST116') throw existing.error;
  if (existing.data?.id) {
    const { error } = await client.from('cart_items').update({ quantity: existing.data.quantity + quantity }).eq('id', existing.data.id);
    if (error) throw error;
    return;
  }
  const { error } = await client.from('cart_items').insert([{
    cart_id: cartId,
    product_id: product.id,
    quantity,
    selected_size: selectedSize || null,
    selected_color: selectedColor || null,
    unit_price: basePrice
  }]);
  if (error) throw error;
};

export const updateCartItemQuantity = async (itemId: string, quantity: number) => {
  const client = requireSupabase();
  if (quantity <= 0) {
    const { error } = await client.from('cart_items').delete().eq('id', itemId);
    if (error) throw error;
    return;
  }
  const { error } = await client.from('cart_items').update({ quantity }).eq('id', itemId);
  if (error) throw error;
};

export const clearCart = async () => {
  const client = requireSupabase();
  const { cartId } = await getOrCreateCart();
  const { error } = await client.from('cart_items').delete().eq('cart_id', cartId);
  if (error) throw error;
};

export const getWishlistProductIds = async (): Promise<string[]> => {
  const client = requireSupabase();
  const sessionId = getOrCreateSessionId();
  const { data, error } = await client.from('wishlists').select('product_id').eq('session_id', sessionId);
  if (error) throw error;
  return (data || []).map((row: any) => String(row.product_id));
};

export const toggleWishlistProduct = async (productId: string) => {
  const client = requireSupabase();
  const sessionId = getOrCreateSessionId();
  const existing = await client
    .from('wishlists')
    .select('id')
    .eq('session_id', sessionId)
    .eq('product_id', productId)
    .maybeSingle();
  if (existing.error && existing.error.code !== 'PGRST116') throw existing.error;
  if (existing.data?.id) {
    const { error } = await client.from('wishlists').delete().eq('id', existing.data.id);
    if (error) throw error;
    return false;
  }
  const { error } = await client.from('wishlists').insert([{ session_id: sessionId, product_id: productId }]);
  if (error) throw error;
  return true;
};

export const getProductReviews = async (productId: string): Promise<Review[]> => {
  const client = requireSupabase();
  const { data, error } = await client
    .from('product_reviews')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: String(row.id),
    productId: String(row.product_id),
    customerName: row.customer_name,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at
  }));
};

export const addProductReview = async (productId: string, customerName: string, rating: number, comment: string) => {
  const client = requireSupabase();
  const { error } = await client.from('product_reviews').insert([{
    product_id: productId,
    customer_name: customerName,
    rating,
    comment
  }]);
  if (error) throw error;
};

export const getOrderByTrackingToken = async (token: string): Promise<Order | null> => {
  const client = requireSupabase();
  const { data, error } = await client.from('orders').select('*').eq('tracking_token', token.trim().toUpperCase()).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: String(data.id),
    customerLastName: data.customer_last_name,
    customerFirstName: data.customer_first_name,
    phone: data.phone,
    wilaya: data.wilaya,
    productId: String(data.product_id),
    productName: data.product_name,
    status: data.status,
    trackingToken: data.tracking_token,
    selectedSize: data.selected_size,
    selectedColor: data.selected_color,
    subtotal: data.subtotal,
    shippingFee: data.shipping_fee,
    promoCode: data.promo_code,
    discountAmount: data.discount_amount,
    totalAmount: data.total_amount,
    createdAt: data.created_at
  };
};

export const logAnalyticsEvent = async (eventName: string, payload: Record<string, any> = {}) => {
  const client = requireSupabase();
  const sessionId = getOrCreateSessionId();
  await client.from('analytics_events').insert([{ event_name: eventName, payload, session_id: sessionId }]);
};

export const updateOrderStatus = async (orderId: string, status: string, productId?: string) => {
  const client = requireSupabase();
  const { error } = await client.from('orders').update({ status }).eq('id', orderId);
  if (error) throw error;
  if (status === 'delivered' && productId) {
    const { data: product } = await client.from('products').select('stock').eq('id', productId).single();
    if (product?.stock !== undefined) {
      await client.from('products').update({ stock: Math.max(0, product.stock - 1) }).eq('id', productId);
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

const extractJsonObject = (raw: string): string => {
  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();

  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }
  return raw;
};

const buildFallbackAIResponse = (userMessage: string, products: Product[]): AIResponse => {
  const normalized = userMessage.toLowerCase();
  const matchedStyle = CATEGORIES.find(style => normalized.includes(style));
  const catalog = matchedStyle
    ? products.filter(p => (p.style || '').toLowerCase() === matchedStyle)
    : products;
  const picks = catalog.slice(0, 3).map(p => p.id);

  const styleLabel = matchedStyle || 'casual chic';
  return {
    analysis: "Réponse de secours locale (sans IA externe).",
    recommendation: `Très bon choix. Pour votre demande "${userMessage}", je vous conseille une base ${styleLabel} avec une coupe propre et des couleurs neutres. Si vous le souhaitez, je peux affiner selon votre budget, morphologie, et occasion.`,
    outfitSuggestion: `Haut structuré + bas ${styleLabel} + sneakers propres + accessoire discret pour équilibrer la silhouette.`,
    styleTip: "Privilégiez 2 couleurs dominantes maximum pour garder un look premium et cohérent.",
    productIds: picks
  };
};

export const getAIStylistRecommendation = async (
  userMessage: string,
  history: { role: 'user' | 'model', text: string }[]
): Promise<AIResponse> => {
  const products = await getProducts();
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  if (!apiKey) {
    return buildFallbackAIResponse(userMessage, products);
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstructions = `
    Tu es "Hamza", le conseiller en image IA exclusif et prestigieux de la Maison CARTHENA. 
    Ta mission est d'offrir une expérience client exceptionnelle, chaleureuse mais toujours vouvoyée, avec un vocabulaire pointu mêlant luxe et modernité (streetwear, old money, casual chic).

    RÈGLES DE CONDUITE (TRÈS IMPORTANT):
    1. VOUVOYEMENT ET ÉLÉGANCE : Vouvoie systématiquement le client. Sois courtois, raffiné, mais accessible et passionné par la mode.
    2. SOUPLESSE ET DIALOGUE : 
       - Si le client dit juste "bonjour", réponds chaleureusement en te présentant (Hamza) et demande comment tu peux l'aider, SANS forcer de vêtements.
       - Si le client pose une question de style générale (ex: "comment s'habiller pour un date"), donne des conseils experts en couleurs, matières, et coupes.
    3. HORS-SUJET : Si la question n'a absolument aucun rapport avec la mode ou le lifestyle, réponds brièvement avec humour, puis ramène la conversation sur le style vestimentaire.
    4. RECOMMANDATIONS PRODUITS : Ne propose des articles de la boutique QUE si c'est pertinent par rapport à la demande. Laisse la liste "productIds" vide si ce n'est pas le moment de vendre.
    5. LE "STYLE TIP" : Ajoute toujours une petite astuce mode secrète ou un conseil de styliste en bonus ("styleTip").
    6. STYLES DISPONIBLES : baggy, oversize, old money, streetwear, minimalist, jeans, survetements, polo, chemises, costumes, sportswear, casual, sneakers, accessoires, vestes, manteaux, t-shirts, pulls, shorts, pantalons, vintage, y2k, gothique, techwear, luxe, robes, jupes, maillots, loungewear, cargos, denim.
    7. ADAPTATION : La réponse doit toujours suivre exactement l'intention du client (occasion, style, budget, météo, etc.), et ne jamais répéter un message d'erreur générique.

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

  try {
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

    const rawText = response.text || "{}";
    const jsonText = extractJsonObject(rawText);
    const parsed = JSON.parse(jsonText) as Partial<AIResponse>;

    return {
      analysis: parsed.analysis,
      recommendation: parsed.recommendation || "Je vous propose un look net et moderne. Donnez-moi l'occasion exacte pour une recommandation ultra-précise.",
      outfitSuggestion: parsed.outfitSuggestion,
      styleTip: parsed.styleTip || "Un contraste léger entre le haut et le bas structure mieux la silhouette.",
      productIds: Array.isArray(parsed.productIds) ? parsed.productIds.map(String) : []
    };
  } catch (error) {
    console.error("AI fallback used:", error);
    return buildFallbackAIResponse(userMessage, products);
  }
};
