export const RESTAURANT = {
  name: "Joy's Pizza",
  tagline: 'Handcrafted perfection in every slice',
  motto: 'Made with devotion · Serve with joy',
  address: {
    line1: '376 Fulton Ave.',
    city: 'Hempstead',
    state: 'NY',
    zip: '11550',
  },
  phone: '(516) 385-4221',
  hours: [
    { days: 'Everyday', time: '9:00 AM – 10:00 PM' },
  ],
  deliveryRadius: '3 miles',
  deliveryFee: 3.99,
  freeDeliveryOver: 40,
};

export const fullAddress = () =>
  `${RESTAURANT.address.line1}, ${RESTAURANT.address.city}, ${RESTAURANT.address.state} ${RESTAURANT.address.zip}`;

export const phoneHref = () => 'tel:+1' + RESTAURANT.phone.replace(/\D/g, '');
