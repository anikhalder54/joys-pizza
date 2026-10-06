import HeroCarousel from '../components/HeroCarousel';
import MenuCard from '../components/MenuCard';
import ContactSection from '../components/ContactSection';
import { CATEGORIES } from '../data/menu';
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
          <div className="menu-grid">
            {specials.map((item) => (
              <MenuCard key={item.id} item={item} featured />
            ))}
          </div>
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
              const first = available.find((m) => m.category === c);
              if (!first) return null;
              return (
                <Link key={c} to={`/menu?cat=${c}`} className="cat-tile">
                  <img src={first.image} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
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
