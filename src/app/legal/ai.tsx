import React from 'react';

import { LegalDocumentScreen } from '@/features/legal/LegalDocumentScreen';
import { AI_DOCUMENT } from '@/features/legal/content';

export default function AiDisclosureScreen() {
  return <LegalDocumentScreen document={AI_DOCUMENT} />;
}
