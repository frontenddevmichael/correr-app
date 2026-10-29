import React from 'react';

import { LegalDocumentScreen } from '@/features/legal/LegalDocumentScreen';
import { PRIVACY_DOCUMENT } from '@/features/legal/content';

export default function PrivacyScreen() {
  return <LegalDocumentScreen document={PRIVACY_DOCUMENT} />;
}
