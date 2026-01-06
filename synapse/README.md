# Synapse

**Repositorio de PDFs generados por IA**

Una aplicación web para compartir y descargar resúmenes PDF creados con herramientas de IA como NotebookLM.

## Stack Tecnológico

- **React** + **Vite** - Framework y build tool
- **TailwindCSS** - Estilos y diseño
- **Firebase** - Backend completo
  - Authentication (Google OAuth)
  - Firestore (Base de datos)
  - Storage (Almacenamiento de PDFs)

## Instalación y Configuración

1. **Instalar dependencias:**
```bash
npm install
```

2. **Configurar Firebase:**
   - Las credenciales ya están configuradas en `src/firebase.js`
   - Asegúrate de habilitar Google Auth en Firebase Console
   - Habilita Firestore Database
   - Habilita Firebase Storage

3. **Iniciar servidor de desarrollo:**
```bash
npm run dev
```

4. **Construir para producción:**
```bash
npm run build
```

## Estructura del Proyecto

```
src/
├── App.jsx          # Componente principal con toda la UI
├── firebase.js      # Configuración y funciones de Firebase
├── index.css        # Estilos de Tailwind
└── main.jsx         # Punto de entrada
```

## Características

- Login con Google
- Subir PDFs (solo usuarios autenticados)
- Descargar PDFs de otros usuarios
- Búsqueda en tiempo real
- Contador de descargas
- UI moderna con Tailwind

## Firebase Collections

**resources:**
- `title` - Nombre del PDF
- `author` - Nombre del usuario que subió
- `downloads` - Número de descargas
- `aiModel` - Modelo de IA usado (ej: "NotebookLM")
- `fileUrl` - URL del archivo en Storage
- `uploadedAt` - Timestamp de subida
- `userId` - ID del usuario
- `userPhoto` - Foto de perfil del usuario

## Licencia

MIT
