import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { CartItem, Product } from '../types';
import { getProducts } from '../lib/store';
import { getOffers, offerToProduct } from '../lib/offers';
import type { OfferBundle } from '../data/offers';
type Theme='light'|'dark';
type ShopContextValue={theme:Theme; toggleTheme:()=>void; products:Product[]; offers:OfferBundle[]; reload:()=>Promise<void>; loading:boolean; error:string; cart:CartItem[]; count:number; total:number; add:(id:string)=>void; changeQuantity:(id:string,step:number)=>void; clearCart:()=>void; cartOpen:boolean; setCartOpen:(v:boolean)=>void};
const ShopContext=createContext<ShopContextValue|null>(null);
function savedCart():CartItem[]{try{return JSON.parse(localStorage.getItem('aurora_cart')||'[]') as CartItem[];}catch{return [];}}
export function ShopProvider({children}:PropsWithChildren){const [theme,setTheme]=useState<Theme>(()=>localStorage.getItem('aurora_theme')==='dark'?'dark':'light');const [products,setProducts]=useState<Product[]>([]);const [offers,setOffers]=useState<OfferBundle[]>(()=>getOffers());const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [cart,setCart]=useState<CartItem[]>(savedCart);const [cartOpen,setCartOpen]=useState(false);
 const reload=useCallback(async()=>{try{setError('');const [freshProducts, freshOffers] = await Promise.all([getProducts(), Promise.resolve(getOffers())]);setProducts([...freshProducts, ...freshOffers.filter(o=>o.active).map(offerToProduct)]);setOffers(freshOffers);}catch(e){setError(e instanceof Error?e.message:'Не вдалося завантажити товари');}finally{setLoading(false);}},[]);
 useEffect(()=>{void reload();const h=()=>{void reload();};window.addEventListener('aurora-store-changed',h);return()=>window.removeEventListener('aurora-store-changed',h);},[reload]);
 useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('aurora_theme',theme);},[theme]);
 useEffect(()=>{localStorage.setItem('aurora_cart',JSON.stringify(cart));},[cart]);
 const add=(id:string)=>{setCart(prev=>{const found=prev.find(x=>x.productId===id);return found?prev.map(x=>x.productId===id?{...x,quantity:x.quantity+1}:x):[...prev,{productId:id,quantity:1}];});setCartOpen(true);};
 const changeQuantity=(id:string,step:number)=>setCart(prev=>prev.map(x=>x.productId===id?{...x,quantity:x.quantity+step}:x).filter(x=>x.quantity>0));
 const count=cart.reduce((n,x)=>n+x.quantity,0);const total=cart.reduce((n,x)=>n+(products.find(p=>p.id===x.productId)?.price??0)*x.quantity,0);
 const value=useMemo(()=>({theme,toggleTheme:()=>setTheme(t=>t==='light'?'dark':'light'),products,offers,reload,loading,error,cart,count,total,add,changeQuantity,clearCart:()=>setCart([]),cartOpen,setCartOpen}),[theme,products,offers,reload,loading,error,cart,count,total,cartOpen]);return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;}
export function useShop(){const value=useContext(ShopContext);if(!value)throw new Error('ShopProvider missing');return value;}
