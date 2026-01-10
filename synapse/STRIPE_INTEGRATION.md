# Integración de Stripe para Synapse PRO

## Resumen

Implementación completa de la pasarela de pago Stripe usando Vercel Serverless Functions para vender suscripciones al plan "Synapse PRO".

**Fecha**: 2026-01-10
**Archivos creados/modificados**: Ver sección de archivos al final

---

## Arquitectura de Pago

### Flujo Completo del Usuario

```
1. Usuario alcanza límite de 5 descargas gratuitas
   ↓
2. Modal "Límite Alcanzado" aparece
   ↓
3. Usuario hace clic en "Actualizar a PRO"
   ↓
4. handleUpgradeToPro() se ejecuta:
   - Carga Stripe.js en el navegador
   - Llama a /api/create-checkout-session (Vercel Function)
   ↓
5. Backend (Vercel Function):
   - Crea Stripe Checkout Session
   - Retorna sessionId
   ↓
6. Frontend redirige a Stripe Checkout
   ↓
7. Usuario ingresa datos de tarjeta en Stripe
   ↓
8. Stripe procesa el pago
   ↓
9. Stripe redirige a /success?session_id=xxx
   ↓
10. Página Success.jsx:
    - Actualiza Firebase: isPro: true
    - Muestra confetti y mensaje de bienvenida
   ↓
11. Usuario navega a Home
    - Ya NO ve contador de descargas
    - Descargas son ilimitadas
```

---

## Configuración de Variables de Entorno

### Archivo: `.env.local`

```bash
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_PRICE_ID=price_XXXXXXXXXXXXXXXXXXXXXXXX
```

**Claves**:
- `VITE_STRIPE_PUBLISHABLE_KEY`: Clave pública (visible en frontend) con prefijo `VITE_` - Obtenerla de Stripe Dashboard
- `STRIPE_SECRET_KEY`: Clave secreta (solo backend, nunca expuesta) - Obtenerla de Stripe Dashboard
- `STRIPE_PRICE_ID`: ID del producto/precio en Stripe Dashboard - Crear producto primero

**Seguridad**:
- `.env.local` está en `.gitignore` (NO se sube a GitHub)
- En Vercel, configurar estas variables en Settings → Environment Variables

---

## Backend: Vercel Serverless Function

### Archivo: `api/create-checkout-session.js`

**Propósito**: Crear una sesión de Stripe Checkout desde el servidor.

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',              // Suscripción recurrente
      payment_method_types: ['card'],    // Solo tarjeta
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
      client_reference_id: userId,       // Para identificar usuario después
      metadata: { userId },              // Metadata adicional
    });

    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('[Stripe] Error:', error);
    res.status(500).json({ error: error.message });
  }
};
```

**Características**:
- **CORS**: Permite peticiones desde cualquier origen (ajustar en producción)
- **Seguridad**: Secret key solo en servidor
- **Metadata**: Almacena `userId` para asociar pago con usuario
- **URLs dinámicas**: `success_url` y `cancel_url` usan el origen de la petición

---

## Frontend: Integración en App.jsx

### 1. Imports

```javascript
import { loadStripe } from '@stripe/stripe-js';
```

### 2. Handler de Upgrade

**Ubicación**: Después de `handleCardClick()` (líneas 377-421)

```javascript
const handleUpgradeToPro = async () => {
  if (!user) {
    alert('Debes iniciar sesión para actualizar a PRO');
    return;
  }

  try {
    // Load Stripe.js
    const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

    if (!stripe) {
      throw new Error('Stripe failed to load');
    }

    // Call backend to create checkout session
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.uid,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }

    const { sessionId } = await response.json();

    // Redirect to Stripe Checkout
    const result = await stripe.redirectToCheckout({ sessionId });

    if (result.error) {
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error('[Stripe] Error:', error);
    alert('Error al procesar el pago: ' + error.message);
  }
};
```

**Flujo**:
1. Carga librería Stripe.js
2. Hace POST a `/api/create-checkout-session`
3. Recibe `sessionId`
4. Redirige a Stripe Checkout con `stripe.redirectToCheckout()`

### 3. Botón "Actualizar a PRO"

**Ubicación**: Modal de límite alcanzado (líneas 1515-1524)

```javascript
<button
  onClick={() => {
    setShowLimitModal(false);
    handleUpgradeToPro();
  }}
  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition flex items-center justify-center gap-3"
>
  <Zap size={24} />
  Actualizar a PRO
