#!/usr/bin/env node
// PreToolUse guard — client tarafına Gemini API anahtarı sızmasını önler.
// Kod incelemesinde bulunan güvenlik açığını "regresyona kapatır": biri yeniden
// client kodunda import.meta.env.VITE_GEMINI_API_KEY kullanmaya ya da vite.config
// define bloğuna anahtar gömmeye kalkarsa edit reddedilir ve serverless proxy
// desenine yönlendirilir.
//
// FAIL-OPEN: stdin okunamazsa / JSON bozuksa / beklenmedik bir durum olursa
// İZİN verir. Bu hook asla meşru bir düzenlemeyi yanlışlıkla bloklamamalı.
import process from 'node:process';

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    try {
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => (data += chunk));
      process.stdin.on('end', () => resolve(data));
      process.stdin.on('error', () => resolve(data));
    } catch {
      resolve(data);
    }
    // stdin hiç gelmezse kısa süre sonra izinle çık.
    setTimeout(() => resolve(data), 1500);
  });
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

try {
  const raw = await readStdin();
  if (!raw) process.exit(0);

  const payload = JSON.parse(raw);
  const tool = payload.tool_name;
  if (tool !== 'Edit' && tool !== 'Write' && tool !== 'MultiEdit') process.exit(0);

  const input = payload.tool_input || {};
  const filePath = String(input.file_path || '');

  const pieces = [input.content, input.new_string];
  if (Array.isArray(input.edits)) {
    for (const edit of input.edits) pieces.push(edit && edit.new_string);
  }
  const text = pieces.filter(Boolean).join('\n');
  if (!text) process.exit(0);

  const isClientFile =
    /\.(ts|tsx|js|jsx)$/.test(filePath) && !/[\\/](api|server)[\\/]/.test(filePath);

  // 1) Client kodunda Gemini/AI anahtarına doğrudan erişim.
  if (
    isClientFile &&
    /import\.meta\.env\.[A-Z_]*GEMINI[A-Z_]*KEY|import\.meta\.env\.VITE_API_KEY/.test(text)
  ) {
    deny(
      "Gemini API anahtarı client kodunda okunamaz — yayınlanan bundle'a sızar. " +
        'Bunun yerine api/gemini.ts serverless proxy üzerinden (process.env.GEMINI_API_KEY) çağır.',
    );
  }

  // 2) vite.config define bloğuyla anahtar enjeksiyonu.
  if (/vite\.config\.(ts|js)$/.test(filePath) && /define\s*:\s*\{[\s\S]*GEMINI_API_KEY/.test(text)) {
    deny(
      "vite.config define bloğu anahtarı bundle'a gömer. Anahtarı yalnızca serverless " +
        'tarafında (process.env) kullan.',
    );
  }

  process.exit(0);
} catch {
  // Fail-open — herhangi bir hatada izin ver.
  process.exit(0);
}
