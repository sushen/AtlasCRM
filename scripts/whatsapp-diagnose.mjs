import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { normalizePhone } from '../js/utils/phone.js';
import { prepareLocalFirebase } from '../server/local-firebase.mjs';
import { IntegrationError } from '../server/config.mjs';

const knownFailureCodes = new Set(['meta_api_error', 'meta_network_error', 'meta_timeout',
  'invalid_meta_response', 'internal_error']);

export function summarizeAttempt(attempt, verifiedRecipient) {
  if (!attempt) return { found: false };
  const failure = attempt.failure || {};
  const state = ['pending', 'accepted', 'failed_or_unknown'].includes(attempt.state) ? attempt.state : 'unknown';
  const code = knownFailureCodes.has(failure.code) ? failure.code : 'unknown';
  const metaCode = Number.isInteger(failure.metaCode) ? failure.metaCode : null;
  const metaSubcode = Number.isInteger(failure.metaSubcode) ? failure.metaSubcode : null;
  const httpStatus = Number.isInteger(failure.httpStatus) ? failure.httpStatus : null;
  const outcome = state === 'accepted' ? 'accepted'
    : code === 'meta_api_error' ? 'definite_meta_rejection' : 'uncertain_or_not_sent';
  const normalized = normalizePhone(verifiedRecipient);
  return { found: true, state, failureCode: code, metaCode, metaSubcode, httpStatus, outcome,
    verifiedRecipientMatches: normalized ? normalized === attempt.recipient : null };
}

export function classifyDiagnosticFailure(error, stage) {
  if (error instanceof IntegrationError && ['firebase_cli_login_unavailable',
    'firebase_credential_initialization_failed'].includes(error.code)) return { reason: error.code };
  if (stage === 'firebase_initialization') return { reason: 'firebase_credential_initialization_failed' };
  if (stage !== 'firestore_query') return { reason: 'firebase_credential_initialization_failed' };
  const status = Number.isInteger(error?.code) && error.code >= 0 && error.code <= 16 ? error.code : null;
  if (status === 7 || error?.code === 'permission-denied') return { reason: 'firestore_permission_denied', status: 7 };
  if (status === 9 || error?.code === 'failed-precondition') return { reason: 'firestore_failed_precondition', status: 9 };
  return { reason: 'firestore_query_failed', ...(status === null ? {} : { status }) };
}

export async function latestFailedAttempt(db) {
  let query = db.collection('whatsappSendAttempts').orderBy('createdAt', 'desc')
    .select('state', 'failure', 'recipient', 'createdAt').limit(10);
  for (;;) {
    const page = await query.get();
    const failed = page.docs.find(doc => doc.get('state') === 'failed_or_unknown');
    if (failed) return failed.data();
    if (page.size < 10) return null;
    query = query.startAfter(page.docs.at(-1));
  }
}

export async function runDiagnostic({ bootstrap = prepareLocalFirebase, openFirestore = projectId =>
  getFirestore(initializeApp({ credential: applicationDefault(), projectId })),
verifiedRecipient = process.env.ATLAS_VERIFIED_TEST_RECIPIENT } = {}) {
  const projectId = process.env.ATLAS_FIREBASE_PROJECT_ID || 'atlascrm-c5722';
  let stage = 'firebase_bootstrap';
  let cleanup = () => {};
  try {
    cleanup = await bootstrap(projectId);
    stage = 'firebase_initialization';
    const db = openFirestore(projectId);
    stage = 'firestore_query';
    return summarizeAttempt(await latestFailedAttempt(db), verifiedRecipient);
  } catch (error) {
    throw new IntegrationError('diagnostic_failed', classifyDiagnosticFailure(error, stage));
  } finally {
    cleanup();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await runDiagnostic())); }
  catch (error) { console.error(JSON.stringify({ diagnostic: 'unavailable', ...error.details })); process.exitCode = 1; }
}
