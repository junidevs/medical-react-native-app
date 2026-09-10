import { Controller, Get, Headers, Query, Req, Res } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { Request, Response } from "express";
import QRCode from "qrcode";

import { PortalService, type PortalData } from "./portal.service.js";

const PAIRING_COOKIE = "medconnect_portal_pair";

@ApiExcludeController()
@Controller("portal")
export class PortalPageController {
  constructor(private readonly portalService: PortalService) {}

  @Get("page")
  async renderPage(
    @Req() req: Request,
    @Res() res: Response,
    @Headers("x-portal-ticket") ticketHeader?: string
  ) {
    // Own trusted content rendered inside the app WebView / browser: drop the strict
    // API headers (CSP upgrade-insecure-requests / HSTS) so the LAN http page loads.
    res.removeHeader("Content-Security-Policy");
    res.removeHeader("Strict-Transport-Security");

    if (ticketHeader) {
      const session = await this.portalService.readTicket(ticketHeader);
      if (!session) {
        res.status(200).type("html").send(renderInvalid());
        return;
      }
      const data = await this.portalService.getPortalData(session.userId);
      res.status(200).type("html").send(renderPortal(session.name, session.email, data));
      return;
    }

    const browserPairing = readPairingCookie(req);
    if (browserPairing) {
      const session = await this.portalService.consumeBrowserPairing(
        browserPairing.pairId,
        browserPairing.browserSecret
      );
      if (session) {
        clearPairingCookie(res);
        const data = await this.portalService.getPortalData(session.userId);
        res.status(200).type("html").send(renderPortal(session.name, session.email, data));
        return;
      }
    }

    // No ticket â†’ start a device-pairing (WhatsApp Web-style) session.
    const browser = {
      userAgent: req.header("user-agent") ?? "Nieznana przegladarka",
      ip: (req.ip ?? req.socket.remoteAddress ?? "nieznane IP").replace("::ffff:", "")
    };
    const pairing = await this.portalService.createPairing(browser);
    writePairingCookie(req, res, pairing.pairId, pairing.browserSecret, pairing.maxAgeSeconds);
    // Triple slash = empty authority, so Expo Router treats "portal-pair" as the
    // path (matching Linking.createURL('/portal-pair')) instead of a hostname.
    const deepLink = `medconnect:///portal-pair?pairId=${pairing.pairId}`;
    const qr = await QRCode.toDataURL(deepLink, {
      width: 260,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" }
    });
    res.status(200).type("html").send(renderPairing(pairing.pairId, qr, deepLink));
  }

  @Get("pair/status")
  async pairStatus(@Req() req: Request, @Query("pairId") pairId?: string) {
    const browserPairing = readPairingCookie(req);
    if (!pairId || !browserPairing || browserPairing.pairId !== pairId) {
      return { status: "expired" as const };
    }

    const record = await this.portalService.getBrowserPairingStatus(
      pairId,
      browserPairing.browserSecret
    );
    if (!record) return { status: "expired" as const };
    return record;
  }

  @Get("pair/info")
  async pairInfo(@Query("pairId") pairId?: string) {
    const record = pairId ? await this.portalService.getPairing(pairId) : null;
    if (!record) return { status: "expired" as const, browser: null, createdAt: null };
    return { status: record.status, browser: record.browser, createdAt: record.createdAt };
  }
}

function readPairingCookie(req: Request): { pairId: string; browserSecret: string } | null {
  const raw = req.header("cookie") ?? "";
  const cookie = raw
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${PAIRING_COOKIE}=`));
  if (!cookie) return null;

  const value = decodeURIComponent(cookie.slice(PAIRING_COOKIE.length + 1));
  const [pairId, browserSecret] = value.split(".");
  if (!pairId || !browserSecret) return null;
  return { pairId, browserSecret };
}

function writePairingCookie(
  req: Request,
  res: Response,
  pairId: string,
  browserSecret: string,
  maxAgeSeconds: number
) {
  const isHttps = req.secure || req.header("x-forwarded-proto") === "https";
  res.cookie(PAIRING_COOKIE, `${pairId}.${browserSecret}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    maxAge: maxAgeSeconds * 1000,
    path: "/portal"
  });
}

