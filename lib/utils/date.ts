export function formatDistanceToNow(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}mo ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ago`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatLastSeen(lastSeenString: string | null): {
  text: string;
  isOnline: boolean;
} | null {
  if (!lastSeenString) {
    return null;
  }

  const lastSeen = new Date(lastSeenString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - lastSeen.getTime()) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);

  // Online if within 5 minutes
  if (diffInMinutes < 5) {
    return { text: "Online", isOnline: true };
  }

  // Otherwise show relative time
  return { text: formatDistanceToNow(lastSeenString), isOnline: false };
}
