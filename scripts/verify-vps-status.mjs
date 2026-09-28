async function main() {
  try {
    const res = await fetch('http://187.7.16.210:3000/api/config');
    const data = await res.json();
    console.log('[VERIFY VPS] Status:', res.status, 'Data:', data);
  } catch (err) {
    console.error('[VERIFY VPS] Erro:', err);
  }
}
main();
