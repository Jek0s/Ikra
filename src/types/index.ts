export type Category = 'red' | 'black' | 'sets' | 'other';
export type Product = { id: string; name: string; subtitle: string; category: Category; price: number; old_price: number | null; weight: string; image: string; description: string; badge: string | null; active: boolean; featured: boolean; created_at?: string };
export type CartItem = { productId: string; quantity: number };
export type OrderItem = { product_id: string; name: string; price: number; quantity: number };
export type OrderStatus = 'new' | 'processing' | 'shipped' | 'done' | 'cancelled';
export type Order = { id: string; customer_name: string; customer_phone: string; city: string; comment: string; items: OrderItem[]; total: number; status: OrderStatus; created_at: string };
export type CheckoutPayload = Pick<Order, 'customer_name' | 'customer_phone' | 'city' | 'comment'> & {items: CartItem[]};
