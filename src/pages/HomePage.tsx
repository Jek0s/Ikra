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
import { useShop } from '../context/ShopContext';
import type { Category, Product } from '../types';
import type { OfferBundle } from '../data/offers';
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_HREF } from '../config/contact';
import './HomePage.css';
import './HomeExtras.css';

type Filter = 'all' | Category;

type QuoteItem = {
  id: string;
  text: string;
  accent: string;
  detail: string;
};

const quoteItems: QuoteItem[] = [
  {
    id: 'q1',
    text: 'Найкращі моменти — ті, у яких ми дозволяємо собі',
    accent: 'трохи більше.',
    detail: 'IKRA DeLuxe — для моментів, які хочеться смакувати повільно.',
  },
  {
    id: 'q2',
    text: 'Справжня розкіш починається з уваги до деталей і',
    accent: 'чесного смаку.',
    detail: 'Ми віримо в красиву подачу, якісний продукт і особливу атмосферу.',
  },
  {
    id: 'q3',
    text: 'Мистецтво жити красиво — це вміти обирати для себе',
    accent: 'найкраще.',
    detail: 'Саме тому колекція IKRA DeLuxe створена для тих, хто цінує естетику.',
  },
];

function getSpecs(product: Product): string[] {
  return product.description
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function HomePage() {
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
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % quoteItems.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
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
    { id: 'all', label: 'Вся колекція' },
    { id: 'red', label: 'Червона ікра' },
    { id: 'black', label: 'Чорна ікра' },
    { id: 'other', label: 'Щуча ікра' },
  ];

  const shown = products.filter((product) => !product.id.startsWith('offer:') && product.active && (filter === 'all' || product.category === filter));
  const featured = products.find((product) => product.featured && product.active);

  const promoProducts = useMemo(
    () => products.filter((product) => !product.id.startsWith('offer:') && product.active && product.old_price && product.old_price > product.price).slice(0, 3),
    [products],
  );

  const currentQuote = quoteItems[quoteIndex];

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
        <section className="hero" id="top">
          <div className="hero-noise" />

          <div className="container hero-content">
            <div className="hero-copy">
              <div className="hero-kicker">
                <span className="kicker-line" /> IKRA DELUXE · PREMIUM COLLECTION <span className="kicker-line" />
              </div>

              <p className="hero-sup">Делікатеси для виняткових моментів</p>

              <h1>
                IKRA <i>DeLuxe.</i>
                <br />
                Мистецтво
                <br />
                насолоди.
              </h1>

              <p className="hero-description">
                Справжня ікра, естетика кожної деталі та особливе задоволення від першої до останньої ікринки.
                Відкрийте колекцію IKRA DeLuxe.
              </p>

              <div className="hero-buttons">
                <a href="#catalog" className="btn-gold">
                  Обрати делікатеси <ArrowUpRight size={19} />
                </a>

                <a className="hero-discover" href="#about">
                  <span>
                    <ArrowDown size={19} />
                  </span>
                  Наш підхід
                </a>
              </div>

              <div className="hero-micro">
                <span>
                  <ShieldCheck size={17} /> Уважний відбір
                </span>
                <span>
                  <Truck size={17} /> Доставка по Україні
                </span>
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
              <span className="hero-art-word">IKRA</span>

              <div className="hero-product">
                <img className="hero-lid" src="/ikra-deluxe-logo.png" alt="Фірмова кришка IKRA DeLuxe" />
              </div>

              <div className="hero-stamp">
                IKRA
                <br />
                DELUXE <span>●</span>
              </div>

              <div className="hero-small-detail">
                <span>IKRA DeLuxe</span>
                <div className="detail-rule" /> THE TASTE OF LUXURY
              </div>
            </div>

            <div className="hero-side-label">IKRA DELUXE · ВИШУКАНІ ДЕЛІКАТЕСИ</div>
          </div>
        </section>

        <section className="benefits">
          <div className="container benefits-inner">
            <div>
              <RoeMark />
              <span>Культура смаку</span>
            </div>
            <div>
              <Award />
              <span>Ретельна селекція</span>
            </div>
            <div>
              <PackageCheck />
              <span>Турботлива упаковка</span>
            </div>
            <div>
              <Gift />
              <span>Для особливих подій</span>
            </div>
          </div>
        </section>

        <section className="promo-section" id="offers">
          <div className="container promo-section__inner">
            <div className="promo-section__copy">
              <span className="eyebrow promo-section__eyebrow">АКЦІЇ IKRA DELUXE</span>
              <h2>
                Вигода, що <em>виглядає розкішно.</em>
              </h2>
              <p>
                Ми підготували спеціальні акції для тих, хто хоче замовити більше та обрати вигідніше. Преміальні
                набори, красиві поєднання смаків і особливі ціни — усе в дусі IKRA DeLuxe.
              </p>

              <div className="promo-section__actions">
                <a href="#offers-grid" className="btn-gold">
                  Переглянути акції <ArrowUpRight size={18} />
                </a>
                <a
                  href="https://www.instagram.com/_ikra_deluxe_ua/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="promo-section__ghost-link"
                >
                  Instagram бренду
                </a>
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
                    <strong>{product.price.toLocaleString('uk-UA')} ₴</strong>
                    {product.old_price && product.old_price > product.price ? <s>{product.old_price.toLocaleString('uk-UA')} ₴</s> : null}
                  </div>
                  <p className="promo-card__detail">{getSpecs(product).find(spec => spec.startsWith('Колір:')) ?? 'Делікатеси IKRA DeLuxe'}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="offers-section" id="offers-grid">
          <div className="container">
            <div className="section-header offers-section__header">
              <div>
                <span className="eyebrow">АКЦІЙНІ НАБОРИ</span>
                <h2>
                  Готові рішення для <em>вигідного замовлення.</em>
                </h2>
                <p>Оберіть набір, який ідеально підійде для себе, у подарунок або до святкового столу.</p>
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
                          <span className="offer-card__eyebrow">НАБІР IKRA DELUXE</span>
                          <span className="offer-card__note">{bundle.weight}</span>
                        </div>
                        <h3>{bundle.title}</h3>
                        <p className="offer-card__description">{bundle.description}</p>
                        <div className="offer-card__bottom">
                          <div className="offer-card__prices">
                            <strong>{bundle.price.toLocaleString('uk-UA')} ₴</strong>
                            {bundle.oldPrice > bundle.price ? <s>{bundle.oldPrice.toLocaleString('uk-UA')} ₴</s> : null}
                          </div>
                          <button type="button" className="offer-card__button" onClick={() => add(`offer:${bundle.id}`)}>
                            Замовити <ArrowUpRight size={16} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="catalog" className="section catalog-section">
          <div className="container">
            <div className="section-header">
              <div>
                <span className="eyebrow">КОЛЕКЦІЯ IKRA DELUXE</span>
                <h2>
                  Виняткове — <em>поруч.</em>
                </h2>
                <p>Виберіть делікатес для вашого особливого моменту.</p>
              </div>

              <div className="catalog-counter">
                ОБРАНО З ЛЮБОВ’Ю <RoeMark />
              </div>
            </div>

            <div className="catalog-tabs">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setFilter(tab.id)} className={filter === tab.id ? 'active' : ''}>
                  {tab.label}
                </button>
              ))}
            </div>

            {error ? <p className="form-error">Помилка завантаження: {error}</p> : null}

            {loading ? (
              <p>Завантажуємо колекцію...</p>
            ) : shown.length ? (
              <div className="product-grid">
                {shown.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            ) : (
              <div className="empty-products">У цій категорії поки немає товарів.</div>
            )}
          </div>
        </section>

        <section className="story-section" id="about">
          <div className="story-visual">
            <div className="story-plate">
              <img src="/products/paddlefish.webp" alt="Ікра веслоноса" />
            </div>
            <div className="story-caption">
              GOOD TASTE IS TIMELESS <RoeMark />
            </div>
          </div>

          <div className="story-copy">
            <span className="eyebrow">ФІЛОСОФІЯ СМАКУ</span>
            <h2>
              Розкіш — <em>у простих</em> моментах.
            </h2>
            <p>
              Ми віримо, що особливі миті народжуються з деталей: красиво накритий стіл, близькі поруч та смак, заради
              якого хочеться зупинити час.
            </p>
            <p>
              Саме тому наша колекція — це більше, ніж продукти. Це запрошення насолоджуватися життям неспішно.
            </p>
            <a href="#catalog" className="text-link">
              Знайти свій смак <ArrowUpRight size={19} />
            </a>
            <div className="story-flower">
              <RoeMark />
            </div>
          </div>
        </section>

        <section className="featured-section">
          <div className="container featured-inner">
            <div className="featured-copy">
              <span className="eyebrow">СПРАВЖНІЙ СМАК IKRA DELUXE</span>
              <h2>
                Фірмовий смак.
                <br />
                <em>Особливі миті.</em>
              </h2>
              <p>Насолода, якою хочеться поділитися. Виберіть найкраще для себе та тих, кого любите.</p>
              <button onClick={() => (featured ? add(featured.id) : setCartOpen(true))} className="btn-gold">
                Замовити зараз <ArrowUpRight size={18} />
              </button>
            </div>

            <div className="featured-visual">
              <span className="featured-round">
                <RoeMark />
              </span>
              <img src="/products/brand-jar.webp" alt="Фірмова банка IKRA DeLuxe" />
              <span className="featured-tag">CURATED WITH CARE</span>
            </div>
          </div>
        </section>

        <section id="delivery" className="section delivery-section">
          <div className="container">
            <div className="center-heading">
              <span className="eyebrow">ТУРБОТА В КОЖНІЙ ДЕТАЛІ</span>
              <h2>
                Так просто <em>потішити себе.</em>
              </h2>
              <p>Від першого кліку до вашого столу — все продумано.</p>
            </div>

            <div className="steps">
              <div className="step">
                <RoeMark className="step-roe" />
                <div className="step-icon">
                  <Check />
                </div>
                <h3>Оберіть улюблене</h3>
                <p>Додайте делікатеси до кошика та оформіть замовлення.</p>
              </div>

              <div className="step">
                <RoeMark className="step-roe" />
                <div className="step-icon">
                  <ShieldCheck />
                </div>
                <h3>Ми все уточнимо</h3>
                <p>Менеджер зв'яжеться з вами для підтвердження деталей.</p>
              </div>

              <div className="step">
                <RoeMark className="step-roe" />
                <div className="step-icon">
                  <Truck />
                </div>
                <h3>Отримайте насолоду</h3>
                <p>Оберіть зручний спосіб доставки та насолоджуйтесь.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="quote-section">
          <div className="container quote-inner">
            <RoeMark className="quote-roe" />
            <span className="eyebrow">МИСТЕЦТВО ЖИТИ КРАСИВО</span>

            <div className="quote-slider" key={currentQuote.id}>
              <blockquote>
                “{currentQuote.text} <em>{currentQuote.accent}</em>”
              </blockquote>
              <p className="quote-detail">{currentQuote.detail}</p>
            </div>

            <div className="quote-bottom quote-bottom--carousel">
              <span>— IKRA DeLuxe</span>
              <div className="quote-dots" aria-label="Перемикання цитат">
                {quoteItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    className={index === quoteIndex ? 'active' : ''}
                    onClick={() => setQuoteIndex(index)}
                    aria-label={`Показати цитату ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <LuxuryFaq />

        <section className="instagram-feature" id="instagram">
          <div className="container instagram-feature__inner">
            <div className="instagram-feature__copy">
              <span className="eyebrow">НАШ СВІТ У КАДРІ</span>
              <h2>
                Естетика бренду — <em>в Instagram.</em>
              </h2>
              <p>
                Новинки колекції, красиві деталі, натхнення до святкового столу та атмосфера IKRA DeLuxe. Завітайте до
                нас і залишайтесь поруч.
              </p>
              <a
                href="https://www.instagram.com/_ikra_deluxe_ua/"
                target="_blank"
                rel="noopener noreferrer"
                className="instagram-feature__link"
              >
                <Instagram size={20} /> @_ikra_deluxe_ua <ArrowUpRight size={20} />
              </a>
            </div>

            <div className="instagram-feature__photos">
              <img src="/products/salmon.webp" alt="Червона ікра IKRA DeLuxe" loading="lazy" />
              <img src="/products/brand-jar.webp" alt="Фірмова банка ікри" loading="lazy" />
              <img src="/products/keta.webp" alt="Ікра кети" loading="lazy" />
            </div>
          </div>
        </section>

        <section className="contact-strip">
          <div className="container contact-inner">
            <div>
              <span className="eyebrow">СТВОРЮЙТЕ СВОЇ МИТІ</span>
              <h2>
                Час обрати <em>особливе.</em>
              </h2>
            </div>
            <a href="#catalog" className="btn-gold">
              До колекції <ArrowUpRight size={19} />
            </a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-top footer-top--public">
          <div className="footer-brand">
            <div className="brand">
              <img className="brand-logo" src="/ikra-deluxe-logo.png" alt="IKRA DeLuxe" />
              <span className="brand-type">
                <strong>IKRA</strong>
                <small>DeLuxe</small>
              </span>
            </div>
            <p>Вишукана колекція для моментів, які хочеться запам’ятати.</p>
          </div>

          <div>
            <h4>НАВІГАЦІЯ</h4>
            <a href="#catalog">Каталог</a>
            <a href="#offers">Акції</a>
            <a href="#about">Про нас</a>
            <a href="#delivery">Доставка</a>
          </div>

          <div>
            <h4>КОНТАКТИ</h4>
            <a href={CONTACT_PHONE_HREF} className="footer-phone"><Phone size={16} /> {CONTACT_PHONE_DISPLAY}</a>
            <a href="https://www.instagram.com/_ikra_deluxe_ua/" target="_blank" rel="noopener noreferrer">Instagram ↗</a>
            <span className="footer-note">Зв’яжіться з нами — допоможемо з вибором.</span>
          </div>

          <div>
            <h4>ІНФОРМАЦІЯ</h4>
            <a href="#faq">Поширені питання</a>
            <a href="#top">Повернутися нагору ↑</a>
          </div>
        </div>

        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} IKRA DeLuxe. Усі права захищені.</span>
          <span>З ЛЮБОВ’Ю ДО КОЖНОЇ ДЕТАЛІ</span>
          <a href="#top">НАГОРУ ↑</a>
        </div>
      </footer>
    </>
  );
}
