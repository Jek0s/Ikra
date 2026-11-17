import { useSiteContent } from '../context/SiteContentContext';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, MessageCircle } from 'lucide-react';
import './LuxuryFaq.css';

export default function LuxuryFaq() {
  const { text, items, contacts } = useSiteContent();
  const questions = items('faq');
  const [open, setOpen] = useState<number | null>(0);
  const [visible, setVisible] = useState(false);
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = section.current;
    if (!node) return;
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, {threshold: 0.08});
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <section className={`luxury-faq ${visible ? 'luxury-faq--visible' : ''}`} id="faq" ref={section}>
    <div className="luxury-faq__aura" aria-hidden="true" />
    <div className="container luxury-faq__layout">
      <div className="luxury-faq__intro">
        <span className="eyebrow">{text('faq', 'text1')}</span>
        <h2>{text('faq', 'text2')}<em>{text('faq', 'text3')}</em></h2>
        <p>{text('faq', 'text4')}</p>
        <div className="luxury-faq__scene" aria-label="Фірмова баночка IKRA DeLuxe">
          <div className="luxury-faq__halo" aria-hidden="true" />
          <div className="luxury-faq__halo luxury-faq__halo--second" aria-hidden="true" />
          {Array.from({length:10},(_,i)=><i key={i} className={`luxury-faq__roe luxury-faq__roe--${i+1}`} aria-hidden="true" />)}
          <img src={text('faq', 'field5')} alt={text('faq', 'field6')} loading="lazy" />
          <small>{text('faq', 'text7')}</small>
        </div>
      </div>
      <div className="luxury-faq__right">
        <div className="luxury-faq__intro-line"><span>{text('faq', 'text8')}</span><MessageCircle size={19}/></div>
        <div className="luxury-faq__list">
          {questions.map(({question,answer},i)=><article className={`luxury-faq__item ${open===i?'is-open':''}`} key={i}>
            <h3><button type="button" aria-expanded={open===i} aria-controls={`faq-panel-${i}`} onClick={()=>setOpen(v=>v===i?null:i)}>{question}<span className="luxury-faq__chevron"><ChevronDown size={18}/></span></button></h3>
            <div className="luxury-faq__answer" id={`faq-panel-${i}`} inert={open!==i}><div><p>{answer}</p></div></div>
          </article>)}
        </div>
        <div className="luxury-faq__cta"><div><strong>{text('faq', 'text9')}</strong><span>{text('faq', 'text10')}</span></div><a href={contacts.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram IKRA DeLuxe"><ArrowUpRight size={21}/></a></div>
      </div>
    </div>
  </section>;
}
