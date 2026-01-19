import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Zap, Shield, Cookie, Database, Mail, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function PrivacyPolicy() {
  const navigate = useNavigate();
  const lastUpdated = "17 de enero de 2026";

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Politica de Privacidad | Synapse</title>
        <meta name="description" content="Politica de privacidad y proteccion de datos de Synapse. Cumplimiento GDPR." />
      </Helmet>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Volver</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Zap className="text-white" size={18} />
            </div>
            <span className="text-lg font-bold text-slate-900">Synapse</span>
          </div>

          <div className="w-20"></div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">

          {/* Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-2xl mb-4">
              <Shield className="text-indigo-600" size={32} />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">
              Politica de Privacidad
            </h1>
            <p className="text-slate-500 flex items-center justify-center gap-2">
              <Clock size={16} />
              Ultima actualizacion: {lastUpdated}
            </p>
          </div>

          {/* Intro */}
          <div className="prose prose-slate max-w-none">
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              En <strong>Synapse</strong> nos tomamos muy en serio tu privacidad. Esta politica explica
              que datos recopilamos, como los usamos y cuales son tus derechos segun el
              Reglamento General de Proteccion de Datos (GDPR).
            </p>

            {/* Section 1 */}
            <section className="mb-10">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-lg text-indigo-600 text-sm font-bold">1</span>
                Responsable del tratamiento
              </h2>
              <div className="bg-slate-50 rounded-xl p-6 text-slate-700">
                <p><strong>Responsable:</strong> Synapse</p>
                <p><strong>Email de contacto:</strong> synapse.app.contact@proton.me</p>
                <p className="text-sm text-slate-500 mt-2">
                  Puedes ejercer tus derechos de acceso, rectificacion, supresion, oposicion y portabilidad
                  enviando un email a la direccion indicada.
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section className="mb-10">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-lg text-indigo-600 text-sm font-bold">2</span>
                Datos que recopilamos
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4 p-4 bg-slate-50 rounded-xl">
                  <Database className="text-indigo-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="font-semibold text-slate-900">Datos de cuenta (Google Sign-In)</h3>
                    <p className="text-slate-600 text-sm mt-1">
                      Nombre, email y foto de perfil proporcionados por Google cuando inicias sesion.
                      No tenemos acceso a tu contrasena de Google.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 bg-slate-50 rounded-xl">
                  <Database className="text-indigo-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="font-semibold text-slate-900">Datos de uso</h3>
                    <p className="text-slate-600 text-sm mt-1">
                      Recursos subidos, descargas realizadas, validaciones y favoritos guardados.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 bg-slate-50 rounded-xl">
                  <Database className="text-indigo-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="font-semibold text-slate-900">Datos de pago (solo usuarios PRO)</h3>
                    <p className="text-slate-600 text-sm mt-1">
                      Los pagos son procesados por <strong>Stripe</strong>. No almacenamos datos de tarjetas
                      de credito en nuestros servidores. Stripe cumple con PCI-DSS.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section className="mb-10">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-lg text-indigo-600 text-sm font-bold">3</span>
                Finalidad del tratamiento
              </h2>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-1">•</span>
                  Gestionar tu cuenta y autenticacion
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-1">•</span>
                  Permitir la subida y descarga de recursos
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-1">•</span>
                  Procesar suscripciones PRO
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-1">•</span>
                  Mejorar el servicio mediante analisis anonimos de uso
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-1">•</span>
                  Comunicaciones relacionadas con tu cuenta (opcional)
                </li>
              </ul>
            </section>

            {/* Section 4 - Cookies */}
            <section className="mb-10">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <Cookie className="text-indigo-600" size={24} />
                Cookies
              </h2>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <p className="text-slate-700 mb-4">
                  Utilizamos cookies para:
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-amber-200">
                    <span className="font-medium text-slate-900">Cookies esenciales</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Siempre activas</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Necesarias para el funcionamiento basico: sesion de usuario, preferencias de cookies.
                  </p>

                  <div className="flex justify-between items-center py-2 border-b border-amber-200 mt-4">
                    <span className="font-medium text-slate-900">Cookies de analitica</span>
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">Con tu consentimiento</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Vercel Analytics para entender como se usa la plataforma. Datos anonimos y agregados.
                  </p>
                </div>
                <p className="text-sm text-slate-500 mt-4">
                  Puedes cambiar tus preferencias de cookies en cualquier momento borrando los datos del navegador.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section className="mb-10">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-lg text-indigo-600 text-sm font-bold">5</span>
                Terceros y transferencias
              </h2>
              <p className="text-slate-700 mb-4">
                Compartimos datos unicamente con los siguientes proveedores de servicios:
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="font-semibold text-slate-900">Firebase</p>
                  <p className="text-xs text-slate-500">Autenticacion y base de datos</p>
                  <p className="text-xs text-slate-400 mt-1">Google LLC (UE/EEUU)</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="font-semibold text-slate-900">Stripe</p>
                  <p className="text-xs text-slate-500">Procesamiento de pagos</p>
                  <p className="text-xs text-slate-400 mt-1">Stripe Inc (EEUU)</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="font-semibold text-slate-900">Vercel</p>
                  <p className="text-xs text-slate-500">Hosting y analitica</p>
                  <p className="text-xs text-slate-400 mt-1">Vercel Inc (EEUU)</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-4">
                Todos los proveedores cumplen con garantias adecuadas de proteccion de datos
                (Clausulas Contractuales Tipo, Data Privacy Framework).
              </p>
            </section>

            {/* Section 6 */}
            <section className="mb-10">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-lg text-indigo-600 text-sm font-bold">6</span>
                Tus derechos (GDPR)
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { right: 'Acceso', desc: 'Solicitar copia de tus datos' },
                  { right: 'Rectificacion', desc: 'Corregir datos inexactos' },
                  { right: 'Supresion', desc: 'Eliminar tu cuenta y datos' },
                  { right: 'Oposicion', desc: 'Oponerte a ciertos tratamientos' },
                  { right: 'Portabilidad', desc: 'Recibir tus datos en formato estandar' },
                  { right: 'Limitacion', desc: 'Restringir el uso de tus datos' },
                ].map((item) => (
                  <div key={item.right} className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                    <div>
                      <span className="font-semibold text-slate-900">{item.right}:</span>
                      <span className="text-slate-600 text-sm ml-1">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-600 mt-4">
                Para ejercer cualquier derecho, contacta con nosotros en{' '}
                <a href="mailto:synapse.app.contact@proton.me" className="text-indigo-600 hover:underline">
                  synapse.app.contact@proton.me
                </a>
              </p>
            </section>

            {/* Section 7 */}
            <section className="mb-10">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-lg text-indigo-600 text-sm font-bold">7</span>
                Retencion de datos
              </h2>
              <p className="text-slate-700">
                Conservamos tus datos mientras mantengas tu cuenta activa. Si eliminas tu cuenta,
                borraremos tus datos personales en un plazo maximo de 30 dias, salvo obligacion legal
                de conservarlos (ej: datos de facturacion, 5 anos).
              </p>
            </section>

            {/* Section 8 */}
            <section className="mb-10">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-lg text-indigo-600 text-sm font-bold">8</span>
                Seguridad
              </h2>
              <p className="text-slate-700">
                Implementamos medidas tecnicas y organizativas para proteger tus datos:
                conexiones cifradas (HTTPS), autenticacion segura via Google, almacenamiento
                en Firebase con reglas de seguridad, y procesamiento de pagos PCI-DSS con Stripe.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <Mail className="text-indigo-600" size={24} />
                Contacto
              </h2>
              <div className="bg-indigo-50 rounded-xl p-6">
                <p className="text-slate-700 mb-2">
                  Si tienes dudas sobre esta politica o quieres ejercer tus derechos:
                </p>
                <a
                  href="mailto:synapse.app.contact@proton.me"
                  className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:underline"
                >
                  <Mail size={18} />
                  synapse.app.contact@proton.me
                </a>
                <p className="text-sm text-slate-500 mt-4">
                  Tambien puedes presentar una reclamacion ante la Agencia Espanola de Proteccion
                  de Datos (AEPD) si consideras que tus derechos han sido vulnerados.
                </p>
              </div>
            </section>

          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-500">
          <p>© {new Date().getFullYear()} Synapse. Todos los derechos reservados.</p>
        </div>
      </main>
    </div>
  );
}

export default PrivacyPolicy;
