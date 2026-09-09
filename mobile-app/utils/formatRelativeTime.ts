// "il y a X min" instead of a raw ISO string — no date library, this app
// keeps zero non-Expo dependencies beyond what's already installed.
// Shared between the dashboard and the backups screen so both read the
// same relative-time wording.
export function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return 'Jamais';
  const date = new Date(dateString);
  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSeconds < 0) return 'À l\'instant';
  if (diffSeconds < 60) return 'À l\'instant';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `il y a ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `il y a ${diffDays} j`;
  return date.toLocaleDateString('fr-FR');
}
