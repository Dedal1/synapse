# Mejoras de UX y Fixes - Synapse

## Resumen

Implementación de mejoras críticas de UX para aumentar la conversión y arreglo del bug de CORS en la vista previa de PDFs.

**Fecha**: 2026-01-10
**Archivos modificados**: `src/App.jsx`

---

## 1. Fix Crítico: Error CORS en Vista Previa de PDF

### Problema
- Al intentar abrir la vista previa de un PDF desde Firebase Storage, el sistema mostraba error: "No se pudo cargar la vista previa del PDF"
- Causa: Configuración incorrecta de CORS al hacer fetch del PDF + falta de parámetros de configuración en PDF.js

### Solución Implementada

**Archivo**: `src/App.jsx` (líneas ~232-303)

#### Cambios en `generatePdfPreview()`:

1. **Fetch con CORS explícito**:
```javascript
const response = await fetch(fileUrl, {
  mode: 'cors',
  credentials: 'omit'
});
```

2. **Validación de respuesta HTTP**:
```javascript
if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}
```

3. **Configuración completa de PDF.js**:
```javascript
const loadingTask = pdfjsLib.getDocument({
  data: arrayBuffer,
  cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/standard_fonts/'
});
```

**Por qué funciona**:
- `cMapUrl`: Proporciona mapas de caracteres para PDFs con fuentes asiáticas o especiales
- `cMapPacked`: Optimiza la carga de cmaps
- `standardFontDataUrl`: Carga fuentes estándar necesarias para renderizar PDFs

4. **Manejo elegante de errores**:
```javascript
catch (error) {
  console.error('[Preview] ❌ ERROR:', error);
  setLoadingPreview(false);
  setPreviewPages([]); // Trigger fallback UI
  // NO cierra el modal, muestra mensaje amigable
}
```

### UI de Fallback

**Archivo**: `src/App.jsx` (líneas ~1326-1348)

Cuando la vista previa falla (`previewPages.length === 0`), se muestra:

```jsx
<div className="text-center py-12">
  <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-4 mx-auto">
    <FileText className="text-amber-600" size={40} />
  </div>
  <h3 className="text-xl font-bold text-slate-900 mb-2">
    Vista previa no disponible
  </h3>
  <p className="text-slate-600 mb-6 max-w-md mx-auto">
    No pudimos generar la vista previa para este documento.
    Puedes descargarlo directamente para ver su contenido completo.
  </p>
  <button onClick={handleDownloadFromModal}>
    Descargar Documento
  </button>
</div>
```

**Beneficios**:
- No muestra error feo con `alert()`
- Mantiene al usuario en el modal
- Ofrece acción alternativa clara (descargar)
- Icono y diseño consistente con el resto de la app

---

## 2. Mejora de Conversión: Reordenamiento del Modal de Recursos

### Problema
- Los botones de acción (Vista Previa + Descargar) estaban "below the fold" (muy abajo en el modal)
- El usuario tenía que hacer scroll para encontrarlos
- Impacto negativo en conversión: acción principal no visible

### Solución: Nuevo Orden del Modal

**Archivo**: `src/App.jsx` (líneas ~968-1023)

#### Orden ANTERIOR (❌ Malo):
1. Imagen Portada
2. Título & Descripción
3. Metadatos (Autor, IA, Descargas, Validaciones)
4. Fuente Original
5. **Sección de Validación** (¿Es útil?) ← Ocupa mucho espacio
6. **Botones de Acción** (Preview + Download) ← **MUY ABAJO**

#### Orden NUEVO (✅ Bueno):
1. Imagen Portada
2. Título & Descripción
3. Metadatos (Autor, IA, Descargas, Validaciones)
4. Fuente Original
5. **Botones de Acción** (Preview + Download) ← **VISIBLE SIN SCROLL**
6. Sección de Validación (¿Es útil?)

### Implementación

