import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBFCOJs1hMSrXbpfZ0bNY8QCEft6Fu63o0',
  authDomain: 'pomodoro-app-46785.firebaseapp.com',
  databaseURL: 'https://pomodoro-app-46785-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'pomodoro-app-46785',
  storageBucket: 'pomodoro-app-46785.firebasestorage.app',
  messagingSenderId: '1002103673667',
  appId: '1:1002103673667:web:a15f288f9321a0adaf95f6',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