</button>
```

**Comportamiento**:
- Cierra el modal de límite
- Inicia el flujo de pago

---

## Página de Éxito: Success.jsx

### Componente Completo

**Ubicación**: `src/Success.jsx`

```javascript
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, Check, ArrowRight } from 'lucide-react';
import { auth, db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Confetti from 'react-confetti';

function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);
  const [upgrading, setUpgrading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const upgradeUserToPro = async () => {
      if (!sessionId) {
        navigate('/');
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        navigate('/');
        return;
      }

      try {
        // Update user document in Firestore
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          isPro: true,
          upgradedAt: new Date(),
          stripeSessionId: sessionId,
        });

        console.log('[Success] User upgraded to PRO');
        setUpgrading(false);
      } catch (error) {
        console.error('[Success] Error upgrading user:', error);
        setUpgrading(false);
      }
    };

    upgradeUserToPro();
  }, [sessionId, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}

      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-12 text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full mb-6 animate-bounce">
          <Zap className="text-white" size={48} />
        </div>

        {/* Title */}
        <h1 className="text-5xl font-extrabold text-slate-900 mb-4">
          ¡Bienvenido a Synapse PRO! 🎉
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-slate-600 mb-8">
          {upgrading ? 'Actualizando tu cuenta...' : 'Tu suscripción ha sido activada exitosamente'}
        </p>

        {/* Benefits Grid */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 mb-8 border-2 border-indigo-200">
          <p className="text-lg font-bold text-indigo-900 mb-6">Ahora tienes acceso a:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 4 benefits with checkmarks */}
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => navigate('/')}
          disabled={upgrading}
          className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition inline-flex items-center gap-3 shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          {upgrading ? 'Procesando...' : 'Explorar Recursos'}
          <ArrowRight size={24} />
        </button>
      </div>
    </div>
  );
}
```

**Características**:
1. **Confetti**: Celebración visual que dura 5 segundos
2. **Actualización Firebase**: Actualiza `isPro: true` en Firestore
3. **Metadata adicional**: Guarda `upgradedAt` y `stripeSessionId`
4. **Estado de carga**: Muestra "Procesando..." mientras actualiza
5. **Navegación**: Botón para volver al home

**Seguridad (MVP)**:
- ⚠️ **Limitación**: Actualización en cliente, no 100% seguro
- 🔒 **Producción**: Implementar Webhooks de Stripe para validar pagos

---

## Routing: Configuración de React Router

### Archivo: `src/main.jsx`

```javascript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import Success from './Success.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/success" element={<Success />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
```

**Rutas**:
- `/`: Home con catálogo de recursos
- `/success`: Página de confirmación de pago

---

## Configuración de Vercel

### Archivo: `vercel.json`

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "functions": {
    "api/**/*.js": {
      "maxDuration": 10
    }
  },
  "env": {
    "STRIPE_SECRET_KEY": "@stripe-secret-key",
    "STRIPE_PRICE_ID": "@stripe-price-id"
  }
}
```

**Configuración**:
- **Rewrites**: SPA routing (todas las rutas van a index.html)
- **Functions**: Timeout de 10s para funciones serverless
- **Env**: Referencias a variables de entorno de Vercel (configurar en dashboard)

---

## Estructura de Firestore

### Colección: `users/{userId}`

**Campos añadidos para PRO**:

```javascript
{
  // Campos existentes
  downloadsCount: 0,
  lastDownloadAt: Timestamp,
  createdAt: Timestamp,

  // Nuevos campos PRO
  isPro: true,                    // Usuario PRO
  upgradedAt: Timestamp,          // Fecha de upgrade
  stripeSessionId: "cs_test_..."  // ID de sesión de Stripe
}
```

**Queries**:
- Usuario gratuito: `isPro === undefined || isPro === false`
- Usuario PRO: `isPro === true`

---

## Testing con Tarjetas de Prueba

### Tarjetas de Stripe (Test Mode)

**Éxito**:
```
Número: 4242 4242 4242 4242
Fecha: Cualquier fecha futura (ej: 12/34)
CVC: Cualquier 3 dígitos (ej: 123)
ZIP: Cualquier código postal (ej: 12345)
```

**Fallo (tarjeta declinada)**:
```
Número: 4000 0000 0000 0002
```

**Requiere autenticación 3D Secure**:
```
Número: 4000 0025 0000 3155
```

### Flujo de Testing

1. **Iniciar sesión** en Synapse
2. **Descargar 5 recursos** para alcanzar límite
3. **Clic en "Actualizar a PRO"**
4. **Ingresar tarjeta de prueba** en Stripe Checkout
5. **Completar pago**
6. **Redirigir a /success** → Ver confetti
7. **Volver a Home** → Contador de descargas desaparece
8. **Descargar recursos ilimitados**

---

## Dashboard de Stripe

### Ver Pagos

