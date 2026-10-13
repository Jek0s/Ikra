import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, MessageCircle } from 'lucide-react';
import './LuxuryFaq.css';

type Question = { question: string; answer: string };
const questions: Question[] = [
  { question: 'Як швидко ви доставляєте?', answer: 'Термін доставки залежить від населеного пункту й роботи перевізника. Менеджер уточнить терміни при підтвердженні замовлення.' },
  { question: 'Як правильно зберігати ікру?', answer: 'Дотримуйтесь температури та терміну зберігання, зазначених на етикетці обраного продукту.' },
  { question: 'Чи можу я замовити подарунковий набір?', answer: 'Так, повідомте про побажання у коментарі до замовлення, а менеджер уточнить доступні варіанти.' },
  { question: 'Як відбувається оплата?', answer: 'Доступні способи оплати та доставки менеджер підтверджує перед відправленням.' },
  { question: 'Як зв’язатися з вами?', answer: 'Напишіть нам в Instagram — посилання є внизу сторінки. Також менеджер зв’яжеться з вами після оформлення замовлення.' },
];
export default function LuxuryFaq() {
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
        <span className="eyebrow">ВІДПОВІДІ З ТУРБОТОЮ</span>
        <h2>Кожна деталь <em>має значення.</em></h2>
        <p>Від першого знайомства до моменту, коли делікатес опиниться на вашому столі.</p>
        <div className="luxury-faq__scene" aria-label="Фірмова баночка IKRA DeLuxe">
          <div className="luxury-faq__halo" aria-hidden="true" />
          <div className="luxury-faq__halo luxury-faq__halo--second" aria-hidden="true" />
          {Array.from({length:10},(_,i)=><i key={i} className={`luxury-faq__roe luxury-faq__roe--${i+1}`} aria-hidden="true" />)}
          <img src="/products/brand-jar.webp" alt="Фірмова баночка червоної ікри IKRA DeLuxe" loading="lazy" />
          <small>IKRA DELUXE · СМАК ОСОБЛИВИХ МИТЕЙ</small>
        </div>
      </div>
      <div className="luxury-faq__right">
        <div className="luxury-faq__intro-line"><span>ВСЕ, ЩО ВАРТО ЗНАТИ</span><MessageCircle size={19}/></div>
        <div className="luxury-faq__list">
          {questions.map(({question,answer},i)=><article className={`luxury-faq__item ${open===i?'is-open':''}`} key={question}>
            <h3><button type="button" aria-expanded={open===i} aria-controls={`faq-panel-${i}`} onClick={()=>setOpen(v=>v===i?null:i)}>{question}<span className="luxury-faq__chevron"><ChevronDown size={18}/></span></button></h3>
            <div className="luxury-faq__answer" id={`faq-panel-${i}`} inert={open!==i}><div><p>{answer}</p></div></div>
          </article>)}
        </div>
        <div className="luxury-faq__cta"><div><strong>Залишились запитання?</strong><span>Завітайте до нашого Instagram</span></div><a href="https://www.instagram.com/_ikra_deluxe_ua/" target="_blank" rel="noopener noreferrer" aria-label="Instagram IKRA DeLuxe"><ArrowUpRight size={21}/></a></div>
      </div>
    </div>
  </section>;
}