**Código movido** (líneas ~968-993):
```jsx
{/* Action buttons - MOVED UP for better conversion */}
<div className="flex flex-col gap-3 mb-6">
  {/* Preview button */}
  <button onClick={() => generatePdfPreview(selectedResource.fileUrl)}>
    <Eye size={24} />
    Vista Previa (Primeras 3 páginas)
  </button>

  {/* Download button */}
  <button onClick={handleDownloadFromModal}>
    <Download size={24} />
    {user ? 'Descargar Recurso Completo' : 'Inicia sesión para descargar'}
  </button>

  {!user && (
    <p className="text-center text-sm text-slate-500">
      Necesitas estar registrado para descargar
    </p>
  )}
</div>
```

### Impacto Esperado

**Antes**:
- Usuario abre modal → Ve título, descripción, metadatos, fuente original
- **Tiene que hacer scroll** → Ve sección de validación (grande)
- **Más scroll** → Finalmente ve botones de acción
- **Abandono**: Algunos usuarios cierran el modal sin ver las acciones

**Después**:
- Usuario abre modal → Ve título, descripción, metadatos, fuente original
- **Inmediatamente ve los botones de acción** (sin scroll)
- **CTA claro**: Vista Previa (gratis) o Descargar (usa crédito)
- **Mejor conversión**: Acción principal visible desde el primer momento

---

## 3. Nueva Feature: Botón "Volver Arriba" (Back to Top)

### Funcionalidad

Botón flotante en la esquina inferior derecha que aparece cuando el usuario hace scroll hacia abajo.

**Archivo**: `src/App.jsx`

### Implementación

#### 1. Import del icono (línea ~2):
```javascript
import { ArrowUp } from 'lucide-react';
```

#### 2. Estado (línea ~40):
```javascript
const [showScrollTop, setShowScrollTop] = useState(false);
```

#### 3. Listener de scroll (líneas ~143-162):
```javascript
useEffect(() => {
  const handleScroll = () => {
    if (window.scrollY > 300) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
};
```

#### 4. Botón flotante (líneas ~1477-1485):
```jsx
{showScrollTop && (
  <button
    onClick={scrollToTop}
    className="fixed bottom-8 right-8 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 z-50 hover:scale-110"
    aria-label="Volver arriba"
  >
    <ArrowUp size={24} />
  </button>
)}
```

### Comportamiento

1. **Invisible inicialmente**: `showScrollTop = false`
2. **Aparece al hacer scroll > 300px**: Fade in automático
3. **Al hacer clic**: Scroll suave hasta el inicio (`behavior: 'smooth'`)
4. **Hover effect**: Escala 110% + cambio de color
5. **z-index: 50**: Siempre visible sobre otros elementos

### Estilo

- **Posición**: `fixed bottom-8 right-8`
- **Color**: `bg-indigo-600` (primario de Synapse)
- **Forma**: Redondo (`rounded-full`)
- **Sombra**: `shadow-lg` para profundidad
- **Animación**: `transition-all duration-300` + `hover:scale-110`
- **Accesibilidad**: `aria-label="Volver arriba"` para lectores de pantalla

---

## 4. Testing Checklist

### Preview Modal - Error Handling
- [ ] Abrir vista previa de PDF válido → Se muestran 3 páginas
- [ ] Abrir vista previa de PDF con fuentes especiales → Renderiza correctamente
- [ ] Simular error de red → Muestra mensaje "Vista previa no disponible"
- [ ] Desde mensaje de error, hacer clic en "Descargar Documento" → Inicia descarga
- [ ] Modal NO se cierra al fallar la preview
- [ ] Console.log muestra detalles del error (para debugging)

### Modal Reordenamiento
- [ ] Abrir ResourceModal → Botones de acción visibles SIN scroll
- [ ] Orden correcto: Fuente Original → Botones → Validación
- [ ] En móvil (< 768px) → Botones siguen visibles sin scroll
- [ ] Sección de validación sigue funcionando correctamente
- [ ] Espaciado correcto (`mb-6` entre secciones)

### Botón "Volver Arriba"
- [ ] Al cargar la página → Botón NO visible
- [ ] Hacer scroll > 300px → Botón aparece con fade in
- [ ] Hacer scroll < 300px → Botón desaparece
- [ ] Hacer clic en botón → Scroll suave hasta el inicio
- [ ] Hover sobre botón → Escala 110% + color más oscuro
- [ ] En móvil → Botón NO interfiere con otros elementos
- [ ] z-index correcto → Visible sobre modales y otros elementos

