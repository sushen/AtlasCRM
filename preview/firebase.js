export const configured=false,auth={currentUser:null},db=null;
const unavailable=()=>{throw Error('Sign-in and live data are disabled in this isolated preview.');};
export const onAuthStateChanged=(_auth,callback)=>callback(null);
export class GoogleAuthProvider {setCustomParameters(){}}
export {unavailable as signInWithEmailAndPassword,unavailable as signInWithPopup,unavailable as signOut,
  unavailable as collection,unavailable as addDoc,unavailable as doc,unavailable as getDoc,unavailable as getDocs,
  unavailable as setDoc,unavailable as updateDoc,unavailable as deleteDoc,unavailable as query,unavailable as where,
  unavailable as orderBy,unavailable as limit,unavailable as serverTimestamp,unavailable as Timestamp,
  unavailable as writeBatch,unavailable as runTransaction};
