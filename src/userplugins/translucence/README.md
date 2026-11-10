# Translucence — userplugin para Equicord

Tema translúcido/de cristal esmerilado empaquetado como **userplugin de Equicord** (fork de Vencord),
basado en el tema [Translucence](https://github.com/CapnKitten/BetterDiscord/tree/master/Themes/Translucence)
de [CapnKitten](https://github.com/CapnKitten).

A diferencia de instalarlo como tema normal, este plugin añade ajustes propios dentro de Discord:
imagen de fondo (URL o archivo local), colores y apariencia, sin editar el CSS a mano.

## Qué hace

- Aplica el CSS del tema con `enableStyle()` sobre `./style.css?managed`.
- Crea un `<style id="vc-translucence-bg">` que sobrescribe variables del `:root` del tema
  (`--app-bg`, `--accent-*`, `--main-rgb`, etc.) con `!important`, usando `:root:root` para ganarle al tema.
- Solo escribe las variables que hayas tocado: lo demás conserva el valor original del tema.
- La imagen local se guarda en IndexedDB con `@api/DataStore` (no en `settings.json`).
- Prioridad del fondo: **imagen local > URL > fondo por defecto del tema**.

## Instalación

1. Ten Equicord instalado y el repo clonado con `pnpm install` hecho.
2. Copia esta carpeta a `src/userplugins/translucence/`.
3. Compila:

   ```sh
   pnpm build
   ```

4. Reinicia Discord (o reinjecta con el instalador de Equicord) y activa el plugin en
   **Ajustes → Plugins → Translucence**.

> Nota: `src/userplugins` está en `.gitignore` del repo de Equicord. Si versionas el plugin
> dentro de un fork, la primera vez hay que forzarlo:
> `git add -f src/userplugins/translucence` (después ya se trackea normal).

## Ajustes

| Ajuste | Qué hace |
| --- | --- |
| **URL de la imagen de fondo** | URL de imagen usada como `--app-bg`. |
| **Imagen local** | Archivo de imagen (máx. 15 MB) guardado en IndexedDB. Tiene prioridad sobre la URL. |
| **Colores** | Acento, texto sobre el acento, tinte de paneles, menciones, respuestas y alertas (selectores de color). |
| **Apariencia** | Desenfoque del fondo, desenfoque de menús, opacidad del contenido, de las barras laterales y del acento, redondeo y margen de la app. |

Internamente los ajustes se guardan en la opción `tweaks` (`OptionType.CUSTOM`).

## Variables que sobrescribe

`--app-bg`, `--app-blur`, `--app-margin`, `--app-radius`, `--main-rgb`,
`--main-content-opacity`, `--sidebar-opacity`, `--accent-hue`, `--accent-saturation`,
`--accent-lightness`, `--accent-opacity`, `--accent-text-color`,
`--mention-hue/saturation/lightness`, `--reply-hue/saturation/lightness`,
`--alert-hue/saturation/lightness`, `--popout-blur`.

## Mantenimiento

Discord genera nombres de clase con hash en cada build. Cuando Discord actualiza, el tema deja de
aplicarse (sin fondo, sin transparencia) hasta que se actualiza el CSS: los selectores pasan de
`clase__abc12` a `clase_XyZ12` y similares.

Si algún día vuelve a romperse:

1. Descarga el CSS actual del autor:

   ```sh
   curl.exe -L -o src/userplugins/translucence/style.css https://capnkitten.github.io/BetterDiscord/Themes/Translucence/css/source.css
   ```

2. Comprueba que empieza por `:root {` (y no es una página HTML de error).
3. `pnpm build` y recarga Discord.

El bloque `:root` del tema no ha cambiado entre versiones recientes: los ajustes del plugin
siguen siendo válidos aunque cambien los hashes de clase.

## Créditos y licencia

- Tema original y CSS: **CapnKitten** —
  [repo](https://github.com/CapnKitten/BetterDiscord/tree/master/Themes/Translucence) ·
  [CSS compilado](https://capnkitten.github.io/BetterDiscord/Themes/Translucence/css/source.css)
- `style.css` corresponde a la versión publicada el **2026-11-10**.
- Código del plugin: GPL-3.0, igual que Equicord/Vencord.