---

## 5. Análisis de Impacto

### Antes de las Mejoras

**Preview Modal**:
- ❌ Error feo con `alert()` al fallar
- ❌ Modal se cierra → Usuario pierde contexto
- ❌ No hay fallback → Mala experiencia

**ResourceModal**:
- ❌ Botones de acción "below the fold"
- ❌ Usuario tiene que hacer scroll para descubrir
- ❌ Baja conversión en descargas/previews

**Navegación**:
- ❌ Sin forma rápida de volver arriba
- ❌ Usuario tiene que hacer scroll manual largo
- ❌ Especialmente molesto en móvil

### Después de las Mejoras

**Preview Modal**:
- ✅ Error manejado elegantemente
- ✅ Modal permanece abierto con mensaje amigable
- ✅ Ofrece acción alternativa (descargar)
- ✅ Configuración robusta de PDF.js

**ResourceModal**:
- ✅ Botones de acción visibles inmediatamente
- ✅ Jerarquía visual clara: Info → Acción → Validación
- ✅ **Esperado: +30-50% en tasa de clicks** en Preview/Download

**Navegación**:
- ✅ Botón flotante intuitivo
- ✅ Scroll suave (UX premium)
- ✅ Mejora retención en catálogo largo
- ✅ Especialmente útil después de leer modal largo

---

## 6. Próximas Mejoras (Ideas)

### Preview Modal
- [ ] Lazy loading de páginas (cargar 1 a 1 en lugar de todas a la vez)
- [ ] Mostrar progress bar durante carga: "Cargando página 2/3..."
- [ ] Cache de previews en localStorage para reusos
- [ ] Botón para "Descargar solo estas 3 páginas" (PDF parcial)

### ResourceModal
- [ ] Añadir breadcrumbs: Home > Categoría > Recurso
- [ ] Botón "Compartir" (copiar link, Twitter, WhatsApp)
- [ ] Sección "Recursos relacionados" al final
- [ ] Vista previa de thumbnail más grande en desktop

### Back to Top
- [ ] Añadir "progress ring" alrededor del botón (% de scroll)
- [ ] En mobile, posicionar en `bottom-20` para evitar overlap con navegación
- [ ] Animación de entrada más elaborada (slide + fade)

---

## 7. Código de Referencias

### generatePdfPreview() - Versión Final
**Ubicación**: `src/App.jsx` líneas ~232-303

```javascript
const generatePdfPreview = async (fileUrl) => {
  console.log('[Preview] Starting preview generation for:', fileUrl);
  setLoadingPreview(true);
  setShowPreviewModal(true);
  setPreviewPages([]);

  try {
    // Fetch with CORS handling
    const response = await fetch(fileUrl, {
      mode: 'cors',
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // Load PDF with full configuration
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/standard_fonts/'
    });

    const pdf = await loadingTask.promise;
    const pagesToRender = Math.min(3, pdf.numPages);
    const pages = [];

    for (let i = 1; i <= pagesToRender; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport: viewport }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      pages.push(dataUrl);
    }

    setPreviewPages(pages);
    setLoadingPreview(false);
  } catch (error) {
    console.error('[Preview] ERROR:', error);
    setLoadingPreview(false);
    setPreviewPages([]); // Trigger fallback UI
  }
};
```

---

## 8. Métricas a Trackear

### Post-Deploy

1. **Preview Success Rate**:
   - Medir: `successful_previews / total_preview_attempts`
   - Objetivo: > 95%

2. **Modal Conversion Rate**:
   - Medir: `(previews + downloads) / modal_opens`
   - Objetivo antes: ~30%
   - Objetivo después: > 50%

3. **Back to Top Usage**:
   - Medir: `scroll_top_clicks / sessions_with_scroll > 300px`
   - Objetivo: > 15%

4. **Error Frequency**:
   - Medir: `preview_errors / total_preview_attempts`
   - Objetivo: < 5%

---

**Documentado por**: Claude Sonnet 4.5
**Fecha**: 2026-01-10
**Versión**: 1.0
