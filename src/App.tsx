import { Route, Routes, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import { CartDrawer } from './components/CartDrawer';

export default function App() {
  const adminPage = useLocation().pathname.replace(/\/+$/, '') === '/admin';
  return <>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
    {!adminPage && <CartDrawer />}
  </>;
}
