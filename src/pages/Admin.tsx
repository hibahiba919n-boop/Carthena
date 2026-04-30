import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Package, 
  ShoppingBag, 
  Plus, 
  Edit3, 
  Trash2, 
  BarChart3, 
  LayoutDashboard,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowRight,
  User,
  X,
  Check,
  Ban
} from 'lucide-react';
import { 
  getProducts, 
  getOrders, 
  saveProduct, 
  deleteProduct, 
  updateOrderStatus,
  uploadProductImage,
  Product, 
  Order,
  CATEGORIES,
  STANDARD_SIZES
} from '../services/store';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'stats' | 'products' | 'orders'>('stats');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const refreshData = async () => {
    const [p, o] = await Promise.all([getProducts(), getOrders()]);
    setProducts(p || []);
    setOrders(o || []);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [colorsInput, setColorsInput] = useState('');

  useEffect(() => {
    if (!editingProduct) {
      setSelectedSizes([]);
      setColorsInput('');
      return;
    }

    const sizes = Array.from(
      new Set((editingProduct.colorVariants || []).flatMap(variant => variant.availableSizes || []))
    );
    const colors = (editingProduct.colorVariants || []).map(variant => variant.color).join(', ');

    setSelectedSizes(sizes);
    setColorsInput(colors);
  }, [editingProduct]);

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const id = editingProduct?.id || Math.random().toString(36).substr(2, 9);
      const imageFile = formData.get('imageFile') as File | null;
      const imageUrlField = ((formData.get('imageUrl') as string) || '').trim();

      let finalImageUrl = imageUrlField || editingProduct?.imageUrl || '';
      if (imageFile && imageFile.size > 0) {
        finalImageUrl = await uploadProductImage(imageFile);
      }

      if (!finalImageUrl) {
        throw new Error("Veuillez fournir une image (upload ou URL).");
      }

      const normalizedStyle = ((formData.get('style') as string) || '').trim().toLowerCase();
      const colors = colorsInput
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);
      const variants = colors.length
        ? colors.map(color => ({ color, availableSizes: selectedSizes }))
        : undefined;
      
      const newProduct: Product = {
        id,
        name: formData.get('name') as string,
        price: Number(formData.get('price')),
        brand: formData.get('brand') as string,
        style: normalizedStyle,
        description: formData.get('description') as string,
        imageUrl: finalImageUrl,
        stock: Number(formData.get('stock')),
        colorVariants: variants,
        isOnPromo: formData.get('isOnPromo') === 'on',
        discountedPrice: Number(formData.get('discountedPrice')) || undefined,
        createdAt: editingProduct?.createdAt || new Date().toISOString()
      };

      await saveProduct(newProduct);
      await refreshData();
      setIsAddingProduct(false);
      setEditingProduct(null);
    } catch (err: any) {
      alert(err?.message || "Error saving product. Check console or Supabase RLS.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const handleDelete = async (id: string) => {
    console.log("Admin: Requesting delete for product ID:", id);
    if (confirm('Êtes-vous sûr de vouloir supprimer cet article définitivement ?')) {
      setDeletingId(id);
      try {
        await deleteProduct(id);
        console.log("Admin: Delete successful, refreshing data...");
        await refreshData();
      } catch (err: any) {
        console.error("Admin: Delete error:", err);
        alert("Erreur lors de la suppression: " + (err.message || "Erreur inconnue") + "\n\nID: " + id + "\n\nNote: La suppression peut échouer si l'article est lié à des commandes existantes.");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string, productId?: string) => {
    try {
      await updateOrderStatus(orderId, status as any, productId);
      await refreshData();
    } catch (err: any) {
      alert("Erreur lors de la mise à jour du statut: " + (err.message || "Erreur inconnue") + ". Vérifiez si votre table accepte le statut '" + status + "'");
    }
  };

  // Stats
  const totalRevenue = (orders || []).reduce((acc, order) => {
    if (order.status === 'refused') return acc;
    const prod = (products || []).find(p => p.id === order.productId);
    return acc + (prod?.isOnPromo ? (prod.discountedPrice || prod.price) : (prod?.price || 0));
  }, 0);

  const totalSales = (orders || []).filter(o => o.status !== 'refused').length;
  const pendingOrdersCount = (orders || []).filter(o => o.status === 'pending').length;
  const lowStockItemsCount = (products || []).filter(p => p.stock < 5).length;
  const deliveredOrdersCount = (orders || []).filter(o => o.status === 'delivered').length;

  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const chartData = last7Days.map(date => {
    const dayOrders = (orders || []).filter(o => o.status !== 'refused' && o.createdAt.startsWith(date));
    const dayRevenue = dayOrders.reduce((acc, order) => {
      const prod = (products || []).find(p => p.id === order.productId);
      return acc + (prod?.isOnPromo ? (prod.discountedPrice || prod.price) : (prod?.price || 0));
    }, 0);
    return {
      date: date.split('-').slice(1).join('/'),
      sales: dayOrders.length,
      revenue: dayRevenue
    };
  });

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      {/* Admin Dedicated Brand Bar */}
      <div className="bg-white border-b border-zinc-200 px-6 h-16 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-black tracking-tighter">CARTHENA</Link>
          <div className="h-4 w-px bg-zinc-200 hidden md:block" />
          <span className="hidden md:block text-[10px] font-black tracking-[0.2em] text-zinc-400 uppercase">Control Center</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/" className="text-[10px] font-black tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-2">
            VIEW STORE <ArrowRight size={12} />
          </Link>
          <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200">
            <User size={14} className="text-zinc-600" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 border-b border-zinc-100 pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase">Admin Console</h1>
            <p className="text-zinc-500 text-sm font-mono mt-1">OPERATIONAL CONTROL UNIT V1.0</p>
          </div>

        <div className="flex bg-white border border-zinc-200 mt-6 md:mt-0 overflow-x-auto max-w-full no-scrollbar">
          {[
            { id: 'stats', label: 'ANALYTICS', icon: BarChart3 },
            { id: 'products', label: 'INVENTORY', icon: Package },
            { id: 'orders', label: 'LOGISTICS', icon: ShoppingBag },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 md:px-6 py-3 text-[9px] md:text-[10px] font-black tracking-[0.15em] md:tracking-[0.2em] transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'bg-ink text-beige' : 'hover:bg-zinc-50 text-zinc-400'
              }`}
            >
              <tab.icon size={14} className="flex-shrink-0" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'stats' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="premium-card p-8">
                <span className="text-[10px] font-black tracking-widest opacity-30 block mb-2 uppercase">Gross Revenue</span>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black">{totalRevenue.toLocaleString()} <span className="text-sm opacity-50">DZD</span></span>
                  <div className="bg-green-100 text-green-700 p-2 rounded-full">
                    <ArrowUpRight size={16} />
                  </div>
                </div>
              </div>
              <div className="premium-card p-8">
                <span className="text-[10px] font-black tracking-widest opacity-30 block mb-2 uppercase">Total Sales</span>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black">{totalSales}</span>
                  <div className="bg-zinc-100 text-ink p-2 rounded-full">
                    <ShoppingBag size={16} />
                  </div>
                </div>
              </div>
              <div className="premium-card p-8 border-yellow-200 bg-yellow-50/30">
                <span className="text-[10px] font-black tracking-widest opacity-50 block mb-2 uppercase text-yellow-800">Pending Logistics</span>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-yellow-800">{pendingOrdersCount}</span>
                  <div className="bg-yellow-100 text-yellow-700 p-2 rounded-full">
                    <Clock size={16} />
                  </div>
                </div>
              </div>
              <div className="premium-card p-8 border-red-200 bg-red-50/30">
                <span className="text-[10px] font-black tracking-widest opacity-50 block mb-2 uppercase text-red-800">Low Stock Alerts</span>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-red-800">{lowStockItemsCount} <span className="text-sm opacity-50">SKU</span></span>
                  <div className="bg-red-100 text-red-700 p-2 rounded-full">
                    <Package size={16} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 premium-card p-8">
                <h3 className="text-[10px] font-black tracking-widest opacity-30 uppercase mb-8">Revenue (Last 7 Days)</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#a1a1aa' }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#a1a1aa' }}
                        dx={-10}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f4f4f5' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="revenue" fill="#18181b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="premium-card p-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-[10px] font-black tracking-widest opacity-30 uppercase mb-8">System Health</h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span>Delivery Success</span>
                        <span>{totalSales > 0 ? Math.round((deliveredOrdersCount / totalSales) * 100) : 0}%</span>
                      </div>
                      <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full" style={{ width: `${totalSales > 0 ? (deliveredOrdersCount / totalSales) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span>Catalog Active</span>
                        <span>{products.length} Items</span>
                      </div>
                      <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-ink h-full w-full" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-8 border-t border-zinc-100">
                  <Link to="/" className="btn-primary w-full flex items-center justify-center gap-2 text-xs py-3">
                    <ShoppingBag size={14} /> VIEW STOREFRONT
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'products' && (
          <motion.div 
            key="products"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <button 
              onClick={() => setIsAddingProduct(true)}
              className="btn-primary w-full md:w-auto flex items-center justify-center gap-2"
            >
              <Plus size={18} /> ADD NEW PRODUCT
            </button>

            <div className="bg-white border border-zinc-200 overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-zinc-50 border-b border-zinc-100 font-black text-[10px] tracking-widest uppercase">
                  <tr>
                    <th className="p-6">Product</th>
                    <th className="p-6">Style</th>
                    <th className="p-6">Price</th>
                    <th className="p-6">Stock</th>
                    <th className="p-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {products.map(product => (
                    <tr key={product.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <img src={product.imageUrl} className="w-12 h-16 object-cover bg-zinc-100" />
                          <div>
                            <p className="font-bold">{product.name}</p>
                            <p className="text-xs opacity-50 uppercase">{product.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 text-xs font-bold opacity-50 uppercase tracking-widest">{product.style}</td>
                      <td className="p-6 font-bold">{product.price.toLocaleString()} DZD</td>
                      <td className="p-6">
                        <span className={`text-xs font-black px-2 py-1 ${product.stock < 5 ? 'bg-red-100 text-red-600' : 'bg-zinc-100'}`}>
                          {product.stock} UNITS
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-3">
                          <button 
                            onClick={() => setEditingProduct(product)}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded text-[10px] font-black uppercase tracking-widest transition-colors"
                          >
                            <Edit3 size={14} /> MODIFIER
                          </button>
                          <button 
                            onClick={() => handleDelete(product.id)}
                            disabled={deletingId === product.id}
                            className={`flex items-center gap-2 px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-colors shadow-md ${
                              deletingId === product.id 
                                ? "bg-zinc-300 text-zinc-500 cursor-not-allowed" 
                                : "bg-red-600 hover:bg-red-700 text-white"
                            }`}
                          >
                            <Trash2 size={14} /> {deletingId === product.id ? "CHARGEMENT..." : "SUPPRIMER"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'orders' && (
          <motion.div 
            key="orders"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white border border-zinc-200 overflow-x-auto"
          >
            <table className="w-full text-left min-w-[900px]">
                <thead className="bg-zinc-50 border-b border-zinc-100 font-black text-[10px] tracking-widest uppercase">
                  <tr>
                    <th className="p-6">Order ID</th>
                    <th className="p-6">Customer</th>
                    <th className="p-6">Phone / Wilaya</th>
                    <th className="p-6">Product</th>
                    <th className="p-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="p-6 font-mono text-[10px] opacity-50">#{order.id}</td>
                      <td className="p-6">
                        <p className="font-bold">{order.customerFirstName} {order.customerLastName}</p>
                        <p className="text-[10px] opacity-40 uppercase">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="p-6">
                        <p className="text-sm font-medium">{order.phone}</p>
                        <p className="text-xs opacity-50 uppercase">{order.wilaya}</p>
                      </td>
                      <td className="p-6 font-bold truncate max-w-[150px]">{order.productName}</td>
                      <td className="p-6">
                        <div className="flex flex-col gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                            order.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                            order.status === 'processed' ? 'bg-blue-50 text-blue-700' :
                            order.status === 'refused' ? 'bg-red-50 text-red-700' :
                            'bg-green-50 text-green-700'
                          }`}>
                            <Clock size={10} /> {order.status}
                          </span>
                          
                          {order.status === 'pending' && (
                            <div className="flex gap-1 mt-2">
                              <button 
                                onClick={() => handleUpdateOrderStatus(order.id, 'processed')}
                                className="flex-1 bg-green-600 text-white p-1 flex justify-center hover:bg-green-700 transition-colors"
                                title="Accept"
                              >
                                <Check size={14} />
                              </button>
                              <button 
                                onClick={() => handleUpdateOrderStatus(order.id, 'refused')}
                                className="flex-1 bg-red-600 text-white p-1 flex justify-center hover:bg-red-700 transition-colors"
                                title="Refuse"
                              >
                                <Ban size={14} />
                              </button>
                            </div>
                          )}
                          
                          {order.status === 'processed' && (
                            <div className="flex gap-1 mt-2">
                              <button 
                                onClick={() => handleUpdateOrderStatus(order.id, 'delivered', order.productId)}
                                className="flex-1 bg-ink text-beige py-1 text-[9px] uppercase font-black tracking-widest hover:bg-zinc-800 transition-colors"
                                title="Mark as Delivered (-1 Stock)"
                              >
                                Livré
                              </button>
                              <button 
                                onClick={() => handleUpdateOrderStatus(order.id, 'refused')}
                                className="flex-1 bg-zinc-200 text-ink py-1 text-[9px] uppercase font-black tracking-widest hover:bg-zinc-300 transition-colors"
                                title="Mark as Returned (Stock unchanged)"
                              >
                                Retour
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && (
                <div className="py-20 text-center opacity-30 font-mono text-sm uppercase">NO ACTIVE LOGISTICS DATA</div>
              )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Modal */}
      {(isAddingProduct || editingProduct) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-ink/90 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-12 relative"
          >
            <button 
              onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }}
              className="absolute top-8 right-8 p-2 hover:bg-zinc-100 rounded-full"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-3xl font-black mb-8 uppercase">
              {editingProduct ? 'EDIT SYSTEM RECORD' : 'NEW SYSTEM RECORD'}
            </h2>
            
            <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">Name</label>
                <input required name="name" defaultValue={editingProduct?.name} className="input-field" placeholder="GHOST HOODIE" />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">Brand</label>
                <input required name="brand" defaultValue={editingProduct?.brand} className="input-field" placeholder="CARTHENA" />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">Style</label>
                <input required name="style" list="style-suggestions" defaultValue={editingProduct?.style} className="input-field" placeholder="old money, baggy, ..." />
                <datalist id="style-suggestions">
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div className="col-span-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">Price (DZD)</label>
                <input required type="number" name="price" defaultValue={editingProduct?.price} className="input-field" placeholder="0.00" />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">Stock</label>
                <input required type="number" name="stock" defaultValue={editingProduct?.stock} className="input-field" placeholder="100" />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">Image Upload</label>
                <input name="imageFile" type="file" accept="image/*" className="input-field file:mr-4 file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:font-bold" />
                <p className="text-[11px] text-zinc-500 mt-2">Upload prioritaire. Si vide, l'URL ci-dessous sera utilisée.</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">Image URL (fallback)</label>
                <input name="imageUrl" defaultValue={editingProduct?.imageUrl} className="input-field" placeholder="https://..." />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">Couleurs (séparées par virgule)</label>
                <input
                  value={colorsInput}
                  onChange={(e) => setColorsInput(e.target.value)}
                  className="input-field"
                  placeholder="Noir, Blanc, Marron"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">Tailles disponibles</label>
                <div className="flex flex-wrap gap-2">
                  {STANDARD_SIZES.map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(size)}
                      className={`px-4 py-2 border text-xs font-black tracking-widest ${
                        selectedSizes.includes(size)
                          ? 'bg-ink text-beige border-ink'
                          : 'bg-white text-zinc-500 border-zinc-200'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">Description</label>
                <textarea required name="description" defaultValue={editingProduct?.description} className="input-field min-h-[100px]" />
              </div>
              <div className="md:col-span-2 flex flex-col md:flex-row items-start md:items-center gap-4 py-4 bg-zinc-50 px-6">
                <div className="flex items-center gap-4">
                  <input type="checkbox" id="isOnPromo" name="isOnPromo" defaultChecked={editingProduct?.isOnPromo} className="w-5 h-5 accent-ink" />
                  <label htmlFor="isOnPromo" className="text-xs font-bold">ENABLE PROMOTIONAL PRICING</label>
                </div>
                <input type="number" name="discountedPrice" defaultValue={editingProduct?.discountedPrice} className="input-field w-full md:max-w-[150px] h-10 py-1" placeholder="Sale DZD" />
              </div>

              <div className="md:col-span-2 pt-6">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="btn-primary w-full text-lg disabled:opacity-50"
                >
                  {isSaving ? 'UPLOADING...' : 'UPLOAD DATA RECORD'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      </div>
    </div>
  );
}
