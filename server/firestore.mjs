import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, FieldPath, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { MessageRepository } from './repository.mjs';
import { firebaseAuthenticator } from './auth.mjs';
import { publicAlert } from './lead-alerts.mjs';

export function firestoreRepository(config) {
  const app = initializeApp({ credential: applicationDefault(), projectId: config.projectId });
  const db = getFirestore(app);
  const repository = new MessageRepository({
    now: () => FieldValue.serverTimestamp(),
    timestamp: date => Timestamp.fromDate(date),
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
  repository.listLeadAlerts = async cursor => {
    let query = db.collection('whatsappLeadAlerts').orderBy('createdAt').orderBy(FieldPath.documentId()).limit(51);
    if (cursor) {
      const doc = await db.collection('whatsappLeadAlerts').doc(cursor).get();
      if (!doc.exists) throw Error('cursor_unavailable');
      query = query.startAfter(doc);
    }
    const result = await query.get();
    const docs = result.docs.slice(0, 50);
    return { version: 1, items: docs.map(doc => publicAlert(doc.id, doc.data())),
      cursor: docs.at(-1)?.id || cursor || '', hasMore: result.docs.length > 50 };
  };
  return repository;
}
