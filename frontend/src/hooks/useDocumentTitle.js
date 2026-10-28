import { useEffect } from 'react';

export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · DwellGB` : 'DwellGB — Homes for rent in Gilgit-Baltistan';
  }, [title]);
}
