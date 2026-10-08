// Textos legales: aviso legal (LSSI art. 10), privacidad (RGPD art. 13), cookies (LSSI art. 22.2)
// y condiciones del servicio (TRLGDCU arts. 97 y 103, LSSI art. 27).
// Los datos del titular salen de /admin → General → Datos legales.
// Si cambia lo que hace la web (analítica, newsletter, nuevos proveedores…), hay que revisar estos textos.

export const LEGAL_PATHS = { '/aviso-legal': 'notice', '/privacidad': 'privacy', '/cookies': 'cookies', '/condiciones': 'terms' };

const UPDATED = '8 de octubre de 2026';

const H2 = ({ children }) => <h2 className="serif text-[26px] md:text-[30px] leading-tight mt-12 mb-3">{children}</h2>;
const P = ({ children }) => <p className="text-[15px] leading-relaxed text-white/70 mt-3">{children}</p>;
const UL = ({ items }) => (
  <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-white/70 list-disc pl-5 marker:text-[#C5A46A]">
    {items.map((it, i) => <li key={i}>{it}</li>)}
  </ul>
);
const A = ({ href, children }) => <a href={href} className="text-[#C5A46A] underline underline-offset-2 hover:text-white">{children}</a>;
const Ext = ({ href, children }) => <a href={href} target="_blank" rel="noopener" className="text-[#C5A46A] underline underline-offset-2 hover:text-white">{children}</a>;

export default function Legal({ page, content, t, lang }) {
  const L = content.legal;
  // Dato del titular o aviso visible de que falta
  const v = (key, label) => L[key] || <mark className="bg-[#C5A46A] text-black px-1 rounded not-italic">[PENDIENTE: {label}]</mark>;
  const owner = v('owner', 'titular');
  const email = L.email ? <A href={`mailto:${L.email}`}>{L.email}</A> : v('email', 'email');
  const q = lang === 'EN' ? '?lang=en' : '';
  const Body = { notice: Notice, privacy: Privacy, cookies: Cookies, terms: Terms }[page];

  return (
    <main className="mx-auto max-w-[860px] px-6 md:px-10 py-16 md:py-24">
      <div className="text-[11px] tracking-[0.35em] text-[#C5A46A]">{t.brand.name}</div>
      <h1 className="serif text-[44px] md:text-[60px] leading-[0.95] mt-4">{t.footer.legal[page]}</h1>
      <p className="mt-4 text-[13px] text-white/40">Última actualización: {UPDATED}</p>
      {lang === 'EN' && t.footer.legal.note && (
        <p className="mt-6 rounded-[16px] border border-white/10 bg-white/[0.04] p-4 text-[13px] text-white/70">{t.footer.legal.note}</p>
      )}
      <Body L={L} v={v} owner={owner} email={email} q={q} content={content} />
    </main>
  );
}

function Notice({ L, v, owner, email, q }) {
  return (
    <>
      <H2>1. Titular de la web</H2>
      <P>En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI), se informa de los datos del titular de este sitio web:</P>
      <UL items={[
        <>Titular: {owner}</>,
        <>NIF: {v('nif', 'NIF/CIF')}</>,
        <>Domicilio: {v('address', 'domicilio')}</>,
        <>Email: {email}</>,
        <>Teléfono: {v('phone', 'teléfono')}</>,
        ...(L.registry ? [<>Datos registrales: {L.registry}</>] : []),
        <>Actividad: transporte privado de viajeros en vehículos con conductor. Autorización administrativa: {v('license', 'nº de autorización VTC / licencia')}</>
      ]} />

      <H2>2. Objeto y condiciones de uso</H2>
      <P>Esta web informa sobre los servicios de transfer privado del titular y permite solicitar reservas. Al navegar por ella aceptas usarla de forma lícita, sin dañar su funcionamiento ni introducir información falsa o de terceros sin su permiso.</P>
      <P>La contratación de servicios se rige por las <A href={`/condiciones${q}`}>condiciones del servicio</A> y el tratamiento de datos personales por la <A href={`/privacidad${q}`}>política de privacidad</A>.</P>

      <H2>3. Propiedad intelectual e industrial</H2>
      <P>Los textos, fotografías, logotipos, diseño y código de esta web son titularidad de {owner} o se usan con autorización de sus titulares. No está permitida su reproducción, distribución o transformación sin autorización expresa, salvo para uso personal y privado.</P>

      <H2>4. Responsabilidad</H2>
      <P>Procuramos que la información publicada sea correcta y esté actualizada, pero puede contener errores puntuales. Los precios mostrados son orientativos («desde») y el precio definitivo de cada servicio se confirma antes del pago. No respondemos de daños derivados de interrupciones técnicas ajenas a nuestro control ni del uso indebido de la web.</P>
      <P>Los enlaces a sitios de terceros (por ejemplo, WhatsApp o la pasarela de pago SumUp) se rigen por las condiciones de esos terceros.</P>

      <H2>5. Legislación aplicable</H2>
      <P>Este aviso legal se rige por la legislación española. Para cualquier controversia con personas consumidoras serán competentes los juzgados y tribunales de su domicilio, conforme a la normativa de consumo.</P>
    </>
  );
}