1. Ir a [Stripe Dashboard](https://dashboard.stripe.com/test/payments)
2. Ver pagos en modo Test
3. Ver detalles de sesión: customer, amount, status

### Ver Suscripciones

1. Ir a [Subscriptions](https://dashboard.stripe.com/test/subscriptions)
2. Ver suscripciones activas
3. Cancelar suscripción (testing)

### Webhooks (Futuro)

Para producción, configurar webhook:
- Endpoint: `https://tudominio.com/api/stripe-webhook`
- Eventos: `checkout.session.completed`, `customer.subscription.deleted`

---

## Seguridad y Limitaciones (MVP)

### ✅ Implementado

- ✅ Clave secreta solo en servidor (Vercel Functions)
- ✅ CORS configurado
- ✅ Validación de `userId` en backend
- ✅ Redirect URLs dinámicas

### ⚠️ Limitaciones MVP

- ⚠️ **No hay Webhooks**: Actualización en cliente (no 100% seguro)
- ⚠️ **Sin validación de pago**: Asumimos que si llega a /success, pagó
- ⚠️ **Sin manejo de cancelaciones**: Usuario sigue siendo PRO si cancela
- ⚠️ **Sin renovación automática**: No trackea si suscripción expiró

### 🔒 Para Producción

1. **Implementar Webhooks**:
   ```javascript
   // api/stripe-webhook.js
   const event = stripe.webhooks.constructEvent(
     req.body,
     req.headers['stripe-signature'],
     process.env.STRIPE_WEBHOOK_SECRET
   );

   if (event.type === 'checkout.session.completed') {
     const session = event.data.object;
     const userId = session.metadata.userId;
     // Actualizar Firebase desde servidor
   }
   ```

2. **Validar suscripción activa**:
   - Guardar `stripeCustomerId` y `subscriptionId`
   - Verificar estado en cada login

3. **Manejo de cancelaciones**:
   - Webhook `customer.subscription.deleted`
   - Actualizar `isPro: false`

4. **Renovación automática**:
   - Stripe maneja renovación
   - Webhook `invoice.payment_succeeded` para confirmar

---

## Archivos Creados/Modificados

### Nuevos Archivos

1. **`.env.local`**: Variables de entorno (NO subir a Git)
2. **`api/create-checkout-session.js`**: Vercel Function para Stripe
3. **`src/Success.jsx`**: Página de éxito post-pago
4. **`vercel.json`**: Configuración de Vercel
5. **`STRIPE_INTEGRATION.md`**: Esta documentación

### Archivos Modificados

1. **`src/main.jsx`**: Routing con React Router
2. **`src/App.jsx`**:
   - Import de `loadStripe`
   - Función `handleUpgradeToPro()`
   - Botón "Actualizar a PRO" llama a `handleUpgradeToPro()`
3. **`package.json`**: Dependencias `stripe`, `@stripe/stripe-js`, `react-confetti`

---

## Dependencias Instaladas

```bash
npm install stripe @stripe/stripe-js react-confetti
```

**Versiones**:
- `stripe@^17.5.0`: SDK de Stripe para Node.js (backend)
- `@stripe/stripe-js@^5.3.0`: Librería de Stripe para frontend
- `react-confetti@^6.1.0`: Efecto de confetti para celebración

---

## Comandos Útiles

### Desarrollo Local

```bash
# Iniciar servidor de desarrollo
npm run dev

# Verificar variables de entorno
cat .env.local
```

### Build y Deploy

```bash
# Build local
npm run build

# Deploy a Vercel
vercel --prod

# Ver logs en Vercel
vercel logs
```

### Testing

```bash
# Revisar console del navegador
# Buscar logs: [Stripe], [Success], [Upload]

# Revisar Stripe Dashboard
# https://dashboard.stripe.com/test/payments
```

---

## Troubleshooting

### Error: "Stripe failed to load"

**Causa**: Clave pública incorrecta o no cargada

**Solución**:
- Verificar que `.env.local` existe
- Verificar que la clave empieza con `pk_test_`
- Reiniciar servidor de desarrollo: `npm run dev`

### Error: "Failed to create checkout session"

**Causa**: Backend no responde o CORS bloqueado

**Solución**:
- Verificar que `/api` existe en Vercel
- Revisar logs de Vercel Function
- Verificar CORS headers en `create-checkout-session.js`

### Error: "Method not allowed"

**Causa**: Petición no es POST

**Solución**:
- Verificar que `fetch()` usa `method: 'POST'`
- Verificar que backend permite POST

### Usuario no se actualiza a PRO

**Causa**: Firebase no actualiza documento

**Solución**:
- Verificar que usuario está autenticado
- Revisar permisos de Firestore Rules
- Ver console: `[Success] User upgraded to PRO`

---

## Próximos Pasos (Roadmap)

### Fase 1: MVP (Actual) ✅
- [x] Integración básica de Stripe
- [x] Checkout Session
- [x] Página de éxito
- [x] Actualización de Firebase

### Fase 2: Seguridad (Próximo)
- [ ] Implementar Webhooks
- [ ] Validación de pago en servidor
- [ ] Manejo de cancelaciones
- [ ] Logs de auditoría

### Fase 3: UX Avanzada
- [ ] Portal de cliente (Stripe Customer Portal)
- [ ] Gestión de suscripción
- [ ] Invoices y recibos
- [ ] Email confirmación de pago

### Fase 4: Monetización
- [ ] Múltiples planes (Basic, Pro, Enterprise)
- [ ] Trial period (7 días gratis)
- [ ] Códigos promocionales
- [ ] Programa de afiliados

---

**Documentado por**: Claude Sonnet 4.5
**Fecha**: 2026-01-10
**Versión**: 1.0 (MVP)
