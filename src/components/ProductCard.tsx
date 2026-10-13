import { ArrowUpRight, Plus } from 'lucide-react';
import type { Product } from '../types';
import { useShop } from '../context/ShopContext';
import './ProductCard.css';

const money = (value: number): string => new Intl.NumberFormat('uk-UA').format(value);

function parseSpecs(description: string): string[] {
  return description
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);
}

export default function ProductCard({
  product,
  index = 0,
}: {
  product: Product;
  index?: number;
}) {
  const { add } = useShop();
  const specs = parseSpecs(product.description);
  const hasDiscount = typeof product.old_price === 'number' && product.old_price > product.price;
  const normalizedBadge = product.badge?.trim().toUpperCase() ?? '';
  const showSalePill = hasDiscount && normalizedBadge !== 'АКЦІЯ';

  return (
    <article className="product-card" style={{ animationDelay: `${index * 65}ms` }}>
      <div className="product-image">
        <img loading="lazy" src={product.image} alt={product.name} />

        {(product.badge || showSalePill) ? (
          <div className="product-top-tags">
            {product.badge ? <span className="product-badge">{product.badge}</span> : <span />}
            {showSalePill ? <span className="product-sale-pill">Акція</span> : null}
          </div>
        ) : null}

        <button
          className="quick-add"
          title="Додати до кошика"
          onClick={() => add(product.id)}
        >
          <Plus size={21} />
        </button>
      </div>

      <div className="product-details">
        <p className="product-caption">
          {product.subtitle} <span>·</span> {product.weight}
        </p>

        <h3>{product.name}</h3>

        <div className="product-prices">
          <strong>{money(product.price)} ₴</strong>
          {hasDiscount ? <s>{money(product.old_price ?? 0)} ₴</s> : null}
        </div>

        {specs.length > 0 ? (
          <ul className="product-specs">
            {specs.map((spec) => (
              <li key={spec}>{spec}</li>
            ))}
          </ul>
        ) : null}

        <div className="product-bottom">
          <button
            className="product-buy"
            onClick={() => add(product.id)}
            aria-label={`Купити ${product.name}`}
          >
            Додати в кошик <ArrowUpRight size={19} />
          </button>
        </div>
      </div>
    </article>
  );
}
