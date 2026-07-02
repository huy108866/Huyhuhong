import { initializeApp } from 'firebase/app'
import type { FirebaseApp } from 'firebase/app'

let app: FirebaseApp | null = null
let analytics: any = undefined

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

try {
  app = initializeApp(firebaseConfig)
  if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
    // lazy import analytics to avoid SSR issues
    import('firebase/analytics').then(({ getAnalytics }) => {
      analytics = getAnalytics(app!)
    }).catch(() => {
      // analytics optional
    })
  }
} catch (e) {
  // initialization errors are non-fatal for the app
  console.warn('Firebase init error', e)
}

export { app, analytics }
