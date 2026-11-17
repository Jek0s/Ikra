
import { ArrowUpRight, Plus } from 'lucide-react';
import type { Product } from '../types';
import { useShop } from '../context/ShopContext';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
  index?: number;
}

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('uk-UA').format(price);
};

const getSpecifications = (description: string): string[] => {
  return description
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 4);
};

export default function ProductCard({
                                      product,
                                      index = 0,
                                    }: ProductCardProps) {
  const { add } = useShop();

  const specifications = getSpecifications(product.description);

  const hasDiscount =
      typeof product.old_price === 'number' &&
      product.old_price > product.price;

  const badge = product.badge?.trim() ?? '';

  const showSaleBadge =
      hasDiscount && badge.toUpperCase() !== 'АКЦІЯ';

  const handleAddToCart = () => {
    add(product.id);
  };

  return (
      <article
          className="product-card"
          style={{ animationDelay: `${index * 65}ms` }}
      >
        <div className="product-image">
          <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              onLoad={(event) => {
                const image = event.currentTarget;
                image.dataset.portrait = String(image.naturalHeight > image.naturalWidth);
              }}
          />

          <div className="product-top-tags">
            {badge && (
                <span className="product-badge">
              {badge}
            </span>
            )}

            {showSaleBadge && (
                <span className="product-sale-pill">
              Акція
            </span>
            )}
          </div>

          <button
              type="button"
              className="quick-add"
              onClick={handleAddToCart}
              aria-label={`Додати ${product.name} до кошика`}
              title="Додати до кошика"
          >
            <Plus size={21} />
          </button>
        </div>

        <div className="product-details">
          <div className="product-main">
            <p className="product-caption">
              {product.subtitle}
            </p>

            <div className="product-heading">
              <h3>{product.name}</h3>
              <span className="product-weight">
              {product.weight}
            </span>
            </div>

            <div className="product-prices">
              <strong>
                {formatPrice(product.price)} ₴
              </strong>

              {hasDiscount && (
                  <s>
                    {formatPrice(product.old_price as number)} ₴
                  </s>
              )}
            </div>
          </div>

          {specifications.length > 0 && (
              <ul className="product-specs">
                {specifications.map((specification, specIndex) => (
                    <li key={`${specIndex}-${specification}`}>
                      {specification}
                    </li>
                ))}
              </ul>
          )}

          <div className="product-bottom">
            <button
                type="button"
                className="product-buy"
                onClick={handleAddToCart}
                aria-label={`Купити ${product.name}`}
            >
              <span>Додати в кошик</span>
              <ArrowUpRight size={19} />
            </button>
          </div>
        </div>
      </article>
  );
}
