import HeroCarousel from '../components/HeroCarousel';
import { MenuItems } from '../components/MenuCard';
import ContactSection from '../components/ContactSection';
import { CATEGORIES, CATEGORY_PHOTOS } from '../data/menu';
import { useMenu } from '../context/MenuContext';
import { Link } from '../lib/router';

export default function HomePage() {
  const { available } = useMenu();
  const specials = available.filter((m) => m.special);

  return (
    <>
      <HeroCarousel />

      <section className="section" id="specials">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Hand-picked by our chef</span>
              <h2>Our Specials</h2>
            </div>
            <Link to="/menu" className="btn btn-outline">See full menu</Link>
          </div>
          <MenuItems items={specials} featured />
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="section-head center">
            <div>
              <span className="eyebrow">Something for everyone</span>
              <h2>Explore the menu</h2>
            </div>
          </div>
          <div className="cat-strip">
            {CATEGORIES.map((c) => {
              // Show a tile only for categories that have items on the menu.
              const items = available.filter((m) => m.category === c);
              if (items.length === 0) return null;
              // Category photo (online link); if it can't load, fall back to an item's own photo.
              const itemPhoto = items.find((m) => m.image?.trim())?.image;
              return (
                <Link key={c} to={`/menu?cat=${c}`} className="cat-tile">
                  <img
                    src={CATEGORY_PHOTOS[c]}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      const el = e.currentTarget;
                      if (itemPhoto && el.src !== itemPhoto) el.src = itemPhoto;
                      else el.style.visibility = 'hidden';
                    }}
                  />
                  <span>{c}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <ContactSection />
    </>
  );
}
