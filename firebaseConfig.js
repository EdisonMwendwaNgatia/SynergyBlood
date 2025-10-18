// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCv_9O2ZhC9jW2C9L-2vNhOjoMbTQdGi5Y",
  authDomain: "student-fee-admission-system.firebaseapp.com",
  databaseURL: "https://student-fee-admission-system-default-rtdb.firebaseio.com",
  projectId: "student-fee-admission-system",
  storageBucket: "student-fee-admission-system.firebasestorage.app",
  messagingSenderId: "1009657295375",
  appId: "1:1009657295375:web:6b1b5edd8016e72b52e97a",
  measurementId: "G-3HGMMN3PL8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence - Singleton pattern
let auth;
try {
  // Try to get existing auth instance first
  auth = getAuth(app);
} catch (error) {
  // If it fails, initialize a new one
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

export { auth };
export const db = getDatabase(app);