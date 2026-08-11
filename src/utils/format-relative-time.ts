import t from '~/i18n';

export default function formatRelativeTime(timestamp: number): string {
	const now = Date.now(),
		diffMs = now - timestamp,
		diffSeconds = Math.floor(diffMs / 1000),
		diffMinutes = Math.floor(diffSeconds / 60),
		diffHours = Math.floor(diffMinutes / 60),
		diffDays = Math.floor(diffHours / 24);

	if (diffSeconds < 60) return t('time.justNow');
	else if (diffMinutes < 60) return t('time.minutesAgo', { count: diffMinutes });
	else if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
	else if (diffDays < 30) return t('time.daysAgo', { count: diffDays });
	else return t('time.longAgo');
}
