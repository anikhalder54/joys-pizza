import { RESTAURANT, fullAddress, phoneHref } from '../data/restaurant';
import { Link } from '../lib/router';
import { ClockIcon, PhoneIcon, PinIcon } from './Icons';

export default function ContactSection() {
  return (
    <section className="contact-band" id="contact">
      <div className="container contact-grid">
        <div>
          <span className="eyebrow">{RESTAURANT.motto}</span>
          <h2>Hungry? Come see us on Fulton Ave.</h2>
          <Link to="/menu" className="btn btn-primary">Start an order</Link>
        </div>

        <div className="contact-card">
          <PinIcon />
          <div>
            <h4>Visit us</h4>
            <p>{RESTAURANT.address.line1}<br />{RESTAURANT.address.city}, {RESTAURANT.address.state} {RESTAURANT.address.zip}</p>
            <a href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress())}`} target="_blank" rel="noreferrer">
              Get directions →
            </a>
          </div>
        </div>

        <div className="contact-card">
          <PhoneIcon />
          <div>
            <h4>Call us</h4>
            <p>
              <a href={phoneHref()} className="big-phone">{RESTAURANT.phone}</a>
            </p>
            <p className="small">Call ahead for large or catering orders.</p>
          </div>
        </div>

        <div className="contact-card">
          <ClockIcon />
          <div>
            <h4>Hours</h4>
            <ul className="hours">
              {RESTAURANT.hours.map((h) => (
                <li key={h.days}><span>{h.days}</span><span>{h.time}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <Link to="/" className="brand small">
          <img src="/logo.webp" alt={RESTAURANT.name} width={62} height={48} />
        </Link>
        <nav>
          <Link to="/menu">Menu</Link>
          <Link to="/location">Location</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/orders">Track order</Link>
        </nav>
        <span className="muted-light">
          {fullAddress()} · {RESTAURANT.phone} · © {new Date().getFullYear()} {RESTAURANT.name}
        </span>
      </div>
    </footer>
  );
}