function Privacy({ L, v, owner, email, q }) {
  return (
    <>
      <P>Esta política explica cómo tratamos tus datos personales conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).</P>

      <H2>1. Responsable del tratamiento</H2>
      <UL items={[
        <>Responsable: {owner}</>,
        <>NIF: {v('nif', 'NIF/CIF')}</>,
        <>Domicilio: {v('address', 'domicilio')}</>,
        <>Contacto para protección de datos: {email}</>
      ]} />

      <H2>2. Qué datos tratamos</H2>
      <UL items={[
        <><b className="text-white/90">Formulario de reserva:</b> nombre y apellidos, empresa (opcional), teléfono, email, origen, destino, fecha, hora, número de pasajeros y maletas, número de vuelo, y texto del cartel de bienvenida. También guardamos la fecha y hora en que aceptas esta política.</>,
        <><b className="text-white/90">Pago:</b> lo gestiona SumUp en su propia página. Nosotros no vemos ni guardamos los datos de tu tarjeta; solo recibimos si el pago se ha completado.</>,
        <><b className="text-white/90">WhatsApp:</b> si nos escribes por WhatsApp, tratamos tu número y el contenido de la conversación para atenderte.</>,
        <><b className="text-white/90">Datos técnicos:</b> nuestros servidores registran la dirección IP y datos básicos de cada petición para garantizar la seguridad y evitar abusos (por ejemplo, envíos masivos del formulario).</>
      ]} />
      <P>Si reservas para otras personas (por ejemplo, el nombre del cartel), garantizas que les has informado y que puedes facilitarnos sus datos.</P>

      <H2>3. Para qué los usamos y con qué base legal</H2>
      <UL items={[
        <>Gestionar tu solicitud, confirmar precio y disponibilidad, enviarte el enlace de pago y prestar el servicio. Base legal: ejecución de un contrato o de medidas precontractuales a petición tuya (art. 6.1.b RGPD).</>,
        <>Emitir facturas y cumplir obligaciones contables y fiscales. Base legal: obligación legal (art. 6.1.c RGPD).</>,
        <>Mantener la seguridad de la web y prevenir el fraude. Base legal: interés legítimo (art. 6.1.f RGPD).</>
      ]} />
      <P>No usamos tus datos para enviarte publicidad, no elaboramos perfiles y no tomamos decisiones automatizadas sobre ti.</P>

      <H2>4. Cuánto tiempo los conservamos</H2>
      <UL items={[
        'Reservas realizadas y facturas: durante la relación y, después, el tiempo exigido por la ley (hasta 6 años para la documentación contable, según el art. 30 del Código de Comercio, y los plazos de prescripción tributaria).',
        'Solicitudes que no llegan a contratarse: se suprimen cuando dejan de ser necesarias y, como máximo, a los 12 meses.',
        'Registros técnicos de seguridad: el tiempo imprescindible, normalmente unas semanas.'
      ]} />

      <H2>5. Con quién los compartimos</H2>
      <P>No vendemos ni cedemos tus datos a terceros, salvo obligación legal (por ejemplo, a la Agencia Tributaria o a jueces y tribunales). Para prestar el servicio contamos con estos proveedores:</P>
      <UL items={[
        <>SumUp: procesa los pagos con tarjeta como entidad de pago, con su propia <Ext href="https://www.sumup.com/es-es/privacidad/">política de privacidad</Ext>.</>,
        'Railway Corporation: alojamiento de la web y de la base de datos (encargado del tratamiento).',
        'Cloudflare, Inc.: red de distribución y protección de la web frente a ataques (encargado del tratamiento).',
        'WhatsApp Ireland Ltd. (Meta): solo si decides contactarnos por WhatsApp.'
      ]} />

      <H2>6. Transferencias internacionales</H2>
      <P>Railway y Cloudflare son empresas con sede en Estados Unidos, por lo que algunos datos pueden tratarse fuera del Espacio Económico Europeo. Estas transferencias se amparan en el Marco de Privacidad de Datos UE-EE. UU. cuando el proveedor está adherido a él o, en su defecto, en las cláusulas contractuales tipo aprobadas por la Comisión Europea (art. 46 RGPD).</P>

      <H2>7. Tus derechos</H2>
      <P>Puedes ejercer en cualquier momento tus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad escribiendo a {email}, indicando qué derecho quieres ejercer. Te responderemos en el plazo máximo de un mes. Si fuera necesario para identificarte, podremos pedirte información adicional.</P>
      <P>Si consideras que no hemos atendido correctamente tu solicitud, puedes presentar una reclamación ante la Agencia Española de Protección de Datos (<Ext href="https://www.aepd.es">www.aepd.es</Ext>).</P>

      <H2>8. Menores de edad</H2>
      <P>Las reservas deben realizarlas personas mayores de edad. Si un menor viaja, sus datos los facilita la persona adulta responsable de la reserva.</P>

      <H2>9. Seguridad</H2>
      <P>Aplicamos medidas técnicas y organizativas adecuadas: conexión cifrada (HTTPS), acceso al panel interno solo con usuario y contraseña personales, contraseñas almacenadas de forma cifrada y copias de seguridad.</P>

      <H2>10. Cambios en esta política</H2>
      <P>Podemos actualizar esta política si cambian nuestros servicios o la normativa. La fecha de la última actualización figura al principio. Consulta también la <A href={`/cookies${q}`}>política de cookies</A>.</P>
    </>
  );
}