function clearPairingCookie(res: Response) {
  res.clearCookie(PAIRING_COOKIE, { path: "/portal", sameSite: "lax" });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("pl-PL", {
      weekday: "short",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function shell(body: string, extraHead = "") {
  return `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Portal Pacjenta MedConnect</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(160deg, #0f766e 0%, #115e59 45%, #f8fafc 45%);
      min-height: 100vh;
      color: #0f172a;
    }
    .wrap { padding: 32px 20px 48px; max-width: 520px; margin: 0 auto; }
    .brand { color: #ecfdf5; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; font-size: 12px; }
    h1 { color: #ecfdf5; margin: 8px 0 24px; font-size: 26px; }
    .card {
      background: #ffffff;
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 24px 48px rgba(15, 118, 110, 0.18);
      margin-bottom: 16px;
    }
    .badge { display: inline-block; background: #ecfdf5; color: #0f766e; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .who { font-size: 20px; font-weight: 800; margin: 12px 0 4px; }
    .muted { color: #64748b; font-size: 14px; }
    .row { display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #e2e8f0; gap: 12px; }
    .row:last-child { border-bottom: none; }
    .row b { color: #0f172a; text-align: right; }
    .foot { color: #475569; font-size: 12px; text-align: center; margin-top: 8px; }
    .qr { display: flex; justify-content: center; padding: 8px 0 16px; }
    .qr img { width: 240px; height: 240px; border-radius: 16px; }
    .steps { margin: 0; padding-left: 18px; color: #334155; font-size: 14px; line-height: 1.8; }
    .pill { display:inline-flex; align-items:center; gap:8px; background:#ecfdf5; color:#0f766e; padding:8px 14px; border-radius:999px; font-weight:700; font-size:13px; }
    .dot { width:8px; height:8px; border-radius:999px; background:#0f766e; animation: pulse 1.2s infinite; }
    @keyframes pulse { 0%,100%{opacity:.35} 50%{opacity:1} }
    .points { font-size: 44px; font-weight: 900; color: #0f766e; line-height: 1; }
    .tier { font-size: 13px; font-weight: 700; color: #ca8a04; }
    .appt { padding: 12px 0; border-bottom: 1px solid #eef2f7; }
    .appt:last-child { border-bottom: none; }
    .appt .doc { font-weight: 700; }
    .appt .meta { color:#64748b; font-size: 13px; margin-top: 2px; }
    .link { color:#0f766e; font-size:12px; word-break: break-all; }
    .record-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:14px; }
    .record { border-radius:18px; padding:14px; background:#f8fafc; border:1px solid #e2e8f0; }
    .record strong { display:block; color:#0f172a; margin-bottom:4px; }
    .bar { height:8px; border-radius:999px; background:#ccfbf1; overflow:hidden; margin-top:10px; }
    .bar span { display:block; height:100%; border-radius:999px; background:#0f766e; }
  </style>
  ${extraHead}
</head>
<body>
  <div class="wrap">${body}</div>
</body>
</html>`;
}

function tierLabel(tier: PortalData["tier"]) {
  if (tier === "GOLD") return "Zloto";
  if (tier === "SILVER") return "Srebro";
  return "Braz";
}

function renderPortal(name: string, email: string, data: PortalData) {
  const safeName = escapeHtml(name || "Pacjencie");
  const safeEmail = escapeHtml(email || "brak adresu e-mail");

  const upcomingHtml =
    data.upcoming.length > 0
      ? data.upcoming
          .map(
            (appointment) => `
      <div class="appt">
        <div class="doc">${escapeHtml(appointment.doctor)}</div>
        <div class="meta">${escapeHtml(appointment.specialty)} Â· ${escapeHtml(appointment.clinic)}</div>
        <div class="meta">${escapeHtml(formatDate(appointment.startTime))} Â· ${escapeHtml(appointment.reason)}</div>
      </div>`
          )
          .join("")
      : `<div class="muted">Brak nadchodzacych wizyt.</div>`;

  return shell(`
    <div class="brand">MedConnect Â· Portal Pacjenta</div>
    <h1>Witaj z powrotem, ${safeName}</h1>
    <div class="card">
      <span class="badge">Sesja zweryfikowana</span>
      <div class="who">${safeName}</div>
      <div class="muted">${safeEmail}</div>
    </div>
    <div class="card">
      <div class="row">
        <div>
          <div class="points">${data.points}</div>
          <div class="muted">punktow lojalnosciowych</div>
        </div>
        <div style="text-align:right">
          <div class="tier">Poziom: ${tierLabel(data.tier)}</div>
          <div class="muted">Odbyte wizyty: ${data.completedVisits}</div>
          <div class="muted">Nadchodzace: ${data.upcomingCount}</div>
        </div>
      </div>
    </div>
    <div class="card">
      <span class="badge">Nadchodzace wizyty</span>
      <div style="margin-top:12px">${upcomingHtml}</div>
    </div>
    <div class="card">
      <span class="badge">Dokumentacja medyczna</span>
      <div class="record-grid">
        <div class="record"><strong>Morfologia</strong><div class="muted">W normie · dziś</div><div class="bar"><span style="width:82%"></span></div></div>
        <div class="record"><strong>e-Recepty</strong><div class="muted">2 aktywne</div><div class="bar"><span style="width:64%"></span></div></div>
        <div class="record"><strong>Skierowania</strong><div class="muted">1 do realizacji</div><div class="bar"><span style="width:44%"></span></div></div>
        <div class="record"><strong>PDF</strong><div class="muted">Pobierz kartę wizyty</div><div class="bar"><span style="width:72%"></span></div></div>
      </div>
    </div>
    <div class="foot">Sesja przekazana bezpiecznie z aplikacji mobilnej za pomoca jednorazowego biletu.</div>
  `);
}

function renderPairing(pairId: string, qrDataUrl: string, deepLink: string) {
  const script = `
    <script>
      const pairId = ${JSON.stringify(pairId)};
      async function poll() {
        try {
          const res = await fetch('/portal/pair/status?pairId=' + encodeURIComponent(pairId));
          const json = await res.json();
          const data = json.data || json;
          if (data.status === 'approved') {
            window.location = '/portal/page';
            return;
          }
          if (data.status === 'denied') {
            document.getElementById('state').innerHTML = '<span class="pill">Odrzucono na telefonie</span>';
            return;
          }
          if (data.status === 'expired') {
            document.getElementById('state').innerHTML = '<span class="pill">Kod wygasl - odswiez strone</span>';
            return;
          }
        } catch (e) {}
        setTimeout(poll, 1500);
      }
      poll();
    </script>`;

  return shell(
    `
    <div class="brand">MedConnect Â· Portal Pacjenta</div>
    <h1>Zaloguj sie telefonem</h1>
    <div class="card">
      <div class="qr"><img src="${qrDataUrl}" alt="Kod QR do logowania" /></div>
      <ol class="steps">
        <li>Otworz aplikacje MedConnect na telefonie.</li>
        <li>Zeskanuj ten kod QR (aparatem lub skanerem w aplikacji).</li>
        <li>Zatwierdz logowanie na telefonie.</li>
      </ol>
      <div id="state" style="margin-top:8px"><span class="pill"><span class="dot"></span> Oczekiwanie na potwierdzenieâ€¦</span></div>
    </div>
    <div class="card">
      <span class="badge">Link parowania</span>
      <div class="muted" style="margin-top:8px">Jesli otwierasz te strone na telefonie, dotknij:</div>
      <div style="margin-top:8px"><a class="link" href="${escapeHtml(deepLink)}">${escapeHtml(deepLink)}</a></div>
    </div>
    <div class="foot">Sesje zatwierdza zalogowana aplikacja - haslo i tokeny nigdy nie trafiaja do przegladarki.</div>
  `,
    script
  );
}

function renderInvalid() {
  return shell(`
    <div class="brand">MedConnect Â· Portal Pacjenta</div>
    <h1>Sesja wygasla</h1>
    <div class="card">
      <span class="badge">Bilet nieaktywny</span>
      <div class="who">Nie udalo sie zweryfikowac sesji</div>
      <div class="muted">Wroc do aplikacji i otworz portal ponownie, aby wygenerowac nowy bilet.</div>
    </div>
  `);
}






