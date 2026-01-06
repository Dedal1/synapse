# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Synapse is a web application for sharing AI-generated PDF summaries. Users authenticate with Google, upload PDFs to share, and download resources created by others.

**Stack:** React + Vite + TailwindCSS + Firebase (Auth, Firestore, Storage)

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Firebase Architecture

### Configuration
- Firebase config lives in `src/firebase.js`
- Exports: `auth`, `db` (Firestore), `storage`, and helper functions
- Helper functions: `loginWithGoogle()`, `logout()`, `uploadPDF()`, `getPDFs()`, `rateResource()`, `incrementDownloads()`, `checkDuplicateTitle()`, `deleteResource()`

### Data Model
Firestore collection: `resources`
```
{
  title: string,
  author: string,
  downloads: number,
  aiModel: string,
  fileUrl: string,
  uploadedAt: timestamp,
  userId: string,
  userPhoto: string,
  ratings: [{ userId: string, rating: number }],
  averageRating: number,
  totalRatings: number
}
```

## Key Application Flows

### Authentication
- Google OAuth is the only login method
- User state determines navbar content (login button vs avatar + upload button)
- User info stored in Firebase Auth
- **CRITICAL**: Only authenticated users can download PDFs and rate resources

### PDF Upload
1. User clicks "Subir PDF" button (only visible when authenticated)
2. Modal opens with two upload methods:
   - **Click to select**: Traditional file picker
   - **Drag & Drop**: Drag PDF from desktop and drop in dashed area
3. File uploads to Firebase Storage
4. Metadata saved to Firestore `resources` collection with initial rating data
5. Grid automatically updates with new resource

#### Drag & Drop Behavior
- `onDragOver`: Border changes to solid indigo-500, background becomes indigo-50
- `onDragLeave`: Reverts to dashed slate-300 border
- `onDrop`: Validates PDF type, processes upload
- Visual feedback: Text changes to "¡Suelta el archivo aquí!" during drag
- Only accepts PDF files (validated before upload)

#### Duplicate Prevention
- Before uploading, `checkDuplicateTitle()` queries Firestore for existing resources with same title
- If duplicate found: Shows alert "Este archivo ya ha sido subido anteriormente" and stops upload
- If no duplicate: Proceeds with normal upload flow
- Uses Firestore `where` query on `title` field

### Resource Deletion
- **Delete Button**: Red trash icon in top-right of resource cards
- **Visibility**: Only shown to resource owner (checks `user.uid === resource.userId`)
- **Confirmation**: Shows native confirm dialog before deletion
- **Process**:
  1. User confirms deletion
  2. `deleteResource()` removes Firestore document
  3. `deleteResource()` removes file from Firebase Storage
  4. Grid refreshes automatically
- **Security**: Only owner can see and execute delete button

### Resource Display & Rating System
- Main grid fetches real-time data from Firestore
- Resources sorted by average rating (highest first), then by upload date
- Each card shows: title, author, downloads, AI model, star rating
- **Star Rating System**:
  - Users can rate 1-5 stars (must be logged in)
  - Yellow stars = user's rating
  - Light yellow stars = average community rating
  - Shows average rating with total count (e.g., "4.3 (12)")
  - Users can update their rating by clicking again
- Cards are clickable to download (authentication required)

### Resource Detail Modal & Download Flow
- **Card Click**: Clicking any resource card opens a detail modal (not direct download)
- **Modal Content**:
  - Large file icon with indigo background
  - Resource title (h2, centered, 3xl)
  - Grid of metadata: Author, AI Model, Downloads, Star Rating
  - Large CTA button for download
- **Download Button Logic**:
  - Logged in users: "Descargar Recurso" → downloads PDF and increments counter
  - Non-logged users: "Inicia sesión para descargar" → triggers Google login
  - Button automatically triggers login flow if user not authenticated
- **Security**: Download only executes after successful authentication
- **UX**: Modal closes automatically after successful download

## Design System

The app uses a consistent visual language:
- Primary color: Indigo 600 (`bg-indigo-600`, `text-indigo-600`)
- Backgrounds: Slate 50 for page, white for cards
- Borders: Slate 200
- Rounded corners: `rounded-2xl` for cards, `rounded-full` for buttons
- Icons: Lucide React (Zap for logo, FileText for resources, Upload, Download, etc.)
- Navbar: Sticky with backdrop blur (`backdrop-blur-md`)

## Important Notes

- **Security**: Authentication is required for downloads and ratings - never bypass these checks
- All PDF files are stored in Firebase Storage, only metadata goes to Firestore
- Search functionality filters by title and author in real-time
- Download counts increment in Firestore only when authenticated users download
- Rating system uses arrays in Firestore to track individual user ratings
- Resources are community-curated through the star rating system