function Cookies({ email, q }) {
  return (
    <>
      <H2>1. Qué son las cookies</H2>
      <P>Las cookies son pequeños archivos que una web guarda en tu navegador. Algunas son imprescindibles para que la web funcione (técnicas) y otras sirven, por ejemplo, para analizar visitas o mostrar publicidad. Estas últimas solo pueden usarse con tu consentimiento previo (art. 22.2 LSSI).</P>

      <H2>2. Cookies que usa esta web</H2>
      <P><b className="text-white/90">Esta web no utiliza cookies de análisis, de publicidad ni de redes sociales.</b> Por eso no te pedimos consentimiento ni mostramos un aviso de cookies.</P>
      <P>Las fuentes tipográficas e imágenes se sirven desde nuestro propio servidor, sin conectar con servicios de terceros como Google Fonts.</P>
      <P>Solo pueden instalarse estas cookies técnicas, exentas de consentimiento:</P>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[13px] text-white/70 border-collapse">
          <thead>
            <tr className="text-[11px] tracking-[0.15em] text-white/40 uppercase">
              <th className="py-2 pr-4 border-b border-white/10">Cookie</th>
              <th className="py-2 pr-4 border-b border-white/10">Titular</th>
              <th className="py-2 pr-4 border-b border-white/10">Finalidad</th>
              <th className="py-2 border-b border-white/10">Duración</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-3 pr-4 border-b border-white/5 align-top">alayan_sid</td>
              <td className="py-3 pr-4 border-b border-white/5 align-top">Propia</td>
              <td className="py-3 pr-4 border-b border-white/5 align-top">Mantener la sesión del personal en el panel interno. No se instala a los visitantes de la web.</td>
              <td className="py-3 border-b border-white/5 align-top">7 días</td>
            </tr>
            <tr>
              <td className="py-3 pr-4 border-b border-white/5 align-top">__cf_bm, cf_clearance</td>
              <td className="py-3 pr-4 border-b border-white/5 align-top">Cloudflare</td>
              <td className="py-3 pr-4 border-b border-white/5 align-top">Seguridad: distinguir personas de bots y proteger la web frente a ataques. Solo se instalan si se detecta tráfico sospechoso.</td>
              <td className="py-3 border-b border-white/5 align-top">30 minutos – 1 año</td>
            </tr>
          </tbody>
        </table>
      </div>

      <H2>3. Páginas de terceros</H2>
      <P>Si pagas con SumUp o nos escribes por WhatsApp, saldrás de esta web y esos servicios pueden usar sus propias cookies según sus políticas: <Ext href="https://www.sumup.com/es-es/privacidad/">SumUp</Ext> y <Ext href="https://www.whatsapp.com/legal/privacy-policy-eea">WhatsApp</Ext>.</P>

      <H2>4. Cómo gestionar o borrar las cookies</H2>
      <P>Puedes ver, bloquear o eliminar las cookies desde la configuración de tu navegador (Chrome, Firefox, Safari, Edge…). Si bloqueas las cookies técnicas, algunas partes de la web podrían no funcionar.</P>

      <H2>5. Cambios</H2>
      <P>Si en el futuro incorporamos cookies que requieran consentimiento (por ejemplo, de analítica), actualizaremos esta política y te lo pediremos antes de instalarlas. Para cualquier duda, escríbenos a {email}. Más información en la <A href={`/privacidad${q}`}>política de privacidad</A>.</P>
    </>
  );
}

