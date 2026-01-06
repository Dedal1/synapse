# Configuración de Firebase

## Pasos para configurar Firebase Console

### 1. Authentication (Google Sign-In)

1. Ve a Firebase Console: https://console.firebase.google.com
2. Selecciona tu proyecto: `synapse-app-c07c0`
3. En el menú lateral, ve a **Authentication**
4. Click en **Get Started** (si es la primera vez)
5. En la pestaña **Sign-in method**, haz click en **Google**
6. Activa el toggle **Enable**
7. Selecciona un email de soporte del proyecto
8. Click en **Save**

### 2. Firestore Database

1. En el menú lateral, ve a **Firestore Database**
2. Click en **Create database**
3. Selecciona **Start in production mode** (o test mode si prefieres)
4. Selecciona una ubicación (ej: `us-central`)
5. Click en **Enable**

#### Reglas de Seguridad (Opcional pero Recomendado)

Para permitir que cualquier usuario autenticado pueda leer y escribir:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /resources/{document=**} {
      // Permitir lectura a todos
      allow read: if true;
      // Permitir escritura solo a usuarios autenticados
      allow create: if request.auth != null;
      // Permitir actualización solo de downloads
      allow update: if request.auth != null;
    }
  }
}
```

### 3. Firebase Storage

1. En el menú lateral, ve a **Storage**
2. Click en **Get started**
3. Acepta las reglas de seguridad predeterminadas
4. Selecciona la misma ubicación que Firestore
5. Click en **Done**

#### Reglas de Seguridad para Storage

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /pdfs/{allPaths=**} {
      // Permitir lectura a todos
      allow read: if true;
      // Permitir escritura solo a usuarios autenticados
      // Y solo archivos PDF menores a 10MB
      allow write: if request.auth != null
                   && request.resource.contentType == 'application/pdf'
                   && request.resource.size < 10 * 1024 * 1024;
    }
  }
}
```

## Verificar Configuración

Una vez completados estos pasos, tu app debería:
- ✅ Permitir login con Google
- ✅ Guardar PDFs en Storage
- ✅ Guardar metadata en Firestore
- ✅ Mostrar PDFs subidos por otros usuarios
- ✅ Incrementar contador de descargas

## Troubleshooting

### Error: "Firebase: Error (auth/unauthorized-domain)"
- Ve a Authentication > Settings > Authorized domains
- Añade `localhost` si estás desarrollando localmente

### Error al subir PDF
- Verifica que Storage esté habilitado
- Verifica las reglas de seguridad de Storage
- Verifica que el archivo sea un PDF válido

### No se muestran los PDFs
- Verifica que Firestore esté habilitado
- Verifica las reglas de seguridad de Firestore
- Abre la consola del navegador para ver errores
