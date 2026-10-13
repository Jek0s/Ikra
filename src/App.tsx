import { Route, Routes } from 'react-router-dom';import HomePage from './pages/HomePage';import AdminPage from './pages/AdminPage';import { CartDrawer } from './components/CartDrawer';
export default function App(){return <><Routes><Route path="/" element={<HomePage/>}/><Route path="/admin" element={<AdminPage/>}/><Route path="*" element={<HomePage/>}/></Routes><CartDrawer/></>;}
