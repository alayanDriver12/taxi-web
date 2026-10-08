// Contenido por defecto de la web. Lo que se edite en /admin se guarda en la BBDD
// y se combina con esto (si mañana se añade un campo nuevo aquí, aparece solo).
// ES y EN deben tener siempre la misma estructura.

module.exports = {
  contact: { whatsapp: '34600000000' },
  seo: {
    title: 'Alayan Driver · Transfer en Andalucía',
    description: 'Transfers privados en Sevilla y toda Andalucía. Aeropuertos, estaciones, hoteles y eventos.'
  },
  images: { logo: '/img/logo.jpg', hero: '/img/portada.jpg', ford: '/img/ford.jpg', tesla: '/img/tesla.jpg' },
  // Datos del titular para aviso legal, privacidad y condiciones (obligatorios por LSSI y RGPD)
  legal: {
    owner: '',     // nombre y apellidos (autónomo) o razón social (sociedad)
    nif: '',
    address: '',   // domicilio completo
    email: '',
    phone: '',
    registry: '',  // datos del Registro Mercantil, solo si es sociedad
    license: ''    // autorización VTC / licencia con la que presta el servicio
  },

  ES: {
    brand: { name: 'ALAYAN DRIVER', tagline: 'TRANSFER EN ANDALUCÍA' },
    nav: { fleet: 'Flota', classes: 'Clases', drivers: 'Conductores', destinations: 'Destinos', services: 'Servicios', book: 'Reservar' },
    hero: {
      badge: '',
      scroll: 'Descubrir',
      alt: 'Portada oficial Alayan Driver Transfer en Andalucia tu destino nuestra prioridad'
    },
    exp: {
      kicker: 'ALAYAN DRIVER — DESDE 2009',
      title: 'Más de 15 años de experiencia',
      desc: 'Más que un traslado, una experiencia. Puntualidad británica, discreción absoluta y conocimiento real de Sevilla y toda Andalucía. Sin GPS, con alma local.',
      cta: 'Reservar transfer privado',
      stats: [
        { value: '15+', label: 'AÑOS' },
        { value: '100%', label: 'PUNTUAL' },
        { value: '24/7', label: 'DISPONIBLE' },
        { value: 'SVQ', label: 'BASE SEVILLA' }
      ],
      values: 'CONFORT • SEGURIDAD • PUNTUALIDAD • DISCRECIÓN'
    },
    slogans: {
      left: 'Rápido. Seguro. Siempre a tiempo.',
      right: 'Movilidad que se adapta a ti.',
      items: ['CONFORT', 'SEGURIDAD', 'PUNTUALIDAD', 'DISCRECIÓN'],
      hybrid: 'Silencio y Eco — HÍBRIDO ENCHUFABLE ALTA GAMA'
    },
    fleet: {
      title: 'Flota real. Blanca. Impecable.',
      subtitle: 'Vehículos de alta gama, híbridos enchufables, revisados diariamente. Silencio, climatización perfecta, maletero XXL.',
      ford: { name: 'FORD • ALAYAN', plate: 'Matrícula ALAYAN', desc: 'Berlina ejecutiva, híbrida enchufable, 4 pax + 4 maletas grandes. Ideal aeropuerto y AVE.' },
      tesla: { name: 'TESLA • ALAYAN', plate: '100% eléctrico • Alta gama', desc: 'Silencio absoluto, cero emisiones, tech premium. Para clientes que exigen lo mejor.', badge: 'HÍBRIDO ENCHUFABLE ALTA GAMA' }
    },
    classes: {
      title: 'Elija su clase',
      subtitle: 'Mismo conductor profesional, distinto nivel de confort.',
      popular: 'MÁS RESERVADO',
      book: 'RESERVAR',
      vatNote: 'Precios con IVA incluido. El precio final se confirma antes del pago.',
      cards: [
        { name: 'Económico', price: 'Desde 35€', features: ['Vehículo confort', '1-3 pasajeros', 'Aeropuerto / Estación', 'Tracking vuelo incluido'], popular: false },
        { name: 'Confort', price: 'Desde 55€', features: ['Ford Alayan híbrido', 'Agua + prensa', 'Cartel bienvenida', 'Cancelación 24h gratis'], popular: true },
        { name: 'VIP', price: 'Desde 90€', features: ['Tesla / Mercedes E', 'Chofer trajeado', 'Disposición por horas', 'Portugal y Pueblos Blancos'], popular: false }
      ]
    },
    drivers: {
      title: 'Conductores de Sevilla',
      subtitle: 'No subcontratamos. No improvisamos.',
      team: 'EQUIPO ALAYAN • SEVILLA • SVQ',
      points: [
        { title: 'Discretos y puntuales', text: 'Puntualidad británica. Llegamos 10 minutos antes, siempre. Silencio respetuoso o conversación si usted quiere.' },
        { title: 'Dilatada experiencia', text: 'Más de 15 años en transfer premium. Conocemos cada atajo, cada obra, cada puerta de hotel y terminal.' },
        { title: 'Profesionales de aeropuerto', text: 'Tracking en tiempo real de su vuelo. Esperas gratuitas por retrasos. Meet & Greet en llegadas.' },
        { title: 'Viven en Sevilla, sin GPS', text: 'Sevillanos nativos. No necesitamos navegador para llevarle a cualquier rincón de Andalucía.' }
      ]
    },
    destinations: {
      title: 'Toda Andalucía, puerta a puerta',
      subtitle: 'Cada provincia con su monumento. Nosotros ponemos la carretera.',
      list: [
        { city: 'Sevilla', monument: 'Giralda', note: 'Centro histórico, Santa Justa, aeropuerto SVQ' },
        { city: 'Cádiz', monument: 'Catedral', note: 'La Tacita, playas, puertos deportivos' },
        { city: 'Córdoba', monument: 'Mezquita', note: 'Judería, Medina Azahara' },
        { city: 'Granada', monument: 'Alhambra', note: 'Sierra Nevada, Alpujarra' },
        { city: 'Málaga', monument: 'Gibralfaro', note: 'Costa del Sol, aeropuerto AGP' },
        { city: 'Huelva', monument: 'Muelle del Tinto', note: 'Doñana, Minas de Riotinto' },
        { city: 'Almería', monument: 'Alcazaba', note: 'Cabo de Gata, desierto Tabernas' }
      ]
    },
    services: {
      title: 'Servicios',
      items: [
        { name: 'AEROPUERTOS', detail: 'SEVILLA • MÁLAGA • JEREZ Y MÁS' },
        { name: 'ESTACIONES', detail: 'AVE • TREN • SANTA JUSTA, MÁLAGA MARÍA ZAMBRANO' },
        { name: 'HOTELES Y RESORTS', detail: '5★, casas rurales, villas privadas' },
        { name: 'EVENTOS', detail: 'SOCIALES Y EMPRESARIALES • BODAS, CONGRESOS' },
        { name: 'PUEBLOS BLANCOS', detail: 'Ronda, Arcos, Zahara, Grazalema...' },
        { name: 'DISPOSICIÓN', detail: 'Granada • Córdoba • Cádiz • Día completo' },
        { name: 'PORTUGAL', detail: 'Faro • Lisboa • Oporto • Puertos y aeropuertos' },
        { name: 'VIAJES PRIVADOS', detail: 'Por toda Andalucía, a su ritmo' }
      ]
    },
    booking: {
      badge: 'PAGO SEGURO SUMUP • FACTURA • 24H CANCEL',
      title: 'Reserva con pago seguro SumUp',
      subtitle: 'Presupuesto inmediato. Pago protegido. Confirmación por WhatsApp.',
      includesTitle: 'INCLUYE',
      includes: ['Tracking vuelo', 'Meet & Greet', 'Agua y prensa', 'Silla infantil gratis', 'Espera por retraso', 'Cartel personalizado'],
      cancel: 'Política: cancelación gratuita hasta 24h antes. Después, 50%. No-show 100%.',
      fleetNote: 'Flota blanca real • Híbrida enchufable • Silencio y Eco',
      fleetSign: 'MÁS QUE UN TRASLADO UNA EXPERIENCIA — Firma Alayan',
      fields: {
        name: 'Nombre y apellidos *', company: 'Empresa (opcional)', phone: 'Teléfono / WhatsApp *', email: 'Email *',
        origin: 'Origen *', destination: 'Destino *', date: 'Fecha *', time: 'Hora *', pax: 'Pasajeros',
        luggage: 'Maletas facturadas', flight: 'Nº vuelo + tracking', sign: 'Cartel bienvenida personalizado', amount: 'Importe estimado'
      },
      placeholders: { sign: 'Ej: Sr. García - Hotel Alfonso XIII', amount: 'Ej: 65€ estimado' },
      pay: 'Pagar con SumUp',
      whatsapp: 'Consultar por WhatsApp',
      whatsappMessage: 'Hola Alayan, quiero reservar: {origin} -> {destination} el {date} a las {time}. Pax:{pax} Maletas:{luggage} Vuelo:{flight} Cartel:{sign}',
      secure: 'Pago 100% seguro vía SumUp • Encriptado • Factura incluida',
      acceptPrefix: 'He leído y acepto la',
      acceptJoin: 'y las',
      mustAccept: 'Para enviar la reserva debes aceptar la política de privacidad y las condiciones del servicio.',
      privacyInfo: 'Responsable: {owner}. Finalidad: gestionar tu reserva y su pago. Legitimación: ejecución del contrato. Destinatarios: SumUp (pagos) y nuestros proveedores tecnológicos; no cedemos tus datos salvo obligación legal. Derechos: acceso, rectificación, supresión y demás, como se explica en la política de privacidad.'
    },
    footer: {
      tagline: 'TU DESTINO, NUESTRA PRIORIDAD.',
      slogan: 'MÁS QUE UN TRASLADO, UNA EXPERIENCIA',
      description: 'Confort, seguridad, puntualidad, discreción. Silencio y Eco — híbrido enchufable alta gama.',
      firm: 'Alayan',
      services: ['AEROPUERTOS SEVILLA MÁLAGA JEREZ Y MÁS', 'ESTACIONES TREN AVE', 'HOTELES Y RESORTS', 'EVENTOS SOCIALES Y EMPRESARIALES', 'VIAJES PRIVADOS POR TODA ANDALUCÍA'],
      rights: '© {year} ALAYAN DRIVER - TRANSFER EN ANDALUCÍA. Todos los derechos reservados.',
      bottomLeft: '',
      bottomRight: 'ALAYAN • SEVILLA',
      legal: {
        notice: 'Aviso legal',
        privacy: 'Política de privacidad',
        cookies: 'Política de cookies',
        terms: 'Condiciones del servicio',
        complaints: 'Existen hojas de quejas y reclamaciones a disposición de las personas consumidoras y usuarias.',
        back: 'Volver a la web',
        note: ''
      }
    }
  },

  EN: {
    brand: { name: 'ALAYAN DRIVER', tagline: 'TRANSFER EN ANDALUCÍA' },
    nav: { fleet: 'Fleet', classes: 'Classes', drivers: 'Drivers', destinations: 'Destinations', services: 'Services', book: 'Book' },
    hero: {
      badge: '',
      scroll: 'Discover',
      alt: 'Alayan Driver official cover — Transfer in Andalusia, your destination our priority'
    },
    exp: {
      kicker: 'ALAYAN DRIVER — SINCE 2009',
      title: 'Over 15 years of experience',
      desc: 'More than a transfer, an experience. British punctuality, absolute discretion and true local knowledge of Seville and Andalusia. No GPS needed.',
      cta: 'Book private transfer',
      stats: [
        { value: '15+', label: 'YEARS' },
        { value: '100%', label: 'PUNCTUAL' },
        { value: '24/7', label: 'AVAILABLE' },
        { value: 'SVQ', label: 'SEVILLE BASE' }
      ],
      values: 'COMFORT • SAFETY • PUNCTUALITY • DISCRETION'
    },
    slogans: {
      left: 'Fast. Safe. Always on time.',
      right: 'Mobility that adapts to you.',
      items: ['COMFORT', 'SAFETY', 'PUNCTUALITY', 'DISCRETION'],
      hybrid: 'Silence & Eco — PREMIUM PLUG-IN HYBRID'
    },
    fleet: {
      title: 'Real fleet. White. Impeccable.',
      subtitle: 'Premium plug-in hybrid vehicles, checked daily. Silence, perfect climate, XXL trunk.',
      ford: { name: 'FORD • ALAYAN', plate: 'ALAYAN plate', desc: 'Executive sedan, plug-in hybrid, 4 pax + 4 large bags. Ideal for airport & AVE.' },
      tesla: { name: 'TESLA • ALAYAN', plate: '100% electric • Premium', desc: 'Absolute silence, zero emissions, premium tech. For clients who demand the best.', badge: 'PREMIUM PLUG-IN HYBRID' }
    },
    classes: {
      title: 'Choose your class',
      subtitle: 'Same professional driver, different comfort level.',
      popular: 'MOST BOOKED',
      book: 'BOOK',
      vatNote: 'Prices include VAT. The final price is confirmed before payment.',
      cards: [
        { name: 'Economy', price: 'From €35', features: ['Comfort vehicle', '1-3 passengers', 'Airport / Station', 'Flight tracking included'], popular: false },
        { name: 'Comfort', price: 'From €55', features: ['Ford Alayan hybrid', 'Water + press', 'Welcome sign', 'Free cancellation 24h'], popular: true },
        { name: 'VIP', price: 'From €90', features: ['Tesla / Mercedes E', 'Suited chauffeur', 'Hourly disposal', 'Portugal & White Villages'], popular: false }
      ]
    },
    drivers: {
      title: 'Drivers from Seville',
      subtitle: "We don't subcontract. We don't improvise.",
      team: 'ALAYAN TEAM • SEVILLE • SVQ',
      points: [
        { title: 'Discreet & punctual', text: 'British punctuality. We arrive 10 minutes early, always. Respectful silence or conversation if you wish.' },
        { title: 'Extensive experience', text: '15+ years in premium transfer. We know every shortcut, every hotel door and terminal.' },
        { title: 'Airport professionals', text: 'Real-time flight tracking. Free waiting for delays. Meet & Greet at arrivals.' },
        { title: 'Live in Seville, no GPS', text: 'Native Sevillians. No navigator needed to take you anywhere in Andalusia.' }
      ]
    },
    destinations: {
      title: 'All Andalusia, door to door',
      subtitle: 'Each province with its monument. We provide the road.',
      list: [
        { city: 'Seville', monument: 'Giralda', note: 'Old town, Santa Justa, SVQ airport' },
        { city: 'Cadiz', monument: 'Cathedral', note: 'Beaches, marinas' },
        { city: 'Cordoba', monument: 'Mosque', note: 'Jewish Quarter, Medina Azahara' },
        { city: 'Granada', monument: 'Alhambra', note: 'Sierra Nevada, Alpujarra' },
        { city: 'Malaga', monument: 'Gibralfaro', note: 'Costa del Sol, AGP airport' },
        { city: 'Huelva', monument: 'Muelle del Tinto', note: 'Doñana, Riotinto Mines' },
        { city: 'Almeria', monument: 'Alcazaba', note: 'Cabo de Gata, Tabernas desert' }
      ]
    },
    services: {
      title: 'Services',
      items: [
        { name: 'AIRPORTS', detail: 'SEVILLE • MALAGA • JEREZ & MORE' },
        { name: 'STATIONS', detail: 'AVE • TRAIN • SANTA JUSTA, MALAGA' },
        { name: 'HOTELS & RESORTS', detail: '5★, rural houses, private villas' },
        { name: 'EVENTS', detail: 'SOCIAL & CORPORATE • WEDDINGS, CONGRESSES' },
        { name: 'WHITE VILLAGES', detail: 'Ronda, Arcos, Zahara, Grazalema...' },
        { name: 'DISPOSAL', detail: 'Granada • Cordoba • Cadiz • Full day' },
        { name: 'PORTUGAL', detail: 'Faro • Lisbon • Porto • Ports & airports' },
        { name: 'PRIVATE TOURS', detail: 'All over Andalusia, at your pace' }
      ]
    },
    booking: {
      badge: 'SECURE SUMUP PAYMENT • INVOICE • 24H CANCEL',
      title: 'Book with secure SumUp payment',
      subtitle: 'Instant quote. Protected payment. WhatsApp confirmation.',
      includesTitle: 'INCLUDES',
      includes: ['Flight tracking', 'Meet & Greet', 'Water & press', 'Free child seat', 'Waiting for delays', 'Custom welcome sign'],
      cancel: 'Policy: free cancellation up to 24h before. After, 50%. No-show 100%.',
      fleetNote: 'Real white fleet • Plug-in hybrid • Silence & Eco',
      fleetSign: 'MORE THAN A TRANSFER, AN EXPERIENCE — Alayan signature',
      fields: {
        name: 'Full name *', company: 'Company (optional)', phone: 'Phone / WhatsApp *', email: 'Email *',
        origin: 'Origin *', destination: 'Destination *', date: 'Date *', time: 'Time *', pax: 'Passengers',
        luggage: 'Checked luggage', flight: 'Flight No. + tracking', sign: 'Custom welcome sign', amount: 'Estimated amount'
      },
      placeholders: { sign: 'e.g. Mr. García - Hotel Alfonso XIII', amount: 'e.g. €65 estimated' },
      pay: 'Pay with SumUp',
      whatsapp: 'Ask on WhatsApp',
      whatsappMessage: 'Hello Alayan, I would like to book: {origin} -> {destination} on {date} at {time}. Pax:{pax} Bags:{luggage} Flight:{flight} Sign:{sign}',
      secure: '100% secure payment via SumUp • Encrypted • Invoice included',
      acceptPrefix: 'I have read and accept the',
      acceptJoin: 'and the',
      mustAccept: 'To send your booking you must accept the privacy policy and the terms of service.',
      privacyInfo: 'Controller: {owner}. Purpose: managing your booking and its payment. Legal basis: performance of the contract. Recipients: SumUp (payments) and our technology providers; we do not share your data unless required by law. Rights: access, rectification, erasure and others, as explained in the privacy policy.'
    },
    footer: {
      tagline: 'YOUR DESTINATION, OUR PRIORITY.',
      slogan: 'MORE THAN A TRANSFER, AN EXPERIENCE',
      description: 'Comfort, safety, punctuality, discretion. Silence & Eco — premium plug-in hybrid.',
      firm: 'Alayan',
      services: ['AIRPORTS SEVILLE MALAGA JEREZ & MORE', 'AVE TRAIN STATIONS', 'HOTELS & RESORTS', 'SOCIAL & CORPORATE EVENTS', 'PRIVATE TRIPS ALL OVER ANDALUSIA'],
      rights: '© {year} ALAYAN DRIVER - TRANSFER IN ANDALUSIA. All rights reserved.',
      bottomLeft: '',
      bottomRight: 'ALAYAN • SEVILLE',
      legal: {
        notice: 'Legal notice',
        privacy: 'Privacy policy',
        cookies: 'Cookie policy',
        terms: 'Terms of service',
        complaints: 'Official complaint forms (hojas de quejas y reclamaciones) are available to consumers on request.',
        back: 'Back to the website',
        note: 'Our legal texts are published in Spanish, the language of the contract. If you need help understanding them, write to us.'
      }
    }
  }
};
