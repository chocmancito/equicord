import { del, get, set } from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { useState } from "@webpack/common";
import type { ChangeEvent } from "react";

const STORE_KEY = "Translucence_localImage";
const STYLE_ID = "vc-translucence-bg";
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

// ───────────────────────── Opciones editables ─────────────────────────

// Colores (selector de color). `fallback` es el valor por defecto del tema,
// solo se usa para mostrar algo en el selector mientras no hayas elegido nada.
const COLORS = [
    { key: "accentColor", label: "Color de acento (botones, iconos, enlaces)", fallback: "#a47cf3" },
    { key: "accentTextColor", label: "Texto sobre el acento", fallback: "#000000" },
    { key: "panelTint", label: "Tinte de paneles y barras laterales", fallback: "#000000" },
    { key: "mentionColor", label: "Color de menciones (por defecto sigue al acento)", fallback: "#a47cf3" },
    { key: "replyColor", label: "Color de respuestas", fallback: "#ec5ba8" },
    { key: "alertColor", label: "Color de alertas / peligro", fallback: "#d83c3e" },
] as const;

// Valores numéricos (deslizadores). `def` es el valor por defecto del tema.
const NUMS = [
    { key: "appBlur", label: "Desenfoque del fondo", min: 0, max: 30, step: 1, unit: "px", def: 6 },
    { key: "popoutBlur", label: "Desenfoque de menús y ventanas", min: 0, max: 30, step: 1, unit: "px", def: 6 },
    { key: "mainOpacity", label: "Opacidad del área de contenido", min: 0, max: 1, step: 0.01, unit: "", def: 0.27 },
    { key: "sidebarOpacity", label: "Opacidad de las barras laterales", min: 0, max: 1, step: 0.01, unit: "", def: 0.34 },
    { key: "accentOpacity", label: "Opacidad del acento", min: 0, max: 1, step: 0.01, unit: "", def: 0.8 },
    { key: "appRadius", label: "Redondeo de esquinas", min: 0, max: 40, step: 1, unit: "px", def: 18 },
    { key: "appMargin", label: "Margen alrededor de la app", min: 0, max: 48, step: 1, unit: "px", def: 24 },
] as const;

type ColorKey = typeof COLORS[number]["key"];
type NumKey = typeof NUMS[number]["key"];
type Tweaks = Partial<Record<ColorKey, string>> & Partial<Record<NumKey, number>>;

// ───────────────────────── Utilidades de color ─────────────────────────

const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

function hexToRgb(hex: string) {
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
    };
}

function hexToHsl(hex: string) {
    const { r: r8, g: g8, b: b8 } = hexToRgb(hex);
    const r = r8 / 255, g = g8 / 255, b = b8 / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    const l = (max + min) / 2;
    let h = 0, s = 0;

    if (d !== 0) {
        s = d / (1 - Math.abs(2 * l - 1));
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
    }

    return {
        h: Math.round(h),
        s: Math.round(s * 1000) / 10,
        l: Math.round(l * 1000) / 10
    };
}

// ───────────────────────── Estado y aplicación ─────────────────────────

// Imagen local como data URL (se guarda en IndexedDB, no en settings.json)
let localImage: string | null = null;

export async function loadLocalImage() {
    localImage = (await get<string>(STORE_KEY)) ?? null;
}

export function clearStyles() {
    document.getElementById(STYLE_ID)?.remove();
    localImage = null;
}

// Construye un único <style> que sobrescribe solo las variables que hayas tocado.
// Lo que no cambies se queda con el valor original del tema.
export function applyStyles() {
    document.getElementById(STYLE_ID)?.remove();

    const t: Tweaks = settings.store.tweaks ?? {};
    const vars: Record<string, string> = {};

    // Fondo: la imagen local tiene prioridad sobre la URL
    const bg = localImage ?? settings.store.imageUrl?.trim();
    if (bg) vars["--app-bg"] = `url(${JSON.stringify(bg)})`;

    // Colores definidos como H/S/L en el tema
    const setHsl = (prefix: string, hex?: string) => {
        if (!isHex(hex)) return;
        const { h, s, l } = hexToHsl(hex);
        vars[`--${prefix}-hue`] = String(h);
        vars[`--${prefix}-saturation`] = `${s}%`;
        vars[`--${prefix}-lightness`] = `${l}%`;
    };
    setHsl("accent", t.accentColor);
    setHsl("mention", t.mentionColor);
    setHsl("reply", t.replyColor);
    setHsl("alert", t.alertColor);

    if (isHex(t.accentTextColor)) vars["--accent-text-color"] = t.accentTextColor;
    if (isHex(t.panelTint)) {
        const { r, g, b } = hexToRgb(t.panelTint);
        vars["--main-rgb"] = `${r},${g},${b}`;
    }

    // Numéricos: solo si difieren del valor por defecto
    const put = (key: NumKey, cssVar: string, unit: string) => {
        const def = NUMS.find(n => n.key === key)!.def;
        const v = t[key];
        if (typeof v === "number" && Math.abs(v - def) > 1e-9)
            vars[cssVar] = `${Math.round(v * 100) / 100}${unit}`;
    };
    put("appBlur", "--app-blur", "px");
    put("popoutBlur", "--popout-blur", "px");
    put("mainOpacity", "--main-content-opacity", "");
    put("sidebarOpacity", "--sidebar-opacity", "");
    put("accentOpacity", "--accent-opacity", "");
    put("appRadius", "--app-radius", "px");
    put("appMargin", "--app-margin", "px");

    const body = Object.entries(vars).map(([k, v]) => `${k}: ${v} !important;`).join(" ");
    if (!body) return; // nada tocado: el tema usa todo por defecto

    const el = document.createElement("style");
    el.id = STYLE_ID;
    // :root:root + !important para ganarle al :root del tema
    el.textContent = `:root:root { ${body} }`;
    document.head.append(el);
}

