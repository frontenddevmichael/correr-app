import React from 'react';

import { LegalDocumentScreen } from '@/features/legal/LegalDocumentScreen';
import { TERMS_DOCUMENT } from '@/features/legal/content';

export default function TermsScreen() {
  return <LegalDocumentScreen document={TERMS_DOCUMENT} />;
}
