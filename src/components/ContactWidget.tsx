import { useEffect, useRef, useState } from 'react';
import { Instagram, MessageCircle, Phone, Send, X } from 'lucide-react';
import { useSiteContent } from '../context/SiteContentContext';
import { useShop } from '../context/ShopContext';
import './ContactWidget.css';

function TikTokIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 2c.5 2.7 2 4.3 4.4 4.5v3.2a9.3 9.3 0 0 1-4.4-1.4v7.6a6.2 6.2 0 1 1-5.4-6.1v3.3a3 3 0 1 0 2.1 2.8V2h3.3Z" /></svg>;
}

function ChatIcon({ viber = false }: { viber?: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.5 11.5a8.5 8.5 0 0 1-12.7 7.4L3 20l1.2-4.7A8.5 8.5 0 1 1 20.5 11.5Z" /><path d="M8.2 7.7c-.6 3.8 2.3 6.8 5.9 7l1.3-1.7-2-1.1-.9.8a6 6 0 0 1-2.3-2.3l.7-.9-1.2-2.1-1.5.3Z" />{viber && <><path d="M13 5.5a5 5 0 0 1 5 5" /><path d="M13 8a2.5 2.5 0 0 1 2.5 2.5" /></>}</svg>;
}

export default function ContactWidget() {
  const { contacts, text } = useSiteContent();
  const [open, setOpen] = useState(false);
  const [iconIndex, setIconIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const { cartOpen } = useShop();
  useEffect(() => {
    if (open || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setIconIndex(value => (value + 1) % 4), 2700);
    return () => window.clearInterval(timer);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); } };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeEscape); };
  }, [open]);
  useEffect(() => { if (cartOpen) setOpen(false); }, [cartOpen]);
  const contactLinks = [
    { label: 'WhatsApp', detail: 'Написати повідомлення', href: contacts.whatsapp, icon: <ChatIcon /> },
    { label: 'Телефон', detail: contacts.phone, href: contacts.phoneHref, icon: <Phone size={22} /> },
    { label: 'Instagram', detail: contacts.instagramLabel, href: contacts.instagram, icon: <Instagram size={22} /> },
    ...(contacts.telegram ? [{ label: 'Telegram', detail: 'Написати в Telegram', href: contacts.telegram, icon: <Send size={22} /> }] : []),
    { label: 'Viber', detail: 'Написати повідомлення', href: contacts.viber, icon: <ChatIcon viber /> },
    { label: 'TikTok', detail: contacts.tiktokLabel, href: contacts.tiktok, icon: <TikTokIcon /> },
  ];
  const icons = [<TikTokIcon />, <ChatIcon viber />, <ChatIcon />, <Phone size={24} />];
  return <div className="contact-widget" ref={root} hidden={cartOpen}>
    {open && <div className="contact-widget__panel" id="contact-panel" role="region" aria-label="Контакти IKRA DeLuxe">
      <div className="contact-widget__heading"><span>{text('contacts', 'widgetCaption')}</span><strong>{text('contacts', 'widgetTitle')}</strong></div>
      {contactLinks.filter(contact => contact.href).map(contact => <a className="contact-widget__item" key={contact.label} href={contact.href} {...(contact.href.startsWith('https:') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}><span className="contact-widget__icon">{contact.icon}</span><span><strong>{contact.label}</strong><small>{contact.detail}</small></span></a>)}
    </div>}
    <button type="button" className={`contact-widget__toggle ${open ? 'is-open' : ''}`} ref={toggle} onClick={() => setOpen(value => !value)} aria-label={open ? 'Закрити контакти' : 'Відкрити контакти IKRA DeLuxe'} aria-expanded={open} aria-controls="contact-panel">
      {open ? <X size={25} /> : <span className="contact-widget__rotating-icon" key={iconIndex}>{icons[iconIndex]}</span>}
    </button>
    {!open && <span className="contact-widget__hint"><MessageCircle size={12} /> {text('contacts', 'widgetHint')}</span>}
  </div>;
}
