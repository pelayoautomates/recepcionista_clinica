import { adminFetch } from "@/lib/api";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WidgetPage({ params }: { params: Promise<{ clinicId: string }> }) {
  const { clinicId } = await params;

  let clinica: any = null;
  try {
    const res = await adminFetch(`/admin/clinicas/${clinicId}`);
    if (res.ok) clinica = await res.json();
  } catch {}

  if (!clinica) return notFound();

  const waNumber = clinica.whatsapp_number || null;
  const phone = clinica.telefono_ia || clinica.telefono || null;
  const name = clinica.nombre || "Recepcionista IA";

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{name}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .card {
            background: white;
            border-radius: 16px;
            padding: 28px 24px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.12);
            max-width: 340px;
            width: 100%;
            text-align: center;
          }
          .avatar {
            width: 56px; height: 56px;
            background: linear-gradient(135deg, #2563eb, #4f46e5);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 14px;
          }
          h2 { font-size: 17px; font-weight: 700; color: #111827; margin-bottom: 6px; }
          p { font-size: 13px; color: #6b7280; line-height: 1.5; margin-bottom: 20px; }
          .btn {
            display: flex; align-items: center; justify-content: center; gap: 10px;
            width: 100%; padding: 13px 16px;
            border-radius: 10px; border: none;
            font-size: 14px; font-weight: 600;
            cursor: pointer; text-decoration: none;
            transition: opacity 0.15s;
            margin-bottom: 10px;
          }
          .btn:hover { opacity: 0.9; }
          .btn-wa { background: #25D366; color: white; }
          .btn-phone { background: #2563eb; color: white; }
          .btn-phone-outline { background: white; color: #374151; border: 1px solid #e5e7eb; }
          .divider { height: 1px; background: #f3f4f6; margin: 12px 0; }
          .footer { font-size: 11px; color: #d1d5db; margin-top: 16px; }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className="avatar">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M13 3C7.5 3 3 7.5 3 13c0 2 .6 3.9 1.6 5.5L3 23l4.7-1.5C9.2 22.4 11 23 13 23c5.5 0 10-4.5 10-10S18.5 3 13 3z" fill="white" fillOpacity="0.9" />
              <path d="M10 10.5c0-.3.2-.5.5-.5h5c.3 0 .5.2.5.5v4c0 .3-.2.5-.5.5h-1.8l-1.5 1.5V15H10.5c-.3 0-.5-.2-.5-.5v-4z" fill="#2563eb" />
            </svg>
          </div>
          <h2>{name}</h2>
          <p>Nuestra recepcionista IA está disponible 24/7 para ayudarte a gestionar tu cita.</p>

          {waNumber && (
            <a
              href={`https://wa.me/${waNumber.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-wa"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="8" fill="white" fillOpacity="0.25" />
                <path d="M12.3 11.2c-.2-.1-1.1-.5-1.3-.6-.2-.1-.3-.1-.4.1-.1.2-.5.6-.6.7-.1.1-.2.1-.4 0-.2-.1-.8-.3-1.5-.9-.6-.5-.9-1-1-1.2-.1-.2 0-.3.1-.4l.3-.3c.1-.1.1-.2.2-.3V8c-.1-.1-.4-1.1-.6-1.5-.2-.4-.3-.3-.4-.3h-.4c-.1 0-.4.1-.6.3-.2.2-.7.7-.7 1.6s.7 1.9.8 2c.1.1 1.3 2 3.2 2.7.4.2.8.3 1 .4.4.1.8.1 1.1.1.3-.1 1-.4 1.2-.9.2-.4.2-.8.1-.9z" fill="white" />
              </svg>
              Escríbenos por WhatsApp
            </a>
          )}

          {phone && (
            <a href={`tel:${phone}`} className="btn btn-phone">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M5.8 2.2a.8.8 0 00-.8-.2L3.2 2.8c-.6.2-1 .8-1 1.4 0 5.4 4.4 9.8 9.8 9.8.6 0 1.2-.4 1.4-1l.8-1.8a.8.8 0 00-.2-.8l-1.9-1.5a.8.8 0 00-.9-.1l-1.2.7a6.1 6.1 0 01-2.5-2.5l.7-1.2a.8.8 0 00-.1-.9L5.8 2.2z" fill="white" />
              </svg>
              Llamar ahora
            </a>
          )}

          {!waNumber && !phone && (
            <p style={{ color: "#9ca3af", fontSize: 13 }}>Canal de contacto no configurado aún.</p>
          )}

          <div className="footer">Powered by Atiende360 · IA Recepcionista</div>
        </div>
      </body>
    </html>
  );
}
