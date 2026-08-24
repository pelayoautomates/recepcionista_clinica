-- WhatsApp vía YCloud, como alternativa a Meta directo.
--
-- Motivo: conectar un número a la Cloud API de Meta le quita a la clínica su app
-- de WhatsApp Business del móvil. YCloud soporta Coexistence, así que la
-- recepcionista conserva su app mientras la IA contesta por la API sobre el
-- mismo número. Era el mayor punto de fricción del alta.
--
-- Las columnas de Meta se conservan: una clínica puede estar en cualquiera de
-- los dos proveedores y el resto del producto no se entera.

ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS ycloud_phone_number TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_bsp TEXT NOT NULL DEFAULT 'meta';

ALTER TABLE clinicas DROP CONSTRAINT IF EXISTS clinicas_whatsapp_bsp_check;
ALTER TABLE clinicas ADD CONSTRAINT clinicas_whatsapp_bsp_check
  CHECK (whatsapp_bsp IN ('meta', 'ycloud'));

-- El número entrante es lo que enruta el mensaje a su clínica: si dos apuntasen
-- al mismo, un paciente acabaría hablando con el agente de otra consulta.
CREATE UNIQUE INDEX IF NOT EXISTS clinicas_ycloud_phone_unique
  ON clinicas (ycloud_phone_number)
  WHERE ycloud_phone_number IS NOT NULL;
