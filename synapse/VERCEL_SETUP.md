# Configuración de Vercel para Synapse

## Variables de Entorno

Para que la integración de Stripe funcione en Vercel, necesitas configurar las siguientes variables de entorno:

### 1. Ir a tu proyecto en Vercel

https://vercel.com/dashboard → Tu Proyecto → Settings → Environment Variables

### 2. Añadir las siguientes variables:

#### VITE_STRIPE_PUBLISHABLE_KEY (Production, Preview, Development)
```
PEGAR_AQUI_TU_CLAVE_PUBLICA_DE_STRIPE
```
*Formato: `pk_test_...` o `pk_live_...`*

#### STRIPE_SECRET_KEY (Production, Preview, Development)
```
PEGAR_AQUI_TU_CLAVE_SECRETA_DE_STRIPE
```
*Formato: `sk_test_...` o `sk_live_...`*

#### STRIPE_PRICE_ID (Production, Preview, Development)
```
PEGAR_AQUI_TU_PRICE_ID_DE_STRIPE
```
*Formato: `price_...`*

### 3. Re-deploy

Después de añadir las variables, haz un nuevo deploy:

```bash
vercel --prod
```

O simplemente haz un nuevo commit y push a GitHub (si tienes auto-deploy configurado).

## Verificación

Una vez desplegado, verifica que:

1. La página principal carga correctamente
2. Puedes hacer clic en "Actualizar a PRO"
3. Te redirige a Stripe Checkout
4. Puedes completar el pago con la tarjeta de prueba: `4242 4242 4242 4242`
5. Te redirige a `/success` con confetti
6. Al volver a home, ya no ves el contador de descargas

## Troubleshooting

Si algo no funciona, revisa los logs de Vercel:

```bash
vercel logs --prod
```

O en el dashboard de Vercel → Deployments → Latest → Function Logs
