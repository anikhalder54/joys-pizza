import { RESTAURANT, fullAddress, phoneHref } from '../data/restaurant';
import { Link } from '../lib/router';
import { ClockIcon, PhoneIcon, PinIcon } from '../components/Icons';


export function LocationPage() {
  const q = encodeURIComponent(fullAddress());
  return (
    <div className="page">
      <div className="page-hero">
        <div className="container">
          <span className="eyebrow">Find us</span>
          <h1>Our Location</h1>
          <p>On Fulton Ave. in Hempstead. Pick up or get it delivered.</p>
        </div>
      </div>
      <div className="container location-grid">
        <div className="map-wrap">
          <iframe
            title="Map to Joy's Pizza"
            src={`https://maps.google.com/maps?q=${q}&z=15&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <div className="panel">
          <div className="info-line"><PinIcon /><div><h4>Address</h4><p>{RESTAURANT.address.line1}<br />{RESTAURANT.address.city}, {RESTAURANT.address.state} {RESTAURANT.address.zip}</p>
            <a href={`https://maps.google.com/?q=${q}`} target="_blank" rel="noreferrer">Open in Google Maps →</a></div></div>
          <div className="info-line"><ClockIcon /><div><h4>Hours</h4>
            <ul className="hours dark">{RESTAURANT.hours.map((h) => <li key={h.days}><span>{h.days}</span><span>{h.time}</span></li>)}</ul></div></div>
          <div className="info-line"><PhoneIcon /><div><h4>Phone</h4><p><a href={phoneHref()}>{RESTAURANT.phone}</a></p></div></div>
          <p className="muted small">We deliver within about {RESTAURANT.deliveryRadius} of the shop.</p>
          <Link to="/menu" className="btn btn-primary btn-block">Order for pickup</Link>
        </div>
      </div>
    </div>
  );
}

export function ContactPage() {
  return (
    <div className="page">
      <div className="page-hero">
        <div className="container">
          <span className="eyebrow">We'd love to hear from you</span>
          <h1>Contact Us</h1>
          <p>Questions, catering or large orders — give us a call.</p>
        </div>
      </div>
      <div className="container contact-page-grid">
        <div className="panel call-panel">
          <PhoneIcon width={32} height={32} />
          <h2>Call {RESTAURANT.name}</h2>
          <a href={phoneHref()} className="big-phone">{RESTAURANT.phone}</a>
          <p className="muted">
            For large orders, please call ahead so we can have everything ready on time.
          </p>
          <div className="row gap">
            <a href={phoneHref()} className="btn btn-primary btn-lg">Call now</a>
            <Link to="/menu" className="btn btn-outline btn-lg">Order online</Link>
          </div>
        </div>
        <div className="stack">
          <div className="panel info-line"><PinIcon /><div><h4>Visit</h4><p>{fullAddress()}</p>
            <a href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress())}`} target="_blank" rel="noreferrer">Get directions →</a></div></div>
          <div className="panel info-line"><ClockIcon /><div><h4>Hours</h4>
            <ul className="hours dark">{RESTAURANT.hours.map((h) => <li key={h.days}><span>{h.days}</span><span>{h.time}</span></li>)}</ul></div></div>
        </div>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="page container narrow center-page">
      <h1>Page not found</h1>
      <p className="muted">That slice must have been eaten already.</p>
      <Link to="/" className="btn btn-primary">Back home</Link>
    </div>
  );
}
