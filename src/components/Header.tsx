import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Moon, Phone, ShoppingBag, Sun, X } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_HREF } from '../config/contact';
import './Header.css';

export default function Header() {
  const { theme, toggleTheme, count, setCartOpen } = useShop();
  const [mobile, setMobile] = useState(false);
  const location = useLocation();
  const links: Array<[string, string]> = [
    ['#catalog', 'Каталог'],
    ['#offers', 'Акції'],
    ['#about', 'Про нас'],
    ['#delivery', 'Доставка'],
    ['#faq', 'FAQ'],
  ];

  return (
    <>
      <div className="topbar">
        <a href={CONTACT_PHONE_HREF} className="topbar-phone"><Phone size={13} /> {CONTACT_PHONE_DISPLAY}</a>
        <span className="topbar-center">Відкрийте смак особливих моментів •</span>
        <span>ДОСТАВКА ПО УКРАЇНІ</span>
      </div>

      <header className="header">
        <div className="container header-inner">
          <Link to="/" className="brand" onClick={() => setMobile(false)}>
            <img className="brand-logo" src="/ikra-deluxe-logo.png" alt="IKRA DeLuxe" />
            <span className="brand-type">
              <strong>IKRA</strong>
              <small>DeLuxe</small>
            </span>
          </Link>

          <nav className={mobile ? 'nav nav-open' : 'nav'}>
            {links.map(([href, label]) => (
              <a key={href} href={location.pathname === '/' ? href : `/${href}`} onClick={() => setMobile(false)}>
                {label}
              </a>
            ))}
          </nav>

          <div className="header-actions">
            <a className="header-phone" href={CONTACT_PHONE_HREF} aria-label={`Зателефонувати ${CONTACT_PHONE_DISPLAY}`}><Phone size={17}/><span>{CONTACT_PHONE_DISPLAY}</span></a>
            <button aria-label="Змінити тему" title="Світла / темна тема" className="icon-btn" onClick={toggleTheme}>
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button aria-label="Відкрити кошик" className="cart-btn" onClick={() => setCartOpen(true)}>
              <ShoppingBag size={19} />
              <span>Кошик</span>
              <em>{count}</em>
            </button>
            <button aria-label="Меню" className="icon-btn menu-btn" onClick={() => setMobile((value) => !value)}>
              {mobile ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
