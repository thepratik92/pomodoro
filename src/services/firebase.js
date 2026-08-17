import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, GoogleAuthProvider, signInWithCredential, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

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

// Google refuses OAuth inside embedded WebViews, so the wrapped Android app
// can't use the popup flow. There, the native Google Sign-In SDK collects the
// credential and we hand it to the JS SDK, which is what talks to the database.
export async function signInWithGoogle() {
  if (!Capacitor.isNativePlatform()) return signInWithPopup(auth, googleProvider);
  const { credential } = await FirebaseAuthentication.signInWithGoogle();
  if (!credential?.idToken) throw new Error('Native sign-in returned no ID token');
  return signInWithCredential(auth, GoogleAuthProvider.credential(credential.idToken));
}

export async function signOutEverywhere() {
  // Native session is separate from the JS one; leaving it signed in would let
  // the next sign-in silently reuse the old account.
  if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut();
  return fbSignOut(auth);
}
