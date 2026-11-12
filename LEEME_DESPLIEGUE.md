# Selector de Variadores HNC · Despliegue (Opción B)

Publica el selector en **Cloudflare Pages** (gratis a este volumen) con un enlace abierto para cualquier persona.
Los pasos describen los menús de Cloudflare y GitHub tal como los conozco; si algún nombre cambió, busca el equivalente.

## Qué contiene el proyecto
| Carpeta / archivo | Función |
|---|---|
| `public/index.html` | Interfaz del selector y la carga del consolidado (una sola página, responsiva). |
| `public/tecnica.json` | **Base técnica** (101 aplicaciones, 34 potencias con HP, 5 voltajes, rangos). Separada del inventario. |
| `functions/api/inventario.js` | **API del inventario**: lectura pública y escritura protegida con contraseña. |
| `public/_headers` | Cabeceras de seguridad. |
| `public/sw.js`, `public/manifest.webmanifest` | **App instalable y modo sin conexión** (PWA). |
| `public/logo.png`, `icon-*.png`, `apple-touch-icon.png` | Logo e íconos de la app. |
| `tests/*.test.mjs` | Pruebas automáticas de la API, del modo sin conexión y del lector de Excel. |

El inventario se guarda en Cloudflare KV. Una carga nueva **reemplaza** el inventario anterior y deja un respaldo en la llave `inventario_anterior`.

## Costos
Cuenta de GitHub y de Cloudflare: gratis. El plan gratuito de Cloudflare cubre este uso con amplio margen (cientos de miles de consultas diarias). El dominio propio (opcional) tiene costo aparte.

## Paso 1 · Subir los archivos a GitHub
1. Crea una cuenta en github.com e inicia sesión.
2. Crea un repositorio nuevo (por ejemplo `selector-hnc`), privado o público.
3. En el repositorio: **Add file → Upload files**. Arrastra **las carpetas** `public`, `functions` y `tests` y el archivo `LEEME_DESPLIEGUE.md` (descomprime el .zip antes). Confirma con **Commit changes**.
4. Verifica que en GitHub existan `public/index.html` y `functions/api/inventario.js` con esas rutas exactas.

## Paso 2 · Crear el sitio en Cloudflare Pages
1. Crea una cuenta en cloudflare.com.
2. **Workers & Pages → Create → Pages → Connect to Git** y autoriza tu GitHub; elige el repositorio.
3. Configuración de compilación: *Framework preset* = **None**; *Build command* = **vacío**; *Build output directory* = **`public`**.
4. **Save and Deploy**. Obtendrás una dirección tipo `https://selector-hnc.pages.dev`.

## Paso 3 · Crear el almacén del inventario (KV)
1. **Storage & Databases → KV → Create a namespace**; nómbralo `HNC_INVENTARIO`.
2. Abre tu proyecto Pages → **Settings → Bindings (o Functions → KV namespace bindings) → Add → KV namespace**.
3. *Variable name*: **`INVENTARIO`** (exactamente así, en mayúsculas). *KV namespace*: `HNC_INVENTARIO`. Guarda (hazlo para Production).

## Paso 4 · Definir la contraseña de administrador
1. Proyecto Pages → **Settings → Variables and Secrets → Add**.
2. Nombre: **`ADMIN_PASSWORD`**, tipo **Secret**, valor: una contraseña larga (12+ caracteres, no la reutilices).
3. Guarda y **vuelve a desplegar** (Deployments → ⋯ → Retry deployment) para que tome los cambios de los pasos 3 y 4.

## Paso 5 · Primera carga y verificación
1. Abre tu dirección `.pages.dev` **desde un teléfono sin sesión de nada** (o ventana privada): debe verse el selector. Aún dirá "No hay consolidado cargado".
2. Pulsa **📄 Cargar Excel de Stock**, escribe la contraseña, elige el consolidado semanal, revisa el resumen y pulsa **Aplicar inventario**. Debe aparecer **✔ ¡Cargado exitosamente!**.
3. Abre la página desde otro dispositivo: debe mostrar el mismo inventario y la leyenda de fecha.
4. Prueba una contraseña equivocada: debe decir "Contraseña incorrecta" y no cambiar nada.
5. Verifica 2 o 3 combinaciones contra tu Excel (por ejemplo, Mezcladoras · 40 HP · Trifásico 220V → HV100-030G2, HV480-030G2, HV320-030G2).

## Paso 6 (opcional) · Dominio propio
Pages → tu proyecto → **Custom domains → Set up a custom domain** (por ejemplo `selector.tudominio.com`) y sigue las indicaciones de DNS.

