# Sistema Freemium - Synapse

## Resumen

Implementación completa del sistema de límites de descargas gratuitas y vista previa de PDFs para mejorar la UX y generar oportunidades de monetización.

---

## 1. Vista Previa de PDF ("Look Inside")

### Funcionalidad
- **Botón "Vista Previa"** en el modal de recursos
- Renderiza las **primeras 3 páginas** del PDF como imágenes
- Usa `pdfjs-dist` (ya instalado) para procesar el PDF en el navegador
- **NO cuenta como descarga** - Solo lectura en pantalla

### Ubicación en Código
**Archivo**: `src/App.jsx`

**Función de generación** (líneas ~232-276):
```javascript
const generatePdfPreview = async (fileUrl) => {
  // Fetch PDF from Firebase Storage
  // Render first 3 pages using PDF.js
  // Convert canvas to data URLs
  // Store in state: previewPages[]
}
```

**Botón en ResourceModal** (línea ~975):
```javascript
<button onClick={() => generatePdfPreview(selectedResource.fileUrl)}>
  <Eye size={24} />
  Vista Previa (Primeras 3 páginas)
</button>
```

**Modal de Preview** (líneas ~1274-1336):
- Muestra las 3 páginas en formato vertical con scroll
- Loading spinner mientras genera las imágenes
- CTA al final para descargar el documento completo

### UX Flow
1. Usuario hace clic en un recurso → Abre ResourceModal
2. Usuario hace clic en "Vista Previa" → Abre PreviewModal
3. Sistema descarga el PDF y renderiza primeras 3 páginas
4. Usuario puede leer el contenido sin gastar descargas
5. Si le gusta, puede hacer clic en "Descargar Completo"

---

## 2. Sistema de Límites (Freemium)

### Límites Configurados
```javascript
const FREE_LIMIT = 5; // 5 descargas gratuitas por mes
```

### Lógica de Verificación

**Archivo**: `src/App.jsx` (líneas ~364-405)

```javascript
const handleDownloadFromModal = async () => {
  // 1. Verificar si usuario es PRO
  const isPro = user.isPro || false;

  if (!isPro) {
    // 2. Verificar límite
    if (userDownloadCount >= FREE_LIMIT) {
      setShowLimitModal(true); // Bloquear descarga
      return;
    }

    // 3. Incrementar contador en Firebase
    await incrementUserDownloadCount(user.uid);
    setUserDownloadCount(prev => prev + 1);

    // 4. Mostrar feedback
    const remaining = FREE_LIMIT - userDownloadCount - 1;
    alert(`Te quedan ${remaining} descargas gratuitas este mes.`);
  }

  // 5. Proceder con descarga
  window.open(selectedResource.fileUrl, '_blank');
}
```

### Base de Datos (Firebase)

**Collection**: `users/{userId}`

**Campos**:
```javascript
{
  downloadsCount: 0,           // Contador de descargas del mes
  lastDownloadAt: Timestamp,   // Última descarga (para tracking)
  createdAt: Timestamp,        // Fecha de registro
  isPro: false                 // Estado PRO (futuro)
}
```

**Funciones en `firebase.js`** (líneas ~267-314):
- `getUserDownloadCount(userId)` - Obtiene contador actual
- `incrementUserDownloadCount(userId)` - Incrementa en 1

---

## 3. UI Feedback

### 3.1 Contador en Navbar

**Ubicación**: `src/App.jsx` (líneas ~538-545)

```javascript
{!(user.isPro || false) && (
  <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
    <Download size={16} />
    <span className="text-sm font-semibold">
      Descargas: {userDownloadCount}/{FREE_LIMIT}
    </span>
  </div>
)}
```

**Características**:
- Solo visible para usuarios **NO PRO**
- Muestra `2/5`, `3/5`, etc.
- Oculto en móvil (`hidden md:flex`) para no saturar UI

### 3.2 Modal de Límite Alcanzado

**Ubicación**: `src/App.jsx` (líneas ~1338-1402)

**Diseño**:
- Icono de Zap (⚡) en círculo amarillo
- Título: "Límite Gratuito Alcanzado"
- Lista de beneficios PRO:
  - Descargas ilimitadas
  - Acceso prioritario a nuevos recursos
  - Sin publicidad
  - Soporte prioritario
- Botón CTA: "Actualizar a PRO" (actualmente placeholder)

**Cuando se muestra**:
```javascript
if (userDownloadCount >= FREE_LIMIT) {
  setShowLimitModal(true);
  return; // Bloquea la descarga
}
```

---

## 4. Flujo Completo del Usuario

### Usuario Gratuito (Primera vez)

1. **Inicio de sesión** → Firebase crea documento en `users/{uid}` con `downloadsCount: 0`
2. **Navega a recursos** → Ve contador `0/5` en Navbar
3. **Hace clic en recurso** → Abre modal con 2 botones:
   - "Vista Previa" (gratis, ilimitado)
   - "Descargar Recurso Completo" (cuenta para límite)
4. **Hace clic en "Vista Previa"** → Ve primeras 3 páginas sin gastar descargas
5. **Si le gusta, hace clic en "Descargar"**:
   - Sistema verifica: `0 < 5` ✅
   - Incrementa contador: `downloadsCount = 1`
   - Muestra alert: "Te quedan 4 descargas gratuitas este mes"
   - Inicia descarga del PDF completo
6. **Contador en Navbar actualiza** → `1/5`

### Usuario Gratuito (Límite alcanzado)