function Terms({ owner, email, q, content }) {
  const cancel = content.ES.booking.cancel;
  return (
    <>
      <P>Estas condiciones regulan la contratación de servicios de transfer privado a través de esta web. Te recomendamos leerlas antes de reservar; al aceptar la casilla del formulario declaras conocerlas.</P>

      <H2>1. Prestador del servicio</H2>
      <P>El servicio lo presta {owner}, con los datos identificativos y la autorización de transporte que figuran en el <A href={`/aviso-legal${q}`}>aviso legal</A>. Contacto: {email}.</P>

      <H2>2. Servicio</H2>
      <P>Transporte privado de viajeros en vehículo con conductor, de un origen a un destino en la fecha y hora indicadas (aeropuertos, estaciones, hoteles, eventos, viajes por Andalucía y Portugal) o a disposición por horas, según lo que se acuerde en cada reserva.</P>

      <H2>3. Cómo se contrata</H2>
      <UL items={[
        'Rellenas el formulario de reserva con los datos del trayecto. El envío es una solicitud: todavía no es una reserva confirmada ni genera ningún cargo.',
        'Revisamos la disponibilidad y te enviamos por WhatsApp o email el precio cerrado del servicio junto con un enlace personal a esta web. En esa página verás el resumen de la reserva y el precio con IVA, y deberás aceptar el precio y estas condiciones antes de pagar.',
        'Al pulsar «Pagar» se te redirige a la pasarela segura de SumUp. La reserva queda confirmada y el contrato celebrado cuando el pago se completa; la misma página de la reserva te lo mostrará y te enviaremos la confirmación por WhatsApp o email.',
        'Antes de pagar puedes corregir cualquier dato respondiendo a nuestro mensaje. La reserva queda registrada en nuestro sistema y puedes consultarla en tu enlace personal o pedirnos una copia en cualquier momento.',
        'El contrato puede formalizarse en español o en inglés.'
      ]} />

      <H2>4. Precio y pago</H2>
      <P>Los precios publicados en la web son orientativos («desde») e incluyen el IVA. El precio de cada servicio es cerrado y se comunica antes del pago. Cualquier suplemento no incluido (por ejemplo, esperas adicionales a las incluidas o paradas no previstas) se te informará y deberás aceptarlo antes de realizarse.</P>
      <P>El pago se realiza con tarjeta a través de la pasarela segura de SumUp. No almacenamos los datos de tu tarjeta. Emitimos factura del servicio.</P>

      <H2>5. Cancelaciones y cambios</H2>
      <P>{cancel}</P>
      <P>Para cancelar o modificar una reserva escríbenos por WhatsApp o a {email}; se tomará como referencia la hora de recepción de tu mensaje. Los reembolsos que correspondan se realizarán por el mismo medio de pago en un plazo máximo de 14 días naturales.</P>
      <P>Si nosotros tuviéramos que cancelar el servicio, te devolveremos íntegramente el importe pagado.</P>

      <H2>6. Derecho de desistimiento</H2>
      <P>De acuerdo con el artículo 103.l) del Real Decreto Legislativo 1/2007 (Ley General para la Defensa de los Consumidores y Usuarios), el derecho de desistimiento de 14 días no se aplica a los servicios de transporte con una fecha o periodo de ejecución específicos. Se aplica la política de cancelación del apartado anterior.</P>

      <H2>7. Desarrollo del servicio</H2>
      <UL items={[
        'Es importante que los datos facilitados (hora, dirección, número de vuelo, pasajeros y equipaje) sean correctos. Si el número de pasajeros o de maletas supera la capacidad del vehículo, podremos adaptar el servicio o su precio, previo aviso.',
        'En recogidas en aeropuerto hacemos seguimiento del vuelo indicado para ajustar la recogida a los retrasos.',
        'Los menores deben viajar con los sistemas de retención exigidos por la normativa de tráfico. Indícanos en la reserva si los necesitas.',
        'Los vehículos cuentan con los seguros obligatorios para el transporte de viajeros, incluido el Seguro Obligatorio de Viajeros.'
      ]} />

      <H2>8. Quejas y reclamaciones</H2>
      <P>Puedes dirigir cualquier queja o reclamación a {email}. Te responderemos lo antes posible y, en todo caso, en el plazo legal.</P>
      <P>Existen hojas de quejas y reclamaciones oficiales de la Junta de Andalucía a tu disposición; puedes solicitarlas al conductor o por email. También puedes presentar tu reclamación en el portal Consumo Responde de la Junta de Andalucía (<Ext href="https://www.consumoresponde.es">www.consumoresponde.es</Ext>, teléfono 900 21 50 80).</P>
      <P>Las controversias sobre el contrato de transporte pueden someterse a las Juntas Arbitrales del Transporte, conforme a la Ley 16/1987 de Ordenación de los Transportes Terrestres.</P>

      <H2>9. Legislación aplicable</H2>
      <P>Estas condiciones se rigen por la legislación española. Si eres consumidor, serán competentes los juzgados y tribunales de tu domicilio.</P>
    </>
  );
}
