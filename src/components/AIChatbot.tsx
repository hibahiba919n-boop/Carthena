import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Sparkles, User, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAIStylistRecommendation, AIResponse, Product, getProducts } from '../services/store';

interface Message {
  role: 'user' | 'model';
  text: string;
  data?: AIResponse;
}

export default function AIChatbot({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [catalog, setCatalog] = useState<Product[]>([]);

  useEffect(() => {
    if (isOpen) {
      getProducts().then(setCatalog);
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const historyForAI = messages.map(m => ({ role: m.role, text: m.text }));
      const response = await getAIStylistRecommendation(userMsg, historyForAI);
      
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: response.recommendation,
        data: response
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Veuillez m'excuser, je rencontre une difficulté technique momentanée. Pourriez-vous reformuler votre demande, s'il vous plaît ?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const findProduct = (id: string) => catalog.find(p => p.id === id);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[50]"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-xl bg-beige z-[60] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-zinc-200 flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-ink rounded-full flex items-center justify-center text-beige">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Hamza</h2>
                  <p className="text-[10px] font-black tracking-widest opacity-30">VOTRE STYLISTE PERSONNEL</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full">
                <X size={24} />
              </button>
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-grow overflow-y-auto p-8 space-y-8">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center px-12">
                  <div className="w-20 h-20 bg-white border border-zinc-200 rounded-full flex items-center justify-center mb-8 shadow-xl">
                    <Sparkles size={32} className="text-zinc-300" />
                  </div>
                  <h3 className="text-2xl font-black uppercase mb-4">Besoin d'aide pour votre look ?</h3>
                  <p className="text-zinc-500 font-light text-sm leading-relaxed mb-8">
                    "Je cherche un look casual pour le week-end" / "Suggère-moi un costume élégant"
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {['STREETWEAR', 'OLD MONEY', 'CASUAL', 'COSTUMES', 'SURVETEMENTS', 'BAGGY', 'OVERSIZE', 'TECHWEAR', 'VINTAGE', 'LUXE'].map(t => (
                      <button 
                        key={t}
                        onClick={() => setInput(`Je veux un look ${t.toLowerCase()} pour une sortie.`)}
                        className="px-4 py-2 bg-white border border-zinc-200 text-[10px] font-black tracking-widest hover:border-ink transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] p-6 ${
                    m.role === 'user' 
                      ? 'bg-ink text-beige rounded-2xl' 
                      : 'bg-white border border-zinc-200 rounded-2xl shadow-sm'
                  }`}>
                    <p className="text-sm font-light leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    
                    {m.data && (
                       <div className="mt-8 pt-8 border-t border-zinc-100">
                          {m.data.productIds && m.data.productIds.length > 0 && (
                            <>
                              <p className="text-[10px] font-black tracking-widest opacity-30 uppercase mb-4">Recommandations Styliste</p>
                              <div className="grid grid-cols-1 gap-4">
                                {m.data.productIds.map(pid => {
                                  const p = findProduct(pid);
                                  if (!p) return null;
                                  return (
                                    <Link 
                                      key={pid} 
                                      to={`/product/${p.id}`}
                                      onClick={onClose}
                                      className="flex items-center gap-4 bg-zinc-50 p-4 hover:bg-zinc-100 transition-colors border border-zinc-100"
                                    >
                                      <img src={p.imageUrl} className="w-12 h-16 object-cover" />
                                      <div className="flex-grow">
                                        <p className="text-xs font-bold uppercase tracking-tight">{p.name}</p>
                                        <p className="text-[10px] font-mono opacity-50">{p.price.toLocaleString()} DZD</p>
                                      </div>
                                      <ArrowRight size={14} className="opacity-30" />
                                    </Link>
                                  );
                                })}
                              </div>
                            </>
                          )}
                          {m.data.outfitSuggestion && (
                            <div className="mt-6 p-4 bg-zinc-900 text-beige text-xs font-light italic leading-relaxed">
                              " {m.data.outfitSuggestion} "
                            </div>
                          )}
                          {m.data.styleTip && (
                            <div className="mt-4 p-4 bg-zinc-50 text-zinc-600 text-[10px] font-mono font-bold tracking-widest uppercase border border-zinc-200">
                              💡 Style Tip: {m.data.styleTip}
                            </div>
                          )}
                       </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-4 animate-pulse">
                  <div className="p-6 bg-white border border-zinc-200 rounded-2xl text-xs font-black tracking-widest opacity-20">
                     STYLING IN PROGRESS...
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-8 bg-white border-t border-zinc-200">
              <div className="flex gap-4">
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask your stylist..." 
                  className="flex-grow bg-zinc-50 border border-zinc-200 px-6 py-4 outline-none focus:border-ink transition-all font-light"
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="bg-ink text-beige w-14 h-14 flex items-center justify-center disabled:opacity-30 transition-opacity"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