1. **Ha descargado 5 recursos** → Contador muestra `5/5`
2. **Intenta descargar otro**:
   - Sistema verifica: `5 >= 5` ❌
   - **NO incrementa** contador
   - **NO permite** descarga
   - Muestra modal: "Límite Gratuito Alcanzado"
3. **Opciones del usuario**:
   - Hacer clic en "Actualizar a PRO" (futuro: pasarela de pago)
   - Cerrar modal y esperar al próximo mes
   - **Puede seguir usando "Vista Previa"** sin límite

### Usuario PRO (Futuro)

1. `user.isPro === true` en Firebase
2. **NO ve contador** en Navbar
3. **NO tiene límites** de descarga
4. Sistema **NO incrementa** `downloadsCount`

---

## 5. Próximos Pasos (TODO)

### 5.1 Reset Mensual Automático
**Problema**: Actualmente el contador **NO se resetea** automáticamente cada mes.

**Solución recomendada**:
- Opción A: Cloud Function programada (Firebase Functions + Cloud Scheduler)
- Opción B: Reset en cliente al verificar `lastDownloadAt` vs fecha actual

**Implementación sugerida** (en `getUserDownloadCount`):
```javascript
const userRef = doc(db, 'users', userId);
const userSnap = await getDoc(userRef);
const data = userSnap.data();

// Verificar si estamos en un nuevo mes
const lastDownload = data.lastDownloadAt?.toDate();
const now = new Date();
const isNewMonth = !lastDownload ||
  (now.getMonth() !== lastDownload.getMonth() ||
   now.getFullYear() !== lastDownload.getFullYear());

if (isNewMonth) {
  await updateDoc(userRef, { downloadsCount: 0 });
  return 0;
}

return data.downloadsCount || 0;
```

### 5.2 Sistema de Pago (Stripe/Paddle)
- Integrar pasarela de pago
- Actualizar campo `isPro: true` en Firebase
- Webhook para suscripciones recurrentes

### 5.3 Mejoras UX
- Toast notifications en lugar de `alert()` (librería: react-hot-toast)
- Animaciones en modal de límite alcanzado
- Persistir estado del contador con onSnapshot (real-time)

### 5.4 Analytics
- Trackear cuántos usuarios llegan al límite
- Medir tasa de conversión del modal PRO
- Analizar uso de "Vista Previa" vs descargas directas

---

## 6. Testing Checklist

### Test 1: Vista Previa
- [ ] Botón "Vista Previa" visible en modal de recurso
- [ ] Modal de preview se abre correctamente
- [ ] Loading spinner aparece mientras carga
- [ ] Se muestran exactamente 3 páginas del PDF
- [ ] Páginas se renderizan correctamente (no borrosas)
- [ ] Botón "Descargar Completo" funciona desde preview
- [ ] **NO incrementa** contador de descargas

### Test 2: Límite de Descargas
- [ ] Usuario nuevo tiene contador en `0/5`
- [ ] Primer descarga incrementa a `1/5`
- [ ] Alert muestra "Te quedan 4 descargas..."
- [ ] Contador en Navbar se actualiza en tiempo real
- [ ] Al llegar a `5/5`, siguiente descarga muestra modal de límite
- [ ] Modal de límite **bloquea** la descarga
- [ ] Firebase tiene `downloadsCount: 5` en base de datos

### Test 3: Contador en Navbar
- [ ] Visible solo para usuarios autenticados NO PRO
- [ ] Oculto en móvil (< 768px)
- [ ] Actualiza después de cada descarga
- [ ] Formato correcto: "Descargas: X/5"

### Test 4: Modal de Límite Alcanzado
- [ ] Se muestra al intentar descarga #6
- [ ] Lista de beneficios PRO visible
- [ ] Botón "Actualizar a PRO" funciona (placeholder)
- [ ] Texto "Tu límite se reiniciará el próximo mes"
- [ ] Cerrar modal NO permite la descarga

---

## 7. Archivos Modificados

### `src/App.jsx`
- Añadido estado: `showPreviewModal`, `previewPages`, `userDownloadCount`, `showLimitModal`
- Constante: `FREE_LIMIT = 5`
- Nueva función: `generatePdfPreview()` (líneas ~232-276)
- Modificada función: `handleDownloadFromModal()` (líneas ~364-405)
- Nuevo componente: PreviewModal (líneas ~1274-1336)
- Nuevo componente: LimitModal (líneas ~1338-1402)
- Contador en Navbar (líneas ~538-545)
- Botón Vista Previa en ResourceModal (línea ~975)

### `src/firebase.js`
- Nueva función: `getUserDownloadCount(userId)` (líneas ~267-287)
- Nueva función: `incrementUserDownloadCount(userId)` (líneas ~289-314)
- Exports añadidos al import en App.jsx

---

## 8. Notas Técnicas

### Performance
- La vista previa descarga el PDF completo pero **solo renderiza 3 páginas**
- Para PDFs grandes (>10MB), considerar lazy loading de páginas
- Canvas rendering es síncrono → UI puede bloquear brevemente

### Seguridad
- Firebase Storage Rules deben permitir lectura para preview
- Considerar rate limiting en Cloud Functions si hay abuso
- Validar `downloadsCount` en servidor (Cloud Function) para evitar manipulación

### Escalabilidad
- Con millones de usuarios, considerar sharding de colección `users`
- Cachear contador en localStorage para reducir lecturas Firestore
- Implementar batch updates para reset mensual

---

**Documentado por**: Claude Sonnet 4.5
**Fecha**: 2026-01-10
**Versión**: 1.0
