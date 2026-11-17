import { getOrderSource } from './lib/order-source';
import { SiteContentProvider } from './context/SiteContentContext';
import React from 'react';import ReactDOM from 'react-dom/client';import { BrowserRouter } from 'react-router-dom';import { ShopProvider } from './context/ShopContext';import App from './App';import './styles/global.css';
getOrderSource();
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><SiteContentProvider><ShopProvider><App/></ShopProvider></SiteContentProvider></BrowserRouter></React.StrictMode>);
