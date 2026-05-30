import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as net from 'net';

const IMAP_HOST   = '10.34.1.6';
const IMAP_PORT   = 143;
const MASTER_USER = 'svc-sogo';
const MASTER_PASS = 'Sandiaman2026';

function imapFetch(username: string): Promise<{unseen:number, total:number, messages:any[]}> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let buffer = '';
    let step = 0;
    const login = `${username}*${MASTER_USER}`;

    client.setTimeout(8000);
    client.connect(IMAP_PORT, IMAP_HOST, () => {});

    client.on('data', (data) => {
      buffer += data.toString();

      if (step === 0 && buffer.includes('ready')) {
        step = 1;
        client.write(`A1 LOGIN ${login} ${MASTER_PASS}\r\n`);
        buffer = '';
      } else if (step === 1 && buffer.includes('A1 OK')) {
        step = 2;
        client.write(`A2 SELECT INBOX\r\n`);
        buffer = '';
      } else if (step === 2 && buffer.includes('A2 OK')) {
        step = 3;
        // Ambil status dulu
        const existMatch = buffer.match(/(\d+) EXISTS/);
        const unseenMatch = buffer.match(/\[UNSEEN (\d+)\]/);
        const total = existMatch ? parseInt(existMatch[1]) : 0;
        const unseen = unseenMatch ? parseInt(unseenMatch[1]) : 0;
        
        if (total === 0) {
          client.write(`A4 LOGOUT\r\n`);
          resolve({ unseen, total, messages: [] });
          return;
        }
        
        // Fetch 5 email terakhir
        const start = Math.max(1, total - 4);
        client.write(`A3 FETCH ${start}:${total} (FLAGS ENVELOPE)\r\n`);
        buffer = '';
      } else if (step === 3 && buffer.includes('A3 OK')) {
        step = 4;
        // Parse ENVELOPE responses
        const messages: any[] = [];
        const fetchRegex = /\* \d+ FETCH \(FLAGS \(([^)]*)\) ENVELOPE \("([^"]*)" "([^"]*)" \(\("([^"]*)"[^)]*\)\)/g;
        let match;
        while ((match = fetchRegex.exec(buffer)) !== null) {
          const flags   = match[1];
          const date    = match[2];
          const subject = match[3];
          const from    = match[4];
          const unread  = !flags.includes('\\Seen');
          
          // Format tanggal jadi jam saja
          let time = '';
          try {
            const d = new Date(date);
            time = d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
          } catch { time = ''; }

          messages.push({ from, subj: subject, time, unread });
        }
        
        // Reverse biar terbaru di atas
        messages.reverse();
        
        // Hitung unseen dari messages
        const unseen = messages.filter(m => m.unread).length;
        const total  = messages.length;
        
        client.write(`A4 LOGOUT\r\n`);
        client.destroy();
        resolve({ unseen, total, messages });
      }
    });

    client.on('timeout', () => { client.destroy(); reject(new Error('timeout')); });
    client.on('error', (e) => reject(e));
  });
}

function requireAuth(cookies: { get: (k: string) => string | undefined }): boolean {
  const token = cookies.get('opsid_token');
  if (!token) return false;
  try {
    const p = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString());
    return !!(p?.preferred_username && (p.exp ?? 0) > Math.floor(Date.now() / 1000));
  } catch { return false; }
}

export const GET: RequestHandler = async ({ url, cookies }) => {
  if (!requireAuth(cookies)) return json({ unseen:0, total:0, ok:false, messages:[], error:'Unauthorized' }, { status: 401 });
  const username = url.searchParams.get('user') || '';
  if (!username) return json({ unseen:0, total:0, ok:false, messages:[], error:'user required' });

  try {
    const result = await imapFetch(username);
    return json({ ...result, ok: true });
  } catch (e) {
    return json({ unseen:0, total:0, ok:false, messages:[], error: String(e) });
  }
};
