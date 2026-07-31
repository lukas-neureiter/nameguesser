import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyARQi2uyddhG6aD7KtR5pE2rwWsR0lII_0',
  authDomain: 'nameguesser-atos.firebaseapp.com',
  projectId: 'nameguesser-atos',
  appId: '1:8000532360:web:9f02d5b7071204263ad43d',
  messagingSenderId: '8000532360',
}

export const firebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)