## Uso semanal
Cada lunes: abre el selector → **Cargar Excel de Stock** → contraseña → archivo → **Aplicar inventario**. Si el consolidado no es de la semana en curso, el indicador queda en rojo como **Actualizar**.
Si el archivo falla la validación (columnas faltantes, existencias no numéricas, duplicados, o ningún modelo relacionado), **no se guarda nada** y se conserva el inventario vigente.

## Mantenimiento
- **Cambiar la contraseña:** edita el secreto `ADMIN_PASSWORD` y redespliega.
- **Actualizar aplicaciones, potencias o rangos:** se editan en `public/tecnica.json`; al guardar el cambio en GitHub, Cloudflare publica solo. Pide ayuda para generarlo desde el Excel y así evitar errores de captura.
- **Recuperar el inventario anterior:** en KV, la llave `inventario_anterior` contiene la versión previa a la última carga.
- **Pruebas:** `node tests/api.test.mjs`, `node tests/sw.test.mjs` y `node tests/lector.test.mjs`.

## Seguridad: puntos a considerar
- La contraseña viaja por HTTPS y se compara en el servidor. Usa una larga y única. Si más adelante quieres reforzarla, Cloudflare Access (gratis hasta 50 usuarios) permite pedir inicio de sesión corporativo antes de aceptar cargas.
- El botón de carga es visible para todos, pero sin contraseña correcta el servidor rechaza cualquier cambio.
- La lectura del Excel usa la librería SheetJS desde cdnjs. Si prefieres no depender de un servicio externo, se puede alojar una copia propia.

## Si algo falla
| Síntoma | Causa probable |
|---|---|
| "No se pudo consultar el inventario" | Falta el binding KV `INVENTARIO` o no se redesplegó (paso 3). |
| Al aplicar: "Falta configurar el KV o la contraseña" | Falta el binding o el secreto `ADMIN_PASSWORD` (pasos 3 y 4). |
| "Contraseña incorrecta" con la correcta | El secreto se guardó en Preview y no en Production, o falta redesplegar. |
| La página queda en blanco | `Build output directory` no es `public`, o las carpetas no se subieron con su estructura. |


## Instalación como app en celulares (PWA)
Abre la dirección del selector **una vez con internet** y luego instálala:
- **Android (Chrome):** aparece el aviso "Instalar app"; si no, menú ⋮ → *Agregar a pantalla principal* / *Instalar aplicación*.
- **iPhone (Safari, no Chrome):** botón Compartir → *Agregar a pantalla de inicio*.

Mensaje listo para enviar a los distribuidores:
> Abre este enlace en tu celular: **[tu dirección]**. Android: toca "Instalar app". iPhone: en Safari, Compartir → "Agregar a pantalla de inicio". Después ábrela desde el ícono HNC, como cualquier app.

**Sin internet:** la app abre y selecciona equipos con la última base técnica guardada. El inventario que muestre será el último que ese teléfono descargó y aparecerá un aviso rojo con la fecha de esa carga ("Sin conexión… pueden haber cambiado"). Con internet se actualiza sola, al abrirla o al volver a ella después de 10 minutos. La **carga de inventario siempre requiere internet**.

**Actualizar la app:** sustituye los archivos en GitHub (Add file → Upload files, mismas rutas) y Cloudflare publica solo. Los teléfonos reciben los cambios la siguiente vez que abran la app con internet (si no los ven, cerrarla por completo y abrirla de nuevo). Si cambias el logo o los íconos, sube el número de `V` en `public/sw.js` (por ejemplo `hnc-v2`).

**Para esta actualización (corrección de la carga del Excel)** reemplaza en tu repositorio estos 3 archivos en `public/`: `index.html`, `sw.js` y `_headers`, y agrega `tests/lector.test.mjs`.

| Síntoma (app) | Causa probable |
|---|---|
| No aparece "Instalar app" en Android | Chrome solo lo ofrece tras abrir el sitio con internet y por HTTPS; prueba el menú ⋮. Si ya la instaló o rechazó el aviso, usa el menú. |
| En iPhone no hay opción | Debe abrirse en Safari. |
| Al cargar el Excel: "No se pudo leer el archivo…" | Lee el motivo que aparece debajo ("Detalle técnico"). Si dice que no se pudo abrir el archivo: ciérralo en Excel o descárgalo desde Drive/OneDrive/WhatsApp al dispositivo y elígelo de nuevo. Si dice que no se pudo cargar el lector de Excel: falta internet. |
| Sigue viendo la versión anterior | Cerrar la app por completo y abrir con internet; si persiste, borrar datos del sitio. |
