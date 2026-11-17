import { useSiteContent } from '../context/SiteContentContext';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Moon, Phone, ShoppingBag, Sun, X } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import './Header.css';

export default function Header() {
  const { text, visible, contacts } = useSiteContent();
  const { theme, toggleTheme, count, setCartOpen } = useShop();
  const [mobile, setMobile] = useState(false);
  const location = useLocation();
  const links: Array<[string, string]> = [
    ['#catalog', text('header', 'navCatalog')],
    ['#offers', text('header', 'navOffers')],
    ['#about', text('header', 'navAbout')],
    ['#delivery', text('header', 'navDelivery')],
    ['#faq', text('header', 'navFaq')],
  ];
  const targets: Record<string, string> = { '#catalog': 'catalog', '#offers': 'promo', '#about': 'about', '#delivery': 'delivery', '#faq': 'faq' };

  return (
    <>
      <div className="topbar">
        <a href={contacts.phoneHref} className="topbar-phone"><Phone size={13} /> {contacts.phone}</a>
        <span className="topbar-center">{text('header', 'text1')}</span>
        <span>{text('header', 'text2')}</span>
      </div>

      <header className="header">
        <div className="container header-inner">
          <Link to="/" className="brand" onClick={() => setMobile(false)}>
            <img className="brand-logo" src={text('seo', 'logo')} alt={text('header', 'field3')} />
            <span className="brand-type">
              <strong>{text('header', 'text4')}</strong>
              <small>{text('header', 'text5')}</small>
            </span>
          </Link>

          <nav className={mobile ? 'nav nav-open' : 'nav'}>
            {links.filter(([href]) => visible(targets[href])).map(([href, label]) => (
              <a key={href} href={location.pathname === '/' ? href : `/${href}`} onClick={() => setMobile(false)}>
                {label}
              </a>
            ))}
          </nav>

          <div className="header-actions">
            <a className="header-phone" href={contacts.phoneHref} aria-label={`Зателефонувати ${contacts.phone}`}><Phone size={17}/><span>{contacts.phone}</span></a>
            <button aria-label="Змінити тему" title="Світла / темна тема" className="icon-btn" onClick={toggleTheme}>
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button aria-label="Відкрити кошик" className="cart-btn" onClick={() => setCartOpen(true)}>
              <ShoppingBag size={19} />
              <span>{text('header', 'text6')}</span>
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
