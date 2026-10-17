import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { MessageRepository } from './repository.mjs';
import { firebaseAuthenticator } from './auth.mjs';

export function firestoreRepository(config) {
  const app = initializeApp({ credential: applicationDefault(), projectId: config.projectId });
  const db = getFirestore(app);
  const repository = new MessageRepository({
    now: () => FieldValue.serverTimestamp(),
    transaction: callback => db.runTransaction(transaction => callback({
      get: async (collection, id) => {
        const doc = await transaction.get(db.collection(collection).doc(id));
        return doc.exists ? doc.data() : null;
      },
      findCustomer: async phone => {
        if (!phone) return null;
        const result = await transaction.get(db.collection('customers').where('normalizedPhone', '==', phone).limit(1));
        const doc = result.docs[0];
        return doc ? { ...doc.data(), id: doc.id } : null;
      },
      set: (collection, id, data) => transaction.set(db.collection(collection).doc(id), data),
    })),
  });
  repository.authenticate = firebaseAuthenticator(getAuth(app), config.allowedUserUids || []);
  return repository;
}
