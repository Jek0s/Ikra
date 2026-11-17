import { useSiteContent } from '../context/SiteContentContext';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Gift, Instagram, Pause, Play, Star } from 'lucide-react';
import './StorefrontExtras.css';

const CYCLE = 3 * 24 * 60 * 60 * 1000;
const DEADLINE_KEY = 'ikra_promotion_deadline_v1';

export function remainingPromotionTime(now: number, deadline: number): number {
  if (deadline > now) return deadline - now;
  return CYCLE - ((now - deadline) % CYCLE);
}

function getDeadline(): number {
  const now = Date.now();
  try {
    const saved = Number(localStorage.getItem(DEADLINE_KEY));
    const deadline = saved > 0 && Number.isFinite(saved) ? now + remainingPromotionTime(now, saved) : now + CYCLE;
    localStorage.setItem(DEADLINE_KEY, String(deadline));
    return deadline;
  } catch { return now + CYCLE; }
}

export function PromotionBanner() {
  const { text } = useSiteContent();
  const [deadline] = useState(getDeadline);
  const [remaining, setRemaining] = useState(() => remainingPromotionTime(Date.now(), deadline));
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(remainingPromotionTime(Date.now(), deadline)), 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);
  const seconds = Math.ceil(remaining / 1000);
  const units = [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60];
  return <section className="promotion-banner" aria-label={text('promotion', 'formula')}>
    <div className="promotion-banner__ambience" aria-hidden="true">
      <span /><span /><span /><span /><span />
    </div>
    <div className="container promotion-banner__inner">
      <div className="promotion-banner__copy">
        <div className="promotion-banner__kicker">
          <span className="promotion-banner__formula">{text('promotion', 'formula')}</span>
          <span className="eyebrow"><Gift size={14} /> {text('promotion', 'text3')}</span>
        </div>
        <h2>{text('promotion', 'text4')}<em>{text('promotion', 'text5')}</em></h2>
        <p>{text('promotion', 'description')}</p>
      </div>
      <div className="promotion-banner__timer">
        <span>{text('promotion', 'text9')}</span>
        <div className="countdown" role="timer" aria-label="Час до оновлення пропозицій" aria-live="off">
          {units.map((value, index) => <div className="countdown__unit" key={index}><strong><span className="countdown__digits" key={value}>{String(value).padStart(2, '0')}</span></strong><small>{['дні', 'години', 'хвилини', 'секунди'][index]}</small></div>)}
        </div>
        <small>{text('promotion', 'text10')}</small>
      </div>
      <a href="#offers-grid" className="promotion-banner__link">{text('promotion', 'text11')}<ArrowUpRight size={17} /></a>
    </div>
  </section>;
}

export function PromoTicker() {
  const { items, text } = useSiteContent();
  const [paused, setPaused] = useState(false);
  const messages = items('ticker').map(item => item.text);
  return <div className={`promo-ticker ${paused ? 'is-paused' : ''}`}>
    <div className="promo-ticker__window"><div className="promo-ticker__track">
      {[0, 1].map(copy => <div className="promo-ticker__group" key={copy} aria-hidden={copy === 1}>{messages.map(message => <span key={message}><i aria-hidden="true">{text('ticker', 'text1')}</i>{message}</span>)}</div>)}
    </div></div>
    <button type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Запустити рух рядка' : 'Призупинити рух рядка'}>{paused ? <Play size={13} /> : <Pause size={13} />}</button>
  </div>;
}

export function ReviewsCarousel() {
  const { text, items, contacts } = useSiteContent();
  const reviews = items('reviews');
  const [paused, setPaused] = useState(false);
  return <section className={`reviews-section ${paused ? 'is-paused' : ''}`} id="reviews">
    <div className="container reviews-section__heading">
      <div><span className="eyebrow">{text('reviews', 'text1')}</span><h2>{text('reviews', 'text2')}<em>{text('reviews', 'text3')}</em></h2><p>{text('reviews', 'text4')}</p></div>
      <div className="reviews-section__actions"><a href={contacts.instagram} target="_blank" rel="noopener noreferrer"><Instagram size={17} /> {contacts.instagramLabel}<ArrowUpRight size={16} /></a><button type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Запустити карусель відгуків' : 'Призупинити карусель відгуків'}>{paused ? <Play size={17} /> : <Pause size={17} />}</button></div>
    </div>
    <div className="reviews-window" tabIndex={0} aria-label="Відгуки, рух зупиняється при наведенні або фокусі"><div className="reviews-track">
      {[0, 1].map(copy => <div className="reviews-group" key={copy} aria-hidden={copy === 1}>{reviews.map(review => <article className="review-card" key={review.id}>
        <div className="review-card__top"><span className="review-card__avatar">{review.name?.[0] ?? ''}</span><div><strong>{review.name}</strong><small>{review.city}</small></div><Instagram size={19} /></div>
        <div className="review-card__stars" aria-label="5 зірок">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} fill="currentColor" />)}</div>
        <blockquote>{review.text}</blockquote><span className="review-card__product">{review.product}</span><span className="review-card__brand">IKRA DeLuxe · {contacts.instagramLabel}</span>
      </article>)}</div>)}
    </div></div>
  </section>;
}
