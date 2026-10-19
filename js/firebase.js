import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, addDoc, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, serverTimestamp, Timestamp, writeBatch, runTransaction } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
const firebaseConfig = {
  apiKey: "AIzaSyC09Q_hII-PzgpgkRKVJAUvKniTP0n_0yo",
  authDomain: "atlascrm-c5722.firebaseapp.com",
  projectId: "atlascrm-c5722",
  storageBucket: "atlascrm-c5722.firebasestorage.app",
  messagingSenderId: "97996743679",
  appId: "1:97996743679:web:7deb9e263f519829e8fdca",
  measurementId: "G-DM2FYH1QM7"
};
export const configured=!firebaseConfig.apiKey.startsWith('YOUR_');
let app,auth,db;if(configured){app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app)}
export {auth,db,onAuthStateChanged,signInWithEmailAndPassword,signOut,collection,addDoc,doc,getDoc,getDocs,setDoc,updateDoc,deleteDoc,query,where,orderBy,limit,serverTimestamp,Timestamp,writeBatch,runTransaction};
export {GoogleAuthProvider,signInWithPopup};
