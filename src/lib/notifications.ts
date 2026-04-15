export async function triggerNotification(params: {
  userId?: string;
  role?: string;
  title: string;
  body: string;
  data?: any;
}) {
  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await response.json();
  } catch (error) {
    console.error('Error triggering notification:', error);
    return { success: false, error };
  }
}
