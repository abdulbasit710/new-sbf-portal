import net from "node:net";
import tls from "node:tls";

type MailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const env = (key: string) => process.env[key]?.trim() ?? "";

const encodeHeader = (value: string) =>
  /[^\x20-\x7E]/.test(value)
    ? `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`
    : value;

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const readResponse = (socket: net.Socket | tls.TLSSocket) =>
  new Promise<string>((resolve, reject) => {
    let buffer = "";
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("SMTP server response timed out."));
    }, 15000);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off("data", onData);
      socket.off("error", onError);
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines.at(-1);
      if (last && /^\d{3} /.test(last)) {
        cleanup();
        resolve(buffer);
      }
    };

    socket.on("data", onData);
    socket.on("error", onError);
  });

const command = async (
  socket: net.Socket | tls.TLSSocket,
  line: string,
  expected: number[] = [],
) => {
  socket.write(`${line}\r\n`);
  const response = await readResponse(socket);
  const code = Number(response.slice(0, 3));
  if (expected.length && !expected.includes(code)) {
    throw new Error(`SMTP command failed (${line}): ${response.trim()}`);
  }
  return response;
};

const connectPlain = (host: string, port: number) =>
  new Promise<net.Socket>((resolve, reject) => {
    const socket = net.connect(port, host, () => resolve(socket));
    socket.once("error", reject);
  });

const connectTls = (host: string, port: number) =>
  new Promise<tls.TLSSocket>((resolve, reject) => {
    const socket = tls.connect(port, host, { servername: host }, () => resolve(socket));
    socket.once("error", reject);
  });

const startTls = (socket: net.Socket, host: string) =>
  new Promise<tls.TLSSocket>((resolve, reject) => {
    const secure = tls.connect({ socket, servername: host }, () => resolve(secure));
    secure.once("error", reject);
  });

export const hasMailConfig = () =>
  Boolean(
    env("SMTP_HOST") &&
      env("SMTP_PORT") &&
      env("SMTP_USER") &&
      env("SMTP_PASSWORD") &&
      env("EMAIL_FROM"),
  );

export async function sendMail({ to, subject, text, html }: MailInput) {
  const host = env("SMTP_HOST");
  const port = Number(env("SMTP_PORT") || 587);
  const user = env("SMTP_USER");
  const password = env("SMTP_PASSWORD");
  const from = env("EMAIL_FROM");

  if (!hasMailConfig()) {
    throw new Error("SMTP email is not configured.");
  }

  let socket: net.Socket | tls.TLSSocket = port === 465 ? await connectTls(host, port) : await connectPlain(host, port);
  await readResponse(socket);
  await command(socket, `EHLO sbf.world`, [250]);

  if (port !== 465) {
    await command(socket, "STARTTLS", [220]);
    socket = await startTls(socket as net.Socket, host);
    await command(socket, `EHLO sbf.world`, [250]);
  }

  await command(socket, "AUTH LOGIN", [334]);
  await command(socket, Buffer.from(user).toString("base64"), [334]);
  await command(socket, Buffer.from(password).toString("base64"), [235]);

  const fromAddress = from.match(/<([^>]+)>/)?.[1] ?? from;
  const htmlBody = html ?? `<p>${escapeHtml(text).replaceAll("\n", "<br />")}</p>`;
  const boundary = `sbf-${Date.now().toString(36)}`;
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    htmlBody,
    "",
    `--${boundary}--`,
    "",
  ]
    .join("\r\n")
    .replace(/^\./gm, "..");

  await command(socket, `MAIL FROM:<${fromAddress}>`, [250]);
  await command(socket, `RCPT TO:<${to}>`, [250, 251]);
  await command(socket, "DATA", [354]);
  await command(socket, `${message}\r\n.`, [250]);
  await command(socket, "QUIT", [221]);
  socket.end();
}
