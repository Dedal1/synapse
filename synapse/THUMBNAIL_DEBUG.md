# 🔧 Thumbnail Generation - Debug Guide

## ✅ Cambios Aplicados

### 1. **Worker Configuration Fixed**
- ❌ Antes: CDN remoto (incompatibilidad de versiones)
  ```js
  workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`
  ```
- ✅ Ahora: Worker local copiado a `/public/`
  ```js
  workerSrc = '/pdf.worker.min.mjs'
  ```
- **Archivo**: `synapse/public/pdf.worker.min.mjs` (1.0MB)

### 2. **Comprehensive Logging Added**
Logs detallados en cada paso de la generación:
- `[PDF.js]` - Configuración inicial del worker
- `[Thumbnail]` - 7 pasos con logging exhaustivo
  - Step 1: Reading ArrayBuffer
  - Step 2: Loading PDF document
  - Step 3: Getting first page
  - Step 4: Creating viewport
  - Step 5: Creating canvas
  - Step 6: Rendering page
  - Step 7: Converting to blob

### 3. **Error Handling Enhanced**
- Logs de error detallados (name, message, stack)
- Alert visible para el usuario si falla
- Fallback graceful al icono por defecto

## 🧪 Cómo Probar en LOCAL

### Paso 1: Iniciar Dev Server
```bash
cd synapse
npm run dev
```

### Paso 2: Abrir DevTools
1. Abrir Chrome/Firefox DevTools (F12)
2. Ir a la pestaña **Console**
3. Filtrar por `[PDF.js]` o `[Thumbnail]`

### Paso 3: Subir PDF de Prueba
1. Hacer login con Google
2. Clic en "Subir PDF"
3. Seleccionar cualquier PDF

### ✅ Output Esperado (ÉXITO)
```
[PDF.js] Version: 5.4.530
[PDF.js] Worker configured: /pdf.worker.min.mjs
[Thumbnail] Starting generation for file: ejemplo.pdf
[Thumbnail] Step 1: Reading file as ArrayBuffer...
[Thumbnail] ArrayBuffer size: 245832 bytes
[Thumbnail] Step 2: Loading PDF document...
[Thumbnail] PDF loaded successfully. Pages: 3
[Thumbnail] Step 3: Getting first page...
[Thumbnail] Page retrieved successfully
[Thumbnail] Step 4: Creating viewport...
[Thumbnail] Viewport dimensions: 1275 x 1650
[Thumbnail] Step 5: Creating canvas...
[Thumbnail] Canvas created: 1275 x 1650
[Thumbnail] Step 6: Rendering page to canvas...
[Thumbnail] Page rendered successfully
[Thumbnail] Step 7: Converting canvas to blob...
[Thumbnail] Blob created. Size: 123456 bytes
[Thumbnail] Preview URL created: blob:http://localhost:5173/abc123...
[Thumbnail] ✅ Generation completed successfully
```

### ❌ Output Si Falla
```
[Thumbnail] ❌ ERROR during generation: Error: ...
[Thumbnail] Error details: { name: "...", message: "...", stack: "..." }
```
+ Alert visible: "No se pudo generar la vista previa del PDF..."

## 🐛 Debugging Checklist

Si la generación FALLA, revisar:

1. **Worker File**
   ```bash
   ls -lh synapse/public/pdf.worker.min.mjs
   # Debe mostrar: -rw-r--r--  1.0M pdf.worker.min.mjs
   ```

2. **Browser Console**
   - Buscar errores relacionados con "worker"
   - Buscar 404 en `/pdf.worker.min.mjs`

3. **PDF Validity**
   - Probar con PDF simple (no encriptado)
   - Verificar que el archivo sea realmente PDF

4. **Network Tab**
   - Verificar que `/pdf.worker.min.mjs` se carga correctamente (200 OK)
   - Verificar Content-Type: `application/javascript` o `text/javascript`

## 📊 Expected Behavior

### En Upload Form:
1. Mensaje: "Generando vista previa..." (mientras procesa)
2. Miniatura visible (h-48, object-cover) con borde indigo
3. Información del archivo (nombre, tamaño)

### En Resource Card:
- Si tiene thumbnail: Cover image completa (h-48)
- Si NO tiene thumbnail: Gradient + icono (fallback)

### En Resource Modal:
- Si tiene thumbnail: Cover image grande (h-64)
- Si NO tiene thumbnail: Gradient + icono grande

## 🚀 Next Steps

1. **Probar**: `npm run dev` y subir un PDF
2. **Revisar Console**: Verificar logs `[Thumbnail]`
3. **Reportar**: Compartir logs completos si falla
4. **Si funciona**: Avisar para hacer build + commit (sin push)

## ⚠️ IMPORTANTE

**NO se ha hecho `git push`** - Los cambios están SOLO en local.
Esperando testing antes de desplegar a producción.
