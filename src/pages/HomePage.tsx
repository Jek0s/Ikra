import { useSiteContent } from '../context/SiteContentContext';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUpRight,
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  Gift,
  Instagram,
  PackageCheck,
  Phone,
  ShieldCheck,
  Truck,
} from 'lucide-react';

import Header from '../components/Header';
import LuxuryFaq from '../components/LuxuryFaq';
import ProductCard from '../components/ProductCard';
import RoeMark from '../components/RoeMark';
import { PromotionBanner, PromoTicker, ReviewsCarousel } from '../components/StorefrontExtras';
import ContactWidget from '../components/ContactWidget';
import { useShop } from '../context/ShopContext';
import type { Category, Product } from '../types';
import type { OfferBundle } from '../data/offers';
import './HomePage.css';
import './HomeExtras.css';

type Filter = 'all' | Category;

function getSpecs(product: Product): string[] {
  return product.description
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function HomePage() {
  const { text, visible, items, contacts } = useSiteContent();
  const quoteItems = items('quotes');
  const { products, offers, add, loading, error, setCartOpen } = useShop();
  const offerBundles: OfferBundle[] = offers.filter(offer => offer.active);
  const [filter, setFilter] = useState<Filter>('all');
  const [quoteIndex, setQuoteIndex] = useState(0);
  const offerCarouselRef = useRef<HTMLDivElement | null>(null);
  const offerPaused = useRef(false);

  useEffect(() => {
    const targets = document.querySelectorAll(
      '.story-section,.featured-section,.step,.product-grid,.contact-strip,.section-header,.promo-section,.quote-section,.instagram-feature,.offers-section',
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    targets.forEach((element) => {
      element.classList.add('reveal-on-scroll');
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % Math.max(1, quoteItems.length));
    }, 4500);

    return () => window.clearInterval(timer);
  }, [quoteItems.length]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      const el = offerCarouselRef.current;
      if (!el || offerPaused.current || document.hidden) return;
      const card = el.querySelector<HTMLElement>('.offer-card');
      if (!card) return;
      const distance = card.getBoundingClientRect().width + 22;
      const end = el.scrollWidth - el.clientWidth;
      el.scrollTo({ left: el.scrollLeft + distance >= end + 8 ? 0 : el.scrollLeft + distance, behavior: 'smooth' });
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  const tabs: { id: Filter; label: string }[] = [
    { id: 'all', label: text('catalog', 'all') },
    { id: 'red', label: text('catalog', 'red') },
    { id: 'black', label: text('catalog', 'black') },
    { id: 'other', label: text('catalog', 'other') },
    { id: 'sets', label: text('catalog', 'sets') },
  ];

  const shown = products.filter((product) => !product.id.startsWith('offer:') && product.active && (filter === 'all' || product.category === filter));
  const featured = products.find((product) => product.featured && product.active);

  const promoProducts = useMemo(
    () => products.filter((product) => !product.id.startsWith('offer:') && product.active && product.old_price && product.old_price > product.price).slice(0, 3),
    [products],
  );

  const currentQuote = quoteItems[quoteIndex % Math.max(1, quoteItems.length)] ?? { text: '', accent: '', detail: '' };

  const scrollOffers = (direction: 'prev' | 'next') => {
    const track = offerCarouselRef.current;
    if (!track) return;

    const firstCard = track.querySelector<HTMLElement>('.offer-card');
    const cardWidth = firstCard?.getBoundingClientRect().width ?? 0;
    const gap = 24;
    const amount = cardWidth + gap;

    track.scrollBy({
      left: direction === 'next' ? amount : -amount,
      behavior: 'smooth',
    });
  };

  return (
    <>
      <Header />

      <main>
        {visible('ticker') && items('ticker').length > 0 && <PromoTicker />}
        {visible('promotion') && <PromotionBanner />}
        {visible('hero') && <section className="hero" id="top">
          <div className="hero-noise" />

          <div className="container hero-content">
            <div className="hero-copy">
              <div className="hero-kicker">
                <span className="kicker-line" /> {text('hero', 'text1')}<span className="kicker-line" />
              </div>

              <p className="hero-sup">{text('hero', 'text2')}</p>

              <h1>
                {text('hero', 'text3')}<i>{text('hero', 'text4')}</i>
                <br />
                {text('hero', 'text5')}<br />
                {text('hero', 'text6')}</h1>

              <p className="hero-description">
                {text('hero', 'text7')}</p>

              <div className="hero-buttons">
                <a href="#catalog" className="btn-gold">
                  {text('hero', 'text8')}<ArrowUpRight size={19} />
                </a>

                <a className="hero-discover" href="#about">
                  <span>
                    <ArrowDown size={19} />
                  </span>
                  {text('hero', 'text9')}</a>
              </div>

              <div className="hero-micro">
                <span>
                  <ShieldCheck size={17} /> {text('hero', 'text10')}</span>
                <span>
                  <Truck size={17} /> {text('hero', 'text11')}</span>
              </div>
            </div>

            <div className="hero-art">
              <div className="roe-field" aria-hidden="true">
                {Array.from({ length: 17 }, (_, index) => (
                  <span className={`roe roe-${index + 1}`} key={index} />
                ))}
              </div>

              <div className="hero-orbit orbit-one" />
              <div className="hero-orbit orbit-two" />
              <span className="hero-art-word">{text('hero', 'text12')}</span>

              <div className="hero-product">
                <img className="hero-lid" src={text('hero', 'field13')} alt={text('hero', 'field14')} />
              </div>

              <div className="hero-stamp">
                {text('hero', 'text15')}<br />
                {text('hero', 'text16')}<span>●</span>
              </div>

              <div className="hero-small-detail">
                <span>{text('hero', 'text17')}</span>
                <div className="detail-rule" /> {text('hero', 'text18')}</div>
            </div>

            <div className="hero-side-label">{text('hero', 'text19')}</div>
          </div>
        </section>}

        {visible('benefits') && <section className="benefits">
          <div className="container benefits-inner">
            <div>
              <RoeMark />
              <span>{text('benefits', 'text1')}</span>
            </div>
            <div>
              <Award />
              <span>{text('benefits', 'text2')}</span>
            </div>
            <div>
              <PackageCheck />
              <span>{text('benefits', 'text3')}</span>
            </div>
            <div>
              <Gift />
              <span>{text('benefits', 'text4')}</span>
            </div>
          </div>
        </section>}

        {visible('promo') && <section className="promo-section" id="offers">
          <div className="container promo-section__inner">
            <div className="promo-section__copy">
              <span className="eyebrow promo-section__eyebrow">{text('promo', 'text1')}</span>
              <h2>
                {text('promo', 'text2')}<em>{text('promo', 'text3')}</em>
              </h2>
              <p>
                {text('promo', 'text4')}</p>

              <div className="promo-section__actions">
                <a href="#offers-grid" className="btn-gold">
                  {text('promo', 'text5')}<ArrowUpRight size={18} />
                </a>
                <a
                  href={contacts.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="promo-section__ghost-link"
                >
                  {text('promo', 'text6')}</a>
              </div>
            </div>

            <div className="promo-section__cards">
              {promoProducts.map((product) => (
                <article className="promo-card" key={product.id}>
                  <div className="promo-card__head">
                    <span className="promo-card__label">{product.badge ?? 'Акція'}</span>
                    <span className="promo-card__weight">{product.weight}</span>
                  </div>
                  <h3>{product.name}</h3>
                  <p className="promo-card__subtitle">{product.subtitle}</p>
                  <div className="promo-card__prices">
                    <strong>{product.price.toLocaleString('uk-UA')} {text('promo', 'text7')}</strong>
                    {product.old_price && product.old_price > product.price ? <s>{product.old_price.toLocaleString('uk-UA')} {text('promo', 'text8')}</s> : null}
                  </div>
                  <p className="promo-card__detail">{getSpecs(product).find(spec => spec.startsWith('Колір:')) ?? 'Делікатеси IKRA DeLuxe'}</p>
                </article>
              ))}
            </div>
          </div>
        </section>}

        {visible('offers') && <section className="offers-section" id="offers-grid">
          <div className="container">
            <div className="section-header offers-section__header">
              <div>
                <span className="eyebrow">{text('offers', 'text1')}</span>
                <h2>
                  {text('offers', 'text2')}<em>{text('offers', 'text3')}</em>
                </h2>
                <p>{text('offers', 'text4')}</p>
              </div>
            </div>

            <div className="offers-carousel" onMouseEnter={() => { offerPaused.current = true; }} onMouseLeave={() => { offerPaused.current = false; }} onFocusCapture={() => { offerPaused.current = true; }} onBlurCapture={() => { offerPaused.current = false; }}>
              <div className="offers-carousel__nav">
                <button type="button" className="offers-carousel__arrow" onClick={() => scrollOffers('prev')} aria-label="Попередній набір">
                  <ChevronLeft size={18} />
                </button>
                <button type="button" className="offers-carousel__arrow" onClick={() => scrollOffers('next')} aria-label="Наступний набір">
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="offers-carousel__viewport" ref={offerCarouselRef} onTouchStart={() => { offerPaused.current = true; }} onTouchEnd={() => { offerPaused.current = false; }}>
                <div className="offer-grid">
                  {offerBundles.map((bundle) => (
                    <article className="offer-card" key={bundle.id}>
                      <div className="offer-card__image-wrap">
                        <img src={bundle.image} alt={bundle.title} loading="lazy" />
                        <span className="offer-card__badge">{bundle.promo}</span>
                      </div>
                      <div className="offer-card__body">
                        <div className="offer-card__topline">
                          <span className="offer-card__eyebrow">{text('offers', 'text5')}</span>
                          <span className="offer-card__note">{bundle.weight}</span>
                        </div>
                        <h3>{bundle.title}</h3>
                        <p className={`offer-card__description${bundle.id === 'maxi' ? ' offer-card__description--full' : ''}`}>{bundle.description}</p>
                        {bundle.id === 'maxi' && <p className="offer-card__saving">{bundle.note}</p>}
                        <div className="offer-card__bottom">
                          <div className="offer-card__prices">
                            <strong>{bundle.price.toLocaleString('uk-UA')} {text('offers', 'text6')}</strong>
                            {bundle.oldPrice > bundle.price ? <s>{bundle.oldPrice.toLocaleString('uk-UA')} {text('offers', 'text7')}</s> : null}
                          </div>
                          <button type="button" className="offer-card__button" onClick={() => add(`offer:${bundle.id}`)}>
                            {text('offers', 'text8')}<ArrowUpRight size={16} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>}

        {visible('catalog') && <section id="catalog" className="section catalog-section">
          <div className="container">
            <div className="section-header">
              <div>
                <span className="eyebrow">{text('catalog', 'text1')}</span>
                <h2>
                  {text('catalog', 'text2')}<em>{text('catalog', 'text3')}</em>
                </h2>
                <p>{text('catalog', 'text4')}</p>
              </div>

              <div className="catalog-counter">
                {text('catalog', 'text5')}<RoeMark />
              </div>
            </div>

            <div className="catalog-tabs">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setFilter(tab.id)} className={filter === tab.id ? 'active' : ''}>
                  {tab.label}
                </button>
              ))}
            </div>

            {error ? <p className="form-error">{text('catalog', 'text6')}{error}</p> : null}

            {loading ? (
              <p>{text('catalog', 'text7')}</p>
            ) : shown.length ? (
              <div className="product-grid">
                {shown.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            ) : (
              <div className="empty-products">{text('catalog', 'text8')}</div>
            )}
          </div>
        </section>}

        {visible('about') && <section className="story-section" id="about">
          <div className="story-visual">
            <div className="story-plate">
              <img src={text('about', 'field1')} alt={text('about', 'field2')} />
            </div>
            <div className="story-caption">
              {text('about', 'text3')}<RoeMark />
            </div>
          </div>

          <div className="story-copy">
            <span className="eyebrow">{text('about', 'text4')}</span>
            <h2>
              {text('about', 'text5')}<em>{text('about', 'text6')}</em> {text('about', 'text7')}</h2>
            <p>
              {text('about', 'text8')}</p>
            <p>
              {text('about', 'text9')}</p>
            <a href="#catalog" className="text-link">
              {text('about', 'text10')}<ArrowUpRight size={19} />
            </a>
            <div className="story-flower">
              <RoeMark />
            </div>
          </div>
        </section>}

        {visible('featured') && <section className="featured-section">
          <div className="container featured-inner">
            <div className="featured-copy">
              <span className="eyebrow">{text('featured', 'text1')}</span>
              <h2>
                {text('featured', 'text2')}<br />
                <em>{text('featured', 'text3')}</em>
              </h2>
              <p>{text('featured', 'text4')}</p>
              <button onClick={() => (featured ? add(featured.id) : setCartOpen(true))} className="btn-gold">
                {text('featured', 'text5')}<ArrowUpRight size={18} />
              </button>
            </div>

            <div className="featured-visual">
              <span className="featured-round">
                <RoeMark />
              </span>
              <img src={text('featured', 'field6')} alt={text('featured', 'field7')} />
              <span className="featured-tag">{text('featured', 'text8')}</span>
            </div>
          </div>
        </section>}

        {visible('delivery') && <section id="delivery" className="section delivery-section">
          <div className="container">
            <div className="center-heading">
              <span className="eyebrow">{text('delivery', 'text1')}</span>
              <h2>
                {text('delivery', 'text2')}<em>{text('delivery', 'text3')}</em>
              </h2>
              <p>{text('delivery', 'text4')}</p>
            </div>

            <div className="steps">
              <div className="step">
                <RoeMark className="step-roe" />
                <div className="step-icon">
                  <Check />
                </div>
                <h3>{text('delivery', 'text5')}</h3>
                <p>{text('delivery', 'text6')}</p>
              </div>

              <div className="step">
                <RoeMark className="step-roe" />
                <div className="step-icon">
                  <ShieldCheck />
                </div>
                <h3>{text('delivery', 'text7')}</h3>
                <p>{text('delivery', 'text8')}</p>
              </div>

              <div className="step">
                <RoeMark className="step-roe" />
                <div className="step-icon">
                  <Truck />
                </div>
                <h3>{text('delivery', 'text9')}</h3>
                <p>{text('delivery', 'text10')}</p>
              </div>
            </div>
          </div>
        </section>}

        {visible('quotes') && quoteItems.length > 0 && <section className="quote-section">
          <div className="container quote-inner">
            <RoeMark className="quote-roe" />
            <span className="eyebrow">{text('quotes', 'text1')}</span>

            <div className="quote-slider" key={quoteIndex}>
              <blockquote>
                “{currentQuote.text} <em>{currentQuote.accent}</em>”
              </blockquote>
              <p className="quote-detail">{currentQuote.detail}</p>
            </div>

            <div className="quote-bottom quote-bottom--carousel">
              <span>{text('quotes', 'text2')}</span>
              <div className="quote-dots" aria-label="Перемикання цитат">
                {quoteItems.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    className={index === quoteIndex ? 'active' : ''}
                    onClick={() => setQuoteIndex(index)}
                    aria-label={`Показати цитату ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>}

        {visible('reviews') && items('reviews').length > 0 && <ReviewsCarousel />}
        {visible('faq') && items('faq').length > 0 && <LuxuryFaq />}

        {visible('instagram') && <section className="instagram-feature" id="instagram">
          <div className="container instagram-feature__inner">
            <div className="instagram-feature__copy">
              <span className="eyebrow">{text('instagram', 'text1')}</span>
              <h2>
                {text('instagram', 'text2')}<em>{text('instagram', 'text3')}</em>
              </h2>
              <p>
                {text('instagram', 'text4')}</p>
              <a
                href={contacts.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="instagram-feature__link"
              >
                <Instagram size={20} /> {text('instagram', 'text5')}<ArrowUpRight size={20} />
              </a>
            </div>

            <div className="instagram-feature__photos">
              <img src={text('instagram', 'field6')} alt={text('instagram', 'field7')} loading="lazy" />
              <img src={text('instagram', 'field8')} alt={text('instagram', 'field9')} loading="lazy" />
              <img src={text('instagram', 'field10')} alt={text('instagram', 'field11')} loading="lazy" />
            </div>
          </div>
        </section>}

        {visible('cta') && <section className="contact-strip">
          <div className="container contact-inner">
            <div>
              <span className="eyebrow">{text('cta', 'text1')}</span>
              <h2>
                {text('cta', 'text2')}<em>{text('cta', 'text3')}</em>
              </h2>
            </div>
            <a href="#catalog" className="btn-gold">
              {text('cta', 'text4')}<ArrowUpRight size={19} />
            </a>
          </div>
        </section>}
      </main>

      {visible('footer') && <footer className="footer">
        <div className="container footer-top footer-top--public">
          <div className="footer-brand">
            <div className="brand">
              <img className="brand-logo" src={text('seo', 'logo')} alt={text('footer', 'field1')} />
              <span className="brand-type">
                <strong>{text('footer', 'text2')}</strong>
                <small>{text('footer', 'text3')}</small>
              </span>
            </div>
            <p>{text('footer', 'text4')}</p>
          </div>

          <div>
            <h4>{text('footer', 'text5')}</h4>
            <a href="#catalog">{text('footer', 'text6')}</a>
            <a href="#offers">{text('footer', 'text7')}</a>
            <a href="#about">{text('footer', 'text8')}</a>
            <a href="#delivery">{text('footer', 'text9')}</a>
          </div>

          <div>
            <h4>{text('footer', 'text10')}</h4>
            <a href={contacts.phoneHref} className="footer-phone"><Phone size={16} /> {contacts.phone}</a>
            <a href={contacts.instagram} target="_blank" rel="noopener noreferrer">{text('footer', 'text11')}</a>
            <a href={contacts.tiktok} target="_blank" rel="noopener noreferrer">{text('footer', 'text12')}</a>
            <span className="footer-note">{text('footer', 'text13')}</span>
          </div>

          <div>
            <h4>{text('footer', 'text14')}</h4>
            <a href="#faq">{text('footer', 'text15')}</a>
            <a href="#top">{text('footer', 'text16')}</a>
          </div>
        </div>

        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} {text('footer', 'text17')}</span>
          <span>{text('footer', 'text18')}</span>
          <a href="#top">{text('footer', 'text19')}</a>
        </div>
      </footer>}
      {visible('contacts') && <ContactWidget />}
    </>
  );
}