// ───────────────────────── Interfaz de ajustes ─────────────────────────

const rowStyle = { display: "flex", alignItems: "center", gap: 8 } as const;

function LocalImagePicker() {
    const [hasLocal, setHasLocal] = useState(localImage !== null);
    const [error, setError] = useState("");

    function onPick(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = ""; // permite volver a elegir el mismo archivo
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setError("El archivo no es una imagen.");
            return;
        }
        if (file.size > MAX_BYTES) {
            setError("La imagen pesa más de 15 MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            localImage = reader.result as string;
            await set(STORE_KEY, localImage);
            applyStyles();
            setError("");
            setHasLocal(true);
        };
        reader.onerror = () => setError("No se pudo leer el archivo.");
        reader.readAsDataURL(file);
    }

    async function remove() {
        localImage = null;
        await del(STORE_KEY);
        applyStyles();
        setHasLocal(false);
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span>Imagen local (tiene prioridad sobre la URL)</span>
            <input type="file" accept="image/*" onChange={onPick} />
            {hasLocal && (
                <>
                    <span>Usando imagen local.</span>
                    <button onClick={remove} style={{ width: "fit-content" }}>
                        Quitar imagen local
                    </button>
                </>
            )}
            {error && <span style={{ color: "var(--text-danger, red)" }}>{error}</span>}
        </div>
    );
}

function Customizer() {
    const [tweaks, setTweaks] = useState<Tweaks>({ ...(settings.store.tweaks ?? {}) });

    function commit(next: Tweaks) {
        settings.store.tweaks = next;
        setTweaks(next);
        applyStyles();
    }
    const setValue = (key: ColorKey | NumKey, value: string | number) => commit({ ...tweaks, [key]: value });
    const unset = (key: ColorKey | NumKey) => {
        const next = { ...tweaks };
        delete next[key];
        commit(next);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <strong>Colores</strong>
            {COLORS.map(c => (
                <div key={c.key} style={rowStyle}>
                    <input
                        type="color"
                        value={tweaks[c.key] ?? c.fallback}
                        onChange={e => setValue(c.key, e.target.value)}
                    />
                    <span style={{ flex: 1 }}>{c.label}</span>
                    {tweaks[c.key] !== undefined && (
                        <button onClick={() => unset(c.key)}>Restablecer</button>
                    )}
                </div>
            ))}

            <strong>Apariencia</strong>
            {NUMS.map(n => {
                const value = tweaks[n.key] ?? n.def;
                return (
                    <div key={n.key} style={rowStyle}>
                        <span style={{ flex: 1 }}>{n.label}</span>
                        <input
                            type="range"
                            min={n.min}
                            max={n.max}
                            step={n.step}
                            value={value}
                            onChange={e => setValue(n.key, Number(e.target.value))}
                        />
                        <span style={{ width: 56, textAlign: "right" }}>
                            {Math.round(value * 100) / 100}{n.unit}
                        </span>
                        {tweaks[n.key] !== undefined && (
                            <button onClick={() => unset(n.key)}>Restablecer</button>
                        )}
                    </div>
                );
            })}

            <button onClick={() => commit({})} style={{ width: "fit-content" }}>
                Restablecer todo (colores y apariencia)
            </button>
        </div>
    );
}

export const settings = definePluginSettings({
    imageUrl: {
        type: OptionType.STRING,
        description: "URL de la imagen de fondo",
        default: "",
        placeholder: "https://i.imgur.com/....jpg",
        onChange: applyStyles
    },
    localImage: {
        type: OptionType.COMPONENT,
        component: LocalImagePicker
    },
    customize: {
        type: OptionType.COMPONENT,
        component: Customizer
    },
    // Sin interfaz propia: aquí se guardan los colores y valores que cambies
    tweaks: {
        type: OptionType.CUSTOM,
        default: {} as Tweaks
    }
});
