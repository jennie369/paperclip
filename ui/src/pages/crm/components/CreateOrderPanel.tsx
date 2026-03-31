// CreateOrderPanel — TPOS-style side panel for quick order creation in chat
// Shopify product search + auto-calc + CRM customer pre-fill

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Search, Plus, Minus, Trash2, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { crmApi } from "@/api/crm";

interface CustomerInfo {
  id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  lead_score?: number;
  status?: string;
}

interface CartItem {
  shopify_id?: number;
  variant_id?: number;
  title: string;
  variant_title: string;
  price: number;
  quantity: number;
  sku: string;
  stock: number;
  image_url: string | null;
}

interface Props {
  customer: CustomerInfo;
  sourceChannel?: string;
  onClose: () => void;
  onSuccess?: (order: any) => void;
}

function formatVND(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n || 0) + '₫';
}

export function CreateOrderPanel({ customer, sourceChannel, onClose, onSuccess }: Props) {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountCode, setDiscountCode] = useState("");
  const [shippingName, setShippingName] = useState(customer.display_name || "");
  const [shippingPhone, setShippingPhone] = useState(customer.phone || "");
  const [shippingAddress, setShippingAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [customerNote, setCustomerNote] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setSearchResults([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/channels/crm/orders/products/search?q=${encodeURIComponent(q)}&limit=8`);
        const data = await res.json();
        setSearchResults(data.products || []);
        setShowDropdown(true);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
  }, []);

  const addToCart = (product: any, variant: any) => {
    const existing = cart.find(c => c.variant_id === variant.id);
    if (existing) {
      setCart(cart.map(c => c.variant_id === variant.id ? { ...c, quantity: Math.min(c.quantity + 1, c.stock || 99) } : c));
    } else {
      setCart([...cart, {
        shopify_id: product.id,
        variant_id: variant.id,
        title: product.title,
        variant_title: variant.title || '',
        price: variant.price,
        quantity: 1,
        sku: variant.sku || '',
        stock: variant.stock || 99,
        image_url: product.image_url,
      }]);
    }
    setShowDropdown(false);
    setSearchQuery("");
  };

  const updateQuantity = (idx: number, delta: number) => {
    setCart(cart.map((item, i) => {
      if (i !== idx) return item;
      const qty = Math.max(1, Math.min(item.quantity + delta, item.stock || 99));
      return { ...item, quantity: qty };
    }));
  };

  const removeItem = (idx: number) => setCart(cart.filter((_, i) => i !== idx));

  // Calculations
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount = discountPercent > 0 ? Math.round(subtotal * discountPercent / 100) : 0;
  const shippingFee = subtotal >= 500000 ? 0 : (subtotal > 0 ? 30000 : 0);
  const total = subtotal - discountAmount + shippingFee;

  const createMut = useMutation({
    mutationFn: (d: any) => crmApi.createOrder(d),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['crm'] });
      onSuccess?.(data);
      onClose();
    },
  });

  const handleSubmit = () => {
    if (cart.length === 0) return;
    createMut.mutate({
      customer_id: customer.id || undefined,
      items: cart.map(i => ({
        title: i.title + (i.variant_title ? ` — ${i.variant_title}` : ''),
        price: i.price,
        quantity: i.quantity,
        sku: i.sku,
        shopify_product_id: i.shopify_id,
        shopify_variant_id: i.variant_id,
      })),
      discount_amount: discountAmount,
      discount_code: discountCode || undefined,
      shipping_name: shippingName,
      shipping_phone: shippingPhone,
      shipping_address: shippingAddress || undefined,
      payment_method: paymentMethod,
      customer_note: customerNote || undefined,
      source: 'chat',
      source_channel: sourceChannel,
    });
  };

  return (
    <div className="h-full w-full bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Tạo đơn hàng</h2>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Customer info */}
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground mb-1">Khách hàng</p>
          <p className="text-sm font-medium">{customer.display_name}</p>
          {customer.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
        </div>

        {/* Product search */}
        <div>
          <label className="text-sm font-medium mb-1 block">Sản phẩm</label>
          <div className="relative" ref={searchRef}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Tìm sản phẩm Shopify..."
              className="pl-9"
            />
            {searching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}

            {/* Search dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-auto bg-popover border rounded-lg shadow-xl z-50">
                {searchResults.map((p: any) => (
                  <div key={p.id}>
                    {(p.variants || []).map((v: any) => (
                      <button
                        key={v.id}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted transition-colors disabled:opacity-40"
                        disabled={!v.available}
                        onClick={() => addToCart(p, v)}
                      >
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{p.title}{v.title ? ` — ${v.title}` : ''}</p>
                          <p className="text-xs text-muted-foreground">{formatVND(v.price)} · SKU: {v.sku || '—'} · Kho: {v.stock}</p>
                        </div>
                        {!v.available && <span className="text-[10px] text-destructive font-medium">Hết</span>}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart items */}
        {cart.length > 0 && (
          <div className="space-y-2">
            {cart.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-lg border p-2.5">
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}{item.variant_title ? ` — ${item.variant_title}` : ''}</p>
                  <p className="text-xs text-muted-foreground">{formatVND(item.price)} × {item.quantity} = {formatVND(item.price * item.quantity)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => updateQuantity(idx, -1)} className="p-0.5 rounded hover:bg-muted"><Minus className="h-3.5 w-3.5" /></button>
                  <span className="text-sm w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(idx, 1)} className="p-0.5 rounded hover:bg-muted"><Plus className="h-3.5 w-3.5" /></button>
                  <button onClick={() => removeItem(idx)} className="p-0.5 rounded hover:bg-muted text-destructive ml-1"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Discount */}
        {cart.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Giảm giá (%)</label>
              <Input type="number" min="0" max="100" value={discountPercent} onChange={e => setDiscountPercent(Math.min(100, Number(e.target.value) || 0))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Mã giảm giá</label>
              <Input value={discountCode} onChange={e => setDiscountCode(e.target.value)} placeholder="VD: WELCOME10" />
            </div>
          </div>
        )}

        {/* Totals */}
        {cart.length > 0 && (
          <div className="rounded-lg bg-muted/30 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Tạm tính ({cart.reduce((s, i) => s + i.quantity, 0)} sp):</span><span>{formatVND(subtotal)}</span></div>
            {discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Giảm giá ({discountPercent}%):</span><span>-{formatVND(discountAmount)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Phí vận chuyển:</span><span>{shippingFee === 0 ? 'Miễn phí' : formatVND(shippingFee)}</span></div>
            <div className="flex justify-between font-semibold text-base border-t pt-1.5"><span>Tổng cộng:</span><span className="text-primary">{formatVND(total)}</span></div>
          </div>
        )}

        {/* Shipping */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Giao hàng</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Tên người nhận</label>
              <Input value={shippingName} onChange={e => setShippingName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">SĐT</label>
              <Input value={shippingPhone} onChange={e => setShippingPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Địa chỉ</label>
            <Input value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} placeholder="Địa chỉ giao hàng..." />
          </div>
        </div>

        {/* Payment */}
        <div>
          <p className="text-sm font-medium mb-2">Thanh toán</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'bank_transfer', label: 'Chuyển khoản' },
              { value: 'cod', label: 'COD' },
              { value: 'momo', label: 'MoMo' },
              { value: 'vnpay', label: 'VNPay' },
            ].map(m => (
              <button
                key={m.value}
                onClick={() => setPaymentMethod(m.value)}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  paymentMethod === m.value ? 'bg-primary/10 border-primary/30 text-primary font-medium' : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-muted-foreground">Ghi chú</label>
          <textarea value={customerNote} onChange={e => setCustomerNote(e.target.value)} placeholder="Ghi chú đơn hàng..." className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none" />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Đóng</Button>
        <Button
          className="flex-1"
          disabled={cart.length === 0 || createMut.isPending}
          onClick={handleSubmit}
        >
          {createMut.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Đang tạo...</>
          ) : (
            `Xác nhận ${total > 0 ? formatVND(total) : ''}`
          )}
        </Button>
      </div>
    </div>
  );
}
